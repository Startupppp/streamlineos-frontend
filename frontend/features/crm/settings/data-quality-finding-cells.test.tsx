import { fireEvent, render, screen } from "@testing-library/react";
import type { DataQualityFinding } from "@/hooks/api/crm/data-quality-findings-schema";
import { FindingRowActions } from "./data-quality-finding-cells";

jest.mock("@/hooks/api/party/parties", () => ({ useParty: () => ({ data: undefined, isLoading: false }) }));

function finding(patch: Partial<DataQualityFinding> = {}): DataQualityFinding {
  return {
    findingId: "f-1",
    organizationId: "org",
    producer: "duplicate",
    findingKind: "duplicate-email",
    subjectKey: "s",
    groupKey: "g",
    severity: "high",
    status: "open",
    partyId: "p-1",
    relatedPartyId: "p-2",
    evidence: null,
    score: 0.9,
    proposedAction: "merge-parties",
    proposedPatch: null,
    reversibility: "instant",
    assignedToUserId: null,
    assignedByUserId: null,
    assignedAt: null,
    firstDetectedAt: "2026-10-01T00:00:00Z",
    lastSeenAt: "2026-10-01T00:00:00Z",
    resolvedAt: null,
    resolvedByUserId: null,
    resolutionId: null,
    undoToken: null,
    lastError: null,
    ageDays: 3,
    ...patch,
  };
}

describe("FindingRowActions", () => {
  it("offers a merge review, not a bare resolve, for an open merge-parties finding", () => {
    const onDecide = jest.fn();
    render(<FindingRowActions finding={finding()} canResolve onDecide={onDecide} />);

    expect(screen.queryByRole("button", { name: "Mark resolved" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review merge" }));
    expect(onDecide).toHaveBeenCalledWith(expect.objectContaining({ action: "merge" }));
  });

  it("offers undo for a resolved merge that recorded its merge id", () => {
    const onDecide = jest.fn();
    render(
      <FindingRowActions
        finding={finding({ status: "resolved", resolutionId: "r-1", undoToken: { partyMergeId: "m-1" } })}
        canResolve
        onDecide={onDecide}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onDecide).toHaveBeenCalledWith(expect.objectContaining({ action: "reverse" }));
  });

  it("does not offer undo for a resolved merge with no merge to revert from", () => {
    render(
      <FindingRowActions
        finding={finding({ status: "resolved", resolutionId: "r-1", undoToken: null })}
        canResolve
        onDecide={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("renders nothing without the resolve permission", () => {
    const { container } = render(<FindingRowActions finding={finding()} canResolve={false} onDecide={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
