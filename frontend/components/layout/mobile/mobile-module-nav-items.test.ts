import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Briefcase,
  Timer,
  Users,
} from "lucide-react";
import type { NavGroup } from "../sidebar/sidebar-nav-items";
import {
  getMobileModuleBottomTabs,
  getMobileModuleOverflowTabs,
  getOverflowTabsByGroup,
  getAllMobileModuleTabs,
  getMobileModuleContentPaddingClassName,
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
  MAX_MOBILE_MODULE_TABS,
  MOBILE_MODULE_CONTENT_PADDING_CLASS,
  MOBILE_PRIMARY_TABS_WHEN_OVERFLOW,
} from "./mobile-module-nav-items";

const projectsNav: NavGroup[] = [
  {
    label: "Projects",
    routes: [
      { label: "Home", icon: LayoutDashboard, href: "/projects/command-center" },
      { label: "Inbox", icon: Inbox, href: "/projects/inbox" },
      { label: "My issues", icon: CheckSquare, href: "/projects/my-work" },
      { label: "Drafts", icon: Inbox, href: "/projects/drafts" },
      { label: "All issues", icon: Briefcase, href: "/projects/all-work" },
      { label: "Projects", icon: Briefcase, href: "/projects", exact: true },
      { label: "Teams", icon: Users, href: "/projects/teams" },
    ],
  },
];

const smallNav: NavGroup[] = [
  {
    label: "Small",
    routes: [
      { label: "A", icon: LayoutDashboard, href: "/a" },
      { label: "B", icon: Inbox, href: "/b" },
      { label: "C", icon: CheckSquare, href: "/c" },
    ],
  },
];

const exactFiveNav: NavGroup[] = [
  {
    label: "Five",
    routes: [
      { label: "One", icon: LayoutDashboard, href: "/one" },
      { label: "Two", icon: Inbox, href: "/two" },
      { label: "Three", icon: CheckSquare, href: "/three" },
      { label: "Four", icon: Briefcase, href: "/four" },
      { label: "Five", icon: Users, href: "/five" },
    ],
  },
];

