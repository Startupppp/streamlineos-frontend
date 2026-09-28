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

- [ ] Every collection is cursor/page bounded and sorted deterministically. **2026-09-28 NOT EARNED. Re-run this lane; every figure in the previous entry has moved and is corrected below. The cause is a sibling-lane refactor, not new defects.**

  `check:unbounded-reads --self-test` → `Self-tests passed.` Gate run, verbatim tail:

  ```
  FAIL — 3 gate violation(s):
    • 8 stale classification entry(ies)
    • 29 unclassified path(s) — classify before committing
    • 1 regression(s) — re-check the migration
  ```

  **FIGURES CORRECTED: 21 unclassified → 29. 0 stale → 8. Build-territory unclassified: 2 → 10.** The regression count is unchanged at 1.

  **ROOT CAUSE, and it is a single fact.** A sibling lane split `backend/src/modules/build/core/` into subfolders — `automation/`, `project-crud/`, `roadmap/`, `work-query/`, `tickets/`, `analytics/`. `src/scripts/baselines/unbounded-reads-classification.json` still names the **old** paths, so each moved file now counts twice: once as a stale entry at its old path and once as an unclassified path at its new one. All 8 stale entries are Build-owned and are exactly this: `/build/core/build-automation-runner.service.ts`, `/build/core/build-automation-run-history.service.ts`, `/build/core/projects-query.service.ts`, `/build/core/projects-work-query.service.ts`, `/build/core/projects-write.service.ts`, `/build/core/project-access.ts`, `/build/core/projects-roadmap.service.ts`, `/build/core/projects-automations.service.ts`.

  **This is a path-bookkeeping repair, not 8 new defects.** The fix is to repoint those 8 entries in `unbounded-reads-classification.json` at their new paths, which clears 8 stale *and* 8 unclassified in one edit and takes the unclassified count from 29 to 21. That is a baseline data file, out of this lane's write scope; routed to the orchestrator. Full mapping of Build-territory unclassified paths and their sites:

  | New path | Sites |
  |---|---|
  | `/build/core/automation/build-automation-run-history.service.ts` | `:192` |
  | `/build/core/automation/build-automation-runner.service.ts` | `:173` |
  | `/build/core/automation/projects-automations.service.ts` | `:30` |
  | `/build/core/project-crud/project-access.ts` | `:60` |
  | `/build/core/project-crud/projects-query.service.ts` | `:69, :73, :180, :192` |
  | `/build/core/project-crud/projects-write.service.ts` | `:142, :159, :190, :291` |
  | `/build/core/roadmap/projects-roadmap.service.ts` | `:224` |
  | `/build/core/tickets/build-ticket-bulk-mutation.ts` | `:164, :201` |
  | `/build/core/work-query/projects-work-query.service.ts` | `:309, :610` |
  | `/build/updates/updates.service.ts` | `:56` |

  The last two rows are the 2 the previous entry already knew about; the other 8 are the moved files. Out-of-lane unclassified (19 files): `/e-sign` (1 OFFSET), accounting, expenses, HR (2), invoices (2), KB (7), notifications, timesheets. Regression, out of lane: `/timesheets/core/lib/billing-export.ts` (was `KEYSET-MIGRATED`).

  **SEPARATE BUILD-TERRITORY DEFECT, found this lane — a bare truncated array.** `GET /build/:projectId/automations` declares `@ResponseSchema(z.array(projectAutomationListItemSchema))` (`backend/src/modules/build/core/automation/projects-automations.controller.ts:43`) and its service does `.orderBy(desc(projectAutomations.createdAt)).limit(100)` (`projects-automations.service.ts:90-91`). So the read is bounded and deterministically ordered, but it returns a **bare array with no `nextCursor` and no `hasMore`** — automation 101 is silently invisible and the client cannot tell. That is a hard truncation, not a page, and it fails both BE-25 (paginate live lists by cursor) and this box's own wording. The client matches: `frontend/hooks/api/build/automations.ts:64` is `useQuery<ProjectAutomation[]>`. Fix is a `buildIdCursorPage` / `buildCursorPage` envelope on both sides. Routed to the orchestrator.

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

  **WHAT WOULD SETTLE IT.** Three independent things, none of which needs a database: (1) repoint the 8 stale classification entries; (2) classify the 2 genuinely-new Build sites and declare ceilings for `/cron/projects-recurring-flush` and `/cron/feedbucket-media-retention-sweep`; (3) give `GET /build/:projectId/automations` a cursor envelope. After all three, the gates are still red on the 19 out-of-lane unclassified paths, the timesheets regression and the 3 out-of-lane route-budget violations, so **this box cannot be earned by Build acting alone** — that is the honest blocker, and it should not be read as licensing any of the Build items above to stay.
