import React from "react";
import type { PropsWithChildren } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";

jest.mock("lucide-react", () => {
  const Svg = ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  );
  return { ChevronLeft: Svg, ChevronRight: Svg, WifiOff: Svg };
});

jest.mock("next/navigation", () => ({
  usePathname: () => "/hr",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: PropsWithChildren<{ href: string; [k: string]: unknown }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

jest.mock("next/dynamic", () => () => () => null);

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    children,
    open: _open,
  }: PropsWithChildren<{ open?: boolean; onOpenChange?: (v: boolean) => void; modal?: boolean }>) => (
    <>{children}</>
  ),
  DrawerContent: ({ children }: PropsWithChildren) => <>{children}</>,
  DrawerTitle: ({ children, className }: PropsWithChildren<{ className?: string }>) => (
    <h2 className={className}>{children}</h2>
  ),
  DrawerDescription: ({ children, className }: PropsWithChildren<{ className?: string }>) => (
    <p className={className}>{children}</p>
  ),
}));

const mockHomeIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} />
);

jest.mock("@/components/layout/mobile/mobile-module-nav-items", () => {
  const icon = ({ className }: { className?: string }) => (
    <svg aria-hidden="true" className={className} />
  );
  const routeA = { href: "/hr", label: "HR Home", icon };
  const routeB = { href: "/hr/leaves", label: "Leaves", icon };
  const routeC = { href: "/hr/attendance", label: "Attendance", icon };
  const routeD = { href: "/hr/documents", label: "Documents", icon };
  const routeE = { href: "/hr/payroll", label: "Payroll", icon };

  return {
    getMobileModuleBottomTabs: () => [routeA, routeB, routeC, routeD],
    getMobileModuleOverflowTabs: () => [routeE],
    getOverflowTabsByGroup: () => [{ label: "HR", routes: [routeE] }],
    isMobileNavRouteActive: (path: string, route: { href: string }) =>
      path === route.href,
    shouldShowMobileModuleBottomNav: () => true,
    getMobileModuleContentPaddingClassName: () => "",
  };
});

jest.mock("@/components/layout/sidebar/use-product-sidebar-visibility", () => ({
  useProductSidebarVisibility: () => ({
    navGroups: [],
    hideSidebar: false,
    showSidebarToggle: true,
  }),
}));

// DashboardShell mocks (for skip-to-content test)
jest.mock("@/components/layout/app-sidebar", () => ({
  AppSidebar: () => null,
}));

jest.mock("@/components/layout/header/global-header", () => ({
  GlobalHeader: () => null,
}));

jest.mock("@/components/layout/command-palette", () => ({
  CommandPalette: () => null,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useCan: () => true,
}));

jest.mock("@/hooks/common/use-push-subscription", () => ({
  usePushSubscription: jest.fn(),
}));

jest.mock("@/components/billing/trial-banner", () => ({
  TrialBanner: () => null,
}));

jest.mock("@/components/layout/header/product-switcher-menu", () => ({
  ProductSwitcherMenu: () => null,
}));

