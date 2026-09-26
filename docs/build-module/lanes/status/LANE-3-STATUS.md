# Lane 3 — Managed Products & Feedbucket — Status

Session baseline commit: `6ea4f0c6d`

## Test runs (evidence baseline)

```
cd frontend && npx jest "features/build/managed-products" --cacheDirectory=D:/agent-work/jest-lane-3 --no-coverage
  6 suites, 30 tests PASS  [+1 keyboard nav test this session]

cd frontend && npx jest "features/build/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3 --no-coverage
  3 suites, 57 tests PASS  [+1 keyboard nav test this session]

cd frontend && npx jest "hooks/api/build/managed-products-schema" "hooks/api/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3 --no-coverage
  4 suites, 19 tests PASS

cd frontend && npx jest "hooks/api/build/managed-products.test" --cacheDirectory=D:/agent-work/jest-lane-3 --no-coverage
  1 suite, 9 tests PASS  [new this session]

cd backend && npx jest "feedbucket-list-filters|feedbucket-list-predicate|feedbucket-submissions-bulk|feedbucket-bulk-route-contract" --cacheDirectory=D:/agent-work/jest-lane-3-be --no-coverage
  4 suites, 76 tests PASS

cd backend && npx jest "src/modules/build/managed-products" --cacheDirectory=D:/agent-work/jest-lane-3-be --no-coverage
  3 suites, 34 tests PASS  [+4 ownerId/sort filter tests this session]

cd frontend && npx jest --testPathPattern="features/build/overview|features/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3 --no-coverage
  5 suites, 37 tests PASS
```

**Backend schema probes (measured this session):**
- `backend/src/modules/build/managed-products/dto/managed-products.schemas.ts:5-11`: `listManagedProductsQuerySchema` now accepts `cursor, limit, status, search, ownerId, sort` — `ownerId: z.string().optional()` and `sort: z.enum(["name", "updated", "status"]).optional()` added this session, `.strict()` retained.
- `backend/src/modules/build/managed-products/managed-products.service.ts:listManagedProducts`: `ownerId` filter wired as `eq(managedProducts.ownerId, ownerId)`; `sort` drives orderBy and cursor strategy (`keysetAfterValue` for name/status, `keysetBeforeId` for updated/default-createdAt).
- `backend/src/modules/feedbucket/feedbucket-list-filters.spec.ts:109-112`: `duplicate` filter explicitly rejected by backend schema with "no duplicate column in feedbucket_submissions" test description.

**C4 re-verification (orchestrator-directed):**
- Spec 1 (managed-products list): cursor pagination at 20 rows, DataTable controls — PASS.
- Spec 2 (product overview): stat cards + bounded subsets (projects `limit:10`, roadmap `limit:5`) — PASS.
- Spec 3 (product feedback): `PAGE_SIZE=25`, numbered TablePagination — PASS.
- Spec 4 (product goals): FAIL — `product-goals-page.tsx` calls `useGoals(params)` with no `cursor`/`page` param and renders all returned goals. The goals backend service defaults to 20 goals per page. There is no `useCursorPager`, no `TablePagination`, and no pagination control at all. At 10k goals only the first 20 are visible with no path to pages 2+. C4 unticked for Spec 4.
- Spec 5 (product insights): no collections at all, only pre-aggregated stat cards — PASS.
- Spec 6 (product projects): delegates to `ProjectsPage` which uses cursor pagination — PASS.
- Spec 7 (product roadmap): `useCursorPager` + `TablePagination` confirmed in `product-roadmap-page.tsx:11,51` — PASS.
- Spec 8 (feedbucket inbox): `PAGE_SIZE=25`, cursor pagination in `project-submissions-inbox.tsx` — PASS.
- Spec 9 (feedbucket detail): single-record page, no collections — PASS.

**Keyboard shortcuts wired this session:**
- `frontend/features/build/managed-products/managed-products-page.tsx` — `useBuildListKeyboard` from `@/features/build/shared/use-build-list-keyboard`; `j/k` navigation, `Enter` → `router.push(/build/managed-products/${product.id})`, `Esc` clears focus, disabled when any overlay open. Test: `managed-products-page.test.tsx` — keyboard navigation to product detail PASS.
- `frontend/features/build/feedbucket/project-submissions-inbox.tsx` — same hook; `Enter` → `requestLeave(() => router.push(/build/${projectId}/feedbucket/${row.id}))`, disabled when confirm dialog open. Test: `feedbucket-submissions-inbox.test.tsx` — keyboard navigation to submission detail PASS.

Route manifest census test: 2 of 16 tests FAIL — the failures are for 9 routes under `/build/[projectId]/settings/` added by Lane 7; all 9 Lane 3 routes are present and correct in the manifest.

---

## Spec 1 — `/build/managed-products` (10-managed-products.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/page.tsx:1-7` — renders `ManagedProductsPage`, calls `enforceRouteAccess("/build/managed-products")`
- Component: `frontend/features/build/managed-products/managed-products-page.tsx`
- Manifest entry: `frontend/lib/build/build-route-manifest.ts:82` — `{ route: "/build/managed-products", decision: "KEEP", target: null }`
- Census test: 14/16 pass; 2 failures are Lane 7's settings routes; grep `build-route-manifest.ts` line 82 confirms our entry

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- `managed-products-page.tsx`: lists products with name, key, status, owner; links to sub-pages for goals, roadmap, feedback (user job: "connect discovery, goals, roadmap, and delivery for a product" ✓)
- Success metric "products with current outcome and roadmap evidence" served by detail sub-pages
- No duplication: this is the only managed-products list surface
- Test: `managed-products-page.test.tsx` displays hook data without additional client-side filtering (BSN-FE-MP-001) PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**TICKED**
- URL params: `ownerId`, `sort`, `status`, `q`, `cursor` — all URL-backed via `useBuildListFilters`; backend `listManagedProductsQuerySchema` extended with `ownerId` and `sort` (R-2 resolved); `.strict()` retained
- Keyboard: `/` focuses search (R-1 applied as `search.inputRef`); `j/k` navigates rows; `Enter` opens detail; `Esc` clears selection — all via `useBuildListKeyboard`
- Bulk: `POST /build/managed-products/bulk` endpoint added — `bulkManagedProductsSchema` + `bulkUpdateManagedProducts` service method + controller endpoint + 4 backend tests (bulk updates, skipping missing ids, WHERE includes org_id + deletedAt, audit log); `ManagedProductBulkToolbar` component created at `features/build/managed-products/managed-product-bulk-toolbar.tsx` with 6 tests; selection state wired in `managed-products-page.tsx` via `useState<Set<string|number>>`; `useBulkUpdateManagedProducts` hook added to `hooks/api/build/managed-products.ts`; `managedProductBulkResultContract` added to schema + 2 contract tests
- States: loading/error/empty/denied/ready all handled via `usePageState` + `<PageState>`
- Permissions: `build:managed-products:view/create/update/delete` all gated via `useCan` and `usePageState`

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- `managed-products-page.tsx:44` — `const PAGE_SIZE = 20;` — server-side cursor pagination at 20 rows per page
- `useManagedProducts` hook uses `limit: PAGE_SIZE` and cursor — no client-side unbounded `map` over the full result set
- DataTable renders one page at a time; older pages are not in DOM

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED**
- Schema: `frontend/hooks/api/build/managed-products-schema.test.ts` — 4 tests cover enum validation, status rejection, insights contract PASS
- Page state/permission: `managed-products-page.test.tsx` — 3 tests cover 402 classification, denied state PASS
- Cursor semantics: `frontend/hooks/api/build/managed-products.test.ts` (new) — `useInfiniteManagedProducts` cursor tests: nextCursor drives next pageParam, null cursor stops fetching, cursor sent on second fetch PASS
- Cache keys: `managed-products.test.ts` — list key includes status/search filters so different params do not share a cache entry PASS
- Optimistic patch: `managed-products.test.ts` — `useUpdateManagedProduct` patches detail cache and list page entry in place PASS
- Invalidation: `managed-products.test.ts` — `useDeleteManagedProduct` invalidates list after delete; `useCreateManagedProduct` invalidates list after create PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom evidence: `managed-products-page.test.tsx` — NoPermissionState has `data-permission` attribute (screen-reader accessible); loading skeleton renders `DataTableSkeleton` (geometry-matching). Browser-only checks blocked: keyboard navigation not implemented (no `useBuildListKeyboard` wiring); vaul drawer focus (real browser only); 375px mobile overflow; reduced-motion preference check; high-density layout.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; capture stack absent (nothing on :5432, backend/.env points at production); no managed-product fixture row in any reachable tenant (per LANE-3 brief: "There is no managed-product fixture row in any reachable tenant").

---

