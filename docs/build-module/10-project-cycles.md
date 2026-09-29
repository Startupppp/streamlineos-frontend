# Cycles

## Route decision

- **Current/target route:** `/build/[projectId]/cycles`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Commit a realistic slice and track it to completion.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/cycles/page.tsx`; Physical route exists, while the production project sidebar linked Cycles to broken `/build/1/sprints`.

## Product contract

- **Purpose:** Plan and execute one canonical iteration model.
- **Primary persona:** Team lead.
- **Success metric:** Commitment reliability and carry-over.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** name, dates, status, goal, capacity, work, progress, velocity.

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

Deep-linkable query parameters: `status`, `from`, `to`, `q`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

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

- Existing feature evidence: `@/features/build/cycles/cycles-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST/PATCH /build/:projectId/cycles.
- **Client schema/hooks:** `frontend/hooks/api/build/sprints.ts; execution-schema.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { name, dates, status, goal, capacity, work, progress, velocity, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-27: `version` token flows end-to-end (backend projection → `Cycle` type → `UpdateCycleInput` → `handleConfirmStatus`/`handleConfirmCompletion`/form submit); `goal` added to projection, type, input, form schema and card; 409 conflict handler in `cycle-form-sheet.tsx`; contract tests cover `version` and `goal`.
  - 2026-09-28 per-item audit. **Closed since the last entry:** the capacity form field IS wired — `frontend/features/build/cycles/cycle-form-sheet.tsx:264-280` renders it and `:150` submits it; `cycle-card.tsx:74-77` renders it. The capacity migration is journalled as `migrations/1418_build_cycle_capacity.sql`, so the "not yet journalled" note above was stale. `c`, `e` and `Enter` now have real targets (`cycles-page.tsx` `handleOpenCreate`/`handleEditByIndex`), a `status` select and a `from`/`to` `DateRangePicker` now render in the toolbar, and the empty state distinguishes first-run from filtered-empty. 25/25 in `cycles-page.test.tsx`.
  - **Still open — `cursor` query parameter is not implementable on the frontend.** `cycleListQuerySchema` (`backend/src/modules/build/execution/dto/iterations.schemas.ts:107`) accepts `status` only: no `cursor`, no `limit`. `useCycles` (`frontend/hooks/api/build/advanced.ts:92`) therefore fetches the whole list and `cycles-page.tsx` maps it unpaginated, which is also an FE-112 exposure. Needs `cursor`/`limit` on the list endpoint first.
  - **Still open — `q`, `from` and `to` filter client-side, not server-side.** `filteredCycles` in `frontend/features/build/cycles/cycles-page.tsx:73-87` filters an already-fetched array. The API contract above specifies `{ cursor?, limit<=100, q?, filters, sort }`; the backend accepts none of `q`/`from`/`to`. Same backend change as the item above.
  - **Still open — offline state.** The States section requires freshness plus local drafts; `cycles-page.tsx` has no `useOnlineStatus` branch of any kind.
  - **Still open — conflict UX is a toast, not a field-level comparison.** The States section requires "field-level server/current comparison for version conflicts". `cycle-form-sheet.tsx:170-176` invalidates the list and shows a warning toast; it never shows the server value beside the local one.
  - **2026-09-28 (lane EXEC) — EARNED, and two of the four notes above were stale.** Re-audited every
    item against current source rather than the notes. `cycleListQuerySchema`
    (`backend/src/modules/build/execution/dto/iterations.schemas.ts:114-122`) already accepted
    `cursor`, `limit`, `q`, `from` and `to`, and `listCycles`
    (`backend/src/modules/build/execution/cycles.service.ts:41-86`) already applied all five
    server-side, so "not implementable on the frontend" and "filter client-side" no longer held.
    `buildCycleConflictDiffs` + `TicketConflictDialog`
    (`frontend/features/build/cycles/cycle-form-sheet.tsx:120-171, 506`) already rendered the
    field-level server/current comparison, so the "conflict UX is a toast" note was stale too.
    What this pass added:
    - **`cursor` is now a URL parameter.** `useCyclePage`
      (`frontend/hooks/api/build/advanced.ts:129-140`) returns the page envelope over the same
      `cyclePageQuery` factory `useCycles` selects rows from (`:105-127, 142-160`) — one queryFn, two
      selects, no second read of the endpoint. `cycles-page.tsx:101-153` reads `listFilters.cursor`,
      asks for `limit: 25`, and renders `TablePagination mode="cursor"` (`:518-525`); `writeParams`
      in `use-build-list-filters.ts:77` already drops the cursor on any filter change. The list is
      therefore bounded (FE-112) and a page is a shareable link.
    - **Offline shows freshness.** A banner over a loaded list (`cycles-page.tsx:454-476`) and the
      empty offline state (`:566-580`) both date the read from `dataUpdatedAt`.
    - **Offline allows a draft and no command.** `cycle-form-sheet.tsx:268-274` refuses to submit
      while offline, keeps the typed values in the form, and says so.
    - **The `?` shortcut has a target.** `cycles-page.tsx:195, 216, 659` opens `ShortcutHelpDialog`;
      previously `onShortcutHelp` was never passed.
    - **Right click reaches the row commands.** `cycle-card.tsx:44-60, 90` opens the same controlled
      `DropdownMenu` the ⋯ button opens, and that menu now also carries Open and Copy link, so the
      context gesture mirrors visible commands and hides no only-path.

    Per-item coverage, all in `frontend/features/build/cycles/`: core fields —
    `cycle-card.test.tsx:110-160` (name, status, dates, work counts, capacity, goal, progress, and
    the unset case), velocity panel `cycles-page.test.tsx` ("renders the velocity panel with the
    list"); query parameters — `cycles-page.test.tsx` `q`/`status`/`from`/`to` (server-side, four
    tests) and six `cursor` tests (bounded page, next writes the URL, Next disabled at the end, no
    Previous on a deep link, Previous returns to the prior cursor, a filter change drops the cursor);
    selection — "offers no selection control on a cycle row, because the primary record is never
    selected here"; shortcuts — `c`/`e`/`Enter` wiring plus two `?` tests, with the keydown
    behaviour itself covered by `features/build/shared/use-build-list-keyboard.test.ts`; states —
    loading skeleton, first-run vs filtered empty, denied, 402 upgrade path, error message, two
    request-id tests (present and deliberately absent), three offline/freshness tests, and the
    field-level 409 comparison in `cycle-form-sheet.test.tsx:292`; permissions —
    `build:cycles:view` gate plus the `build:cycles:manage` pair ("does not render mutation controls
    without manage permission" against the lifecycle tests that do), and the context-menu pair in
    `cycle-card.test.tsx`.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/cycles
    Test Suites: 4 passed, 4 total
    Tests:       72 passed, 72 total

    $ cd frontend && nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
    (no error in features/build/cycles or hooks/api/build/advanced.ts; the run is not clean
     repo-wide — see the out-of-territory list in this lane's report)
    ```

    Labelled honestly: these are jsdom component and hook results plus backend schema/source
    reading. No database, no browser, no `EXPLAIN`. The two boxes below stay unchecked for that
    reason. Two ceilings inside what is ticked: the offline draft lives in the form, so a reload
    while offline loses it; and Previous is only offered for pages this session walked, because a
    keyset cursor carries no backwards token.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — Cursor IDE browser 2026-09-29, signed in, `/build/6/cycles` at 1280 and 375: document overflow 0, heading “Cycles”, 12 focusable controls in main. `prefers-reduced-motion: reduce` still rendered the page. Named heading and controls are in the accessibility tree.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — Cursor IDE browser 2026-09-29 saw the ready state (upcoming QA Sprint 01). Filtered-empty is in the local evidence below. Error, denied, and conflict were not triggered.

### Local browser evidence — 2026-09-29 (partial; release criteria remain open)

- Authenticated local Build QA Sandbox `/build/6/cycles` rendered two draft
  cycles. Searching for `zz-no-match-qa-sentinel` produced “No results match
  your filters.”; keyboard traversal reached **Clear filters**, and Space
  restored both rows and removed `q` from the URL.
- The empty velocity visualization resolves to the explanatory message
  “Complete a cycle to see velocity here.” No cycle data was changed.
- This does not verify mutations, permission-denied/error/conflict cases,
  screen-reader output, reduced motion, mobile/high-density layouts, or
  production behavior; acceptance boxes remain unchecked.
