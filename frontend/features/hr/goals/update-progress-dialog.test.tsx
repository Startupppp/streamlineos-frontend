import { render, screen } from "@testing-library/react";
import { UpdateProgressDialog } from "./update-progress-dialog";
import type { HrGoal } from "@/hooks/api/hr";

const goal: HrGoal = {
  id: 1,
  orgId: "org-1",
  userId: "user-1",
  userMembershipId: null,
  title: "Increase NPS score",
  description: null,
  type: "numeric",
  targetValue: "80",
  currentValue: "60",
  unit: "points",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "active",
  progress: 60,
  parentGoalId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("UpdateProgressDialog", () => {
  it("exposes an accessible description so Radix emits no aria warning", () => {
    render(
      <UpdateProgressDialog
        goal={goal}
        progressValue={60}
        isPending={false}
        onOpenChange={jest.fn()}
        onRangeChange={jest.fn()}
        onNumberChange={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    expect(
      screen.getByText("Set the current completion percentage for this goal."),
    ).toBeInTheDocument();
  });
});
