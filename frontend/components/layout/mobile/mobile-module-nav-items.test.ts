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
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
  MAX_MOBILE_MODULE_TABS,
} from "./mobile-module-nav-items";

const projectsNav: NavGroup[] = [
  {
    label: "Projects",
    routes: [
      {
        label: "Home",
        icon: LayoutDashboard,
        href: "/projects/command-center",
      },
      { label: "Inbox", icon: Inbox, href: "/projects/inbox" },
      { label: "My issues", icon: CheckSquare, href: "/projects/my-work" },
      { label: "Drafts", icon: Inbox, href: "/projects/drafts" },
      { label: "All issues", icon: Briefcase, href: "/projects/all-work" },
      {
        label: "Projects",
        icon: Briefcase,
        href: "/projects",
        exact: true,
      },
      { label: "Teams", icon: Users, href: "/projects/teams" },
    ],
  },
];

describe("mobile module nav items", () => {
  it("caps bottom tabs at the max and keeps sidebar order", () => {
    const tabs = getMobileModuleBottomTabs(projectsNav);
    expect(tabs).toHaveLength(MAX_MOBILE_MODULE_TABS);
    expect(tabs.map((t) => t.label)).toEqual([
      "Home",
      "Inbox",
      "My issues",
      "Drafts",
      "All issues",
    ]);
  });

  it("marks exact routes active only on the exact path", () => {
    const tabs = getMobileModuleBottomTabs(projectsNav);
    const projectsTab = tabs.find((t) => t.href === "/projects");
    expect(projectsTab).toBeUndefined();

    const cappedWithExact = getMobileModuleBottomTabs(
      [
        {
          label: "Projects",
          routes: [
            {
              label: "Projects",
              icon: Briefcase,
              href: "/projects",
              exact: true,
            },
            { label: "Inbox", icon: Inbox, href: "/projects/inbox" },
          ],
        },
      ],
      5,
    );
    expect(
      isMobileNavRouteActive("/projects", cappedWithExact[0]!, cappedWithExact),
    ).toBe(true);
    expect(
      isMobileNavRouteActive(
        "/projects/inbox",
        cappedWithExact[0]!,
        cappedWithExact,
      ),
    ).toBe(false);
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
    expect(
      isMobileNavRouteActive("/timesheets/team", tabs[1]!, tabs),
    ).toBe(true);
  });

  it("hides the module bottom nav on chat routes", () => {
    expect(
      shouldShowMobileModuleBottomNav(projectsNav, { isChatRoute: true }),
    ).toBe(false);
    expect(
      shouldShowMobileModuleBottomNav(projectsNav, { isChatRoute: false }),
    ).toBe(true);
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
    expect(
      shouldShowMobileModuleBottomNav(single, { isChatRoute: false }),
    ).toBe(false);
  });
});
