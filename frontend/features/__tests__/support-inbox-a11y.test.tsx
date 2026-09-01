import React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} aria-hidden="true" />
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    variant: _v,
  }: React.PropsWithChildren<{ className?: string; variant?: string }>) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyInboxIllustration: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
}));

jest.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

import { TicketList } from "@/features/support/inbox/ticket-list";
import type { SupportTicket } from "@/types/support";

const NOW = new Date("2026-09-01T09:00:00Z");

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 1,
    orgId: "org-1",
    title: "Login button unresponsive",
    category: "Technical",
    description: null,
    clientId: null,
    priority: "HIGH",
    status: "OPEN",
    assigneeId: null,
    queueId: null,
    mergedIntoTicketId: null,
    snoozedUntil: null,
    snoozedBy: null,
    createdBy: "user-1",
    slaDeadline: null,
    firstResponseDueAt: null,
    firstRespondedAt: null,
    slaPausedAt: null,
    resolvedAt: null,
    closedAt: null,
    client: null,
    assignee: null,
    creator: { id: "user-1", name: "Alice" },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const MOCK_TICKETS: SupportTicket[] = [
  makeTicket({ id: 1, title: "Login button unresponsive", priority: "HIGH" }),
  makeTicket({ id: 2, title: "Export CSV returns empty file", priority: "MEDIUM", status: "IN_PROGRESS" }),
  makeTicket({ id: 3, title: "Cannot reset password", priority: "URGENT", status: "WAITING" }),
];

describe("a11y — Support/Inbox surface (TicketList)", () => {
  it("passes axe with ticket list at desktop (1280px)", async () => {
    const restore = atViewport("desktop");
    try {
      const { baseElement } = render(
        <TicketList
          tickets={MOCK_TICKETS}
          isLoading={false}
          selectedTicketId={null}
          onSelect={jest.fn()}
        />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(
        <TicketList
          tickets={MOCK_TICKETS}
          isLoading={false}
          selectedTicketId={null}
          onSelect={jest.fn()}
        />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 768px tablet", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(
        <TicketList
          tickets={MOCK_TICKETS}
          isLoading={false}
          selectedTicketId={null}
          onSelect={jest.fn()}
        />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("renders all ticket titles", () => {
    render(
      <TicketList
        tickets={MOCK_TICKETS}
        isLoading={false}
        selectedTicketId={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("Login Button Unresponsive")).toBeInTheDocument();
    expect(screen.getByText("Export CSV Returns Empty File")).toBeInTheDocument();
  });

  it("ticket list items are keyboard operable buttons with type=button", () => {
    render(
      <TicketList
        tickets={MOCK_TICKETS}
        isLoading={false}
        selectedTicketId={null}
        onSelect={jest.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("type", "button");
    }
  });

  it("loading state passes axe", async () => {
    const { baseElement } = render(
      <TicketList
        tickets={[]}
        isLoading={true}
        selectedTicketId={null}
        onSelect={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("empty state renders without crash", () => {
    render(
      <TicketList
        tickets={[]}
        isLoading={false}
        selectedTicketId={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("No tickets found")).toBeInTheDocument();
  });

  it("BITE PROOF (axe) — TicketListItem buttons have type=button preventing accidental form submit", () => {
    render(
      <TicketList
        tickets={[makeTicket({ id: 10, title: "Test ticket" })]}
        isLoading={false}
        selectedTicketId={null}
        onSelect={jest.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("BITE PROOF (viewport 375px) — ticket list visible on mobile", () => {
    const restore = atViewport("mobile");
    try {
      render(
        <TicketList
          tickets={MOCK_TICKETS}
          isLoading={false}
          selectedTicketId={null}
          onSelect={jest.fn()}
        />,
      );
      expect(screen.getByText("Login Button Unresponsive")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