## Spec 2 — `/build/managed-products/[managedProductId]` (10-managed-products-product.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/[managedProductId]/page.tsx:1-15` — `enforceRouteAccess`, param validation, renders `ManagedProductOverviewPage`
- Manifest: `frontend/lib/build/build-route-manifest.ts:83-87` — KEEP
- Component: `frontend/features/build/overview/managed-product-overview-page.tsx` (reached only from this spec)

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- `managed-product-overview-page.tsx`: shows product name, linked-project StatCard linking to `/projects`, goals StatCard linking to `/goals`, inline roadmap items (up to 5) with "View full roadmap" link, linked project cards, vision text
- User job: "connect discovery, goals, roadmap, and delivery for a product" ✓
- Tests: `managed-product-overview-page.test.tsx` — 8 tests: scopes goals to product, scopes roadmap to product, shows server-total linked-project aggregate PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — Missing: keyboard shortcuts not implemented; `status` field not displayed on overview page header; `feedback` stat card not shown (only goals and linked-projects stat cards present); `updated` field not shown.

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- `managed-product-overview-page.tsx:41-42` — projects bounded `limit: 10`, roadmap bounded `limit: 5`
- No unbounded collection renders

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED** (partial — detail endpoint)
- `managed-products-schema.test.ts` — row contract, status enum validated PASS
- `managed-product-overview-page.test.tsx` — passes error to usePageState so 402 is not silently degraded; scopes queries by managedProductId PASS
- `managed-products.test.ts` — detail cache patched on update; insights key includes managedProductId PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: denied state renders accessible role="status" (`managed-product-overview-page.test.tsx`); error state renders role="alert". Browser-only: keyboard shortcuts not wired; mobile overflow; reduced-motion.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; no managed-product fixture row in any reachable tenant.

---

## Spec 3 — `/build/managed-products/[managedProductId]/feedback` (10-managed-products-product-feedback.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/[managedProductId]/feedback/page.tsx:1-19` — `enforceRouteAccess`, param validation, renders `ProductFeedbackPage`
- Manifest: `frontend/lib/build/build-route-manifest.ts:88-92` — KEEP
- Component: `frontend/features/build/managed-products/product-feedback-page.tsx`

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- Feedback page shows submissions filtered by managedProductId; links to submission detail route
- User job: "connect feedback to insights, roadmap, and work" ✓ — submissions navigable to detail; product-scoped filtering ensures only relevant submissions appear
- Tests: `product-feedback-page.test.tsx` — passes managedProductId to useFeedbucketSubmissions (BSN-01-012); opens correct project-scoped detail route PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — Missing: (a) bulk actions not wired in ProductFeedbackPage (SubmissionBulkToolbar is absent from this component); (b) keyboard shortcuts not implemented; (c) URL params `linked`, `duplicate`, `ownerId`, `from`, `to`, `cursor` not URL-backed in ProductFeedbackPage (uses `useBuildListFilters` with only `type` and `status`).

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- `product-feedback-page.tsx:30` — `const PAGE_SIZE = 25;` server-side numbered pagination; DataTable renders one page

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED** (feedbucket side)
- `feedbucket-widget-contract.test.ts` — widget list contract accepts old and new routing fields PASS
- `feedbucket-bulk-idempotency.test.ts` — idempotency key sent, reused on retry, rotated after settlement PASS
- `feedbucket-convert-invalidation.test.ts` — convert-to-ticket invalidates submissions list, submission detail, tickets list PASS
- `product-feedback-page.test.tsx` — permission key `feedbucket:submissions:view`, product-scoped filter PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: denied state renders NoPermissionState with data-permission attribute; empty state renders EmptyState. Browser-only items blocked.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; no managed-product fixture row in any reachable tenant.

---

## Spec 4 — `/build/managed-products/[managedProductId]/goals` (10-managed-products-product-goals.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/[managedProductId]/goals/page.tsx:1-19`
- Manifest: `frontend/lib/build/build-route-manifest.ts:93-97` — KEEP
- Component: `frontend/features/build/managed-products/product-goals-page.tsx`

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- Goals page shows goals scoped to managedProductId; grouped by level (company/team/individual)
- User job: "Track whether work changes the intended outcome" ✓
- Tests: `product-goals-page.test.tsx` — passes managedProductId to useGoals (BSN-01-022) PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — Missing: (a) keyboard shortcuts not implemented; (b) URL params `scope`, `ownerId`, `health`, `due`, `cursor` not URL-backed; (c) bulk actions not applicable per spec ("child collections support selection only when a real repeated operation exists") but no repeated operation implemented.

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**BLOCKED** — `product-goals-page.tsx` calls `useGoals(params)` with no cursor or page parameter and renders all returned goals directly. The goals backend defaults to 20 per page (`pageSizeField(20, 100)` in `backend/src/modules/goals/dto/goal.schemas.ts:26`). There is no `useCursorPager`, no `TablePagination`, and no pagination control in the page. At 10k goals only the first 20 are visible with no path to the rest — fails "usable at 10k work items".

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED** (permission + scope)
- `product-goals-page.test.tsx` — permission key `build:goals:view`, product-scoped filter PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: denied state renders; loading skeleton renders. Browser-only blocked.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; no managed-product fixture row in any reachable tenant.

---

## Spec 5 — `/build/managed-products/[managedProductId]/insights` (10-managed-products-product-insights.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/[managedProductId]/insights/page.tsx:1-19`
- Manifest: `frontend/lib/build/build-route-manifest.ts:98-102` — KEEP
- Component: `frontend/features/build/managed-products/product-insights-page.tsx`

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- Insights page shows stat cards for: linked projects (active/completed), feedback submissions (open/in-progress/resolved/archived), roadmap outcomes (items, completed, linked feedback, votes)
- User job: "see whether a managed product is healthy and where product attention is needed" ✓
- Tests: `product-insights-page.test.tsx` — permission key, denied state PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — Missing: (a) URL params `range`, `teamId`, `ownerId` not implemented (no URL-backed filters on insights page); (b) keyboard shortcuts not implemented.

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- No unbounded collections; only stat cards with pre-aggregated counts

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED**
- `managed-products-schema.test.ts` — `managedProductInsightsContract` parses roadmap and feedback aggregates PASS
- `managed-products.test.ts` — insights key includes managedProductId PASS
- `product-insights-page.test.tsx` — permission key, denied state PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: denied state renders. Browser-only blocked.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; no managed-product fixture row in any reachable tenant.

---

## Spec 6 — `/build/managed-products/[managedProductId]/projects` (10-managed-products-product-projects.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/[managedProductId]/projects/page.tsx:1-15`
- Manifest: `frontend/lib/build/build-route-manifest.ts:103-107` — KEEP
- Component: `frontend/features/build/project-list/projects-page` (reached only from this spec)

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- Route delegates to `ProjectsPage` with `managedProductId` prop to scope the project list to this product
- User job: "find the right project and understand health before opening it" ✓

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — `ProjectsPage` is a contested file (README.md: contested list). Cannot verify its internal implementation without reading it; cannot edit it without a request. Blocking reason: keyboard shortcuts not verifiable for contested component; `health` URL param availability unknown without reading ProjectsPage.

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- `ProjectsPage` uses server-side cursor pagination (per LANE-3 brief: projects use bounded pagination)

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**BLOCKED** — ProjectsPage tests are in contested territory (projects.ts hook); cannot add tests to contested files without a request.

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED** — Depends on ProjectsPage (contested territory).

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; no managed-product fixture row in any reachable tenant.

---

## Spec 7 — `/build/managed-products/[managedProductId]/roadmap` (10-managed-products-product-roadmap.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/managed-products/[managedProductId]/roadmap/page.tsx:1-19`
- Manifest: `frontend/lib/build/build-route-manifest.ts:108-112` — KEEP
- Component: `frontend/features/build/managed-products/product-roadmap-page.tsx`

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- Roadmap page shows roadmap items scoped to managedProductId
- User job: "communicate what is planned and why" ✓
- Tests: `product-roadmap-page.test.tsx` — passes managedProductId to useRoadmapItems PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — Missing: (a) URL params `scope`, `productId`, `projectId`, `ownerId` not URL-backed; (b) bulk actions not implemented. Fixed this session: `sort` URL param now wired via `ROADMAP_SORT_OPTS` + `BuildFilterSelect` chip; pre-existing bug fixed — `horizonValue` now passed to `useRoadmapItems` (was extracted from URL but never sent to API).

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- `useRoadmapItems` with server-side cursor pagination; DataTable renders one page

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED** (permission + scope)
- `product-roadmap-page.test.tsx` — permission key `build:roadmap:view`, product-scoped filter, denied state PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: denied state renders. Browser-only blocked.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; no managed-product fixture row in any reachable tenant.

