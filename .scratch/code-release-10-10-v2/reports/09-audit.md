# 09 — Build, PM and Workflows — re-audit at current head

**Ticket:** `.scratch/code-release-10-10-v2/issues/09-build-pm-workflows.md`
**Criteria:** PRD-C123 (Build/PM), PRD-C124 (Workflows)
**Prior report:** `.scratch/code-release-10-10-v2/reports/09-build-pm-workflows.md` — read in full; its claims
re-verified at head (§1), then pushed past.
**Verdict:** **partially met.** Both criteria are reconstructed here in full. Nine defects found that the
prior audit did not report, one of them **P0 (money wrong on every project, in every org, permanently)**.

| | |
|---|---|
| Backend SHA | `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`) |
| Frontend SHA | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| Working tree | dirty with **other agents'** edits (7 modified, 4 untracked, all outside this territory). Nothing here was written except this file. |
| Databases probed | `scratch_head_1010` (catalog, journal 677/677, 944 tables) · `scratch_perf_seed` (20,572 tickets, 8 orgs — for `EXPLAIN (ANALYZE, BUFFERS)`) |
| Role for every plan | `streamline_app`, verified `rolbypassrls = f`. Every statement inside `BEGIN … ROLLBACK`. **Nothing was written to any database.** |

---

## 0. Corpus read — with numbers

### Backend (`streamlineos-backend`)

| | build | workflows | automation | tasks | issues | goals | `common/workflow` | **total** |
|---|---|---|---|---|---|---|---|---|
| `.ts` files | 324 | 57 | 20 | 15 | 14 | 13 | 19 | **462** |
| controllers | 42 | 2 | 1 | 1 | 1 | 1 | — | **48** |
| HTTP routes | 299 | 33 | 1 | 10 | 8 | 10 | — | **361** |
| `*.spec.ts` | 111 | 29 | 7 | 4 | 5 | 4 | 6 | **166** |
| `*.e2e-spec.ts` | 19 | 1 | 1 | 1 | 1 | 1 | — | **24** |
| seeded (real-DB) e2e | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |

**Schema.** 83 build tables declared across 32 files under `src/db/schema/build/` (via `pgSchema`, not
`pgTable` — a `pgTable(` scan reports the module as dead). Live catalog: **80 in `build` + 3 in
`build_events` = 83.** Declared and live agree exactly.
- **83/83 carry `org_id`** — verified against `information_schema.columns`, zero exceptions.
- **83/83 have RLS enabled with ≥1 policy** — verified against `pg_class.relrowsecurity` + `pg_policy`.
- Workflow side: 14 tables (`workflows`, `workflow_versions`, `workflow_executions`,
  `workflow_execution_steps`, `workflow_approvals`, `workflow_schedules`, `workflow_variables`,
  `workflow_secrets`, `workflow_audit_logs`, `workflow_runs`, `workflow_steps`, `outbox_events`,
  `automation_rules`, `automation_runs`) — **14/14 RLS + policy.**

**Joins.** Scanned all **127** `innerJoin`/`leftJoin`/`rightJoin`/`fullJoin` sites in the territory.
**64 carry no org predicate in the ON clause.** Classified all 64: 23 join onto `users` (a global table
with no `org_id` — safe by construction); the other 41 were checked against `pg_constraint` for 19 child
tables and **every one is backed by a composite `(org_id, X) → parent(org_id, id)` foreign key.**
No cross-tenant leak via a join. (Unstated, not unsafe — see F13.)

### Frontend (`streamlineos-frontend/frontend`)

| | count |
|---|---|
| `features/build/**` | 466 files (391 `.tsx`, 75 `.ts`), 50 sub-folders, 11 tests |
| `features/workflows/**` | 22 files (19 `.tsx`), 8 page-level views |
| `app/**/build/**/page.tsx` | **78** routes |
| workflow `page.tsx` | 13 |
| `hooks/api/build/**` | 57 files, **6,699 lines**, **338 `queryKey:` sites** |
| workflow hook modules | 10 (`workflows{,-analytics,-approvals,-definitions,-executions,-schedules,-secrets,-types,-variables}.ts`, `build/workflow.ts`) |

### Commands actually run

