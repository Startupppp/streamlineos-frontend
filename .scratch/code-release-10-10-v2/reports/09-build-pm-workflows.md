# 09 — Build, PM and Workflows (audit and fix)

**Ticket:** `.scratch/code-release-10-10-v2/issues/09-build-pm-workflows.md`
**Criteria:** PRD-C123 (Build/PM), PRD-C124 (Workflows)
**Status:** audit complete; one P0 found and fixed; three defects remain open (all outside this territory).

**Checkboxes on the ticket were NOT ticked** — per instruction, the orchestrator closes them after
an independent re-verification sweep.

---

## 0. What was measured, and where

| | |
|---|---|
| Backend repo | `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend` |
| Backend SHA at start of run | `8f37e580e4038459227ecbd21e92e40e33fa4531` (branch `release/code-10-10-v2`) |
| Backend SHA at end of run | `93fe5f46149405c2c53b81360b276acd19295b19` |
| Frontend repo | `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend` |
| Frontend SHA at start | `fa562ef6672b125959d648a5dda3808f43a26486` |
| Frontend SHA at end | `778f7d467f7fce5f890f06d006bd745bf3157748` |

The tree moved under this run — roughly sixteen agents share it and several committed while this
work was in progress. **My changes are uncommitted working-tree edits**; the orchestrator commits.
Every gate and test result below was produced against the working tree as it stood at the end SHAs.

**Database.** `scratch_perf_seed`, local PostgreSQL. **It is at journal 665/665, and the repository's
journal now carries 672 entries — so the seed is seven migrations behind repo head.** None of the
seven touch `workflow_runs`, `workflow_steps` or `outbox_events`, so the RLS evidence below stands,
but the gap is stated rather than glossed.

**Role.** Every database probe ran as `streamline_app`, verified `rolbypassrls = f`, `rolsuper = f`.
Nothing was measured as the owner. Nothing was written: the write probes ran inside transactions that
were `ROLLBACK`ed, and `workflow_runs` was confirmed back at 0 rows afterwards.

**Tenants.** All four application tenants in the documented skew, by `build.tickets` row count:

| org | tickets | share |
|---|---|---|
| `aaaaaaaa-…-0001` | 18,500 | 89.93 % |
| `aaaaaaaa-…-0003` | 1,850 | 9.00 % |
| `aaaaaaaa-…-0002` | 185 | 0.90 % |
| `aaaaaaaa-…-0004` | 37 | 0.18 % |

---

## 1. Commands run, with real exit codes

Exit codes were captured directly (`cmd > log 2>&1; RC=$?`), never through `${PIPESTATUS[0]}`.

### Backend gates — 16/16 exit 0

`check:tenant-isolation`, `check:record-access`, `check:scope-application`,
`check:module-entitlement`, `check:cache-invalidation`, `check:namespace-coverage`,
`check:idempotent-commands`, `check:outbox-consumers`, `check:n1-growing-loops`,
`check:query-projections`, `check:unbounded-reads`, `check:bulk-id-limits`,
`check:transaction-callbacks`, `check:fire-and-forget`, `check:log-secrets`, `check:authz-deny`
— **all EXIT=0.**

On the *first* sweep `check:cache-invalidation` exited 1 on a single MEDIUM finding
(`F03-module-enable-partial-session-bust`, `src/modules/access/entitlements.service.ts:setModuleEnabled`)
— **another agent's territory**. It exits 0 on the second sweep; that agent fixed it meanwhile.

### Backend structural / spec-quality gates

| gate | exit |
|---|---|
| `check:cycles` | 0 |
| `check:vacuous-assertions` | 0 |
| `check:mock-surface` | 0 |
| `check:over-300` | 0 |
| `check:file-sizes` | 0 |
| `check:import-direction` | 0 |
| `check:module-di` | 0 |
| `check:bare-throw` | 0 |
| `check:spec-typecheck` | **2 — NOT MINE, see §5** |

### Frontend gates — 7/7 exit 0

`check:query-scope`, `check:gated-reads`, `check:response-contracts`, `check:empty-states`,
`check:named-handlers`, `check:route-access-contract`, `check:permission-binding` — **all EXIT=0.**