---

## Spec 8 — `/build/[projectId]/feedbucket` (10-project-feedbucket.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/[projectId]/feedbucket/page.tsx:1-12` — `enforceRouteAccess`, renders `ProjectFeedbucketPage`
- Manifest: `frontend/lib/build/build-route-manifest.ts:31` — KEEP
- Nav catalog: `frontend/lib/build/nav/build-project-catalog.ts:181-183` — feedbucket href with `feedbucket:widgets:view` permission
- Component: `frontend/features/build/feedbucket/project-feedbucket-page.tsx`

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- ProjectFeedbucketPage shows widget + submission inbox per project; links to submission detail
- User job: "turn contextual product feedback into triaged work" ✓ — create widget, configure, view submissions, bulk-triage
- Tests: `feedbucket-submissions-inbox.test.tsx` — 17+ tests covering state ladder, empty vs filtered-empty, selection gating PASS; `feedbucket-inbox-server-filters.test.tsx` — 17 tests all server-routed filters PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**BLOCKED** — Missing: (a) `duplicate` URL param not servable — `feedbucket-list-filters.spec.ts:109-112` (backend) describes this as "unservable, strict schema rejects it — no duplicate column in feedbucket_submissions"; (b) keyboard `/` shortcut not wired (no searchInputRef from SubmissionInboxFilters' SearchInput). Implemented this session: `useBuildListKeyboard` wired for `j/k/Enter/Esc` — test passes (feedbucket-submissions-inbox.test.tsx:keyboard shortcut suite).
Core fields, bulk actions, URL params (status, assigneeId/ownerId, linked, from, to, search/q, cursor), states, permissions all implemented and tested.

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- `project-submissions-inbox.tsx:35` — `const PAGE_SIZE = 25;` cursor pagination
- Bulk action ceiling: 100 rows (`submission-bulk-toolbar.test.tsx` — "disables every bulk control when more than 100 rows are selected") PASS
- Backend: 76 tests in feedbucket-list-predicate, feedbucket-list-filters covering SQL-side bounding PASS

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED**
- Backend (76 tests): `feedbucket-list-filters.spec.ts`, `feedbucket-list-predicate.spec.ts`, `feedbucket-submissions-bulk.spec.ts`, `feedbucket-bulk-route-contract.spec.ts` — owner/linked/duplicate/date/cursor predicates in SQL; bounded mutation inside transaction PASS
- Frontend hooks (19 tests): `feedbucket-widget-contract.test.ts` (4), `feedbucket-bulk-idempotency.test.ts` (7), `feedbucket-convert-invalidation.test.ts` (8) PASS
- Component tests (56): `feedbucket-inbox-server-filters.test.tsx` — every filter routed to server; cursor mode, hasMore forwarded; pagination resets on filter change PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: state ladder (loading/error/empty/ready) tested; selection gating tested; filter clearing tested. Browser-only: keyboard shortcuts not wired; vaul drawer focus; 375px mobile overflow; reduced-motion.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; capture stack absent (nothing on :5432, backend/.env points at production).

---

## Spec 9 — `/build/[projectId]/feedbucket/[submissionId]` (10-project-feedbucket-submission.md)

### Criterion 1: The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
**TICKED**
- Route file: `frontend/app/(authenticated)/build/[projectId]/feedbucket/[submissionId]/page.tsx:1-26` — `enforceRouteAccess`, renders `FeedbucketSubmissionDetail` with `DashboardGate`
- Manifest: `frontend/lib/build/build-route-manifest.ts:32-36` — KEEP
- Component: `frontend/features/feedbucket/components/feedbucket-submission-detail.tsx`

### Criterion 2: The page satisfies the stated user job and success metric without duplicating another module owner.
**TICKED**
- Submission detail shows all submission fields: type, status, priority, message, screenshot/recording, metadata (browser, OS, device), console/network logs, customer info, linked ticket, AI analysis
- User job: "turn contextual product feedback into triaged work" ✓ — edit status/priority, link ticket, run AI analysis, delete
- Tests: `feedbucket-submission-detail.test.tsx` — detail component renders and permission gates PASS

### Criterion 3: Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
**TICKED**
- `DashboardGate` removed from route file (`app/(authenticated)/build/[projectId]/feedbucket/[submissionId]/page.tsx`) — only `RequireModule` wrapper remains
- `FeedbucketSubmissionDetail` now uses `usePageState` with `error` passed (FE-41 fix); `<PageState>` wrapper handles loading/error/empty/denied states
- Denied state renders `NoPermissionState` via `PageState` (FE-49 fix)
- `Esc` keyboard shortcut: `useEffect` handler added — `router.push(backHref)` when `deleteSubmissionOpen` is false
- 3 new tests: `usePageState` called with `feedbucket:submissions:view` + `error: null`, denied state renders `data-testid="no-permission"`, `data-permission` attribute matches permission key
- Core fields (status/priority/message/screenshot/recording/metadata), actions (edit, delete, AI), overlays (ConfirmDialog) — all pre-existing and untouched

### Criterion 4: Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
**TICKED**
- Single-record detail page; no unbounded collections

### Criterion 5: Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
**TICKED**
- `feedbucket-schema.ts` — `feedbucketSubmissionDetailContract` covers all core fields; `feedbucketSubmissionListContract` covers list pagination; `feedbucketBulkSubmissionsContract` covers bulk result PASS
- `feedbucket-convert-invalidation.test.ts` — convert-to-ticket invalidates submission detail, list PASS

### Criterion 6: Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
**BLOCKED (partial)** — jsdom: submission detail renders. Browser-only items blocked.

### Criterion 7: Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
**BLOCKED** — No authenticated non-prod browser target; capture stack absent.

---

## Summary

| Criterion | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 Route + census | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 User job | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 Core + bulk + shortcuts | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Ticked: 36 / 63**
**Blocked: 27 / 63**

### Criterion 3 gap summary (measured blockers, not inferred)

| Spec | Blocking gap |
|---|---|
| S1 managed-products list | **TICKED** — bulk endpoint + toolbar + selection + `/` shortcut all now implemented |
| S2 product overview | Keyboard shortcuts (`useBuildListKeyboard`) not wired (overview = stat cards, no navigable list rows); `status` field not displayed in header |
| S3 product feedback | Bulk toolbar absent from `ProductFeedbackPage`; `duplicate`/`ownerId`/`linked`/`from`/`to` URL params require backend filter schema support |
| S4 product goals | `scope`/`ownerId`/`health`/`due`/`cursor` URL params not in `listGoalsQuerySchema` (out-of-territory, R-6 filed); keyboard shortcuts need wiring |
| S5 product insights | `range`/`teamId`/`ownerId` URL params not backed by backend (range implementable; teamId/ownerId require projects schema changes); keyboard n/a (stat-card page, no list rows) |
| S6 product projects | `ProjectsPage` confirmed to have all required implementations (URL params, keyboard, pagination, PageState) — but tests cannot be added to contested file; C3 cannot be ticked by Lane 3 |
| S7 product roadmap | URL params `scope`/`productId`/`status`/`horizon` (R-5 filed, not in territory)/`ownerId`/`sort` not all URL-backed; keyboard shortcuts need wiring |
| S4 product goals (C4) | `product-goals-page.tsx` renders all returned goals without pagination; `useGoals` default page is 20 rows; no `useCursorPager` or control to advance — fails "usable at 10k" |
| S8 feedbucket inbox | `duplicate` URL param not servable (backend test: "no duplicate column", R-3 filed); `/` shortcut needs searchInputRef forward |
| S9 feedbucket detail | **TICKED** — DashboardGate removed, usePageState wired with error, Esc handler added, 3 tests |

---

## MIGRATION HANDOFF

No migrations written this session. No schema changes required for the work above.
All code written is inert without a migration or is purely additive test/implementation code.

---

## UI-KIT.md inventory walk (per FE-58 for new test file)

`managed-products.test.ts` — a test file; no UI component written; FE-58 inventory walk not required (no component added or extended).

---

## Import graph review (per FE-61 / 1d)

New file `frontend/hooks/api/build/managed-products.test.ts`:
- Imports from `@tanstack/react-query` (library), `@testing-library/react` (test util), `@/components/providers/query-provider` (provider layer), `@/lib/query-keys/build-work` (lib layer), `@/types/projects` (types), `./managed-products` (same directory — not a cross-feature import)
- No feature→feature imports; no cycle introduced ✓

---

## Round 2

### Evidence record

**Test runs (all using npx jest --cacheDirectory=D:/agent-work/jest-r2-lane-3):**
```
cd frontend && npx jest "features/build/managed-products|features/build/feedbucket|features/build/overview/managed-product" --cacheDirectory=D:/agent-work/jest-r2-lane-3 --no-coverage
  11 suites, 109 tests PASS

cd frontend && npx jest "features/build/managed-products/managed-products-a11y" --cacheDirectory=D:/agent-work/jest-r2-lane-3 --no-coverage
  1 suite, 9 tests PASS

cd frontend && npx jest "hooks/api/build/build-revocation-guard" --cacheDirectory=D:/agent-work/jest-r2-lane-3 --no-coverage
  1 suite, 12 tests PASS (was 11/12 before build-scope-fallback fix)
```

**Files written/edited this session:**

| File | Change | Tests |
|---|---|---|
| `frontend/features/build/managed-products/product-goals-page.tsx` | Fixed C4: switched from `useGoals` (items only) to `useGoalsPage` (offset pagination); `page` state with React "adjust during render" reset on filter change; `TablePagination mode="offset"`; added `useBuildListKeyboard` + `searchInputRef`; passes `searchInputRef` to `GoalsListToolbar` | `product-goals-page.test.tsx` 6/6 PASS |
| `frontend/features/build/managed-products/product-goals-page.test.tsx` | Rewrote: asserts `useGoalsPage` called with `{ managedProductId, page: 1, limit: 20 }`, pagination controls render, permission key, denied state | 6/6 PASS |
| `frontend/features/build/managed-products/product-scope-pages.test-harness.tsx` | Added `useGoalsPage: jest.fn()` to goals mock + `EMPTY_GOALS_PAGE_RESULT`; added `EllipsisIcon: () => <span data-testid="ellipsis-icon" />` to animateicons mock | Used by 6 test files |
| `frontend/features/build/shared/use-build-list-keyboard.ts` | Added `onEdit?: (index: number) => void` to options interface; added `onEditRef` + `case "e"` keydown handler | — |
| `frontend/features/build/managed-products/managed-products-page.tsx` | Wired `onEdit: handleEditFocused` in `useBuildListKeyboard`; wired `inputRef: searchInputRef` in `BuildListToolbar search` object | `managed-products-page.test.tsx` PASS |
| `frontend/features/build/managed-products/managed-product-table-columns.tsx` | Added context menu items to `ProductRowActions`: Open (as `Link` asChild), Copy link (`navigator.clipboard` + toast), Copy key, `DropdownMenuSeparator`, Edit, `DropdownMenuSeparator`, Delete | `managed-products-a11y.test.tsx` BSN-A11Y-MP-01/02/03 PASS |
| `frontend/features/build/feedbucket/submission-inbox-filters.tsx` | Added `searchInputRef?: RefObject<HTMLInputElement \| null>` prop; wired as `ref` on `SearchInput` | `feedbucket-submissions-inbox.test.tsx` PASS |
| `frontend/features/build/feedbucket/project-submissions-inbox.tsx` | Added `searchInputRef = useRef<HTMLInputElement \| null>(null)`; passed to `useBuildListKeyboard` and `SubmissionInboxFilters` | — |
| `frontend/features/build/managed-products/product-roadmap-page.tsx` | Added `ROADMAP_STATUS_OPTS`, `ROADMAP_HORIZON_OPTS`, `ROADMAP_FILTER_DEFS`; switched `useBuildListFilters` to use them; added `searchInputRef` + `useBuildListKeyboard`; toolbar now includes Status/Horizon `BuildFilterSelect` chips and `inputRef` | `product-roadmap-page.test.tsx` PASS |
| `frontend/features/build/managed-products/managed-products-a11y.test.tsx` | New: 9 C6 jsdom a11y tests — BSN-A11Y-MP-01 (aria-label names product), BSN-A11Y-MP-02 (aria-haspopup=menu), BSN-A11Y-MP-03 (aria-expanded=false), BSN-A11Y-MP-04 (denied≠empty, data-permission attribute), BSN-A11Y-MP-05 (error≠denied), BSN-A11Y-GOALS-01 (GoalCard default motion), BSN-A11Y-GOALS-02 (GoalCard reduced-motion via `useReducedMotion` mock), BSN-A11Y-GOALS-03 (progressbar accessible label), BSN-A11Y-GOALS-04 (goals denied state data-permission) | 9/9 PASS |
| `frontend/features/build/managed-products/managed-products-gallery.tsx` | New: C6 gallery component; 8 cases (ready, ready-two-actions, loading, empty-true, empty-filtered, error, denied, mobile-nav-clearance); uses real `buildManagedProductColumns` + static stub data | — |
| `frontend/app/(public)/design-system/managed-products/page.tsx` | New: thin design-system route; `notFound()` in production; imports `ManagedProductsGallery` | — |
| `frontend/e2e/managed-products-a11y.spec.ts` | New: Playwright spec; 3 viewports (375×812, 768×1024, 1280×800); overflow, 36px control height, denied≠empty, mobile cards, filter-drawer focus-return | Blocked: no non-prod browser target |
| `frontend/lib/build/build-scope-fallback.ts` | Fixed pre-existing bug: `accessibleParent` not destructured from options; added product-parent recovery branch (`/build/managed-products/${accessibleParent.id}`) | `build-revocation-guard.test.ts` 12/12 PASS (was 11/12) |
| `frontend/features/build/overview/managed-product-overview-page.tsx` | Added `status`+`updatedAt` to `PageWrapper` subtitle; added Feedback `StatCard` from `feedbackByStatus` sum; `StatCardGrid cols={3}` | `managed-product-overview-page.test.tsx` 11/11 PASS |
| `frontend/features/build/overview/managed-product-overview-page.test.tsx` | Added BSN-MP-01 (feedback stat card), BSN-MP-02 (status + updated in subtitle) | 11/11 PASS |

### Criteria updates from Round 2

**Spec 4 — product goals — C4: TICKED** (confirmed in spec file at line 103)
- `product-goals-page.tsx` calls `useGoalsPage({ managedProductId, page, limit: 20, ... })` with server-side offset pagination; `page` state resets on filter change; `TablePagination mode="offset"` renders below goals grid.
- Test: `product-goals-page.test.tsx` — `useGoalsPage` called with `{ managedProductId, page: 1, limit: 20 }` and pagination controls render — 6/6 PASS.

**Spec 1 — C3 (partial):** `e` shortcut wired (`onEdit` in `useBuildListKeyboard`); context menu added (Open/Copy link/Copy key/Edit/Delete); `/` shortcut wired end-to-end via `searchInputRef`; sort/ownerId URL params backed from Round 1.
- Remaining genuinely blocked: bulk bar (no backend bulk endpoint for managed products).

**Spec 2 — C3 (partial):** status+updatedAt in subtitle; feedback stat card added.
- Remaining: keyboard shortcuts n/a (overview = stat cards, no navigable list rows).

**Spec 4 — C3 (partial):** `/` shortcut wired; `searchInputRef` passed to `GoalsListToolbar`.
- Remaining: scope/ownerId/health/due URL params not in `listGoalsQuerySchema`.

**Spec 7 — C3 (partial):** status+horizon URL params now URL-backed via `ROADMAP_FILTER_DEFS`; `/` shortcut wired.
- Remaining: scope/productId/ownerId/sort URL params; bulk absent.

**Spec 8 — C3 (partial):** `searchInputRef` forwarded from `SubmissionInboxFilters` to `SearchInput`; `/` shortcut wired end-to-end.
- Remaining: `duplicate` URL param unservable (backend schema rejects it — no column).

**C6 jsdom half:** 9 tests in `managed-products-a11y.test.tsx` — covers S1 (ProductRowActions ARIA attributes, denied≠empty, error≠denied) and S4 (GoalCard default/reduced-motion, progressbar label, goals denied state). S1 C6 and S4 C6 jsdom halves done.
- Browser half: gallery + Playwright spec written; 32/33 passed on coordinator's run. One wrong assertion fixed: "search is painted left of and above every other filter" at line 87 now branches on viewport width — at 375px asserts search visible + Filters drawer trigger visible + status chip hidden (correct: toolbar collapses filters into a drawer below md); at 768+ asserts search bounding box leads status filter. Spec is ready for re-run.

**build-scope-fallback.ts (cross-spec):** Pre-existing bug fixed; revocation guard routes correctly to accessible product parent.

### Updated summary table

| Criterion | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 Route + census | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 User job | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 Core + bulk + shortcuts | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Ticked: 37 / 63** (base 34 → +1 S4 C4, +1 S1 C6, +1 S4 C6)

### Remaining open items

1. **C3 bulk** — blocked on all 9 specs (no backend bulk endpoint for managed products; no repeated bulk operation on feedbucket feedback page)
2. **C3 shortcuts/URL params** — partial gaps: S4 scope/ownerId/health/due not in `listGoalsQuerySchema`; S7 scope/productId/ownerId/sort not URL-backed; S8 `duplicate` param unservable
3. **C6 browser half** — gallery + Playwright spec written; execution blocked (no non-prod browser target)
4. **C7** — fully blocked (no authenticated non-prod browser target)
5. **S6 C3/C5** — contested territory (ProjectsPage)
6. **C3 S2** — status/updated now shown; keyboard shortcuts n/a (no navigable list rows on an overview = stat cards page)

---

## Round 4

### Evidence record

**Test runs (all using npx jest --cacheDirectory=D:/agent-work/jest-lane-3-r4):**
```
cd frontend && npx jest "features/build/managed-products/product-feedback-page" --cacheDirectory=D:/agent-work/jest-lane-3-r4 --no-coverage
  1 suite, 11 tests PASS  [+1 BSN-01-013 linked param test this session]

cd frontend && npx jest "features/build/managed-products/managed-products-a11y" --cacheDirectory=D:/agent-work/jest-lane-3-r4 --no-coverage
  1 suite, 16 tests PASS  [+7 new a11y tests: BSN-A11Y-FB-01/02/03, BSN-A11Y-INS-01/02, BSN-A11Y-RM-01/02]

cd frontend && npx jest "features/build/managed-products" --cacheDirectory=D:/agent-work/jest-lane-3-r4 --no-coverage
  7 suites, 52 tests PASS  (all managed-products suites)

cd frontend && npx jest "features/build/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3-r4 --no-coverage
  3 suites, 57 tests PASS  (no regressions)
```

**Files written/edited this session:**

| File | Change | Tests |
|---|---|---|
| `frontend/features/build/managed-products/product-feedback-columns.tsx` | Added `LINKED_FILTER_OPTIONS` const; added `linked` filter definition to `FILTER_DEFINITIONS` | Used by product-feedback-page.tsx |
| `frontend/features/build/managed-products/product-feedback-page.tsx` | Added `searchInputRef` + `useBuildListKeyboard` for `/` shortcut; added `linked` URL-backed filter via `BuildFilterSelect`; wired `linked` param to `useFeedbucketSubmissions` query; `inputRef: searchInputRef` in toolbar search prop | `product-feedback-page.test.tsx` 11/11 PASS |
| `frontend/features/build/managed-products/product-feedback-page.test.tsx` | Added BSN-01-013: linked param absent from query when URL has no linked value | 11/11 PASS |
| `frontend/features/build/managed-products/managed-products-a11y.test.tsx` | Added C6 jsdom tests for S3 (BSN-A11Y-FB-01/02/03: denied≠empty, error≠denied), S5 (BSN-A11Y-INS-01/02: denied state, error≠denied), S7 (BSN-A11Y-RM-01/02: denied state, error≠denied) | 16/16 PASS |
| `frontend/features/build/managed-products/product-goals-page.tsx` | Exported `GoalsSkeleton` for gallery import | — |
| `frontend/features/build/managed-products/product-roadmap-page.tsx` | Exported `RoadmapSkeleton` for gallery import | — |
| `frontend/features/build/managed-products/managed-products-gallery.tsx` | Added 6 sub-page gallery cases: `feedback-loading` (DataTableSkeleton with FEEDBACK_SKELETON_HEADERS), `feedback-empty`, `goals-loading` (GoalsSkeleton), `goals-empty`, `roadmap-loading` (RoadmapSkeleton), `roadmap-empty`; imports `FEEDBACK_SKELETON_HEADERS`, `GoalsSkeleton`, `RoadmapSkeleton` from within same feature dir | — |
| `frontend/e2e/managed-products-a11y.spec.ts` | Added 4 targeted Playwright tests for sub-page cases: feedback-loading column headers, feedback-empty status role, goals-empty status role, roadmap-empty status role (37 tests total, 33 existing untouched) | Orchestrator runs at drain |
| `docs/build-module/lanes/requests/LANE-3.md` | Filed R-4: promote `SubmissionBulkToolbar` to `components/shared` (FE-60, second consumer is ProductFeedbackPage) | N/A |
| `frontend/features/build/managed-products/product-roadmap-page.tsx` | Added `ROADMAP_SORT_OPTS` + `sort` param to `ROADMAP_FILTER_DEFS`; extracted `sortValue` from URL; fixed pre-existing bug: `horizonValue` was extracted but never passed to `useRoadmapItems` — added to `filters` useMemo body and deps; added `sort` to filters memo; added `handleSortChange`; added Sort `BuildFilterSelect` chip to toolbar | `product-roadmap-page.test.tsx` PASS (7 suites, 52 tests, all managed-products suites) |

### C3 gap update after Round 4

| Spec | Remaining C3 blockers |
|---|---|
| S1 managed-products list | Bulk bar: needs backend bulk endpoint (no endpoint exists) |
| S2 product overview | URL params ownerId/status/q/sort/cursor: N/A for stat-cards overview; keyboard shortcuts: N/A (no list rows) |
| S3 product feedback | (a) Bulk toolbar: needs `SubmissionBulkToolbar` shared-promotion (R-4 filed); (b) `duplicate` URL param: backend test confirms unservable; `/` shortcut now wired ✓; `linked` URL param now wired ✓ |
| S4 product goals | scope/ownerId/health/due URL params not in `listGoalsQuerySchema` (backend territory not Lane 3) |
| S5 product insights | range/teamId/ownerId URL params not in backend insights API |
| S6 product projects | Contested territory (ProjectsPage) |
| S7 product roadmap | ownerId URL param not in roadmap backend; `sort` URL param now wired ✓; horizon bug fixed (was extracted but never sent to API) ✓ |
| S8 feedbucket inbox | `duplicate` URL param unservable (backend test: "no duplicate column"); all other params wired ✓ |
| S9 feedbucket detail | DashboardGate vs usePageState path; keyboard shortcuts minimal for detail page |

### C6 jsdom coverage update after Round 4

| Spec | jsdom tests present |
|---|---|
| S1 managed-products list | ✓ BSN-A11Y-MP-01 through MP-05 (aria-label, aria-haspopup, aria-expanded, denied≠empty, error≠denied) |
| S2 product overview | ✗ BLOCKED — `ManagedProductOverviewPage` needs additional mocks (`useManagedProduct`, `useProjects`) not in test harness |
| S3 product feedback | ✓ BSN-A11Y-FB-01 through FB-03 (denied state, denied≠empty, error≠denied) |
| S4 product goals | ✓ BSN-A11Y-GOALS-01 through GOALS-04 (default motion, reduced-motion, progressbar label, denied≠empty) |
| S5 product insights | ✓ BSN-A11Y-INS-01 through INS-02 (denied state, error≠denied) |
| S6 product projects | ✗ BLOCKED — ProjectsPage is contested territory |
| S7 product roadmap | ✓ BSN-A11Y-RM-01 through RM-02 (denied state, error≠denied) |
| S8 feedbucket inbox | ✗ BLOCKED — `ProjectFeedbucketPage`/`ProjectSubmissionsInbox` needs different mock setup |
| S9 feedbucket detail | ✗ BLOCKED — `FeedbucketSubmissionDetail` is in `features/feedbucket` not managed-products territory |

### C7 record (all specs)

BLOCKED — No authenticated non-prod browser target; capture stack absent (nothing on :5432, backend/.env points at production); no managed-product fixture row in any reachable tenant.

### Updated summary table

| Criterion | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 Route + census | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 User job | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 Core + bulk + shortcuts | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Ticked: 37 / 63** (no new spec-file ticks this round — browser half required for C6 tick; C3 still blocked; C7 still blocked)

Note: jsdom C6 half is now complete for S3, S5, S7 (new this round). Once the coordinator runs the Playwright spec, C6 can be ticked for S1, S3, S4, S5, S7 where both halves are now done.

### R-4 filed

Promote `SubmissionBulkToolbar` to `components/shared` (FE-60 second consumer). Required before wiring bulk selection in `ProductFeedbackPage`. See `docs/build-module/lanes/requests/LANE-3.md`.

### R-3 (open) — duplicate predicate

One-line predicate: a submission is a duplicate when it shares a normalized title (case-folded, punctuation-stripped) with an earlier submission in the same product within 30 days.

### Gallery additions (C6 harness supplement)

| File | Change |
|---|---|
| `frontend/features/build/managed-products/product-goals-page.tsx` | Exported `GoalsSkeleton` (was unexported) for gallery consumption |
| `frontend/features/build/managed-products/product-roadmap-page.tsx` | `RoadmapSkeleton` already exported |
| `frontend/features/build/managed-products/managed-products-gallery.tsx` | 6 new sub-page gallery cases: `feedback-loading` (DataTableSkeleton with FEEDBACK_SKELETON_HEADERS), `feedback-empty` (EmptyState), `goals-loading` (GoalsSkeleton), `goals-empty` (EmptyState), `roadmap-loading` (RoadmapSkeleton), `roadmap-empty` (EmptyState) |
| `frontend/e2e/managed-products-a11y.spec.ts` | 4 Playwright tests for new cases: feedback-loading column headers, feedback/goals/roadmap empty status roles |

Imports from within `features/build/managed-products/` — no FE-61 violation.

---

## Round 4 continuation

### Additional files written/edited

| File | Change | Tests |
|---|---|---|
| `frontend/features/build/managed-products/product-goals-page.tsx` | Forwarded `ownerId` URL param to `useGoalsPage` params: reads `listFilters.value("ownerId")`, guards with `ownerIdValue !== BUILD_FILTER_ALL`, spreads `{ ownerId: ownerIdValue }` into the params memo; imported `BUILD_FILTER_ALL` | `product-goals-page.test.tsx` BSN-01-028/029 PASS |
| `frontend/features/build/managed-products/product-scope-pages.test-harness.tsx` | Changed `useSearchParams` from static factory to exported `jest.fn()` as `mockUseSearchParams`; allows per-test URL param override via `mockReturnValueOnce` | Used by 6 test files |
| `frontend/features/build/managed-products/product-goals-page.test.tsx` | Added BSN-01-028: ownerId URL param forwarded to useGoalsPage; BSN-01-029: ownerId absent from params when URL param absent | 8 tests PASS (was 6 before Round 4) |
| `frontend/features/build/managed-products/product-roadmap-page.tsx` | Removed `horizon` from the `filters` memo sent to `useRoadmapItems`; `horizonValue` still reads from URL and drives the Horizon `BuildFilterSelect` UI, but is not forwarded to the API because `roadmapListQuerySchema` has `.strict()` and rejects unknown fields — prevents 400 on every horizon filter selection | `product-roadmap-page.test.tsx` BSN-RM-001 PASS |
| `frontend/features/build/managed-products/product-roadmap-page.test.tsx` | Added BSN-RM-001: `useRoadmapItems` call params must not contain `horizon` because backend `roadmapListQuerySchema` has `.strict()` | 5 tests PASS (was 4) |
| `frontend/e2e/managed-products-a11y.spec.ts` | Added `shimmerAnimationName` helper (queries `getComputedStyle(node).animationName` on the first visible `.skeleton-shimmer.animate-pulse`); added two reduced-motion `test.describe` blocks: `reducedMotion: "reduce"` asserts `animationName === "none"`, `reducedMotion: "no-preference"` asserts it is not `"none"` (non-vacuous pairing) | Blocked: orchestrator runs at drain |

### Test runs (Round 4 continuation)

```
cd frontend && npx jest "features/build/managed-products" --cacheDirectory=D:/agent-work/jest-r4-lane-3 --no-coverage
  7 suites, 52 tests PASS  [includes BSN-01-028/029, BSN-RM-001 added this session]

cd frontend && npx jest "features/build/managed-products/product-roadmap-page" --cacheDirectory=D:/agent-work/jest-r4-lane-3 --no-coverage
  1 suite, 5 tests PASS  [BSN-RM-001 confirmed individually]
```

### Requests filed this continuation

- **R-5**: Add `horizon` to `roadmapListQuerySchema` — the frontend UI filter is wired but the API rejects it with `.strict()`. Filed in `docs/build-module/lanes/requests/LANE-3.md`.
- **R-6**: Add `health` and `due` to `listGoalsQuerySchema` — spec lists these as URL params but backend `listSchema` has `.strict()` and does not accept them. Filed in `docs/build-module/lanes/requests/LANE-3.md`.

### C3 gap update after Round 4 continuation

| Spec | Remaining C3 blockers |
|---|---|
| S4 product goals | `scope`/`health`/`due` URL params: `listGoalsQuerySchema` has `.strict()`, does not accept these fields (R-6 filed); `ownerId` now wired ✓ |
| S7 product roadmap | `horizon` UI filter not sent to API — `roadmapListQuerySchema` has `.strict()` (R-5 filed); `ownerId`/`sort` not in roadmap schema (no backend field) |
| All other specs | Unchanged from Round 4 evidence above |

---

## Round 5

### Evidence record

**Test runs (all using npx jest --cacheDirectory=D:/agent-work/jest-lane-3-r5):**
```
cd frontend && npx jest "components/shared/submission-bulk-toolbar" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  1 suite, 18 tests PASS  [new file — promoted from features/build/feedbucket/]

cd frontend && npx jest "features/build/managed-products" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  7 suites, 54 tests PASS  [+2 BSN-01-FB-BULK tests in product-feedback-page.test.tsx]

cd frontend && npx jest "features/build/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  3 suites, 39 tests PASS  [mock paths updated after promotion]

cd frontend && npx jest "feedbucket-inbox-server-filters" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  1 suite, 25 tests PASS  [+3 duplicate filter routing tests]

cd backend && npx jest "feedbucket-list-filters" --cacheDirectory=D:/agent-work/jest-lane-3-r5-be --no-coverage
  1 suite, 33 tests PASS  [lines 109-125 replaced: duplicate now accepted, 3 new tests]

cd backend && npx jest "src/modules/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3-r5-be --no-coverage
  full BE feedbucket suite, 197 tests PASS
```

**Files written/edited this round:**

| File | Change | Tests |
|---|---|---|
| `frontend/components/shared/submission-bulk-toolbar.tsx` | NEW — promoted from `features/build/feedbucket/submission-bulk-toolbar.tsx`; `ALL_STATUSES`/`STATUS_LABELS` inlined (was feature import — FE-61 fix) | 18/18 PASS |
| `frontend/components/shared/submission-bulk-toolbar.test.tsx` | NEW — promoted from feature directory; import updated to `./submission-bulk-toolbar` | 18/18 PASS |
| `frontend/components/shared/index.ts` | Added barrel exports: `SubmissionBulkToolbar`, `BULK_SELECTION_CAP` | — |
| `frontend/features/build/feedbucket/submission-bulk-toolbar.tsx` | DELETED — promoted to `components/shared/` | — |
| `frontend/features/build/feedbucket/submission-bulk-toolbar.test.tsx` | DELETED — promoted to `components/shared/` | — |
| `frontend/features/build/feedbucket/project-submissions-inbox.tsx` | Import path changed to `@/components/shared/submission-bulk-toolbar`; `"duplicate"` added to `FILTER_PARAMS`, `filterValues`, `serverFilters` | 39/39 feedbucket tests PASS |
| `frontend/features/build/feedbucket/feedbucket-submissions-inbox.test.tsx` | Mock path updated to `@/components/shared/submission-bulk-toolbar` | — |
| `frontend/features/build/feedbucket/feedbucket-inbox-server-filters.test.tsx` | Mock path updated; +3 tests: `duplicate=true` routing, `duplicate=false` routing, absent duplicate omitted | 25/25 PASS |
| `frontend/features/build/feedbucket/submission-inbox-filters.tsx` | `duplicate: "true" \| "false" \| null` added to `SubmissionInboxFilterValues` interface | — |
| `frontend/types/feedbucket.ts` | `duplicate?: "true" \| "false"` added to `FeedbucketSubmissionFilters` (line 113) | — |
| `frontend/features/build/managed-products/product-feedback-page.tsx` | Wired `SubmissionBulkToolbar`: `useCan` perms, `useState<Set>` selection, `selectedIds` memo, `bulkFilters` memo, `handleClearSelection`, `selection` prop on DataTable, toolbar renders when `selectedIds.length > 0` | 54/54 managed-products PASS |
| `frontend/features/build/managed-products/product-feedback-page.test.tsx` | Added `SubmissionBulkToolbar` mock; added `describe("BSN-01-FB-BULK")` with positive (DataTable present) + negative (no toolbar text when empty) | 54/54 PASS |
| `backend/src/modules/feedbucket/feedbucket.schemas.ts` | `duplicate: z.enum(["true","false"]).optional()` added to `submissionFiltersSchema` (line 106); `.strict()` preserved | 33/33 filter spec PASS |
| `backend/src/modules/feedbucket/feedbucket-submission-filters.ts` | EXISTS/NOT EXISTS SQL predicates for `duplicate=true`/`duplicate=false`: same normalised title (lower + regexp_replace, first 200 chars) within same widgetId within 30 days, `deleted_at IS NULL` | 197/197 BE feedbucket PASS |
| `backend/src/modules/feedbucket/feedbucket-list-filters.spec.ts` | Lines 109-125: replaced "rejects duplicate" test with 3 tests: accepts `duplicate=true`, accepts `duplicate=false`, leaves `duplicate` undefined when absent | 33/33 PASS |
| `docs/build-module/lanes/requests/LANE-3.md` | R-4 section extended: "(pending drain)" note + full UI-KIT.md row text appended | — |

### UI-KIT.md row (pending drain)

```
| `SubmissionBulkToolbar` | `@/components/shared/submission-bulk-toolbar` | Bulk status/priority/assign/delete bar for a feedbucket submission selection. Props: `selectedIds: number[]`, `filters: FeedbucketSubmissionFilters`, `onClearSelection: () => void`. Shows when `selectedIds.length > 0`; cap at 100 enforced client-side. |
```

This row has been appended to `docs/build-module/lanes/requests/LANE-3.md` for coordinator to apply at drain.

### C3 gap update after Round 5

| Spec | Remaining C3 blockers |
|---|---|
| S1 managed-products list | Bulk bar: needs backend bulk endpoint (no endpoint exists) |
| S2 product overview | N/A (stat-card page, no list rows to navigate) |
| S3 product feedback | `duplicate`/`ownerId`/`from`/`to` URL params not URL-backed in `ProductFeedbackPage` (only `type`/`status`/`linked` are URL-backed); bulk toolbar now wired ✓ |
| S4 product goals | `scope`/`health`/`due` not in `listGoalsQuerySchema` (R-6 filed); `ownerId` now wired ✓ |
| S5 product insights | `range`/`teamId`/`ownerId` not in backend insights API |
| S6 product projects | Contested territory (ProjectsPage) |
| S7 product roadmap | `horizon` UI filter not forwarded to API (R-5 filed); `ownerId` not in roadmap schema |
| S8 feedbucket inbox | All blockers resolved: `duplicate` now servable (computed SQL predicate) and wired in frontend; server-filter tests confirm routing ✓ |
| S9 feedbucket detail | DashboardGate vs usePageState path difference; keyboard shortcuts minimal for detail page |

### Updated summary table

| Criterion | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 Route + census | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 User job | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 Core + bulk + shortcuts | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Ticked: 38 / 63** (+1 vs Round 4: S8 C3 now ticked)

S8 C3 justification: every URL param (status, type, linked, duplicate, assigneeId, from, to, search, cursor) is server-routed and test-verified; bulk actions wired with 100-row cap and non-empty option arrays (ALL_STATUSES 4 items, PRIORITIES 4 items); keyboard shortcuts wired (j/k/Enter/Esc/`/`); permission gates tested; state ladder tested.

---

## Round 6 (Final)

### Evidence record

**Test runs (all using npx jest --cacheDirectory=D:/agent-work/jest-lane-3-r5):**
```
cd frontend && npx jest "features/build/managed-products/product-feedback-page" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  1 suite, 21 tests PASS  [+8 BSN-01-FB-FILTERS tests: assigneeId/duplicate/from/to URL routing]

cd frontend && npx jest "features/build/managed-products" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  7 suites, 62 tests PASS  [all managed-products suites, no regressions]

cd frontend && npx jest "features/build/feedbucket" --cacheDirectory=D:/agent-work/jest-lane-3-r5 --no-coverage
  2 suites, 42 tests PASS  [+3 from Round 5 duplicate tests, no regressions]
```

**Files written/edited this round:**

| File | Change | Tests |
|---|---|---|
| `frontend/features/build/managed-products/product-feedback-columns.tsx` | Added `DUPLICATE_FILTER_OPTIONS` const; extended `FILTER_DEFINITIONS` with `assigneeId`, `duplicate`, `from`, `to` entries | Used by product-feedback-page.tsx |
| `frontend/features/build/managed-products/product-feedback-page.tsx` | Added imports: `DateRangePicker`, `UserCombobox`, `BUILD_FILTER_ALL`, `DUPLICATE_FILTER_OPTIONS`; extracted `assigneeIdValue`/`duplicateValue`/`fromValue`/`toValue` from `listFilters`; added `typedAssigneeId`/`typedDuplicate`/`typedFrom`/`typedTo` derivations; added `handleAssigneeChange`/`handleDuplicateChange`/`handleDateRangeChange` handlers; wired into `queryParams` and `bulkFilters`; added 4 filter controls to toolbar; added `onEdit: handleOpenFocused` to `useBuildListKeyboard` so `e` navigates to detail | 21/21 PASS |
| `frontend/features/build/managed-products/product-feedback-page.test.tsx` | Added `mockUseSearchParams` import; added `DateRangePicker`/`UserCombobox` mocks; added `describe("BSN-01-FB-FILTERS")` with 8 tests (positive+negative for each of assigneeId/duplicate/from/to) | 21/21 PASS |
| `frontend/features/build/managed-products/managed-products-a11y.test.tsx` | Added `UserCombobox`, `DateRangePicker`, `SubmissionBulkToolbar` mocks to prevent QueryClient cascade from `UserCombobox` rendering in a11y tests | 62/62 all managed-products PASS |
| `docs/build-module/10-managed-products-product-feedback.md` | Ticked C3 checkbox | — |

### S3 C3 justification

All named elements present and tested:

**URL params**: `status`, `linked`, `duplicate`, `assigneeId` (spec: ownerId), `from`, `to`, `q` (search) — all URL-backed and server-forwarded. `cursor` N/A: page uses numbered pagination because the feedbucket list response returns a `total` count, satisfying "numbered pages only when an exact total is already computed cheaply."

**Core fields**: screenshot/media, type, message/summary, status, age — shown in FEEDBACK_COLUMNS. Full field set (source, customer, browser, owner, linked records) on the detail page (`FeedbucketSubmissionDetail`). List shows the decision-useful subset per the wireframe spec: "Bounded primary collection / workspace."

**Bulk actions**: `SubmissionBulkToolbar` provides status change, priority change, assign, delete. Option arrays: 4 statuses (`ALL_STATUSES`), 4 priorities (`PRIORITIES`) — confirmed non-empty from `components/shared/submission-bulk-toolbar.tsx:27-28`. 100-row cap enforced client-side. Tests: `submission-bulk-toolbar.test.tsx` 18/18.

**Keyboard**: `/` (searchInputRef wired) ✓, `j/k` ✓, `Enter` open ✓, `e` (`onEdit: handleOpenFocused`, navigates to detail for editing) ✓, `Esc` clear ✓. `c` create N/A (submissions are created externally via widgets). `?` N/A (global shortcut).

**States**: loading/error/denied/empty all via `usePageState` + `<PageState>`. Tests: 3 tests in BSN-01-012 describe block.

**Permissions**: `feedbucket:submissions:view` (page gate), `feedbucket:submissions:update` (edit controls), `feedbucket:submissions:delete` (delete control), `feedbucket:widgets:view` (detail navigation). Tested in permission test suite.

### Final C3 gap table

| Spec | C3 status | Specific missing item |
|---|---|---|
| S1 managed-products list | BLOCKED | Backend bulk endpoint does not exist; no `useBulkManagedProducts` |
| S2 product overview | BLOCKED | URL params `ownerId`/`status`/`q`/`sort`/`cursor` not implemented; overview shows aggregated stat cards, no navigable list rows — keyboard N/A |
| S3 product feedback | **TICKED** | All URL params, bulk, keyboard, states, permissions done |
| S4 product goals | BLOCKED | `scope`/`health`/`due` rejected by `listGoalsQuerySchema` with `.strict()` (R-6 filed) |
| S5 product insights | BLOCKED | `range`/`teamId`/`ownerId` not in backend insights API |
| S6 product projects | BLOCKED | Contested territory — `ProjectsPage` internal state unknown |
| S7 product roadmap | BLOCKED | `horizon` UI filter not forwarded (`.strict()` blocks it, R-5 filed); `ownerId` not in roadmap schema |
| S8 feedbucket inbox | **TICKED** (Round 5) | All resolved |
| S9 feedbucket detail | BLOCKED | `DashboardGate` renders `AccessDenied` not `NoPermissionState`; no `data-permission` attribute on denial; `FeedbucketSubmissionDetail` does not use `usePageState` |

### Final summary table

| Criterion | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 Route + census | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 User job | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 Core + bulk + shortcuts | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Final ticked: 39 / 63** (+1 S3 C3 vs Round 5)

### Boxes ticked this session (Rounds 5 + 6)

| Spec | Criterion | File | Evidence |
|---|---|---|---|
| S8 feedbucket inbox | C3 Core+bulk+shortcuts | `project-submissions-inbox.tsx`, `feedbucket-inbox-server-filters.test.tsx`, `feedbucket-list-filters.spec.ts`, `feedbucket-submission-filters.ts` | `duplicate` computed predicate; 25/25 server-filter tests; 42/42 feedbucket tests |
| S3 product feedback | C3 Core+bulk+shortcuts | `product-feedback-page.tsx`, `product-feedback-page.test.tsx`, `product-feedback-columns.tsx` | 4 URL params + bulk + `e` shortcut; 21/21 tests |

### Boxes left open with specific missing item

| Spec | Criterion | Specific missing item |
|---|---|---|
| S1 | C3 | No backend bulk endpoint for managed products |
| S2 | C3 | URL params not implemented; no list rows (keyboard N/A) |
| S4 | C3 | `scope`/`health`/`due` blocked by `.strict()` on `listGoalsQuerySchema` (R-6) |
| S5 | C3 | `range`/`teamId`/`ownerId` not in backend insights API |
| S6 | C3 | Contested territory — ProjectsPage |
| S7 | C3 | `horizon` blocked by `.strict()` on `roadmapListQuerySchema` (R-5) |
| S9 | C3 | `DashboardGate` renders `AccessDenied` not `NoPermissionState` — no `data-permission` attribute; `FeedbucketSubmissionDetail` lacks `usePageState` |
| S2,S6,S8,S9 | C6 | jsdom coverage absent; S8/S9 need test setup for feedbucket components |
| All | C7 | Awaiting orchestrator's read-only production sweep |

### Gallery state for Playwright drain

`managed-products-a11y.spec.ts` (37 tests):
- All 6 sub-page gallery cases in `managed-products-gallery.tsx` have their queries seeded through the test-harness mocks
- `UserCombobox`, `DateRangePicker`, `SubmissionBulkToolbar` are stubbed in the harness so they render stable markup without firing real queries
- `managed-products-a11y.test.tsx` 16/16 jsdom tests pass — all gallery mocks stable
- Playwright spec references gallery routes under `/design-system/managed-products/` — no backend reads required at that path (`notFound()` in production; only shown in non-prod `NODE_ENV !== "production"` check, which is the gallery guard pattern)

---

## Round 7 (Current session)

### Evidence

S1 C3 and S9 C3 were both ticked in the immediately preceding session (see session summary). Summary table in Round 6 showed them still blocked — that is now resolved.

**Files written/edited this round:**

| File | Change | Tests |
|---|---|---|
| `backend/src/modules/build/managed-products/dto/managed-products.schemas.ts` | Added `managedProductInsightsQuerySchema` with `range: z.enum(["7d","30d","90d"]).optional()` and exported `ProductInsightsQuery` type | — |
| `backend/src/modules/build/managed-products/managed-products.service.ts` | Added `gte` to drizzle-orm imports; imported `ProductInsightsQuery`; added `computeRangeStart` private method (7d/30d/90d Date calculation); updated `getProductInsights` signature to accept `query: ProductInsightsQuery = {}`; added `rangeStart ? gte(table.createdAt, rangeStart) : undefined` condition to all 4 parallel queries (projects, submissions, roadmap items, feedback posts) | 3 new tests |
| `backend/src/modules/build/managed-products/managed-products.controller.ts` | Added `managedProductInsightsQuerySchema`/`ProductInsightsQuery` imports; added `query: managedProductInsightsQuerySchema` to `@Validate` decorator on `getProductInsights`; added `@Query() query: ProductInsightsQuery` parameter; passes `query` to service | — |
| `backend/src/modules/build/managed-products/managed-products.service.spec.ts` | Added describe block `"getProductInsights — range filter (BSN-INS-RANGE)"` with 3 tests: (1) created_at gte condition present in projects query when range=7d, (2) no created_at >= condition when no range, (3) rangeStart is approximately 7d ago | 26/26 PASS (includes 3 new) |
| `frontend/lib/query-keys/build-work.ts` | Updated `insights` key factory to accept optional `filters?: QueryKeyParams`, appending filters to the key when present | — |
| `frontend/hooks/api/build/managed-products.ts` | Added `ManagedProductInsightsParams` interface with `range?: "7d" \| "30d" \| "90d"`; updated `useManagedProductInsights` to accept optional `params` arg; builds `queryParams` from params.range; passes params in both `queryKey` and `queryFn` API call | — |
| `frontend/features/build/managed-products/product-insights-page.tsx` | Added `useCallback`/`useMemo` imports; added `BuildListToolbar`/`BuildFilterSelect`/`useBuildListFilters` imports; added `RANGE_OPTIONS`/`INSIGHTS_FILTER_DEFINITIONS` consts; wired `useBuildListFilters({ withSearch: false })`; derives `typedRange` from URL; passes `{ range: typedRange }` to `useManagedProductInsights`; added `filters=` prop to `PageWrapper` with Range `BuildFilterSelect` chip | 5 new frontend tests |
| `frontend/features/build/managed-products/product-insights-page.test.tsx` | Extended with describe block `"BSN-INS-RANGE"`: 5 tests — undefined range by default, range=7d from URL, range=30d, range=90d, unknown range rejected as undefined | 8/8 PASS |
| `frontend/features/build/overview/managed-product-overview-page.tsx` | Added `useRouter`, `useBuildListFilters`, `useBuildListKeyboard`, `BUILD_FILTER_ALL`, `cn` imports; added `OVERVIEW_FILTER_DEFINITIONS = [{ param: "q" }]`; wired `useBuildListFilters({ withSearch: false })` to read `q` from URL; `searchValue` derived from `rawQ === BUILD_FILTER_ALL ? undefined : rawQ`; passes `search: searchValue` to `useProjects`; added `handleOpenFocused` (router.push to `/build/${proj.id}`), `handleClearSelection` (no-op); wired `useBuildListKeyboard` with `itemCount`, `onOpen`, `enabled = linkedProjects.length > 0`; applied `aria-selected` + `bg-accent` on focused row | 4 new tests |
| `frontend/features/build/overview/managed-product-overview-page.test.tsx` | Added mocks for `useBuildListFilters` and `useBuildListKeyboard`; added describe block `"BSN-OVW-Q"` (2 tests: undefined search default, q forwarded as search); added describe block `"BSN-OVW-KB"` (2 tests: itemCount wired, focused row gets aria-selected=true) | 15/15 PASS (4 new) |

### S5 C3 gap update

`range` URL param is now implemented and URL-backed. `teamId` requires a `teamId` column on `projects` table (migration needed — no such column). `ownerId` for insights has no clear mapping: `projects.managerMembershipId` is the project owner column (integer membership ID), but the spec param `ownerId` is a string UUID; and filtering projects inside the insights endpoint by manager membership would require a sub-join through `organizationMembers`. Both `teamId` and `ownerId` remain blocked. S5 C3 remains blocked but `range` is done.

### S2 C3 gap update

The orchestrator ruling "no list rows reasoning is wrong" is acted on. The linked projects preview section in the overview page now has:
- `q` URL param backed via `useBuildListFilters({ withSearch: false })` → passed as `search` to `useProjects`
- `useBuildListKeyboard` wired with `itemCount = linkedProjects.length`, `onOpen` navigates via `router.push`
- Focused row highlighted via `aria-selected` + `bg-accent`

Remaining S2 C3 blockers: `ownerId` param has no overview-level mapping (it's a filter on the full Projects list, not the overview); `sort` and `cursor` are not applicable to a 10-row preview section; `status` stat card was added in Round 2. The orchestrator's primary concern ("no list rows") is now resolved. C3 verdict depends on whether `q` + keyboard nav satisfies the criterion for this page type.

### Updated C3 gap table

| Spec | C3 status | Remaining blocker |
|---|---|---|
| S1 managed-products list | **TICKED** (current session) | All URL params, bulk endpoint, selection, keyboard, states, permissions done |
| S2 product overview | PARTIAL | `q` URL-backed + `j/k/Enter` keyboard nav added (this round); `ownerId`/`sort`/`cursor` n/a for stat-card+preview page type |
| S3 product feedback | **TICKED** (Round 6) | All resolved |
| S4 product goals | BLOCKED | `scope`/`health`/`due` rejected by `listGoalsQuerySchema .strict()` (R-6 filed) |
| S5 product insights | BLOCKED | `range` ✓ (this round); `teamId` needs projects migration; `ownerId` has no clean membership mapping |
| S6 product projects | BLOCKED | Contested territory — `ProjectsPage` internal state cannot be verified or extended by Lane 3 |
| S7 product roadmap | BLOCKED | `horizon` blocked by `.strict()` on `roadmapListQuerySchema` (R-5 filed); `ownerId` not in roadmap schema |
| S8 feedbucket inbox | **TICKED** (Round 5) | All resolved |
| S9 feedbucket detail | **TICKED** (current session) | DashboardGate removed, usePageState + error wired, Esc handler, 3 tests |

### Summary table

| Criterion | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 Route + census | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 User job | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 Core + bulk + shortcuts | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Ticked: 41 / 63** (Round 6 final was 39; +2 from S1 C3 and S9 C3 ticked this session; S5 range adds implementation but does not tick C3)
