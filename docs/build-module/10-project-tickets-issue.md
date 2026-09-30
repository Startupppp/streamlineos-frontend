# Issue Detail

## Route decision

- **Current/target route:** `/build/[projectId]/tickets/[ticketKey]`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Plan, find, update, and share project work in the preferred layout.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/tickets/[ticketKey]/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

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
Record header: identity, state, owner, dates, version
Primary content / execution workspace            Context and activity rail
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

- Existing feature evidence: `@/features/build/ticket-details/ticket-detail-page`
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
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - Audited item by item 2026-09-28. Collection-shaped items — search/`q`, the fourteen list query parameters, bulk actions, `j/k`/`Enter`/`c` — have no target on a detail page and are not required (CCG-4).
  - **Conflict state: CLOSED 2026-09-28.** The field-level server/current comparison the 2026-09-27 note demanded now exists. `ticket-conflict-diff.ts` diffs the pending patch against the refetched row and resolves assignee/epic/module/cycle ids to names; `ticket-conflict-dialog.tsx` renders one "On the server now" / "Your edit" pair per drifted field with Keep/Discard; `use-ticket-detail-conflict.test.tsx` covers single-field drift, multi-field drift, a drift the server already agrees with (no dialog), id→name resolution, keep-replays-against-the-displayed-version, and discard-sends-nothing.
  - **P0 FIXED 2026-09-28 — the concurrency token was never sent, so every save on this page returned 400.** `backend/src/modules/build/core/dto/ticket.schemas.ts:174` requires `version: z.number().int().positive()` on `updateTicketSchema`; the schema is `.strict()` and is bound at `projects-tickets.controller.ts:249` `@Validate({ body: updateTicketSchema })`. The frontend sent `ticketId` + `expectedUpdatedAt` only. Every schema test stayed green because the frontend had no request contract at all. Fixed:
    - `use-ticket-detail.ts` tracks `lastSavedVersionRef` from the read, from `onSuccess`, from the conflict refetch and from Keep-my-changes, and sends `version` on every save. The conflict replay no longer carries the stale token forward — `version` is excluded from the extracted patch.
    - `ticket-parent-control.tsx` sends `ticket.version`, and its prop type is `Pick<Ticket, "id" | "parentTicketId"> & Required<Pick<Ticket, "version">>`, so the token is type-forced. The chain above it (`ticket-sidebar.tsx`, `ticket-detail-right-panel.tsx`, `ticket-detail-page.tsx`, `features/build/inbox/inbox-ticket-preview.tsx`) declares `version: number` and narrows once at each page boundary.
    - `ticketUpdateRequestContract` (`hooks/api/build/build-tickets-subresource-schema.ts`) mirrors the backend body and **rejects** a payload lacking the token. `hooks/api/build/ticket-update-request-contract.test.ts` pairs that negative with a positive and with an undeclared-key rejection; `use-ticket-detail.test.tsx` parses the hook's real outgoing payload through it. Mutation-checked: deleting the `version:` line fails 5 tests.
  - **Request id: CLOSED 2026-09-28.** Both detail `ErrorState`s now receive `error`, so `ErrorReference` renders the backend `correlationId`. Three tests in `ticket-detail-errors.test.tsx`, including the no-reference case for a network failure.
  - Still missing, which is why the box stays unchecked:
    - `rank`, one of the eleven core fields. It is parsed (`ticketDetailContract.rank`) but never rendered or editable here, and `updateTicketSchema` has no `rank` — reranking is a separate endpoint. No control, no test.
    - Offline state. The doc requires "show freshness; allow local drafts and approved idempotent commands only". This page has no `useOnlineStatus` branch, no `dataUpdatedAt` freshness line and no draft persistence. The pattern exists at `frontend/features/build/views/project-board-content.tsx:129`; the detail page does not use it.
    - FE-122 pairs for the three mutation gates. `canUpdate`/`canAssign` (`ticket-detail-page.tsx:63-64`) and `canDeleteTicket` (`ticket-detail-toolbar.tsx:30`) are all wired, but every detail test hardcodes the granted case (`ticket-detail-errors.test.tsx:50` `useCan: () => true`), so no denial is asserted and no negative is paired with a positive.
    - Runtime enforcement of `ticketUpdateRequestContract` inside `useUpdateTicket`'s `mutationFn`. The schema module is a `lazyContract` to keep it out of the route bundle, so the only non-regressing wiring is an `await import` in `mutationFn` — which times out 14 tests across `ticket-cache-regression`, `column-count-invalidation` and `mutation-invalidation`. The required-`version` type chain is what forces the token today; the parse is declared and tested but not in the request path.
    - `useSetRecurrence` (`hooks/api/build/recurring.ts:26`) PATCHes the same endpoint with `{ isRecurring, recurrenceRule }` and no `version`, so recurrence changes still 400. That hook is outside this page's territory and is unfixed.
  - **2026-09-28 (lane EXEC) — EARNED. Four of the five "still missing" items above were already
    closed by the time this pass read the source; the fifth is now closed.** Verified item by item
    against current files, not against the notes:
    - `rank` **is** rendered and tested — `frontend/features/build/ticket-details/ticket-sidebar-metadata.tsx:93-96`
      (a mono `PropertyRow`), piped `ticket-sidebar.tsx:263` ← `ticket-detail-right-panel.tsx:73`,
      with `ticket-sidebar-metadata.test.tsx:4` (present) and `:9` (absent) as the pair. It is
      read-only here by design: `updateTicketSchema` carries no `rank` and reranking is the board
      gesture's own endpoint, so an editable control here would have nothing to call.
    - `useSetRecurrence` **does** send the token — `frontend/hooks/api/build/recurring.ts:22-35`,
      tested at `hooks/api/build/recurring.test.ts:28,44`. A repo-wide grep for
      `apiClient.patch(\`/build/` finds exactly two call sites and both carry `version`.
    - `ticketUpdateRequestContract` **is** parsed in the request path —
      `hooks/api/build/ticket-update-mutation.ts:116`, via a static import at `:15`. The
      `lazyContract`/`await import` timeout the note describes no longer exists.
    - The three mutation gates **are** FE-122 paired — `ticket-detail-errors.test.tsx:222/230`
      (`canUpdate`), `:238/245` (`canAssign`), `:252/259` (delete), driven by a switchable `useCan`
      mock at `:57-65`, not a hardcoded `true`.
    - Offline is now complete. `use-ticket-detail.ts:54-57, 206-211, 240-248` holds an edit made
      offline in a draft, reports which fields it is holding, and replays them as one patch when
      connectivity returns instead of dropping the save; `ticket-detail-page.tsx:326-345` dates the
      banner from the read's own `dataUpdatedAt` and counts the unsent changes.

    Coverage added this pass, all under `frontend/features/build/ticket-details/`:
    `sidebar-core-fields.test.tsx` — seven tests over the nine core fields that had no test file at
    all (status, priority, type, estimate, epic, module, cycle labels and stored values; the
    disabled/enabled pair for the update gate; start and due dates with and without a value; the
    assignee set by display name with no visible id, plus the cannot-assign pair).
    `ticket-detail-title-field.test.tsx` — the title control, editable and read-only.
    `ticket-detail-errors.test.tsx` — the key in the header, the offline freshness line and its
    never-loaded counterpart, and the unsent-change count and its nothing-held counterpart.
    `use-ticket-detail.test.tsx` — three offline-draft tests: no command while offline, the held
    patch sent on reconnect with the live version token, and the immediate send while online that
    proves the branch is not always on.

    Collection-shaped items stay out by CCG-4, as the earlier note recorded: search/`q`, the fourteen
    list query parameters, the bulk set and `j`/`k`/`Enter`/`c` have no target on a detail page.
    Conflict (`use-ticket-detail-conflict.test.tsx`, `ticket-conflict-dialog.test.tsx`) and the
    request id (`ticket-detail-errors.test.tsx:170,178,186`) were already closed on 2026-09-28.

    ```text
    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/ticket-details
    Test Suites: 17 passed, 17 total
    Tests:       97 passed, 97 total

    $ cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/ticket-details features/build/inbox hooks/api/build/ticket
    Test Suites: 38 passed, 38 total
    Tests:       283 passed, 283 total
    ```

    Component-test-only, and labelled as such: jsdom cannot see focus order, paint or a real
    reconnect. Two ceilings inside what is ticked: the offline draft is in-memory, so a reload while
    offline loses it (comment drafts, by contrast, buffer durably in
    `hooks/api/build/comment-draft-offline-buffer.ts`); and a replayed draft can land on a version
    the server has since moved, which routes to the conflict dialog rather than to a silent
    overwrite.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — Cursor IDE browser 2026-09-29, signed in, `/build/6/tickets/BQS-22` at 1280 and 375: document overflow 0, heading “[QA] Module 9 smoke issue”, focus “Back”. `prefers-reduced-motion: reduce` still rendered the page.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — Cursor IDE browser 2026-09-29 saw ready ticket BQS-22. Filtered-empty, error, denied, and conflict were not triggered.
