import { act, renderHook } from "@testing-library/react";
import { useUpdateCalendarEvent, useUpsertOccurrenceException } from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { useEventSeriesScope } from "./use-event-series-scope";
import type { CalendarEventPayload } from "./event-create-validators";

/**
 * Series-versus-instance edits (PRD-C128), on the branch that decides which of the two a
 * confirmed edit becomes.
 *
 * `useEventSeriesScope` is the only place the choice is made, and nothing covered it: it
 * routes "this occurrence" to `PATCH /calendar/events/:id/occurrences/:occurrenceStart`
 * and "the whole series" to `PUT /calendar/events/:id`, and it has to key the occurrence
 * on the NOMINAL instant carried in the projected id — never on `event.start`, which is
 * the MOVED time once an occurrence has been rescheduled. Keying on `event.start` writes a
 * second exception row for the same occurrence, so the original stays on the calendar and
 * the move appears to have been ignored.
 */
interface RecordedCall {
  key: readonly unknown[] | undefined;
  vars: unknown;
}

const calls: RecordedCall[] = [];
const toastError = jest.fn();
const toastSuccess = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (message: string) => toastError(message),
    success: (message: string) => toastSuccess(message),
  },
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useMutation: jest.fn((opts: { mutationKey?: readonly unknown[] }) => ({
      mutateAsync: (vars: unknown) => {
        calls.push({ key: opts.mutationKey, vars });
        return Promise.resolve({ id: 1 });
      },
      isPending: false,
    })),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  };
});

const NOMINAL_START = "2026-03-18T09:00:00.000Z";
const MOVED_START = "2026-03-19T14:00:00.000Z";

const MOVED_OCCURRENCE: CalendarListItem = {
  id: `event-42-${NOMINAL_START}`,
  title: "Weekly standup",
  start: MOVED_START,
  end: "2026-03-19T14:30:00.000Z",
  category: "meeting",
  source: "event",
};

const PAYLOAD: CalendarEventPayload = {
  title: "Weekly standup — moved again",
  startDate: "2026-03-19T15:00:00.000Z",
  endDate: "2026-03-19T15:30:00.000Z",
  category: "meeting",
  syncConnectionId: 7,
  addConference: true,
};

function callsFor(operation: "occurrence" | "series"): RecordedCall[] {
  const wanted = operation === "occurrence" ? "occurrence" : "update";
  return calls.filter((call) => {
    const key = call.key;
    if (!Array.isArray(key)) return false;
    return operation === "occurrence"
      ? key.includes("occurrence")
      : key.includes(wanted) && !key.includes("occurrence");
  });
}

function renderScope(event: CalendarListItem | null, onClose = jest.fn()) {
  return renderHook(() => {
    const updateEvent = useUpdateCalendarEvent();
    const upsertOccurrenceException = useUpsertOccurrenceException();
    return useEventSeriesScope({ event, updateEvent, upsertOccurrenceException, onClose });
  });
}

beforeEach(() => {
  calls.length = 0;
  toastError.mockClear();
  toastSuccess.mockClear();
});

describe("useEventSeriesScope — instance edits", () => {
  it("BITE: keys the exception on the NOMINAL start from the id, not the moved start", async () => {
    const { result } = renderScope(MOVED_OCCURRENCE);

    act(() => result.current.openWithPayload(PAYLOAD));
    await act(async () => {
      await result.current.handleSeriesScopeConfirm("occurrence");
    });

    const occurrenceCalls = callsFor("occurrence");
    expect(occurrenceCalls).toHaveLength(1);
    expect(occurrenceCalls[0]?.vars).toEqual({
      eventId: 42,
      occurrenceStart: NOMINAL_START,
      modifiedTitle: PAYLOAD.title,
      modifiedStart: PAYLOAD.startDate,
      modifiedEnd: PAYLOAD.endDate,
    });
    expect(callsFor("series")).toHaveLength(0);
  });

  it("does not send a whole-series update when the scope is one occurrence", async () => {
    const { result } = renderScope(MOVED_OCCURRENCE);

    act(() => result.current.openWithPayload(PAYLOAD));
    await act(async () => {
      await result.current.handleSeriesScopeConfirm("occurrence");
    });

    expect(callsFor("series")).toHaveLength(0);
    expect(toastSuccess).toHaveBeenCalledWith("Occurrence updated");
  });
});

describe("useEventSeriesScope — series edits", () => {
  it("BITE: sends the whole-series update on the numeric id and strips sync-only fields", async () => {
    const { result } = renderScope(MOVED_OCCURRENCE);

    act(() => result.current.openWithPayload(PAYLOAD));
    await act(async () => {
      await result.current.handleSeriesScopeConfirm("series");
    });

    const seriesCalls = callsFor("series");
    expect(seriesCalls).toHaveLength(1);
    expect(seriesCalls[0]?.vars).toEqual({
      calendarEventId: 42,
      title: PAYLOAD.title,
      startDate: PAYLOAD.startDate,
      endDate: PAYLOAD.endDate,
      category: PAYLOAD.category,
    });
    expect(callsFor("occurrence")).toHaveLength(0);
    expect(toastSuccess).toHaveBeenCalledWith("Event updated");
  });
});

describe("useEventSeriesScope — ids it must refuse", () => {
  it("sends nothing for an aggregate id that names no calendar_events row", async () => {
    const aggregate: CalendarListItem = {
      ...MOVED_OCCURRENCE,
      id: "leave-88",
      source: "leave",
    };
    const { result } = renderScope(aggregate);

    act(() => result.current.openWithPayload(PAYLOAD));
    await act(async () => {
      await result.current.handleSeriesScopeConfirm("occurrence");
    });

    expect(calls).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith("Cannot edit this event type");
    expect(result.current.seriesScopeOpen).toBe(false);
  });

  it("sends nothing when confirmed with no pending payload", async () => {
    const { result } = renderScope(MOVED_OCCURRENCE);

    await act(async () => {
      await result.current.handleSeriesScopeConfirm("series");
    });

    expect(calls).toHaveLength(0);
  });
});
