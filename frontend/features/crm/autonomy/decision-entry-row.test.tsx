import { fireEvent, render, screen } from "@testing-library/react";
import type { AutonomousDecision } from "@/types/crm/autonomy";
import { DecisionEntryRow } from "./decision-entry-row";

const base: AutonomousDecision = {
  autonomousDecisionId: "d-1",
  kind: "stage.advanced",
  outcome: "applied",
  summary: "Moved Acme renewal from Qualified to Negotiation.",
  confidence: 0.91,
  reversibility: "instant",
  triggerType: "activity",
  triggerId: "a-1",
  partyId: null,
  dealId: "12",
  activityId: null,
  decidedAt: "2026-08-24T10:00:00.000Z",
  reversedAt: null,
  reversedByUserId: null,
  reversedReason: null,
  model: "claude-haiku-4-5",
  promptVersion: "3",
  dealName: "Acme renewal",
  partyName: null,
};

const decision = (over: Partial<AutonomousDecision> = {}): AutonomousDecision => ({ ...base, ...over });

const renderRow = (d: AutonomousDecision, canReverse = true) => {
  const onReverse = jest.fn();
  render(<DecisionEntryRow decision={d} canReverse={canReverse} onReverse={onReverse} />);
  return { onReverse };
};

describe("DecisionEntryRow", () => {
  it("explains itself in plain language, naming the record rather than its id", () => {
    renderRow(decision());
    expect(screen.getByText("Moved a deal")).toBeInTheDocument();
    expect(screen.getByText("Acme renewal")).toBeInTheDocument();
    expect(screen.getByText(/Moved Acme renewal from Qualified/)).toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  it("keeps the model and prompt version out of the default view", () => {
    renderRow(decision());
    expect(screen.queryByText("claude-haiku-4-5")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /how this was decided/i }));
    expect(screen.getByText("claude-haiku-4-5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("says no model was involved rather than inventing a confidence", () => {
    // A deterministic decision has no score. Rendering "100%" would be a
    // measurement nobody took.
    renderRow(decision({ confidence: null, kind: "party.created" }));
    expect(screen.getByText("No model involved")).toBeInTheDocument();
  });

  describe("the undo control", () => {
    it("offers one for an applied, instantly reversible action", () => {
      const { onReverse } = renderRow(decision());
      fireEvent.click(screen.getByRole("button", { name: /undo/i }));
      expect(onReverse).toHaveBeenCalledWith("d-1");
    });

    /**
     * Each of these would be refused by the server. Hiding the control means a
     * reader is never offered an undo that fails when they press it.
     */
    it("hides it for a decision that changed nothing", () => {
      renderRow(decision({ outcome: "skipped" }));
      expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
    });

    it("hides it for something already reversed", () => {
      renderRow(decision({ outcome: "reversed", reversedAt: "2026-08-24T11:00:00.000Z" }));
      expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
    });

    it("hides it for something that left the building", () => {
      renderRow(decision({ kind: "quote.sent", reversibility: "hold" }));
      expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
    });

    it("hides it from a reader without the reverse permission", () => {
      renderRow(decision(), false);
      expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
    });
  });

  it("shows who undid it and why, once it has been", () => {
    renderRow(
      decision({
        outcome: "reversed",
        reversedAt: "2026-08-24T11:00:00.000Z",
        reversedReason: "wrong deal",
      }),
    );
    // Two places say so, and both earn it: the badge is the status at a glance,
    // the line beneath is when and why.
    expect(screen.getAllByText(/Undone/)).toHaveLength(2);
    expect(screen.getByText(/wrong deal/)).toBeInTheDocument();
  });

  it("carries the exact timestamp even though it shows a relative one", () => {
    // An audit trail has to be able to answer "when exactly".
    renderRow(decision());
    const time = screen.getByText(/ago|just now/i).closest("time");
    expect(time).toHaveAttribute("dateTime", "2026-08-24T10:00:00.000Z");
  });
});
