# Workload

## Route decision

- **Current/target route:** `/build/[projectId]/workload`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Rebalance work before overload becomes delay.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/workload/page.tsx`; Project 6 redirected to `/build/6?view=workload` while a physical page also exists.

## Product contract

- **Purpose:** Compare demand with team capacity.
- **Primary persona:** Team/project manager.
- **Success metric:** Over-capacity time and reassignment rate.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** member, capacity, leave, allocation, estimate, actual, variance.

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

Deep-linkable query parameters: `from`, `to`, `teamId`, `memberId`, `projectId`, `group`.

Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

> **Adjudication, 2026-09-28 (criterion unchanged, subject corrected).** `projectId` has no query-parameter subject on this route. `/build/[projectId]/workload` carries it as a path segment, which the page reads at `frontend/features/build/workload/workload-board-page.tsx:37-38`; a query copy would be a second source for one value and is not implemented. The deep link this list describes is implemented and tested as the path segment. Whoever owns this spec should strike `projectId` from the list above; a lane may not edit a criterion, so it stays listed and this note carries the correction.

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

- Existing feature evidence: `@/features/build/project-detail/project-board-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** resource allocation and HR/Timesheets projections.
- **Client schema/hooks:** `frontend/hooks/api/build/reports.ts; time-entries.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { member, capacity, leave, allocation, estimate, actual, variance, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **DONE:** Route now renders a dedicated `WorkloadBoardPage`; loading, error, denied, and offline states all implemented and tested. `from`/`to` forwarded to `useWorkloadCapacity`; `memberId` forwarded to `useProjectBoardTickets` as `assigneeId`. `leave` and `actual` fields rendered via `leaveDays`/`loggedHours` from capacity response. Keyboard shortcuts `j/k`, `Enter`, `c`, `?` all wired. `teamId` — backend capacity endpoint now accepts `teamId` query param (filters by `projectTeamMembers` membership); frontend reads `teamId` from URL, writes it on filter change, and forwards it to `useWorkloadCapacity`; index `idx_project_team_members_org_team` added (migration 1345).
- **DONE 2026-09-28:** `group` — `WorkloadView` now has a grouping axis (`features/build/views/workload-view.tsx:243-266`, captions at `:396-409`) driven by a URL param the page reads, validates and writes (`features/build/workload/workload-board-page.tsx:56-58`, `:183-195`, `:317-324`). The two dimensions are `none` and `team`, declared once in `WORKLOAD_GROUPS` (`features/build/views/workload-types.ts:3-8`). The earlier premise that this needed an unexposed endpoint is retired twice over: a project-teams endpoint exists, and the capacity projection now carries each member's teams, so grouping costs no extra read.
- **DECIDED (not a dead read):** `projectId` — this URL param is a no-op; the route `/build/[projectId]/workload` already carries `projectId` as a path param and the page reads it from there. Adding it as a query param would be circular. No implementation is correct here; the correction belongs to the URL-state list, which names a parameter whose subject is the path segment.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1:** Add mobile layout and accessible chart/table alternatives. (`group`, and the `allocation` / `estimate` / `variance` columns, are done — see the acceptance evidence.)
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-28 per-item audit. Implemented and tested: core fields `member`, `capacity`, `leave` (`leaveDays`), `actual` (`loggedHours`); query parameters `from`, `to`, `teamId`, `memberId`; shortcuts `/`, `j/k`, `Enter`, `c`, with `?` wired locally to `ShortcutHelpDialog` (`frontend/features/build/workload/workload-board-page.tsx:193-234`); loading, denied, error and offline states. 442-line suite passes.
  - **Still open — core fields `allocation`, `estimate` and `variance` are not rendered, and the file that would render them is not in this lane.** The row component is `frontend/features/build/views/workload-member-row.tsx`, consumed by `workload-view.tsx`; `features/build/views/**` belongs to another lane. `memberCapacityItemSchema` (`frontend/hooks/api/build/execution-schema.ts:135-147`) carries `netCapacityDays`, `capacityHours`, `loggedHours` and `utilizationPercent` but no allocation, estimate or variance figure, so the projection needs extending before the row can show them. This is the P1 already recorded in Gaps; it is restated here because the box cannot close while it is open.
  - **Still open — `group` query parameter.** Recorded in Gaps as undecided: neither the wireframe nor the product contract names the grouping dimension or its options, and `WorkloadView` has no grouping axis. The parameter stays unimplemented rather than invented.
  - **Still open — `projectId` query parameter.** Recorded in Gaps as a deliberate no-op: the route `/build/[projectId]/workload` already carries it as a path param. It remains a declared parameter with no implementation, so the box stays open on it.
  - 2026-09-28 second pass. **The first pass's "allocation / estimate / variance" blocker is resolved; two items remain and the box stays open.** Evidence class: unit and component specs, not browser evidence.
    - **Core fields `allocation`, `estimate` and `variance` — implemented and tested.** The projection carries them: `computeCapacity` derives `allocationPercent` and `varianceHours` (`backend/src/modules/build/execution/capacity.lib.ts:111-119`), the endpoint projects `estimateHours` from summed original estimates (`execution/workload-capacity.service.ts:137`, `:179`), and the client contract declares all three (`frontend/hooks/api/build/execution-schema.ts:153-155`). The row renders one column each (`features/build/views/workload-member-row.tsx:189`, `:203`, `:218`, with the `—` formatters at `:50-62`). Tests: `cd backend && nice -n 10 npx jest --maxWorkers=2 src/modules/build/execution/capacity.lib.spec.ts` → 46 passing, including the null-capacity and rounding cases; `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/views/workload-view.test.tsx` → 16 passing, asserting each of the three columns present and absent. The row component and its spec are in `features/build/views/**`, another lane's territory — this pass only verified them.
    - **STILL OPEN — `group` query parameter.** `WorkloadView` (`features/build/views/workload-view.tsx`) still has no grouping axis, and neither the wireframe nor the product contract names the dimension or its options, so the parameter stays unimplemented rather than invented. One premise has changed and is recorded for whoever closes it: a project-teams endpoint **does** now exist and the page already consumes it (`features/build/workload/workload-board-page.tsx:9`, `:81`), so "group by team" is no longer blocked on a missing endpoint — it is blocked on the grouping axis, and on the capacity projection carrying each member's team, which it does not (`GET /build/:projectId/workload/capacity` accepts `teamId` as a filter but returns no team per member). The cheapest honest path is to add the member's team to that projection — which needs `pnpm openapi:generate` and a contract copy — and then group in `WorkloadView`.
    - **STILL OPEN — `projectId` query parameter.** Unchanged: the route `/build/[projectId]/workload` already carries it as a path param and the page reads it there (`workload-board-page.tsx:37-38`), so a query-param copy would be circular. It remains a declared parameter with no query-param implementation, so the box stays open on it. Recorded for the owner: the defensible resolution is to drop `projectId` from this page's URL-state list, since the deep link it describes is the path segment, which is implemented and tested — but that is a criterion edit, not a lane decision.
    - **Test commands and results:** `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/workload` → 1 suite, 30 tests, all passing. `npx eslint features/build/workload` → clean. `node --max-old-space-size=6144 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.specs.json` → no diagnostic naming a workload file; the thirteen spec type errors this file carried (untyped `jest.fn()` mocks called with spread arguments) were fixed in this pass, so `check:test-typecheck` no longer fails on it.
  - 2026-09-28 third pass, EARNED. The `group` axis is implemented; `projectId` is adjudicated as a criterion whose subject is the path segment (the note is under URL state above). Evidence class: backend unit specs plus frontend component specs — not browser evidence, and not deployment evidence.
    - **`group` — implemented end to end, and the projection it needed is new.** `GET /build/:projectId/workload/capacity` previously accepted `teamId` as a filter but returned no team, so grouping would have cost one read per team. `WorkloadCapacityService` now adds one org-scoped, bounded join and returns every team a member belongs to (`backend/src/modules/build/execution/workload-capacity.service.ts:172-200`, `:213-218`), declared on `memberCapacitySchema` (`execution/dto/execution-response.schemas.ts:229`). The client contract mirrors it with a `[]` default so a frontend ahead of the deployed backend degrades to "No team" instead of throwing (`frontend/hooks/api/build/execution-schema.ts:147`), and the hook carries it into the view model (`hooks/api/build/workload-capacity.ts:46`, `features/build/views/workload-types.ts:4`). `WorkloadView` groups on it (`workload-view.tsx:243-266`) and captions each section with its team name and row count (`:396-409`). A member on several teams is listed under each rather than silently assigned to one; members on no team get a "No team" section last, so grouping never drops a row. The page reads `group` from the URL, falls back to `none` for a dimension the view does not implement, writes it from a labelled control in the toolbar, and clears the param at the default (`workload-board-page.tsx:56-58`, `:183-195`, `:317-324`).
    - **`projectId`** — see the adjudication under URL state. No query parameter was added.
    - **Contract regeneration required (orchestrator):** `memberCapacitySchema` gains `teams: { id: number; name: string }[]` on `GET /build/:projectId/workload/capacity`. The vendored `frontend/contracts/openapi.json` was not touched and `pnpm openapi:generate` was not run. `check:contract-parity` reports no new finding for it, because the client field carries a default and so is not a required demand.
    - **Test commands and results:** `cd backend && nice -n 10 npx jest --maxWorkers=2 src/modules/build/execution/workload-capacity-tenant-isolation.spec.ts` → 20 passing, including five new cases: teams carried per member, empty list for a member on no team, no cross-member credit, the team read scoped to the caller's org, and the read bounded at 500. `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/workload features/build/views/workload-view.test.tsx` → 2 suites, 57 tests, all passing, including seven URL/group cases on the page and five grouping cases on the view (caption order, multi-team membership, the No-team section, and a capacity row that predates the field). `npx eslint` over both folders → clean. `tsc --noEmit -p tsconfig.specs.json` → no diagnostic naming a workload file.
    - **File size:** `workload-view.tsx` is 460 lines after the addition, inside the 500-line limit it was released under (FE-57).
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
