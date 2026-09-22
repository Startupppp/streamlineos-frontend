import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrLeaveApprovals } from "@/hooks/api/hr/leaves";
import { leaveApprovalsContract } from "@/hooks/api/hr/leaves-schema";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useInfiniteQuery: jest.fn((options: unknown) => options),
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { version: 7 } })),
}));
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
  })),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const mockedInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockedGet = apiClient.get as jest.Mock;
const forwardedSignal = new AbortController().signal;
const IDENTITY = ["org-1", "user-1", 7] as const;

type CapturedOptions = {
  queryKey: readonly unknown[];
  queryFn: (context: { pageParam: number | null; signal?: AbortSignal }) => unknown;
  initialPageParam: number | null;
  getNextPageParam: (lastPage: {
    pageInfo: { nextCursor: number | null };
  }) => number | undefined;
  enabled: boolean;
};

function useCaptureOptions(params?: Parameters<typeof useHrLeaveApprovals>[0]): CapturedOptions {
  useHrLeaveApprovals(params);
  return mockedInfiniteQuery.mock.calls.at(-1)?.[0];
}

const emptyPage = { data: [], pageInfo: { limit: 50, hasMore: false, nextCursor: null } };

describe("leaveApprovalsContract — GET /hr/leaves/team is a cursor envelope", () => {
  it("accepts { data, pageInfo } and rejects the retired { pending, all } dump", () => {
    expect(leaveApprovalsContract.safeParse(emptyPage).success).toBe(true);
    expect(leaveApprovalsContract.safeParse({ pending: [], all: [] }).success).toBe(false);
  });
});

describe("useHrLeaveApprovals — cursor pagination and filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue(emptyPage);
  });

  it("sends no cursor on the first page and keysets on pageInfo.nextCursor after", () => {
    const options = useCaptureOptions();

    void options.queryFn({ pageParam: options.initialPageParam, signal: forwardedSignal });
    expect(mockedGet).toHaveBeenCalledWith(
      "/hr/leaves/team",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
      expect.any(Function),
    );

    void options.queryFn({ pageParam: 120, signal: forwardedSignal });
    expect(mockedGet).toHaveBeenLastCalledWith(
      "/hr/leaves/team",
      expect.objectContaining({ cursor: 120 }),
      forwardedSignal,
      expect.any(Function),
    );

    expect(options.getNextPageParam({ pageInfo: { nextCursor: 8 } })).toBe(8);
    expect(options.getNextPageParam({ pageInfo: { nextCursor: null } })).toBeUndefined();
  });

  it("forwards status, leaveTypeId, from and to exactly as the backend names them", () => {
    const options = useCaptureOptions({
      status: "APPROVED",
      leaveTypeId: 7,
      from: "2026-01-01",
      to: "2026-01-31",
      limit: 25,
    });

    void options.queryFn({ pageParam: null, signal: forwardedSignal });
    expect(mockedGet).toHaveBeenCalledWith(
      "/hr/leaves/team",
      { status: "APPROVED", leaveTypeId: 7, from: "2026-01-01", to: "2026-01-31", limit: 25 },
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("never sends a page number", () => {
    const options = useCaptureOptions({ status: "PENDING" });
    void options.queryFn({ pageParam: null, signal: forwardedSignal });
    expect(mockedGet).toHaveBeenCalledWith(
      "/hr/leaves/team",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("keys each filter set under the team prefix so decisions still invalidate every page", () => {
    const teamPrefix = queryKeys.hr.leavesTeam(...IDENTITY);
    const unfiltered = useCaptureOptions().queryKey;
    const pending = useCaptureOptions({ status: "PENDING" }).queryKey;
    const approved = useCaptureOptions({ status: "APPROVED" }).queryKey;

    expect(unfiltered.slice(0, teamPrefix.length)).toEqual(teamPrefix);
    expect(pending.slice(0, teamPrefix.length)).toEqual(teamPrefix);
    expect(JSON.stringify(pending)).not.toBe(JSON.stringify(approved));
    expect(JSON.stringify(pending)).not.toBe(JSON.stringify(unfiltered));
  });

  it("keeps the endpoint gate and lets the caller narrow it", () => {
    expect(useCaptureOptions().enabled).toBe(true);
    expect(useCaptureOptions({ enabled: false }).enabled).toBe(false);
  });
});
