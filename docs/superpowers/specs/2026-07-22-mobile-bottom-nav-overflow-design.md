# Mobile Bottom Nav — Overflow "More" Drawer

**Date:** 2026-07-22  
**Scope:** `frontend/components/layout/mobile/`  
**Status:** Ready for implementation

---

## Problem

`getMobileModuleBottomTabs` hard-caps at 5 tabs and silently drops everything beyond that. Modules with more than 5 sidebar routes (HR, CRM, Payroll, Inventory, Accounting, Projects, etc.) leave the overflow routes completely inaccessible from the bottom bar — users must use FAB → Menu to reach them on mobile.

---

## Behavior Spec

### ≤5 total sidebar routes
Show all routes as bottom tabs. No change from today.

### >5 total sidebar routes
Show first **4** routes as bottom tabs + a **"More"** tab in the 5th slot.  
Tapping "More" opens a bottom Drawer listing every overflow route (index 4 onward), grouped under their original nav-group label.  
Tapping any overflow route navigates and closes the drawer.

### Suppression rules (unchanged)
- Chat routes (`/chat/**`): bottom nav hidden, `ChatMobileBottomNav` takes over
- `shouldShowMobileModuleBottomNav` gate unchanged (requires ≥2 tabs)
- Desktop (≥`md`): bottom nav hidden, full sidebar shown

---

## Files Changed

### 1. `frontend/components/layout/mobile/mobile-module-nav-items.ts`

**Add:**
```ts
// All routes flat (no cap) — for overflow calculation
export function getAllMobileModuleTabs(navGroups: NavGroup[]): NavRoute[]

// Routes from index 4 onward (the overflow set)
// Returns [] when total ≤ 4 (no "More" tab needed)
export function getMobileModuleOverflowTabs(navGroups: NavGroup[]): NavRoute[]

// Overflow grouped by their source NavGroup label (for drawer sections)
export function getOverflowTabsByGroup(
  navGroups: NavGroup[],
): { label: string; routes: NavRoute[] }[]
```

**Modify `getMobileModuleBottomTabs`:**
- When total routes > 4 → return first 4 only (leaving slot 5 for "More")
- When total routes ≤ 5 → return all (up to 5), unchanged

---

### 2. `frontend/components/layout/mobile/mobile-module-bottom-nav.tsx`

**New sub-component: `MoreDrawer`**
- Props: `open`, `onOpenChange`, `groups: { label: string; routes: NavRoute[] }[]`, `pathname`
- Renders a `<Drawer>` with grouped overflow routes
- Each route is a `<Link>` styled like `ModuleNavLink` that calls `onOpenChange(false)` on click
- Groups with a label heading (if more than one group shown)

**Modify `MobileModuleBottomNav`:**
- Compute `overflowTabs = getMobileModuleOverflowTabs(navGroups)`
- Compute `overflowGroups = getOverflowTabsByGroup(navGroups)` (used by drawer)
- Add `const [moreOpen, setMoreOpen] = useState(false)`
- When `overflowTabs.length > 0`: render 4 tab links + a `<button>` "More" tab (5th slot)
- "More" tab uses `EllipsisIcon` from `@animateicons/react/lucide` via `useAnimatedIcon`
- Active state for "More" button: true when `pathname` matches any overflow route

---

## Visual Layout (mobile, >5 routes)

```
┌────────────────────────────────────────────────────────┐
│  [Tab 1]  [Tab 2]  [Tab 3]  [Tab 4]  [  More ···  ]  │  ← bottom bar
└────────────────────────────────────────────────────────┘

On "More" tap:
┌────────────────────────────────────────────────────────┐
│ ▔▔▔▔▔▔ (drag handle)                                  │
│                                                        │
│  GROUP LABEL (if multi-group)                         │
│  ○  Route 5 label                                     │
│  ○  Route 6 label                                     │
│  ○  Route 7 label                                     │
│  ...                                                   │
└────────────────────────────────────────────────────────┘
```

---

## Active State Rules

- A primary tab is active: `isMobileNavRouteActive(pathname, route, tabs)` (unchanged)
- "More" tab is active: `overflowTabs.some(r => isMobileNavRouteActive(pathname, r, overflowTabs))`

---

## Constraints

- No new dependencies — uses existing `Drawer`, `AnimatedIconButton`/`useAnimatedIcon`, `Link`, `TruncatedText`
- No backend changes
- No schema or RBAC changes
- Desktop sidebar untouched
- FAB position and `showAboveBottomNav` logic in `DashboardShell` unchanged

---

## Out of Scope

- Reordering which routes appear in the first 4 slots (always first 4 by nav-group order)
- Animated icon for overflow routes inside the drawer (static lucide icons there)
- Persisting "More" drawer open state across navigations
