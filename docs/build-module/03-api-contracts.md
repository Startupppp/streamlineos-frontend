# Build API Contracts

## Evidence

- Controllers: `backend/src/modules/build/**/*.controller.ts`.
- DTO schemas: `backend/src/modules/build/**/dto/*.schemas.ts`.
- Client hooks: `frontend/hooks/api/build/`.
- Query keys: the domain module `frontend/lib/query-keys/build-work.ts`. Production code must never import the `frontend/lib/query-keys.ts` aggregate (FE-18).
- Pagination: `backend/src/common/pagination/cursor.schema.ts` and `list-query.schema.ts`.

## Naming and transport

- Base: `/build` for authenticated internal APIs; public and portal APIs have separate authentication interfaces.
- Resources are plural nouns. Commands that are not CRUD use explicit verbs, e.g. `/merge`, `/publish`, `/complete`, `/rotate-token`.
- Parent identity appears in the URL and is revalidated against the child: `/build/:projectId/tickets/:ticketId`.
- `GET` is side-effect free. Mutations use an idempotency key for retriable commands.
- Collection reads never return unbounded arrays.

## Envelopes

These are live and load-bearing. Build must consume them as they are; do not introduce a second envelope.

```ts
// BE-19, common/interceptors/response-transform.interceptor.ts:13
// A payload already carrying `success` passes through unchanged.
type ApiSuccess<T> = { success: true; data: T };

// BE-20, common/http/all-exceptions.filter.ts:10 — flat, not nested under `error`.
type ApiError = { code: string; message: string; details?: unknown; correlationId?: string };
```

Two cursor page shapes exist. Pick by key type; do not add a third.

```ts
// common/pagination/cursor.ts:130 — opaque cursor, from buildCursorPage / buildTupleCursorPage.
interface CursorPage<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

// common/pagination/cursor.ts:187 — monotonic integer id, from buildIdCursorPage.
interface IdCursorPage<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: number | null;
}
```

