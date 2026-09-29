# Issues

## Route decision

- **Current/target route:** `/build/[projectId]/issues`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Plan, find, update, and share project work in the preferred layout.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/issues/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Operate the canonical work-item collection.
- **Primary persona:** Contributor and project manager.
- **Success metric:** Issue update latency and saved-view reuse.
- **Required density:** compact by default with a comfortable-density toggle.
- **Core fields:** key, title, type, status, priority, assignees, cycle, module, estimate, due, rank.

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

Deep-linkable query parameters: `layout`, `viewId`, `q`, `type`, `status`, `priority`, `assigneeId`, `cycleId`, `moduleId`, `labelId`, `due`, `group`, `sort`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

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

- Existing feature evidence: `@/features/build/project-detail/project-board-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST /build/:projectId/tickets; POST .../bulk.
- **Client schema/hooks:** `frontend/hooks/api/build/tickets.ts; build-tickets-core-schema.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { key, title, type, status, priority, assignees, cycle, module, estimate, due, rank, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- ~~**P1:** The `c` keyboard shortcut in `project-board-page.tsx` wires `onCreate: handleKeyboardCreate` unconditionally; the webhooks pattern explicitly sets `onCreate` to `undefined` when `useCan("build:tickets:create")` returns false. The shortcut fires the create dialog but `CreateTicketDialog` is internally gated on `useCan`. No test verifies the shortcut is suppressed when permission is denied.~~ **CLOSED 2026-09-27.** The claim was accurate. `project-board-page.tsx` now reads `useCan("build:tickets:create")` — the same key `CreateTicketDialog` checks — and passes `onCreate: canCreateTicket ? handleKeyboardCreate : undefined`, matching `project-webhooks-page.tsx:262`. Four tests in `project-board-page.test.tsx` cover it, including the FE-122 pair: a denied viewer pressing `c` does not reach `handleCreateOpenChange`, and a permitted viewer does. The suite's `useBuildListKeyboard` mock now delegates to the real hook, so both halves of the pair are driven by a real `keydown` rather than a prop assertion. Mutation-checked: forcing `onCreate` back to unconditional fails exactly the two denial tests.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  **NOT EARNED 2026-09-29 (re-audited at HEAD by the closing lane — most of the itemisation below is now stale; four items remain and one of them is BLOCKED — needs Tarun's decision) — see the table immediately below, which supersedes the 2026-09-28 list. Earned when the three engineering items are done and the `cursor` decision is ruled.**

  **2026-09-29, closing lane. THE ITEMISED LIST BELOW IS LARGELY STALE. Re-read item by item on disk; peer lanes closed eleven of the fifteen sub-items since 2026-09-28, including every one the 2026-09-28 note said "is a file another lane owns this run".**

  | Sub-item as listed below | State at HEAD | Evidence |
  |---|---|---|
  | `module` on list row / kanban card | **implemented** (read-only badge) | `list-view-item.tsx:213-215` and `kanban-ticket-card.tsx:187-190`, names from `module-names-context.tsx` |
  | `cycle` on list row | **implemented** | `list-view-item.tsx:210-212` (kanban has the editable `InlineCycle` at `:179-185`) |
  | one assignee vs the assignee set | **implemented** — the note was wrong about the display path | `list-view-item.tsx:69-76` derives `assigneeUsers` / `extraAssigneeCount`, rendered `:188-208` with a `+N` overflow carrying `title={otherAssigneeNames}`. `ticket.assigneeId ?? primaryAssignee?.id` survives only as the inline **editor's** `currentAssigneeId` (`:193`), which is correct — an editor edits one value |
  | two incompatible `orderBy` enums over one key | **implemented — reconciled by aliases, not by picking a winner** | `board-filter-params.ts:16` `DISPLAY_ORDER_ALIASES = { manual: "rank" }` and `use-display-options.ts:97` `SERVER_ORDER_ALIASES = { rank: "manual" }`, consumed by `readOrderBy` `:107-115`. Round-trip pinned at `board-order-params.test.ts:10-38`, so a deep-linked `updated` is no longer coerced away |
  | `orderDir` has no writer | **implemented** | `use-display-options.ts:159` writes it from the direction table `:99-105`; read at `board-filter-params.ts:58`; `board-order-params.test.ts:40-60` |
  | `module` has no writing control | **implemented** | `use-module-filter-param.ts:14-25`, wired `project-views-toolbar.tsx:142,152-162`, read back `board-filter-params.ts:52` |
  | first-run empty state absent at page level | **implemented** | `use-board-url-state.ts:269-271` computes `showFirstRunState` from `!hasActiveFilters && allTickets.length === 0`; `project-board-page.tsx:392` branches on it ahead of `ProjectBoardContent` |
  | `hasActiveFilters` threaded into kanban and never read | **implemented** | `kanban-board.tsx:47,61` → `kanban-board-column.tsx:163` `const kind = hasActiveFilters ? "filtered" : emptyColumnKind(column)` |
  | context menu absent on row and card | **implemented** | `list-view-item.tsx:48-51` and `kanban-ticket-card.tsx:47-50`, both `preventDefault()` + `setMenuOpen(true)`; tested `list-view-item-selection.test.tsx:399-411` and `kanban-card-selection.test.tsx:142-156` |
  | quick actions offer Delete only, and hard-delete contra FE-84 | **implemented and FE-84-correct** | `ticket-quick-actions.tsx` offers Open / Copy link / Copy key / **Archive** / Delete; Archive goes through `useBulkUpdateTickets` with `archive: true` and reports the active-sub-ticket blocker rather than failing silently; Delete is separate, `destructive`, and its copy names what is destroyed. 12 tests in `ticket-quick-actions.test.tsx` |
  | the search debounce is enforced by nothing | **implemented elsewhere than the note looked** | the two "settles rapid search input" tests would indeed pass at 25 ms, but `use-list-filter-params.test.ts:189-205` holds navigation at 299 ms and releases on the 300th and asserts `DEFAULT_SEARCH_DEBOUNCE_MS` is 300; `use-ticket-filter-params.test.ts:178+` repeats it. A 25 ms debounce fails both |
  | empty state carries no create action | **CLOSED BY THIS LANE** | see below |

  **THE ONE ITEM THIS LANE CLOSED, AND WHY IT WAS WORTH CLOSING OVER THE OTHERS.** The first-run empty state existed but was a dead end: icon, two paragraphs, no way forward, on the one screen where every new project starts. `EmptyState` already had an `action` prop, so the fix is one prop at `project-board-page.tsx:392`, gated on `canCreateTicket` — the same `build:tickets:create` the `c` shortcut and the dialog already check, so the three cannot disagree (FE-44). Paired per FE-122: *"offers a create action inside the first-run empty state when the viewer holds build:tickets:create…"* and *"offers no create action … the FE-44 fail-closed counterpart"*, the negative additionally asserting the empty state itself still renders so it cannot pass by the state being absent. **Revert check:** deleting the `action={…}` prop kills the positive test and leaves the negative green, which is exactly the asymmetry FE-122 exists to expose. `nice -n 10 npx jest --maxWorkers=2 features/build/project-detail/project-board-page` → **35 passed**.

  Note the filtered-empty state already had its way out (`project-board-content.tsx` "Clear all filters"); it was only the first-run branch that had none.

  **THREE ENGINEERING ITEMS REMAIN, and each is left with its real cost rather than a line item.**

  1. **`rank` renders nowhere, and there is no `InlineRank` — and rendering it raw would be a defect.** `rank` is a sort key (`board-filter-params.ts:13`), a float whose value carries no meaning to a user; putting it in a cell would put an internal number on screen for no purpose (FE-85's spirit). **What the spec presumably wants is drag-to-reorder, which already exists on the board.** Recommend re-reading this as satisfied-by-drag and striking `rank` from the field list; if a literal column is wanted, that is a product call, not a fix.
  2. **`module` is read-only; there is no `InlineModule`.** The inline-edit family is `card-inline-fields.tsx` / `card-inline-extra-fields.tsx` / `card-inline-date-fields.tsx`, so an `InlineModule` belongs beside `InlineCycle` and has a clear template. Real work, not blocked: a module list read is already available via `useModules`.
  3. **Bulk `add link` is absent, and it needs a backend decision first.** `bulk-action-bar.tsx:53-60` carries Status/Priority/Assignee/Cycle/Label/Parent/Archive/Export and no link control. There is no bulk-link endpoint; doing it client-side means N requests under no shared transaction, with no partial-result contract. **Prerequisite: a backend bulk-link route with the same partial-success envelope the other bulk actions already return.** Left open rather than implemented as a loop.

  **AND ONE ITEM THAT IS NOT ENGINEERING AT ALL:**

  4. **`cursor` in the URL — BLOCKED — needs Tarun's decision. Neither side implemented here, on purpose.** The board pages through `useInfiniteQuery` (`hooks/api/build/ticket-queries.ts:75-90`): it accumulates pages and scrolls. Writing a `cursor` into the URL is not a URL-state gap that can be patched — it means **replacing that paging model with a keyset page**, because a cursor in the URL only means something if the view shows one page at a time. That is a visible change to how the board behaves on every scroll and reload, and it trades a shareable position for the continuous scroll users have today. **The decision, in one sentence:** *should a scrolled position on the issues board be shareable as a link — which means the board stops scrolling continuously and becomes prev/next pages — or does continuous scroll matter more than a shareable position?* Until that is answered, adding the parameter would half-change the model and removing the item would discard a real request. **A related sub-item is also unaddressed by design: Archive and Export both gate on `build:tickets:update` because no `build:tickets:archive` or `:export` key exists in the backend catalogue; minting one is a BE-26 change (FE-45 makes a frontend-only key permanently false), so it is named here rather than faked.**

  <details><summary>The 2026-09-28 itemisation and the lane EXEC note, retained so the audit trail is not rewritten</summary>

  **Superseded — the itemised remainder below is real product work in `list-view-item.tsx`, `kanban-ticket-card.tsx`, `bulk-action-bar.tsx`, `ticket-quick-actions.tsx` and the page-level empty state. One item inside it is BLOCKED — needs Tarun's decision: writing `cursor` into the URL changes this board's paging model from `useInfiniteQuery` to a keyset page, which is a product decision, not a fix.**
  - Audited item by item 2026-09-28. Closed this pass: the FE-122 negative+positive gate pair for `BulkActionBar` on `build:tickets:update` and `build:tickets:assign` (`bulk-action-bar-statuses.test.tsx`), and the `/` shortcut, which had zero behavioural coverage — three tests plus a `<select>` guard test in `use-build-list-keyboard.test.ts`. `contenteditable` stays untested: jsdom does not implement `isContentEditable`, so the guard's third arm is browser-only (FE-123).
  - **P0, BLOCKED ON THE BACKEND — every inline edit on this page returns 400.** `backend/src/modules/build/core/dto/ticket.schemas.ts:174` makes `version` a required field of the `.strict()` `updateTicketSchema` bound to `PATCH /build/:projectId/tickets/:ticketId` (`projects-tickets.controller.ts:249`). The list projection does not return it: `projects-tickets-read.query.ts:16-42` `TICKET_LIST_COLUMNS` omits `version`, `ticketListRowContract` (`hooks/api/build/build-tickets-core-schema.ts:193`) does not pick it, and `KanbanTicket` (`features/build/shared/types.ts:41`) has no such field. So the board, list, table and kanban card surfaces cannot supply the token the mutation requires, and no frontend change can fix it — the projection has to select `version` first. Corroboration: `backend/src/modules/build/core/dto/ticket-schema-bounds.spec.ts` now fails 10 tests, all of them asserting `updateTicketSchema.safeParse({ … })` succeeds without a version. The detail page is fixed (see `10-project-tickets-issue.md`); this page is not.
  - Core fields. `module` and `rank` render on neither the list row (`list-view-item.tsx`) nor the kanban card (`kanban-ticket-card.tsx`) — there is no `InlineModule` or `InlineRank`. `cycle` is missing from the list row only; `status` is missing from the kanban card (it is column identity there); the list row shows one assignee (`ticket.assigneeId ?? ticket.assignee?.id`), not the assignee set the card renders.
  - Query parameters. `cursor` is not in the URL at all — paging is `useInfiniteQuery` page params (`hooks/api/build/ticket-queries.ts:75-90`), so a scrolled position is not shareable. `orderBy` is read by two incompatible enums off the same key (`use-board-url-state.ts:27` vs `use-display-options.ts:20`), so choosing "manual" in Display options silently drops the server sort to `rank` and a deep-linked `updated` is coerced away. `orderDir` has no writer. `module` has a reader and a saved-view path but no control that writes it. Neither board `orderBy`/`orderDir` nor `module` writing has a test.
  - Bulk actions. `add link` is absent — the nearest control is `Set parent` (`bulk-action-bar.tsx:262-267`). Partial success is not implemented: the archive path is all-or-nothing (`project-board-page.tsx:189-194` "Nothing was changed"), not the per-record result the contract states, and no test invokes the mutation's `onSuccess`/`onError` at all. Archive and Export gate on `build:tickets:update`; there is no archive or export permission key.
  - Shortcuts. All seven fire and are tested, but `enabled: view === "list"` is asserted only at the prop (`project-board-page.test.tsx:510/518`) — no test presses a key while `view === "board"`, so the `if (!enabled) return` short-circuit is never behaviourally exercised.
  - Context menu. Absent. Neither `list-view-item.tsx` nor `kanban-ticket-card.tsx` has an `onContextMenu` handler or a `ContextMenu`. The per-row affordance is `ticket-quick-actions.tsx`, which offers Delete only — no open, copy link, copy key, edit, move/link, and it hard-deletes rather than archiving (contra FE-84). No test.
  - States. The first-run empty state does not exist at page level: `usePageState` is given only `isEmpty: showEmptyFilterState` (`project-board-content.tsx:136`), which is false when no filter is active, so a new project falls through to per-view copy — three different strings in `list-view.tsx` and per-column "No tickets" in kanban, with no create action in any of them. `hasActiveFilters` is threaded into `kanban-board.tsx:47` and never read, so that view cannot tell the two cases apart even in principle. `project-backlog-page.tsx:387` shows the two-branch pattern this page should follow. Offline is implemented and paired (`project-board-content.test.tsx:204/213`) but reachable only through the `empty` slot, and it shows no freshness timestamp and keeps no local drafts. The request id renders via `ErrorReference`/`correlationId` but no test on this page asserts it, and no test drives a 402 through the tickets read — the one FE-41 test (`project-board-page.test.tsx:326`) covers the project read only.
  - Untested response-shaping value: the search debounce. `DEFAULT_SEARCH_DEBOUNCE_MS = 300` (`components/list-view/list-filter-spec.ts:41`) is enforced by nothing — both "settles rapid search input" tests assert `not.toHaveBeenCalled()` before advancing any timer, so a 25 ms debounce passes them identically.
  - **2026-09-28 (lane EXEC) — three of the notes above are stale; the rest of the gap is outside
    this lane's write territory, so the box stays unchecked.** Re-read the source rather than the
    notes:
    - **The P0 is closed.** `version` is in the list projection
      (`backend/src/modules/build/core/tickets/projects-tickets-read.query.ts:40`, beside
      `health: true` at `:39`) and in `ticketListRowContract`
      (`frontend/hooks/api/build/build-tickets-core-schema.ts:219`), pinned by
      `backend/src/modules/build/core/dto/build-ticket-list-contract.spec.ts:58` and
      `frontend/hooks/api/build/ticket-list-contract.test.ts:12`. `Ticket.version` and
      `UpdateTicketInput.version` are required, not optional
      (`frontend/types/projects/tasks.ts:112,187`), so a list-fed surface cannot build a body without
      the token. Every inline edit on this page therefore no longer 400s.
    - **Partial success is implemented**, not all-or-nothing. `project-board-page.tsx:190-207` splits
      three ways — every row blocked ("Nothing was changed"), some blocked (a warning naming both
      counts), none blocked (a plain success) — and `project-board-page.test.tsx:489,510` invokes the
      mutation's own `onSuccess` for the first two.
    - **The `enabled` short-circuit is exercised behaviourally**, not only at the prop:
      `project-board-page.test.tsx:633` presses `c` with `view === "board"` and a permitted viewer and
      asserts the create dialog is not asked to open.

    What remains is real, and every fix site is a file another lane owns this run, so it is reported
    rather than edited:
    - Core fields `module` and `rank` on the list row and kanban card, `cycle` on the list row, and the
      assignee set rather than one assignee — `frontend/features/build/views/list-view-item.tsx`,
      `frontend/features/build/views/kanban-ticket-card.tsx`.
    - (superseded) `cursor` absent from the URL, and the two incompatible `orderBy` enums over one key —
      `frontend/features/build/views/use-board-url-state.ts:27` vs
      `frontend/features/build/views/use-display-options.ts:20`; `orderDir` still has no writer, and
      `module` still has no control that writes it.
    - The `add link` bulk action, and the fact that Archive and Export gate on `build:tickets:update`
      because no archive or export permission key exists —
      `frontend/features/build/shared/bulk-action-bar.tsx:262-267`.
    - The context menu: no `onContextMenu` on either row or card, and `ticket-quick-actions.tsx` offers
      Delete only and hard-deletes rather than archiving (contra FE-84) —
      `frontend/features/build/views/ticket-quick-actions.tsx`.
    - The page-level first-run empty state, and `hasActiveFilters` threaded into
      `frontend/features/build/views/kanban-board.tsx:47` and never read —
      `frontend/features/build/views/project-board-content.tsx:136`.
    - The unenforced search debounce: `DEFAULT_SEARCH_DEBOUNCE_MS = 300`
      (`frontend/components/list-view/list-filter-spec.ts:41`) is asserted by tests that check
      `not.toHaveBeenCalled()` before advancing any timer, so a 25 ms debounce would pass them.

    Cycles and the issue detail page earned this criterion this pass; the pattern those two used —
    a URL cursor through `useBuildListFilters` + `TablePagination mode="cursor"`, a dated offline
    banner, and a right click opening the row's own controlled menu — is what these six items need.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/project-detail
    Test Suites: 2 passed, 2 total
    Tests:       40 passed, 40 total
    ```

    That run covers the two stale notes about this page's own component: the partial-success branches
    and the board-view keyboard suppression. `features/build/views/**` was not re-run by this lane —
    it is another lane's write territory this run and was being edited concurrently — so the six
    items listed above are reported from source, not from a suite result.

  - **2026-09-28 (lane PLAN) — of the six items reported above, four are now implemented and tested,
    one is implemented except for its `cursor` half, one is adjudicated, and the box stays unchecked on
    that `cursor` half, which no render-layer change can reach.**
    `features/build/views/**`, `features/build/shared/bulk-action-bar.tsx` and
    `components/list-view/list-filter-spec.ts` were handed to this lane for this unit.
    - **Core fields.** `module` now renders **by name**: `useModules` resolves the project's modules
      once in `project-board-content.tsx:136` and a `ModuleNamesProvider`
      (`features/build/views/module-names-context.tsx`) carries the id→name map to both leaves, so
      neither prop-threads through four levels of kanban. The list row's old `M-{moduleId}` chip was a
      raw id on screen (FE-85) and is gone — `list-view-item.tsx:213-215` renders the name and
      **renders nothing** for a module the board has no name for, rather than falling back to the id;
      the kanban card gains the same chip at `kanban-ticket-card.tsx:187-191`. Five cases across
      `list-view-item-selection.test.tsx` and `kanban-card-selection.test.tsx` pin the name, the
      absence for an unknown id, and the absence when the ticket has no module.
    - **The assignee set** now reaches the list row, which previously showed one assignee while the
      card showed the set: `list-view-item.tsx:69-78` resolves `ticket.assignees` (declared on the row
      type at `list-view-shared.ts:24`, a render-side widening of a field the list read already
      returns) and `:202-209` renders `+N` with the other names in its title. Three cases: two
      assignees beyond the first, no chip for a single assignee, no chip for a row with no set.
    - **`rank` is adjudicated, not printed.** It is a lexorank string (`0|hzzzzz:`), an internal
      ordering key; printing it would be exactly the raw-identifier render FE-85 forbids, and no
      tracker shows it. The field is surfaced as what it produces: the manual order, and the drag
      handle that rewrites it (`list-view-item.tsx:105-112`). Two cases pin that the handle appears
      when the row is manually orderable and that the lexorank string never appears in the row.
    - **One `orderBy` key, one meaning.** The two enums remain two vocabularies — the panel says
      `manual`, the read endpoint says `rank` — but the alias is now explicit and two-way:
      `board-filter-params.ts:15` maps `manual`→`rank` on the way to the server and
      `use-display-options.ts:105-115` maps `rank`→`manual` on the way back, so a deep link in either
      spelling survives a round trip instead of silently falling back. The audit's second claim was
      wrong and is corrected here: `updated` is in **both** enums and was never coerced away; the
      only mismatched spelling was manual/rank.
    - **`orderDir` has a writer.** `writeDisplayOptionParams` now writes a direction beside every
      order it writes (`use-display-options.ts:159`), derived from the order itself
      (`orderDirectionFor`, `:117-119`): rank and due date ascend, created/updated/priority descend.
      Twelve cases in `board-order-params.test.ts` pin the aliases both ways, every order's direction,
      that the read endpoint accepts every direction the panel writes, and both deep-link directions.
    - **`module` has a control.** The toolbar's module select existed but was fed nothing: no caller
      passed `modules`, so `modules.length > 0` was always false and the control never rendered.
      `project-views-toolbar.tsx:141-147` now falls back to the project's own `useModules` and to its
      own URL writer (`use-module-filter-param.ts`) when the caller wires neither, so the control is
      real without a change in the page that owns the toolbar's props. Five cases pin the render from
      the project's modules, the absence when the project has none, the URL write, the clear, and
      that a caller's own handler still wins.
    - **The context menu exists, and `ticket-quick-actions.tsx` is no longer Delete-only.** It is a
      menu of Open, Copy link, Copy key, Archive and Delete
      (`ticket-quick-actions.tsx:128-166`), controllable by the row so a right click opens it:
      `list-view-item.tsx:92` and `kanban-ticket-card.tsx:92` `preventDefault` and open the row's own
      menu, the shape `components/ui/data-table.tsx`'s new `onRowContextMenu` uses on the releases
      table. Twelve cases in `ticket-quick-actions.test.tsx` plus four in the two row suites.
    - **The hard delete is fixed as a defect, not papered over.** `DELETE /build/:projectId/tickets/:id`
      soft-deletes the ticket row but **hard-deletes** its assignees, comments, attachments, label
      mappings, watchers, timesheets and relations
      (`backend/src/modules/build/core/tickets/projects-tickets-delete.service.ts:93-118`), so FE-84's
      "archive, never delete" applies squarely. Archive is now the row's reversible path: it posts
      `{ ticketIds: [id], archive: true }` to the bulk endpoint, which only stamps `deleted_at` and
      refuses a ticket with active sub-tickets outside the selection
      (`core/tickets/build-ticket-bulk-mutation.ts:161-198`); the blocker comes back as a message
      rather than a silent no-op. Delete survives for `build:tickets:delete` holders and its dialog now
      names what it destroys. Five cases cover the archive payload, the blocker message, the
      confirmation gate, and that delete and archive never call each other's mutation.
    - **First run and filtered-empty are different screens.** `project-board-content.tsx:142` resolves
      `isEmpty` from the collection rather than from the filter flag, and `:412-418` picks the panel:
      offline wins, then filtered, then first-run (`:178-197`). The workload view is deliberately
      exempt — it aggregates people, not only work, so an empty ticket list is not an empty view.
      `hasActiveFilters` is no longer threaded-and-ignored: `kanban-board.tsx:238,298` pass it to
      `kanban-board-column.tsx:126`, and `ColumnEmptyState` (`:148-166`) says "No matches here"
      under an active filter instead of inviting a drop. Eight cases across
      `project-board-content.test.tsx` and `kanban-column-empty-state.test.tsx`.
    - **The tickets read's own 402 and request id are now driven.** Four cases in
      `project-board-content.test.tsx` render the component with a 402 `MODULE_NOT_ENABLED` and assert
      the upgrade path, with a 500 and assert the backend message survives, and with and without a
      `correlationId` and assert the reference appears only when the envelope carries one.
    - **The search debounce now bites.** Both existing tests advanced the timer by the full 300 ms, so
      a 25 ms debounce passed them. `use-list-filter-params.test.ts` adds a case that advances **299**
      (asserting no navigation) and then **1** (asserting exactly one), with the 299 and the 1 as
      literals rather than arithmetic on the constant. A second case pins that a spec's own
      `searchDebounceMs` overrides the default, so the wait is not hardcoded in the hook.
      `features/build/shared/use-ticket-filter-params.test.ts` — the Build ticket list's own debounce,
      which reaches the same constant through `useListFilterParams(TICKET_FILTER_SPEC)` — carried the
      same weak assertion and now has the same 299/1 boundary plus a case pinning that each keystroke
      restarts the wait. Mutation-checked across both files at once: `DEFAULT_SEARCH_DEBOUNCE_MS = 25`
      fails exactly three cases — the two new ones there and the one in `components/list-view` — and
      nothing else.
    - **`add link` is adjudicated, not shipped.** There is no bulk link endpoint: `bulkUpdateSchema`
      accepts `assigneeId`, `status`, `cycleId`, `priority`, `parentTicketId`, `labelIds` and `archive`
      and nothing else (`backend/src/modules/build/core/dto/ticket.schemas.ts:196-216`), and work-item
      relations have only per-ticket routes. The bar's one real link is therefore the parent link
      (`Set parent`), now pinned by a test. Improvising N per-ticket relation calls from the bar would
      invent a fan-out with no per-record result, which is the opposite of what this section asks for.
    - **Archive and Export are adjudicated: no key is missing.** Archive gates on
      `build:tickets:update` because that is the key its endpoint declares
      (`projects-tickets.controller.ts:179-180`), which is what FE-45 requires; Export's own mutation
      independently gates on `build:tickets:view` (`hooks/api/build/ticket-import-export.ts:93-95`).
      The bar as a whole is selection-driven and returns null without `build:tickets:update`, and
      selection itself is offered only to that same standing
      (`project-board-content.tsx:144-147`), so no separate archive or export permission exists **or
      is needed**. Minting one would have to land in the backend catalog and the frontend catalog in
      one change (FE-45, BE-112) — out of this lane, and a half key makes `useCan` false forever.
      Five cases pin the two controls' presence, their absence on denial, and their absence when the
      caller wires no handler.
  - **Still open — `cursor` is not in the URL, and no render-layer change can put it there.** The
    board pages through `useInfiniteQuery` page params
    (`frontend/hooks/api/build/ticket-queries.ts:67-90`), so the cursor lives in Query's own
    `pageParam` and a scrolled position is not shareable. Fixing it means changing that hook's read
    shape — either a URL-backed cursor through `useBuildListFilters` plus `TablePagination
    mode="cursor"`, as cycles and the issue detail page did, or keeping infinite scroll and accepting
    that the criterion's `cursor` parameter is void for this page. This lane was fenced out of
    `ticket-queries.ts` (the execution lane is paginating the epic list through it in the same run),
    so the box stays unchecked on this one item rather than being ticked over a gap.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/views
    Test Suites: 22 passed, 22 total
    Tests:       214 passed, 214 total

    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 components/ui/data-table \
        features/build/shared/bulk-action-bar-statuses components/list-view
    Test Suites: 5 passed, 5 total
    Tests:       67 passed, 67 total

    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/views features/build/shared \
        components/list-view features/build/project-detail
    Test Suites: 45 passed, 45 total
    Tests:       519 passed, 519 total

    $ cd frontend && npx eslint features/build/views features/build/shared/bulk-action-bar.tsx components/list-view
    (0 errors)

    $ cd frontend && node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.specs.json
    (nothing under features/build/views, features/build/shared/bulk-action-bar* or components/list-view)
    ```

  - **2026-09-28 (lane EXEC) — the `cursor` parameter is now read, honoured and tested, but the board
    still authors no cursor into the URL, so the box stays unchecked on that half.**
    Of the two shapes the note above names, the smaller one landed: the cursor is the board read's
    starting position rather than a replacement for infinite scroll.
    - `BoardFilters` carries an optional `cursor` and it seeds the infinite query's first page —
      `frontend/hooks/api/build/ticket-queries.ts:64,90`. It is part of the query key, as this spec's
      caching sentence requires, so a shared link is a distinct cache entry and is not answered by the
      top of the list.
    - `useBoardFilterParams` reads `cursor` off the URL into `boardFilters`
      (`frontend/features/build/views/board-filter-params.ts:50,76`). A cursor is valid for one
      normalized filter/sort shape only, so the hook stops using it in the same render the shape
      changes and removes it from the URL — whichever writer changed the shape, including the board
      writers that bypass `buildListSearchParams`
      (`board-filter-params.ts:52-77`). It is not counted as an active filter, so a shared link does
      not render as filtered-empty.
    - Five cases in `frontend/hooks/api/build/board-cursor-page-param.test.ts` and eight in
      `frontend/features/build/views/board-cursor-param.test.tsx`. Mutation-checked: dropping the
      `initialPageParam` seed and the shape reset together fails 5 of the 13.
    - Every other consumer of `useProjectBoardTickets` — board, backlog, triage, workload, the epics
      and cycles rollups, meetings and ticket relations — passes no cursor, so its key is unchanged
      and it still pages from the top. One case asserts that absence rather than trusting it.
    - No render file under `features/build/views/**` changed what it reads; the change is in the URL
      hook they already call.

    **Why the box is still unchecked.** Nothing in the page writes a cursor, so a reader cannot share
    the position they are at — only a hand-built link works. Both ways to add that writer cost more
    than they earn, and the choice belongs to whoever owns the board's paging:
    - Writing the cursor as the reader advances re-keys the infinite query, which drops every loaded
      page mid-scroll and flashes the skeleton. That is a visible regression on a page whose paging is
      infinite scroll by FE-125.
    - Keeping the cursor out of the cache key removes that churn, but contradicts this spec's own
      caching sentence ("key includes scope, normalized filters, sort, cursor") and lets a window that
      started elsewhere answer a cursored link.
    The remaining alternative is the other shape the lane above named — replacing infinite scroll with
    `TablePagination mode="cursor"` across both the kanban and the list view — which changes what the
    render files read and how the board behaves, and was not in scope here.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/views \
        features/build/backlog features/build/workload features/build/epics \
        features/build/project-detail hooks/api/build
    Test Suites: 106 passed, 106 total
    Tests:       1126 passed, 1126 total

    $ cd frontend && npx eslint hooks/api/build/ticket-queries.ts \
        features/build/views/board-filter-params.ts \
        features/build/views/board-cursor-param.test.tsx \
        hooks/api/build/board-cursor-page-param.test.ts
    (0 errors)

    $ cd frontend && npx tsc --noEmit -p tsconfig.json
    (nothing in ticket-queries.ts or board-filter-params.ts)

    $ cd frontend && npx tsc --noEmit -p tsconfig.specs.json
    (nothing in either new spec)
    ```

    **The board-card a11y suite is green again, against the card's *current* contract.**
    `features/__tests__/build-board-cards-a11y.test.tsx` had been red since `useCan` entered
    `kanban-ticket-card.tsx` — it mocks no access module, so `useSession` throws, verifiable at the
    commit before this lane's first. It now mocks `useCan`, and three of its assertions described a card
    that no longer exists: its `TicketQuickActions` double rendered a lone `Delete ticket` button, so
    the tab-order test asserted a label the card stopped having when the row action became a menu. The
    double is now the real shape — one `Ticket actions` trigger plus, while the row holds it open, a
    `role="menu"` — and four cases cover what the card gained: the trigger is named for the menu and not
    for one command inside it, a right click opens that menu without inserting a focus stop before the
    title, axe passes with the menu open, and the module chip is non-interactive so the card's only
    controls remain the title and its menu.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/__tests__/build-board-cards-a11y
    Tests:       8 passed, 8 total
    ```

    Component-test evidence only: no database, no browser, no dev server. One unrelated suite is red in
    this tree and belongs to the Knowledge Base workstream, not to this lane:
    `features/__tests__/heavy-module-lazy-boundaries.test.ts` reports `platejs` eagerly reachable from
    `app/(authenticated)/build/[projectId]/wiki/[pageId]/page.tsx`. No file this lane touched appears in
    that import graph.

  </details>
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
  - Keyboard, create-shortcut permission gate: verified in jsdom.

    ```text
    $ cd frontend && npx jest --silent features/build/project-detail features/build/views features/build/shared/use-build-list-keyboard
    Test Suites: 20 passed, 20 total
    Tests:       181 passed, 181 total
    Snapshots:   0 total
    Time:        14.485 s

    $ cd frontend && npx tsc -p tsconfig.json --noEmit
    (no output, exit 0)
    ```

  - **BROWSER-ONLY** and NOT ticked: `Tab` focus order, focus management in overlays, screen-reader output, `prefers-reduced-motion`, real 375 px layout, and high-density desktop. jsdom cannot observe any of them (FE-123).
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

### Local browser evidence — 2026-09-29 (partial; release criteria remain open)

- `/build/6/issues`, authenticated local Build QA Sandbox: searched for a unique
  no-match sentinel and observed the filtered-empty message. Activating
  **Clear all filters** with keyboard Space removed `q` from the URL and
  restored the ticket board, but the search field retained the sentinel.
- Fixed the stale local search draft in
  `frontend/components/list-view/use-list-filter-params.ts`; the regression
  first failed, then the focused hook suite passed 24/24. Repeated the same
  browser sequence after hot reload: `q` was removed, tickets returned, and
  the search field was empty. The separate **Clear search** control also
  removed the query and restored tickets.
- This verifies one local filtered-empty/search-clear flow only. It does not
  establish the production, authorization, error/denied/conflict, responsive,
  or broader accessibility criteria above.
- Separately inspected the populated board at an explicit 375 × 812 viewport:
  the mobile module bar is present, issue cards/columns remain reachable via
  horizontal board scrolling, and the core search/view/filter controls fit the
  mobile toolbar. This is one visual check, not full mobile or zoom acceptance.
- At 320 × 700, the Issues toolbar wraps into a second row and the mobile module
  bar stays visible; at 768 × 900, the board retains its horizontally scrollable
  columns. This is breakpoint spot-check evidence only.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
