# Mobile Bottom Nav — Overflow "More" Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NEVER run git commit, push, checkout, branch, merge, pull, fetch, reset, stash, or rebase.**

**Goal:** When a module has more than 5 sidebar routes, show the first 4 as bottom tabs plus a "More" tab that opens a Drawer listing the overflow routes — giving mobile users access to every nav item.

**Architecture:** Two files touch only the mobile nav layer. `mobile-module-nav-items.ts` gains three new pure helpers and the existing `getMobileModuleBottomTabs` is narrowed to return 4 tabs (not 5) when overflow exists. `mobile-module-bottom-nav.tsx` gains a `MoreTab` button and a `MoreDrawer` component wired to that overflow data.

**Tech Stack:** React 19, Next.js App Router, Tailwind CSS, shadcn/ui `Drawer`, `@animateicons/react/lucide` `EllipsisIcon`, `useAnimatedIcon` hook, Jest for unit tests.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `frontend/components/layout/mobile/mobile-module-nav-items.ts` |
| Modify | `frontend/components/layout/mobile/mobile-module-nav-items.test.ts` |
| Modify | `frontend/components/layout/mobile/mobile-module-bottom-nav.tsx` |

---

## Task 1: Add overflow helpers to `mobile-module-nav-items.ts` + update tests

**Files:**
- Modify: `frontend/components/layout/mobile/mobile-module-nav-items.ts`
- Modify: `frontend/components/layout/mobile/mobile-module-nav-items.test.ts`

### Step 1.1 — Update the test file first (TDD)

Replace the contents of `frontend/components/layout/mobile/mobile-module-nav-items.test.ts` with:

```ts
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
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
  MAX_MOBILE_MODULE_TABS,
} from "./mobile-module-nav-items";

// 7 routes → always triggers overflow (> MAX_MOBILE_MODULE_TABS=5)
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

// 3 routes → no overflow
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

// Exactly 5 routes → no overflow (at the limit)
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
      // 6 routes across 2 groups: group A has 4, group B has 2
      // Primary tabs = first 4 (all from group A); overflow = group B's 2
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
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
cd frontend && npx jest mobile-module-nav-items.test.ts --no-coverage 2>&1 | tail -30
```

Expected: failures on `getAllMobileModuleTabs`, `getMobileModuleOverflowTabs`, `getOverflowTabsByGroup` (not yet exported), and the updated `getMobileModuleBottomTabs` assertions.

- [ ] **Step 1.3 — Replace `mobile-module-nav-items.ts` with the updated implementation**

Replace the entire contents of `frontend/components/layout/mobile/mobile-module-nav-items.ts`:

