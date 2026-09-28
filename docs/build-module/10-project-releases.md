# Releases

## Route decision

- **Current/target route:** `/build/[projectId]/releases`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Know what ships when and communicate it safely.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/releases/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Plan and publish shipped versions.
- **Primary persona:** Release manager.
- **Success metric:** Release predictability and change-note coverage.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** name, status, date, owner, work items, notes, publication.

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

- Existing feature evidence: `@/features/build/releases/releases-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST/PATCH /build/:projectId/releases.
- **Client schema/hooks:** `frontend/hooks/api/build/releases.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { name, status, date, owner, work items, notes, publication, version, createdAt, updatedAt }, meta }`.
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
  - Reopened 2026-09-27: the blanket CCG-1 concurrency exemption was based on a false premise. Verify this page's read token, stale-write handling and conflict UX against architecture tickets 36/11/12/13 before closing; existing non-conflict evidence remains valid only for the behavior it exercised.
  - Measured 2026-09-26: URL-backed filters and `from`/`to` date range via `useBuildListFilters` with `gte`/`lte` applied server-side in `projects-releases.service.ts`; `useBuildListKeyboard` wired for `/`, `j/k`, `Enter`, `Esc`, `c`, `e`, with `?` served globally by `use-keyboard-shortcuts.ts:60`; selection state plus `handleBulkStatusChange` and a bulk strip; `ReleaseEditButton` replaced by a `ReleaseRowActions` dropdown used by both the table row and `ReleaseMobileCard`. 7/7 suite.
  - 2026-09-28: **the concurrency token is done and correctly tested.** `updateReleaseSchema` requires `rowVersion: z.number().int().positive()` (`backend/src/modules/build/core/dto/releases.schemas.ts:34`, `.strict()`); it is named `rowVersion` because `Release.version` is the semver string. `projectReleaseListItemSchema`/`projectReleaseRowSchema` declare it required (`frontend/hooks/api/build/build-project-schema.ts:206,220`), `UpdateReleaseInput` declares it required (`frontend/types/projects/releases.ts:25`), and both writers send it — `release-form-sheet.tsx:92` and the bulk status change at `releases-page.tsx:185`. `releases-list-contract.test.ts:94` **rejects** a row that omits the token rather than merely accepting one that has it, and `:101-107` pins the backend schema as required-and-not-optional.
  - 2026-09-28 per-item audit. Query parameters `status`, `from`, `to`, `q`, `cursor` are all implemented and served server-side by `projects-releases.service.ts:96-107`. Shortcuts `/`, `j/k`, `Enter`, `e`, `c` are wired via `useBuildListKeyboard`; `?` is served globally by `components/command-palette/hooks/use-keyboard-shortcuts.ts:60`. Loading, empty, filtered-empty, error and denied all resolve through `BuildListSurface`. Conflict is handled at `release-form-sheet.tsx:102`.
  - 2026-09-28: **core field `publication` now has storage, a writer and a reader.** Migration `1422`–`1425` batch added `build.project_releases.published_at timestamptz` plus `idx_project_releases_org_published` (applied to production, verified by catalogue read, nothing backfilled). The writer is `projects-releases.service.ts:139-147`: `publishedAt` is set to `new Date()` only on the transition INTO `released`, in the same transaction as the update. It is not in `updateReleaseSchema`, which is `.strict()`, so no client can set or clear it. Projected at `:48` and `:89`, declared required-and-nullable in both backend and frontend release schemas, and rendered three-state in `releases-table-columns.tsx:101-118` — `—` when not released, the formatted date when known, `Unknown` when a release predates the column. `projects-releases-published-at.spec.ts` pins all four transitions, including that a second update to an already-released release does NOT move the date and that going back to draft does not clear it. Backend releases suite 40/40.
  - 2026-09-28: **core field `notes` is rendered.** `description` appears in the table at `releases-table-columns.tsx:87-89` (HTML stripped) and as a `Notes` meta entry on `ReleaseMobileCard` at `:191-192`, so change-note coverage is observable.
  - 2026-09-28: **offline state is wired.** `releases-page.tsx:19,99` consumes `useOnlineStatus`.
  - **Still open — core field `owner` renders a raw user id.** `createdBy` now reaches the client (projected at `projects-releases.service.ts:48,89`, declared in both release schemas, typed on `Release`) but it is a user id string and it is printed raw at `releases-table-columns.tsx:144` and `:195`. FE-85 calls a visible UUID a bug. Fix is the automations pattern: a projected `createdByUser: { name, firstName, lastName, email }` via `leftJoin(users)` as at `projects-automations.service.ts:89-97`, resolved through `getUserDisplayName` as at `automation-card.tsx:105-106`. In flight.
  - 2026-09-28 — **closed. `owner` landed, and the two items the audit above had not reached are done.**
  - **`owner` renders a name.** The projection is `projects-releases.service.ts:57-62` and `:103-108` (`leftJoin(users)` on `created_by`), declared required-and-nullable on `projectReleaseListItemSchema` (`frontend/hooks/api/build/build-project-schema.ts:278-283`) and typed on `Release` (`frontend/types/projects/releases.ts:20`). It is read through `getUserDisplayName` at `releases-table-columns.tsx:192` and in the mobile card at `:245`. Five cases in `releases-page.test.tsx` pin the display name, the email-local-part fallback, a dash for a null owner, a dash — never the id — for an owner whose user row is gone, and a decode **rejection** when `createdByUser` is omitted. The raw-id render FE-85 called a bug is gone.
  - **The mutation response no longer disagrees with the list row.** `projectReleaseRowSchema` (the create/update row) has no `createdByUser` because `createRelease`/`updateRelease` return an unjoined row — declaring a key the service does not project would 500, which `projects-releases-created-by-user-projection.spec.ts` deliberately pins. The array fallback inside `projectReleaseListContract` was typed against that row contract, so the hook's `Promise<ResponseContract<ReleasePage>>` did not type-check; it now falls back to `projectReleaseListItemContract` (`frontend/hooks/api/build/releases.ts:20`, `build-project-schema.ts:455`), which is the shape a bare array from that endpoint actually has.
  - **Conflict state shows a field-level comparison.** The 409 branch used to be a warning toast only, which is not the "field-level server/current comparison" this page's States section asks for. `release-form-sheet.tsx:133-144` now builds a diff of name, version, status, release date and notes (markup stripped, so a formatting-only change is not reported as an edit) through `buildReleaseConflictDiffs` (`:66-92`) and opens `TicketConflictDialog`, keeping the toast only as the fallback when nothing was edited. Three cases in `release-conflict-dialog.test.tsx`, including that a 500 still reaches the error toast and opens no comparison.
  - **Right click opens the row's authorized actions, in every cell.** `<TableRow>` belongs to `components/ui/data-table.tsx:513`, which is outside this lane and has no row-level context-menu prop, so the handler lives on the cell contents instead: `ReleaseContextMenuCell` (`releases-table-columns.tsx:71-105`) wraps the name, status, published, release-date, ticket-count and created-by cells (`:117,138,147,164,179,190`) and opens a controlled `DropdownMenu` with the same Edit and Delete the actions column offers. It refuses to open for a viewer without `build:manage` (`:85`), so the menu never offers an unauthorized command. Nine cases in `releases-page.test.tsx` pin the open, the authorized-only behaviour, both callbacks, and one case per remaining column. The uncovered area is the `TableCell`'s own 8 px padding ring; a whole-`<tr>` handler is recorded as an out-of-lane want against `components/ui/data-table.tsx:513`.
  - 2026-09-28 — **settled: primary-record bulk selection is removed, and the row context menu now hangs off the row itself.**
  - **The bulk status strip is gone.** The spec's line is "Child collections support selection only when a real repeated operation exists; the primary record itself is never selected", and the strip selected releases, the primary record of this page. It is removed rather than argued for, on the spec's own terms and on one of its own consequences: `status: "released"` is a **publication** — it stamps `published_at` and emits `build.release.published` to the outbox (`backend/src/modules/build/core/releases/projects-releases.service.ts:139-147,163-181`) — and the strip fired one unconfirmed PATCH per selected row, so a multi-select published several releases with no confirmation, against this page's own "Financial, access, approval, publication, and destructive changes are never optimistic" line. No capability was lost: a release's status is still changed one row at a time in the edit sheet, and this page renders no child collection (a release's work items are not listed here), so there is nothing to scope selection *to*. `releases-page.tsx` no longer passes `selection`, imports `useUpdateRelease`, or renders the strip. The four bulk cases that pinned the strip are replaced by a paired one: `selection` is absent from the table's props and no strip renders, and the edit sheet still opens for a single row, so the removal is pinned as a removal rather than as an untested absence.
  - **Right click is now on the row, not the cells.** `components/ui/data-table.tsx` gained an additive `onRowContextMenu?: (row, event) => void` (`data-table.types.ts:89`), fired from both the `<tr>` (`data-table.tsx:547-549`) and the mobile-card wrapper (`:487-489`), threaded through `features/build/shared/build-list-surface.tsx:53,89,139` and documented in `UI-KIT.md:280`. `releases-page.tsx:170-196,466-484` keeps one menu for the page, anchored to a fixed 1x1 trigger at the cursor, gated on `canManage` so an unauthorized viewer keeps the browser menu, and wired to the same edit sheet and `ConfirmDialog` the actions column uses. The six per-cell wrappers are deleted, so the cell padding is covered and the columns are back to plain cells. Five cases in `components/ui/data-table.test.tsx` pin the row call, a right click inside the cell padding, `preventDefault` reaching the DOM event, that a table passing no handler keeps the browser menu, and the mobile card; four in `releases-page.test.tsx` pin the authorized open, the unauthorized non-open, the edit sheet, and that Delete opens the destructive confirmation naming the row instead of deleting outright.
  - Commands, 2026-09-28 (second pass): `cd frontend && npx jest --maxWorkers=2 features/build/releases` → 2 suites, 33 tests, all pass. `npx jest --maxWorkers=2 components/ui/data-table features/build/shared/build-list-surface features/build/feedbucket/project-submissions-inbox features/build/backlog/project-backlog-page` → 6 suites, 77 tests, all pass. `npx eslint components/ui/data-table.tsx components/ui/data-table.types.ts features/build/shared/build-list-surface.tsx features/build/releases` → 0 errors. `tsc --noEmit -p tsconfig.specs.json` reports nothing for `components/ui/data-table*`, `build-list-surface.tsx` or `features/build/releases`, so every existing `DataTable` call site still compiles untouched.
  - Commands, 2026-09-28: `cd frontend && npx jest --maxWorkers=2 features/build/releases` → 2 suites, 40 tests, all pass. `npx jest --maxWorkers=2 hooks/api/build` → 768 tests, all pass. `cd backend && npx jest --maxWorkers=2 src/modules/build/core/releases` → 6 suites, 48 tests, all pass. `npx eslint features/build/releases` → 0 errors (the 14 `no-require-imports` errors this file carried are gone; the cell tests import the column factory directly). `tsc --noEmit -p tsconfig.specs.json` reports nothing under `features/build/releases` or `hooks/api/build/releases.ts`. Component- and unit-test evidence only: no database and no browser, so the two browser boxes below stay unticked.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
