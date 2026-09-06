import { fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { DashboardShell } from "./dashboard-shell";

const drawerCalls: Array<{ direction?: string; open?: boolean }> = [];
const productSwitcherCalls: Array<{ drawerOnly?: boolean }> = [];

jest.mock("next/dynamic", () => () => () => null);

jest.mock("next/link", () => ({
  __esModule: true,
  default: function Link({
    children,
    href,
    ...props
  }: PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  useLinkStatus: () => ({ pending: false }),
}));

let currentPathname = "/build";

jest.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

jest.mock("@/features/chat/chat-mobile-bottom-nav", () => ({
  ChatMobileBottomNav: function MockChatMobileBottomNav({
    onOpenMobileMenu,
  }: {
    onOpenMobileMenu: () => void;
  }) {
    return (
      <nav aria-label="Chat navigation" data-testid="chat-mobile-nav">
        <button type="button" onClick={onOpenMobileMenu} aria-label="Menu">
          Menu
        </button>
        <button type="button" aria-label="Search conversations">
          Search
        </button>
        <button type="button" aria-label="Explore channels">
          Explore
        </button>
        <button type="button" aria-label="Create">
          Create
        </button>
      </nav>
    );
  },
}));

jest.mock("./app-sidebar", () => ({
  AppSidebar: ({
    onNavigate,
  }: {
    onNavigate?: () => void;
  }) => (
    <button type="button" onClick={onNavigate}>
      Navigate
    </button>
  ),
}));

jest.mock("./header/global-header", () => ({
  GlobalHeader: () => null,
}));

jest.mock("./mobile/mobile-module-bottom-nav", () => ({
  MobileModuleBottomNav: () => null,
}));

jest.mock("./mobile/mobile-shell-fab", () => ({
  MobileShellFab: ({
    onOpenMobileMenu,
  }: {
    onOpenMobileMenu: () => void;
  }) => (
    <button type="button" onClick={onOpenMobileMenu}>
      Open menu
    </button>
  ),
}));

jest.mock("./command-palette", () => ({
  CommandPalette: () => null,
}));

jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    children,
    direction,
    open,
  }: PropsWithChildren<{ direction?: string; open?: boolean }>) => {
    drawerCalls.push({ direction, open });
    return <>{children}</>;
  },
  DrawerContent: ({ children }: PropsWithChildren) => <>{children}</>,
  DrawerTitle: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCan: () => true,
}));

jest.mock("@/hooks/common/use-push-subscription", () => ({
  usePushSubscription: jest.fn(),
}));

jest.mock("@/components/billing/trial-banner", () => ({
  TrialBanner: () => null,
}));

jest.mock("./header/product-switcher-menu", () => ({
  ProductSwitcherMenu: ({ drawerOnly }: { drawerOnly?: boolean }) => {
    productSwitcherCalls.push({ drawerOnly });
    return null;
  },
}));

jest.mock("./sidebar/use-product-sidebar-visibility", () => ({
  useProductSidebarVisibility: () => ({
    hideSidebar: false,
    navGroups: [
      {
        label: "Projects",
        routes: [
          { label: "Home", href: "/build/command-center", icon: () => null },
          { label: "Inbox", href: "/build/inbox", icon: () => null },
        ],
      },
    ],
  }),
}));

jest.mock("@/components/assistant/ask-os-provider", () => ({
  AskOsProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock("@/components/command-palette", () => ({
  CommandPaletteProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));

describe("DashboardShell mobile navigation", () => {
  beforeEach(() => {
    currentPathname = "/build";
    drawerCalls.length = 0;
    productSwitcherCalls.length = 0;
  });

  it("uses a bottom drawer and closes it after navigation", () => {
    render(
      <DashboardShell
        userId="user-1"
        defaultCollapsed={false}
        shellVariant="desktop"
      >
        <div>Content</div>
      </DashboardShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(drawerCalls.at(-1)).toEqual({ direction: "bottom", open: true });

    const navigationButtons = screen.getAllByRole("button", {
      name: "Navigate",
    });
    const mobileNavigationButton = navigationButtons.at(-1);
    if (!mobileNavigationButton) {
      throw new Error("Mobile navigation button was not rendered");
    }
    fireEvent.click(mobileNavigationButton);

    expect(drawerCalls.at(-1)).toEqual({ direction: "bottom", open: false });
  });

  it("configures the product switcher as a drawer", () => {
    render(
      <DashboardShell
        userId="user-1"
        defaultCollapsed={false}
        shellVariant="desktop"
      >
        <div>Content</div>
      </DashboardShell>,
    );

    expect(productSwitcherCalls.at(-1)).toEqual({ drawerOnly: true });
  });
});

describe("DashboardShell shell variant", () => {
  beforeEach(() => {
    currentPathname = "/build";
    drawerCalls.length = 0;
    productSwitcherCalls.length = 0;
  });

  it("desktop variant renders both the desktop aside and the mobile drawer AppSidebar", () => {
    render(
      <DashboardShell
        userId="user-1"
        defaultCollapsed={false}
        shellVariant="desktop"
      >
        <div>Content</div>
      </DashboardShell>,
    );
    // Mock AppSidebar renders a "Navigate" button in each location.
    // Desktop: aside (desktop) + Drawer (mobile menu) = 2 buttons.
    expect(screen.getAllByRole("button", { name: "Navigate" })).toHaveLength(2);
  });

  it("mobile variant renders only the mobile drawer AppSidebar, not the desktop aside", () => {
    render(
      <DashboardShell
        userId="user-1"
        defaultCollapsed={false}
        shellVariant="mobile"
      >
        <div>Content</div>
      </DashboardShell>,
    );
    // Only the Drawer AppSidebar is mounted; the desktop aside is skipped.
    expect(screen.getAllByRole("button", { name: "Navigate" })).toHaveLength(1);
  });

  it("defaults to desktop behaviour when shellVariant is omitted", () => {
    render(
      <DashboardShell userId="user-1" defaultCollapsed={false}>
        <div>Content</div>
      </DashboardShell>,
    );
    expect(screen.getAllByRole("button", { name: "Navigate" })).toHaveLength(2);
  });
});

describe("DashboardShell /chat mobile bottom nav", () => {
  beforeEach(() => {
    currentPathname = "/chat";
    drawerCalls.length = 0;
    productSwitcherCalls.length = 0;
  });

  afterEach(() => {
    currentPathname = "/build";
  });

  it("mobile variant on /chat renders ChatMobileBottomNav synchronously with ≥ 3 in-app nav links", () => {
    render(
      <DashboardShell
        userId="user-1"
        defaultCollapsed={false}
        shellVariant="mobile"
      >
        <div>Content</div>
      </DashboardShell>,
    );

    const chatNav = screen.queryByTestId("chat-mobile-nav");
    expect(chatNav).not.toBeNull();
    const buttons = chatNav?.querySelectorAll("button, a[href]") ?? [];
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("desktop variant on /chat does not render the synchronous ChatMobileBottomNav", () => {
    render(
      <DashboardShell
        userId="user-1"
        defaultCollapsed={false}
        shellVariant="desktop"
      >
        <div>Content</div>
      </DashboardShell>,
    );

    expect(screen.queryByRole("navigation", { name: "Chat navigation" })).toBeNull();
  });
});
