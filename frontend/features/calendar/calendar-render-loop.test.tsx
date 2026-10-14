"use client";

import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarView } from "./calendar-view";
import { calendarProjectionFields } from "./calendar-projection-fixtures";

let mockCalendarPermission = {
  allowed: true,
  denied: false,
  pending: false,
  unavailable: false,
};

jest.mock("./big-calendar-wrapper", () => ({
  BigCalendarWrapper: () => null,
}));

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/calendar",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useScope: () => "all",
  useModuleEnabled: () => true,
  usePermissionGate: () => mockCalendarPermission,
  useAccess: () => ({ data: undefined, isLoading: false }),
}));

jest.mock("@/lib/org-scoped-storage", () => ({
  orgScopedStorageKey: (name: string) => name,
  useOrgStorageScope: () => "test-scope",
}));

let mockRenderCount = 0;
jest.mock("@/components/layout/shell-variant-context", () => ({
  useShellVariant: () => {
    mockRenderCount += 1;
    if (mockRenderCount > 60)
      throw new Error("CalendarView re-rendered without bound");
    return "desktop";
  },
}));

const mockApiGet = jest.fn();
const mockApiPut = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    post: (...args: unknown[]) => mockApiPut(...args),
  },
}));

const CALENDAR_EVENTS = {
  events: [
    {
      id: "evt-1",
      title: "Standup",
      start: "2026-09-15T09:00:00.000Z",
      end: "2026-09-15T09:15:00.000Z",
      allDay: false,
      color: "blue",
      category: "meeting",
      source: "calendar",
      description: null,
      ...calendarProjectionFields(
        "evt-1",
        "2026-09-15T09:00:00.000Z",
        "2026-09-15T09:15:00.000Z",
      ),
    },
  ],
  failures: [],
  truncated: false,
  coverageState: "complete",
  coverage: [
    { sourceKey: "calendar-events", state: "complete", nextCursor: null },
  ],
};

const ATTENDANCE_LOGS = [
  {
    id: 1,
    date: "2026-09-15",
    status: "PRESENT",
    checkIn: "2026-09-15T09:00:00.000Z",
    checkOut: "2026-09-15T18:00:00.000Z",
    workHours: 8,
    breakHours: 0,
    createdAt: "2026-09-15T18:00:00.000Z",
  },
];

function routeGet(path: unknown): unknown {
  if (typeof path !== "string") return [];
  if (path.startsWith("/calendar/events")) return CALENDAR_EVENTS;
  if (path.startsWith("/calendar/external-events")) {
    return { events: [], errors: [], complete: true, accounts: [] };
  }
  if (path.includes("/attendance/monthly")) return ATTENDANCE_LOGS;
  return [];
}

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  mockCalendarPermission = {
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  };
  mockRenderCount = 0;
  mockReplace.mockReset();
  mockApiPut.mockReset();
  mockApiPut.mockResolvedValue(undefined);
  mockApiGet.mockReset();
  mockApiGet.mockImplementation((path: unknown) =>
    Promise.resolve(routeGet(path)),
  );
  window.localStorage.clear();
});

async function renderCalendar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CalendarView />
    </QueryClientProvider>,
  );
  for (let i = 0; i < 6; i += 1)
    await act(async () => {
      await Promise.resolve();
    });
  return utils;
}

describe("/calendar render stability", () => {
  it("mounts the grid without an unbounded render loop (bounded so a loop fails instead of hanging)", async () => {
    await renderCalendar();
    expect(mockRenderCount).toBeLessThanOrEqual(60);
  });

  it("actually reaches the grid data path it is asserting about", async () => {
    await renderCalendar();
    const paths = mockApiGet.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/calendar/events");
    expect(paths).toContain("/me/attendance/monthly");
  });

  it("shows a loading state while the desktop grid event window is pending", async () => {
    mockApiGet.mockImplementation((path: unknown) =>
      path === "/calendar/events"
        ? new Promise(() => undefined)
        : Promise.resolve(routeGet(path)),
    );

    const { getByText, queryByText } = await renderCalendar();

    expect(getByText("Loading events")).toBeInTheDocument();
    expect(queryByText("No events in this period")).not.toBeInTheDocument();
  });

  it("shows denial instead of an empty grid when Calendar read access is refused", async () => {
    mockCalendarPermission = {
      allowed: false,
      denied: true,
      pending: false,
      unavailable: false,
    };

    const { getByText, queryByText } = await renderCalendar();

    expect(getByText("Calendar access denied")).toBeInTheDocument();
    expect(queryByText("No events in this period")).not.toBeInTheDocument();
    expect(mockApiGet.mock.calls.map((call) => call[0])).not.toContain("/calendar/events");
  });

  it("shows pending access distinctly from an empty calendar", async () => {
    mockCalendarPermission = {
      allowed: false,
      denied: false,
      pending: true,
      unavailable: false,
    };

    const { getByText, queryByText } = await renderCalendar();

    expect(getByText("Checking Calendar access")).toBeInTheDocument();
    expect(queryByText("No events in this period")).not.toBeInTheDocument();
  });

  it("shows an access-check failure distinctly from an empty calendar", async () => {
    mockCalendarPermission = {
      allowed: false,
      denied: false,
      pending: false,
      unavailable: true,
    };

    const { getByText, queryByText } = await renderCalendar();

    expect(getByText("Calendar access unavailable")).toBeInTheDocument();
    expect(queryByText("No events in this period")).not.toBeInTheDocument();
  });

  it("removes an inaccessible real event ID from the URL without opening detail", async () => {
    mockSearchParams = new URLSearchParams("event=event-42&eventSource=calendar");
    mockApiGet.mockImplementation((path: unknown) => Promise.resolve(
      path === "/calendar/events" ? { ...CALENDAR_EVENTS, events: [] } : routeGet(path),
    ));

    await renderCalendar();

    expect(mockReplace).toHaveBeenCalledWith("/calendar");
  });

  it("announces the range at the granularity of the active view, not month-only", async () => {
    const { getByLabelText } = await renderCalendar();
    expect(
      getByLabelText(/Choose month and year, currently .+\d+\s*[–-]\s*.*\d+/),
    ).toBeInTheDocument();
  });
});
