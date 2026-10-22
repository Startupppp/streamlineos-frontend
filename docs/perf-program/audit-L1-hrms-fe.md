# HRMS Frontend Audit — L1

**Scope:** `app/(authenticated)/hr/**`, `app/(authenticated)/me/**`, `features/hr/**`, `features/employee-self-service/**`, `hooks/api/hr/**`, `hooks/api/employee-self-service/**`, plus HR-only contracts/types/query-keys.  
**Date:** 2026-10-22  
**Auditor:** Lane L1 (read-only)  
**Rules referenced:** FE-01, FE-15, FE-18, FE-24, FE-31, FE-35, FE-40–42, FE-56, FE-91–93, FE-112–116, FE-119, FE-125–127, FE-133, FE-137–139, FE-142–147.

---

## Summary Counts

| Category | Items |
|---|---|
| 1. Duplicate / alias keys (FE-143) | 2 |
| 2. Slow-page causes (FE-24/31/127/133/145) | 8 |
| 3. Duplicates / dead code (FE-114/126/135) | 4 |
| 4. Unpaginated lists (FE-31/112/125/146) | 3 |
| 5. React principle violations (FE-114/138/139) | 3 |
| 6. Next.js principle violations (FE-01/56) | 4 |
| 7. RBAC / access (FE-40/42/147) | 3 groups |
| 8. Loading skeletons (FE-119/142/144) | 22 |
| **Total checklist items** | **49** |

---

## Category 1 — Duplicate / Alias Keys (FE-143)

Two items. Both are `employeeId` / `userId` for the same person across a component interface boundary.

- [ ] `features/hr/performance/reviews-tab.tsx:188` — passes `{ userId: employeeId, ... }` to `useHrPerformanceReviews`; the caller prop is `employeeId`, the hook param is `userId`. Both carry the same user string ID. — **Fix:** rename hook param to `employeeId` (or `userId` everywhere — pick one); update `hooks/api/hr/performance.ts` param name and every query-key segment that uses it.
- [ ] `features/hr/onboarding/onboarding-list.tsx:177,182` — passes `row.userId` as the `employeeId` prop on `<ResendInviteButton>` and `<CopyInviteLinkButton>`. The row uses `userId`; the buttons declare `employeeId`. — **Fix:** align prop name to `userId` on both button components, or alias the data row field — pick one name, migrate all readers.

---

## Category 2 — Slow-Page Causes

### 2a. No server-side prefetch — 91 pages fall back to client waterfall (FE-145)

Only `hr/assets/page.tsx` and `hr/documents/page.tsx` use `prefetchQuery` + `HydrationBoundary`. Every other page in `app/(authenticated)/hr/**` (89 pages) and all of `app/(authenticated)/me/**` (8 pages) start a client fetch on first paint.

- [ ] `app/(authenticated)/hr/employees/page.tsx` — primary list (`/hr/employees`). — **Fix:** add `prefetchHrEmployees()` in `lib/prefetch/hr.ts` (parallel `prefetchQuery` for the first page), wrap in `<HydrationBoundary>`.
- [ ] `app/(authenticated)/hr/leaves/page.tsx` — primary list. — **Fix:** same pattern; prefetch `/me/time-off/requests` + `/hr/leaves/approvals` in parallel.
- [ ] `app/(authenticated)/hr/attendance/page.tsx` — status poll. — **Fix:** prefetch `/me/attendance/status` (staleTime matches `2 * 60_000`).
- [ ] `app/(authenticated)/hr/performance/page.tsx` and all remaining primary-list pages — **Fix:** add entries to `lib/prefetch/hr.ts`, one `prefetchQuery` per primary read, in parallel via `Promise.all`.

> All 91 pages are the same pattern; the 4 items above are the highest-traffic pages. The fix lane should add prefetch for every primary list page in one pass.

### 2b. Hardcoded pagination limits — prevents server-side filtering (FE-31)

- [ ] `hooks/api/hr/leaves.ts:135` — `useHrMyLeaveRequests` passes `{ limit: 100 }` unconditionally; callers (`features/hr/work-logs/work-logs-page.tsx`, `features/dashboard/hr-widgets.tsx`) never pass a different limit. — **Fix:** accept limit as a param (default `30`); callers decide their own cap, or convert to paginated / `useInfiniteQuery` with a sentinel.
- [ ] `hooks/api/hr/document-types.ts:57` — hardcodes `{ limit: 100 }` for a catalog read. — **Fix:** make limit a param; default to 50 for the paginated admin view, or use `useInfiniteQuery`.
- [ ] `hooks/api/hr/onboarding.ts:265` — hardcodes `limit: 100` on the templates list. — **Fix:** same.
- [ ] `hooks/api/hr/recruitment/interviews.ts:145` — hardcodes `limit: params?.limit ?? 100`. — **Fix:** same.