jest.mock("@/components/assistant/ask-os-provider", () => ({
  AskOsProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock("@/components/command-palette", () => ({
  CommandPaletteProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock("@/components/layout/mobile/chat-mobile-chrome-layout", () => ({
  getChatMobileContentPaddingClassName: () => "",
}));

jest.mock("@/components/layout/mobile/mobile-shell-fab", () => ({
  MobileShellFab: () => null,
}));

jest.mock("@/components/layout/shell-offline-banner", () => ({
  ShellOfflineBanner: () => null,
}));

jest.mock("@/components/layout/sidebar/sidebar-nav-items", () => ({
  isPortalChromelessPath: () => false,
}));

jest.mock("@/hooks/common/use-route-focus", () => ({
  useRouteFocus: jest.fn(),
}));

void mockHomeIcon;

import { SidebarCollapseToggle } from "@/components/layout/header/sidebar-collapse-toggle";
import { MobileModuleBottomNav } from "@/components/layout/mobile/mobile-module-bottom-nav";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// ─── SidebarCollapseToggle keyboard ──────────────────────────────────────────

describe("keyboard — SidebarCollapseToggle", () => {
  it("button is reachable: it exists in the DOM with role=button", () => {
    render(<SidebarCollapseToggle isCollapsed={false} onToggle={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("reports aria-expanded=true when sidebar is expanded", () => {
    render(<SidebarCollapseToggle isCollapsed={false} onToggle={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("reports aria-expanded=false when sidebar is collapsed", () => {
    render(<SidebarCollapseToggle isCollapsed={true} onToggle={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onToggle when the button is activated", () => {
    const onToggle = jest.fn();
    render(<SidebarCollapseToggle isCollapsed={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("BITE PROOF — aria-expanded attribute is present and correct", () => {
    render(<SidebarCollapseToggle isCollapsed={false} onToggle={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});

// ─── Skip-to-content link ────────────────────────────────────────────────────

describe("keyboard — skip-to-content link (DashboardShell)", () => {
  it("renders a link that targets #dashboard-content", () => {
    renderWithProviders(
      <DashboardShell userId="u1" defaultCollapsed={false}>
        <div>content</div>
      </DashboardShell>,
    );
    const link = screen.getByRole("link", { name: /Skip to content/i });
    expect(link).toHaveAttribute("href", "#dashboard-content");
  });

  it("link carries sr-only class so it is visually hidden by default", () => {
    renderWithProviders(
      <DashboardShell userId="u1" defaultCollapsed={false}>
        <div>content</div>
      </DashboardShell>,
    );
    const link = screen.getByRole("link", { name: /Skip to content/i });
    expect(link.className).toContain("sr-only");
  });

  it("link carries focus:not-sr-only class so it becomes visible on focus", () => {
    renderWithProviders(
      <DashboardShell userId="u1" defaultCollapsed={false}>
        <div>content</div>
      </DashboardShell>,
    );
    const link = screen.getByRole("link", { name: /Skip to content/i });
    expect(link.className).toContain("focus:not-sr-only");
  });

  it("main content landmark carries the id the skip link targets", () => {
    renderWithProviders(
      <DashboardShell userId="u1" defaultCollapsed={false}>
        <div>content</div>
      </DashboardShell>,
    );
    expect(document.getElementById("dashboard-content")).not.toBeNull();
  });
});

// ─── MobileModuleBottomNav — MoreTab aria-expanded ───────────────────────────

describe("keyboard — MobileModuleBottomNav MoreTab", () => {
  it("renders the nav landmark so the suite cannot pass vacuously", () => {
    render(<MobileModuleBottomNav />);
    expect(
      screen.getByRole("navigation", { name: "Module navigation" }),
    ).toBeInTheDocument();
  });

  it("MoreTab button has aria-expanded=false when drawer is closed", () => {
    render(<MobileModuleBottomNav />);
    const moreBtn = screen.getByRole("button", {
      name: "More navigation options",
    });
    expect(moreBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("MoreTab button has aria-expanded=true after being clicked", () => {
    render(<MobileModuleBottomNav />);
    const moreBtn = screen.getByRole("button", {
      name: "More navigation options",
    });
    fireEvent.click(moreBtn);
    expect(moreBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("BITE PROOF — MoreTab button exposes aria-expanded", () => {
    render(<MobileModuleBottomNav />);
    const moreBtn = screen.getByRole("button", {
      name: "More navigation options",
    });
    expect(moreBtn).toHaveAttribute("aria-expanded");
  });

  it("aria-current=page is set on the active nav item and absent on inactive ones", () => {
    render(<MobileModuleBottomNav />);
    const activeLink = screen.getByRole("link", { name: "HR Home" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
    const inactiveLink = screen.getByRole("link", { name: "Leaves" });
    expect(inactiveLink).not.toHaveAttribute("aria-current");
  });
});

/*
 * Colour contrast is NOT asserted. axe in jsdom cannot compute CSS, so contrast
 * ratios are unverifiable here. Test with Lighthouse or Playwright-axe against a
 * running instance with real CSS applied.
 *
 * Layout, viewport and media queries are not tested; jsdom does not evaluate them.
 */
