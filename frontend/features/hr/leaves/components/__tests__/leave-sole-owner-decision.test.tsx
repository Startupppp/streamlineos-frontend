import { render, screen } from "@testing-library/react";
import { LeaveDecisionButtons } from "../leave-decision-controls";

/**
 * BUG-HRMS-017. A one-person organisation could raise leave and never close it.
 * The router sends a sole founder's request back to themselves on purpose — no
 * rung and no queue member remains — and this control answered "Cannot approve own
 * request" over it, so the request sat PENDING for ever with balances frozen.
 *
 * The refusal has to survive everywhere it means something: an org with anyone else
 * who can decide still refuses. That is the second case, and it is the one that
 * matters — opening self-approval generally would be a worse bug than the one it
 * closes.
 */

const OWNER = "u-founder";
const ownRoute: { data: unknown } = { data: undefined };

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: () => ownRoute,
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

function candidate(userId: string) {
  return { userId, name: "Asha Rao", email: "asha@example.test", designation: null };
}

function renderFor(userId: string) {
  render(
    <LeaveDecisionButtons
      request={{ id: 7, status: "PENDING", user: { id: userId, name: "Asha", firstName: "Asha", lastName: "Rao", email: "a@x.test" } }}
      currentUserId={OWNER}
      processingId={null}
      onProcess={jest.fn()}
    />,
  );
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
    renderFor("u-colleague");

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });
});