```ts
import type { NavGroup, NavRoute } from "../sidebar/sidebar-nav-items";

export const MAX_MOBILE_MODULE_TABS = 5;
export const MOBILE_PRIMARY_TABS_WHEN_OVERFLOW = 4;

export const MOBILE_MODULE_CONTENT_PADDING_CLASS =
  "pb-[calc(4rem+env(safe-area-inset-bottom))]";

export function getAllMobileModuleTabs(navGroups: NavGroup[]): NavRoute[] {
  const tabs: NavRoute[] = [];
  const seen = new Set<string>();
  for (const group of navGroups) {
    for (const route of group.routes) {
      if (seen.has(route.href)) continue;
      seen.add(route.href);
      tabs.push(route);
    }
  }
  return tabs;
}

export function getMobileModuleBottomTabs(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): NavRoute[] {
  const all = getAllMobileModuleTabs(navGroups);
  const hasOverflow = all.length > maxTabs;
  const limit = hasOverflow ? MOBILE_PRIMARY_TABS_WHEN_OVERFLOW : maxTabs;
  return all.slice(0, limit);
}

export function getMobileModuleOverflowTabs(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): NavRoute[] {
  const all = getAllMobileModuleTabs(navGroups);
  if (all.length <= maxTabs) return [];
  return all.slice(MOBILE_PRIMARY_TABS_WHEN_OVERFLOW);
}

export function getOverflowTabsByGroup(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): { label: string; routes: NavRoute[] }[] {
  const overflowTabs = getMobileModuleOverflowTabs(navGroups, maxTabs);
  if (overflowTabs.length === 0) return [];
  const overflowHrefs = new Set(overflowTabs.map((r) => r.href));
  const result: { label: string; routes: NavRoute[] }[] = [];
  for (const group of navGroups) {
    const groupRoutes = group.routes.filter((r) => overflowHrefs.has(r.href));
    if (groupRoutes.length > 0) {
      result.push({ label: group.label, routes: groupRoutes });
    }
  }
  return result;
}

export function isMobileNavRouteActive(
  pathname: string,
  route: NavRoute,
  tabs: NavRoute[],
): boolean {
  if (route.exact || (route.children && route.children.length > 0)) {
    return pathname === route.href || pathname === `${route.href}/`;
  }

  const matches =
    pathname === route.href || pathname.startsWith(`${route.href}/`);
  if (!matches) return false;

  const longerMatch = tabs.some(
    (other) =>
      other.href !== route.href &&
      other.href.length > route.href.length &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
  return !longerMatch;
}

export function shouldShowMobileModuleBottomNav(
  navGroups: NavGroup[],
  options: { isChatRoute: boolean },
): boolean {
  if (options.isChatRoute) return false;
  return getMobileModuleBottomTabs(navGroups).length > 1;
}

export function getMobileModuleContentPaddingClassName(
  showModuleBottomNav: boolean,
): string | undefined {
  if (!showModuleBottomNav) return undefined;
  return MOBILE_MODULE_CONTENT_PADDING_CLASS;
}
```

- [ ] **Step 1.4 — Run tests to confirm they all pass**

```bash
cd frontend && npx jest mobile-module-nav-items.test.ts --no-coverage 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 1.5 — Typecheck**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors related to the modified file.

---

## Task 2: Add `MoreTab` + `MoreDrawer` to `mobile-module-bottom-nav.tsx`

**Files:**
- Modify: `frontend/components/layout/mobile/mobile-module-bottom-nav.tsx`

- [ ] **Step 2.1 — Replace the full file with the updated component**

Replace the entire contents of `frontend/components/layout/mobile/mobile-module-bottom-nav.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useProductSidebarVisibility } from "../sidebar/use-product-sidebar-visibility";
import {
  getMobileModuleBottomTabs,
  getMobileModuleOverflowTabs,
  getOverflowTabsByGroup,
  isMobileNavRouteActive,
  shouldShowMobileModuleBottomNav,
} from "./mobile-module-nav-items";
import type { NavRoute } from "../sidebar/sidebar-nav-items";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

function ModuleNavLink({
  route,
  isActive,
}: {
  route: NavRoute;
  isActive: boolean;
}) {
  const Icon = route.icon;

  return (
    <Link
      href={route.href}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={route.label}
    >
      <Icon className="size-5 shrink-0" />
      <TruncatedText
        text={route.label}
        className="max-w-full truncate text-center text-[10px] leading-none"
      />
    </Link>
  );
}

function MoreTab({
  onOpen,
  isActive,
}: {
  onOpen: () => void;
  isActive: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <button
      type="button"
      onClick={onOpen}
      {...hoverHandlers}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="More navigation options"
      aria-expanded={false}
    >
      <EllipsisIcon ref={iconRef} className="size-5 shrink-0" />
      <TruncatedText
        text="More"
        className="max-w-full truncate text-center text-[10px] leading-none"
      />
    </button>
  );
}

