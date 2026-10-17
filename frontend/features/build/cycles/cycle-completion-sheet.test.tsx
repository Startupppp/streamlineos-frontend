import { fireEvent, render, screen } from "@testing-library/react";
import type { Cycle, Ticket } from "@/types/projects";
import { CycleCompletionSheet } from "./cycle-completion-sheet";

const cycle: Cycle = {
  id: 1,
  projectId: 6,
  orgId: "org-1",
  name: "Current cycle",
  description: null,
  goal: null,
  capacity: null,
  status: "active",
  version: 1,
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const ticket: Ticket = {
  id: 1,
  orgId: "org-1",
  title: "Unfinished ticket",
  type: "task",
  status: "open",
  priority: null,
  projectId: 6,
  ticketNumber: 1,
  epicId: null,
  reporterId: null,
  points: null,
  storyPoints: null,
  link: null,
  rank: null,
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: null,
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: 1,
  sequenceId: null,
  estimate: null,
  version: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const nextCycle: Cycle = {
  ...cycle,
  id: 2,
  name: "Next cycle",
  status: "draft",
};

function renderSheet(options?: { next?: Cycle }) {
  const onConfirm = jest.fn();
  render(
    <CycleCompletionSheet
      cycle={cycle}
      nextCycle={options?.next}
      tickets={[ticket]}
      moveTo="backlog"
      isPending={false}
      onMoveToChange={jest.fn()}
      onCancel={jest.fn()}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm };
}

describe("CycleCompletionSheet destination choice", () => {
  it("renders the sole backlog outcome directly when no next cycle exists", () => {
    const { onConfirm } = renderSheet();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Move to backlog")).toBeInTheDocument();
    expect(screen.getByText("No next cycle is available.")).toBeInTheDocument();
    expect(screen.getByText("Review unfinished work and confirm this cycle’s completion.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Complete cycle" }));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it("keeps the selector when backlog and a next cycle are both meaningful choices", () => {
    renderSheet({ next: nextCycle });

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
