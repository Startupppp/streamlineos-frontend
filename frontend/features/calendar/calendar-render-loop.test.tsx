"use client";

import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarView } from "./calendar-view";

jest.mock("./big-calendar-wrapper", () => ({
  BigCalendarWrapper: () => null,
}));

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/calendar",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useScope: () => "all",
  useModuleEnabled: () => true,
  usePermissionGate: () => ({
    allowed: true,
    loading: false,
    denied: false,
    ready: true,
  }),
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
    },
  ],
  failures: [],
  truncated: false,
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
  if (path.includes("/attendance/monthly")) return ATTENDANCE_LOGS;
  return [];
}

beforeEach(() => {
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
    // eslint-disable-next-line no-await-in-loop
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

  it("announces the range at the granularity of the active view, not month-only", async () => {
    const { getByLabelText } = await renderCalendar();
    expect(
      getByLabelText(/Choose month and year, currently .*Week \d+/),
    ).toBeInTheDocument();
  });
});
