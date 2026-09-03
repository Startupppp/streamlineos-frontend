import { render } from "@testing-library/react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  HR_CALENDAR_MAX_WINDOW_DAYS,
  clampToHrCalendarWindow,
  useHrCalendarEventsMapped,
} from "./use-hr-calendar-events";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: () => true,
}));

let requestedParams: Record<string, string> | undefined;

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn((_url: string, params: Record<string, string>) => {
      requestedParams = params;
      return Promise.resolve([]);
    }),
  },
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn((opts: { queryFn: (ctx: { signal: undefined }) => unknown }) => {
      void opts.queryFn({ signal: undefined });
      return { data: undefined, isError: false, error: null };
    }),
  };
});

/**
 * The window `calendar-view.tsx` hands every source: three whole months.
 * Written out rather than imported because the assertion is about what this
 * caller must survive, and if that window ever changes this is where the
 * conversation belongs.
 */
function viewWindow(anchor: Date): { rangeStart: Date; rangeEnd: Date } {
  return {
    rangeStart: startOfMonth(subMonths(anchor, 1)),
    rangeEnd: endOfMonth(addMonths(anchor, 1)),
  };
}

/**
 * `HrCalendarService.getEvents` measures the request exactly this way:
 * `Math.ceil((new Date(to) - new Date(from)) / 86_400_000)`, on the two
 * `YYYY-MM-DD` strings the client sends — so the check has to run on the
 * formatted strings, not on the Date objects behind them.
 */
function backendDiffDays(from: string, to: string): number {
  return Math.ceil(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function anchors(): Date[] {
  const out: Date[] = [];
  for (let year = 2024; year <= 2030; year += 1)
    for (let month = 0; month < 12; month += 1) out.push(new Date(year, month, 15));
  return out;
}

describe("the /hr/calendar window this caller asks for", () => {
  it("the unclamped view window is what 400s today — the regression this guards", () => {
    const over = anchors().filter((anchor) => {
      const { rangeStart, rangeEnd } = viewWindow(anchor);
      return (
        backendDiffDays(
          format(rangeStart, "yyyy-MM-dd"),
          format(rangeEnd, "yyyy-MM-dd"),
        ) > HR_CALENDAR_MAX_WINDOW_DAYS
      );
    });
    expect(over).toHaveLength(anchors().length);
  });

  it("never asks for more than the endpoint allows, on every month of seven years", () => {
    for (const anchor of anchors()) {
      const { rangeStart, rangeEnd } = viewWindow(anchor);
      const { from, to } = clampToHrCalendarWindow(rangeStart, rangeEnd);
      const days = backendDiffDays(
        format(from, "yyyy-MM-dd"),
        format(to, "yyyy-MM-dd"),
      );
      expect({ month: format(anchor, "yyyy-MM"), withinCap: days <= HR_CALENDAR_MAX_WINDOW_DAYS })
        .toEqual({ month: format(anchor, "yyyy-MM"), withinCap: true });
    }
  });

  it("still covers the whole six-week month grid, in either week-start convention", () => {
    for (const anchor of anchors()) {
      const { rangeStart, rangeEnd } = viewWindow(anchor);
      const { from, to } = clampToHrCalendarWindow(rangeStart, rangeEnd);
      for (const weekStartsOn of [0, 1] as const) {
        const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn });
        const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn });
        expect({
          month: format(anchor, "yyyy-MM"),
          weekStartsOn,
          covers: from <= gridStart && to >= gridEnd,
        }).toEqual({ month: format(anchor, "yyyy-MM"), weekStartsOn, covers: true });
      }
    }
  });

  it("leaves a window that already fits alone", () => {
    const rangeStart = new Date(2026, 8, 1);
    const rangeEnd = new Date(2026, 8, 30, 23, 59, 59, 999);
    expect(clampToHrCalendarWindow(rangeStart, rangeEnd)).toEqual({
      from: rangeStart,
      to: rangeEnd,
    });
  });
});

function HrHook({ anchor }: { anchor: Date }) {
  const { rangeStart, rangeEnd } = viewWindow(anchor);
  useHrCalendarEventsMapped(rangeStart, rangeEnd, true);
  return null;
}

describe("useHrCalendarEventsMapped — what it actually puts on the wire", () => {
  beforeEach(() => {
    requestedParams = undefined;
  });

  it("sends a window the endpoint accepts, not the view's three months", () => {
    render(<HrHook anchor={new Date(2026, 8, 15)} />);
    expect(requestedParams).toBeDefined();
    const from = requestedParams?.from ?? "";
    const to = requestedParams?.to ?? "";
    expect(backendDiffDays(from, to)).toBeLessThanOrEqual(HR_CALENDAR_MAX_WINDOW_DAYS);
  });
});
