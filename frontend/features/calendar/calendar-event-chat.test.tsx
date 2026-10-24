import { render } from "@testing-library/react";
import {
  baseChannelResult,
  mockUseCanState,
  mockUseCan,
  mockUseChatOutboxDrain,
  mockUseCreateEntityChannel,
  mockUseEntityChannel,
  mockUsePageState,
} from "@/features/chat/build-project-chat-page-test-harness";
import { EventDetailSheet } from "./event-detail-sheet";
import type { CalendarListItem } from "@/hooks/api/calendar";

jest.mock("@/hooks/api/calendar", () => ({
  parseCalendarEventId: (id: string) => {
    const m = /^event-(\d+)/.exec(id);
    if (!m?.[1]) return null;
    return { eventId: Number(m[1]), occurrenceStart: null };
  },
  useCalendarEvent: () => ({ data: null, isLoading: false }),
  useDeleteCalendarEvent: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCancelOccurrence: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRsvpCalendarEvent: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCalendarEvent: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/components/shared/app-sheet", () => ({
  AppSheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./event-detail-content", () => ({
  EventDetailContent: () => null,
  getEventColor: () => "#888",
  RSVP_STATUS_LABELS: {},
}));
jest.mock("./event-detail-actions", () => ({
  EventDetailActions: () => null,
}));
jest.mock("./event-series-scope-dialog", () => ({
  EventSeriesScopeDialog: () => null,
}));
jest.mock("./event-create-dialog", () => ({
  EventCreateDialog: () => null,
}));
jest.mock("./calendar-source-action-panel", () => ({
  CalendarSourceActionPanel: () => null,
}));
jest.mock("./calendar-native-scenario-move", () => ({
  CalendarNativeScenarioMove: () => null,
}));
jest.mock("./calendar-lazy-fallbacks", () => ({
  CalendarListFallback: () => null,
}));
jest.mock("./calendar-time-zone-context", () => ({
  useCalendarTimeZone: () => "UTC",
}));
jest.mock("./calendar-export", () => ({
  downloadCalendarExport: jest.fn(),
}));
jest.mock("next/dynamic", () => () => () => null);

const EVENT_STUB = {
  id: "event-42",
  source: "event",
  title: "Team Standup",
  start: "2026-10-24T09:00:00Z",
  end: "2026-10-24T09:30:00Z",
  allDay: false,
  category: "meeting",
  timezone: "UTC",
  time: { kind: "time" },
  actions: { edit: false },
  entityType: null,
  entityId: null,
  sourceVersion: 1,
} as unknown as CalendarListItem;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("allowed");
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
  mockUseChatOutboxDrain.mockReturnValue(undefined);
});

describe("EventDetailSheet — chat panel", () => {
  it("calls useEntityChannel with type 'calendar_event' and the eventId as a string", () => {
    render(<EventDetailSheet event={EVENT_STUB} onClose={jest.fn()} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("calendar_event", "42");
  });

  it("calls useEntityChannel with the correct id for a different event", () => {
    const other = { ...EVENT_STUB, id: "event-99" } as unknown as CalendarListItem;
    render(<EventDetailSheet event={other} onClose={jest.fn()} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("calendar_event", "99");
  });

  it("does not call useEntityChannel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<EventDetailSheet event={EVENT_STUB} onClose={jest.fn()} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
