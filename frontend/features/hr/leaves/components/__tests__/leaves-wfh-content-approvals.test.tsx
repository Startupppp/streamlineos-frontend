import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

let mockTeamPages: typeof TEAM_PAGES = TEAM_PAGES;
let mockQueryString = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
    replace: (href: string) => {
      mockQueryString = String(href).split("?")[1] ?? "";
    },
  }),
  useSearchParams: () => new URLSearchParams(mockQueryString),
  usePathname: () => "/hr/leaves",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user_admin", name: "Admin" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "allowed",
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
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
    useHrLeaveApprovals: () => queryStub(mockTeamPages),
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

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <LeavesWfhContent />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("LeavesWfhContent — approvals read GET /hr/leaves/team as a cursor envelope", () => {
  beforeEach(() => {
    mockQueryString = "";
    mockTeamPages = TEAM_PAGES;
  });

  it("counts pending approvals across every loaded page, not from a retired `pending` field", () => {
    renderPage();

    expect(screen.getByRole("tab", { name: /Approvals\s*2/ })).toBeInTheDocument();
  });

  it("draws tab counts at full text contrast instead of a 70% fade that measures about 3:1 on an inactive tab (UX-10)", () => {
    renderPage();

    const count = within(screen.getByRole("tab", { name: /Approvals\s*2/ })).getByText("2");
    expect(count.className).not.toMatch(/opacity-/);
  });

  it("counts only requests awaiting the viewer's decision, leaving out their own request that needs another approver (HR-U-003)", () => {
    const ownPending = { ...teamRequest(4, "PENDING", "Admin"), user: { ...teamRequest(4, "PENDING", "Admin").user, id: "user_admin" } };
    mockTeamPages = {
      ...TEAM_PAGES,
      pages: [{ ...TEAM_PAGES.pages[0], data: [...TEAM_PAGES.pages[0].data, ownPending] }, TEAM_PAGES.pages[1]],
    };
    renderPage();

    expect(screen.getByRole("tab", { name: "Approvals 2 awaiting your decision" })).toBeInTheDocument();
  });

  it("lists every loaded page under All and only PENDING rows under Pending", () => {
    mockQueryString = "tab=approvals";
    renderPage();

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

  it("restores the Work from home tab from ?tab=wfh", () => {
    mockQueryString = "tab=wfh";
    renderPage();

    expect(screen.getByRole("tab", { name: /Work from home/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /My leaves/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});