### Typecheck and tests

| command | exit | number produced |
|---|---|---|
| `pnpm -C streamlineos-backend typecheck` (via `heavy.sh 2`) | **0** | `grep -c "error TS"` = **0** |
| `jest --maxWorkers=2 --testPathPattern="(modules/build\|modules/tasks\|modules/issues\|modules/goals\|modules/workflows\|modules/automation\|common/workflow)"` | **0** | **167 suites / 1176 tests passed** |
| `jest --runInBand --testPathPattern="common/workflow"` | **0** | 6 suites / 65 tests |
| `jest --runInBand --testPathPattern="workflow-runtime-rls"` | **0** | 9 tests (new) |
| `jest --runInBand --testPathPattern="build-cross-tenant-lookup"` | **0** | 5 tests (new) |

Every heavy command went through
`.scratch/code-release-10-10/heavy.sh 2 --`. No bare `pnpm test` was run.

---

## 2. PRD-C124 — the P0: the durable workflow runtime was dead under RLS

This was the defect the ticket told me to verify first. **It was still true at head, and it was
substantially larger than the memory recorded.**

### 2.1 What the memory said, and what was actually wrong

The recorded defect was one query: `WorkflowOutboxRelayService.relay()` reading `outbox_events`
cross-tenant with no ambient GUC. That is real. But the same fault ran through **the entire tick
path**, because the runtime was written against a contract that a later migration silently revoked.

`src/common/workflow/workflow-store.ts` said so in its own header:

> *"Deliberately outside row-level security … a worker claims across every organisation, so a
> tenant-scoped policy would make the claim query return nothing."*

That was true at `migrations/0208_workflow_runtime.sql` (journal line 1570).
It stopped being true at `migrations/0591_tenant_isolation_for_unprotected_tables.sql`
(journal line **2270**), which does:

```sql
ALTER TABLE "workflow_runs"  ENABLE ROW LEVEL SECURITY;   -- 0591:1041
CREATE POLICY "tenant_isolation" ON "workflow_runs"  …    -- 0591:1045
ALTER TABLE "workflow_steps" ENABLE ROW LEVEL SECURITY;   -- 0591:1054
```

Nothing in the runtime changed to match. And the consequence is worse than the header's guess:
`app.current_org_id()` **RAISEs** when the GUC is unset rather than returning NULL, so the statements
did not return nothing — they threw. Measured as `streamline_app` on `scratch_perf_seed`:

```
SET ROLE streamline_app;
BEGIN;
SELECT count(*) FROM outbox_events WHERE lifecycle_state = 'ACTIVE';
ERROR:  no tenant context: app.organization_id is not set for this transaction
CONTEXT:  PL/pgSQL function app.current_org_id() line 7 at RAISE
```

`CronWorkflowService.tick()` (`src/modules/cron/cron-workflow.service.ts:31-32`) calls `relay()`
before `drain()` and guards neither, so the throw took out the whole request: `POST
/cron/workflow-tick` answered 500 and **nothing durable advanced.**

**It survived CI because CI connects as the database owner, which has BYPASSRLS and makes every
policy inert.** That is the whole reason this lived to head.

### 2.2 The five denied statements

| # | site | statement | status |
|---|---|---|---|
| 1 | `workflow-outbox-relay.service.ts:72` | cross-tenant `SELECT` on `outbox_events` | **fixed** |
| 2 | `workflow-store.ts:233` `startRun` | `INSERT … workflow_runs` on the bare pool | **fixed** |
| 3 | `workflow-store.ts:163` `claimDueRuns` | cross-tenant `UPDATE … workflow_runs` | **fixed** |
| 4 | `workflow-store.ts:77` `createLifecycleStore` | `complete` / `suspend` / `retry` / `deadLetter` on `workflow_runs` | **fixed** |
| 5 | `workflow-store.ts:24` `createStepStore` | `loadSteps` / `recordStep` on `workflow_steps` | **fixed** |

