import { render, screen } from "@testing-library/react";
import { FolderIcon } from "lucide-react";
import { BuildNavLink, BUILD_NAV_BADGE_CAP } from "./build-nav-link";
import { BuildDirtyStateProvider } from "./build-dirty-state-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BuildNavDestination } from "@/lib/build/nav/build-nav-destination";
import type { ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/components/layout/nav-intent-prefetch", () => ({
  useNavIntentPrefetch: () => jest.fn(),
}));

jest.mock("@/components/layout/nav-pending-indicator", () => ({
  NavPendingIndicator: () => null,
}));

const destination: BuildNavDestination = {
  id: "build-inbox",
  label: "Inbox",
  href: "/build/inbox",
  icon: FolderIcon,
  requiredPermission: "build:approvals:view",
};

const accent: ModuleAccent = { bg: "", text: "", indicator: "" } as ModuleAccent;

function renderLink(opts: { isCollapsed: boolean; badgeCount?: number }) {
  return render(
    <TooltipProvider>
      <BuildDirtyStateProvider>
        <BuildNavLink
          destination={destination}
          isActive={false}
          isCollapsed={opts.isCollapsed}
          accent={accent}
          badgeCount={opts.badgeCount}
        />
      </BuildDirtyStateProvider>
    </TooltipProvider>,
  );
}

describe("BuildNavLink badge — BSN-03-023 zero-omission and accessible labels", () => {
  describe("collapsed mode", () => {
    it("does not render the badge dot when count is zero", () => {
      renderLink({ isCollapsed: true, badgeCount: 0 });
      expect(
        document.querySelector(".bg-status-danger-fill"),
      ).not.toBeInTheDocument();
    });

    it("renders the badge dot when count is non-zero", () => {
      renderLink({ isCollapsed: true, badgeCount: 3 });
      expect(
        document.querySelector(".bg-status-danger-fill"),
      ).toBeInTheDocument();
    });

    it("gives the link an aria-label that announces the count", () => {
      renderLink({ isCollapsed: true, badgeCount: 3 });
      expect(screen.getByRole("link", { name: "Inbox, 3 pending" })).toBeInTheDocument();
    });

    it("gives the link an aria-label with just the label when count is zero", () => {
      renderLink({ isCollapsed: true, badgeCount: 0 });
      expect(screen.getByRole("link", { name: "Inbox" })).toBeInTheDocument();
    });

    it("says 'more than N' when count exceeds the cap — not the cap literal", () => {
      renderLink({ isCollapsed: true, badgeCount: BUILD_NAV_BADGE_CAP + 1 });
      expect(
        screen.getByRole("link", {
          name: `Inbox, more than ${BUILD_NAV_BADGE_CAP} pending`,
        }),
      ).toBeInTheDocument();
    });
  });

  describe("expanded mode", () => {
    it("does not render a badge element when count is zero", () => {
      renderLink({ isCollapsed: false, badgeCount: 0 });
      expect(
        document.querySelector(".bg-status-danger-fill"),
      ).not.toBeInTheDocument();
    });

    it("renders a visually-hidden sr-only pending count for screen readers", () => {
      renderLink({ isCollapsed: false, badgeCount: 5 });
      const srSpan = document.querySelector(".sr-only");
      expect(srSpan).toBeInTheDocument();
      expect(srSpan?.textContent).toContain("5 pending");
    });

    it("says 'more than N pending' in the sr-only span when count exceeds cap", () => {
      renderLink({ isCollapsed: false, badgeCount: BUILD_NAV_BADGE_CAP + 5 });
      const srSpan = document.querySelector(".sr-only");
      expect(srSpan?.textContent).toContain(`more than ${BUILD_NAV_BADGE_CAP} pending`);
    });

    it("makes the visual badge aria-hidden so AT does not double-announce", () => {
      renderLink({ isCollapsed: false, badgeCount: 5 });
      const visualBadge = document.querySelector(
        ".bg-status-danger-fill",
      ) as HTMLElement | null;
      expect(visualBadge).toBeInTheDocument();
      expect(visualBadge?.getAttribute("aria-hidden")).toBe("true");
    });

    it("BSN-03-A08: accessible name includes the pending count equivalently to collapsed", () => {
      const { unmount: unmountExpanded } = renderLink({
        isCollapsed: false,
        badgeCount: 7,
      });
      const srSpan = document.querySelector(".sr-only");
      const expandedPendingText = srSpan?.textContent ?? "";
      unmountExpanded();

      renderLink({ isCollapsed: true, badgeCount: 7 });
      const collapsedLabel =
        screen.getByRole("link").getAttribute("aria-label") ?? "";

      expect(expandedPendingText).toContain("7 pending");
      expect(collapsedLabel).toContain("7 pending");
    });
  });
});
