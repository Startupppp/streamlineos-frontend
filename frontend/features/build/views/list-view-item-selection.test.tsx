import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  InlineModule: () => null,
}));

jest.mock("./card-inline-date-fields", () => ({
  InlineDueDate: () => null,
}));

jest.mock("./ticket-quick-actions", () => ({
  TicketQuickActions: ({ className, open }: { className?: string; open?: boolean }) => {
    mockTicketQuickActionsClassName = className;
    return open ? <div data-testid="row-menu-open" /> : null;
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
import { ModuleNamesProvider } from "./module-names-context";
import type { Ticket } from "./list-view-shared";

const TICKET: Ticket = {
  id: 42,
  title: "Fix the bug",
  status: "TODO",
  type: "TASK",
  version: 2,
};

describe("ListViewItem — All Work responsive hierarchy", () => {
  it("reserves a full mobile line for the title and exposes its complete accessible name", () => {
    render(
      <ListViewItem
        ticket={{ ...TICKET, title: "A long ticket title that must remain readable" }}
        onClick={jest.fn()}
        layout="work-index"
      />,
    );

    const title = screen.getByRole("button", {
      name: "Open A long ticket title that must remain readable",
    });
    expect(title.className).toContain("w-full");
    expect(title.className).toContain("basis-full");
    expect(title.className).toContain("sm:w-auto");
  });
});

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

describe("ListViewItem — cycle and module metadata", () => {
  it("shows the cycle name badge when showCycle is true and the ticket has a cycle", () => {
    const ticket: Ticket = {
      ...TICKET,
      cycleId: 3,
      cycle: { id: 3, name: "Sprint 7", status: "active", startDate: "2026-01-01", endDate: "2026-01-14" },
    };
    render(
      <ListViewItem
        ticket={ticket}
        onClick={jest.fn()}
        displayOptions={{ showCycle: true } as never}
      />,
    );
    expect(screen.getByText("Sprint 7")).toBeDefined();
  });

  it("hides the cycle name badge when showCycle is false", () => {
    const ticket: Ticket = {
      ...TICKET,
      cycleId: 3,
      cycle: { id: 3, name: "Sprint 7", status: "active", startDate: "2026-01-01", endDate: "2026-01-14" },
    };
    render(
      <ListViewItem
        ticket={ticket}
        onClick={jest.fn()}
        displayOptions={{ showCycle: false } as never}
      />,
    );
    expect(screen.queryByText("Sprint 7")).toBeNull();
  });

  it("shows the module by name, never by id, when the board knows the module", () => {
    const ticket: Ticket = { ...TICKET, moduleId: 11 };
    render(
      <ModuleNamesProvider modules={[{ id: 11, name: "Payments" }]}>
        <ListViewItem ticket={ticket} onClick={jest.fn()} />
      </ModuleNamesProvider>,
    );
    expect(screen.getByText("Payments")).toBeDefined();
    expect(screen.queryByText("M-11")).toBeNull();
  });

  it("shows no module badge for a moduleId the board has no name for, rather than printing the id", () => {
    const ticket: Ticket = { ...TICKET, moduleId: 11 };
    render(
      <ModuleNamesProvider modules={[{ id: 4, name: "Payments" }]}>
        <ListViewItem ticket={ticket} onClick={jest.fn()} />
      </ModuleNamesProvider>,
    );
    expect(screen.queryByText("Payments")).toBeNull();
    expect(screen.queryByText(/11/)).toBeNull();
  });

  it("does not show a module badge when moduleId is null", () => {
    render(<ListViewItem ticket={TICKET} onClick={jest.fn()} />);
    expect(screen.queryByText(/M-\d+/)).toBeNull();
  });
});

describe("ListViewItem — the assignee set, not only the first assignee", () => {
  const THREE_ASSIGNEES: Ticket = {
    ...TICKET,
    assignees: [
      { user: { id: "u1", name: "Ada Lovelace" } },
      { user: { id: "u2", name: "Grace Hopper" } },
      { user: { id: "u3", name: "Alan Turing" } },
    ],
  };

  it("counts the assignees beyond the first one", () => {
    render(<ListViewItem ticket={THREE_ASSIGNEES} onClick={jest.fn()} />);
    expect(screen.getByText("+2")).toBeDefined();
  });

  it("shows no overflow count for a single assignee, so the count is the set size and not a constant", () => {
    render(
      <ListViewItem
        ticket={{ ...TICKET, assignees: [{ user: { id: "u1", name: "Ada Lovelace" } }] }}
        onClick={jest.fn()}
      />,
    );
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it("shows no overflow count when the row carries no assignee set at all", () => {
    render(<ListViewItem ticket={TICKET} onClick={jest.fn()} />);
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });
});

describe("ListViewItem — rank is surfaced as the drag handle, not as a printed lexorank", () => {
  it("offers the reorder handle when the row is manually orderable", () => {
    render(
      <ListViewItem
        ticket={{ ...TICKET, rank: "0|hzzzzz:" }}
        onClick={jest.fn()}
        dragHandleProps={{} as never}
      />,
    );
    expect(screen.getByLabelText("Drag to reorder")).toBeDefined();
  });

  it("never prints the lexorank string, which is an internal ordering key", () => {
    render(<ListViewItem ticket={{ ...TICKET, rank: "0|hzzzzz:" }} onClick={jest.fn()} />);
    expect(screen.queryByText("0|hzzzzz:")).toBeNull();
    expect(screen.queryByLabelText("Drag to reorder")).toBeNull();
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

describe("ListViewItem — right click opens the row's own action menu", () => {
  function renderRow() {
    return render(<ListViewItem ticket={TICKET} onClick={jest.fn()} />);
  }

  it("keeps the menu closed until the row is right clicked", () => {
    renderRow();
    expect(screen.queryByTestId("row-menu-open")).toBeNull();
  });

  it("opens the menu on contextmenu and suppresses the browser menu", () => {
    const { container } = renderRow();
    const row = container.firstElementChild;
    if (row === null) throw new Error("the list row rendered nothing");
    const notPrevented = fireEvent.contextMenu(row);
    expect(notPrevented).toBe(false);
    expect(screen.getByTestId("row-menu-open")).toBeInTheDocument();
  });
});