(4) deserves a note: the lifecycle writes are called at `workflow-runner.ts:64, 91, 96, 112, 116`,
all **outside** `withinStep` — so even the `runInNewTenantTransaction` that wrapped each *step* did
not cover them. A run could execute its steps and then throw on the write recording that it
finished, which is precisely the shape that repeats work on the next tick.

The `DRIZZLE` provider is a plain pool handle, not a tenant-aware proxy
(`src/db/drizzle.module.ts:31`), so `this.db` never picks up an ambient GUC — which is why every one
of these needed an explicit tenant scope rather than an ambient one.

### 2.3 The fix

The pattern is the one the sibling consumer already uses and documents —
`OutboxPublisherService.claimBatch()` at `src/common/outbox/outbox-publisher.service.ts:137` — and
which `forEachOrg` (`src/common/tenant/for-each-org.ts:131-147`) exists for: `organizations` carries
no tenant column and therefore no policy, so enumerating tenants needs no bypass role; discovery then
moves inside the per-organisation loop.

- **`relay()`** now sweeps organisations and reads each one's outbox inside that organisation's
  transaction, collecting events under the sweep and starting runs after it — so no tenant
  transaction is held open across the work of starting runs.
- **`claimDueRuns`** and **`drainBacklog`** likewise sweep per organisation. The batch limit is spent
  as a budget **across** organisations, not granted to each, so one busy tenant cannot multiply the
  tick's work by the tenant count.
