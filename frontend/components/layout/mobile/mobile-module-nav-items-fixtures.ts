import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Briefcase,
  Users,
} from "lucide-react";
import type { NavGroup } from "../sidebar/sidebar-nav-items";

export const projectsNav: NavGroup[] = [
  {
    label: "Projects",
    product: "build",
    routes: [
      { label: "Home", icon: LayoutDashboard, href: "/build/command-center" },
      { label: "Inbox", icon: Inbox, href: "/build/inbox" },
      { label: "My issues", icon: CheckSquare, href: "/build/my-work" },
      { label: "Drafts", icon: Inbox, href: "/build/inbox?view=drafts" },
      { label: "All issues", icon: Briefcase, href: "/build/all-work" },
      { label: "Projects", icon: Briefcase, href: "/build", exact: true },
      { label: "Delivery Teams", icon: Users, href: "/build/teams" },
    ],
  },
];

export const smallNav: NavGroup[] = [
  {
    label: "Small",
    product: "build",
    routes: [
      { label: "A", icon: LayoutDashboard, href: "/a" },
      { label: "B", icon: Inbox, href: "/b" },
      { label: "C", icon: CheckSquare, href: "/c" },
    ],
  },
];

export const exactFiveNav: NavGroup[] = [
  {
    label: "Five",
    product: "build",
    routes: [
      { label: "One", icon: LayoutDashboard, href: "/one" },
      { label: "Two", icon: Inbox, href: "/two" },
      { label: "Three", icon: CheckSquare, href: "/three" },
      { label: "Four", icon: Briefcase, href: "/four" },
      { label: "Five", icon: Users, href: "/five" },
    ],
  },
];
