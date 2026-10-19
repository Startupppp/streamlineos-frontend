import { render, screen } from "@testing-library/react";
import { CalendarCapacityAllocationProposal } from "./calendar-capacity-allocation-proposal";

const proposalState: { data: unknown } = { data: undefined };

jest.mock("@/hooks/api/calendar-source-actions", () => ({
  useCreateCalendarSourceActionProposal: () => ({ mutate: jest.fn(), isPending: false, error: null, reset: jest.fn() }),
  useConfirmCalendarSourceActionProposal: () => ({ mutate: jest.fn(), isPending: false, error: null }),
  useCalendarSourceActionProposal: () => proposalState,
}));

const allocation = {
  id: "00000000-0000-4000-8000-000000000001",
  bookingId: "10000000-0000-4000-8000-000000000001",
  start: "2026-10-24T09:00:00.000Z",
  end: "2026-10-24T10:00:00.000Z",
  units: 1,
  state: "confirmed" as const,
  version: "1",
  sourceKey: null,
  bookingLifecycleVersion: "2",
};

function proposal(status: string, stepStatus: string, decisions: unknown[]) {
  return {
    id: "p1",
    version: 2,
    status,
    steps: [{ id: "s1", status: stepStatus, outcomeMessage: null, impactPreview: null, sourceReceipt: { newStart: "2026-10-25T09:00:00.000Z", newEnd: "2026-10-25T10:00:00.000Z", decisions } }],
  };
}

describe("CalendarCapacityAllocationProposal", () => {
  it("shows each resource owner's receipt after a committed reschedule", () => {
    proposalState.data = proposal("COMPLETED", "COMMITTED", [
      { resourceId: 31, state: "committed" },
      { resourceId: 40, state: "pending" },
    ]);
    render(<CalendarCapacityAllocationProposal allocation={allocation} onDone={jest.fn()} />);
    expect(screen.getByText("Rescheduled")).toBeInTheDocument();
    expect(screen.getByText("Resource 31: Confirmed by owner")).toBeInTheDocument();
    expect(screen.getByText("Resource 40: Awaiting owner approval")).toBeInTheDocument();
  });

  it("shows the refusing owner when the reschedule is declined", () => {
    proposalState.data = proposal("PARTIAL", "DECLINED", [{ resourceId: 31, state: "rejected" }]);
    render(<CalendarCapacityAllocationProposal allocation={allocation} onDone={jest.fn()} />);
    expect(screen.getByText("Declined")).toBeInTheDocument();
    expect(screen.getByText("Resource 31: Refused by owner")).toBeInTheDocument();
  });
});