- **`startRun`**, **`createStepStore`** and **`createLifecycleStore`** take the run's organisation and
  route every statement through `runInTenantTransaction`, which *joins* an ambient transaction when
  there is one and opens a new one when there is not. Both halves matter: a step's writes must commit
  with the memo that the step ran (so `withinStep`'s transaction is joined, not nested beside it),
  while a lifecycle write happens after that transaction has closed and needs one of its own. It also
  refuses to open a transaction for one organisation inside another's, which turns a cross-tenant
  write into an error at the seam rather than a policy denial deep in a query.
- The false header comment was replaced with the actual history, so the next reader is not misled the
  same way.

**A second, independent bug was fixed in passing.** The relay kept **one in-memory cursor across all
tenants**. Even as the owner, with RLS inert, that was lossy: the ids come from one global sequence,
so a busy tenant's events dragged the cursor past a quiet tenant's lower-numbered ones, which were
then *never* read. A quiet tenant's workflows simply never started, in proportion to how noisy its
neighbours were. The cursor is now per organisation (`positionFor(orgId)`), each still trailing that
organisation's high-water mark by `CURSOR_LAG` so a late commit is not skipped.

### 2.4 Proof

**Unit** — `src/common/workflow/workflow-runtime-rls.spec.ts` (new, 9 tests, exit 0). It does not
assert on SQL text. It drives the runtime against a double that throws the *real* Postgres message
unless the statement is issued inside a tenant scope — the property that actually failed. It carries
**two bite proofs**: neutering the sweep so the read escapes its scope reproduces
`no tenant context: app.organization_id is not set…` for both the relay and the claim. Without those
the assertions would pass against a permissive double.

**Database, as the non-owner role, across all four tenants.** Old shape vs new shape:

```
-- OLD (what shipped), as streamline_app:
SELECT count(*) FROM outbox_events WHERE lifecycle_state='ACTIVE';
ERROR:  no tenant context: app.organization_id is not set for this transaction

-- NEW (per-org inside a tenant scope), as streamline_app, for each of the four tenants:
BEGIN;
SELECT set_config('app.organization_id','<org>', true);
SELECT count(*) FROM outbox_events WHERE organization_id='<org>' AND lifecycle_state='ACTIVE';
INSERT INTO workflow_runs (workflow_run_id, organization_id, workflow_name, input) VALUES (…);
UPDATE workflow_runs SET status='RUNNING', lease_expires_at=now()+interval '30 s'
  WHERE workflow_run_id IN (SELECT … WHERE organization_id='<org>' AND (<CLAIMABLE>)
                            ORDER BY run_after LIMIT 10 FOR UPDATE SKIP LOCKED);
UPDATE workflow_runs SET status='COMPLETED', completed_at=now() WHERE organization_id='<org>' …;
ROLLBACK;
```

Result: **read, insert (startRun), claim (claimDueRuns) and lifecycle-complete all succeed on all
four tenants** — `claimed_running = 1`, `completed = 1` each. All rolled back; `workflow_runs`
verified back at 0 rows.

**No BUFFERS benchmark is reported for this path, and that is a real gap:** `outbox_events` and
`workflow_runs` both hold **0 rows** in `scratch_perf_seed`. A plan over an empty table is
degenerate and any buffer count from it would be noise. That emptiness is itself a finding — the seed
never exercises the durable runtime, which is a second reason this defect was invisible to the seeded
suite as well as to CI.

---

## 3. PRD-C124 — the rest of the Workflows evidence

Verified at head; **no code change needed** unless marked.

- **Schema.** `src/db/schema/common/workflow.ts` — `workflows:11`, `workflow_versions:26`,
  `workflow_executions:45`, `workflow_execution_steps:77`, `workflow_approvals:101`,
  `workflow_schedules:129`, `workflow_variables:152`, `workflow_secrets:171`,
  `workflow_audit_logs:183`. All nine carry a non-null `org_id`, composite tenant FKs and
  `unique(org_id, id)`. **Definition and version are genuinely separate** — `workflows.version:17` is
  only the current-version integer; the immutable definition lives on
  `workflow_versions.definitionJson:31`, and `workflow_executions.workflowVersionId:48` pins an
  execution to the exact version it ran.
- **Permission rung.** All 26 routes on `workflows.controller.ts` carry `@RequirePermission` under a
  class-level `PermissionGuard` + `@RequireModule("workflows")` (`:49-50`). No mutating route is
  undecorated. A good detail: `UpdateWorkflowSchema` omits `"published"` from allowed statuses
  (`dto/workflow.schemas.ts:12-13`) so publishing cannot be reached through the weaker
  `workflows:workflows:update` rung.
- **Bounded execution history.** Keyset-paginated on both list endpoints
  (`workflows-execution.service.ts:83-148`, `:207-261`), capped by `pageSizeField(20, 100)` against
  `PAGE_SIZE_CAP = 100`. `workflow-executions-keyset.spec.ts` renders the real SQL and asserts the
  sort leads on `created_at` and the cursor predicate is strict.
- **Retry / DLQ / cancellation.** Retry `engine/workflow-runner.service.ts:64-88` with a
  transient-vs-deterministic classifier `:56-62`; dead-letter `engine/execution-advance.ts:321-344`;
  cancellation both API-side (`workflows-execution.service.ts:163-205`) and cooperative engine-side,
  every terminal write a compare-and-set on `status='running'` so a concurrent cancel is never
  clobbered. Covered by `dead-letter-execution.spec.ts`, `execution-cancellation.spec.ts`,
  `execution-toctou.spec.ts`, `retry-dlq-bounded-history.spec.ts` — all passing.
- **Secrets / redaction.** AES-256-GCM at rest via `encryptSecret`
  (`common/security/secret-encryption.util.ts:28-40`), which **throws if `ENCRYPTION_KEY` is unset**
  rather than storing plaintext. Redaction is structural, not a filter: `SECRET_COLUMNS`
  (`workflows-secrets.service.ts:11-18`) omits `encryptedValue` and is used on every read, write and
  `returning`. Stronger still — **`decryptSecret` is never called on `workflowSecrets` anywhere in
  `src/`**, so there is no plaintext path to leak. See §4 for the flip side of that.
- **SSRF.** Guarded at the only place a user-controlled URL is fetched:
  `automation-webhook.service.ts:45` calls `checkWebhookUrl` before the single `fetch` at `:67`, with
  a bite proof at `automation-ssrf.spec.ts:106-122`. `workflows/engine/executors/integration.executor.ts`
  makes no outbound call of its own (it delegates to Composio with a non-user-supplied URL), so this
  is **not** a one-has-it-one-doesn't asymmetry.

---

## 4. PRD-C123 — Build/PM evidence

- **Schema.** Declared with `pgSchema` namespaces, not `pgTable` (`src/db/schema/build/namespaces.ts:3`)
  — worth knowing, because a `pgTable(` scan reports the whole module as dead. **84 of 84 build tables
  carry `org_id`**, uniformly `text("org_id").references(…).notNull()`.
- **Tenant + record authorization.** 47 `*-tenant-isolation.spec.ts` files across the four modules.
  Cross-tenant 404 behaviour is covered table-driven with owner controls
  (`build-cross-tenant-404.spec.ts:23`, `build-project-scoped-lists-404.spec.ts:28`). The
  record-level/tenant-only split is real and deliberate: `resolveProjectAccess`
  (`core/project-access.ts:47`) walks owner → permission → manager → member → team across 25 call
  sites, while `assertProjectInOrg` (`:16`) is tenant-only and used by releases, webhooks,
  custom-fields, analytics, sprints, epics, cycles, modules and ticket sub-resources. **That asymmetry
  is a product decision, not a bug** — any org member can read those regardless of project membership
  — and I have left it alone and flagged it rather than changing behaviour mid-release.
- **Bounded reads and cursors.** The bound is a platform primitive: `PAGE_SIZE_CAP = 100`
  (`common/pagination/list-query.schema.ts:4`), and `pageSizeField` **clamps rather than 400s**, with
  `maxSize` able only to narrow. Twelve keyset specs across build. The cursor contract is coherent and
  well-tested, with a deliberate, documented split: `decodeCursor` degrades to the first page on a
  malformed cursor (`common/pagination/cursor.ts:31-34`) while `keyset.ts:30` throws
  `BadRequestException` on a structurally invalid position. `buildCursorPage` carries the
  over-fetch-by-one sentinel and the comment recording the defect it prevents (`cursor.ts:63-70`).
- **Wire shape — checked against the backend, not assumed.** The frontend reads through
  `apiClient.get<T>()`, which is a cast; the release has twice shipped a mismatch that typechecked
  clean. Four envelope declarations looked like candidates. **All four match the backend:**

  | endpoint | frontend declares | backend returns | verdict |
  |---|---|---|---|
  | `GET /build/{id}/tickets` | nested `pagination.nextCursor` (string) | `buildCursorPage` → nested (`cursor.ts:86-93`) | match |
  | `GET /build/all-work` | **flat** `nextCursor` | flat `{data, limit, nextCursor, hasMore, total?}` (`projects-work-query.service.ts:266`) | match |
  | `GET /build` | flat `nextCursor` (**number**) | `IdCursorPage` flat, number (`cursor.ts:96-100`) | match |
  | `GET /workflows`, `/workflows/executions` | nested `pagination` | nested | match |
  | `GET /workflows/variables` | bare array | bare array, `.limit(200)` (`workflows-variables.service.ts:11-31`) | match |
  | `GET /workflows/templates` | bare array | `Promise.resolve([])` (`workflows.service.ts:98-99`) | match, but see §5 |

  So the two-envelope split in the frontend types is **correct**, not a latent bug. I am recording
  that as a positive finding because the reflex is to "unify" it, and unifying would break two of
  these reads.
- **Frontend states.** All seven `features/workflows/` page views carry explicit loading, error and
  empty states via the canonical `EmptyState`/`ErrorState`. `check:empty-states` exits 0.
- **E2E.** 22 `*.e2e-spec.ts` across build/tasks/issues/goals; 12 of 16 build sub-modules covered.

---

## 5. Defects: fixed, and still open

### Fixed in this ticket

| # | severity | file:line | defect |
|---|---|---|---|
| 1 | **P0** | `common/workflow/workflow-outbox-relay.service.ts:72` | cross-tenant outbox read denied under RLS → whole cron tick 500s, nothing durable advances |
| 2 | **P0** | `common/workflow/workflow-store.ts:233` | `startRun` inserts on the bare pool → denied |
| 3 | **P0** | `common/workflow/workflow-store.ts:163` | `claimDueRuns` cross-tenant UPDATE → denied |
| 4 | **P0** | `common/workflow/workflow-store.ts:77` | lifecycle writes outside any tenant scope → denied |
| 5 | **P0** | `common/workflow/workflow-store.ts:24` | step store reads/writes outside any tenant scope → denied |
| 6 | **High** | `common/workflow/workflow-outbox-relay.service.ts` (cursor) | one global cursor across tenants: a quiet tenant's events were skipped **permanently**, not late |
| 7 | Medium | `build/core/projects-tickets.service.ts:123` | delete guard's blocker lookup was **unbounded** — a yes/no question loaded the whole dependency graph. Now capped at 50 with an honest `50+` message |
| 8 | Low | `build/core/projects-activity.service.ts:239` | cycle-name lookup carried no org predicate |

**Honest scoping of 7 and 8.** The build survey reported these as cross-tenant leaks. **They are
not, and I verified that rather than repeating it.** `tickets.id` and `cycles.id` are globally unique
identity primary keys (`db/schema/build/ticket-core.ts:26`, `db/schema/build/core.ts:154`) reached
through composite `(org_id, id)` foreign keys, so a matching row already had to belong to the
caller's organisation. What they were is *unstated* — correctness resting on an invariant two tables
away rather than on the query. The substantive fix is the missing limit in (7). I corrected the
code comments and the spec header, which initially overclaimed. Both fixes carry **verified bite
proofs**: neutering each one fails the corresponding assertion with the org id absent from the bound
parameter list.

### Open — none of these are in my territory

| severity | where | finding |
|---|---|---|
| **Medium** | `src/test/narrowed-type-assertions.spec.ts:249,265` → `src/modules/hr/governance/labor/labor-cases.ts:67` | **`check:spec-typecheck` EXIT=2.** Two `TS2322`: `"closed"` not assignable to `"open" \| "resolved" \| "in_review"` on `updateLaborCase`. HR territory. The plain `typecheck` is exit 0 — this is spec-inclusive only. **Route to the HR agent.** |
| Low (resolved during run) | `src/modules/access/entitlements.service.ts` | `check:cache-invalidation` MEDIUM `F03-module-enable-partial-session-bust`. Failing on my first sweep, exit 0 on the second — the access agent fixed it while I ran. Noting it only so the two conflicting readings are explained. |

### Open — in my territory, deliberately not changed

| severity | where | finding and why it is left |
|---|---|---|
| Medium | `workflows.controller.ts:232` `POST /:workflowId/trigger` | Only **1 of ~15** mutating workflow routes carries `@Idempotent` (just `publish`, `:195`). A retried trigger inserts a second `workflow_executions` row with no dedupe key. Adding `@Idempotent` changes the wire contract (the route starts 400ing without an `Idempotency-Key`), which is a breaking change I will not make unilaterally mid-release. **Product/API decision.** |
| Medium | `workflows.service.ts:98-99` | `listTemplates()` returns a hardcoded `Promise.resolve([])`. The workflow-templates page can never show anything. The frontend type matches, so no gate catches it. **Unimplemented feature, not a regression** — needs a product call, not a fix. |
| Medium | `workflows-secrets.service.ts` | Workflow secrets are **write-only**: `decryptSecret` is never called on `workflowSecrets` anywhere in `src/`, and no executor loads one. Storage and redaction are correct; the feature is not wired to a consumer. **Product decision.** |
| Low | `common/workflow/workflow-store.ts` `drainBacklog` | Fixed for RLS along with the rest, but it has **no production caller** — only its own spec. The backlog alarm its comment calls essential is not actually wired to anything. Wiring it is an observability decision outside this ticket. |
| Low | `workflows-variables.service.ts:31` | `.limit(200)` with no cursor: a tenant with >200 variables silently truncates with no `hasMore`. Bounded, so no gate fires; the silence is the flaw. |
| Low | `build/build-calendar-source.ts` | Folder-cohesion violation: the only non-module production file at the top of `build/`; per `CLAUDE.md:11` it belongs in `build/core/`. **Not moved deliberately** — the path is a key in two shared gate baselines (`unbounded-reads-baseline.json:72`, `unbounded-reads-classification.json:711`), so moving it in a sixteen-agent shared tree risks breaking `check:unbounded-reads` for everyone to gain nothing but tidiness. |

---

## 6. Folder classification

| folder | verdict | reasoning / failure prevented |
|---|---|---|
| `src/modules/build/**` | **KEEP** | 16 cohesive sub-modules, `core/` holds the parent's own services, registered in `app.module.ts:103,155`, no module-gate exemptions. One cosmetic top-level file (above). |
| `src/modules/workflows/**` | **KEEP** | Clean definition/version/execution split, full permission rung, keyset history, real retry/DLQ/cancellation with TOCTOU-safe compare-and-set writes. |
| `src/modules/automation/**` | **KEEP** | Small and correct; SSRF guarded at the only egress with a bite proof. Note rule **CRUD lives in `src/modules/settings/`**, so a permission review scoped to this folder misses the write path. |
| `src/modules/tasks/**`, `issues/**`, `goals/**` | **KEEP** | Each has tenant-isolation and E2E specs; all pass. |
| `src/common/workflow/**` | **REFACTORED** | Failure prevented: the entire durable workflow runtime returning 500 on every cron tick under RLS — no relayed event, no claimed run, no step, for every tenant. Plus permanent event loss for quiet tenants from the shared cursor. |
| `build/core/projects-tickets.service.ts` | **REFACTORED** | Failure prevented: an unbounded read materialising a whole dependency graph to answer a yes/no question. |
| `build/core/projects-activity.service.ts` | **REFACTORED** | Hardening: a name lookup whose tenant safety rested on an invariant two tables away. |
| Nothing | **REMOVE** | No dead code removed. Per the brief, a removal claim needs `knip` plus a real build; I ran neither, so I claim none. |

---

## 7. Files changed (all backend, all uncommitted)

```
src/common/workflow/workflow-store.ts                        (rewritten: per-tenant everywhere)
src/common/workflow/workflow-outbox-relay.service.ts         (forEachOrg + per-org cursor)
src/common/workflow/workflow-runner.service.ts               (2 lines: pass run.organizationId)
src/common/workflow/workflow-outbox-relay.spec.ts            (forEachOrg mocking pattern)
src/common/workflow/drain-backlog.spec.ts                    (+2 cross-tenant summing tests)
src/common/workflow/workflow-correlation-hop.spec.ts         (tenant mocks)
src/common/workflow/workflow-runtime-rls.spec.ts             (NEW — 9 tests, 2 bite proofs)
src/modules/build/core/projects-tickets.service.ts           (bounded + scoped blocker lookup)
src/modules/build/core/projects-activity.service.ts          (scoped cycle lookup)
src/modules/build/core/build-cross-tenant-lookup.spec.ts     (NEW — 5 tests, bite-proven)
src/modules/crm/import/import-pump.ts                        (2 lines: forced call-site fix)
```

`import-pump.ts` is CRM, which is out of scope for this release — but the store-factory signature
change broke its compilation, so the two-line call-site update was mandatory, not elective.

---

## 8. Honest gaps

- **Not run:** frontend `type-check`, frontend `next build`, backend lint, backend e2e
  (`test:e2e:seeded`), `knip`. None claimed.
- **No BUFFERS benchmark for the workflow path** — `outbox_events` and `workflow_runs` are empty in
  the seed, so any plan taken there is degenerate. Stated as a gap, not papered over.
- **The seeded database is 7 migrations behind repo head** (665 vs 672). None of the seven touch the
  three tables in question, but the RLS evidence carries that caveat.
- **The fix is proven at unit level and at the SQL level as the non-owner role. It has not been run
  end-to-end through a live `POST /cron/workflow-tick`** against a booted app on the app role. That
  is the one remaining proof I would want before calling PRD-C124 closed, and it needs the seeded
  e2e harness (`APP_DATABASE_URL` on `streamline_app`, 12 GB heap) rather than a unit run.
- `src/common/workflow/` and `src/modules/cron/` are **outside the literal territory list** in my
  brief. I changed the former because the ticket explicitly directed me to this defect as "a P0 for
  your ticket" and no other agent's territory covers it. `src/modules/cron/cron-workflow.service.ts`
  I read but did **not** modify — with the relay fixed it no longer throws, so the missing guard
  around `relay()` is now latent rather than live. Flagging it so the orchestrator can decide whether
  that guard should still be added.