Live error codes come from `defaultCode` (`all-exceptions.filter.ts:18`) unless the thrower supplies its own: `BAD_REQUEST`, `UNAUTHORIZED`, `PAYMENT_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `UNPROCESSABLE_ENTITY`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, falling back to `HTTP_<status>`. A Zod failure is `VALIDATION_FAILED` with `details: Array<{ path: string; message: string }>` (`:184`). Module denial is `MODULE_NOT_ENABLED` at 402 (`common/http/api-exceptions.ts:46`, BE-23).

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `VERSION_CONFLICT` and `DEPENDENCY_UNAVAILABLE` do not exist in this repo. Do not branch on them.

Cross-tenant and inaccessible records return the same `NOT_FOUND` interface (BE-91).

## List query contract

Extend `baseListQuerySchema` (`common/pagination/list-query.schema.ts:45`). Sort is one enum-constrained field plus a direction, not a comma-separated list.

```text
?cursor=<opaque>&limit=50&page=1&sortField=updatedAt&sortDir=desc
&q=<search>&status=a,b&assigneeId=...&projectId=...
&from=YYYY-MM-DD&to=YYYY-MM-DD
```

- Maximum `limit` is `PAGE_SIZE_CAP` = 100, default 50. Import it; never redeclare it (BE-24).
- An over-large `limit` is **clamped, not rejected** (`list-query.schema.ts:22`). A bookmarked link gets the largest allowed page.
- Declare `sortField` per endpoint with `withSortField([...])` so the enum rejects unknown columns.
- The opaque cursor encodes **position only** — no tenant, no permission, no filter state (`cursor.schema.ts:20`).
- A malformed, stale or mismatched cursor **degrades to the first page**; it does not 400. This is a deliberate decision recorded at `cursor.schema.ts:4-25`, and it is the one behavior both cursor implementations agree on. Do not reintroduce the 400.
- Because the cursor carries no filter state, the server must re-apply the authorization predicate on every page. Never trust a cursor to have narrowed the result.
- Counts required by filter chips are server aggregates over the same authorization predicate, returned alongside the page (FE-33).

## Command contract

```ts
type CommandHeaders = {
  "Idempotency-Key": string;
  "If-Match"?: string;
};
type Patch<T> = Partial<{ [K in keyof T]: T[K] | null }>;
```

`Idempotency-Key` is live: apply `@Idempotent()` on retriable mutations, which replays the first result and 409s while in flight (BE-34). The frontend `apiClient` generates the header automatically — do not hand-set it.

**`If-Match` optimistic concurrency is a target, not current behavior.** No handler reads it and `VERSION_CONFLICT` exists nowhere in the repo. A slice that needs it must introduce the header, the `version` column, the 409 code and its tests together, and say so in its acceptance criteria. Until then, do not write a client that sends it or a contract that expects `version` back.

Mutations return the complete projection needed to patch current caches (FE-35), plus `updatedAt`. Async work returns `202` with a durable run ID and status URL.

## Auth and permissions

- Session authentication establishes user and active organization.
- Backend permission guards are authoritative; route gating is UX only.
- Every record read rechecks tenant, membership, parent, module entitlement, and external grant where applicable.
- Role names are fixed standings; individual permissions and record scope are separate.
- Public tokens are random opaque capabilities, hashed at rest, expiring/revocable, and rate-limited.

## Rate limits

| Interface | Default |
|---|---|
| Authenticated reads | 300 requests/minute/user/org with burst allowance |
| Search/typeahead | 60/minute, 150–250 ms client debounce |
| Mutations | 120/minute plus idempotency |
| Imports/exports/AI | low concurrency, durable queue, explicit quota |
| Public forms/roadmaps/boards | IP + token + abuse controls |
| Webhook tests/secret rotation | strict actor/project limits and audit |

## Core endpoint families

| Family | Verified controllers |
|---|---|
| Projects/work items | `backend/src/modules/build/core/projects.controller.ts`, `projects-by-id.controller.ts`, `projects-tickets.controller.ts` |
| Board/resources/comments | `project-resources.controller.ts`, `projects-ticket-comments.controller.ts`, `projects-ticket-associations.controller.ts` |
| Iterations/execution | `backend/src/modules/build/execution/iterations.controller.ts`, `workspace.controller.ts` |
| Reports/budget/releases | `projects-reports.controller.ts`, `projects-budget.controller.ts`, `projects-releases.controller.ts` |
| Governance | `backend/src/modules/build/governance/` |
| Forms/intake | `backend/src/modules/build/forms/` |
| QA/bugs | `backend/src/modules/build/qa/` |
| Products/teams | `managed-products/`, `teams/` |
| Build members | `build/core/` member-roster service backing `/build/members`; the underlying table is `build.build_members` |
| Portal/change requests | `client-portal/` |
| Meetings/files/updates/workflow | matching folders under `backend/src/modules/build/` |

Each `10-*.md` lists the exact subset used by that page and its payload fields.

## PM Workspace removal

All 9 `/build/workspaces*` endpoints are deleted, along with `src/modules/build/pm-workspaces/` (controller, module, `PmWorkspacesService`, `PmWorkspaceMembershipsService`, DTOs, response schemas). Permission keys `build:workspaces:view|create|update|delete|members:view|members:manage` no longer exist. Do not reintroduce a workspace-scoped endpoint, DTO field, or permission key.

`/build/members` survives and is unrelated to the removal: it is the organization-level Build member roster, backed by `build.build_members` (renamed from `build.project_workspace_members`; PM Workspace relationship dropped, org/membership/role/added-at kept). `build:members:view` and `build:members:manage` remain live permission keys. Client naming follows the rename: `hooks/api/build/build-members.ts` and Build-member-named contracts, not `workspace-members`/`workspaceMemberPageContract`.

## Realtime

- Realtime is justified for comments, presence, issue field changes, approval decisions, incident events, and durable run status.
- Events contain org, scope, record ID, version, event type, and minimal patch; consumers refetch when a version gap occurs.
- Realtime never substitutes for an authorized initial read.

## Acceptance criteria

- [ ] Every collection is cursor/page bounded and sorted deterministically.
  **NOT EARNED 2026-09-29 — Build territory has zero unclassified paths, but the classification file records three Build reads as `ACTIONABLE` (`projects-tickets-read.service.ts` still serves OFFSET pages by default, `build-ticket-bulk-mutation.ts:164`, `whiteboard-board-helpers.ts` `loadShares`) and `GET /build/:projectId/automations` returns a bare `.limit(100)` array with no cursor. Earned when those four are bounded or paged. This box owns the numbers; sibling boxes must point here rather than copy them.**

  `check:unbounded-reads --self-test` → `Self-tests passed.` Gate run, verbatim tail:

  ```
  FAIL — 2 gate violation(s):
    • 19 unclassified path(s) — classify before committing
    • 1 regression(s) — re-check the migration
  ```

  **FIGURES CORRECTED AGAIN: 29 unclassified → 19. 8 stale → 0. Build-territory unclassified: 10 → 0.** The regression count is unchanged at 1 and is still `/timesheets/core/lib/billing-export.ts` (was `KEYSET-MIGRATED`), out of lane.

  **WHAT HAPPENED — the repair the previous entry asked for has landed.** A sibling lane repointed `src/scripts/baselines/unbounded-reads-classification.json` at the post-split paths (`automation/`, `project-crud/`, `roadmap/`, `work-query/`, `tickets/`, `analytics/`), which cleared all 8 stale entries and 8 of the 10 Build-territory unclassified paths in one edit, exactly as predicted. The same file now also classifies the 2 genuinely-new Build sites, both dated `2026-09-28` in their notes: `/build/updates/updates.service.ts` as `FALSE-POSITIVE` — `:56` filters `eq(orgId)` AND `eq(id)` where `project_updates.id` is `integer().primaryKey().generatedAlwaysAsIdentity()`, so the result is at most one row by construction and the gate is flagging the missing `.limit(1)` rather than an unbounded row count — and `/build/core/tickets/build-ticket-bulk-mutation.ts` as `ACTIONABLE`. **Build territory now has zero unclassified paths.**

  **THE BUILD-OWNED BLOCKER IS NOW THREE `ACTIONABLE` ENTRIES, and `ACTIONABLE` is the verdict that means "real debt, acknowledged".** A classified entry does not fail the gate, so reading this gate as green-for-Build is wrong: the classification file itself records three Build reads as defects awaiting repair. Derived this lane from `src/scripts/baselines/unbounded-reads-classification.json` (46 Build entries in the `unbounded` section — 40 `FALSE-POSITIVE`, 4 `BOUNDED`, 2 `ACTIONABLE` — plus 1 Build entry in the `offset` section, `ACTIONABLE`):

  | Path | Verdict | Why it is real debt |
  |---|---|---|
  | `/build/core/tickets/projects-tickets-read.service.ts` | `ACTIONABLE` (offset) | The only Build entry in the `offset` section. Its recorded note: "Cursor mode exists for board view (paging=cursor); default offset path retained until frontend `useTickets` hook is coordinated to consume `CursorPaginatedResponse` — deadline 2026-12-31". A live list endpoint still serving OFFSET pages by default is the most direct contradiction of this box's wording there is. |
  | `/build/core/tickets/build-ticket-bulk-mutation.ts` | `ACTIONABLE` (unbounded) | `:201` is capped — `bulkUpdateSchema` puts `.max(10)` on `labelIds` — but `:164` is the archive blocker probe: `inArray(tickets.parentTicketId, ids)` over the ≤100 selected IDs, with nothing capping children per parent. A `.limit()` here would be a **correctness regression, not a fix**: the rows feed `blockersMap`, which counts children *outside* the selection in order to refuse the archive, so a truncated read would under-count blockers and let a parent with active sub-tickets be archived. The bounded rewrite is an aggregate — group by `parentTicketId`, count children where `id NOT IN (ids)` — returning at most one row per selected parent. |
  | `/build/execution/whiteboard-board-helpers.ts` | `ACTIONABLE` (unbounded) | `loadShares` reads every share row of one whiteboard with no `LIMIT`. Board-scoped, but a board's share list carries no enforced cap. Its own note is explicit that the sibling whiteboard files' `FALSE-POSITIVE` verdict "is generous and is not inherited here". |

  **A CEILING WORTH WATCHING BEFORE THE NEXT SUPPRESSION.** 40 of Build's 46 `unbounded` entries are `FALSE-POSITIVE`, which is the correct verdict for a read the scanner still sees but which is bounded at the request boundary rather than by a `LIMIT` — `BOUNDED`/`KEYSET-MIGRATED` assert the violation is gone from source and are reported as regressions if it is not. Only `FALSE-POSITIVE` consumes the suppression ceiling, and the gate now prints `Suppressed by a FALSE-POSITIVE justification: 651 unbounded read(s) [ceiling 655]` — **4 slots of headroom for the whole repository**. Raising `MAX_SUPPRESSED_UNBOUNDED` to fit a new entry is the antipattern the ratchet exists to catch, so the next Build read that wants suppressing may find there is no room and have to be bounded instead.

  **THE GATE'S REMAINING FAILURES ARE ALL OUTSIDE BUILD.** All 19 unclassified paths, verbatim from the run: `/e-sign/sign-envelope-queries.service.ts:118` (the single OFFSET) · `/accounting/ap/ap-documents.service.ts:239` · `/expenses/expenses-import.service.ts:267` · `/hr/import/hr-import-preflight.ts:100,:179,:191,:205,:276` · `/hr/recruitment/webhooks/webhook-emitter.service.ts:25` · `/invoices/lib/deal-link.ts:24,:48` · `/invoices/lib/timesheet-line-link.ts:25` · `/kb/content-health/kb-content-health-signal-predicates.ts:57,:72,:114` · `/kb/content-health/kb-contradiction-scanner.service.ts:54` · `/kb/core/kb-document-delivery-access.ts:17` · `/kb/core/kb-gap-documents.ts:18` · `/kb/core/kb-public-documents.ts:119,:150` · `/kb/core/kb-support-documents.ts:386` · `/kb/retrieval/kb-search-retrieval.service.ts:280,:311` · `/kb/wiki/kb-import-process.consumer.ts:134,:209` · `/kb/wiki/kb-multi-store-purge.ts:70,:90` · `/kb/wiki/kb-page-trash-query.service.ts:98` · `/notifications/notification-read-watermark.ts:21` · `/timesheets/core/timesheet-invoicing.service.ts:197`. By module: 1 e-sign, 1 accounting, 1 expenses, 2 HR, 2 invoices, **10 KB**, 1 notifications, 1 timesheets. **Not one is in Build territory.** On this gate the unclassified backlog is a peer's blocker; the three `ACTIONABLE` rows above are ours.

  **SEPARATE BUILD-TERRITORY DEFECT — a bare truncated array. RE-VERIFIED on disk 2026-09-28 and still present.** `GET /build/:projectId/automations` declares `@ResponseSchema(z.array(projectAutomationListItemSchema))` (`backend/src/modules/build/core/automation/projects-automations.controller.ts:43`) and its service does `.orderBy(desc(projectAutomations.createdAt))` at `:90` then `.limit(100)` at `:91`. So the read is bounded and deterministically ordered, but it returns a **bare array with no `nextCursor` and no `hasMore`** — automation 101 is silently invisible and the client cannot tell. That is a hard truncation, not a page, and it fails both BE-25 (paginate live lists by cursor) and this box's own wording. Note that no classification entry covers it either: the file is filed `FALSE-POSITIVE` for its `inArray` read, and the truncation is a *contract* defect that `check:unbounded-reads` cannot see, because a `.limit(100)` is exactly what that scanner is looking for. The client matches the bare array: `frontend/hooks/api/build/automations.ts:64` is `useQuery<ProjectAutomation[]>` and `:67` `apiClient.get<ProjectAutomation[]>`. Fix is a `buildIdCursorPage` / `buildCursorPage` envelope on both sides. Routed to the orchestrator.

  `check:route-budgets --self-test` → `SELF-TEST PASSED` (6 assertions). Gate run, verbatim tail:

  ```
    STALE BUDGETS: 3 key(s) not in current OpenAPI:
      GET /kb/wiki/analytics/page-stats
      GET /kb/wiki/analytics/stale-pages
      GET /kb/wiki/analytics/contributors
    EXCEEDED: 1 measured value(s) above declared ceiling:
      GET /inventory/stock/transactions — measuredBufferBlocks=377 exceeds maxBufferBlocks=60
    WORKER-BATCH SCOPE: 1 violation(s):
      62 cron batches declare no budget, above the recorded watermark of 42. A new scheduled batch must declare its five ceilings or be named in declaredOutOfScope with a reason. Raising the watermark to go green is itself the defect this ratchet exists to catch.
    Critical set (a+b+c), 53 routes — 0 without a budget entry, 7 unmeasured (null measuredLatencyP95Ms).
  check-route-budgets: FAIL — 4 structural violation(s) in the route budget manifest.
  ```

  **CLAIM CORRECTED: the previous entry said all 4 structural violations are "out of Build territory". That is false.** The worker-batch violation includes **2 Build-owned cron batches** among its 62: `/cron/projects-recurring-flush` and `/cron/feedbucket-media-retention-sweep`, both declared on `backend/src/modules/cron/cron-build.controller.ts` (`:58/:64` and `:198/:204`). Neither declares its five ceilings. The controller's two other Build routes, `/cron/build-retention-prune` (`:184/:190`) and `/cron/build-daily-snapshots` (`:212/:218`), are **not** in the undeclared list, so Build's cron coverage is 2 of 4. Beware the controller's name: `cron-build.controller.ts` also hosts eight `crm-*` batches, so "on the Build cron controller" is not the same as "Build-owned". The other 3 structural violations are genuinely out of lane (KB stale budgets, an inventory ceiling breach, 7 unmeasured critical routes).

  **RE-VERIFIED 2026-09-28: `check:route-budgets` has not moved.** Same 4 structural violations, same 62 undeclared batches against a watermark of 42, and both Build names are still in the printed list. Its head is worth quoting because it bounds what this gate can settle at all: `103 declared budgets (76 routes + 27 worker batches)` and `Route surface: 103/4084 operations carry a budget (2.5% of the live OpenAPI surface)`. A gate covering 2.5% of the surface cannot establish "every collection" even when it is green.

  **WHAT WOULD SETTLE IT — four Build items, none of which needs a database.** (1) Migrate `projects-tickets-read.service.ts` off its default OFFSET path and coordinate the frontend `useTickets` hook onto `CursorPaginatedResponse`; this is the item the box's own wording turns on, and its recorded deadline is 2026-12-31. (2) Replace `build-ticket-bulk-mutation.ts:164` with the grouped aggregate described above — not a `.limit()`. (3) Bound `loadShares` in `whiteboard-board-helpers.ts`, or cap a board's share list. (4) Give `GET /build/:projectId/automations` a cursor envelope on both sides, and declare the five ceilings for `/cron/projects-recurring-flush` and `/cron/feedbucket-media-retention-sweep`.

  After all four, `check:unbounded-reads` is still red on the 19 out-of-lane unclassified paths and the timesheets regression, and `check:route-budgets` is still red on its 3 out-of-lane violations, so **this box cannot be earned by Build acting alone.** That is a scheduling fact about two gates and it is now cleanly separated from the four Build items, which are ours and are unearned. It licenses nothing above to stay.

  **2026-09-28, fourth pass — STILL NOT EARNED, but three of the four Build items are now DONE. Re-run both gates myself this lane; the Build side has collapsed to one item plus two cron declarations, and one gate has got worse on its out-of-lane half.**

  `check:unbounded-reads --self-test` → `Self-tests passed.` Gate tail, verbatim and unchanged:

  ```
  FAIL — 2 gate violation(s):
    • 19 unclassified path(s) — classify before committing
    • 1 regression(s) — re-check the migration
  ```

  **THE TWO `unbounded` ACTIONABLE BUILD ENTRIES ARE GONE, AND BOTH WERE REPAIRED THE WAY THIS BOX PRESCRIBED.** Re-derived from `src/scripts/baselines/unbounded-reads-classification.json` this lane: Build now holds **47** entries — `unbounded` 40 `FALSE-POSITIVE` + **6 `BOUNDED`** (was 4) + **0 `ACTIONABLE`** (was 2), and `offset` 1 `ACTIONABLE`. The two that moved, with their recorded notes verbatim:

  - `/build/core/tickets/build-ticket-bulk-mutation.ts` → `BOUNDED`, *"both previously unbounded reads are now bounded: aggregate at :164, .limit(body.labelIds.length) at the label check"*. **This is the important detail:** `:164` became an **aggregate**, not a `.limit()`, which is exactly what the entry above insisted on — a `.limit()` there would have under-counted archive blockers and let a parent with active sub-tickets be archived. The prescription was followed rather than the shortcut taken.
  - `/build/execution/whiteboard-board-helpers.ts` → `BOUNDED`, *"loadShares now applies .limit(PAGE_SIZE_CAP) imported from common/pagination/list-query.schema.ts"*.

  **ITEM 4 IS ALSO DONE: `GET /build/:projectId/automations` NOW RETURNS A CURSOR PAGE ON BOTH SIDES.** `projects-automations.controller.ts:65` is `@ResponseSchema(projectAutomationListPageSchema)` — not the bare `z.array(...)` recorded above. The service has become a real keyset read: `projects-automations.service.ts:10` imports `buildCursorPage, decodeCursor`, `:50` takes `query: ListAutomationsQuery = { limit: 50 }`, `:54` decodes the cursor, `:100` reads `.limit(limit + 1)` and `:102` returns `buildCursorPage(...)`. The client matches: `frontend/hooks/api/build/automations.ts:58` is a `useInfiniteQuery` whose `queryFn` sends `cursor: pageParam` (`:62`), types the response as `{ data, pagination: { limit, hasMore, nextCursor } }` (`:65-71`) and pages on `lastPage.pagination.nextCursor` (`:79`). The "automation 101 is silently invisible" defect is closed.

  **SO THE BUILD-OWNED SURFACE OF THIS BOX IS NOW ONE `ACTIONABLE` ENTRY AND TWO UNDECLARED CRON BATCHES.** The remaining `ACTIONABLE` is the decisive one for this box's wording, unchanged: `/build/core/tickets/projects-tickets-read.service.ts` in the `offset` section, note *"Cursor mode exists for board view (paging=cursor); default offset path retained until frontend `useTickets` hook is coordinated to consume `CursorPaginatedResponse` — deadline 2026-12-31"*. A live ticket-list endpoint serving OFFSET pages by default is a page-number read of a keyset surface, and it is the single Build fact that keeps this box false.

  **THE SUPPRESSION CEILING HAS TIGHTENED AND IS NOW THE NEARER CONSTRAINT.** The gate prints `Suppressed by a FALSE-POSITIVE justification: 653 unbounded read(s) [ceiling 655]` — **2 slots of headroom for the whole repository**, down from 4. The next Build read that wants suppressing will very likely find there is none.

  **`check:route-budgets` HAS GOT WORSE, ALL OF IT OUTSIDE BUILD.** `--self-test` → `SELF-TEST PASSED`. Gate → `check-route-budgets: FAIL — 7 structural violation(s)`, up from 4, and the manifest has grown to `106 declared budgets (76 routes + 30 worker batches)` covering `106/4084 operations … (2.6% of the live OpenAPI surface)`. The undeclared-batch count improved (**59**, was 62) but is still above the watermark of 42; the three new violations are `UNMEASURED WORKERS: 3 worker-batch entry/entries with no measuredLatencyP95Ms` — `/cron/kb-contradiction-scan`, `/cron/kb-stuck-source-reap`, `/cron/kb-trash-purge`, all KB. The other four are as recorded: 3 stale KB wiki budgets, the `/inventory/stock/transactions` ceiling breach, the batch watermark, and 7 unmeasured critical routes.

  **Both Build cron batches are still in the undeclared list** — `/cron/projects-recurring-flush` and `/cron/feedbucket-media-retention-sweep`, confirmed by name in this lane's run. **And this lane cannot close them, for a reason worth recording rather than repeating as a to-do:** the gate's own new `UNMEASURED WORKERS` assertion means declaring the five ceilings *without* a `measuredLatencyP95Ms` converts one violation into another. A worker-batch budget needs a measurement, a measurement needs a run against a real database, and every connection string in this repo points at production. So these two are **NEEDS-MEASUREMENT**, not paperwork, and they stay open with that fact recorded.

  **UPDATED VERDICT.** Build now owns exactly two things on this box: the ticket-list OFFSET cutover (recorded deadline 2026-12-31, needs the frontend `useTickets` hook moved onto `CursorPaginatedResponse`), and two cron budgets that cannot be declared without a non-production measurement. Everything else that was Build's is done. Both gates remain red on out-of-lane work — 19 unclassified paths and 1 regression on one, 7 structural violations on the other — so **the box still cannot be earned by Build acting alone**, and that is unchanged. What has changed is that the sentence is no longer doing any work to excuse Build items, because there are only two left and both are named.

  **2026-09-28, fifth pass — THE TICKET-LIST OFFSET CUTOVER IS DONE, AND IT WAS ALREADY DONE. The classification entry three documents cited as Build's last blocker on this box describes code that no longer exists. Build's `ACTIONABLE` surface on this gate is now ZERO. The box still does not tick.**

  **MEASURED, not inherited.** `src/modules/build/core/tickets/projects-tickets-read.service.ts` has **no offset path**:

  - `grep -n "async \|paging\|offset\|OFFSET"` over the file returns four `async` declarations and **nothing else** — no `paging` discriminator, no `offset`, no `page` parameter.
  - `grep -rn "\.offset(" src/modules/build/core/tickets/` → **no matches** anywhere in the directory.
  - `listTickets` (`:135`) has exactly one success shape. Its denial branch returns `{ data: [], pagination: { limit, nextCursor: null, hasMore: false } }` (`:167-170`) and its only other exit is `return this.listTicketsByCursor(where, limit, query.cursor, orderBy, dir, sortExpr, assigneeUnion)` (`:275-283`) — **unconditional**, not a branch. `listTicketsByCursor` (`:289`) decodes the cursor, reads `LIMIT ${limit + 1}` and returns `buildCursorPage(...)` (`:358`).
  - **The scanner agrees.** `check:unbounded-reads` detects 56 offset sites repo-wide and reports **none** in this file; the only unclassified OFFSET it names is `/e-sign/sign-envelope-queries.service.ts:118`, and its `offset ACTIONABLE : 32 file(s)` tally is identical before and after the reclassification below — because a file with no detected violation was never in that tally to begin with.

  **AND THE FRONTEND HALF THE NOTE SAID WAS PENDING IS ALSO DONE.** `frontend/hooks/api/build/ticket-queries.ts:32-46`: `useTickets` is declared `useQuery<CursorPageResponse<Ticket>>`, its `queryFn` parses through `ticketListPageLazy` → `ticketListPageContract` (`build-tickets-core-schema.ts:265-268`, `{ data, pagination }`), and callers pass a cursor — `features/build/triage/triage-page.tsx:95-103` passes `cursor`, `limit: PAGE_LIMIT`, `orderBy` and `orderDir`. The board's paging consumer is `useProjectBoardTickets` (`:66`), a `useInfiniteQuery` on `(rank, id)`. **So "until the frontend `useTickets` hook is coordinated to consume `CursorPaginatedResponse`" describes a state that has already passed on both sides.**

  **THE REAL DEFECT HERE IS IN THE GATE, AND IT IS WORTH MORE THAN THE CUTOVER.** The entry rotted for a structural reason: `check-unbounded-reads.mjs:364` defines `FIXED_VERDICTS = new Set(["KEYSET-MIGRATED", "BOUNDED", "AGGREGATE", "STREAM"])`, and only those four are regression-checked against source. `ACTIONABLE` is *counted* and never verified (`:13` says so in the script's own header: "ACTIONABLE entries do not fail the gate"). And `checkForStaleEntries` (`:354-361`) tests only `statSync` — whether the **file** still exists — not whether the violation does. **So an `ACTIONABLE` entry whose defect has been fixed is invisible to every check the gate performs, and can be cited as live debt indefinitely.** That is what happened: this one entry was quoted as the decisive Build blocker in this box, in [`05-performance-caching.md`](./05-performance-caching.md) box 1, and in this document's own fourth pass, for as long as it sat there.

  **THE REPAIR.** The entry is reclassified `ACTIONABLE` → **`KEYSET-MIGRATED`** in `src/scripts/baselines/unbounded-reads-classification.json`, with the evidence in its note. That is deliberately not a deletion: `KEYSET-MIGRATED` is one of the four verdicts the gate *does* check against source, so if an offset ever returns to this file the gate fails it as a regression. Deleting the entry would have left the path unclassified and the protection absent. Gate after the change, `backend/`, self-test first:

  ```
  $ node src/scripts/check-unbounded-reads.mjs --self-test
  Self-tests passed.
  $ node src/scripts/check-unbounded-reads.mjs
  ...
  FAIL — 2 gate violation(s):
    • 19 unclassified path(s) — classify before committing
    • 1 regression(s) — re-check the migration
  ```

  No regression is reported for the reclassified path, which is the gate confirming the file is clean rather than this lane asserting it. Build's 47 classification entries are now **1 `offset` KEYSET-MIGRATED · 40 `unbounded` FALSE-POSITIVE · 6 `unbounded` BOUNDED · 0 ACTIONABLE in either section.**

  **UPDATED VERDICT. Build owns exactly one thing on this box, and it is a measurement.** The two cron batches, `/cron/projects-recurring-flush` and `/cron/feedbucket-media-retention-sweep`, still declare no budget, and they are **NEEDS-MEASUREMENT** rather than paperwork: `check:route-budgets` now also asserts `UNMEASURED WORKERS`, so declaring five ceilings without a measured p95 trades one violation for another, and a p95 needs a run against a real database. **This lane did not declare an unmeasured ceiling to quiet the gate — that is the substitution this box exists to forbid.**

  Both gates stay red on out-of-lane work — 19 unclassified paths plus the `/timesheets/core/lib/billing-export.ts` regression on one, 7 structural violations on the other — so **the box cannot be earned by Build acting alone.** After this pass that sentence is the *whole* remaining reason on the read side, and the only Build item left anywhere on this box is one pair of measurements nobody here can take.
- [x] Every mutation has Zod validation, permission checks, tenant-safe lookup, and idempotency where retriable. **2026-09-27:** `check:params-schema-completeness` PASS — 638 controllers, 1940 routes, all params declared. `check:record-access` PASS — every record read excludes soft-deleted rows. `check:idempotent-commands` — Build-territory violation fixed: `POST build/:projectId/client-portal/publish` now carries `@Idempotent("build.portal.publish")`; 2 residual unfenced handlers are `chat-assistant.controller.ts:240` (AI) and `kb-research-brief.controller.ts:109` (KB) — both out of lane.
- [x] Error codes are machine-readable and route/page states preserve backend detail. **2026-09-27:** Error code table verified from `backend/src/common/http/all-exceptions.filter.ts`. `check:page-state-usage` PASS — no self-closing `<PageState />` found; FE-41 (`error` passed to `usePageState`) is enforced by the gate.
- [x] Response projections are sufficient for precise optimistic cache updates. **2026-09-28 NOT EARNED. The previous entry's evidence claim was false and is withdrawn; a real defect is named in its place.**

  **CLAIM CORRECTED: "`ticket-cache.ts:281-348` matrix covers status, title, assignee, rank, points, cycle, dependency, delete" — it does not.** Read at `frontend/hooks/api/build/ticket-cache.ts:231-349` this lane. `invalidateTicketUpdateViews` takes a `changes` object declaring **eight** keys (`title`, `status`, `cycleId`, `points`, `startDate`, `dueDate`, `assigneeId`, `assigneeIds` — `:236-243`) and derives **five** flags (`:271-276`): `titleChanged`, `statusChanged`, `cycleChanged`, `pointsChanged`, `schedulingChanged`. `rank`, dependency add/remove and delete are **not parameters of this function at all** — they are handled by other helpers, so the cited range never covered them. `assigneeId`/`assigneeIds` are parameters but have **no branch**.

  The function's actual shape is an unconditional head then four conditional branches:
  - Unconditional (`:246-269`), on *every* ticket update: `projects.tickets({projectId})`, `ticketActivity.list(ticketId)`, `projects.allWorkAll`, `projects.analytics(projectId)`, `projects.list()`, `dashboard.myIssues()`.
  - `statusChanged` (`:281-306`) → columnCounts, cycleTime, leadTime, cfd, velocity, burnup.
  - `cycleChanged` (`:308-321`) → cycles, velocity, burnup.
  - `pointsChanged` (`:323-336`) → velocity, burnup, criticalPath.
  - `titleChanged` (`:338-343`) → criticalPath.
  - Tail (`:345-348`) → `dashboard.activeSprintSummary()`.

  **RE-READ 2026-09-28 and unchanged**, line for line: the `changes` parameter still declares eight keys at `:240`/`:243` (`startDate`, `assigneeIds` among them), the five flags are still derived at `:271-277`, and `schedulingChanged` still appears only in the early-return guard at `:278`.

  **A TEST SUITE FOR THIS FUNCTION ALREADY EXISTS, and its coverage is the sharpest statement of the gap.** `frontend/hooks/api/build/ticket-cache.test.ts` drives the real helper against a real `QueryClient` — no module mock, `jest.spyOn(client, "invalidateQueries")` calls through — so it is exactly the non-mocked exercise `performance-followup/cache-policy.md` asks for. Run this lane, verbatim:

  ```
  $ npx jest hooks/api/build/ticket-cache.test.ts
  PASS hooks/api/build/ticket-cache.test.ts
    19 — invalidateTicketUpdateViews narrows report eviction per cache-policy.md
      √ empty changes (no fields at all) evict no report cache (5 ms)
      √ title-only change evicts only criticalPath (title is projected in the critical-path query) (2 ms)
      √ rank change with undefined status evicts no report cache (1 ms)
      √ status transition evicts cycleTime, leadTime, cfd, velocity, burnup — but not criticalPath (1 ms)
      √ points change evicts velocity, burnup, and criticalPath — but not cycleTime, leadTime, cfd (1 ms)
      √ cycle membership change evicts velocity and burnup — and no other report (1 ms)
      √ status change does not evict criticalPath
  Tests:       7 passed, 7 total
  ```

  Seven tests over `title`, `status`, `points`, `cycleId` and the empty case. **There is no test for `startDate`/`dueDate` and none for `assigneeId`/`assigneeIds`** — the two parameter groups with no branch. So the green suite is consistent with both defects below: it passes *because* it never exercises the flags that do nothing. Note also the third test, `rank change with undefined status evicts no report cache`, which asserts rank is report-neutral; `performance-followup/cache-policy.md`'s own matrix row for `rank` says the opposite ("not automatically report-neutral" — the `updatedAt`-dependent burnup fallback). The test currently ratchets in the gap that table documents.

  **DEFECT 1 — `schedulingChanged` is a dead flag.** It appears only in the early-return guard at `:278`; it has no branch of its own. So a start-date or due-date edit passes the guard, falls through all four branches, and reaches only `activeSprintSummary`. It does **not** invalidate `criticalPath`, `cycleTime` or `leadTime` — and all three are date-driven aggregates (`05-performance-caching.md` measurement queue classifies cycle-time and lead-time as date-window aggregates and critical-path as a dependency **graph** built from dates). Moving a ticket's dates therefore leaves the critical path, cycle time and lead time reports stale. Fix: give `schedulingChanged` a branch invalidating `criticalPath`, `cycleTime`, `leadTime`. File and line: `frontend/hooks/api/build/ticket-cache.ts:275-279`. Routed to the orchestrator.

  **DEFECT 2 — over-invalidation of `projects.analytics`.** It sits in the unconditional head (`:258-261`), so every ticket update invalidates it. `performance-followup/cache-policy.md` states the policy as "assignee → `projects.analytics` **only when the board groups by assignee**". The code matches neither half: it is neither assignee-scoped nor grouping-conditional. Either the code should move that call into a branch or the policy row should be rewritten to describe what ships; they cannot both stand. Routed to the orchestrator as a decision, because narrowing it is a behaviour change.

  **REFETCH-TRIGGER CLAIM CORRECTED.** The previous entry said a report "does not re-read until its next mount or window focus". The conclusion is right and the mechanism is not, and the mechanism is what a reader would act on. Every call does use `refetchType: "none"`, which marks stale without refetching, and all six report hooks do declare `staleTime: 2 * 60_000` (`frontend/hooks/api/build/reports.ts:133,149,160,171,181,191`, re-verified this lane). But **TanStack's own focus refetch is switched off**: `createAppQueryClient` sets `refetchOnWindowFocus: false` at `frontend/components/providers/query-provider.tsx:71`, alongside `staleTime: 1000 * 60 * 2` (`:69`) and `gcTime: 1000 * 60 * 10` (`:70`). No report hook overrides it.

  What actually refreshes a stale Build report is a bespoke listener: `subscribeBuildCacheSync` (`frontend/lib/build-cache-sync.ts:68`, mounted at `components/providers/query-provider.tsx:113`) registers `window.addEventListener("focus", refreshActiveBuildQueries)` (`:108`) and a `visibilitychange` handler (`:102-104`), and `refreshActiveBuildQueries` calls `client.refetchQueries({ queryKey, type: "active" })` over `BUILD_QUERY_PREFIXES` (`:90`) — which includes `buildWorkQueryKeys.projectReports.all` (`:12`) — throttled to 15 s by `BUILD_FOCUS_REFRESH_THROTTLE_MS` (`:9`). A cross-tab `BroadcastChannel`/`localStorage` message invalidates the same prefixes (`:77`). So "invalidated" here does not mean "refreshed": the triggers are remount, a cross-tab message, and tab focus/visibility through a hand-rolled listener — never a clock. A report left mounted in a focused tab has no upper bound on its data age, which is the fact any freshness claim in this document has to carry.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether this box requires a verified projection-and-patch contract for every Build mutation, or only for ticket mutations.

  - **(A) Ticket scope.** Fix defects 1 and 2, then tick. Cost: one branch added, one policy/code reconciliation — hours. Accepts that governance/forms/QA/meeting/incident mutations refetch rather than patch, which FE-35 permits (it mandates patching only when the response already carries the new state).
  - **(B) Full scope.** Enumerate every Build mutation and verify its response projection carries the fields needed to patch every rendered cache. Cost: Build declares 39 paginated list responses and far more mutation handlers; this is a multi-day per-mutation audit with no gate to keep it true afterwards.

  **DECISION RESOLVED 2026-09-28 — (A), ticket scope.** (B) is rejected on cost-for-durability: a per-mutation audit across every Build mutation has no gate to keep it true afterwards, and FE-35 does not require patching where the response does not already carry the new state, so most of the audit would conclude "refetches, by design". (A) is the right scope and is now well defined, because the existing test suite fixes what "verified" means for it: a non-mocked `QueryClient` test per branch of `invalidateTicketUpdateViews`.

  **Resolving the decision does not tick the box.** (A) means asserting the ticket matrix is correct, and it is not: defect 1 leaves three date-driven reports stale, defect 2 over-invalidates against the written policy, and two of the function's eight declared parameter groups have no branch and no test. The minimum that earns it: a `schedulingChanged` branch invalidating `criticalPath`/`cycleTime`/`leadTime`, a decision on `projects.analytics` (narrow it, or rewrite the policy row to describe what ships), and two added cases in `ticket-cache.test.ts` for `startDate`/`dueDate` and `assigneeId`/`assigneeIds`. All three are frontend source edits, out of this lane's write scope; routed to the orchestrator.

  **NOT A REQUIREMENT:** the mutations outside the ticket matrix are unverified, not exempted. Choosing (A) records that they refetch by design, which is a policy, not an absence.

  **2026-09-28, third lane — EARNED under the resolved (A) scope. All three items the entry above named as "the minimum that earns it" were delivered by this lane, a fifth defect was found and fixed in the same read, and the `projects.analytics` decision is resolved in favour of the code.**

  **1. `schedulingChanged` NOW HAS A BRANCH.** `frontend/hooks/api/build/ticket-cache.ts:345-359` — a `startDate` or `dueDate` edit now invalidates `projectReports.criticalPath`, `projectReports.cycleTime` and `projectReports.leadTime`, the three date-driven aggregates the dead flag was leaving stale. It does **not** touch `velocity` or `burnup`, which are points- and cycle-driven.

  **2. DEFECT 2 RESOLVED IN FAVOUR OF THE CODE; THE POLICY ROW IS THE THING THAT WAS WRONG.** The options were narrow the call or rewrite the row. Narrowing is rejected on the payload, not on cost: `performance-followup/cache-policy.md` § Server caches describes `GET /build/:projectId/analytics` as "a health score over live ticket state" and prescribes `CACHE_TTL.SHORT` (30 s) for exactly that reason. A project-wide health aggregate over live ticket state is moved by *any* ticket edit — status, points, dates, assignee — so an assignee-and-grouping-conditional invalidation would **under**-invalidate, which is a correctness regression dressed as a narrowing. The unconditional call at `:258-261` is right; the matrix row "assignee → `projects.analytics` only when the board groups by assignee" was written from the client's grouping rather than from the payload, and it is corrected in `performance-followup/cache-policy.md` in the same pass. This is recorded as a decision with a consequence: `projects.analytics` is deliberately invalidated on every ticket update, its client `staleTime` is `30_000`, and nothing may cite the old row as describing shipped behaviour.

  **3. A FIFTH DEFECT, FOUND BY FOLLOWING THE MATRIX'S OWN DEPENDENCY ROW, AND FIXED.** The `dependency add/remove` row prescribes `projectReports.criticalPath`. Measured: `useAddTicketRelation` and `useRemoveTicketRelation` (`frontend/hooks/api/build/ticket-sub-resources.ts`) invalidated **only** `projects.ticketRelations(ticketId)` and nothing else — so adding or dropping a blocking edge left the critical path, the one report a dependency graph is built from, stale until focus or remount. Both `onSuccess` handlers now also invalidate `buildWorkQueryKeys.projectReports.criticalPath(projectId)` with `refetchType: "none"`, matching the convention of every other Build report invalidation.

  **4. THE TESTS. Four added cases in `ticket-cache.test.ts` and three in `ticket-cache-regression.test.ts`, all against a real `QueryClient` with the helper under test not mocked.** Verbatim, `frontend/`:

  ```
  $ nice -n 10 npx jest --maxWorkers=2 hooks/api/build/ticket-cache.test.ts
  PASS hooks/api/build/ticket-cache.test.ts
    19 — invalidateTicketUpdateViews narrows report eviction per cache-policy.md
      √ empty changes (no fields at all) evict no report cache (2 ms)
      √ title-only change evicts only criticalPath (title is projected in the critical-path query) (1 ms)
      √ rank change with undefined status evicts no report cache
      √ status transition evicts cycleTime, leadTime, cfd, velocity, burnup — but not criticalPath
      √ points change evicts velocity, burnup, and criticalPath — but not cycleTime, leadTime, cfd (1 ms)
      √ cycle membership change evicts velocity and burnup — and no other report
      √ status change does not evict criticalPath
      √ start-date change evicts criticalPath, cycleTime and leadTime — the three date-driven reports
      √ due-date change evicts the same three date-driven reports as a start-date change (1 ms)
      √ assignee change evicts no report cache, and projects.analytics is unconditional rather than assignee-scoped
      √ multi-assignee change behaves as the single-assignee case does
      √ status transition evicts the filtered board column counts
      √ cycle membership change evicts the filtered board column counts
      √ a title-only change leaves the filtered board column counts alone (1 ms)
  Tests:       14 passed, 14 total

  $ nice -n 10 npx jest --maxWorkers=2 hooks/api/build/ticket-cache-regression.test.ts
  PASS hooks/api/build/ticket-cache-regression.test.ts
    ✓ a failed edit preserves newer ticket changes, project fields and loaded pages (62 ms)
    ✓ updates an infinite board without destroying its pages (1 ms)
    ✓ rolls back filtered multipage boards and paginated lists after failure (4 ms)
    ✓ invalidates My Issues after title changes without refreshing unrelated reports for text changes (1 ms)
    ✓ invalidates My Issues after priority changes without refreshing unrelated reports for text changes (1 ms)
    ✓ invalidates My Issues after dueDate changes without refreshing unrelated reports for text changes (1 ms)
    ✓ bulk updates invalidate actual detail, board, cycle and report cache entries (1 ms)
    ✓ bulk updates patch every loaded ticket collection before refetch completes (1 ms)
    ✓ rank status changes refresh counts, reports and dashboard and call the caller (1 ms)
    ✓ rank updates patch an active board without issuing a duplicate list request (2 ms)
    ✓ adding a dependency invalidates the critical path the new edge moves (1 ms)
    ✓ removing a dependency invalidates the critical path the dropped edge moves
    ✓ deleting a ticket invalidates the lists and reports it fed rather than patching them out (1 ms)
  Tests:       13 passed, 13 total

  $ nice -n 10 npx jest --maxWorkers=2 hooks/api/build
  Test Suites: 1 failed, 70 passed, 71 total
  Tests:       8 failed, 717 passed, 725 total
  ```

  The one red suite is `hooks/api/build/milestones-list-contract.test.ts` — a peer lane's in-flight contract edit (`Invalid input: expected number, received undefined` on `milestoneListContract.parse`), unrelated to anything above and out of this lane's write scope.

  **7 of 14 cases in `ticket-cache.test.ts` are this lane's.** The four new `invalidateTicketUpdateViews` cases cover the two parameter groups that previously had no branch and no test (`startDate`/`dueDate`, `assigneeId`/`assigneeIds`), and three cover `projects.columnCounts` — the filtered-count clause `performance-followup/cache-policy.md` box 1 records as having zero coverage. The three new regression cases close the three matrix rows that are not parameters of `invalidateTicketUpdateViews`: dependency add, dependency remove, and delete.

  **ONE MATRIX ROW IS RECORDED AS REFETCH-BY-DESIGN RATHER THAN IMPLEMENTED AS WRITTEN.** The `delete` row says "remove from every loaded list". `useDeleteTicket` (`frontend/hooks/api/build/ticket-create-rank-mutations.ts:177-203`) does **not** call `removeTicketFromCollections`; it calls `invalidateBuildViews`, which invalidates the lists, the detail, the counts and every `projectReports` key for the project. `removeTicketFromCollections` exists but is used only to roll back an optimistic *create* (`:155`, in the create hook's `onError`). FE-35 permits refetching where the response does not carry the new state, and a delete response carries nothing, so this is a policy and not a gap — but the row overstates it, and the new test is named for what ships ("invalidates the lists and reports it fed rather than patching them out") rather than for the row.

  **WHY THE BOX NOW TICKS, stated against the resolved (A) scope and not against (B).** (A) means the ticket matrix is asserted correct, and "verified" was defined above as a non-mocked `QueryClient` test per branch of `invalidateTicketUpdateViews`. Every branch now has one; both previously branchless parameter groups now have a branch or a recorded reason they need none; the dependency row's missing invalidation is fixed; and the `projects.analytics` contradiction is resolved with the policy row corrected to the code rather than the code bent to the row. The mutations outside the ticket matrix remain refetch-by-design under FE-35, which (A) records as a policy — they are not newly claimed here.

  **NOT A REQUIREMENT, unchanged:** governance, forms, QA, meeting and incident mutations refetching rather than patching stays a policy FE-35 permits. If one is ever shown to leave a user reading stale data it becomes a named exception needing explicit patch coverage, and this tick does not cover it.
- [x] Public, employee-preview, and external-client authentication interfaces remain separate. **2026-09-28 EARNED.** Option (A) is taken — structural separation plus `check:route-classification` is sufficient — and the measurement that settles it is stronger than the previous entry believed.

  Gate run, `backend/`, self-test first (BE-139 caveat does not apply; this gate is a static scan):

  ```
  $ node src/scripts/route-classification-report.mjs --self-test
  { "selfTest": true, "pass": true, "checks": {
      "publicClassAppliesToAllHandlers": true, "handlerLevelPublicOverridesClass": true,
      "handlerLevelPermissionParsed": true, "undeclaredDetected": true,
      "universalClassAppliesToAllHandlers": true, "keywordsInsideBodyDoNotCreateFakeHandlers": true,
      "reservedWordMethodNamesAreStillHandlers": true, "reservedWordHandlersAreClassified": true,
      "undeclaredReservedWordHandlerIsReported": true, "asyncHandlerClassifiedCorrectly": true,
      "wrappedClassDecoratorStillClassifies": true, "wrappedHandlerDecoratorStillClassifies": true,
      "wrappedPermissionStillClassifies": true, "emptyInServiceNameIsNotADeclaration": true,
      "pilotPublicExposureMismatchDetected": true, "pilotPublicExposureMatchPasses": true,
      "pilotPublicExposureTrueMatchPasses": true } }

  $ node src/scripts/route-classification-report.mjs
  Route classification report
    Total handlers : 4111
    public         : 302
    universal      : 113
    permissioned   : 3623
    in-service     : 73
    UNDECLARED     : 0
  RESULT: ALL ROUTES CLASSIFIED
  Manifest pilot (timesheets): publicExposure=false — OK
  ```

  The self-test proves the scanner is not vacuous: `undeclaredDetected`, `undeclaredReservedWordHandlerIsReported` and `emptyInServiceNameIsNotADeclaration` are the assertions that a gate reporting `UNDECLARED: 0` on a broken tree would fail. `handlerLevelPublicOverridesClass` and `publicClassAppliesToAllHandlers` together prove it reads exposure at both class and handler level, which is what this box turns on.

  Structural separation confirmed on disk: `backend/src/modules/build/client-portal/`, `backend/src/modules/portal/` and `backend/src/modules/public/` all exist as distinct modules.

  **CORRECTION — the previous entry named the wrong class and drew the wrong conclusion.** It reported "two `@Public()` controller classes ARE present in `backend/src/modules/build/**`", citing `SubmissionsController` at `build/forms/submissions.controller.ts:107`. `SubmissionsController` is at `:55` and is `@UseGuards(JwtAuthGuard, PermissionGuard)` on `@Controller("build/:projectId/forms/:formId/submissions")` with `@RequirePermission` on all three handlers (`:59`, `:73`, `:86`) — it is fully authenticated and carries no `@Public()`. The `@Public()` at `:107` belongs to **`SubmissionsPublicController`** (`:101`), a *separate* class in the same file mounted at `@Controller("public/build-forms")`.

  That correction inverts the finding into positive evidence. `grep -rn "@Public()" src/modules/build --include=*.controller.ts` returns exactly two hits, and **both sit on controllers whose route prefix is `public/`, not `build/`**:

  | Hit | Class | Route prefix |
  |---|---|---|
  | `build/execution/whiteboard-sharing.controller.ts:112` (class-level, class at `:114`) | `PublicWhiteboardLinksController` | `public/whiteboard-links` |
  | `build/forms/submissions.controller.ts:107` (handler-level, class at `:101`) | `SubmissionsPublicController` | `public/build-forms` |

  So **no route under the `/build` prefix is public.** The two public surfaces are token-capability endpoints (shared whiteboard viewer; public form submission) on their own controllers under their own prefix, each rate-limited by IP at the handler (`whiteboard:public-view`, `public:form-submit`), consistent with the "public tokens are random opaque capabilities… rate-limited" clause above. Option (B) — a gate asserting no Build-module controller carries `@Public()` — would have to be written as "no controller *mounted under `build/`* carries `@Public()`", because the file-path form of the rule would fail against these two correct controllers. That is a second reason to prefer (A): the file tree is not the authorization boundary, the route prefix and the exposure decorator are, and `check:route-classification` already reads both.
