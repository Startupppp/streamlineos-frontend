# Audit L7 — Shared Shell & Infrastructure

**Scope:** `app/(authenticated)/layout.tsx`, `layout-client.tsx`, `loading.tsx`, `error.tsx`;
`app/layout.tsx`; `proxy.ts`; `components/layout/**` (sidebar, header, mobile nav, quick-create);
`lib/rbac/**`; `hooks/api/access*`, `members`, `users`, `module-access`; `lib/query-*`;
`components/providers`; `components/shared/**` page-state & skeleton primitives.

---

## Summary (10 lines)

1. `NavGroup` carries two identical fields — `product: ProductKey` (required) and `module?: ProductKey` (optional) — that always hold the same value in every nav group definition, a direct FE-143 alias. Canonical field is `product`; `module` is deleted.
2. `NavRoute.module` is a separate, legitimate per-route override that must not be confused with `NavGroup.module`.
3. Nav groups are computed twice for non-Build products: once in `useProductSidebarVisibility` and once independently inside `AppSidebar`. Only the sidebar's copy applies `applyHrWeekOneNav`.
4. All shell components call `useAccess()` individually (7 call sites); TanStack Query deduplicates them to one cache entry, so there are no duplicate fetches but the subscription count is high.
5. The authenticated root `loading.tsx` is a shell-only skeleton justified by its inline comment (cross-product server-redirect flash); it is NOT an FE-144 violation and should stay as-is.
6. `hooks/api/module-access/types.ts` re-exports `DataScope` from `access-schema` (FE-126 type pass-through) and has `"use client"` on a file that is types-only.
7. `layout-client.tsx:renderBuildSidebar` is an FE-126 pass-through that spreads props to the local dynamic-wrapped `BuildSidebar`.
8. All manual `useMemo` / `useCallback` in `app-sidebar.tsx`, `dashboard-shell.tsx`, and `use-product-sidebar-visibility.ts` are redundant under React Compiler (FE-114).
9. The layout calls `getServerAccessResult()` three times; all are React-`cache()`-memoised, so only one upstream HTTP call fires, but the 4th-element discard pattern in `Promise.all` is undocumented and fragile.
10. The server-prefetch recipe is already established (see `lib/prefetch/dashboard.ts` + `app/(authenticated)/dashboard/page.tsx`) and uses `createServerQueryClient` + `dehydrate` + `HydrationBoundary` + `Suspense`.

---

## Category 1 — Duplicate / Alias Keys & Type Definitions

- [ ] `components/layout/sidebar/sidebar-nav-types.ts:49–56` — `NavGroup` has `product: ProductKey` AND `module?: ProductKey`; every group definition sets them to the same value; home groups omit `module` entirely. **FE-143 alias.** Fix: delete `NavGroup.module`, replace all reads of `group.module` in `sidebar-nav-items.ts` (`filterNavGroupsForUser` lines 211/218, `resolveNavRouteAccess` line 370, `getHomeNavGroups` line 391) with `group.product`; `isModuleEnabled("home", ...)` and `isModuleEnabled("administration", ...)` already return `true` so no guard changes needed.

- [ ] `components/layout/sidebar/sidebar-nav-groups-hr.ts:22,35,56,71,94` (and crm/finance/inventory/knowledge-support/payroll/recruitment/work-management/workflows) — every file sets `module: <same-as-product>`. Remove the `module:` line from each NavGroup object after the type field is deleted.

- [ ] `hooks/api/module-access/types.ts:5–7` — `export type { DataScope }` re-exports the type from `@/hooks/api/access-schema` (FE-126 / FE-128 type pass-through). No external file imports `DataScope` from this path per grep. Fix: delete the import and re-export; the three internal uses on lines 19, 76, 123 read the type from their own file's local definitions.

- [ ] `hooks/api/module-access/types.ts:1` — `"use client"` on a file that exports only TypeScript types and two string-builder functions (`viewKey`, `manageKey`). Types are erased at compile time; the directive causes the file to be included in every client chunk unnecessarily. Fix: remove `"use client"`.

- [ ] `hooks/api/module-access/types.ts:114` — `AuditLogEntry.id: string | number` is wider than its Zod schema in `module-access-schema.ts` which has `id: z.number()`. Fix: narrow to `id: number`.

---

## Category 2 — First-Paint Blockers

