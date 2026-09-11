import React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";

const MockIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} />
);

jest.mock("lucide-react", () => ({
  WifiOff: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
  Search: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
  CalendarDays: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => false,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant: _v,
  }: React.PropsWithChildren<{ onClick?: () => void; variant?: string }>) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("next/dynamic", () => () => () => null);

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: React.PropsWithChildren<{ href: string; [k: string]: unknown }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({
    children,
    asChild: _a,
  }: React.PropsWithChildren<{ asChild?: boolean }>) => <>{children}</>,
  TooltipContent: () => null,
}));

jest.mock("@/components/layout/header/header-brand", () => ({
  HeaderBrand: () => <span>StreamlineOS</span>,
}));

jest.mock("@/components/layout/header/product-switcher-menu", () => ({
  ProductSwitcherMenu: () => null,
}));

jest.mock("@/components/layout/header/org-switcher", () => ({
  WorkspaceSwitcher: () => null,
}));

jest.mock("@/components/layout/header/pm-workspace-context-chip", () => ({
  PmWorkspaceContextChip: () => null,
}));

jest.mock("@/components/layout/header/quick-create-button", () => ({
  QuickCreateButton: () => null,
}));

jest.mock("@/components/layout/header/user-avatar-menu", () => ({
  UserAvatarMenu: () => null,
}));

jest.mock("@/components/layout/header/sidebar-collapse-toggle", () => ({
  SidebarCollapseToggle: ({
    isCollapsed,
    onToggle,
  }: {
    isCollapsed: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      onClick={onToggle}
    />
  ),
}));

void MockIcon;

import { ShellOfflineBanner } from "@/components/layout/shell-offline-banner";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
import { GlobalHeader } from "@/components/layout/header/global-header";

// ─── ShellOfflineBanner ───────────────────────────────────────────────────────

describe("a11y — ShellOfflineBanner (offline state)", () => {
  it("renders a live status region so screen-readers announce connectivity loss", () => {
    render(<ShellOfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("passes axe with no violations", async () => {
    const { baseElement } = render(<ShellOfflineBanner />);
    await expectNoAxeViolations(baseElement);
  });

  it("displays the offline message text", () => {
    render(<ShellOfflineBanner />);
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it("BITE PROOF — role=status is present (changing to role=alert makes this red)", () => {
    render(<ShellOfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

// ─── RouteErrorBoundary ───────────────────────────────────────────────────────

describe("a11y — RouteErrorBoundary (error state)", () => {
  const err = new Error("Simulated route error");

  it("renders a live alert region", () => {
    render(<RouteErrorBoundary error={err} reset={jest.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("passes axe with no violations", async () => {
    const { baseElement } = render(
      <RouteErrorBoundary error={err} reset={jest.fn()} />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("renders the error title as an accessible heading", () => {
    render(
      <RouteErrorBoundary error={err} reset={jest.fn()} title="Page crashed" />,
    );
    expect(
      screen.getByRole("heading", { name: "Page crashed" }),
    ).toBeInTheDocument();
  });

  it("Try Again button has an accessible name", () => {
    render(<RouteErrorBoundary error={err} reset={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /Try Again/i }),
    ).toBeInTheDocument();
  });

  it("BITE PROOF — Try Again button carries correct accessible name", () => {
    render(<RouteErrorBoundary error={err} reset={jest.fn()} />);
    const btn = screen.getByRole("button", { name: /Try Again/i });
    expect(btn).toBeInTheDocument();
  });
});

// ─── GlobalHeader ─────────────────────────────────────────────────────────────

describe("a11y — GlobalHeader", () => {
  it("renders a banner landmark", () => {
    render(<GlobalHeader showSidebarToggle={false} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("passes axe with no violations (desktop chrome, sidebar toggle shown)", async () => {
    const { baseElement } = render(
      <GlobalHeader
        isSidebarCollapsed={false}
        onToggleSidebar={jest.fn()}
        showSidebarToggle={true}
      />,
    );
    await expectNoAxeViolations(baseElement);
  });

  it("Search button exposes an accessible name", () => {
    render(<GlobalHeader showSidebarToggle={false} />);
    expect(
      screen.getByRole("button", { name: /Search/i }),
    ).toBeInTheDocument();
  });

  it("Calendar icon link has an accessible label", () => {
    render(<GlobalHeader showSidebarToggle={false} />);
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
  });

  it("Chat icon link has an accessible label", () => {
    render(<GlobalHeader showSidebarToggle={false} />);
    expect(screen.getByRole("link", { name: "Chat" })).toBeInTheDocument();
  });

  it("sidebar collapse toggle renders with accessible name when shown", () => {
    render(
      <GlobalHeader
        isSidebarCollapsed={false}
        onToggleSidebar={jest.fn()}
        showSidebarToggle={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("sidebar collapse toggle reports expanded=true when sidebar is open", () => {
    render(
      <GlobalHeader
        isSidebarCollapsed={false}
        onToggleSidebar={jest.fn()}
        showSidebarToggle={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("sidebar collapse toggle reports expanded=false when sidebar is collapsed", () => {
    render(
      <GlobalHeader
        isSidebarCollapsed={true}
        onToggleSidebar={jest.fn()}
        showSidebarToggle={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("Search button carries the exact aria-label", () => {
    render(<GlobalHeader showSidebarToggle={false} />);
    const btn = screen.getByRole("button", { name: /Search/i });
    expect(btn).toHaveAttribute("aria-label", "Search (⌘K)");
  });
});

/*
 * AppSidebar is not tested here. It requires mocking useSession (next-auth/react),
 * useAccess, useCan, useEnabledModules, usePendingApprovals, useChatUnreadTotal,
 * useUnreadNotificationCount, ScrollArea, TooltipProvider, and SidebarSection.
 * With all hooks returning empty / unauthenticated data the nav renders no items,
 * making any axe pass vacuous. Meaningful coverage needs integration infrastructure
 * or seeded navGroups; deferred to a future integration suite.
 *
 * Colour contrast is NOT tested here. axe in jsdom cannot evaluate computed styles,
 * so contrast ratios remain unverified. Use a real-browser tool (Lighthouse, axe
 * DevTools, or Playwright-axe) against a running instance instead.
 */
