"use client";

import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { BigCalEvent } from "./big-calendar-wrapper";
import {
  useAttendanceCalendarEvents,
  type AttendanceCalendarEventsResult,
} from "./use-attendance-calendar-events";
import {
  clampToHrCalendarWindow,
  useHrCalendarEventsMapped,
} from "./use-hr-calendar-events";

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
  usePermissionGate: (key: string) => {
    const allowed = mockUseCan(key);
    return {
      permission: key,
      allowed,
      denied: !allowed,
      pending: false,
      unavailable: false,
    };
  },
  useModuleEnabled: () => true,
}));

let mockOrgId = "org-1";
let mockUserId = "user-1";
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: mockOrgId, user: { id: mockUserId } },
    status: "authenticated",
  }),
}));

const mockApiGet = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

const RANGE_START = new Date("2026-09-01T00:00:00.000Z");
const RANGE_END = new Date("2026-09-30T00:00:00.000Z");

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

const HR_EVENTS = [
  {
    id: "hr-1",
    title: "Diwali",
    date: "2026-09-12",
    endDate: null,
    type: "HOLIDAY",
  },
];

function routeGet(path: unknown): unknown {
  if (typeof path !== "string") return [];
  if (path.includes("/attendance/monthly")) return ATTENDANCE_LOGS;
  if (path.includes("/time-off/wfh")) return [];
  if (path.startsWith("/hr/calendar")) return HR_EVENTS;
  return [];
}

beforeEach(() => {
  mockOrgId = "org-1";
  mockUserId = "user-1";
  mockUseCan.mockReset();
  mockUseCan.mockReturnValue(true);
  mockApiGet.mockReset();
  mockApiGet.mockImplementation((path: unknown) =>
    Promise.resolve(routeGet(path)),
  );
});

function requestedPaths(): unknown[] {
  return mockApiGet.mock.calls.map((call) => call[0]);
}

const ATTENDANCE_KEY = humanResourcesQueryKeys.hr.monthlyAttendance({
  orgId: "org-1",
  actorUserId: "user-1",
  year: RANGE_START.getFullYear(),
  month: RANGE_START.getMonth(),
});

const HR_WINDOW = clampToHrCalendarWindow(RANGE_START, RANGE_END);
const HR_KEY = platformHierarchyQueryKeys.calendar.hrSupplemental(
  "org-1",
  format(HR_WINDOW.from, "yyyy-MM-dd"),
  format(HR_WINDOW.to, "yyyy-MM-dd"),
);

interface Recorder<T> {
  renders: T[];
}

function createRecorder<T>(): Recorder<T> {
  return { renders: [] };
}

function latest<T>(recorder: Recorder<T>): T {
  return recorder.renders[recorder.renders.length - 1];
}

interface ProbeProps<T> {
  recorder: Recorder<T>;
  visible?: boolean;
  tick?: number;
}

function AttendanceProbe({
  recorder,
  visible = true,
}: ProbeProps<CalendarListItem[]>) {
  const result = useAttendanceCalendarEvents(RANGE_START, RANGE_END, visible);
  recorder.renders.push(result.events);
  return null;
}

function AttendanceStateProbe({
  recorder,
  visible = true,
}: ProbeProps<AttendanceCalendarEventsResult>) {
  const result = useAttendanceCalendarEvents(RANGE_START, RANGE_END, visible);
  recorder.renders.push(result);
  return null;
}

function HrProbe({ recorder }: ProbeProps<BigCalEvent[]>) {
  const { hrCalEvents } = useHrCalendarEventsMapped(
    RANGE_START,
    RANGE_END,
    true,
  );
  recorder.renders.push(hrCalEvents);
  return null;
}

interface Mounted {
  queryClient: QueryClient;
  rerenderWithNoChangedInput: () => void;
}

function mount(renderProbe: (tick: number) => React.ReactElement): Mounted {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      {renderProbe(0)}
    </QueryClientProvider>,
  );
  function rerenderWithNoChangedInput() {
    view.rerender(
      <QueryClientProvider client={queryClient}>
        {renderProbe(1)}
      </QueryClientProvider>,
    );
  }
  return { queryClient, rerenderWithNoChangedInput };
}

describe("useAttendanceCalendarEvents — referential identity", () => {
  it("returns the same array reference across a no-op re-render", async () => {
    const recorder = createRecorder<CalendarListItem[]>();
    const { rerenderWithNoChangedInput } = mount((tick) => (
      <AttendanceProbe recorder={recorder} tick={tick} />
    ));
    await waitFor(() => {
      expect(latest(recorder).length).toBeGreaterThan(0);
    });

    const before = latest(recorder);
    const rendersBefore = recorder.renders.length;
    await act(async () => {
      rerenderWithNoChangedInput();
    });

    expect(recorder.renders.length).toBeGreaterThan(rendersBefore);
    expect(Object.is(before, latest(recorder))).toBe(true);
  });

  it("returns a different array reference once the attendance data changes", async () => {
    const recorder = createRecorder<CalendarListItem[]>();
    const { queryClient } = mount((tick) => (
      <AttendanceProbe recorder={recorder} tick={tick} />
    ));
    await waitFor(() => {
      expect(latest(recorder).length).toBeGreaterThan(0);
    });

    const before = latest(recorder);
    await act(async () => {
      queryClient.setQueryData(ATTENDANCE_KEY, [
        { ...ATTENDANCE_LOGS[0], id: 2, date: "2026-09-16", status: "ABSENT" },
      ]);
    });
    await waitFor(() => {
      expect(latest(recorder)[0]?.id).toBe("attendance-self-2");
    });

    expect(Object.is(before, latest(recorder))).toBe(false);
  });
});