### 2c. Cross-module aggregate import (FE-127)

- [ ] `features/hr/assets/assets-page.tsx:18` — `import { useAssignAsset, useHrEmployees, unwrapEmployees } from "@/hooks/api"` — the cross-module aggregate. Both hooks live in `hooks/api/hr/assets.ts` and `hooks/api/hr/employee-list.ts`. — **Fix:** import from those domain modules directly; drop the aggregate import.

### 2d. Broad cache invalidation (FE-133)

- [ ] `hooks/api/hr/benefits.ts:130,140` — `useCreateBenefitPlan` and `useUpdateBenefitPlan` both call `invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.benefitsAll })` without `exact: true`. `benefitsAll` is the prefix `[..., "hr", "benefits"]`, so the invalidation cascades to `benefitMy`, `benefitDependents`, and any future benefits sub-query the mutation doesn't affect. — **Fix:** narrow to `{ queryKey: humanResourcesQueryKeys.hr.benefitPlans(), exact: true }` (add a `benefitPlans` key if absent) and, where the response carries the new plan, call `setQueryData` to update the plans cache directly.
- [ ] `hooks/api/hr/benefits.ts:162,172,194,195,205,244` — `useEnroll`, `useWaive`, `useAddDependent`, `useRemoveDependent`, `useArchivePlan` each invalidate `benefitMy` or `benefitDependents` without `exact: true`. — **Fix:** add `exact: true` to each; where the mutation response includes the updated enrollment/dependent list, patch via `setQueryData` instead.

---

## Category 3 — Duplicates and Dead Code

### 3a. Three near-duplicate reject-reason overlays (FE-59/FE-135)

All three accept `(open, onOpenChange, reason-state, onConfirm, isPending)` and render a `Textarea` inside an overlay. The differences are cosmetic (Dialog vs Sheet) and calling convention (internal vs external state for one).

- [ ] `features/hr/action-center/reject-reason-dialog.tsx` + `features/hr/attendance/reject-reason-sheet.tsx` + `features/hr/exit/reject-remarks-sheet.tsx` — three components doing the same job. — **Fix:** promote a single `RejectReasonOverlay` to `components/shared/` with an `overlay?: "dialog" | "sheet"` prop (default `"dialog"`); wire mutations outside the component (as the sheet already does); delete the three originals and update importers.

### 3b. Manual memoization across 258 feature files (FE-114)

The React Compiler (`reactCompiler: true` is live) handles `useMemo`, `useCallback`, and `React.memo` automatically. Every call in non-effect code is now dead weight and a bail-out signal. The full list is too long to enumerate; the highest-impact files are flagged below. Removing them is the fixer's job per-file-touch; do not introduce new ones.

- [ ] `app/(authenticated)/hr/performance/analytics/page.tsx:76,100,106,115,126` — `memo()` on `PerformanceAnalyticsStats`, `useCallback` on `handleRetry`, `useMemo` ×3 for chart data transforms. — **Fix:** remove all five; write plain functions and derivations; the compiler memoizes them.
- [ ] `features/hr/attendance/use-attendance-timer.ts:3,28,46,155,177,181,185,194,198` — `useMemo` ×2 (`today`, `todayHolidayName`, `sessionTimer`), `useCallback` ×5 (`handleCheckIn`, `handleCheckOut`, `handleBreakToggle`, `handleRetryStatus`, `dismissPunchFailure`). `today` computed once at mount with `useMemo(() => new Date(), [])` is pointless since `new Date()` is cheap and the value never changes. — **Fix:** remove all `useMemo`/`useCallback` calls; keep `today` as a plain `const`; the compiler handles the rest.
- [ ] All 256 other `features/hr/**` files that contain `useMemo`/`useCallback`/`React.memo` — **Fix:** remove on next edit pass per file; do not remove as a sweep without reading the surrounding logic for the one exception (an effect dependency the compiler cannot see).

### 3c. Type re-export in hook module (FE-128)

