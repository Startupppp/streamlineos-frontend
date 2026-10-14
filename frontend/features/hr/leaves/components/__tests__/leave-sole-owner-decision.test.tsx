import { render, screen } from "@testing-library/react";
import { LeaveDecisionButtons } from "../leave-decision-controls";

/**
 * QA 2026-10-13 P0. An owner approved their own leave. Product decision: nobody
 * decides their own leave, sole owners included — the server refuses it, so the
 * control is never offered (this replaces the BUG-HRMS-017 sole-owner hatch).
 */

const OWNER = "u-founder";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

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
  it("never offers Approve or Reject on your own request, sole owner or not", () => {
    renderFor(OWNER);

    expect(screen.getByText(/needs another approver/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
  });

  it("offers the controls for somebody else's request", () => {
    renderFor("u-colleague");

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });
});
