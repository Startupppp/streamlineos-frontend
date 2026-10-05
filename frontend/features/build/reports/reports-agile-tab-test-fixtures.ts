import type { FilterEnvelopeV1 } from "@/lib/filter-envelope/filter-envelope-v1";
import {
  mockUsePageState,
  mockUseVelocityReport,
  mockUseBurnupReport,
  mockUseCycleTimeReport,
  mockUseLeadTimeReport,
  mockUseCfdReport,
  mockUseCriticalPath,
} from "./reports-agile-tab-test-harness";

export const VELOCITY_DATA = [
  {
    cycleId: 1,
    name: "Sprint 1",
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    committedPoints: 40,
    completedPoints: 35,
    committedCount: 8,
    completedCount: 7,
  },
];

export const BURNUP_DATA = [
  { date: "2026-01-01", scope: 80, completed: 10 },
  { date: "2026-01-02", scope: 82, completed: 14 },
];

export const CYCLE_DATA = [{ week: "2026-01-05", avgDays: 3.2, count: 7 }];

export const LEAD_DATA = [
  { week: "2026-01-05", avgDays: 5.1, p50Days: 4.0, p90Days: 9.5, count: 11 },
];

export const CRITICAL_PATH_DATA = {
  criticalPath: [
    { ticketId: 1, title: "Design API", estimate: 2, earliestFinish: 2 },
    { ticketId: 2, title: "Implement endpoint", estimate: 3, earliestFinish: 5 },
  ],
  totalDuration: 5,
  edgeCount: 1,
  nodeCount: 2,
  hasCycle: false,
};

export const STATUS_FILTER: FilterEnvelopeV1 = {
  version: 1,
  logic: "and",
  filters: [{ field: "status", op: "is", value: "DONE" }],
};

export function settled<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function velocityPage(sprints: typeof VELOCITY_DATA) {
  return { data: sprints, pagination: { limit: 100, hasMore: false, nextCursor: null } };
}

export function settledVelocity(sprints: typeof VELOCITY_DATA) {
  return {
    data: { pages: [velocityPage(sprints)], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

export function failed(message = "Network timeout") {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(message),
    refetch: jest.fn(),
  };
}

export function installAgileMocks() {
  jest.clearAllMocks();
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseVelocityReport.mockReturnValue(settledVelocity([]));
  mockUseBurnupReport.mockReturnValue(settled([]));
  mockUseCycleTimeReport.mockReturnValue(settled([]));
  mockUseLeadTimeReport.mockReturnValue(settled([]));
  mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
}