function MoreDrawer({
  open,
  onOpenChange,
  groups,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { label: string; routes: NavRoute[] }[];
  pathname: string;
}) {
  const showGroupLabels = groups.length > 1;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal>
      <DrawerContent className="z-[60] gap-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <DrawerTitle className="sr-only">More navigation options</DrawerTitle>
        <div className="flex flex-col gap-0.5 px-2 py-2">
          {groups.map((group) => (
            <div key={group.label}>
              {showGroupLabels && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.routes.map((route) => {
                const Icon = route.icon;
                const isActive = isMobileNavRouteActive(
                  pathname,
                  route,
                  group.routes,
                );
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {route.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function MobileModuleBottomNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const { navGroups } = useProductSidebarVisibility();
  const [moreOpen, setMoreOpen] = useState(false);

  const isChatRoute = pathname.startsWith("/chat");
  const show = shouldShowMobileModuleBottomNav(navGroups, { isChatRoute });
  const tabs = getMobileModuleBottomTabs(navGroups);
  const overflowTabs = getMobileModuleOverflowTabs(navGroups);
  const overflowGroups = getOverflowTabsByGroup(navGroups);
  const hasOverflow = overflowTabs.length > 0;
  const moreTabActive =
    hasOverflow &&
    overflowTabs.some((r) => isMobileNavRouteActive(pathname, r, overflowTabs));

  if (!show) return null;

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden",
          className,
        )}
        aria-label="Module navigation"
      >
        <div className="flex h-16 w-full items-stretch">
          {tabs.map((route) => (
            <ModuleNavLink
              key={route.href}
              route={route}
              isActive={isMobileNavRouteActive(pathname, route, tabs)}
            />
          ))}
          {hasOverflow && (
            <MoreTab
              onOpen={() => setMoreOpen(true)}
              isActive={moreTabActive}
            />
          )}
        </div>
      </nav>

      {hasOverflow && (
        <MoreDrawer
          open={moreOpen}
          onOpenChange={setMoreOpen}
          groups={overflowGroups}
          pathname={pathname}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2.2 — Typecheck the frontend**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: No new errors. (Ignore any pre-existing baseline errors unrelated to these files.)

- [ ] **Step 2.3 — Run all mobile nav unit tests**

```bash
cd frontend && npx jest mobile-module-nav-items.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| ≤5 routes → all tabs shown, no change | Task 1 Step 1.3 — `getMobileModuleBottomTabs` returns `all` when no overflow |
| >5 routes → first 4 + "More" tab | Task 1 Step 1.3 + Task 2 Step 2.1 |
| "More" opens Drawer with overflow routes | Task 2 Step 2.1 — `MoreDrawer` |
| Overflow routes grouped by nav-group label | Task 1 Step 1.3 `getOverflowTabsByGroup` + Task 2 Step 2.1 `showGroupLabels` |
| Tapping overflow route navigates + closes drawer | Task 2 Step 2.1 — `onClick={() => onOpenChange(false)}` on each Link |
| "More" tab active when on an overflow route | Task 2 Step 2.1 — `moreTabActive` derived from `overflowTabs.some(...)` |
| Chat route suppression unchanged | `shouldShowMobileModuleBottomNav` untouched |
| Desktop unaffected | `md:hidden` on `<nav>` unchanged |
| `EllipsisIcon` animated icon with `useAnimatedIcon` | Task 2 Step 2.1 — `MoreTab` component |
| `Drawer` from shadcn/ui | Task 2 Step 2.1 — `MoreDrawer` |
| No new dependencies | All imports already present in codebase |

**Placeholder scan:** None found — every step has exact code.

**Type consistency:**
- `getAllMobileModuleTabs` defined in Task 1, not used directly in Task 2 (imported transitively via `getMobileModuleBottomTabs` / `getMobileModuleOverflowTabs`)
- `getOverflowTabsByGroup` return type `{ label: string; routes: NavRoute[] }[]` matches `MoreDrawer` prop `groups`
- `isMobileNavRouteActive` signature unchanged — called identically in both files
- `MOBILE_PRIMARY_TABS_WHEN_OVERFLOW = 4` used in both `getMobileModuleBottomTabs` and `getMobileModuleOverflowTabs` consistently

All clear.
