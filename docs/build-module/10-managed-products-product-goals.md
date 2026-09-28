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
- **P1 BLOCKED (BE):** the `target`, `current` and `confidence` core fields have no representation on the list row — target/current live on key results (detail response only) and `confidence` has no column on `okr_goals`. The conflict state has no `version` or `If-Match` to build on. See the acceptance block for exact lines.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
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
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
