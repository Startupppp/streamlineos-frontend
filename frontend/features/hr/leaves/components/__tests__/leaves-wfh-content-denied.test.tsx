import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

function queryStub(data: unknown) {
  return {
    data,
    isLoading: false,
    isPending: data === undefined,
    isError: false,
    error: null,
    isSuccess: data !== undefined,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

const mockScopes: { current: Record<string, string> } = { current: {} };
const mockContext: { current: unknown } = { current: undefined };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/me/time-off",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user_1", name: "Member" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => key in mockScopes.current,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: mockScopes.current, modules: { hr: true } },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/hr", () => {
  const named: Record<string, unknown> = {
    useHrLeaveContext: () => queryStub(mockContext.current),
    useHrMyLeaveRequestsInfinite: () =>
      queryStub(
        mockContext.current === undefined
          ? undefined
          : {
              pages: [{ data: [], pageInfo: { limit: 20, hasMore: false, nextCursor: null } }],
              pageParams: [null],
            },
      ),
    useHrLeaveApprovals: () => queryStub(undefined),
    useHrLeavesThisWeek: () => queryStub([]),
    useHrPendingWfhRequests: () => queryStub([]),
    useHrWfhRequests: () => queryStub([]),
    useLeavePolicy: () => queryStub(null),
  };
  const actual = jest.requireActual("@/hooks/api/hr") as Record<string, unknown>;
  const filled: Record<string, unknown> = {};
  for (const key of Object.keys(actual))
    filled[key] =
      named[key] ?? (() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }));
  return { ...filled, ...named };
});

jest.mock("@/features/hr/leaves/leave-request-sheet", () => ({
  LeaveRequestSheet: () => null,
}));

jest.mock("@/features/hr/leaves/wfh-request-sheet", () => ({
  WfhRequestSheet: () => null,
}));

import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";

function renderSelfService() {
  return render(
    <TooltipProvider>
      <LeavesWfhContent selfService />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  mockScopes.current = {};
  mockContext.current = undefined;
});

describe("LeavesWfhContent — a caller without self:leaves is refused, not told no policy exists", () => {
  it("renders the shared denied surface instead of the no-policy setup guide when self:leaves is missing", () => {
    renderSelfService();

    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByText("Policies not configured")).not.toBeInTheDocument();
  });

  it("still guides a caller holding self:leaves into setup when the org has configured no leave type", () => {
    mockScopes.current = { "self:leaves": "all" };
    mockContext.current = { balances: [], types: [], approvers: [], joiningDate: null };
    renderSelfService();

    expect(screen.getByText("Policies not configured")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Access Restricted" })).not.toBeInTheDocument();
  });
});
