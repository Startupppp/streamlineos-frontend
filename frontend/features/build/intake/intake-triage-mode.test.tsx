import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntakeTriageMode } from "./intake-triage-mode";

jest.mock("@/features/build/shared/priority-badge", () => ({
  PriorityBadge: ({ priority }: { priority: string }) => <span>{priority}</span>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const ITEMS = [
  {
    id: 10,
    title: "First request",
    status: "pending",
    description: "Detail A",
    submitterEmail: "a@example.test",
    submitterName: "Alice",
    priority: "high",
    requestType: "bug",
  },
  {
    id: 20,
    title: "Second request",
    status: "pending",
    description: "Detail B",
    submitterEmail: "b@example.test",
    submitterName: null,
  },
  {
    id: 30,
    title: "Third request",
    status: "pending",
  },
];

function makeHandlers() {
  return {
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    onDuplicate: jest.fn(),
    onExit: jest.fn(),
  };
}

it("shows item 1 of 3 and the first item title on mount", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
  expect(screen.getByText("First request")).toBeInTheDocument();
});

it("Previous button is disabled on the first item", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  expect(screen.getByRole("button", { name: "Previous item" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next item" })).not.toBeDisabled();
});

it("Next button is disabled on the last item", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  expect(screen.getByText("Item 3 of 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next item" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Previous item" })).not.toBeDisabled();
});

it("clicking Next shows the second item and clicking Previous returns to the first", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  expect(screen.getByText("Item 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Second request")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous item" }));
  expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
  expect(screen.getByText("First request")).toBeInTheDocument();
});

it("j key advances to the next item", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.keyDown(document.body, { key: "j" });
  expect(screen.getByText("Item 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Second request")).toBeInTheDocument();
});

it("k key returns to the previous item", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  expect(screen.getByText("Item 2 of 3")).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: "k" });
  expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
});

it("ArrowDown key advances to the next item", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.keyDown(document.body, { key: "ArrowDown" });
  expect(screen.getByText("Item 2 of 3")).toBeInTheDocument();
});

it("ArrowUp key returns to the previous item", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  fireEvent.keyDown(document.body, { key: "ArrowUp" });
  expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
});

it("j key does not fire when focus is on an input element", () => {
  render(
    <div>
      <input data-testid="text-input" defaultValue="" />
      <IntakeTriageMode items={ITEMS} {...makeHandlers()} />
    </div>,
  );
  const input = screen.getByTestId("text-input");
  fireEvent.keyDown(input, { key: "j" });
  expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
});

it("Accept button calls onAccept with the current item id", () => {
  const handlers = makeHandlers();
  render(<IntakeTriageMode items={ITEMS} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: /accept.*work queue/i }));
  expect(handlers.onAccept).toHaveBeenCalledWith(10);
  expect(handlers.onDecline).not.toHaveBeenCalled();
  expect(handlers.onDuplicate).not.toHaveBeenCalled();
});

it("Decline button calls onDecline with the current item id", () => {
  const handlers = makeHandlers();
  render(<IntakeTriageMode items={ITEMS} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: /decline.*intake/i }));
  expect(handlers.onDecline).toHaveBeenCalledWith(10);
  expect(handlers.onAccept).not.toHaveBeenCalled();
});

it("Link / Duplicate button calls onDuplicate with the current item id", () => {
  const handlers = makeHandlers();
  render(<IntakeTriageMode items={ITEMS} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: /link.*duplicate/i }));
  expect(handlers.onDuplicate).toHaveBeenCalledWith(10);
});

it("actions fire on the navigated-to item after Next is clicked", () => {
  const handlers = makeHandlers();
  render(<IntakeTriageMode items={ITEMS} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  fireEvent.click(screen.getByRole("button", { name: /accept.*work queue/i }));
  expect(handlers.onAccept).toHaveBeenCalledWith(20);
});

it("Exit triage button calls onExit", () => {
  const handlers = makeHandlers();
  render(<IntakeTriageMode items={ITEMS} {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: "Exit triage" }));
  expect(handlers.onExit).toHaveBeenCalledTimes(1);
});

it("shows the empty state with exit button when there are no items", () => {
  const handlers = makeHandlers();
  render(<IntakeTriageMode items={[]} {...handlers} />);
  expect(screen.getByText(/no pending items to triage/i)).toBeInTheDocument();
  expect(screen.queryByText(/item \d+ of/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Exit triage" }));
  expect(handlers.onExit).toHaveBeenCalledTimes(1);
});

it("renders the submitter name when present", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  expect(screen.getByText(/· Alice/)).toBeInTheDocument();
});

it("falls back to submitter email when name is absent", () => {
  render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
  fireEvent.click(screen.getByRole("button", { name: "Next item" }));
  expect(screen.getByText(/b@example\.test/)).toBeInTheDocument();
});

it("does not show action buttons in the empty state", () => {
  render(<IntakeTriageMode items={[]} {...makeHandlers()} />);
  expect(screen.queryByRole("button", { name: /accept.*work queue/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /decline.*intake/i })).not.toBeInTheDocument();
});
