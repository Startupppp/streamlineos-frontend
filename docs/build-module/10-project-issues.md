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
    - `cursor` absent from the URL, and the two incompatible `orderBy` enums over one key —
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
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
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
