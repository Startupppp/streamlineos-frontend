import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
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
  TicketQuickActions: () => null,
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
