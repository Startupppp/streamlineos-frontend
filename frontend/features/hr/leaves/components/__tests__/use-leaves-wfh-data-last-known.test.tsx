import { renderHook } from "@testing-library/react";

const reads: {
  context: { data: unknown; isError: boolean; error: unknown };
  my: { data: unknown; isError: boolean; error: unknown };
} = {
  context: { data: undefined, isError: false, error: null },
  my: { data: undefined, isError: false, error: null },
};

jest.mock("@/hooks/api/hr", () => ({
  useHrLeaveContext: () => ({ ...reads.context, isLoading: false, refetch: jest.fn() }),
  useHrMyLeaveRequestsInfinite: () => ({
    ...reads.my,
    isLoading: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useHrLeaveApprovals: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useHrLeavesThisWeek: () => ({ data: [] }),
  useHrPendingWfhRequests: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: () => true,
}));

jest.mock("@/features/hr/shared/self-approval", () => ({
  useAwaitsMyDecision: () => () => false,
}));

import { useLeavesWfhData } from "@/features/hr/leaves/components/use-leaves-wfh-data";

const CONTEXT = {
  balances: [{ id: 1, leaveTypeId: 1, balance: "2.00", typeName: "Casual Leave", daysPerYear: 12 }],
  types: [{ id: 1, orgId: "org_1", name: "Casual Leave", daysPerYear: 12, carryForward: false }],
  joiningDate: null,
  noPolicyConfigured: false,
};
const PAGES = { pages: [{ data: [], pageInfo: { limit: 50, hasMore: false, nextCursor: null } }], pageParams: [null] };

describe("HR-B-016 a failed leaves refetch after a write keeps the last loaded data on screen", () => {
  it("does not block the page when a refetch fails but the balances are already loaded", () => {
    reads.context = { data: CONTEXT, isError: true, error: new Error("transient") };
    reads.my = { data: PAGES, isError: true, error: new Error("transient") };
    const { result } = renderHook(() => useLeavesWfhData(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.myRequestsError).toBe(false);
    expect(result.current.totalAvailable).toBe(2);
  });

  it("blocks the page only when the first context read fails with nothing loaded", () => {
    reads.context = { data: undefined, isError: true, error: new Error("down") };
    reads.my = { data: PAGES, isError: false, error: null };
    const { result } = renderHook(() => useLeavesWfhData(true));
    expect(result.current.isError).toBe(true);
    expect(result.current.myRequestsError).toBe(false);
  });

  it("reports a first-load request-list failure inline instead of blocking the page", () => {
    reads.context = { data: CONTEXT, isError: false, error: null };
    reads.my = { data: undefined, isError: true, error: new Error("down") };
    const { result } = renderHook(() => useLeavesWfhData(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.myRequestsError).toBe(true);
  });
});
