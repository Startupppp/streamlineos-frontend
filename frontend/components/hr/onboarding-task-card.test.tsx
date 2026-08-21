import { fireEvent, render, screen } from "@testing-library/react";
import type { OnboardingTask } from "@/hooks/api/hr/onboarding";
import { OnboardingTaskCard } from "./onboarding-task-card";

const TASK: OnboardingTask = {
  id: 7,
  userId: "employee-1",
  orgId: "org-1",
  templateStepId: null,
  title: "Prepare workstation",
  description: "Set up the employee laptop.",
  ownerRole: "IT",
  dueDate: null,
  status: "PENDING",
  completedAt: null,
  completedBy: null,
  createdAt: null,
  canComplete: false,
};

describe("OnboardingTaskCard authorization", () => {
  it("shows status without a mutation control for a task owned by another role", () => {
    const onToggle = jest.fn();
    render(
      <OnboardingTaskCard
        task={TASK}
        onToggle={onToggle}
        isToggling={false}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Assigned to IT")).toBeInTheDocument();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("renders the completion control only when the API authorizes the task", () => {
    const onToggle = jest.fn();
    render(
      <OnboardingTaskCard
        task={{ ...TASK, ownerRole: "NEW_HIRE", canComplete: true }}
        onToggle={onToggle}
        isToggling={false}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith(TASK.id, "COMPLETED");
  });
});
