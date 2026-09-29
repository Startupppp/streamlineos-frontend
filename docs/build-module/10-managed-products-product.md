# Product Overview

## Route decision

- **Current/target route:** `/build/managed-products/[managedProductId]`
- **Scope:** managed product
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Connect discovery, goals, roadmap, and delivery for a product.
- **Evidence:** `frontend/app/(authenticated)/build/managed-products/[managedProductId]/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Manage products independently from delivery projects.
- **Primary persona:** Product manager.
- **Success metric:** Products with current outcome and roadmap evidence.
- **Required density:** compact by default with a comfortable-density toggle.
- **Core fields:** name, owner, status, goals, projects, feedback, updated.

## Above-the-fold text wireframe

```text
Scope breadcrumb / title                         Search / saved view / primary action
Purpose or freshness line                       Permission-safe secondary actions
Filter and layout toolbar (URL-backed)
Summary or status strip (only decision-useful metrics)
Bounded primary collection / workspace
Selection-aware bulk action bar (when rows are selected)
```

Priority is identity and next action first, filters/layout second, bounded content third. Decorative cards, duplicate explanation banners, and non-actionable vanity metrics stay out of the first viewport.

## Elements and interactions

- Title/breadcrumb: clickable ancestors; current title is non-interactive unless inline rename is authorized.
- Search: debounced, keyboard focused with `/`, reflected in `q`.
- Filters/group/sort/layout: popovers or segmented controls; every response-shaping value updates the URL.
- Rows/cards: single click selects/opens preview when useful; explicit title link performs full-page navigation; right click opens the same authorized actions available from the row menu.
- Inline edits: status, priority, assignee, dates, estimate, and labels only when the mutation is optimistic and reversible. Financial, access, approval, publication, and destructive changes are never optimistic.
- Dialog: confirmation or focused form with at most five fields. Sheet: six or more fields, multi-section edit, or when source context must remain visible. Popover: reversible compact selection. Full page: durable, collaborative, historical, builder, or execution work.
- Non-interactive: explanatory copy, historical audit events, calculated metrics, and permission-denial reasons.

## URL state

Deep-linkable query parameters: `ownerId`, `status`, `q`, `sort`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- Bulk actions: assign, change status/priority, add label/link, archive, or export only where the same permission and state transition is valid for every selected row. Partial success returns a per-record result.
- Keyboard: `Tab` follows visual order and `Esc` closes overlays or clears selection, on every page. Where the page has the target: `/` focuses search, `c` creates in current scope, `j/k` moves through the list, `Enter` opens the focused row, `e` edits it, `?` opens shortcut help. A shortcut whose target does not exist on this page is not required — see CCG-4. Shortcuts do not fire inside text inputs/editors.
- Context menu: open, copy link/key, edit, move/link, and archive/delete where authorized. It mirrors visible commands and never hides the only path to an action.

## States

- Loading: stable skeleton matching final geometry; preserve stale authorized content on refetch.
- Empty: distinguish first-run setup from a filtered no-result state; one relevant primary action maximum.
- Error: preserve backend code/message, retry safely, expose request ID; never convert 402/403 into empty.
- Permission denied: `NoPermissionState` with no record existence leak.
- Offline: show freshness; allow local drafts and approved idempotent commands only.
- Conflict: show field-level server/current comparison for version conflicts.

## Permissions

| Standing | View | Create | Edit | Delete/archive |
|---|---:|---:|---:|---:|
| Organization owner/admin | Yes when module enabled | Yes | Yes | Yes, with invariant checks |
| Build owner/admin | Yes | Yes | Yes | Yes within Build scope |
| Build member | Authorized records | Yes when `build:create` | Own/assigned or explicit permission | No by default |
| Guest/client | Explicit grant projection only | Bounded request/comment only | Own allowed contribution | No |

Backend guards and record scope are authoritative. Controls fail closed while access is loading. Missing, deleted, cross-tenant, and unauthorized detail records return indistinguishable 404s.

## Components

- Existing feature evidence: `@/features/build/overview/managed-product-overview-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST /build/managed-products.
- **Client schema/hooks:** `frontend/hooks/api/build/managed-products.ts; managed-products-schema.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { name, owner, status, goals, projects, feedback, updated, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1 BLOCKED (BE):** the `owner` core field cannot be rendered — the managed-product detail response projects `ownerId`/`ownerMembershipId` only, and FE-85 forbids putting a raw id on screen. A resolved owner projection is required. The conflict state has no `version` or `If-Match` to build on.
  - 2026-09-28 premise correction, both halves are now UNBLOCKED. `GET /build/managed-products/:id` resolves the owner through `organization_members → users` and returns it as `owner: { id, firstName, lastName, email, image } | null` (`backend/src/modules/build/managed-products/managed-products.service.ts:149-180`, contract `dto/managed-products-response.schemas.ts:9-15` and `:31`), and the row carries `version` (`:32`) with a compare-and-swap on `PATCH` that raises `TicketVersionConflictException` with the server's current version (`managed-products.service.ts:227-263`). The frontend contract was dropping the owner — `managedProductRowContract` had no `owner` key and `z.object` strips unknown keys — fixed at `frontend/hooks/api/build/managed-products-schema.ts:26-34` and `:47`, with `ManagedProductDetail` exported from `frontend/hooks/api/build/managed-products.ts:165-167`. What remains is rendering, in `features/build/overview/`.
- **P1 (other lane):** the page has no filter toolbar and no `/`, `c`, `e` or `?` shortcut. `frontend/features/build/overview/managed-product-overview-page.tsx` is outside the managed-products lane; route it to whoever owns `features/build/overview/`.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-27: `ownerId`→`managerId`, `status`, and `cursor`→`afterId` URL params are now wired in `OVERVIEW_FILTER_DEFINITIONS` and forwarded to `useProjects`; 5 new tests cover these params.
  - 2026-09-28 NOT EARNED, backend gap confirmed by reading the schema. `sort` is listed in the URL state section but `listProjectsSchema` is `.strict()` and declares no sort argument, so sending one is a 400. `sed -n '73,80p' backend/src/modules/build/core/dto/project-core.schemas.ts`:

    ```text
    export const listProjectsSchema = z.object({
      search: z.string().optional(),
      status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED", "ALL"]).default("ALL"),
      afterId: idCursorSchema,
      limit: pageSizeField(9),
      managedProductId: z.coerce.number().int().positive().optional(),
      managerId: z.string().optional(),
    }).strict();
    ```

    The schema is bound to the live read at `backend/src/modules/build/core/projects.controller.ts:65` (`@Validate({ query: listProjectsSchema })` on `@Get()`), and `backend/src/common/validation/zod-validation.interceptor.ts:30` calls `schemas.query.parse(req.query)`, so a `.strict()` miss is a 400 and not a silent strip.
    - **BE required:** add a sort field to `listProjectsSchema` (`backend/src/modules/build/core/dto/project-core.schemas.ts:73`), plus the matching `ORDER BY` in `ProjectsQueryService.listProjects`. A keyset list must keep the cursor and the sort in agreement, so the sort whitelist has to stay compatible with `afterId` descending-id paging.
  - 2026-09-28 second gap on this box: the four URL params are read and forwarded but the page renders **no filter toolbar at all** — the wireframe's "Filter and layout toolbar (URL-backed)" row has no control on `managed-product-overview-page.tsx`. The params are deep-linkable only. Re-verified on disk 2026-09-28: `OVERVIEW_FILTER_DEFINITIONS` is read at `:49-61` and forwarded into `useProjects` at `:64-74`, and the JSX from `:137` renders `PageWrapper` with no `filters` prop and no search input, owner select or status select anywhere. Not fixed here because the box cannot be earned while `sort` is a 400 — and because the page file is `frontend/features/build/overview/managed-product-overview-page.tsx`, outside this lane's write territory this wave.
  - 2026-09-28 per-item audit, third pass. Everything below was read on disk. **STILL NOT EARNED.** All remaining work is either backend-fenced or in `features/build/overview/`, which this lane may not write.
    - **Implemented (no action):** `name` (`PageWrapper title`, `:139`, with `key` as the badge) · `status` and `updated` (subtitle, `:141-145`) · `goals` (`StatCard`, `:164`, from `useGoalsPage().total`) · `projects` (`StatCard` `:156` plus the Linked projects card `:218-259`) · `feedback` (`StatCard` `:172`, summed from `insights.feedbackByStatus`) · loading skeleton, empty, error and denied states through `PageState` + `usePageState` with `error` passed (`:87-93`, FE-41) · permission `build:managed-products:view`, present in the frontend catalog (`lib/rbac/permissions/permission-key-business.ts:118`) and the backend catalog (`backend/src/modules/rbac/permissions/build.ts:262`), matching `@RequirePermission` on `@Get(":managedProductId")` and `@Get(":managedProductId/insights")` (`managed-products.controller.ts:71`, `:106`).
    - **`owner` core field — NOT RENDERED, BE required.** Nothing on the page shows an owner. The detail response gives only raw identifiers: `managedProductRowSchema` (`backend/src/modules/build/managed-products/dto/managed-products-response.schemas.ts:6-25`) projects `ownerId: z.string().nullable()` and `ownerMembershipId`, with no name, email or avatar. Rendering either one would put a raw id on screen, which FE-85 forbids. **BE required:** project a resolved `owner: { id, name, email, image } | null` onto the managed-product detail response, as `goalListItemSchema` already does for goals.
    - **Shortcuts `/`, `c`, `e`, `?` — NOT IMPLEMENTED.** `useBuildListKeyboard` is called at `:130-135` with `onOpen` and `onClearSelection` only, so `j/k`, `Enter` and `Esc` work over the linked-projects list and the other four are inert. `/` has no target precisely because the search control is missing (same defect as the toolbar gap above), so CCG-4 does not excuse it — the doc requires the search box. `c` and `e` have no create or edit affordance on this page at all. `?` is a one-line fix of the kind landed on the goals page this session, but the file is another lane's.
    - **Bulk action bar — NOT IMPLEMENTED.** No selection state, no bulk bar. A backing endpoint does exist (`@Post("bulk")`, `build:managed-products:update`, `managed-products.controller.ts:58-60`) and is already consumed by the managed-products **list** page's `managed-product-bulk-toolbar.tsx`, but it operates on managed products — it is not a bulk operation over this page's primary collection, which is linked projects. Decide the intended selection target before re-opening the box.
    - **Conflict state — NOT IMPLEMENTED, BE required.** `managedProductRowSchema` carries no `version` and `@Patch(":managedProductId")` takes no `If-Match`, so the declared field-level server/current comparison has nothing to compare.
    - **Note on the box's own premise:** this page has no mutation control of any kind — no create, rename, archive or inline edit — so the Create/Edit/Delete columns of the permission table are unexercised here rather than mis-gated. The title being non-interactive is compliant with the Elements section, which only requires interactivity when inline rename is authorized.
  - 2026-09-28 fourth pass, lane MP. **STILL NOT EARNED**, but two of the three "BE required" blockers recorded above are now stale and are corrected here. Everything below was read on disk on 2026-09-28.
    - **`owner` — backend half EARNED, frontend contract half EARNED here, rendering still open.** `ManagedProductsService.getManagedProduct` joins `organization_members → users` under the caller's `orgId` and returns `owner` (`backend/src/modules/build/managed-products/managed-products.service.ts:149-180`); the response contract declares it at `backend/src/modules/build/managed-products/dto/managed-products-response.schemas.ts:9-15`/`:31`. The frontend was silently discarding it: `managedProductRowContract` omitted the key and `z.object` strips unknown keys, so the page could never have seen a resolved owner even after the backend landed. Added `managedProductOwnerContract` + `owner: …nullish()` at `frontend/hooks/api/build/managed-products-schema.ts:26-34`/`:47` (nullish, because the list endpoint returns raw rows and only the detail endpoint resolves the owner) and `ManagedProductDetail` at `frontend/hooks/api/build/managed-products.ts:165-167`. Tests: 3 in `frontend/hooks/api/build/managed-products-schema.test.ts` (owner survives the parse, a list row without owner still parses, a null owner parses) and 3 in `backend/src/modules/build/managed-products/managed-products.service.spec.ts` (named owner returned, `owner: null` with no second query when `ownerMembershipId` is null, and the owner lookup's WHERE carries `org_id` so a cross-tenant membership id cannot name a foreign user). `cd frontend && npx jest --maxWorkers=2 hooks/api/build/managed-products` → 2 suites / 19 tests passed. `cd backend && npx jest --maxWorkers=2 src/modules/build/managed-products/managed-products.service.spec.ts` → 34 passed. **Still open:** nothing renders `owner`, and the only place that could is `frontend/features/build/overview/managed-product-overview-page.tsx:139`, outside this lane.
    - **Conflict state — backend half EARNED, stale blocker corrected.** `updateManagedProductSchema` requires `version` (`backend/src/modules/build/managed-products/dto/managed-products.schemas.ts:59`), `updateManagedProduct` compares it against the stored row and re-reads the current version for the 409 body (`managed-products.service.ts:227-263`), and `version` is on the response row (`dto/managed-products-response.schemas.ts:32`) and on the frontend contract. Six existing specs cover the guard (`managed-products.service.spec.ts:201-271`). **Still open:** this page has no edit control, so there is no overlay in which to show a field-level server/current comparison; that too is `features/build/overview/`.
    - **`sort` — the earlier NOT-EARNED note conflates two endpoints.** The endpoint this spec declares, `GET /build/managed-products`, does accept `sort` — `listManagedProductsQuerySchema` at `backend/src/modules/build/managed-products/dto/managed-products.schemas.ts:76-83` declares `sort: z.enum(["name","updated","status"])`, `ManagedProductsService.listManagedProducts` keeps the keyset predicate and the `ORDER BY` in agreement for all four sorts (`managed-products.service.ts:96-142`), and four specs assert it (`managed-products.service.spec.ts:507-578`). The 400 the earlier note describes is real but belongs to a different read: the page's primary collection is *linked projects*, served by `listProjectsSchema` (`backend/src/modules/build/core/dto/project-core.schemas.ts:73`), which is `.strict()` and has no sort. Both the page and that schema are outside this lane.
    - **Unchanged and still blocking, all outside this lane:** no filter toolbar, no `/`·`c`·`e`·`?` shortcut, no bulk action bar, no owner rendering, no conflict overlay — every one of them in `frontend/features/build/overview/managed-product-overview-page.tsx`; plus the `sort` argument on `listProjectsSchema` in `backend/src/modules/build/core/`.
  - 2026-09-28 **EARNED, fifth pass, lane MP.** Territory was widened to `features/build/overview/**` and `types/projects/`, which closed everything the fourth pass had to route to another lane. Every line below was read on disk on 2026-09-28. Two boxes stay unchecked by owner decision (browser-only) and are untouched.
    - **`owner` core field — CLOSED.** The backend resolves the owner through `organization_members → users` under the caller's `orgId` and returns `owner: { id, firstName, lastName, email, image } | null` (`backend/src/modules/build/managed-products/managed-products.service.ts:149-180`, contract `dto/managed-products-response.schemas.ts:9-15`/`:31`). The frontend was discarding it — `managedProductRowContract` had no `owner` key and `z.object` strips unknown keys — now declared at `frontend/hooks/api/build/managed-products-schema.ts:26-34`/`:47` as `nullish()`, because only the detail endpoint resolves it while the list returns raw rows, and on the shared type at `frontend/types/projects/managed-products.ts:3-9`/`:27`. The page renders the resolved name through `getUserDisplayName` in the header subtitle (`frontend/features/build/overview/managed-product-overview-page.tsx:197-204`, `:227`), so no raw id reaches the screen (FE-85) and an ownerless product reads "Unassigned" rather than blank. The derived `ManagedProductDetail` workaround the fourth pass added is deleted now that `owner` is on `ManagedProduct` itself. Tests: 2 under `BSN-OVW-OWNER` (the resolved name renders and the raw uuid does not; the null owner reads Unassigned), 3 in `frontend/hooks/api/build/managed-products-schema.test.ts` (owner survives the parse, a list row without owner parses, a null owner parses), 3 in `backend/src/modules/build/managed-products/managed-products.service.spec.ts` (named owner returned, `owner: null` with no second query when `ownerMembershipId` is null, and the owner lookup's WHERE carries `org_id` so a cross-tenant membership id cannot name a foreign user).
    - **`sort` and `ownerId` query parameters — CLOSED, with the cursor kept in agreement.** Both were declared and read but had no control. The toolbar now carries an Owner select built from `useOrgMembers` and a Sort select over the backend's own enum (`managed-product-overview-page.tsx:240-264`). `sort` is narrowed against `PROJECT_SORT_VALUES` before the read (`:90`), so a hand-edited `?sort=created_desc` is dropped rather than sent to a `.strict()` schema, and the id cursor is dropped whenever a sort is active (`:94-95`, `:105-106`) because `ProjectsQueryService` switches the keyset predicate to `afterSortValue` under a sort (`backend/src/modules/build/core/project-crud/projects-query.service.ts:122-145`) and an `afterId` would be silently ignored. `ProjectFilters` gained the sort union at `frontend/types/projects/projects.ts:358`. Tests: 6 under `BSN-OVW-SORT` (forwarding, the out-of-enum drop, the cursor dropped under a sort, the cursor kept without one, a non-numeric cursor dropped rather than sent as NaN, and both controls rendering), on top of the 5 `BSN-OVW-PARAMS` tests already covering `ownerId`, `status` and `cursor`, and the 2 `BSN-OVW-Q` tests covering `q`.
    - **The `sort` premise correction from the fourth pass stands and is now moot.** `listProjectsSchema` does declare `sort` (`backend/src/modules/build/core/dto/project-core.schemas.ts:91-110`, `projectSortEnum` at `:91`) with the matching `ORDER BY` and keyset predicate in `ProjectsQueryService.listProjects` (`projects-query.service.ts:122-180`). The 400 the third pass described no longer exists on either endpoint.
    - **Edit action, overlay and conflict state — CLOSED.** The page had no mutation of any kind, so the declared conflict state had nothing to compare. It now offers a permission-gated `Edit product` header action (`managed-product-overview-page.tsx:206-209`, `:228`) that opens the existing `ManagedProductFormSheet` in edit mode (`:284-291`) rather than a second form — that sheet already sends `version` and, on a 409, renders a field-level server/current comparison through `TicketConflictDialog` (`frontend/features/build/managed-products/managed-product-form-sheet.tsx:145-163` building the comparisons, `:278-283` rendering them). The backend half is a compare-and-swap that re-reads the current version for the 409 body (`backend/src/modules/build/managed-products/managed-products.service.ts:227-263`, six specs at `managed-products.service.spec.ts:201-271`). Tests: 2 under `BSN-OVW-EDIT`, the positive and the `useCan === false` paired negative (FE-122).
    - **Offline state — CLOSED.** The doc asks for freshness and idempotent-only commands, not a blanked page, so `BuildOfflineNotice` (`frontend/features/build/shared/build-offline-notice.tsx`) renders above the content when `navigator.onLine` is false, naming when the cached product was loaded from `productQuery.dataUpdatedAt` (`managed-product-overview-page.tsx:300`), and `canEdit` becomes `useCan("build:managed-products:update") && isOnline` (`:112-113`) so the write control withdraws. 3 tests under `BSN-OVW-OFFLINE`, including the online negative.
    - **Right-click on a linked project row — CLOSED.** `LinkedProjectRow` (`frontend/features/build/overview/linked-project-row.tsx`) opens Open project / Copy link on `contextmenu`, mirroring the row's visible link rather than inventing a command, following the pattern the roadmap card landed the same day. 1 test under `BSN-OVW-CONTEXT`.
    - **Bulk action bar — N/A, and not for convenience.** There is no bulk endpoint over projects at all: the only Build bulk routes are `POST /build/:projectId/tickets/bulk` and the per-project status reorder (`backend/src/modules/build/core/tickets/projects-tickets.controller.ts:179`, `core/project-crud/project-resources.controller.ts:139`). The managed-products bulk route (`managed-products.controller.ts:58-60`) operates on managed products and is already consumed by the list page's `managed-product-bulk-toolbar.tsx`; this page shows exactly one product, and the doc's own constraint is that a bulk action applies "only where the same permission and state transition is valid for every selected row". The linked-projects card is a bounded ten-row preview with a "View all linked projects" link; a bulk bar here would need a backend route invented for it, which this wave does not do.
    - **Shortcuts.** `/` focuses the search input, `j/k` move the preview rows, `Enter` opens the focused project, `Esc` clears, `?` opens `ShortcutHelpDialog` — all wired through `useBuildListKeyboard` (`managed-product-overview-page.tsx:215-222`) and covered by `BSN-OVW-KB`. `c` and `e` are **CCG-4**: this is a product detail page with no create target (products are created on the list page) and its rows are links to the project pages with no inline editor, so there is nothing for either key to act on. The product's own edit is the header action above, reachable by pointer and by Tab.
    - **Permissions.** `build:managed-products:view` gates the page through `usePageState` with `error` passed (FE-41) and `build:managed-products:update` gates the edit control (FE-44, fail-closed); both keys are in the frontend catalog (`lib/rbac/permissions/permission-key-business.ts:118`) and the backend catalog (`backend/src/modules/rbac/permissions/build.ts:262`) and match `@RequirePermission` on `@Get(":managedProductId")` and `@Patch(":managedProductId")` (`managed-products.controller.ts:71`, `:93`). Create and delete are not on this page: products are created and deleted on `/build/managed-products`, which owns those columns of the permission table.
    - **Everything the fourth pass already had, re-verified:** core fields `name` (title, with `key` as the badge), `status` and `updated` (subtitle), `goals`, `projects` and `feedback` (stat cards plus the linked-projects and roadmap cards); the search, status filter and clear-all toolbar; loading, empty, error and denied states through `PageState` + `usePageState`.
    - **Commands, 2026-09-28.** `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/overview features/build/managed-products features/build/goals features/build/milestones/goals hooks/api/build/managed-products hooks/api/goals` → 24 suites / 290 tests passed. `cd backend && nice -n 10 npx jest --maxWorkers=2 "src/modules/build/managed-products/.*\.spec\.ts$"` → 3 suites / 49 tests passed. `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p tsconfig.json` → 3 errors, all pre-existing in files this lane did not touch. `npx eslint` over every file changed here → 0 errors.
    - **No contract regeneration needed for this page.** `owner`, `version` and `sort` were already on the backend contracts before this pass; nothing here adds a backend response field.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — **BROWSER VERIFICATION PENDING** (2026-09-29: waived for this pass by Tarun; every non-browser criterion on this page is ticked above).
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — **BROWSER VERIFICATION PENDING** (2026-09-29: waived for this pass by Tarun; every non-browser criterion on this page is ticked above).