- [ ] `app/(authenticated)/layout.tsx:26–31` — `Promise.all` array has 4 elements but destructuring captures only 3; the 4th call `getServerAccessResult()` is intentionally discarded to warm the React `cache()` for subsequent calls at lines 38 and 44. **No fix needed, but add a comment** on the 4th element explaining the pattern, otherwise a future refactor will remove it and make lines 38/44 sequential HTTP calls.

- [ ] `components/layout/app-sidebar.tsx:144–162` and `components/layout/sidebar/use-product-sidebar-visibility.ts:77–103` — nav groups are computed separately in both; `AppSidebar` additionally applies `applyHrWeekOneNav` (line 153) which `useProductSidebarVisibility` does not. `useProductSidebarVisibility.navGroups` is used only for mobile nav visibility checks where the HR transform is immaterial; `AppSidebar.navGroups` drives what is actually rendered. The duplication is partially justified but means two `getNavGroupsForProduct` calls run per navigation. Fix (low risk): pass computed `navGroups` from `DashboardShell`'s `useProductSidebarVisibility` as a new `AppSidebarProps` prop; `AppSidebar` applies `applyHrWeekOneNav` on top.

- [ ] `components/layout/app-sidebar.tsx:119–137` — three separate `useCan` calls (`canApproveLeaves`, `canReadChat`, `canReadCalendar`) each subscribe to `useAccess()`. TanStack Query deduplicates them but 3 hook calls exist. Under React Compiler all three are already memoised; the subscription cost is negligible. No fix required.

- [ ] `components/layout/dashboard-shell.tsx:231–249` — initial render shows `<LazyAppLoadingScreen>` until `useAccess` resolves. The layout prefetches access into the TanStack cache via `prefetchAccess()`, so in normal navigation the cache is already populated on hydration and this branch is never painted. A cold reload without hydration (direct URL) may show the screen for one round-trip. No fix: the shell cannot render without access data and the prefetch covers the normal case.

- [ ] `app/(authenticated)/loading.tsx:40–58` — layout-level `loading.tsx`; fires only when the `(authenticated)` group segment changes (cross-product navigation while a server redirect is in flight). Renders a 4-tile skeleton. **Not an FE-144 violation** — the comment inside the file gives the exact justification (HRMS-E2E-028), and per FE-144 the ban is on module-level or layout-level loading shared by "unrelated pages" as a substitute for per-page loading; here it prevents flash of wrong content during a gating redirect, which no per-page `loading.tsx` can cover. Decision: keep as-is; per-page loading must be added separately (FE-144) but does not replace this.

- [ ] `hooks/api/access.ts:92–107` — `useAccess` has `staleTime: 5 * 60_000` and `refetchOnWindowFocus: "always"`. The `"always"` setting means a window-focus event ALWAYS triggers a background refetch regardless of staleness. This is intentional (access changes like role assignments take effect immediately on next focus) but costs one background request per focus event. Documented; no fix unless access latency becomes a problem.

---

## Category 3 — Dead / Duplicate Shell Code

- [ ] `app/(authenticated)/layout-client.tsx:47–49` — `function renderBuildSidebar(props: BuildSidebarSlotProps) { return <BuildSidebar {...props} />; }` is an FE-126 pass-through: the entire body is `<LocalDynamicBuildSidebar {...props} />`. Fix: write `buildSidebarSlot={BuildSidebar}` directly (passing the dynamic-wrapped component reference), or inline as `buildSidebarSlot={(props) => <BuildSidebar {...props} />}`. The named function adds an extra indirection with no seam.

- [ ] `app/(authenticated)/layout-client.tsx:51–53` — `function renderChatMobileNav(onOpenMobileMenu: () => void) { return <ChatMobileBottomNav onOpenMobileMenu={onOpenMobileMenu} />; }` — same pass-through pattern. Fix: inline as `chatMobileNavSlot={(onOpenMobileMenu) => <ChatMobileBottomNav onOpenMobileMenu={onOpenMobileMenu} />}` at the prop site.

- [ ] `components/providers/authenticated-providers.tsx:1–8` — `AuthenticatedProviders` is a single-child pass-through wrapper around `MailComposeProvider`. Per FE-126 a component that only wraps one other component is a pass-through. However this IS the correct composition point if more providers will be added, and it keeps provider imports out of `layout-client.tsx`. Judgement: retain; it provides a stable injection seam that prevents future files being pulled into `layout-client.tsx`.