- [ ] `hooks/api/hr/attendance.ts:57–78` — declares `AttendanceRegularization`, `CreateRegularizationInput`, `AttendanceHistoryResponse` as local interfaces. These are hand-typed duplicates of shapes the schema contract already encodes. — **Fix:** derive from the Zod schema via `z.infer<typeof regularizationRowContract>` etc.; delete the hand-typed interfaces.

---

## Category 4 — Unpaginated Lists (FE-31/112/146)

- [ ] `hooks/api/hr/leaves.ts:135` — `useHrMyLeaveRequests` fetches `/me/time-off/requests?limit=100` as a flat `useQuery` (not `useInfiniteQuery`). The result is rendered by `features/hr/work-logs/work-logs-page.tsx` as an unscrolled list via `.map`. — **Fix:** replace the flat query with `useHrMyLeaveRequestsInfinite` (already exists at line 144) + `InfiniteScrollSentinel`; retire `useHrMyLeaveRequests`.
- [ ] `features/hr/engagement/communities-tab.tsx:197–200` — renders `<InfiniteScrollSentinel onLoadMore={fetchNextPage} label="Load more communities">` which is an `IntersectionObserver`-driven sentinel (correct per FE-125); however the fallback `<button>` inside `InfiniteScrollSentinel` renders as a visible "Load more communities" text node when JS is disabled or during the fetching period. Verify it is `sr-only` in the DOM at all times while `isFetchingNextPage` is true. — **Fix:** confirm the `sr-only` CSS class is applied to the fallback button at all times; no visible "Load more" text should appear to sighted users.
- [ ] `features/hr/performance/succession-tab.tsx:260–261` — same pattern as communities-tab; uses `InfiniteScrollSentinel` correctly but the `label="Load more succession entries"` fallback button must stay `sr-only`. Verify same as above.

---

## Category 5 — React Principle Violations (FE-138/FE-139)

- [ ] `features/hr/documents/document-editor-page.tsx:41–48` — `useEffect(() => { window.setTimeout(() => { setTitle(doc.title); setContentJson(doc.contentJson); }, 0); return () => window.clearTimeout(timeoutId); }, [doc])` — mirrors query data (`doc.title`, `doc.contentJson`) into local state via a `setTimeout` inside an effect. This is the anti-pattern in FE-138. The editor needs these values as local state because the user edits them before save, but the mirroring approach means a re-fetch overwrites any unsaved edits. — **Fix:** initialise state from the first-loaded value using a stable `key` prop on the form (`key={doc.id}`), or `useSourceOverride(source, fallback)` per FE-137; never mirror in an effect.
- [ ] `features/hr/attendance/use-attendance-timer.ts:99–103` — `useEffect(() => { if (statusData?.cooldownRemaining > 0) setLocalCooldown(statusData.cooldownRemaining); }, [statusData?.cooldownRemaining])` — mirrors server query data into state in an effect (FE-138). The countdown logic is legitimate (client decrements locally), but the initial sync must not use an effect. — **Fix:** derive `startingCooldown` from query data with `select`, pass it as a prop or param to the countdown state, and initialise `useState(startingCooldown)` only on mount; on server refresh, reset via `key` if the server value increases.
- [ ] `features/hr/attendance/use-attendance-timer.ts:114–116` — `useEffect(() => { if (statusData) setLocalBreakOverride(null); }, [statusData?.status, statusData])` — resets override state from query data in an effect. This is the same anti-pattern. — **Fix:** handle in the mutation `onSuccess` callbacks (`checkOutMutation`, `checkInMutation`) where the server response is already known; do not use an effect.

---

## Category 6 — Next.js Principle Violations (FE-01/FE-56)

