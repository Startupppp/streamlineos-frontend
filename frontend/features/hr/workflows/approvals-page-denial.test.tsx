/**
 * FE-47. The workflow inbox is gated on hr:workflows:approve. A disabled read
 * looks exactly like an empty one, so a caller without the key used to be told
 * "You are all caught up" — a claim about the data they are not allowed to see.
 */
import { render, screen } from "@testing-library/react";
import { HrApprovalsPage } from "./approvals-page";

const gate = { allowed: false, denied: true, pending: false };
const idle = { data: undefined, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() };

jest.mock("@/hooks/api/hr/hr-workflows", () => ({
  useWorkflowInbox: () => ({ ...idle, access: gate }),
  useWorkflowActed: () => ({ ...idle, access: gate }),
}));
jest.mock("@/hooks/api/hr", () => ({
  useHrLeaveApprovals: () => ({ data: { pages: [] }, isLoading: false, isError: false }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      {actions}
      {children}
    </div>
  ),
}));
jest.mock("./instance-detail-sheet", () => ({ InstanceDetailSheet: () => null }));
jest.mock("./delegation-settings", () => ({ DelegationSettings: () => null }));
jest.mock("./pending-leave-approvals", () => ({ PendingLeaveApprovals: () => null }));

describe("HrApprovalsPage without hr:workflows:approve", () => {
  it("says access is restricted instead of claiming an empty queue", () => {
    render(<HrApprovalsPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("No pending approvals")).not.toBeInTheDocument();
  });

  it("hides My delegations, whose endpoints need hr:workflows:view", () => {
    render(<HrApprovalsPage />);

    expect(screen.queryByRole("button", { name: /my delegations/i })).not.toBeInTheDocument();
  });
});
