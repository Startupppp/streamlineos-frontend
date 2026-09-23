import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

type MutationStub = {
  mutate: jest.Mock;
  mutateAsync: jest.Mock;
  isPending: boolean;
  variables: undefined;
};

function mutationStub(): MutationStub {
  return {
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    variables: undefined,
  };
}

function queryStub(data: unknown) {
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: true,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

const teamRequest = (id: number, status: string, firstName: string) => ({
  id,
  status,
  priority: "Medium",
  reason: null,
  startDate: "2026-09-21",
  endDate: "2026-09-22",
  createdAt: "2026-09-15T00:00:00.000Z",
  leaveType: { id: 1, name: "Annual" },
  approver: null,
  user: { id: `user_${id}`, firstName, lastName: "Lovelace", email: `${firstName}@example.com`, image: null },
});

const TEAM_PAGES = {
  pages: [
    {
      data: [teamRequest(1, "PENDING", "Ada"), teamRequest(2, "APPROVED", "Grace")],
      pageInfo: { limit: 50, hasMore: true, nextCursor: 2 },
    },
    {
      data: [teamRequest(3, "PENDING", "Hedy")],
      pageInfo: { limit: 50, hasMore: false, nextCursor: null },
    },
  ],
  pageParams: [null, 2],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/leaves",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user_admin", name: "Admin" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/hr", () => {
  const named: Record<string, unknown> = {
    useHrLeaveContext: () =>
      queryStub({ balances: [], types: [], approvers: [], joiningDate: null }),
    useHrMyLeaveRequestsInfinite: () =>
      queryStub({
        pages: [{ data: [], pageInfo: { limit: 20, hasMore: false, nextCursor: null } }],
        pageParams: [null],
      }),
    useHrLeaveApprovals: () => queryStub(TEAM_PAGES),
    useHrLeavesThisWeek: () => queryStub([]),
    useHrPendingWfhRequests: () => queryStub([]),
    useHrWfhRequests: () => queryStub([]),
    useLeavePolicy: () => queryStub(null),
  };
  const actual = jest.requireActual("@/hooks/api/hr") as Record<string, unknown>;
  const filled: Record<string, unknown> = {};
  for (const key of Object.keys(actual))
    filled[key] = named[key] ?? ((): MutationStub => mutationStub());
  return { ...filled, ...named };
});

jest.mock("@/features/hr/leaves/leave-request-sheet", () => ({
  LeaveRequestSheet: () => null,
}));

jest.mock("@/features/hr/leaves/wfh-request-sheet", () => ({
  WfhRequestSheet: () => null,
}));

import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";

describe("LeavesWfhContent — approvals read GET /hr/leaves/team as a cursor envelope", () => {
  it("counts pending approvals across every loaded page, not from a retired `pending` field", () => {
    render(
      <TooltipProvider>
        <LeavesWfhContent />
      </TooltipProvider>,
    );

    expect(screen.getByRole("tab", { name: /Approvals\s*2/ })).toBeInTheDocument();
  });

  it("lists every loaded page under All and only PENDING rows under Pending", () => {
    render(
      <TooltipProvider>
        <LeavesWfhContent />
      </TooltipProvider>,
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Approvals/ }));

    const allPanel = screen.getByRole("tabpanel", { name: /^All/ });
    expect(within(allPanel).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(allPanel).getByText("Grace Lovelace")).toBeInTheDocument();
    expect(within(allPanel).getByText("Hedy Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("No leave requests")).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /^Pending/ }));
    const pendingPanel = screen.getByRole("tabpanel", { name: /^Pending/ });
    expect(within(pendingPanel).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(pendingPanel).getByText("Hedy Lovelace")).toBeInTheDocument();
    expect(within(pendingPanel).queryByText("Grace Lovelace")).not.toBeInTheDocument();
  });
});