- **26 backend `check:*` gates** — 25 exit 0; `check:file-sizes` **exit 1** (stale registry row on
  `src/scripts/check-referential-action-drift.ts`, registered 596 / actual 606 — **ticket 30's file, not mine**).
- **7 frontend `check:*` gates** — all exit 0 (must be run from `frontend/`, not the repo root; from the
  root all seven exit 1 with no output, which is a missing script, not a violation).
- **1 targeted jest e2e**: `workflows.controller.e2e-spec` → **20/20 pass** (see §5 for the caveat that
  makes this weaker evidence than it looks).
- **3 `EXPLAIN (ANALYZE, BUFFERS)`** on `scratch_perf_seed` as `streamline_app` under RLS.
- **~20 catalog probes** against `scratch_head_1010`.
- **Not run** (per the laptop budget): `next build`, `typecheck`, backend lint, `test:e2e:seeded`, `knip`,
  the full jest suite. Nothing is claimed from any of them.

---

## 1. The prior audit, re-verified at head

Its P0 fix landed as commit **`959b0a894` "fix(workflow): the durable runtime was denied under RLS at
every site"** and is present at head. Spot-checked and confirmed:

| prior claim | at head |
|---|---|
| `workflow-store.ts` per-tenant everywhere | **holds** — `runInTenantTransaction` on all five sites, `forEachOrg` on the two sweeps |
| relay cursor is per-organisation | **holds** — `cursors: Map<string, number>`, `positionFor(orgId)` |
| `projects-tickets.service.ts` blocker probe bounded | **holds** — `BLOCKER_PROBE_LIMIT = 50` at `:50`, `50+` message at `:161` |
| `projects-activity.service.ts` cycle lookup scoped | **holds** — `resolveCycleNames` carries the org predicate and the corrected comment |
| `listTemplates()` returns `[]` | **still true** — `workflows.service.ts:98-99` |
| workflow secrets write-only | **still true** — `decryptSecret` has 5 call sites in `src/` (chat, webhooks, billing×2); **none on `workflowSecrets`** |
| 1 of 19 mutating workflow routes has `@Idempotent` | **still true** — only `publish` at `workflows.controller.ts:195` |
| `build-calendar-source.ts` at the top of `build/` | **still true** |
| execution history keyset-paginated | **holds** — `(created_at, id)`, `limit+1`, `buildCursorPage` |
| `ON CONFLICT` arbiter inferable on `workflow_steps` | **verified** — `uniq_workflow_steps_run_name UNIQUE (organization_id, workflow_run_id, step_name)` exists |

### One stated premise in the prior report is wrong at head, and it matters

> *"The `DRIZZLE` provider is a plain pool handle, not a tenant-aware proxy (`src/db/drizzle.module.ts:31`),
> so `this.db` never picks up an ambient GUC."*

`src/db/drizzle.module.ts:42` reads `return createTenantAwareDb(Object.assign(drizzle(client, { schema }), …))`.
`createTenantAwareDb` (`src/common/tenant/tenant-db.ts:14-24`) is a `Proxy` that routes every call to the
ambient tenant transaction when `getTenantContext()` returns one, and `TenantContextInterceptor` is a global
`APP_INTERCEPTOR` (`src/app.module.ts:216`) that opens exactly that transaction for every HTTP request.

**The fix was still correct and still necessary** — the workflow runtime runs on the cron path, where there
is no request context, so the proxy falls through to the bare pool and the GUC really is unset. But the
stated reason would lead a future reader to conclude that every `this.db` in every service is unscoped,
which is false and would trigger a large, unnecessary rewrite. Correcting it here.

**Consequence the prior audit did not draw:** because every request runs inside an open tenant transaction,
any provider call a handler makes is *by construction* a provider-call-in-a-transaction. The escape hatch is
`@NoTenantTransaction()`, used **70 times** across `src/modules`. It is used **zero times in `build/`,
`workflows/` or `automation/`.** That is the root of F05.

---

## 2. PRD-C123 — Build/PM, dimension by dimension

> *Reconstruct current-head Build/PM evidence across workspace/project/ticket schema, tenant and record
> authorization, bounded boards/backlogs/search, cursor and cache contracts, async/realtime workflows,
> frontend states, folder cohesion and representative E2E.*

### 2.1 Workspace / project / ticket schema — **MET**
83 tables, declared == live, 83/83 `org_id`, 83/83 RLS + policy. Composite `(org_id, id)` uniques and
composite FKs throughout (`fk_tickets_org_project`, `fk_tickets_org_cycle`, `fk_tickets_org_epic`,
`fk_tickets_org_parent`, `fk_tickets_org_recurrence_parent`, and 40+ more verified). `check:tenant-indexes`
exit 0 over **840 tenant tables, 840 with a leading tenant index**. `check:declaration-column-drift` and
`check:tenant-relationships` are green at head per the shared sweep.

### 2.2 Tenant and record authorization — **MET**
- `check:tenant-isolation` exit 0: **931/931** tenant-owned services map to an isolation spec (the gate
  prints its own caveat that this proves existence, not passage).
- `check:record-access`, `check:scope-application`, `check:authz-deny`, `check:module-entitlement` — all exit 0.
- The record-vs-tenant split the prior audit described is intact: `resolveProjectAccess`
  (`core/project-access.ts:47`) walks owner → permission → manager → member → team; `assertProjectInOrg`
  (`:16`) is tenant-only for releases/webhooks/custom-fields/analytics/sprints/epics/cycles/modules. Still
  a product decision, still left alone.
- 64 org-less joins, all backed by composite FKs (§0). **No cross-tenant read found.**

### 2.3 Bounded boards / backlogs / search — **PARTIALLY MET**
Bounded in the sense that every page has a `LIMIT`. **Not bounded in the sense that matters**: the board's
per-page *work* grows with the project, not with the page. Measured, not asserted — **F03**.

`projects-search.service.ts:17-31` materialises every project the caller is a member of with **no `LIMIT`**
and feeds the whole array to `inArray` — **F14**. `all-work` is correct: `Math.min(rawLimit, PAGE_SIZE_CAP)`
at `projects-work-query.service.ts:83`, `limit + 1` over-fetch, cursor.

### 2.4 Cursor and cache contracts — **PARTIALLY MET**
`PAGE_SIZE_CAP = 100` clamps rather than 400s; `decodeCursor` degrades to page 1 on a malformed cursor while
`keyset.ts:30` throws on a structurally invalid position — a deliberate, documented split. The two-envelope
frontend split (nested `pagination` vs flat `nextCursor`) matches the backend on all six endpoints the prior
audit tabulated; I re-checked two and agree — **do not "unify" them.**

Cache: **338 `queryKey:` sites** in `hooks/api/build/**`. The org dimension is absent from every key
(`queryKeys.access.me()` is literally static), but `useSwitchOrg` (`hooks/common/auth-hooks.ts:171`) calls
`queryClient.clear()` on success, so the cross-tenant cache leak is closed. **Closed by a side effect two
files away rather than by the key** — F15.

`useTicket` keys on `queryKeys.projects.ticket(ticketId)` and omits `projectId` while the URL carries it
(`ticket-queries.ts:113-116`). Safe because `tickets.id` is a global identity PK, so a ticket belongs to
exactly one project. Noted, not a finding.

### 2.5 Async / realtime workflows — **PARTIALLY MET**
Build's own project webhooks are **correct and are the model**: `projects-webhooks-dispatch.service.ts`
writes a `webhookDeliveries` row and an outbox event inside the caller's transaction (`:137-190`) and
delivers from an outbox consumer (`:193-198`). Automation's webhook path does the opposite — **F05**.

### 2.6 Frontend states — **NOT MET on the two highest-traffic pages**
`check:empty-states` exit 0 over 3,854 files (it checks for hand-rolled empty states outside `EmptyState`;
it does **not** check that an error is distinguished from an empty result). I scanned all **404** `.tsx`
under `features/build` + `features/workflows`: 93 use `<EmptyState>`, 98 have an error branch, **14 have an
empty state and no error branch.** Four of those fetch data; two are the project **board** and the
**backlog** — **F02**.

All 8 `features/workflows` page views carry loading + error + empty. Confirms the prior audit (it said 7).

### 2.7 Folder cohesion — **MET, one cosmetic exception**
`check:cycles`, `check:import-direction`, `check:module-di`, `check:namespace-coverage`, `check:over-300`
all exit 0. `build/` has 16 cohesive sub-modules; `core/` holds the parent's own services. The one
non-module production file at the top of `build/` is still `build-calendar-source.ts`, and the prior
audit's reason for not moving it (it is a key in two shared gate baselines) still applies.

### 2.8 Representative E2E — **NOT MET** (see §5)

---

## 3. PRD-C124 — Workflows, dimension by dimension

> *Reconstruct current-head Workflow evidence across definition/version/execution schema, permission rung,
> bounded execution history, idempotent queue/outbox processing, retry/DLQ/cancellation, secrets/redaction,
> frontend states and representative E2E.*

### 3.1 Definition / version / execution schema — **MET**
Nine tables in `src/db/schema/common/workflow.ts`, all with non-null `org_id`, composite tenant FKs and
`unique(org_id, id)`. Definition and version are genuinely separate: `workflows.version` is only a pointer;
the immutable definition is `workflow_versions.definitionJson`; `workflow_executions.workflowVersionId`
pins an execution to the version it ran. Verified in the live catalog:
`fk_workflow_executions_workflow_version_id_org FOREIGN KEY (org_id, workflow_version_id) REFERENCES
workflow_versions(org_id, id)`.

### 3.2 Permission rung — **MET**
All 33 routes on the two workflow controllers sit under a class-level `PermissionGuard` +
`@RequireModule("workflows")` with an explicit `@RequirePermission`. `UpdateWorkflowSchema` omits
`"published"` so publishing cannot be reached through the weaker `update` rung.
`check:permission-binding` exit 0 over **2,384 bindings**, 13 held back — **none in this territory**.
`check:navigation-permissions` / `check:route-access-contract` green (204 keys, 633 `x-permission` entries).

### 3.3 Bounded execution history — **MET on the wire, UNSUPPORTED in the index — F08**
`listExecutions` (`workflows-execution.service.ts:82-148`) is a clean 2-key keyset on `(created_at, id)`
with `limit + 1` and `buildCursorPage`. But `workflow_executions` has **no index on
`(org_id, workflow_id, created_at, id)`** — only `(workflow_id)`, `(org_id, status)`, `(org_id, created_at)`
and `(org_id, id)`. **NOT MEASURED** — the table is empty in every local database.

### 3.4 Idempotent queue / outbox processing — **NOT MET**
This is the weakest dimension in the ticket and the prior audit closed only part of it.

- **The outbox→workflow relay is dead code.** `WorkflowRegistry.triggeredBy(eventType)` filters on
  `definition.triggers?.includes(eventType)` (`workflow-registry.ts:29-33`). **No `WorkflowDefinition`
  anywhere in `src/` sets `triggers`** — grep for the field returns exactly two non-spec hits: the type
  declaration (`workflow.types.ts:56`) and the filter itself. All 6 registered workflows (ingress ×1,
  CRM ×3, autonomy ×1, AI node ×1, plus a non-production selfcheck) are started by a direct
  `runner.start()`. So `relay()` starts **zero** runs, on every tick, by construction — **F09**.
- **The relay livelocks the moment anyone adds a `triggers` field** — **F06**. Two compounding reasons:
  `lifecycle_state` is only ever written as `'ACTIVE'` (`outbox-envelope.ts:33` + column default) and
  **nothing in `src/` ever changes it**, so the relay's eligible set never shrinks; and the cursor advances
  only to `highestSeenThisPass − CURSOR_LAG (1000)`, while a pass sees at most `RELAY_BATCH_SIZE (50)`
  rows. Progress therefore requires *fewer than 50 active events per 1,000 global sequence ids for that
  org* — false for any busy tenant. The cursor pins at 0 and the same 50 events are re-read forever.
- **And the 50-row budget starves every other tenant** — **F07**. `forEachOrg` enumerates
  `ORDER BY organizations.id ASC` (`for-each-org.ts:161`), a fixed order; `relay()` spends
  `remaining = limit − events.length` and `return`s once it hits zero (`:121-122`). The lowest-id busy org
  consumes the whole budget every pass and no other org is ever read. (`claimDueRuns` uses the same budget
  shape but is self-limiting, because claiming flips rows out of the eligible set.)
- **`relay()` over-reports.** `startRun` returns the *existing* run id on redelivery
  (`workflow-store.ts:359-372`) and the relay counts `if (runId) started += 1` (`:178`) — so a redelivered
  event counts as "started". Under F06 the log would read `Relay started 50 workflow run(s)` on every tick
  forever. The metric is false-green.
- **The retention sweep that is supposed to bound `outbox_events` has never deleted a row** — **F01**.
- **1 of 19 mutating workflow routes is idempotent.** `POST /:workflowId/trigger` inserts a
  `workflow_executions` row with no dedupe key (`workflows-execution.service.ts:58-69`) — **F10**.
  `check:idempotent-commands` exits 0 over **11 handlers in scope out of 546 controllers scanned**, so its
  green says nothing about this route.

### 3.5 Retry / DLQ / cancellation — **MET**
Retry with a transient-vs-deterministic classifier (`engine/workflow-runner.service.ts:56-88`), dead-letter
(`engine/execution-advance.ts:321-344`), cancellation both API-side and cooperative engine-side, every
terminal write a compare-and-set on `status='running'`. `expireStuck` batches its retries through
`bulkUpdateFromValues` and bounds the scan with `STUCK_BATCH`. Covered by `dead-letter-execution.spec.ts`,
`execution-cancellation.spec.ts`, `execution-toctou.spec.ts`, `retry-dlq-bounded-history.spec.ts`.

### 3.6 Secrets / redaction — **MET for storage, feature unwired**
AES-256-GCM via `encryptSecret`, which throws if `ENCRYPTION_KEY` is unset rather than storing plaintext.
Redaction is structural: `SECRET_COLUMNS` omits `encryptedValue` and is used on every read, write and
`returning`. The e2e spec asserts `encryptedValue` never appears in a response body — and that assertion
**passed** in my run. Flip side unchanged: `decryptSecret` is never called on `workflowSecrets`, so a
stored secret can never be read by anything. Still a product decision, not a defect — **F11**.

### 3.7 SSRF — **MET**
`checkWebhookUrl` is called before the single `fetch` (`automation-webhook.service.ts:45 → :67`), with a
bite proof at `automation-ssrf.spec.ts:106-122`. `AbortSignal.timeout(10_000)` bounds the call.
`workflows/engine/executors/integration.executor.ts` makes no outbound call of its own.

### 3.8 Frontend states — **MET**
8/8 page views carry loading + error + empty. `workflow-templates-page.tsx:160-163` has a proper `isError`
branch with `refetch` — but its empty state is the only thing it can ever render (F11).
`useAllSchedules` / `useGlobalSecrets` / `useGlobalVariables` fetch page 1 and never page 2 — **F12**.

### 3.9 Representative E2E — **NOT MET** (§5)

---

## 4. Findings

| # | sev | file:line | finding |
|---|---|---|---|
| F01 | **P0** | `src/modules/build/core/projects-budget.service.ts:109` | Project budget reports **`actualCost: 0`** for every project, in every org, always. |
| F02 | **P1** | `src/modules/cron/cron-outbox-retention.service.ts:59`, `:76` | Retention sweep raises `column "org_id" does not exist` for every tenant, reports success, and has never deleted a row. |
| F03 | **P1** | `features/build/project-detail/project-board-page.tsx:127`, `features/build/backlog/project-backlog-page.tsx:248` | A backend 500 on the board/backlog renders a hard **404**. |
| F04 | **P1** | `src/modules/build/core/projects-tickets-read.service.ts:341` | Board paging is **O(project size) per page** — measured 18.3× more rows scanned than necessary. |
| F05 | **P1** | `src/modules/automation/automation-webhook.service.ts:31`, `:84` | Webhook delivered inside the request transaction; its delivery log is rolled back when any endpoint fails. |
| F06 | P2 | `src/common/workflow/workflow-outbox-relay.service.ts:70`, `:202-209` | Relay cursor cannot advance for a busy tenant — livelock (latent, F09 masks it). |
| F07 | P2 | `src/common/workflow/workflow-outbox-relay.service.ts:121-122` | 50-event budget spent in a fixed org order — permanent starvation of later orgs (latent). |
| F08 | P2 | `src/modules/workflows/workflows-execution.service.ts:118-146` | No index supports the per-workflow execution keyset. |
| F09 | P2 | `src/common/workflow/workflow-registry.ts:29` | No workflow declares `triggers`; the whole outbox→workflow relay is unreachable. |
| F10 | P2 | `src/modules/workflows/workflows.controller.ts:232` | `POST /:workflowId/trigger` is not idempotent. |
| F11 | P2 | `src/modules/workflows/workflows-secrets.service.ts`, `workflows.service.ts:98` | Secrets write-only; `listTemplates()` hardcoded `[]`. |
| F12 | P2 | `hooks/api/workflows-schedules.ts:19-27`, `-secrets.ts:23`, `-variables.ts:17` | Schedules/secrets/variables lists silently truncate at page 1. |
| F13 | P2 | `src/modules/build/core/projects-search.service.ts:46` (+40 sites) | 41 tenant↔tenant joins state no `org_id`; correctness rests on FKs two tables away. |
| F14 | P2 | `src/modules/build/core/projects-search.service.ts:17-31` | Unbounded read of every project the caller belongs to, fed whole into `inArray`. |
| F15 | P2 | `hooks/api/access.ts:66`, `lib/query-keys/*` | Query keys carry no org dimension; isolation depends on `queryClient.clear()` in one hook. |
| F16 | P2 | `src/modules/workflows/engine/workflow-schedule-tick.service.ts:87-99` | 4 round-trips per due schedule, sequentially, inside one tenant transaction. |
| F17 | P2 | `hooks/api/build/milestones.ts:86`, `types/projects/planning.ts:14-22` | Budget wire types disagree with the backend in two places. |
| F18 | P2 | `src/db/schema/build/members.ts:35` | `project_members.rate_currency` has zero readers and zero writers. |

---

### F01 — P0 — the project budget always says you have spent nothing
**`src/modules/build/core/projects-budget.service.ts:87, 109, 156, 161-174`**

`getBudget` computes spend as `costMinor = Math.round(hours × rateMinor)` where `rateMinor` comes from
`projectMembers.hourlyRateMinor` (`:87` projection, `:109` map build).

**`hourly_rate_minor` is never written by any code path in the repository.** Verified three ways:
1. Repo-wide grep for `hourlyRateMinor` / `hourly_rate_minor` in `src/` returns **three** hits — the schema
   declaration (`src/db/schema/build/members.ts:34`) and the two reads above. **No `.values(`, no `.set(`.**
2. All **6** `insert(projectMembers)` / `update(projectMembers)` sites
   (`projects-templates.service.ts:175`, `projects-write.service.ts:164`, `projects-members.service.ts:281`
   and `:365`, `projects-provision.service.ts:92` and `:186`) set only `orgId`, `projectId`,
   `membershipId`, `role`. None sets a rate. There is no DTO field for one —
   `dto/projects.schemas.ts` has no `rate` at all.
3. The sibling column `hourly_rate` (numeric, the pre-minor original) likewise has **no writer**; the only
   `src/` references are reads in `timesheets/core/rate-resolver.service.ts:109, 123-124, 202, 214-216`.
   Migration `0370_build_project_members_org_id.sql:179` backfills `hourly_rate_minor = round(hourly_rate * 100)`
   — but from a column that is itself always its `DEFAULT 0`.

Live catalog confirms both columns are `NOT NULL DEFAULT 0`:
```
hourly_rate       | NO  | '0'::numeric
hourly_rate_minor | NO  | 0
rate_currency     | YES | (null)
```

**Failure scenario.** An org logs 340 billable hours against project 7 through the timesheet module. A user
with `build:manage` opens `/build/7/budget`. The response is:
`{ plannedBudget: 250000, actualCost: 0, remaining: 250000, utilizationPct: 0, totalHours: 340,
memberBreakdown: [{ userId: "u1", hours: 340, cost: 0 }, …] }`. The screen shows real hours next to zero
cost and a full remaining budget. A project manager reads it as "under budget" and approves more work.
This is not intermittent — it is the only value the endpoint can produce.

Second half of the same defect, latent until rates are wired: `project_members.rate_currency` exists in the
declaration and the catalog and is **read nowhere**. `getBudget` sums every member's `costMinor` into one
total and labels it `project.budgetCurrency` (`:173`) with no comparison or conversion. Once rates are
populated, a member on a USD rate contributes USD minor units to an INR total.

**Proposed fix.** Two parts, in order. (a) Add the write path: a `rate` + `rateCurrency` field on the
project-member create/update DTO, written to `hourly_rate_minor` + `rate_currency` (never to the legacy
`hourly_rate`; `migrations/pending/0373_build_money_contract.sql` already documents dropping it and guards
the drop on a completed backfill). (b) In `getBudget`, reject or convert: refuse to sum a member whose
`rate_currency` differs from `projects.budget_currency` — return that member with an explicit
`currencyMismatch` marker rather than folding a wrong number into the total. Until (a) ships, the honest
response is to omit `actualCost`/`remaining`/`utilizationPct` rather than return `0`. Add a spec that seeds
a member rate and asserts a non-zero `actualCost` — no spec exercises this service today.

---

### F02 — P1 — the outbox retention sweep has never deleted a row, and says it succeeded
**`src/modules/cron/cron-outbox-retention.service.ts:57-63` and `:73-79`**

```sql
SELECT outbox_event_id FROM outbox_events
WHERE org_id = ${orgId} AND delivery_state IN (...) AND occurred_at < ${cutoff} LIMIT ${limit}
```
The column on both `outbox_events` and `inbox_records` is **`organization_id`**, not `org_id`. Proven
against `scratch_head_1010` at journal head:
```
=> SELECT outbox_event_id FROM outbox_events WHERE org_id = 'x' LIMIT 1;
ERROR:  column "org_id" does not exist
=> SELECT inbox_record_id FROM inbox_records WHERE org_id = 'x' LIMIT 1;
ERROR:  column "org_id" does not exist
```
`information_schema` confirms: both tables have `organization_id` and no `org_id`.

**Failure scenario.** The nightly `outbox-events-retention-sweep` cron fires. `forEachOrg` catches the throw
per organisation, logs it, and continues (`for-each-org.ts:184-200`). `sweep()` returns
`{ outboxEventsDeleted: 0, inboxRecordsDeleted: 0, truncated: false }`. The controller
(`cron-outbox.controller.ts:75-80`) answers **200** with
`"Outbox retention: 0 outbox events and 0 inbox records deleted"` — indistinguishable from a night with
nothing to delete. `OUTBOX_RETENTION_DAYS = 30` is declared and never applied: `outbox_events` and
`inbox_records` grow forever, carrying every event payload (which include PII) past the stated retention
window. There is **no spec for this service** — `src/modules/cron/` has no `cron-outbox-retention.spec.ts`.

Why no gate caught it: the SQL is a raw `sql` template literal, invisible to `check:declaration-column-drift`
(which compares Drizzle declarations to the catalog, not string SQL). `check:retention-coverage` exits 0 but
only enumerates tables above a **1 MB** threshold *in the connected database* — it reported
`highGrowthTables: 14, uncovered: 0` and `outbox_events` was not among the 14, because it holds 0 rows
locally. A gate measuring an empty table cannot see this.

**Proposed fix.** `org_id` → `organization_id` in both raw statements. Add a spec that runs the sweep
against a seeded outbox and asserts a non-zero delete count (an anti-vacuity floor — asserting "no throw"
would still pass today). Consider making `forEachOrg`'s partial-failure count fail the cron route rather
than only logging: `failed == organizations` should not answer 200.

---

### F03 — P1 — a 500 on the board or backlog renders a hard 404
**`features/build/project-detail/project-board-page.tsx:127`**, **`features/build/backlog/project-backlog-page.tsx:248`**

Both pages are exactly:
```tsx
const { data, isLoading: projectLoading } = useProject(projectId);   // no isError
...
if (isLoading) return <Skeleton/>;
if (!data) return notFound();
```
`useProject` (`hooks/api/build/projects.ts:186-193`) has no `isError` consumer. When
`GET /build/{id}` returns 500 or the network fails, TanStack exhausts its retries, `isLoading` goes false
and `data` stays `undefined` → `notFound()`.

**Failure scenario A.** A transient backend fault on `GET /build/7` — say the schema-drift 500 this repo has
shipped before. The user opens `/build/7` and Next renders the not-found boundary: *"This page could not be
found."* Their project appears deleted. There is no retry affordance and no error text; refreshing while the
fault persists reproduces the 404. Support receives "you deleted my project."

**Failure scenario B (backlog, quieter and worse).** `useProject` succeeds but
`GET /build/7/tickets` 500s. `useProjectBoardTickets` returns `data: []` from its `useMemo` over
`query.data?.pages` (`ticket-queries.ts:87-90`), `project-backlog-page.tsx:73` does `boardTickets ?? []`,
and the `DataTable` renders its `emptyState`: **"No tickets yet — Create a ticket to get started."** for a
project with 1,850 tickets. The user creates duplicates.

For contrast, `cycle-detail-page.tsx`, `project-sprints-page.tsx`, `my-tickets-page.tsx`, `epics-page.tsx`,
`meetings-list-page.tsx` and `timeline/page.tsx` all carry an `isError` → `<ErrorState>` branch. The two
pages that do not are the two most-visited.

I also checked the first-paint variant of this and it is **not** a defect: `useProject` is gated on
`useCan("build:view")`, which is `false` while `useAccess()` is loading — but
`app/(authenticated)/layout.tsx` prefetches access and hydrates it through a `HydrationBoundary`, so
`data` is defined on the first client render.

**Proposed fix.** In both files, destructure `isError`/`error` from both queries and render `<ErrorState>`
with a `refetch` before the `!data → notFound()` line; keep `notFound()` only for a resolved 404
(`isApiError(error) && status === 404`), which is the pattern `ticket-detail-page.tsx:202-204` already uses.

---

### F04 — P1 — board paging costs O(project size), measured
**`src/modules/build/core/projects-tickets-read.service.ts:341`**

```ts
const sortExpr = orderBy === "rank" ? [asc(tickets.rank), asc(tickets.id)] : …
```
`rank` is the board's default and the only order `useProjectBoardTickets` ever sends
(`ticket-queries.ts:66-67`). The covering index is
`idx_tickets_org_project_rank_sort (org_id, project_id, rank, created_at DESC, id) WHERE deleted_at IS NULL`
— `created_at DESC` sits between `rank` and `id`, so `ORDER BY rank, id` cannot be served from it directly.
`build.tickets.rank` is `numeric NOT NULL DEFAULT 1000` and only `rankTicket` ever changes it, so in a real
project the overwhelming majority of rows share one rank value and the incremental sort's presorted group is
the whole project.

**Measured** — `scratch_perf_seed`, project 21 (1,850 live tickets), as `streamline_app` with the tenant GUC
set, `LIMIT 101`:

| ORDER BY | rows from the scan | buffers | exec time | plan |
|---|---|---|---|---|
| `rank, id` — **shipped** | **1,850** | 15 hit + 33 read | 4.839 ms | Incremental Sort, `Presorted Key: rank`, `Full-sort Groups: 1` |
| `rank, created_at DESC, id` | **101** | **19 hit, 0 read** | 1.904 ms | Index Only Scan, `Heap Fetches: 0`, **no sort node** |

**18.3× fewer rows for the same page.** Page N is worse still — with a cursor at id 19000 the keyset lands
as a **Filter, not an Index Cond**:
```
Index Cond: ((org_id = '…0003') AND (project_id = 21))
Filter: ((rank > '1000') OR ((rank = '1000') AND (id > 19000)))
Rows Removed by Filter: 500        rows=1350   for a 101-row page
```
The cursor does not skip. Every page re-reads the project from the start of the rank group.

**Failure scenario.** A 20,000-ticket project. `useProjectBoardTickets` auto-loads 5 pages of 100 on open
(`ticket-queries.ts:90-99`, `BOARD_AUTOLOAD_LIMIT = 500`). Each of those 5 requests scans and sorts all
20,000 live rows: ~100,000 index rows read to render 500 cards, five times over, on every board open, per
user. `check:unbounded-reads` cannot see it — the query has a `LIMIT`.

Note the same file already knows the right order: `projects-tickets-rank-utils.ts:51` sorts
`asc(rank), desc(createdAt), asc(id)` — index-aligned. Only the read path diverges.

**Proposed fix.** Make the board sort and its cursor three-key `(rank, created_at DESC, id)`, matching the
index and matching `rank-utils`. The cursor payload must then carry `createdAt` as well (the `orderBy !== "rank"`
branch at `:344-345` already does exactly this via `TicketCursorSort`), and `keysetAfterValue` becomes the
three-column form. Alternative if the cursor format must not change: add
`(org_id, project_id, rank, id) WHERE deleted_at IS NULL`. Guard with a spec that renders the SQL and
asserts the ORDER BY has three keys — the current `board-server-filter.test.ts` does not.

---

### F05 — P1 — the automation webhook fetches inside the request transaction and loses its own log
**`src/modules/automation/automation-webhook.service.ts:21-36`, `:67-94`**

Three defects in one method, all on the path `POST /settings/automations/:ruleId/test` →
`AutomationService.executeRule` (`automation.service.ts:171`) → `dispatchWebhook`.

1. **Unbounded read + unbounded fanout.** `:21-23` reads every active `webhookEndpoint` for the org with
   **no `LIMIT`**; `:31-32` fires `Promise.allSettled(active.map(deliverWebhook))` — one outbound POST per
   endpoint, all in parallel, no concurrency cap, each up to `WEBHOOK_TIMEOUT_MS = 10_000`.
2. **Provider call inside a database transaction.** `TenantContextInterceptor` (`app.module.ts:216`) wraps
   every request in a tenant transaction, and `@NoTenantTransaction()` — used 70 times elsewhere in
   `src/modules` — appears **zero times** in `automation/`, `workflows/` or `build/`. So the `fetch` at
   `:67` runs with a pooled Postgres connection pinned for up to 10 s.
3. **The delivery log is rolled back.** `webhookLogs` rows are inserted on `this.db` (`:47`, `:84`), which
   the tenant-aware proxy resolves to that same request transaction. `deliverWebhook` throws at `:94` when
   a delivery fails; `dispatchWebhook` re-throws at `:36` if *any* endpoint failed; the throw propagates out
   of the controller and the transaction rolls back — **erasing the log rows for the deliveries that
   succeeded.**

**Failure scenario.** A tenant has 3 active endpoints. An operator clicks "Test" on an automation rule.
Endpoints A and B receive the POST and act on it (create a ticket in their system); endpoint C is down and
times out after 10 s. `dispatchWebhook` throws, the request transaction rolls back, and the
`webhook_logs` rows for A and B disappear. The UI shows the delivery failed and no log for A or B. The
operator clicks Test again. A and B are POSTed a second time. Meanwhile a database connection was held for
10 s per attempt.

The correct pattern already exists one module over:
`src/modules/build/core/projects-webhooks-dispatch.service.ts:137-198` writes a `webhookDeliveries` row and
an outbox event inside the caller's transaction and delivers from an outbox consumer.

**Proposed fix.** Route automation webhooks through the same outbox path build uses. Failing that, three
smaller changes: put `@NoTenantTransaction()` on the automation controller and open a short
`runInTenantTransaction` around each log write; write each `webhookLogs` row in its own committed
transaction so a later failure cannot erase it; bound `active` with a `LIMIT` and the fanout with a
concurrency cap.

---

### F06 / F07 / F09 — P2 — the outbox→workflow relay is unreachable, and would livelock if it were reached

Taken together these three describe one mechanism, so they are written once.

**F09 — unreachable.** `WorkflowRegistry.triggeredBy` (`workflow-registry.ts:29-33`) matches on
`definition.triggers`. Grep for `triggers` across non-spec `src/` returns two hits: the optional field on
`WorkflowDefinition` (`workflow.types.ts:56`) and the filter itself. All six `registry.register(...)` call
sites (`workflow.module.ts:40`, `inbound-ingress.workflow.ts:70`, `crm-import.workflow.ts:58` and `:65`,
`crm-connector.workflow.ts:54`, `autonomy-hold.workflow.ts:34`, `workflow-ai-node.handler.ts:24`) pass
`{ name, maxAttempts, handler }` and nothing else. `triggeredBy` therefore returns `[]` for every event
type, and `relay()` starts zero runs on every invocation. The prior audit's P0 fix was still necessary —
before it, the relay's *read* threw and took down `CronWorkflowService.tick()` before `drain()` ran, and
`drain()` **is** wired — but the relay's own product function does not exist.

**F06 — the cursor cannot advance.** `outbox_events.lifecycle_state` is written as `'ACTIVE'` on insert
(`outbox-envelope.ts:33`) and by the column default, and **nothing in `src/` ever changes it** (grep:
36 hits, 35 of them spec fixtures, one the relay's own filter). Combined with F02 (retention never
deletes), the set the relay reads is monotonically growing and never pruned. The cursor advances to
`highestSeenThisPass − CURSOR_LAG` where `CURSOR_LAG = 1000` (`:70`, `:202-209`), and a pass reads at most
`RELAY_BATCH_SIZE = 50` rows. So the cursor moves only when the 50th active event after it has an id more
than 1,000 higher — i.e. only when that org has **fewer than 50 active events per 1,000 global sequence
ids**. For the 90 %-share tenant in the documented skew that is roughly 900 per 1,000. The cursor pins at
its initial value and the same 50 oldest events are re-read on every tick, forever.

**F07 — and they starve everyone else.** `relay()` computes `remaining = limit − events.length` and returns
early once it is zero (`:121-122`), inside a `forEachOrg` that enumerates
`ORDER BY organizations.id ASC` (`for-each-org.ts:161`) — a fixed order on every call. The lowest-id org
that is holding the cursor consumes the whole 50-event budget every pass; every subsequent org reads
nothing, permanently. This is the same shape as the shared-cursor bug the prior audit fixed, reintroduced
through the budget.

**Failure scenario (the day someone wires a trigger).** A developer adds
`triggers: ["build.ticket.status_changed"]` to a workflow. Org `aaaa…0001` has 60,000 outbox events;
its cursor never advances past 0; every tick re-reads its 50 oldest events, all already started, and
`started` counts 50 because `startRun` returns the existing id. The log says
`Relay started 50 workflow run(s)` every minute. Orgs 0002, 0003 and 0004 never have a single event read,
so their workflows never start — and the log gives no hint, because it is reporting 50 successes a minute.

**Proposed fix.** Give the relay a persisted delivery state of its own, as `outbox-publisher` already has
(`outbox-publisher.service.ts:137` — claim with a lease and `FOR UPDATE SKIP LOCKED`). The relay's own
comment at `:63-68` names this as the complete fix and explains why the two consumers cannot share a
column. Until then: rotate the starting org across ticks (round-robin on the enumeration) so a busy tenant
cannot hold the budget, and make `RelayResult` distinguish `started` from `deduped` so the metric stops
reading green. And either give the six registered workflows their `triggers`, or delete the relay — a
half-wired mechanism that reports success is worse than either.

---

### F08 — P2 — no index supports the per-workflow execution keyset
**`src/modules/workflows/workflows-execution.service.ts:99-146`**

The query is `WHERE workflow_id = ? AND org_id = ? [AND status = ?] ORDER BY created_at, id LIMIT n+1`.
`workflow_executions` has: `(id)`, `(org_id, status)`, `(workflow_id)`, `(org_id, created_at)`,
`(org_id, id)`. None leads with `(org_id, workflow_id)` and carries `created_at, id`.

**Failure scenario.** A workflow that has run 200,000 times. `GET /workflows/{id}/executions?cursor=…`
either scans `(workflow_id)` and sorts all 200,000 rows for a 20-row page, or scans `(org_id, created_at)`
and filters. Same shape as F04, with no measurement to bound it.

**NOT MEASURED.** `workflow_executions` holds 0 rows in `scratch_head_1010`, `scratch_cold_1010` and
`scratch_perf_seed`. What would measure it: seed ~200k executions across ≥2 orgs and ≥2 workflows into
`scratch_perf_seed`, then `EXPLAIN (ANALYZE, BUFFERS)` the first and a deep page as `streamline_app` with
the GUC set. **Proposed fix:** `CREATE INDEX … ON workflow_executions (org_id, workflow_id, created_at, id)`,
and a partial `(org_id, workflow_id, status, created_at, id)` if the status filter is common.

---

### F10 — P2 — `POST /workflows/:id/trigger` is not idempotent
**`src/modules/workflows/workflows.controller.ts:232-241` → `workflows-execution.service.ts:58-78`**

The insert carries no dedupe key and there is no `@Idempotent`. A double click or a client retry after a
network timeout inserts a second `workflow_executions` row and the workflow runs twice. The two inserts
(`workflowExecutions` then `workflowAuditLogs`) are also issued separately on `this.db` with no explicit
`db.transaction` — they land in the request transaction, so they do commit together, but that is inherited
rather than stated.

The prior audit declined to fix this because adding `@Idempotent` makes the route 400 without an
`Idempotency-Key`, a breaking wire change. **That reasoning still holds** and I am not overriding it. The
non-breaking alternative worth putting to the product owner: give `workflow_executions` a nullable
`causation_key` with a partial unique on `(org_id, workflow_id, causation_key) WHERE causation_key IS NOT NULL`
and `onConflictDoNothing` — the exact shape `workflow_runs` already uses
(`uniq_workflow_runs_causation`), which dedupes when a key is supplied and stays permissive when it is not.

---

### F12 — P2 — three workflow lists stop at page 1
**`hooks/api/workflows-schedules.ts:19-27`, `workflows-secrets.ts:23`, `workflows-variables.ts:17`**

`useAllSchedules` calls `apiClient.get<WorkflowCursorPage<WorkflowSchedule>>("/workflows/schedules", undefined, …)`
— it declares a cursor page and sends no cursor, and there is no second-page fetch anywhere. The backend
defaults to `pageSizeField(50)` (`dto/workflow.schemas.ts:72`). Same for secrets (`:77`). Variables is worse
on the server side: `workflows-variables.service.ts:31` is a bare `.limit(200)` with no cursor and no
`hasMore` at all.

**Failure scenario.** A tenant with 60 schedules opens `/workflows/scheduler`. Ten are invisible with no
indication. An operator disables what looks like the last schedule and the missing ten keep firing.

**Proposed fix.** Make the three hooks `useInfiniteQuery` with `getNextPageParam` off `pagination.nextCursor`
(the schedules and secrets routes already return one), and give the variables route a real keyset.

---

### F13 / F14 / F15 / F16 / F17 / F18 — P2, stated briefly

- **F13** — 41 tenant↔tenant joins in the territory state no `org_id` (e.g.
  `projects-search.service.ts:46`, `projects-analytics.service.ts:74`, `:86`, `:175`, `:276`,
  `workflows-approval.service.ts:39`, `:43`, `:47`). Every one is protected by a composite FK — I verified
  19 child tables against `pg_constraint`, and RLS is a second layer. **Not a leak.** The risk is that
  correctness lives two tables away: a future refactor that drops a composite FK for a simple one turns
  all of them into leaks at once, silently. Fix: add the org equality to the ON clause; it costs nothing
  and keeps the scan on the org-leading index.
- **F14** — `projects-search.service.ts:17-31` reads every `project_members` row for the caller in the org
  with no `LIMIT`, then passes the whole id array to `inArray` at `:50`. Grows with the caller's project
  count. Fix: `EXISTS` correlated subquery instead of materialising ids, or cap and paginate.
- **F15** — no query key in the app carries the org. `queryKeys.access.me()` (`hooks/api/access.ts:66`) is
  literally constant. Isolation rests entirely on `queryClient.clear()` in `useSwitchOrg`
  (`auth-hooks.ts:171`). It works today; delete that one line and every tenant's cache bleeds into the
  next. Fix: seed the org id into the key factory root.
- **F16** — `workflow-schedule-tick.service.ts:87-99` loops over due schedules issuing 4 statements each
  (claim update, workflow select, version select, execution insert), sequentially, inside one tenant
  transaction, with the `dueSchedules` read at `:67-82` carrying no `LIMIT`. `check:n1-growing-loops:list`
  names this exact site — it is inside the ratchet (97 remaining against a ratchet of 102), so the gate's
  exit 0 is *not* a clean bill. Fix: cap the batch and batch the version lookup.
- **F17** — `hooks/api/build/milestones.ts:86` declares `apiClient.patch<{ id: number; budget: string }>`;
  the backend returns `{ id: number; budget: number; currency: string | null }`
  (`projects-budget.service.ts:196-200`) — `budget` is a number, not a string, and `currency` is undeclared.
  `types/projects/planning.ts:14-22` (`ProjectBudget`) also omits `currency`, which the GET does return
  (`:173`), so the UI renders money with no unit. Both are `apiClient.get<T>()` casts;
  `check:response-contracts` exits 0 and prints its own limit: **84 of 2,665 fetch seams carry a runtime
  contract (3.2 %) — 97.8 % is an unchecked cast.**
- **F18** — `src/db/schema/build/members.ts:35` declares `rateCurrency`; the live column exists and is
  nullable; **zero readers and zero writers in `src/`**. REMOVE-or-WIRE candidate; the intended wiring is
  described in `migrations/pending/0373_build_money_contract.sql` (authored, deliberately not journalled —
  the only `0373` in `_journal.json` is the unrelated `0373_resource_grants`).

---

## 5. What "representative E2E" actually is here — NOT MET for both criteria

This is a shared finding for PRD-C123 and PRD-C124 and is the reason the prior audit's P0 survived to head.

**There is no seeded (real-database) E2E for Build/PM or Workflows.** The whole repository has **11**
`*.seeded-e2e-spec.ts` files (billing, CRM ×3, db, kb, perf, security ×3, support). None covers build,
workflows, automation, tasks, issues or goals.

**The 24 `*.e2e-spec.ts` in this territory run against the shared remote Neon branch, as the database
owner.** `jest-e2e.json` sets `setupFiles: ["dotenv/config"]`, which loads `.env`; `.env` sets
`DATABASE_URL` to `postgresql://neondb_owner:…@ep-orange-mode-…neon.tech/neondb`; and
`test/helpers/e2e-app.ts:230` only defaults it with `??=`. `neondb_owner` has BYPASSRLS, so **every tenant
policy is inert for the entire e2e suite.** The "404 not 403 for a workflow in another org" tests therefore
prove the application-level `eq(orgId)` predicate — real and worth having — and prove **nothing** about the
policies. That is exactly the blind spot the prior audit's P0 lived in.

**And the coverage is authorization-shaped only.** `workflows.controller.e2e-spec.ts` (250 lines, 20 tests)
is: 3 × 401, 3 × module entitlement, 8 × 403, 2 × cross-tenant 404, 2 × secret redaction, 1 × owner bypass.
**No happy path.** Nothing creates a workflow, publishes it, triggers it, advances an execution and reads
the execution list. Nothing calls `POST /cron/workflow-tick`.

I ran it: `AUTH_SIGNING_KEYS` is required and is not in `.env`, so the suite throws
`AUTH_SIGNING_KEYS must be set for e2e tests` out of the box (17 failed / 3 passed). With a locally
generated Ed25519 placeholder keyring it is **20/20 pass in 21.5 s**.

**What would close this.** A `test/build/build-board.seeded-e2e-spec.ts` and a
`test/workflows/workflow-lifecycle.seeded-e2e-spec.ts` under `jest-e2e-seeded.json`, run with
`APP_DATABASE_URL` on `streamline_app` (`rolbypassrls = f`) against a local seeded Postgres. The workflow
one must drive `POST /cron/workflow-tick` end to end — that is the single test that would have caught the
prior P0 and would catch F06/F07 the day a `triggers` field appears. The prior audit named this same gap
and it is still open.

---

## 6. Folder classification

| folder | verdict | reason |
|---|---|---|
| `src/modules/build/**` | **KEEP** | 324 files, 16 cohesive sub-modules, 299 routes, 83 tables all tenant-scoped and RLS-covered, registered in `app.module.ts`. Real defects (F01, F04, F14) are localised to three services. |
| `src/modules/workflows/**` | **KEEP** | Clean definition/version/execution split, full permission rung on 33 routes, keyset history, TOCTOU-safe terminal writes. |
| `src/modules/automation/**` | **REFACTOR** | 20 files. SSRF is guarded with a bite proof, but the delivery path is inline-in-transaction with a rollback-losable log and an uncapped fanout (F05). The correct pattern is `build/core/projects-webhooks-dispatch.service.ts`. |
| `src/modules/tasks/**`, `issues/**`, `goals/**` | **KEEP** | 42 files total, each with tenant-isolation and e2e specs; nothing found. |
| `src/common/workflow/**` | **REFACTOR** | The prior audit's RLS fix is correct and holds. The relay still cannot make forward progress (F06/F07) and has no product wiring (F09). Either give it a persisted delivery state and real triggers, or remove it. |
| `src/modules/cron/cron-outbox-retention.service.ts` | **REFACTOR** | Two-word fix (F02) plus a spec; currently 100 % broken and reporting success. |
| `src/modules/build/core/projects-budget.service.ts` | **REFACTOR** | F01 — the P0. Needs a write path before the read is meaningful. |
| `features/build/project-detail/`, `features/build/backlog/` | **REFACTOR** | F03 — add the error branch both pages' siblings already have. |
| `src/db/schema/build/members.ts` `rateCurrency` | **REMOVE-or-WIRE** | Zero readers, zero writers (F18). Wiring it is part of F01's fix; if F01 is deferred, the column is dead. |
| anything else | **no REMOVE claimed** | A removal claim needs `knip` plus a real build. I ran neither. |

---

## 7. Gate results — and what each one does not cover

**Backend, 26 run.** `tenant-isolation`, `record-access`, `scope-application`, `module-entitlement`,
`cache-invalidation`, `namespace-coverage`, `idempotent-commands`, `outbox-consumers`, `n1-growing-loops`,
`query-projections`, `unbounded-reads`, `bulk-id-limits`, `transaction-callbacks`, `fire-and-forget`,
`authz-deny`, `retention-coverage`, `conflict-targets`, `unjoined-table-refs`, `cache-key-shapes`,
`relation-hydration`, `lifecycle-predicates`, `tenant-indexes`, `cycles`, `import-direction`, `module-di`,
`over-300` — **all exit 0.** `file-sizes` **exit 1** — stale registry row on
`src/scripts/check-referential-action-drift.ts` (596 registered / 606 actual), **not this territory**.

**Frontend, 7 run from `frontend/`.** `query-scope` (5,360 files), `gated-reads`, `response-contracts`,
`empty-states` (3,854 files), `named-handlers`, `route-access-contract`, `permission-binding` (2,384
bindings) — **all exit 0.**

Four of these greens are narrower than they read, and three of my findings sit in the gaps:

| gate | what it actually covered | finding it cannot see |
|---|---|---|
| `check:idempotent-commands` | **11 handlers in scope**, 546 controllers scanned | F10 |
| `check:retention-coverage` | 14 tables above 1 MB **in the connected DB**; `outbox_events` has 0 rows there | F02 |
| `check:unbounded-reads` | 750 raw hits, 581 pre-classified in a bare verdict file with **no recorded reason**; 58 in this territory (40 FALSE-POSITIVE / 15 BOUNDED / 2 EXCLUDED / 1 STREAM). `projects-search.service.ts` is marked FALSE-POSITIVE and is not one | F14; and F04 is invisible to it because the query does have a `LIMIT` |
| `check:n1-growing-loops` | exit 0 against a **ratchet of 102 with 97 still open**; its own `:list` names `workflow-schedule-tick.service.ts:87` | F16 |
| `check:gated-reads` | prints its own warning: *"measured 2026-09-03 it reported 0 while 48 existed"* | — |
| `check:response-contracts` | **84/2,665 seams parsed (3.2 %)**; freezes the debt, does not retire it | F17 |
| `check:empty-states` | hand-rolled empty states outside `EmptyState` — not error-vs-empty | F03 |

**No `check:provider-in-transaction` gate exists** (189 `check:*` scripts, none). The two head commits
`ccd31ad23` and `41dfe5b5d` fix that class by hand in `kb/` and `ai/`; nothing prevents regression, and
F05 is an instance of the same class in `automation/`.

---

## 8. What head already gets right

Recorded because the reflex on several of these is to "fix" them and make things worse.

1. **83/83 build tables and 14/14 workflow tables carry `org_id`, RLS and a policy.** Declared and live
   catalogs agree exactly (83 vs 83).
2. **Every org-less join is backed by a composite FK.** 64 flagged, 23 onto a global `users` table, 41
   verified against `pg_constraint`. Zero cross-tenant reads found.
3. **Build's project webhooks are transactionally durable** — outbox write in the caller's transaction,
   delivery from a consumer. This is the pattern F05 should adopt.
4. **The `DRIZZLE` provider is tenant-aware.** `createTenantAwareDb` + a global `TenantContextInterceptor`
   means the 557-of-767 services that never open a transaction still get a GUC-scoped connection. Correcting
   the prior audit here matters: believing otherwise would trigger a large unnecessary rewrite.
5. **The two-envelope frontend split is correct.** Nested `pagination` for `/build/{id}/tickets` and
   `/workflows/*`; flat `nextCursor` for `/build/all-work` and `/build`. Unifying them would break two reads.
6. **`queryClient.clear()` on org switch** closes the cross-tenant cache leak that the missing org key
   would otherwise open.
7. **Retry / DLQ / cancellation is real**, with compare-and-set terminal writes and four dedicated specs.
8. **Secret redaction is structural, not a filter** — `SECRET_COLUMNS` omits `encryptedValue` and is used on
   every read, write and `returning`; the e2e assertion passed in my run.
9. **`PAGE_SIZE_CAP` clamps rather than 400s**, and `maxSize` can only narrow — a good primitive, applied
   consistently across build and workflows.
10. **The prior audit's five RLS fixes and two bounded-read fixes are all present and correct at head.**
11. **`migrations/pending/` is used correctly** — `0373_build_money_contract` is authored, reversible and
    deliberately unjournalled, with the preconditions written down.
12. **`forEachOrg` isolates a failing tenant and emits a partial-failure event** rather than aborting the
    sweep — the right design. (F02 is what happens when the sink is not wired to a gate: the isolation
    turned a 100 % failure into a green 200.)

---

## 9. Blocked on infrastructure — stated, not papered over

| what | why | what would unblock it |
|---|---|---|
| F08 plan evidence | `workflow_executions` holds **0 rows** in all three local databases | seed ~200k executions across ≥2 orgs / ≥2 workflows, then `EXPLAIN (ANALYZE, BUFFERS)` first and deep pages as `streamline_app` |
| F06/F07 execution proof | `outbox_events` and `workflow_runs` hold **0 rows** everywhere; and F09 means nothing would trigger anyway | seed ≥2,000 outbox events skewed across 4 orgs, register a workflow with a `triggers` field, run `relay()` twice and compare `positionFor(orgId)` |
| live `POST /cron/workflow-tick` | needs a booted app on `APP_DATABASE_URL = streamline_app` and 12 GB — this is the one proof the prior audit also could not produce, and it is still missing | `test:e2e:seeded` against a local seeded Postgres with a non-owner role |
| whole-suite pass/fail | `next build`, `typecheck`, backend lint, full jest, `knip` are all off-budget with 26 agents on one laptop | the orchestrator's central run |
| F02 production impact | `outbox_events` row count and disk on the real deployment | a read-only `count(*)` / `pg_total_relation_size` on production |

**Not claimed anywhere in this report:** any test I did not run, any plan I did not take, any row count I
did not read. The one jest suite I ran is named with its exact result. The three `EXPLAIN` plans are quoted
with their real row counts and buffer numbers. Everything else is source and catalog reading, with
file:line.