- [ ] `app/(authenticated)/hr/benefits/page.tsx:1` — `"use client"` on a route page to run `useCan("hr:benefits:manage")` for conditional tab rendering. The whole page becomes a client bundle including its Tabs and imports. — **Fix:** remove `"use client"`; make the page a server component that delegates to `<BenefitsPageClient>` in `features/hr/benefits/`; the feature client component reads `useCan` internally. The tab that requires the permission is already client-side in `BenefitsPlansAdminTab`.
- [ ] `app/(authenticated)/hr/performance/analytics/page.tsx:1–192` — 192-line `"use client"` route page that (a) defines a memoised `PerformanceAnalyticsStats` component inline, (b) runs three `useMemo` chart-data transforms, and (c) renders a `DataTable` with inline column definitions. Violates FE-01 (unnecessary client page) and FE-56 (page implements rather than composes). — **Fix:** extract all UI to `features/hr/analytics/performance-analytics-page-client.tsx`; the route `page.tsx` becomes a 10-line server file calling `requirePermission` and rendering `<PerformanceAnalyticsPageClient>` inside `<Suspense>`.
- [ ] `app/(authenticated)/hr/service-delivery/page.tsx:1–217` — 217-line `"use client"` page that (a) defines the `ItemRow` component inline, (b) runs complex access-resolution logic to pick between two hooks, and (c) renders a full stat-card grid. Violates FE-01 and FE-56. — **Fix:** move `ItemRow` and the full page body to `features/hr/service-delivery/service-delivery-page.tsx`; `page.tsx` becomes `requirePermission(["hr:cases:view", "hr:helpdesk:view"])` + `<Suspense fallback={<ServiceDeliveryLoading />}>`.
- [ ] `app/(authenticated)/hr/kpis/page.tsx:7` — server component but missing `requirePermission`. The KPI and competency tabs both use `usePageState({ permission: "hr:performance:view", ... })` for client-side gating, but the server route is open to any authenticated user, letting a crawler hit both tab endpoints. — **Fix:** add `await requirePermission("hr:performance:view")` at the top of the server component.

---

## Category 7 — RBAC

### 7a. `useCan` used as page gate (FE-40/FE-42)

- [ ] `app/(authenticated)/hr/benefits/page.tsx:12` — `const canManage = useCan("hr:benefits:manage")` used to show/hide the Manage Plans tab. `useCan` is `false` during access loading (FE-42 / AP-6). — **Fix:** gate the tab inside `BenefitsPlansAdminTab` or the client feature; the route page becomes a server component (see Cat 6).

### 7b. Missing server-level permission check on route pages (FE-147)

The following pages have no `requirePermission` call. Each has client-side gating via `usePageState` in the feature component, but a server crawler hits the route before JS loads.

- [ ] `hr/geofencing`, `hr/goals`, `hr/overtime`, `hr/comp-off`, `hr/rosters`, `hr/shifts`, `hr/work-logs`, `hr/workforce-cost`, `hr/org-chart`, `hr/onboarding`, `hr/onboarding/[userId]`, `hr/settings/automations`, `hr/settings/custom-fields`, `hr/settings/forms`, `hr/settings/forms/[formId]`, `hr/settings/forms/[formId]/submissions`, `hr/settings/integrations`, `hr/settings/policies`, `hr/settings/templates`, `hr/settings/versions`, `hr/settings/workflows`, `hr/travel`, `hr/travel/approvals` — **Fix:** add `await requirePermission("hr:<resource>:<action>")` as the first line; the action can match the `usePageState` permission already declared in the feature.

### 7c. Loading state exposes page chrome before access is confirmed (FE-147)

`app/(authenticated)/hr/benefits/page.tsx` renders the entire `<Tabs>` wrapper including the tab list before `useCan` resolves. A denied user sees tab chrome flash before `PageState` hides it. This is the FE-42 race described in AP-6.

- [ ] `app/(authenticated)/hr/benefits/page.tsx` — tab list renders before `useCan` resolves. — **Fix:** move tab logic into `features/hr/benefits/benefits-page-client.tsx` gated by `usePageState({ permission: "hr:benefits:view", ... })`.

---

## Category 8 — Loading Skeletons (FE-119/FE-142/FE-144)

### 8a. Pages missing own `loading.tsx` (FE-144) — 20 pages

Each of these has a `page.tsx` with no sibling `loading.tsx`. They fall back to the module-level `app/(authenticated)/hr/loading.tsx` which shows the HR overview skeleton — completely wrong shape for subroutes.

- [ ] `app/(authenticated)/hr/comp-off/` — missing `loading.tsx` — **Fix:** add skeleton matching `CompOffPageClient` layout (stat cards + list).
- [ ] `app/(authenticated)/hr/employees/find-expert/` — missing `loading.tsx` — **Fix:** add skeleton.
- [ ] `app/(authenticated)/hr/employees/skills-matrix/` — missing `loading.tsx` — **Fix:** add skeleton.
- [ ] `app/(authenticated)/hr/engagement/` — missing `loading.tsx` — **Fix:** add skeleton matching the tabs layout.
- [ ] `app/(authenticated)/hr/geofencing/` — missing `loading.tsx` — **Fix:** add skeleton.
- [ ] `app/(authenticated)/hr/overtime/` — missing `loading.tsx` — **Fix:** add skeleton.
- [ ] `app/(authenticated)/hr/rosters/` — missing `loading.tsx` — **Fix:** add skeleton.
- [ ] `app/(authenticated)/hr/service-delivery/` — missing `loading.tsx` — **Fix:** add skeleton matching stat cards + item list.
- [ ] `app/(authenticated)/hr/settings/` (hub page) — missing `loading.tsx` — **Fix:** add skeleton.
- [ ] `app/(authenticated)/hr/settings/automations/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/custom-fields/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/forms/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/forms/[formId]/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/forms/[formId]/submissions/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/import-export/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/integrations/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/policies/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/preview/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/templates/` — missing `loading.tsx`.
- [ ] `app/(authenticated)/hr/settings/versions/` — missing `loading.tsx`.

