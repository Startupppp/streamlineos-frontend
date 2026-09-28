# Epics

## Route decision

- **Current/target route:** `/build/[projectId]/epics`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Track progress and dependencies across a coherent initiative.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/epics/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Group related work toward a larger outcome.
- **Primary persona:** Product manager.
- **Success metric:** Epic completion predictability.
- **Required density:** compact by default with a comfortable-density toggle.
- **Core fields:** title, owner, status, progress, dates, child work, dependencies.

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

Deep-linkable query parameters: `status`, `ownerId`, `health`, `q`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

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

- Existing feature evidence: `@/features/build/epics/epics-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST/PATCH /build/:projectId/epics.
- **Client schema/hooks:** `frontend/hooks/api/build/advanced.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { title, owner, status, progress, dates, child work, dependencies, version, createdAt, updatedAt }, meta }`.
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
  - 2026-09-27 investigation: Backend epics service (`epics.service.ts:67,86`) throws `TicketVersionConflictException`; `sibling-version-conflict.spec.ts` covers epic conflict (2/2 paired). `health` storage landed (`migrations/1419_build_ticket_health.sql`, journalled — the "not yet journalled" note above was stale) and `dependencyCount` is projected by `listEpics()`.
  - 2026-09-28 per-item audit. **Closed since the last entry:** `status` and `ownerId` were dead query parameters — `useBuildListFilters()` was called with no `filters` array (`frontend/features/build/epics/epics-page.tsx`), so `listFilters.value("status")` and `value("ownerId")` returned the `all` sentinel on every render and both filter predicates were tautologies. They are now declared, given toolbar controls, and covered. `c`/`e`/`Enter` now have targets (previously `onOpen` was `() => {}` and no `onEdit`/`onCreate` was passed). The empty state now distinguishes first-run from filtered-empty. 12/12 in `epics-page.test.tsx`, 12/12 in `epics-page-bulk.test.tsx`.
  - **P0 still open — epic edit and story-link PATCH are both dead, and the fix is outside this lane.** `updateTicketSchema` requires `version: z.number().int().positive()` and is `.strict()` (`backend/src/modules/build/core/dto/ticket.schemas.ts:175`). This page reads `useProjectBoardTickets`, whose projection omits `version`: `TICKET_LIST_COLUMNS` (`backend/src/modules/build/core/tickets/projects-tickets-read.query.ts:16-43`) does not select it and `ticketListRowContract` (`frontend/hooks/api/build/build-tickets-core-schema.ts:193-220`) does not `pick` it, although `ticketRowContract:52` and `ticketDetailContract` both have it. So no list-fed surface can build a valid body, and `EditEpicDialog.handleSubmit` (`frontend/features/build/epics/edit-epic-dialog.tsx:99`) plus `handleLinkStory` (`epics-page.tsx`) both send an untokened PATCH that 400s. Three files must change together: add `version: true` to `TICKET_LIST_COLUMNS`, add `version: true` to the `ticketListRowContract` pick, and make `version` required (not `version?: number`) on `Ticket` and `UpdateTicketInput` in `frontend/types/projects/tasks.ts:112,187` — an optional token is what let this ship. Only then can this page send it.
  - **Still open — `health` query parameter.** No filter control and no read. The board list query (`frontend/hooks/api/build/ticket-queries.ts:66`) has no `health` param and `ticketListRowContract` carries no `health` field, so the column exists but is unreachable from this surface.
  - **Still open — `cursor` query parameter.** `epics-page.tsx` flattens every `useProjectBoardTickets` page and never reflects a cursor in the URL.
  - **Still open — core fields `owner`, `dates` and `dependencies` are not rendered.** `frontend/features/build/epics/epic-card.tsx` renders title, priority, status and a progress bar (`:282-286`) only; it renders no assignee, no `startDate`/`dueDate`, and no dependency count. `dependencyCount` is projected by `listEpics()` but this page does not call that endpoint.
  - **Still open — offline and conflict states.** No `useOnlineStatus` branch and no 409 handler anywhere on this surface.
  - **2026-09-28 (lane EXEC) — nine items closed, one blocker left, so the box stays unchecked.**
    The P0 above is stale: `version` is projected
    (`backend/src/modules/build/core/tickets/projects-tickets-read.query.ts:40`), picked
    (`frontend/hooks/api/build/build-tickets-core-schema.ts:219`), required on the types
    (`frontend/types/projects/tasks.ts:112,187`), and sent by every PATCH this page reaches —
    `edit-epic-dialog.tsx:102`, `epics-page.tsx` `handleLinkStory`, and the eight inline controls in
    `epic-story-row.tsx`. Closed this pass:
    - **`health`** is now a declared URL parameter with a toolbar control and a real predicate
      (`frontend/features/build/epics/epics-page.tsx:62-74, 142, 148, 406-418`). It filters the rows
      this page already holds, not the request, because one `useProjectBoardTickets` read feeds the
      epic list, the story list, the task count and every child rollup — narrowing it server-side by
      `health` would silently empty the other three.
    - **Core fields `status` and `dependencies`.** `epic-card.tsx:264-266` renders the epic's own
      status beside its priority (they were conflated before), and `:300-306` renders the dependency
      count `listEpics()` projects, merged in by id from `useEpics` at `epics-page.tsx:143-149`.
      An epic the endpoint does not know keeps no count rather than being shown a zero.
    - **Offline.** A dated banner over a loaded list (`epics-page.tsx:462-482`) and a dated offline
      state in place of the first-run empty (`:511-539`).
    - **Conflict.** `edit-epic-dialog.tsx:69-113, 236-243` diffs the pending form against the epic
      and renders the server/current comparison through `TicketConflictDialog` on a 409
      `PROJECTS_TICKET_CONFLICT`, falling back to naming the version when the drift is in a field
      this form does not edit.
    - **The bulk set.** `label`, `move/link` (parent), `archive` behind a `ConfirmDialog`, and `export`
      are wired (`epics-page.tsx:246-303, 430-437`), and partial success is surfaced per record:
      `:200-224` reports `blocked` separately, says "Nothing was changed" when every row was blocked,
      and only claims a plain success when the server blocked nothing.
    - **The `?` shortcut** has a target (`:281, 307, 585`).
    - **Right click** opens the same authorized menu as the ⋯ button (`epic-card.tsx:156-161, 224, 276`).

    Tests: 56 in `features/build/epics` across five suites, including the new
    `epic-card-core-fields.test.tsx` (status/priority, owner by display name, dates, dependency count
    with singular/zero cases, the unset case, and the context-menu permission pair),
    `edit-epic-dialog-conflict.test.tsx` (the field-level comparison, the non-409 toast that proves
    the branch is not always on, and the version fallback), eight new bulk tests in
    `epics-page-bulk.test.tsx` (label, parent, archive-after-confirm, three partial-success branches,
    export downloading its file), and in `epics-page.test.tsx` two `health` predicate tests, two
    dependency-count tests, three offline tests, two `?` tests, two request-id tests and two
    link-story token tests.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/epics
    Test Suites: 5 passed, 5 total
    Tests:       56 passed, 56 total
    ```

    **`cursor` EARNED 2026-09-28 (lane EXEC, second unit) — the epic list now has its own paginated
    endpoint, so the box is ticked.** The earlier correction below diagnosed the obstruction
    correctly — one `useProjectBoardTickets` read fed the epic list, the story list, the task count
    and every child rollup, so a cursor over it would have paginated all four — and the fix was the
    read restructure it named, not a parameter.

    Backend. `GET /build/:projectId/epics` now takes `epicListQuerySchema`
    (`backend/src/modules/build/execution/dto/iterations.schemas.ts:254-265`, `.strict()`) and returns
    `epicPageSchema` (`dto/execution-response.schemas.ts:226-233`), the same envelope the modules and
    cycles routes already return. `EpicsService.listEpics`
    (`execution/epics.service.ts:27-101`) is a keyset page: `decodeTimestampCursor` +
    `keysetBeforeMicros(tickets.createdAt, tickets.id, position)` over
    `ORDER BY created_at DESC, id DESC`, over-fetching `limit + 1` and capping at `PAGE_SIZE_CAP`
    (BE-24, BE-25 — no total is returned and none is faked). It also applies every filter this page
    offers in SQL: `q` (escaped `ILIKE`, the same form `listCycles` already ships), `status`, `health`,
    and `ownerId` resolved through the tenant's own `organization_members`, so a user id from another
    org selects nothing. `dependencyCount` still rides on each row, which removed the second read the
    page previously used to merge counts in.

    Frontend. `hooks/api/build/epics.ts` is a new domain module (FE-29) holding one query factory with
    two observers: `useEpicPage` returns the envelope, `useEpics` selects `page.data` so its ~15
    existing consumers — the ticket sidebar, the board, backlog, triage, workload and the peer lane's
    render files — keep the exact `Epic[]` they had. `advanced.ts` re-exports both, so no consumer's
    import path changed. `epicPageContract`
    (`hooks/api/build/execution-schema.ts:158-166`) parses the envelope and flattens the nested
    `assignee: { user }` the backend sends into the `Ticket`-shaped owner the card renders, tolerating
    a null user rather than rejecting the page; `hooks/api/build/epic-page-contract.test.ts` covers
    the flatten, the unassigned row, the dependency count, and a rejection of the old bare array.

    `epics-page.tsx:141-193, 700-710` now reads the epic collection from `useEpicPage` with
    `limit: 25` and the URL cursor, renders `TablePagination mode="cursor"` under the list, and keeps
    `useProjectBoardTickets` solely for the stories, tasks, "Stories without Epic" section and the
    per-epic rollups — the four collections the earlier correction said a shared cursor would break.
    The four client-side epic predicates are gone; the page forwards `q`/`status`/`ownerId`/`health`
    to the server instead. A failed epic read now resolves the page to its error state with the
    request id (`:157, 232`), which it previously could not, because `epicsFailed` was unused.

    Evidence:

    ```text
    $ cd backend && nice -n 10 npx jest --maxWorkers=2 "src/modules/build/execution/.*\.spec\.ts$"
    Test Suites: 29 passed, 29 total
    Tests:       328 passed, 328 total

    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/epics
    Test Suites: 5 passed, 5 total
    Tests:       69 passed, 69 total

    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 hooks/api/build
    Test Suites: 72 passed, 72 total
    Tests:       734 passed, 734 total

    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build hooks/api/build
    Tests:       3983 passed, 4 failed — the four are the peer lane's uncommitted
                 features/build/views/list-view-item.tsx edit and the pre-existing
                 features/__tests__/menu-driven-sheet-focus.a11y.test.tsx barrel-mock defect

    $ cd backend && nice -n 10 node --max-old-space-size=10240 tsc --noEmit -p tsconfig.json
    (no error in build/execution except the pre-existing milestone-owner-linked-work.spec.ts cast)

    $ cd frontend && nice -n 10 node --max-old-space-size=8192 tsc --noEmit -p tsconfig.json
    (no error in features/build/epics or hooks/api/build/{epics,advanced,execution-schema}.ts)
    ```

    New backend tests: `execution/epics-cursor-pagination.spec.ts` — 12 tests covering the envelope,
    the over-fetch and trim, the `(createdAt, id)` cursor for two epics minted in the same
    microsecond, the two-column order, the bound cursor position, a tampered cursor falling back to
    page one, the `PAGE_SIZE_CAP` clamp, and each filter bound in SQL plus the not-always-on case.
    New frontend tests in `epics-page.test.tsx`: the forwarded filter set, the sentinel case, the
    server's rows rendered without re-filtering, the URL cursor forwarded, Next writing the next
    cursor, Next disabled at the end, no Previous on a deep link, Previous returning to the prior
    cursor, no footer on an empty page, and the failed-epic-read error state with its request id.
    The two former client-side filter tests in `epics-page-bulk.test.tsx` now assert the parameter is
    forwarded and the returned page rendered.

    Offline drafts closed with it: `create-epic-dialog.tsx:59-65` and `edit-epic-dialog.tsx:171-177`
    hold the typed draft and send no command while offline, paired positive-and-negative in
    `edit-epic-dialog-conflict.test.tsx`.

    Two things this does not claim. The route's response shape changed from a bare array to a page
    envelope, so the vendored `frontend/contracts/openapi.json` needs regeneration by the
    orchestrator (`pnpm openapi:generate`); this lane did not run it and did not edit the file. And
    the page-level shortcut tests still assert the props handed to `useBuildListKeyboard` — the
    keydown behaviour is covered in `features/build/shared/use-build-list-keyboard.test.ts`, which is
    a different file's guarantee.

    **Superseded premise correction, kept for the record.** The text below is what this note replaces:
    it read that `cursor` "is not earnable on this page as it is built", for the read-shape reason
    restated above. The diagnosis held; the restructure it asked for is what landed.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