- [ ] `hooks/api/module-access/index.ts` — exports `DataScope` through the barrel (implicitly via `types.ts`'s re-export). Once the pass-through in `types.ts` is removed, this stops leaking. No independent action needed.

---

## Category 4 — React / Next Violations

- [ ] `components/layout/app-sidebar.tsx:144,164,175` — three `useMemo` calls. With `reactCompiler: true` (FE-114) the compiler memoises every derived value. Remove all three `useMemo` wrappers and the `useMemo` import. *(Compiler cannot see `readStoredCollapsedGroups`'s side effect, but it is called in `useState` not in `useMemo`, so the compiler is not blocked.)*

- [ ] `components/layout/dashboard-shell.tsx:118–172` — eight `useCallback` and one `useMemo`. Remove all; replace imports with `useState`, `useEffect`, `useRef` only.

- [ ] `components/layout/sidebar/use-product-sidebar-visibility.ts:52–103` — one `useMemo` (buildScope), two `useCallback` (can, isOrgModuleEnabled, isCapabilityEnabled), one `useMemo` (navGroups). Remove all five; remove the `useMemo`/`useCallback` imports.

- [ ] `components/layout/sidebar/sidebar-section.tsx:174,243,255` — three `useCallback` wrappers on `handleIntent` and `toggle`. Remove under FE-114.

- [ ] `app/(authenticated)/layout-client.tsx` — no manual memoisation. Clean.

- [ ] `app/layout.tsx` — server component, no client hooks. Clean.

---

## Category 5 — RBAC: How Access Is Resolved

### Org-level access
`requireModulePermission(moduleKey)` in server layouts checks `access.modules[normalizedModule] === true`. Client: `useModuleEnabled(key)` reads `access.modules` from the TanStack cache entry keyed by `platformCoreQueryKeys.access.me()`.

### Permission-level access
Server: `requirePermission(key)` calls `grantsPermission(access, key)`. Client: `useAccess()` → `useCan(key)` / `useCanState(key)` read from the same access cache entry. `useCanState` is the safe three-valued form for page gates.

### Module-level route gate (sidebar-derived)
`resolveNavRouteAccess(pathname)` walks `NAV_GROUPS` + `HOME_NAV_GROUPS` to find the deepest matching route, inheriting `requiredPermission` and `module` from parents. The result `NavRouteAccess.module` drives the `orgModuleKey` check in server layouts via `route-access.ts:83`.

### What would break with per-page prefetch
- The prefetch must NOT check permissions server-side before fetching; that is the backend's job. The client's `usePageState` gate runs after hydration.
- Do NOT call `prefetchAccess()` again inside a page prefetch factory — the layout already does it; doing so twice would be a no-op (React cache) but is confusing.
- A page prefetch that fires a read the user cannot access produces a backend 403; `prefetchQuery` catches it silently and leaves the cache entry empty. The client's `useGatedQuery` disabled state then takes over. This is correct behaviour.

### Server prefetch recipe (canonical form — copy this exactly)

```typescript
// lib/prefetch/my-module.ts
import "server-only";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { myListContract } from "@/hooks/api/my-schema";
import { myQueryKeys } from "@/lib/query-keys/my-module";

export async function prefetchMyPage(params?: Record<string, string>) {
  try {
    const queryClient = await createServerQueryClient();
    // run independent reads in parallel; dependent reads chain here
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: myQueryKeys.list(params),
        queryFn: () => serverGet("/my/endpoint", myListContract),
        staleTime: 30_000,
      }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
```

```tsx
// app/(authenticated)/my-module/my-page/page.tsx
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { prefetchMyPage } from "@/lib/prefetch/my-module";
import MyPageLoading from "./loading";      // per-page skeleton (FE-144)
import { MyPageClient } from "@/features/my-module/my-page-client";

async function MyPageHydrated() {
  const state = await prefetchMyPage();
  return (
    <HydrationBoundary state={state}>
      <MyPageClient />
    </HydrationBoundary>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<MyPageLoading />}>
      <MyPageHydrated />
    </Suspense>
  );
}
```

**Auth token**: `createServerQueryClient` calls `getServerAuth()` which is React-`cache()`-memoised per request. `serverGet` uses the same auth. No manual token threading.

**Scope**: `createServerQueryClient` calls `authenticatedScope(session.orgId, session.user.id)` which becomes the query-key hash prefix; the client's `QueryProvider` sets the same hash function, so dehydrated keys resolve identically on the client.

**Existing canonical examples**: `lib/prefetch/dashboard.ts` + `app/(authenticated)/dashboard/page.tsx` (simplest), `lib/prefetch/hr.ts` (multiple parallel reads), `lib/prefetch/settings.ts` (admin-gated parallel reads).

---

## Category 6 — Skeleton Primitives

| Component | Path | Key Props |
|---|---|---|
| `Skeleton` | `@/components/ui/skeleton` | `className?` |
| `DataTableSkeleton` | `@/components/ui/data-table-skeleton` | `rows?`, `columns?` \| `headers?: readonly string[]`, `fill?`, `mobileCards?`, `onStalledRetry?` |
| `KanbanBoardSkeleton` | `@/components/ui/kanban-skeleton` | none (renders 4 columns) |
| `KanbanColumnSkeleton` | `@/components/ui/kanban-skeleton` | none |
| `StatCardGridSkeleton` | `@/components/ui/stat-card` | `cols?: 2\|3\|4\|5\|6`, `count?`, `className?`, `stackOnMobile?: boolean\|2` |
| `StatCardSkeleton` | `@/components/ui/stat-card` | `index?: number`, `className?` |
| `SurfaceBodySkeleton` | `@/components/ui/surface-body-skeleton` | `rows?: number` (default 3), `className?` |
| `PageWrapper` (with Skeleton children) | `@/components/ui/page-wrapper` | `title`, `subtitle` — used in `(authenticated)/loading.tsx` as the shell skeleton pattern |

**FE-142 rule**: a page skeleton must mirror the real layout geometry — same toolbar rows, panels, card/table shape and fill chain. Use `DataTableSkeleton fill` for paginated list pages, `StatCardGridSkeleton` + `DataTableSkeleton` for dashboard-style pages, `KanbanBoardSkeleton` for kanban.

---

## Fix Lanes (disjoint file groups)

### Lane A — NavGroup.module alias (FE-143)
**Coordinator owns**: `sidebar-nav-types.ts`, `sidebar-nav-items.ts`
Files: `sidebar-nav-types.ts`, `sidebar-nav-items.ts`, `sidebar-home-nav.ts`,
`sidebar-nav-groups-hr.ts`, `sidebar-nav-groups-crm.ts`, `sidebar-nav-groups-finance.ts`,
`sidebar-nav-groups-inventory.ts`, `sidebar-nav-groups-knowledge-support.ts`,
`sidebar-nav-groups-payroll.ts`, `sidebar-nav-groups-recruitment.ts`,
`sidebar-nav-groups-work-management.ts`, `sidebar-nav-groups-workflows.ts`,
`sidebar-nav-groups-administration.ts`,
`sidebar-hr-route-gates.test.ts`, `sidebar-nav-inventory.test.ts`

### Lane B — Manual memoisation removal (FE-114)
Files: `components/layout/app-sidebar.tsx`,
`components/layout/dashboard-shell.tsx`,
`components/layout/sidebar/use-product-sidebar-visibility.ts`,
`components/layout/sidebar/sidebar-section.tsx`

### Lane C — Pass-through wrappers (FE-126)
Files: `app/(authenticated)/layout-client.tsx`

### Lane D — module-access/types cleanup (FE-126, FE-128)
Files: `hooks/api/module-access/types.ts`

### Lane E — layout.tsx comment (documentation only)
Files: `app/(authenticated)/layout.tsx`

---

## Coordinator-Owned Hot Files (do not assign to lanes)

- `components/layout/sidebar/sidebar-nav-items.ts` — exports consumed by sidebar tests, `use-product-sidebar-visibility.ts`, `sidebar-nav-inventory.test.ts`, `app-sidebar.tsx`. Any change to this file invalidates all lanes; coordinator applies after all lanes confirm green tests.
- `components/layout/sidebar/sidebar-nav-types.ts` — base type; change here is the first commit in Lane A.
- `hooks/api/access.ts` — 7 shell consumers; do not touch unless staleTime tuning is coordinated with the RBAC audit.