### 8b. Generic / shared loading violates per-page ownership (FE-144)

- [ ] `app/(authenticated)/me/loading.tsx:4` — renders `<LoadingState variant="page" />` — a generic spinner shared by every `/me/*` page (career, money, records, resignation, support, team, workday). Each sub-page has a different layout; a generic spinner causes layout shift when the real page arrives. — **Fix:** delete this file; give each of the 7 `/me/*/` pages its own `loading.tsx` that mirrors the page's `PageWrapper` + skeleton geometry.

### 8c. Layout-mismatched loading skeleton (FE-142)

- [ ] `app/(authenticated)/hr/attendance/loading.tsx:11` — shows `grid-cols-1 lg:grid-cols-12` (12-column) skeleton, but `AttendanceContent` renders either a 2-column `lg:grid-cols-2` (admin) or a narrow single-column form (non-admin) inside a `ScrollArea`. The skeleton bears no resemblance to the real layout. — **Fix:** replace with a 2-column skeleton for admin path (stat card + regularisation on left, team card on right), or the single-column card when `isAdmin=false`; extract a `AttendanceSkeleton` component and reuse in the query-loading branch of `AttendanceContent`.

### 8d. Index-as-key in loading skeleton (FE-119)

- [ ] `app/(authenticated)/hr/holidays/loading.tsx:20` — `Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} ...>))` — uses array index as React key. — **Fix:** replace with a stable key array `const ROWS = [1,2,3,4,5,6,7,8]` and `ROWS.map((n) => <Skeleton key={n} ...>)`.

---

## Additional Point-Findings (FE-15, FE-91, FE-92)

- [ ] `features/hr/documents/document-table.tsx:70` — `await fetch(await getProtectedFileUrl(...))` — raw `fetch()` inside a component click handler, bypassing `apiClient`, contracts, and the error-policy layer (FE-15 / AP-3). — **Fix:** move the download logic to `hooks/api/hr/documents.ts` as a non-hook async helper (`downloadHrDocumentsZip`) that calls `apiClient` (or `getProtectedFileUrl` stays, but the fetch and error handling move to `lib/api/`); import and call from the component.
- [ ] `features/hr/leaves/components/leave-balance-donut.tsx:10` — `const DONUT_COLORS = ["#06b6d4", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"]` — 5 raw hex colors in a CSS-token project (FE-92/93). — **Fix:** replace with `statusToneClasses` or CSS token variables; if recharts requires a color string, read it from the computed CSS variable via `getComputedStyle`.
- [ ] 27 instances of `toLocaleDateString()` / `toLocaleString()` across `features/hr/` (listed by grep path above) — renders dates in the browser locale, not the org timezone (FE-91). — **Fix:** use `formatInOrgTz(date, orgTz, "PP")` or the shared date-formatting utility; read `orgTz` from `useOrgTimeZone()`. Key files: `features/hr/documents/template-version-history.tsx:61`, `features/hr/engagement/campaigns-tab.tsx:209,211`, `features/hr/engagement/polls-tab.tsx:143`, `features/hr/goals/goal-card.tsx:127,128`, `app/(authenticated)/hr/performance/analytics/page.tsx:72`, and 22 others.

---

## Fix Lanes (parallel, disjoint)

### Lane A — Route pages and loading skeletons
Files: `app/(authenticated)/hr/**`, `app/(authenticated)/me/**`  
Work: Add missing `loading.tsx` files (Cat 8a, 20 files); fix `me/loading.tsx` (Cat 8b); fix attendance loading layout (Cat 8c); fix holidays loading key (Cat 8d); extract `service-delivery/page.tsx` and `performance/analytics/page.tsx` to features (Cat 6); add `requirePermission` to ungated routes (Cat 7b); remove `"use client"` from `benefits/page.tsx` (Cat 6); fix `kpis/page.tsx` permission (Cat 7c).

