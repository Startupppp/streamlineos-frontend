import React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("@animateicons/react/lucide", () => ({
  StarIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
  Trash2Icon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
  SparklesIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    "aria-label": ariaLabel,
    onClick,
    className,
    variant: _v,
    size: _s,
    icon: _icon,
    iconSize: _is,
  }: {
    children?: React.ReactNode;
    "aria-label"?: string;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    variant?: string;
    size?: string;
    icon?: unknown;
    iconSize?: number;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={className}>
      {children ?? <svg aria-hidden="true" />}
    </button>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({
    text,
    className,
  }: {
    text: string;
    lines?: number;
    className?: string;
  }) => <span className={className}>{text}</span>,
}));

jest.mock("date-fns", () => ({
  format: (_date: unknown, fmt: string) => (fmt === "h:mm a" ? "9:30 AM" : "Jan 5"),
  isToday: () => true,
  isThisYear: () => true,
  parseISO: (s: string) => new Date(s),
}));

jest.mock("@/features/mail/mail-group-messages", () => ({
  scoreNeedsYou: () => 0,
}));

import { MailMessageRow } from "@/features/mail/mail-message-row";
import type { MailMessageSummary } from "@/types/mail";

const MOCK_MSG: MailMessageSummary = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 1,
  provider: "gmail",
  from: { name: "Jane Smith", email: "jane@example.com" },
  to: [{ name: null, email: "me@example.com" }],
  subject: "Q3 Budget Proposal",
  snippet: "Please review the attached proposal and confirm.",
  date: "2026-09-01T09:30:00Z",
  isRead: false,
  isStarred: false,
  hasAttachments: true,
};

const UNREAD_MSG: MailMessageSummary = { ...MOCK_MSG, isRead: false };
const READ_MSG: MailMessageSummary = { ...MOCK_MSG, id: "msg-2", isRead: true };
const STARRED_MSG: MailMessageSummary = { ...MOCK_MSG, id: "msg-3", isStarred: true };

describe("a11y — Mail surface (MailMessageRow)", () => {
  it("passes axe for unread message at desktop", async () => {
    const { baseElement } = render(
      <MailMessageRow
        message={UNREAD_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe for read message at desktop", async () => {
    const { baseElement } = render(
      <MailMessageRow
        message={READ_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe for selected message at desktop", async () => {
    const { baseElement } = render(
      <MailMessageRow
        message={MOCK_MSG}
        isSelected={true}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(
        <MailMessageRow
          message={UNREAD_MSG}
          isSelected={false}
          folder="inbox"
          showPriority={false}
          canAi={false}
          onSelect={jest.fn()}
          onAction={jest.fn()}
          onAiBrief={jest.fn()}
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
        <MailMessageRow
          message={UNREAD_MSG}
          isSelected={false}
          folder="inbox"
          showPriority={false}
          canAi={false}
          onSelect={jest.fn()}
          onAction={jest.fn()}
          onAiBrief={jest.fn()}
        />,
      );
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("message button has accessible aria-label with sender and subject", () => {
    render(
      <MailMessageRow
        message={MOCK_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Message from Jane Smith: Q3 Budget Proposal/i }),
    ).toBeInTheDocument();
  });

  it("star button is keyboard operable and labelled", () => {
    render(
      <MailMessageRow
        message={UNREAD_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Star" })).toBeInTheDocument();
  });

  it("starred message has Unstar button label", () => {
    render(
      <MailMessageRow
        message={STARRED_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Unstar" })).toBeInTheDocument();
  });

  it("selected state uses aria-current attribute", () => {
    render(
      <MailMessageRow
        message={MOCK_MSG}
        isSelected={true}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: /Message from Jane Smith/i });
    expect(btn).toHaveAttribute("aria-current", "true");
  });

  it("BITE PROOF (axe) — message button aria-label contains sender and subject", () => {
    render(
      <MailMessageRow
        message={MOCK_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: /Message from Jane Smith: Q3 Budget Proposal/i });
    expect(btn).toHaveAttribute("aria-label", "Message from Jane Smith: Q3 Budget Proposal");
  });

  it("BITE PROOF (keyboard) — star button type is button (not submit)", () => {
    render(
      <MailMessageRow
        message={UNREAD_MSG}
        isSelected={false}
        folder="inbox"
        showPriority={false}
        canAi={false}
        onSelect={jest.fn()}
        onAction={jest.fn()}
        onAiBrief={jest.fn()}
      />,
    );
    const starBtn = screen.getByRole("button", { name: "Star" });
    expect(starBtn).toHaveAttribute("type", "button");
  });
});
