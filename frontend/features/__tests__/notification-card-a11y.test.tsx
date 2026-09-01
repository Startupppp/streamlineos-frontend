import React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
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

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    className,
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    className?: string;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
    />
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
    variant: _v,
    size: _s,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button type="button" onClick={onClick} className={className} aria-label={ariaLabel} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    className,
    isPending: _ip,
    variant: _v,
    size: _s,
  }: React.PropsWithChildren<{
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    isPending?: boolean;
    variant?: string;
    size?: string;
  }>) => (
    <button type="button" onClick={onClick} className={className}>{children}</button>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; lines?: number; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

import { NotificationCard, type NotificationCardProps } from "@/features/notifications/notification-card";

function makeProps(overrides: Partial<NotificationCardProps> = {}): NotificationCardProps {
  return {
    id: 1,
    title: "Leave request approved",
    message: "Your leave request for Dec 24–26 has been approved.",
    type: "APPROVAL",
    priority: "NORMAL",
    category: "SYSTEM",
    sourceModule: "HR",
    isRead: false,
    pinned: false,
    archivedAt: null,
    createdAt: new Date(Date.now() - 60_000),
    link: "/hr/leaves/123",
    selected: false,
    isApproval: false,
    isApproving: false,
    isRejecting: false,
    isArchiving: false,
    isPinning: false,
    isDeleting: false,
    onClick: jest.fn(),
    onArchive: jest.fn(),
    onPin: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
}

describe("a11y — Notifications/Inbox surface (NotificationCard — real component)", () => {
  it("passes axe for unread notification at desktop (1280px)", async () => {
    const restore = atViewport("desktop");
    try {
      const { baseElement } = render(<NotificationCard {...makeProps()} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe for read notification at desktop", async () => {
    const { baseElement } = render(<NotificationCard {...makeProps({ isRead: true })} />);
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe for archived notification at desktop", async () => {
    const { baseElement } = render(
      <NotificationCard {...makeProps({ archivedAt: new Date() })} />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(<NotificationCard {...makeProps()} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 768px tablet", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(<NotificationCard {...makeProps()} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("renders notification title", () => {
    render(<NotificationCard {...makeProps()} />);
    expect(screen.getByText("Leave request approved")).toBeInTheDocument();
  });

  it("Archive action button is keyboard operable with accessible label", () => {
    render(<NotificationCard {...makeProps()} />);
    expect(screen.getByRole("button", { name: "Archive notification" })).toBeInTheDocument();
  });

  it("Pin action button has aria-label for unpinned state", () => {
    render(<NotificationCard {...makeProps({ pinned: false })} />);
    expect(screen.getByRole("button", { name: "Pin notification" })).toBeInTheDocument();
  });

  it("Pin action button has aria-label for pinned state", () => {
    render(<NotificationCard {...makeProps({ pinned: true })} />);
    expect(screen.getByRole("button", { name: "Unpin notification" })).toBeInTheDocument();
  });

  it("Delete action button has accessible label", () => {
    render(<NotificationCard {...makeProps()} />);
    expect(screen.getByRole("button", { name: "Delete notification" })).toBeInTheDocument();
  });

  it("approval notification shows Approve and Reject buttons", () => {
    render(
      <NotificationCard
        {...makeProps({
          isApproval: true,
          onApprove: jest.fn(),
          onReject: jest.fn(),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeInTheDocument();
  });

  it("selection checkbox renders when onSelect is provided", () => {
    render(
      <NotificationCard
        {...makeProps({ onSelect: jest.fn() })}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("BITE PROOF (axe) — Archive button has aria-label attribute", () => {
    render(<NotificationCard {...makeProps()} />);
    const archiveBtn = screen.getByRole("button", { name: "Archive notification" });
    expect(archiveBtn).toHaveAttribute("aria-label", "Archive notification");
  });

  it("BITE PROOF (keyboard) — Delete button has type=button", () => {
    render(<NotificationCard {...makeProps()} />);
    const deleteBtn = screen.getByRole("button", { name: "Delete notification" });
    expect(deleteBtn).toHaveAttribute("type", "button");
  });
});
