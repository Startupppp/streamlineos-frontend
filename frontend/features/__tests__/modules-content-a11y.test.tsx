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
describe("Module-level a11y — Knowledge/Wiki/Chatbot (KbPageNotFound)", () => {
  it("renders heading and action buttons for 404 error", () => {
    render(
      <KbPageNotFound
        error={{ status: 404 }}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Knowledge home/i })).toBeInTheDocument();
  });

  it("renders access-denied message for 403 error", () => {
    render(
      <KbPageNotFound
        error={{ status: 403 }}
        onRetry={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "You don't have access" }),
    ).toBeInTheDocument();
  });

  it("shows retry button for generic error (no status code)", () => {
    render(<KbPageNotFound error={new Error("Network error")} onRetry={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });

  it("passes axe for 404 variant", async () => {
    const { baseElement } = render(
      <KbPageNotFound error={{ status: 404 }} onRetry={jest.fn()} />,
    );
    await expectNoAxeViolations(baseElement);
  });
});

describe("Module-level a11y — Chat (ChannelAvatar)", () => {
  it("renders channel icon for non-DIRECT type without crash", () => {
    const { container } = render(
      <ChannelAvatar type="GROUP" name="Engineering" />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders DM avatar with fallback initials", () => {
    render(
      <ChannelAvatar
        type="DIRECT"
        otherMember={{ name: "Jane Doe" }}
      />,
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("passes axe for GROUP channel type", async () => {
    const { baseElement } = render(
      <ChannelAvatar type="GROUP" name="Engineering" />,
    );
    await expectNoAxeViolations(baseElement);
  });
});

describe("Module-level a11y — Home/Dashboard (HomeSectionBoundary)", () => {
  it("renders children when no error", () => {
    render(
      <HomeSectionBoundary sectionLabel="My Work">
        <div>My Work Content</div>
      </HomeSectionBoundary>,
    );
    expect(screen.getByText("My Work Content")).toBeInTheDocument();
  });

  it("passes axe with normal children", async () => {
    const { baseElement } = render(
      <HomeSectionBoundary sectionLabel="Announcements">
        <p>Announcement text</p>
      </HomeSectionBoundary>,
    );
    await expectNoAxeViolations(baseElement);
  });
});

describe("Module-level a11y — Workflows (WorkflowCard)", () => {
  it("renders workflow name and action buttons", () => {
    render(
      <WorkflowCard
        workflow={MOCK_WORKFLOW}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText("Employee Onboarding")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Duplicate workflow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete workflow" }),
    ).toBeInTheDocument();
  });

  it("passes axe for published workflow card", async () => {
    const { baseElement } = render(
      <WorkflowCard
        workflow={MOCK_WORKFLOW}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("BITE PROOF — fails if aria-label is removed from icon-only action buttons", () => {
    render(
      <WorkflowCard
        workflow={MOCK_WORKFLOW}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const deleteBtn = screen.getByRole("button", { name: "Delete workflow" });
    expect(deleteBtn).toHaveAttribute("aria-label", "Delete workflow");
  });
});
