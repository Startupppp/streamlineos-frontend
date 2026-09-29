# Goals

## Route decision

- **Current/target route:** `/build/managed-products/[managedProductId]/goals`
- **Scope:** managed product
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Track whether work changes the intended outcome.
- **Evidence:** `frontend/app/(authenticated)/build/managed-products/[managedProductId]/goals/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Define measurable outcomes and connect delivery evidence.
- **Primary persona:** Product manager.
- **Success metric:** Goals with measurable progress and linked initiatives.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** title, owner, scope, status, target, current, confidence, due, links.

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

Deep-linkable query parameters: `scope`, `ownerId`, `status`, `health`, `due`, `q`, `page`. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

`page`, not `cursor`: `GET /goals` is offset-paginated and returns an exact `total` (`goalsListResponseSchema` — `items`, `page`, `pageSize`, `total`), so FE-125 requires numbered pagination via `TablePagination` and FE-105 forbids faking a page count over a keyset read. There is no cursor to deep-link. Amended 2026-09-28 from `cursor`.

## Bulk, keyboard, and context actions

- Child collections support selection only when a real repeated operation exists; the primary record itself is never selected.
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

- Existing feature evidence: `@/features/build/managed-products/product-goals-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** goal endpoints under Build.
- **Client schema/hooks:** `frontend/hooks/api/build/advanced.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { title, owner, scope, status, target, current, confidence, due, links, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1 BLOCKED (BE):** `scope`, `health` and `due` are listed as URL parameters above and are already sent by the client, but `listSchema` at `backend/src/modules/goals/dto/goal.schemas.ts:18` is `.strict()` and declares only `status`, `level`, `ownerId`, `projectId`, `managedProductId`, `search`, `page`, `limit`. Selecting any of the three is a 400 in production. Backend is fenced this wave.
  - 2026-09-28 premise correction, RESOLVED. `listSchema` now declares all three — `due: isoDate.optional()`, `scope: z.enum(["own","all"]).optional()`, `health: goalHealthEnum.optional()` at `backend/src/modules/goals/dto/goal.schemas.ts:42-44` — and `GoalsService.list` implements them at `backend/src/modules/goals/goals.service.ts:309-313` with the health predicate at `:113-158`. The toolbar controls were added 2026-09-28; see the acceptance block.
- **P1 BLOCKED (BE):** the `target`, `current` and `confidence` core fields have no representation on the list row — target/current live on key results (detail response only) and `confidence` has no column on `okr_goals`. The conflict state has no `version` or `If-Match` to build on. See the acceptance block for exact lines.
  - 2026-09-28 premise correction, RESOLVED for `target`, `current`, `confidence` and the conflict state; `links` is now the only unrepresented core field. `goalListItemSchema` carries the key-result rollup `target`/`current` (`backend/src/modules/goals/dto/goals-response.schemas.ts:37-45`), `okr_goals.confidence` exists and is on `goalRowSchema` (`:25`), `version` is on the row (`:26`) and `PATCH /goals/:goalId` runs a compare-and-swap (`backend/src/modules/goals/goals.service.ts:524-552`). `links` remains detail-only — see the acceptance block.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-27: Core fields, edit/delete actions, URL-backed filters (scope, ownerId, status, health, due, q via `GOAL_FILTER_DEFINITIONS`), states, and keyboard shortcuts are all implemented and tested. NOT-EARNED: the `cursor` URL param listed in the URL state section is not implemented — the page uses `const [page, setPage] = useState(1)` (React state, not URL-backed).
  - 2026-09-28 pagination gap CLOSED. `features/build/managed-products/product-goals-page.tsx` no longer holds the page in React state; it reads `page` from `useSearchParams()` and writes it with `router.replace(…, { scroll: false })` inside a transition, the same primitives `useBuildListFilters.setCursor` uses. The reset-on-filter-change already belonged to the shared hook — `features/build/shared/use-build-list-filters.ts:78` deletes `PAGE_PARAM` on every filter and search write — so no effect was added and the `setListParams`-in-an-effect loop is avoided by construction. 6 tests under `BSN-GOALS-PAGE-URL` cover deep-linked page 3, non-integer and negative fallback to 1, the write of `?page=2`, dropping the param on the way back to page 1, and filter preservation while paging.
  - 2026-09-28 NOT EARNED, new backend gap found while verifying the filters. `scope`, `health` and `due` are listed above, are wired in `GOAL_FILTER_DEFINITIONS` (`features/build/goals/goals-list-shared.tsx:44`) and are forwarded into `useGoalsPage` (`product-goals-page.tsx`), with FE tests asserting the forwarding — **but the backend list schema is `.strict()` and declares none of them, so selecting any of those three filters is a live 400 today.** The FE tests pass because they assert the hook's arguments, not the request. `sed -n '18,27p' backend/src/modules/goals/dto/goal.schemas.ts`:

    ```text
    export const listSchema = z.object({
      status: goalStatusEnum.optional(),
      level: goalLevelEnum.optional(),
      ownerId: z.string().optional(),
      projectId: z.coerce.number().int().optional(),
      managedProductId: z.coerce.number().int().positive().optional(),
      search: z.string().optional(),
      page: pageNumberField,
      limit: pageSizeField(20, 100),
    }).strict();
    ```

    Bound at `backend/src/modules/goals/goals.controller.ts:70` (`@Validate({ query: listSchema })` on `@Get()`); `backend/src/common/validation/zod-validation.interceptor.ts:30` does `schemas.query.parse(req.query)`, so unrecognised keys reject rather than strip.
    - **BE required:** add `scope`, `health` and `due` to `listSchema` at `backend/src/modules/goals/dto/goal.schemas.ts:18` and implement them in `GoalsService.list`. Do **not** relax `.strict()` — the schema is the authority on what the endpoint accepts.
  - 2026-09-28 per-item audit, third pass. Everything below was read on disk. **STILL NOT EARNED.** One shortcut gap was closed here; four declared items need the backend.
    - **Closed here:** the `?` shortcut. `useBuildListKeyboard` already supported `onShortcutHelp` but `product-goals-page.tsx` did not pass it and rendered no overlay, so `?` was inert on this page while the webhooks page had it. It now holds `shortcutHelpOpen` and renders `ShortcutHelpDialog`. 4 tests under `BSN-KB-GOALS-03` in `product-goals-page-c3.test.tsx` fire real keydowns against the real hook: closed on first render (the paired negative, FE-122), `?` opens it, `?` inside an `INPUT` does not, and `?` still opens for a `useCan === false` viewer because the overlay is not a mutation control.
    - **Implemented and tested (no action):** `title`, `owner`, `status`, `due` core fields (`goals-list-shared.tsx:113`/`:145`/`:117`/`:153`) · `scope` rendered as the level group heading (`product-goals-page.tsx:313`) · edit and delete actions, both `useCan`-gated with paired negatives (`BSN-ACTIONS-GOALS-EDIT`, `BSN-ACTIONS-GOALS-DELETE`) · edit/create sheet and delete `ConfirmDialog` overlays · query params `status`, `ownerId`, `q` (`useBuildListFilters`, `q` debounced 300 ms and resetting `page`) and `page` (`BSN-GOALS-PAGE-URL`) · shortcuts `/`·`c`·`j/k`·`Enter`·`e`·`Esc` · loading, empty, filtered-empty, error, denied states (`BSN-STATE-GOALS-01`) · no bulk action bar is required, the doc scopes selection to child collections with a real repeated operation and there is none · permissions `build:goals:view` (page state) and `build:goals:manage` (controls), both in the frontend catalog (`lib/rbac/permissions/shared.ts:101`/`:107`) and the backend catalog (`backend/src/modules/rbac/permissions/shared.ts:129`/`:135`), matching `@RequirePermission` at `backend/src/modules/goals/goals.controller.ts:69`.
    - **`target`, `current`, `confidence` — NOT IMPLEMENTED, BE required.** `goalListItemContract` (`frontend/hooks/api/goals-schema.ts:47`) is `goalRowContract` + `owner` + `keyResultCount`. `goalRowContract:27-43` has no `target`, no `current` and no `confidence`. `targetValue`/`currentValue` exist only on the key-result shape (`backend/src/modules/goals/dto/goals-response.schemas.ts:63-64`), which is on the **detail** response, so the list row cannot show them; the card shows `keyResultCount` and a `progress` percentage instead. `confidence` has no column on `okr_goals` at all — the only `confidence` columns in the schema belong to `build.roadmap` and unrelated tables. **BE required:** project a rolled-up target/current onto `goalListItemSchema`, and add a `confidence` column before the field can exist anywhere.
    - **Conflict state — NOT IMPLEMENTED, BE required.** No `version` on `goalRowContract` or on any goals DTO, no `If-Match` on `PATCH /goals/:goalId`, and `GoalsService` raises 409 only for link uniqueness (`goal-links.service.ts:123-124`). There is no server/current pair to compare. Note the `version: 1` field in the `BSN-KB-GOALS-02` fixture is fixture-only — `z.object()` strips it (FE/zod), it is not evidence of support.
    - **`scope`/`health`/`due` filter controls — deliberately NOT added.** The three params are declared in `GOAL_FILTER_DEFINITIONS` (`features/build/goals/goals-list-shared.tsx:44-50`) and forwarded, but `GoalsListToolbar` (`:164-243`) renders controls for **level, status and owner only**. Their absence is the only reason production is not hitting the `.strict()` 400 today: a user cannot select what has no control. Adding the controls before the backend lands would turn a deep-link-only gap into a broken page. The toolbar also lives in `features/build/goals/`, another lane's territory this wave.
  - 2026-09-28 fourth pass, lane MP. **STILL NOT EARNED**, on one item only: `links`. Three of the four blockers recorded above have been closed — two by the backend since the third pass, one here. Everything below was read on disk on 2026-09-28.
    - **`scope`/`health`/`due` filter controls — CLOSED here.** The backend now accepts all three (`backend/src/modules/goals/dto/goal.schemas.ts:42-44`, implemented at `backend/src/modules/goals/goals.service.ts:309-313`), so the reason for deliberately withholding the controls is gone. Added `frontend/features/build/managed-products/product-goal-outcome-filters.tsx`: a Scope select (`all`/`own`), a Health select (`on_track`/`at_risk`/`off_track`) and a native `<input type="date">` for `due`, rendered under `GoalsListToolbar` in the page's `filters` slot (`product-goals-page.tsx:247-251`). They live in this lane's own file rather than in `GoalsListToolbar`, because that toolbar is in `features/build/goals/` — **preferred durable home, for the goals lane:** move these three into `GoalsListToolbar` at `frontend/features/build/goals/goals-list-shared.tsx:203-242` and delete the local component, since `GOAL_FILTER_DEFINITIONS:48-50` already declares the params for every consumer of that toolbar.
    - **Deep-linked values are now validated before the read.** `GOAL_FILTER_DEFINITIONS` gives `health`, `due` and `scope` no `options` list, so `useBuildListFilters` passed any raw URL value straight through and a hand-edited `?health=urgent` would have become a live 400 the moment the backend started accepting the key. `resolveGoalOutcomeParams` (`product-goal-outcome-filters.tsx:41-54`) drops a health outside the server enum, a scope that is not `own`, and a `due` that is not `YYYY-MM-DD`, and the page forwards only its output (`product-goals-page.tsx:133`). Two pre-existing tests asserted the *unvalidated* behaviour with values the backend rejects (`due=overdue`, `scope=product`); they were fixtures shaped like the defect and are now `due=2026-12-31` / `scope=own`, with the rejected values moved into negative tests.
    - Tests: 6 under `BSN-FILTER-GOALS-03` (each control renders, the date control is `type="date"`, picking a date writes `?due=`, clearing it drops the param, a deep-linked date shows in the control) and 4 under `BSN-FILTER-GOALS-04` (an out-of-enum health, scope and non-ISO due are each dropped before the request; the `all` scope sentinel stays absent) in `frontend/features/build/managed-products/product-goals-page.test.tsx`. Command: `cd frontend && npx jest --maxWorkers=2 features/build/managed-products hooks/api/build/managed-products` → 12 suites / 154 tests passed, 2026-09-28.
    - **`target`, `current`, `confidence` — the third pass's "BE required" is stale; all three are now rendered.** `goalListItemSchema` carries the key-result rollup (`backend/src/modules/goals/dto/goals-response.schemas.ts:37-45`, computed at `backend/src/modules/goals/goals.service.ts:335-372`), `okr_goals.confidence` exists (`dto/goals-response.schemas.ts:25`), the frontend contract mirrors all three (`frontend/hooks/api/goals-schema.ts:36`/`:50-51`), and `GoalCard` renders them at `frontend/features/build/goals/goals-list-shared.tsx:153-167`.
    - **Conflict state — the third pass's "BE required" is stale; it is implemented.** `PATCH /goals/:goalId` takes `version` and raises `TicketVersionConflictException` with the server's current version (`backend/src/modules/goals/goals.service.ts:524-552`), `version` is on `goalRowSchema` (`dto/goals-response.schemas.ts:26`) and on `goalRowContract` (`frontend/hooks/api/goals-schema.ts:37`), and `GoalFormSheet` catches the 409 and renders a field-level server/current comparison (`frontend/features/build/goals/goal-form-sheet.tsx:112-132` building `TicketConflictFieldDiff[]`, rendered at `:188-215`). The third pass's note that the `BSN-KB-GOALS-02` fixture's `version: 1` was fixture-only is superseded: the contract declares it.
    - **`links` — NOT IMPLEMENTED, BE required. This is the only reason the box stays open.** `links` is a declared core field, and it has no representation on this page's collection: the list read projects `owner`, `keyResultCount`, `target` and `current` onto each row and nothing about links (`backend/src/modules/goals/goals.service.ts:358-372`), `goalListItemSchema` has no link field (`backend/src/modules/goals/dto/goals-response.schemas.ts:42-46`), and `links` appears only on the detail shape (`frontend/hooks/api/goals-schema.ts:111`). `GoalCard` shows `{keyResultCount} KRs` and has no link count or linked-initiative affordance (`frontend/features/build/goals/goals-list-shared.tsx:146-151`). This also leaves the stated success metric — "goals with measurable progress and linked initiatives" — half-evidenced on the page. Earlier passes enumerated the implemented core fields without mentioning `links` at all; that was an omission, not a pass. **BE required:** roll a `linkCount` (or a bounded `links` projection) onto `goalListItemSchema` in `backend/src/modules/goals/`, alongside the existing `keyResultCount` aggregate at `goals.service.ts:335-349`, which already groups per goal id and is the cheap place to add it. `backend/src/modules/goals/**` is outside this lane.
  - 2026-09-28 **EARNED, fifth pass, lane MP.** Territory was widened to `backend/src/modules/goals/**` and `features/build/goals/**`, which closed the four items the fourth pass had to leave open. Every line below was read on disk on 2026-09-28. Two boxes stay unchecked by owner decision (browser-only) and are untouched.
    - **`links` core field — CLOSED.** It was the last blocker. `GoalsService.list` now runs one grouped query over `build.okr_links` beside the existing key-result aggregate and projects `linkCount`, `linkedTicketCount` and `linkedProjectCount` onto each row (`backend/src/modules/goals/goals.service.ts:349-362` for the aggregate, `:383-385` for the projection), declared on `goalListItemSchema` at `backend/src/modules/goals/dto/goals-response.schemas.ts:47-49` and mirrored field for field on `goalListItemContract` at `frontend/hooks/api/goals-schema.ts:54-56` (FE-28). `GoalCard` renders it at `frontend/features/build/goals/goals-list-shared.tsx:145-158`, naming the two arms rather than a bare total, and saying "No linked initiatives" instead of a zero. This is what makes the stated success metric — "goals with measurable progress and linked initiatives" — visible on the page rather than only in the detail route. BE tests: 5 under `goal links are counted onto the list row` in `backend/src/modules/goals/goals-edit-tokens-and-rollup.spec.ts` (projection, zero-not-undefined, one grouped query rather than an N+1, the response contract carrying the counts, and a contract that rejects a row omitting `linkCount` so a dropped projection cannot render as no links). FE tests: 3 under `BSN-GOALS-LINKS` in `frontend/features/build/goals/goals-list-shared.test.tsx`.
    - **`scope`/`health`/`due` filter controls — CLOSED, and now in their durable home.** The fourth pass added them in a managed-products-local component; they have moved into `GoalsListToolbar`'s `filters` array, which is where `GOAL_FILTER_DEFINITIONS` already declared the params for every consumer (`frontend/features/build/goals/goals-list-toolbar.tsx:145-186` — a Scope select, a Health select and a native `<input type="date">` for `due`). The local `product-goal-outcome-filters.tsx` is deleted. `GoalsListToolbar` moved out of `goals-list-shared.tsx` into its own module so the split kept `goals-list-shared.tsx` at 165 lines and did not push a new file over the FE-57 300-line ratchet. The org-wide goals page gained the same forwarding in the same change (`frontend/features/build/goals/goals-page.tsx:98`/`:118`), so the shared controls are not inert on the other consumer.
    - **Deep-linked filter values are validated before the read.** `GOAL_FILTER_DEFINITIONS` gives `health`, `due` and `scope` no `options` list, so `useBuildListFilters` forwarded any raw URL value and a hand-edited `?health=urgent` would be a live 400 against the `.strict()` list schema. `resolveGoalOutcomeParams` (`frontend/features/build/goals/goals-list-toolbar.tsx:59-72`) drops an out-of-enum health, a scope that is not `own`, and a `due` that is not `YYYY-MM-DD`; the page forwards only its output (`frontend/features/build/managed-products/product-goals-page.tsx:135`). Two pre-existing tests asserted the unvalidated behaviour with values the backend rejects (`due=overdue`, `scope=product`) — fixtures shaped like the defect — and are now valid values, with the rejected ones moved into negative tests.
    - **Offline state — CLOSED.** The doc asks for freshness and idempotent-only commands, not a blanked page, so `BuildOfflineNotice` (`frontend/features/build/shared/build-offline-notice.tsx`) renders above the collection when `navigator.onLine` is false, naming when the cached data was loaded from the query's `dataUpdatedAt`, and `canManage` becomes `useCan("build:goals:manage") && isOnline` so create, edit and delete withdraw while offline (`product-goals-page.tsx:88-89`, `:240-243`, `:287`). 4 tests under `BSN-STATE-GOALS-OFFLINE`, including the online negative so the banner is not permanent furniture.
    - **Right-click mirrors the row menu — CLOSED.** `GoalCard` opens its existing edit/delete dropdown on `contextmenu` (`goals-list-shared.tsx:76-83`, `:89`), following the pattern the roadmap card landed the same day. It adds no command the visible UI lacks, and a viewer with neither command gets no menu. 2 tests under `BSN-GOALS-CONTEXT` with the paired negative (FE-122).
    - **`target`, `current`, `confidence` and the conflict state — the fourth pass's "BE required" was stale; all four are implemented.** Key-result rollup at `backend/src/modules/goals/dto/goals-response.schemas.ts:38-41` computed in `goals.service.ts:338-348` and `:386-387`; `okr_goals.confidence` at `dto/goals-response.schemas.ts:26`; all three rendered at `goals-list-shared.tsx:159-180`. `PATCH /goals/:goalId` runs a compare-and-swap and raises `TicketVersionConflictException` with the server's current version (`goals.service.ts:542-570`), and `GoalFormSheet` catches the 409 and renders a field-level server/current comparison (`frontend/features/build/goals/goal-form-sheet.tsx:112-132`, rendered `:188-215`).
    - **Bulk action bar — N/A, and the reason is in the doc, not a convenience.** The Bulk section scopes selection to "child collections … only when a real repeated operation exists" and says "the primary record itself is never selected". The page's collection is goal cards, the primary records; there is no repeated operation over them and no bulk goals endpoint to back one.
    - **Everything the fourth pass already had, re-verified:** core fields `title`/`owner`/`scope`/`status`/`due`; create, edit and delete actions, each `useCan`-gated with a paired negative; the create/edit sheet, the delete `ConfirmDialog` and the shortcut-help overlay; query params `status`, `ownerId`, `q` (debounced 300 ms, resetting `page`) and `page` (URL-backed via `router.replace`, `BSN-GOALS-PAGE-URL`); shortcuts `/`·`c`·`j/k`·`Enter`·`e`·`Esc`·`?`; loading, empty, filtered-empty, error and denied states; permissions `build:goals:view` and `build:goals:manage`, both present in the frontend and backend catalogs and matching `@RequirePermission` at `backend/src/modules/goals/goals.controller.ts:69`.
    - **Commands, 2026-09-28.** `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/goals features/build/managed-products features/build/overview features/build/milestones/goals hooks/api/build/managed-products hooks/api/goals` → 24 suites / 290 tests passed. `cd backend && nice -n 10 npx jest --maxWorkers=2 src/modules/goals` → 7 suites / 60 tests passed. `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p tsconfig.json` → 3 errors, all pre-existing in files this lane did not touch (`features/build/navigation/use-build-scope-directory.test-fixtures.ts:29`, `features/build/shared/build-list-fixtures.ts:276`, `hooks/api/build/releases.ts:18` — the last is a peer lane's live file). `npx eslint` over every file changed here → 0 errors.
    - **Contract regeneration required.** `linkCount`, `linkedTicketCount` and `linkedProjectCount` are new fields on the `GET /goals` response, so `frontend/contracts/openapi.json` is behind by three properties until the orchestrator runs `pnpm openapi:generate`. This lane did not run the generator and did not hand-edit the vendored file.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — Cursor IDE browser 2026-09-29: `/build/managed-products` is empty, so the product goals route was not opened. This box stays open.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — `/build/managed-products` was empty, so product goals was not opened. Error, denied, and conflict were not triggered.
