import React from "react";
import { render, screen } from "@testing-library/react";
import { IntakeItemCard } from "./intake-item-card";

jest.mock("@animateicons/react/lucide", () => ({
  CheckIcon: (props: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
  XIcon: (props: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
  CopyIcon: (props: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    "aria-label": ariaLabel,
    onClick,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: unknown; iconSize?: number; iconClassName?: string; loadingText?: string }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/features/build/shared/priority-badge", () => ({
  PriorityBadge: ({ priority }: { priority: string }) => <span>{priority}</span>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const PENDING_ITEM = {
  id: 42,
  title: "Need dark mode",
  status: "pending",
  priority: "high" as const,
  requestType: "feature" as const,
};

describe("BUG-039 — Accept and Decline buttons have accessible names so screen readers and the eslint rule pass", () => {
  it("Accept button has an aria-label so screen readers can identify it", () => {
    render(
      <IntakeItemCard
        item={PENDING_ITEM}
        canManage
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDuplicate={jest.fn()}
      />,
    );
    const acceptBtn = screen.getByRole("button", { name: /accept.*work queue/i });
    expect(acceptBtn).toBeInTheDocument();
  });

  it("Decline button has an aria-label so screen readers can identify it", () => {
    render(
      <IntakeItemCard
        item={PENDING_ITEM}
        canManage
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDuplicate={jest.fn()}
      />,
    );
    const declineBtn = screen.getByRole("button", { name: /decline.*intake/i });
    expect(declineBtn).toBeInTheDocument();
  });

  it("Accept and Decline buttons are not rendered when canManage is false so non-managers cannot act", () => {
    render(
      <IntakeItemCard
        item={PENDING_ITEM}
        canManage={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDuplicate={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /decline/i })).not.toBeInTheDocument();
  });

  it("buttons are not rendered for non-pending items even when canManage is true", () => {
    render(
      <IntakeItemCard
        item={{ ...PENDING_ITEM, status: "accepted" }}
        canManage
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDuplicate={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /accept.*work queue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /decline.*intake/i })).not.toBeInTheDocument();
  });
});