- [x] Every mutation has Zod validation, permission checks, tenant-safe lookup, and idempotency where retriable. **2026-09-27:** `check:params-schema-completeness` PASS — 638 controllers, 1940 routes, all params declared. `check:record-access` PASS — every record read excludes soft-deleted rows. `check:idempotent-commands` — Build-territory violation fixed: `POST build/:projectId/client-portal/publish` now carries `@Idempotent("build.portal.publish")`; 2 residual unfenced handlers are `chat-assistant.controller.ts:240` (AI) and `kb-research-brief.controller.ts:109` (KB) — both out of lane.
- [x] Error codes are machine-readable and route/page states preserve backend detail. **2026-09-27:** Error code table verified from `backend/src/common/http/all-exceptions.filter.ts`. `check:page-state-usage` PASS — no self-closing `<PageState />` found; FE-41 (`error` passed to `usePageState`) is enforced by the gate.
- [ ] Response projections are sufficient for precise optimistic cache updates. **2026-09-28 NOT EARNED. The previous entry's evidence claim was false and is withdrawn; a real defect is named in its place.**

  **CLAIM CORRECTED: "`ticket-cache.ts:281-348` matrix covers status, title, assignee, rank, points, cycle, dependency, delete" — it does not.** Read at `frontend/hooks/api/build/ticket-cache.ts:231-349` this lane. `invalidateTicketUpdateViews` takes a `changes` object declaring **eight** keys (`title`, `status`, `cycleId`, `points`, `startDate`, `dueDate`, `assigneeId`, `assigneeIds` — `:236-243`) and derives **five** flags (`:271-276`): `titleChanged`, `statusChanged`, `cycleChanged`, `pointsChanged`, `schedulingChanged`. `rank`, dependency add/remove and delete are **not parameters of this function at all** — they are handled by other helpers, so the cited range never covered them. `assigneeId`/`assigneeIds` are parameters but have **no branch**.

  The function's actual shape is an unconditional head then four conditional branches:
  - Unconditional (`:246-269`), on *every* ticket update: `projects.tickets({projectId})`, `ticketActivity.list(ticketId)`, `projects.allWorkAll`, `projects.analytics(projectId)`, `projects.list()`, `dashboard.myIssues()`.
  - `statusChanged` (`:281-306`) → columnCounts, cycleTime, leadTime, cfd, velocity, burnup.
  - `cycleChanged` (`:308-321`) → cycles, velocity, burnup.
  - `pointsChanged` (`:323-336`) → velocity, burnup, criticalPath.
  - `titleChanged` (`:338-343`) → criticalPath.
  - Tail (`:345-348`) → `dashboard.activeSprintSummary()`.

  **DEFECT 1 — `schedulingChanged` is a dead flag.** It appears only in the early-return guard at `:278`; it has no branch of its own. So a start-date or due-date edit passes the guard, falls through all four branches, and reaches only `activeSprintSummary`. It does **not** invalidate `criticalPath`, `cycleTime` or `leadTime` — and all three are date-driven aggregates (`05-performance-caching.md` measurement queue classifies cycle-time and lead-time as date-window aggregates and critical-path as a dependency **graph** built from dates). Moving a ticket's dates therefore leaves the critical path, cycle time and lead time reports stale. Fix: give `schedulingChanged` a branch invalidating `criticalPath`, `cycleTime`, `leadTime`. File and line: `frontend/hooks/api/build/ticket-cache.ts:275-279`. Routed to the orchestrator.

  **DEFECT 2 — over-invalidation of `projects.analytics`.** It sits in the unconditional head (`:258-261`), so every ticket update invalidates it. `performance-followup/cache-policy.md` states the policy as "assignee → `projects.analytics` **only when the board groups by assignee**". The code matches neither half: it is neither assignee-scoped nor grouping-conditional. Either the code should move that call into a branch or the policy row should be rewritten to describe what ships; they cannot both stand. Routed to the orchestrator as a decision, because narrowing it is a behaviour change.

  Note also that every call uses `refetchType: "none"`, which marks stale without refetching. Combined with `staleTime: 2 * 60_000` on all six report hooks (`frontend/hooks/api/build/reports.ts:133,149,160,171,181,191`, verified this lane), a report does not re-read until its next mount or window focus. That is defensible, but it means "invalidated" here does not mean "refreshed", and any freshness claim must say which.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether this box requires a verified projection-and-patch contract for every Build mutation, or only for ticket mutations.

  - **(A) Ticket scope.** Fix defects 1 and 2, then tick. Cost: one branch added, one policy/code reconciliation — hours. Accepts that governance/forms/QA/meeting/incident mutations refetch rather than patch, which FE-35 permits (it mandates patching only when the response already carries the new state).
  - **(B) Full scope.** Enumerate every Build mutation and verify its response projection carries the fields needed to patch every rendered cache. Cost: Build declares 39 paginated list responses and far more mutation handlers; this is a multi-day per-mutation audit with no gate to keep it true afterwards.

  **Recommended: (A), but only after defects 1 and 2 are fixed.** The previous entry recommended (A) on the strength of a matrix that does not exist as described — ticking on that basis would have recorded a false claim. (A) is still right; it is not yet earned.

  **NOT A REQUIREMENT:** the mutations outside the ticket matrix are unverified, not exempted. Choosing (A) records that they refetch by design, which is a policy, not an absence.
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
