import { fireEvent, render, screen } from "@testing-library/react";
import { LeaveDecisionButtons } from "../leave-decision-controls";


const OWNER = "u-founder";
const ownRoute: { data: unknown } = { data: undefined };

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: () => ownRoute,
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

function candidate(userId: string) {
  return { userId, name: "Asha Rao", email: "asha@example.test", designation: null };
}

function renderFor(userId: string, onProcess = jest.fn()) {
  render(
    <LeaveDecisionButtons
      request={{ id: 7, status: "PENDING", user: { id: userId, name: "Asha", firstName: "Asha", lastName: "Rao", email: "a@x.test" } }}
      currentUserId={OWNER}
      processingId={null}
      onProcess={onProcess}
    />,
  );
  return onProcess;
}

describe("leave decision controls — a self-request", () => {
  afterEach(() => {
    ownRoute.data = undefined;
  });

  it("offers Approve and Reject to the sole owner the route assigned it to", () => {
    ownRoute.data = { ownerSelfApproval: true, approver: candidate(OWNER) };

    renderFor(OWNER);

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
    expect(screen.queryByText(/needs another approver/i)).toBeNull();
  });

  it("labels the sole approver's own request and routes Approve through the self-approval confirmation (HRMS-025)", () => {
    ownRoute.data = { ownerSelfApproval: true, approver: candidate(OWNER) };

    const onProcess = renderFor(OWNER);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    expect(screen.getByText("Self-approval (no other approver)")).toBeInTheDocument();
    expect(onProcess).toHaveBeenCalledWith(7, "APPROVED", true);
  });

  it("explains a refused self-decision instead of showing bare text (HR-U-002)", () => {
    ownRoute.data = { ownerSelfApproval: false, approver: candidate("u-manager") };

    renderFor(OWNER);

    expect(screen.getByText(/You can't decide your own request/)).toBeInTheDocument();
  });

  it("still refuses a self-decision when another approver exists", () => {
    ownRoute.data = { ownerSelfApproval: false, approver: candidate("u-manager") };

    renderFor(OWNER);

    expect(screen.getByText(/needs another approver/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  });

  it("refuses when the route claims the hatch but named somebody else", () => {
    ownRoute.data = { ownerSelfApproval: true, approver: candidate("u-manager") };

    renderFor(OWNER);

    expect(screen.getByText(/needs another approver/i)).toBeInTheDocument();
  });

  it("refuses while the route has not arrived, rather than offering a control that would fail", () => {
    renderFor(OWNER);

    expect(screen.getByText(/needs another approver/i)).toBeInTheDocument();
  });

  it("offers the controls for somebody else's request, which was never in question", () => {
    const onProcess = renderFor("u-colleague");

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(onProcess).toHaveBeenCalledWith(7, "APPROVED", false);
    expect(screen.queryByText("Self-approval (no other approver)")).toBeNull();
  });
});
