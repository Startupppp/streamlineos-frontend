import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckInDialog } from "./check-in-dialog";

jest.mock("@/hooks/api/goals", () => ({
  useCheckIn: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const makeKr = (id: number, title: string, current = "0") => ({
  id,
  orgId: "org-1",
  goalId: 1,
  title,
  metricType: "number" as const,
  startValue: "0",
  targetValue: "100",
  currentValue: current,
  unit: null,
  status: "not_started" as const,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("CheckInDialog — KR selector", () => {
  it("does not show a KR selector when there is only one key result", () => {
    render(
      <CheckInDialog
        goalId={1}
        keyResults={[makeKr(1, "Increase revenue")]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText("Key result")).toBeNull();
    expect(screen.getByText("Check in — Increase revenue")).toBeInTheDocument();
  });

  it("shows a KR selector when there are multiple key results", () => {
    render(
      <CheckInDialog
        goalId={1}
        keyResults={[makeKr(1, "Increase revenue"), makeKr(2, "Reduce churn")]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("Key result")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows both KR titles in the selector", () => {
    render(
      <CheckInDialog
        goalId={1}
        keyResults={[makeKr(1, "Increase revenue"), makeKr(2, "Reduce churn")]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByRole("option", { name: /Increase revenue/i, hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Reduce churn/i, hidden: true })).toBeInTheDocument();
  });

  it("renders nothing when keyResults is empty", () => {
    const { container } = render(
      <CheckInDialog
        goalId={1}
        keyResults={[]}
        onClose={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    render(
      <CheckInDialog
        goalId={1}
        keyResults={[makeKr(1, "Increase revenue")]}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
