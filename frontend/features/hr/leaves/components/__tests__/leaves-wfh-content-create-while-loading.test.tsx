import * as React from "react";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";


const mockState: { isLoading: boolean; isError: boolean } = { isLoading: true, isError: false };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams("create=1"),
  usePathname: () => "/hr/leaves",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user_1" }, orgId: "org_1" }, status: "authenticated" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { scopes: {}, modules: { hr: true } }, isLoading: false, isError: false, error: null }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

jest.mock("@/features/hr/leaves/components/use-leaves-wfh-data", () => ({
  useLeavesWfhData: () => ({
    isAdmin: false,
    canRequestLeave: true,
    canRequestWfh: true,
    balances: [],
    leaveTypes: [],
    joiningDate: null,
    approvalRoute: undefined,
    noPolicyConfigured: false,
    availableHint: "",
    totalAvailable: 0,
    pendingCount: 0,
    approvedDays: 0,
    myLeaveRequests: [],
    allIncomingLeaveRequests: [],
    incomingLeaveRequests: [],
    approvedLeavesThisWeek: [],
    totalPendingApprovals: 0,
    isLoading: mockState.isLoading,
    isError: mockState.isError,
    errorValue: mockState.isError ? new Error("boom") : null,
    onRetryPage: jest.fn(),
    approvalsLoading: false,
    approvalsError: false,
    approvalsErrorValue: null,
    refetchApprovals: jest.fn(),
    hasMoreMyRequests: false,
    isLoadingMoreMyRequests: false,
    onLoadMoreMyRequests: jest.fn(),
  }),
}));

jest.mock("@/features/hr/leaves/leave-request-sheet", () => ({
  LeaveRequestSheet: ({ open }: { open: boolean }) => (open ? <div>leave-sheet-open</div> : null),
}));
jest.mock("@/features/hr/leaves/wfh-request-sheet", () => ({ WfhRequestSheet: () => null }));
jest.mock("@/features/hr/leaves/components/leaves-wfh-toolbar", () => ({
  LeavesWfhToolbar: () => null,
  LeavesWfhActions: () => <button type="button">Request leave</button>,
}));

import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";

function renderPage() {
  return render(
    <TooltipProvider>
      <LeavesWfhContent />
    </TooltipProvider>,
  );
}

describe("LeavesWfhContent keeps its create entry points in every state", () => {
  it("opens the leave sheet from ?create=1 and shows the actions while loading", () => {
    mockState.isLoading = true;
    mockState.isError = false;
    renderPage();
    expect(screen.getByText("leave-sheet-open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request leave" })).toBeInTheDocument();
  });

  it("opens the leave sheet from ?create=1 and shows the actions when the read failed", () => {
    mockState.isLoading = false;
    mockState.isError = true;
    renderPage();
    expect(screen.getByText("leave-sheet-open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request leave" })).toBeInTheDocument();
  });
});
