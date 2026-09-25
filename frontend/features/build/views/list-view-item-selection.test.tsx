import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockTicketQuickActionsClassName: string | undefined;

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
  },
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  ChevronRightIcon: ({ size }: { size?: number }) => (
    <svg data-testid="chevron" data-size={size} />
  ),
}));

jest.mock("../shared/ticket-type-icon", () => ({
  TicketTypeIcon: () => null,
}));

jest.mock("./card-inline-fields", () => ({
  InlineStatus: () => null,
  InlinePriority: () => null,
  InlineAssignee: () => null,
  InlineEstimate: () => null,
}));

jest.mock("./card-inline-extra-fields", () => ({
  InlineType: () => null,
  InlineLabels: () => null,
}));

jest.mock("./card-inline-date-fields", () => ({
  InlineDueDate: () => null,
}));

jest.mock("./ticket-quick-actions", () => ({
  TicketQuickActions: ({ className }: { className?: string }) => {
    mockTicketQuickActionsClassName = className;
    return null;
  },
}));

jest.mock("@/components/shared/ticket-status-badge", () => ({
  getStatusDotClass: () => "",
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  formatTicketKey: () => "TST-1",
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: () => "Test User",
  getUserInitials: () => "TU",
}));

jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: (string | false | undefined | null)[]) =>
    args.filter(Boolean).join(" "),
  resolveImageUrl: (url: unknown) => url,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text?: string | null }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

import { ListViewItem } from "./list-view-item";
import type { Ticket } from "./list-view-shared";

const TICKET: Ticket = {
  id: 42,
  title: "Fix the bug",
  status: "TODO",
  type: "TASK",
};

describe("ListViewItem — checkbox visibility", () => {
  it("does not render a checkbox when onSelect is not provided", () => {
    render(<ListViewItem ticket={TICKET} onClick={jest.fn()} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("renders a checkbox when onSelect is provided", () => {
    render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        onSelect={jest.fn()}
        isSelected={false}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeDefined();
  });
});

describe("ListViewItem — checkbox state", () => {
  it("renders an unchecked checkbox when isSelected is false", () => {
    render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        onSelect={jest.fn()}
        isSelected={false}
      />,
    );
    const checkbox = screen.getByRole("checkbox") as HTMLButtonElement;
    expect(checkbox.getAttribute("data-state")).toBe("unchecked");
  });

  it("renders a checked checkbox when isSelected is true", () => {
    render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        onSelect={jest.fn()}
        isSelected
      />,
    );
    const checkbox = screen.getByRole("checkbox") as HTMLButtonElement;
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  });
});

describe("ListViewItem — checkbox interaction", () => {
  it("calls onSelect with the ticket id and true when checkbox is checked", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        onSelect={onSelect}
        isSelected={false}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onSelect).toHaveBeenCalledWith(42, true);
  });

  it("calls onSelect with the ticket id and false when checkbox is unchecked", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        onSelect={onSelect}
        isSelected
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onSelect).toHaveBeenCalledWith(42, false);
  });
});

describe("ListViewItem — keyboard focus is visible and announced", () => {
  it("marks the focused row as current so assistive tech announces the position", () => {
    const { container } = render(
      <ListViewItem ticket={TICKET} onClick={jest.fn()} isKeyboardFocused />,
    );

    expect(container.querySelector("[aria-current]")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("gives the focused row a ring, so keyboard focus is not invisible", () => {
    const { container } = render(
      <ListViewItem ticket={TICKET} onClick={jest.fn()} isKeyboardFocused />,
    );

    const row = container.querySelector('[data-keyboard-focused="true"]');
    expect(row).toBeTruthy();
    expect(row?.className).toContain("ring-primary/40");
  });

  it("leaves an unfocused row unmarked, so not every row reads as current", () => {
    const { container } = render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        isKeyboardFocused={false}
      />,
    );

    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(container.querySelector("[data-keyboard-focused]")).toBeNull();
  });

  it("stays unmarked when no focus is passed, so existing callers are unaffected", () => {
    const { container } = render(
      <ListViewItem ticket={TICKET} onClick={jest.fn()} />,
    );

    expect(container.querySelector("[aria-current]")).toBeNull();
  });
});

describe("ListViewItem — row actions remain visible with focus", () => {
  it("reveals the drag handle for focus within the row without changing hover behavior", () => {
    render(
      <ListViewItem
        ticket={TICKET}
        onClick={jest.fn()}
        dragHandleProps={{
          "data-rfd-drag-handle-draggable-id": "42",
          "data-rfd-drag-handle-context-id": "list",
          role: "button",
          "aria-describedby": "drag-description",
          tabIndex: 0,
          draggable: false,
          onDragStart: jest.fn(),
        }}
      />,
    );

    const dragHandle = screen.getByLabelText("Drag to reorder");
    expect(dragHandle).toHaveClass("opacity-0");
    expect(dragHandle).toHaveClass("group-hover:opacity-100");
    expect(dragHandle).toHaveClass("group-focus-within:opacity-100");
  });

  it("reveals quick actions for focus within the row without changing hover behavior", () => {
    render(<ListViewItem ticket={TICKET} onClick={jest.fn()} projectId={7} />);

    expect(mockTicketQuickActionsClassName?.split(" ")).toEqual(
      expect.arrayContaining([
        "opacity-0",
        "translate-x-1",
        "group-hover:translate-x-0",
        "group-hover:opacity-100",
        "group-focus-within:translate-x-0",
        "group-focus-within:opacity-100",
      ]),
    );
  });
});
