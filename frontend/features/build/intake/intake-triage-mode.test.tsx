import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntakeTriageMode } from "./intake-triage-mode";

jest.mock("@/features/build/shared/priority-badge", () => ({
  PriorityBadge: ({ priority }: { priority: string }) => <span>{priority}</span>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="triage-help-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

describe("IntakeTriageMode — keyboard help dialog (BT-6bce4f4e5ecd)", () => {
  it("does not show the help dialog on initial render so the default state is unobtrusive", () => {
    render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
    expect(screen.queryByTestId("triage-help-dialog")).not.toBeInTheDocument();
  });

  it("opens the keyboard help dialog when the ? button is clicked", () => {
    render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    expect(screen.getByTestId("triage-help-dialog")).toBeInTheDocument();
  });

  it("opens the help dialog when the ? key is pressed so keyboard-only users can discover shortcuts", () => {
    render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
    fireEvent.keyDown(document.body, { key: "?" });
    expect(screen.getByTestId("triage-help-dialog")).toBeInTheDocument();
  });

  it("shows the help dialog heading when opened", () => {
    render(<IntakeTriageMode items={ITEMS} {...makeHandlers()} />);
    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    expect(screen.getByText("Triage keyboard shortcuts")).toBeInTheDocument();
  });

  it("the ? key does not open help when focus is on an input so form users are not disrupted", () => {
    render(
      <div>
        <input data-testid="search-input" defaultValue="" />
        <IntakeTriageMode items={ITEMS} {...makeHandlers()} />
      </div>,
    );
    fireEvent.keyDown(screen.getByTestId("search-input"), { key: "?" });
    expect(screen.queryByTestId("triage-help-dialog")).not.toBeInTheDocument();
  });

  it("a key triggers accept on the current item confirming the keyboard shortcut is wired", () => {
    const handlers = makeHandlers();
    render(<IntakeTriageMode items={ITEMS} {...handlers} />);
    fireEvent.keyDown(document.body, { key: "a" });
    expect(handlers.onAccept).toHaveBeenCalledWith(10);
  });

  it("d key triggers decline on the current item confirming the keyboard shortcut is wired", () => {
    const handlers = makeHandlers();
    render(<IntakeTriageMode items={ITEMS} {...handlers} />);
    fireEvent.keyDown(document.body, { key: "d" });
    expect(handlers.onDecline).toHaveBeenCalledWith(10);
  });

  it("l key triggers duplicate/link on the current item confirming the keyboard shortcut is wired", () => {
    const handlers = makeHandlers();
    render(<IntakeTriageMode items={ITEMS} {...handlers} />);
    fireEvent.keyDown(document.body, { key: "l" });
    expect(handlers.onDuplicate).toHaveBeenCalledWith(10);
  });
});