describe("mobile module nav items", () => {
  describe("getAllMobileModuleTabs", () => {
    it("returns all routes across groups with no cap", () => {
      const all = getAllMobileModuleTabs(projectsNav);
      expect(all).toHaveLength(7);
      expect(all[0]!.label).toBe("Home");
      expect(all[6]!.label).toBe("Teams");
    });

    it("deduplicates routes with the same href across groups", () => {
      const dupNav: NavGroup[] = [
        { label: "G1", routes: [{ label: "A", icon: LayoutDashboard, href: "/a" }] },
        { label: "G2", routes: [{ label: "A-dup", icon: Inbox, href: "/a" }] },
      ];
      expect(getAllMobileModuleTabs(dupNav)).toHaveLength(1);
    });
  });

  describe("getMobileModuleBottomTabs", () => {
    it("returns 4 primary tabs when overflow exists (>5 total routes)", () => {
      const tabs = getMobileModuleBottomTabs(projectsNav);
      expect(tabs).toHaveLength(4);
      expect(tabs.map((t) => t.label)).toEqual([
        "Home",
        "Inbox",
        "My issues",
        "Drafts",
      ]);
    });

    it("returns all routes when total is ≤5 (no overflow)", () => {
      const tabs = getMobileModuleBottomTabs(smallNav);
      expect(tabs).toHaveLength(3);
      expect(tabs.map((t) => t.label)).toEqual(["A", "B", "C"]);
    });

    it("returns all 5 routes when total equals MAX_MOBILE_MODULE_TABS (no overflow)", () => {
      const tabs = getMobileModuleBottomTabs(exactFiveNav);
      expect(tabs).toHaveLength(MAX_MOBILE_MODULE_TABS);
      expect(tabs.map((t) => t.label)).toEqual([
        "One", "Two", "Three", "Four", "Five",
      ]);
    });

    it("honours a custom maxTabs parameter", () => {
      const nav: NavGroup[] = [
        {
          label: "G",
          routes: [
            { label: "A", icon: LayoutDashboard, href: "/a" },
            { label: "B", icon: Inbox, href: "/b" },
            { label: "C", icon: CheckSquare, href: "/c" },
            { label: "D", icon: Briefcase, href: "/d" },
          ],
        },
      ];
      const tabs = getMobileModuleBottomTabs(nav, 3);
      expect(tabs.map((t) => t.label)).toEqual(["A", "B"]);
      const overflow = getMobileModuleOverflowTabs(nav, 3);
      expect(overflow.map((r) => r.label)).toEqual(["C", "D"]);
    });
  });

  describe("getMobileModuleOverflowTabs", () => {
    it("returns routes from index 4 onward when total > 5", () => {
      const overflow = getMobileModuleOverflowTabs(projectsNav);
      expect(overflow).toHaveLength(3);
      expect(overflow.map((r) => r.label)).toEqual([
        "All issues",
        "Projects",
        "Teams",
      ]);
    });

    it("returns empty array when total routes ≤ MAX_MOBILE_MODULE_TABS", () => {
      expect(getMobileModuleOverflowTabs(smallNav)).toHaveLength(0);
      expect(getMobileModuleOverflowTabs(exactFiveNav)).toHaveLength(0);
    });
  });

  describe("getOverflowTabsByGroup", () => {
    it("groups overflow routes by their source nav group", () => {
      const groups = getOverflowTabsByGroup(projectsNav);
      expect(groups).toHaveLength(1);
      expect(groups[0]!.label).toBe("Projects");
      expect(groups[0]!.routes.map((r) => r.label)).toEqual([
        "All issues",
        "Projects",
        "Teams",
      ]);
    });

    it("returns empty array when there is no overflow", () => {
      expect(getOverflowTabsByGroup(smallNav)).toHaveLength(0);
    });

    it("splits overflow across groups correctly when groups differ", () => {
      const multiGroupNav: NavGroup[] = [
        {
          label: "Group A",
          routes: [
            { label: "A1", icon: LayoutDashboard, href: "/a1" },
            { label: "A2", icon: Inbox, href: "/a2" },
            { label: "A3", icon: CheckSquare, href: "/a3" },
            { label: "A4", icon: Briefcase, href: "/a4" },
          ],
        },
        {
          label: "Group B",
          routes: [
            { label: "B1", icon: Users, href: "/b1" },
            { label: "B2", icon: Timer, href: "/b2" },
          ],
        },
      ];
      const groups = getOverflowTabsByGroup(multiGroupNav);
      expect(groups).toHaveLength(1);
      expect(groups[0]!.label).toBe("Group B");
      expect(groups[0]!.routes.map((r) => r.label)).toEqual(["B1", "B2"]);
    });
  });

  describe("isMobileNavRouteActive", () => {
    it("marks exact routes active only on the exact path", () => {
      const tabs = getMobileModuleBottomTabs([
        {
          label: "Projects",
          routes: [
            { label: "Projects", icon: Briefcase, href: "/projects", exact: true },
            { label: "Inbox", icon: Inbox, href: "/projects/inbox" },
          ],
        },
      ]);
      expect(isMobileNavRouteActive("/projects", tabs[0]!, tabs)).toBe(true);
      expect(isMobileNavRouteActive("/projects/inbox", tabs[0]!, tabs)).toBe(false);
    });

    it("prefers the longest matching prefix among tabs", () => {
      const tabs = getMobileModuleBottomTabs([
        {
          label: "Timesheets",
          routes: [
            { label: "My Time", icon: Timer, href: "/timesheets", exact: true },
            { label: "Team", icon: Users, href: "/timesheets/team" },
          ],
        },
      ]);
      expect(isMobileNavRouteActive("/timesheets/team", tabs[1]!, tabs)).toBe(true);
    });
  });

  describe("getMobileModuleContentPaddingClassName", () => {
    it("reserves the bottom nav height plus breathing room on mobile when the bar is shown", () => {
      expect(getMobileModuleContentPaddingClassName(true)).toBe(
        MOBILE_MODULE_CONTENT_PADDING_CLASS,
      );
      expect(MOBILE_MODULE_CONTENT_PADDING_CLASS).toContain("4.5rem");
      expect(MOBILE_MODULE_CONTENT_PADDING_CLASS).toContain("md:pb-0");
    });

    it("skips padding when the module bottom nav is hidden", () => {
      expect(getMobileModuleContentPaddingClassName(false)).toBeUndefined();
    });
  });

  describe("shouldShowMobileModuleBottomNav", () => {
    it("hides the module bottom nav on chat routes", () => {
      expect(shouldShowMobileModuleBottomNav(projectsNav, { isChatRoute: true })).toBe(false);
      expect(shouldShowMobileModuleBottomNav(projectsNav, { isChatRoute: false })).toBe(true);
    });

    it("hides the module bottom nav when there is at most one tab", () => {
      const single: NavGroup[] = [
        {
          label: "Overview",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
          ],
        },
      ];
      expect(shouldShowMobileModuleBottomNav(single, { isChatRoute: false })).toBe(false);
    });
  });
});
