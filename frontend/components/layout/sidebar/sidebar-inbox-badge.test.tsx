import React from "react";
import { render, screen } from "@testing-library/react";
import { SidebarSection } from "./sidebar-section";
import type { NavGroup } from "./sidebar-nav-types";

const MockIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} />
);

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useLinkStatus: () => ({ pending: false }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: function Link({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }
  >) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

jest.mock("@/components/layout/nav-intent-prefetch", () => ({
  useNavIntentPrefetch: () => jest.fn(),
}));

jest.mock("@/components/layout/nav-pending-indicator", () => ({
  NavPendingIndicator: () => null,
}));

jest.mock("@/components/layout/nav-lock-badge", () => ({
  NavLockBadge: () => null,
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children, asChild: _a }: React.PropsWithChildren<{ asChild?: boolean }>) => <>{children}</>,
  TooltipContent: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const ACCENT = {
  text: "text-primary",
  bg: "bg-muted",
  indicator: "bg-primary",
  border: "border-border",
};

const INBOX_GROUP: NavGroup = {
  label: "Communication",
  product: "home",
  routes: [
    {
      label: "Inbox",
      href: "/inbox",
      icon: MockIcon,
      badge: "inbox" as const,
    },
  ],
};

const OTHER_GROUP: NavGroup = {
  label: "Overview",
  product: "home",
  routes: [
    {
      label: "Home",
      href: "/dashboard",
      icon: MockIcon,
    },
  ],
};

function renderSection(inboxCount: number, group: NavGroup = INBOX_GROUP) {
  return render(
    <SidebarSection
      group={group}
      groupIndex={0}
      isCollapsed={false}
      pendingLeaves={0}
      inboxCount={inboxCount}
      accent={ACCENT}
    />,
  );
}

describe("sidebar inbox badge — expanded view", () => {
  describe("badge renders the unread total when non-zero; renders nothing when count is 0", () => {
    it("positive: badge is present with the unread total when inboxCount is non-zero", () => {
      renderSection(5);
      expect(screen.getByRole("img", { name: "5 unread" })).toBeInTheDocument();
    });

    it("negative: no badge renders when inboxCount is 0", () => {
      renderSection(0);
      expect(screen.queryByRole("img", { name: /unread/ })).toBeNull();
    });
  });

  describe("nothing renders while the query has not resolved (count is 0)", () => {
    it("positive: badge renders once the count resolves to a non-zero value", () => {
      renderSection(3);
      expect(screen.getByRole("img", { name: "3 unread" })).toBeInTheDocument();
    });

    it("negative: no badge is present while the count is still 0 (query unresolved)", () => {
      renderSection(0);
      expect(screen.queryByRole("img", { name: /unread/ })).toBeNull();
    });
  });

  describe("displayed value equals what the bell shows for the same total field", () => {
    it("positive: badge shows the exact total when it is below the 99+ cap", () => {
      renderSection(42);
      expect(screen.getByRole("img", { name: "42 unread" })).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("positive: badge caps at 99+ exactly as the bell does when total exceeds 99", () => {
      renderSection(150);
      expect(screen.getByRole("img", { name: "99+ unread" })).toBeInTheDocument();
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("negative: badge does not show 99+ when total is exactly 99 — it shows 99", () => {
      renderSection(99);
      expect(screen.getByRole("img", { name: "99 unread" })).toBeInTheDocument();
      expect(screen.queryByText("99+")).toBeNull();
    });
  });

  describe("badge carries accessible text, not a bare digit", () => {
    it("positive: badge span has role=img with a meaningful aria-label containing the count", () => {
      renderSection(12);
      const badge = screen.getByRole("img", { name: "12 unread" });
      expect(badge).toBeInTheDocument();
    });

    it("negative: a route without the inbox badge key does not render a count badge", () => {
      renderSection(12, OTHER_GROUP);
      expect(screen.queryByRole("img", { name: /unread/ })).toBeNull();
    });
  });
});
