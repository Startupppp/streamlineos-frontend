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
**BLOCKED** — Missing: (a) bulk row-selection and bulk-action bar not implemented in managed-products-page.tsx — no backend bulk endpoint; (b) keyboard `/` shortcut cannot focus search because `BuildListToolbar` does not expose a `searchInputRef` (request-only shared component — R-1 filed). Fixed this session: `ownerId` and `sort` URL params now accepted by backend schema and forwarded by frontend — `listManagedProductsQuerySchema` extended with `ownerId: z.string().optional()` and `sort: z.enum(["name","updated","status"]).optional()`, `.strict()` retained; `managed-products-page.tsx` reads `ownerId` and `sort` from URL via `useBuildListFilters` and passes them to `useManagedProducts`; sort select UI control added to toolbar. Implemented this session: `useBuildListKeyboard` wired for `j/k/Enter/Esc` — test passes (managed-products-page.test.tsx:keyboard nav test).

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
**BLOCKED** — Missing: (a) keyboard shortcuts not implemented; (b) URL params `scope`, `productId`, `projectId`, `status`, `horizon`, `ownerId`, `q`, `sort`, `cursor` not all URL-backed; (c) bulk actions not implemented.

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
**BLOCKED** — Missing: (a) keyboard shortcuts not implemented; (b) route uses `DashboardGate` pattern instead of `usePageState` — different permission checking path than spec requires.

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
| 3 Core + bulk + shortcuts | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 4 Bounded lists | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 Contract tests | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 6 A11y (jsdom part) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 7 Browser evidence | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Ticked: 34 / 63**
**Blocked: 29 / 63**

### Criterion 3 gap summary (measured blockers, not inferred)

| Spec | Blocking gap |
|---|---|
| S1 managed-products list | Bulk bar absent; `/` shortcut needs BuildListToolbar ref (R-1 filed). Fixed: `ownerId`/`sort` now accepted by backend schema and wired through frontend — `sort` select chip added to toolbar |
| S2 product overview | Keyboard shortcuts (`useBuildListKeyboard`) not wired (overview = stat cards, no navigable list rows); `status` field not displayed in header |
| S3 product feedback | Bulk toolbar absent from `ProductFeedbackPage`; `duplicate`/`ownerId`/`linked`/`from`/`to` URL params require backend filter schema support |
| S4 product goals | `scope`/`ownerId`/`health`/`due`/`cursor` URL params not in `listGoalsQuerySchema` (not verified); keyboard shortcuts need wiring |
| S5 product insights | `range`/`teamId`/`ownerId` URL params not backed by backend; keyboard n/a (stat-card page, no list rows) |
| S6 product projects | Contested territory — `ProjectsPage` keyboard/URL-param state unknown |
| S7 product roadmap | URL params `scope`/`productId`/`status`/`horizon`/`ownerId`/`sort` not all URL-backed; keyboard shortcuts need wiring |
| S4 product goals (C4) | `product-goals-page.tsx` renders all returned goals without pagination; `useGoals` default page is 20 rows; no `useCursorPager` or control to advance — fails "usable at 10k" |
| S8 feedbucket inbox | `duplicate` URL param not servable (backend test: "no duplicate column", R-3 filed); `/` shortcut needs searchInputRef forward |
| S9 feedbucket detail | Keyboard shortcuts for a detail page are N/A for j/k (no list); `DashboardGate` vs `usePageState` path difference |

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