### Lane B — Hooks (`hooks/api/hr/**`)
Files: `hooks/api/hr/**`  
Work: Fix hardcoded pagination limits (Cat 2b); fix broad invalidation in `benefits.ts` and add `exact: true` (Cat 2d); delete hand-typed interface duplicates in `attendance.ts` and derive from schema (Cat 3c); fix missing `requirePermission`-related endpoint changes if needed.

### Lane C — Feature components (`features/hr/**`, `features/employee-self-service/**`)
Files: `features/hr/**` (excluding `features/hr/attendance/use-attendance-timer.ts` — shared with Lane D)  
Work: Extract `ServiceDeliveryPage` and `PerformanceAnalyticsPage` from `app/` into `features/hr/` (coordinate with Lane A which edits the route files); fix `document-table.tsx` raw fetch (Cat extra); fix FE-138 violations in `document-editor-page.tsx` (Cat 5); merge the three reject-reason overlays (Cat 3a); remove manual memoization per file; fix `toLocaleDateString` instances; fix hex colors in `leave-balance-donut.tsx`.

### Lane D — Cross-cutting: timer and access
Files: `features/hr/attendance/use-attendance-timer.ts`, `features/hr/assets/assets-page.tsx`, `features/hr/benefits/` (new client wrapper)  
Work: Fix FE-138 effect mirroring in `use-attendance-timer.ts` (Cat 5); fix FE-127 aggregate import in `assets-page.tsx` (Cat 2c); create `BenefitsPageClient` extracted from `benefits/page.tsx` (Cat 6); fix `useCan` as page gate in benefits (Cat 7a); fix FE-143 dual naming in `onboarding-list.tsx` and `reviews-tab.tsx` (Cat 1).

### Coordinator-owned (hot/shared files — do not edit in lanes)
- `hooks/api/hr/index.ts` — HR barrel; any new domain-module import changes that touch it
- `lib/prefetch/hr.ts` — prefetch functions; all Lane A server-prefetch additions go here
- `lib/query-keys/human-resources.ts` — add new key factories (e.g. `benefitPlans`) only after both Lane B mutation and Lane B query changes are committed
- `components/shared/` — addition of merged `RejectReasonOverlay` (Cat 3a)

---

## Backend Contract Changes Needed

None required to fix the items above. The endpoint contracts are correct; all issues are client-side. However, if the `useHrMyLeaveRequests` hardcoded-`limit:100` fix (Cat 4) moves to a proper paginated `useInfiniteQuery`, confirm that `GET /me/time-off/requests` already returns `pageInfo.nextCursor` (it does — confirmed in `leaves-schema.ts`). No new endpoint is needed.

---

## Page-by-Page RBAC / Loading Summary

| Page | Server gate | `usePageState` in feature | Own `loading.tsx` |
|---|---|---|---|
| `hr/` (dashboard) | ✓ | N/A | ✓ |
| `hr/employees` | ✓ `hr:employees:view` | ✓ | ✓ |
| `hr/leaves` | ✓ multi-permission | ✓ | ✓ |
| `hr/attendance` | ✓ `hr:attendance:view` | N/A | ✓ (wrong layout) |
| `hr/benefits` | ✗ (client-only via `useCan`) | ✗ (no `usePageState`) | ✓ |
| `hr/performance` | ✓ `hr:performance:view` | ✓ | ✓ |
| `hr/performance/analytics` | ✗ (client-only) | ✓ `usePageState` | ✓ |
| `hr/kpis` | ✗ | ✓ (tabs) | ✓ |
| `hr/geofencing` | ✗ | ✗ (only `useCan` for mutation) | ✗ |
| `hr/service-delivery` | ✗ (client-only) | ✓ `usePageState` | ✗ |
| `hr/settings` (hub) | ✗ | N/A | ✗ |
| `hr/settings/*` (18 sub-pages) | ✗ | varies | ✗ (most) |
| `hr/comp-off` | ✓ `hr:leaves:view` | feature | ✗ |
| `hr/overtime` | ✗ | ✓ | ✗ |
| `hr/rosters` | ✗ | ✓ | ✗ |
| `hr/shifts` | ✗ | ✓ | ✓ |
| `hr/work-logs` | ✗ | ✓ | ✓ |
| `me/*` (7 pages) | varies | ✓ | ✗ (generic shared) |
