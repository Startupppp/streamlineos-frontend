import React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} {...rest} />
  ),
}));

jest.mock("@/components/illustrations/state-illustration", () => ({
  StateIllustration: ({ preset, className }: { preset?: string; className?: string }) => (
    <svg data-testid={`illustration-${preset ?? "default"}`} aria-hidden="true" className={className} />
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({
    title = "Something went wrong",
    description,
    onRetry,
    compact,
  }: {
    title?: string;
    description?: string;
    onRetry?: () => void;
    compact?: boolean;
  }) => (
    <div role="alert">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  AvatarImage: ({ src }: { src?: string }) => <img src={src} alt="" />,
  AvatarFallback: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock("@/lib/api-client", () => ({
  isApiError: (e: unknown): e is { status?: number } =>
    typeof e === "object" && e !== null && "status" in e,
}));

jest.mock("@animateicons/react/lucide", () => ({
  CopyIcon: () => <svg aria-hidden="true" />,
  Trash2Icon: () => <svg aria-hidden="true" />,
  EllipsisIcon: () => <svg aria-hidden="true" />,
  ChevronLeftIcon: () => <svg aria-hidden="true" />,
  ChevronRightIcon: () => <svg aria-hidden="true" />,
  PlusIcon: () => <svg aria-hidden="true" />,
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  resolveImageUrl: (url?: string | null) => url ?? null,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    "aria-label": ariaLabel,
    onClick,
    variant,
    size,
    className,
  }: {
    children?: React.ReactNode;
    "aria-label"?: string;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    asChild,
    variant,
    className,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?: string;
  }) => {
    if (asChild && children) {
      return <>{children}</>;
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        data-variant={variant}
        {...rest}
      >
        {children}
      </button>
    );
  },
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 days ago",
}));

import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";
import { EmployeesGridSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { MyTicketsSkeleton } from "@/features/build/my-tickets/my-tickets-skeleton";
import { OverviewSkeleton } from "@/features/accounting/overview/overview-skeleton";
import { BillingPageSkeleton } from "@/features/billing/components/billing-page-skeleton";
import { KnowledgeGapStatusBadge } from "@/features/support/components/knowledge-gap-status-badge";
import { KbPageNotFound } from "@/features/wiki/components/kb-page-not-found";
import { ChannelAvatar } from "@/features/chat/channel-avatar";
import { HomeSectionBoundary } from "@/features/dashboard/home-section-boundary";
import { WorkflowCard } from "@/features/workflows/components/workflow-card";
import type { Workflow } from "@/hooks/api/workflows";

const MOCK_WORKFLOW: Workflow = {
  id: "wf-1",
  name: "Employee Onboarding",
  description: "Auto-assigns tasks when a new employee joins.",
  status: "published",
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  createdBy: null,
};
describe("Module-level a11y — Notifications/Inbox (NotificationListSkeleton)", () => {
  it("passes axe at desktop", async () => {
    const { baseElement } = render(<NotificationListSkeleton count={3} />);
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(<NotificationListSkeleton count={3} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });
});

describe("Module-level a11y — HRMS (EmployeesGridSkeleton)", () => {
  it("passes axe at desktop", async () => {
    const { baseElement } = render(<EmployeesGridSkeleton count={4} />);
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe at 768px tablet", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(<EmployeesGridSkeleton count={4} />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });
});

describe("Module-level a11y — Build/PM (MyTicketsSkeleton list view)", () => {
  it("passes axe in list view", async () => {
    const { baseElement } = render(<MyTicketsSkeleton view="list" />);
    await expectNoAxeViolations(baseElement);
  });

  it("passes axe in table view", async () => {
    const { baseElement } = render(<MyTicketsSkeleton view="table" />);
    await expectNoAxeViolations(baseElement);
  });
});

describe("Module-level a11y — Support (KnowledgeGapStatusBadge)", () => {
  const statuses = ["OPEN", "DRAFTED", "ROUTED", "PUBLISHED", "DISMISSED"] as const;

  for (const status of statuses) {
    it(`status=${status} passes axe`, async () => {
      const { baseElement } = render(<KnowledgeGapStatusBadge status={status} />);
      await expectNoAxeViolations(baseElement);
    });
  }

  it("renders visible text matching the status label", () => {
    render(<KnowledgeGapStatusBadge status="PUBLISHED" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("BITE PROOF — fails if status label is missing", () => {
    render(<KnowledgeGapStatusBadge status="OPEN" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.queryByText("OPEN")).not.toBeInTheDocument();
  });
});

describe("Module-level a11y — Accounting (OverviewSkeleton)", () => {
  it("renders without crash", () => {
    const { container } = render(<OverviewSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe("Module-level a11y — Billing (BillingPageSkeleton)", () => {
  it("renders without crash", () => {
    const { container } = render(<BillingPageSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