describe("useAttendanceCalendarEvents — fetch timing is unchanged", () => {
  it("fetches monthly attendance when the grid shows attendance and the permission is held", async () => {
    const recorder = createRecorder<CalendarListItem[]>();
    mount((tick) => (
      <AttendanceProbe recorder={recorder} tick={tick} />
    ));
    await waitFor(() => {
      expect(requestedPaths()).toContain("/me/attendance/monthly");
    });
  });

  it("does not fetch monthly attendance while the grid is not showing attendance", async () => {
    const recorder = createRecorder<CalendarListItem[]>();
    mount((tick) => (
      <AttendanceProbe recorder={recorder} visible={false} tick={tick} />
    ));
    expect(requestedPaths()).not.toContain("/me/attendance/monthly");
    expect(requestedPaths()).not.toContain("/me/time-off/wfh");
  });

  it("does not fetch monthly attendance without self:attendance", async () => {
    mockUseCan.mockReturnValue(false);
    const recorder = createRecorder<CalendarListItem[]>();
    mount((tick) => (
      <AttendanceProbe recorder={recorder} tick={tick} />
    ));
    await waitFor(() => {
      expect(recorder.renders.length).toBeGreaterThan(0);
    });

    expect(requestedPaths()).not.toContain("/me/attendance/monthly");
  });
});

describe("attendance calendar coverage state", () => {
  it("surfaces a failed monthly request and retries it", async () => {
    let monthlyCalls = 0;
    mockApiGet.mockImplementation((path: unknown) => {
      if (path === "/me/attendance/monthly") {
        monthlyCalls += 1;
        return monthlyCalls === 1
          ? Promise.reject(new Error("Attendance unavailable"))
          : Promise.resolve(ATTENDANCE_LOGS);
      }
      return Promise.resolve(routeGet(path));
    });
    const recorder = createRecorder<AttendanceCalendarEventsResult>();
    mount((tick) => <AttendanceStateProbe recorder={recorder} tick={tick} />);
    await waitFor(() => expect(latest(recorder).isError).toBe(true));

    await act(async () => {
      await latest(recorder).refetch();
    });

    await waitFor(() => expect(latest(recorder).isError).toBe(false));
    expect(monthlyCalls).toBeGreaterThanOrEqual(2);
  });

  it("surfaces a failed work-from-home request", async () => {
    mockApiGet.mockImplementation((path: unknown) =>
      path === "/me/time-off/wfh"
        ? Promise.reject(new Error("WFH unavailable"))
        : Promise.resolve(routeGet(path)),
    );
    const recorder = createRecorder<AttendanceCalendarEventsResult>();
    mount((tick) => <AttendanceStateProbe recorder={recorder} tick={tick} />);

    await waitFor(() => expect(latest(recorder).isError).toBe(true));
    expect((latest(recorder).error as Error).message).toBe("WFH unavailable");
  });
});

describe("useHrCalendarEventsMapped — referential identity", () => {
  it("returns the same hrCalEvents reference across a no-op re-render", async () => {
    const recorder = createRecorder<BigCalEvent[]>();
    const { rerenderWithNoChangedInput } = mount((tick) => (
      <HrProbe recorder={recorder} tick={tick} />
    ));
    await waitFor(() => {
      expect(latest(recorder).length).toBeGreaterThan(0);
    });

    const before = latest(recorder);
    const rendersBefore = recorder.renders.length;
    await act(async () => {
      rerenderWithNoChangedInput();
    });

    expect(recorder.renders.length).toBeGreaterThan(rendersBefore);
    expect(Object.is(before, latest(recorder))).toBe(true);
  });

  it("returns a different hrCalEvents reference once the hr data changes", async () => {
    const recorder = createRecorder<BigCalEvent[]>();
    const { queryClient } = mount((tick) => (
      <HrProbe recorder={recorder} tick={tick} />
    ));
    await waitFor(() => {
      expect(latest(recorder).length).toBeGreaterThan(0);
    });

    const before = latest(recorder);
    await act(async () => {
      queryClient.setQueryData(HR_KEY, [
        { ...HR_EVENTS[0], id: "hr-2", title: "Onam" },
      ]);
    });
    await waitFor(() => {
      expect(latest(recorder)[0]?.title).toBe("Onam");
    });

    expect(Object.is(before, latest(recorder))).toBe(false);
  });

  it("recovers from a prior 403 after the organization changes", async () => {
    mockApiGet.mockImplementation((path: unknown) => {
      if (typeof path === "string" && path.startsWith("/hr/calendar")) {
        return mockOrgId === "org-1"
          ? Promise.reject({ status: 403 })
          : Promise.resolve(HR_EVENTS);
      }
      return Promise.resolve(routeGet(path));
    });
    const recorder = createRecorder<BigCalEvent[]>();
    const mounted = mount((tick) => <HrProbe recorder={recorder} tick={tick} />);
    await waitFor(() => {
      expect(requestedPaths().filter((path) => path === "/hr/calendar")).toHaveLength(1);
    });

    mockOrgId = "org-2";
    await act(async () => mounted.rerenderWithNoChangedInput());

    await waitFor(() => expect(latest(recorder)).toHaveLength(1));
    expect(requestedPaths().filter((path) => path === "/hr/calendar")).toHaveLength(2);
  });

  it("starts fetching when the permission is restored", async () => {
    mockUseCan.mockReturnValue(false);
    const recorder = createRecorder<BigCalEvent[]>();
    const mounted = mount((tick) => <HrProbe recorder={recorder} tick={tick} />);
    expect(requestedPaths()).not.toContain("/hr/calendar");

    mockUseCan.mockReturnValue(true);
    await act(async () => mounted.rerenderWithNoChangedInput());

    await waitFor(() => expect(requestedPaths()).toContain("/hr/calendar"));
  });
});
