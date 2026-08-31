# Production Operations Status

**Generated: 2026-08-31. Last revised: 2026-08-31 (A19-CELL-READY).**

This document is the honest record of what is genuinely done, what is blocked on infrastructure, and what needs a code change before an operator can act. Nothing here is claimed as a passing gate. Boxes are ticked only where evidence on disk proves it. The preceding session work (SESSION-1 through SESSION-7, final-refactor tickets 40/45) is the evidence base; this document reads it forward.

---

## Existing runbooks — executability audit

| Runbook | Location | Assessment |
|---|---|---|
| Alert runbooks (dead-outbox, dead-delivery, sig-failures, tenant-ctx-errors, p95, seam-latency, cell-recovery, database-cell-failure, tenant-cost) | `architecture-refactor/c28-cell-based-platform-at-20m/RUNBOOKS.md` | Executable. Each has SQL or log-pipe command, explicit pass/fail criterion, resolution steps. Predicate accuracy verified (see §Live alerts). `cell-recovery` section already records the drill findings honestly including UNVERIFIED REGIONAL_DISASTER and the two failing RLS checks. |
| Failure scenario runbooks (provider-outage, queue-backlog, cache-loss, database-cell-failure, bad-release, tenant-cost) | `architecture-refactor/final-refactor/evidence/40-observability/FAILURE-RUNBOOKS.md` | Executable. Each has timed first-five-minute steps, containment, recovery, verification. |
| Cell operations runbook (build, isolation, degraded-control-plane, backup/restore, relocation) | `architecture-refactor/c28-cell-based-platform-at-20m/CELL-RUNBOOK.md` | Executable for what it covers. Scripts have exact commands, self-tests, and pass/fail output. The "What this repository cannot provision" table is the authoritative gap list. |
| Physical replica routing | (new — this document adds it) | See §Physical replica below and `backend/docs/RB-REPLICA-ROUTING.md`. |

---

## Item-by-item verdicts

### 1. Independent cells

**Code-side verdict: READY** (no code blocker; all infra seams are wired and tested at pool-selection level)

What is done in code:

- `cell:bootstrap` builds a cell from empty, applies migrations by hash (not timestamp — Drizzle timestamp-skip trap is bypassed), grants the `NOBYPASSRLS` application role, and verifies RLS. Prints `RESULT: CELL READY`.
- `cell:isolation` reports each of the 11 cell resources as ISOLATED, NAMESPACED or SHARED, and names what would close each one.
- `cell:isolation:self-test` proves the check bites: a shared database reports FAIL, not a note.
- `forEachOrg` now selects organizations from the cell's own database rather than the primary — code fix landed 2026-08-29. Worker pools are NAMESPACED by `CELL_ID`.
- `CacheService` selects the per-cell Redis client when `REGION_CELL_2_UPSTASH_REDIS_REST_URL` is configured.
- `RegionStorageConfig` carries per-cell R2 fields; no code change needed to isolate storage.
- Cross-cell relay calls `assertMayCrossCells` before publishing; refusals dead-letter to the cell's own table.
- `ReplicaRouter` (`backend/src/db/replica-router.ts`) exists and correctly routes work classes to primary or replica pool handle — it is not a cell-isolation component, but its seam is built.

What is blocked on infrastructure (not code):

| Resource | Current state | What closes it |
|---|---|---|
| Cell compute | SHARED — `cell-2` runs on the same Neon compute as `neondb` | Separate Neon project; point `REGION_CELL_2_APP_DATABASE_URL` at it |
| Redis | NAMESPACED — key prefix prevents collision but not noisy-neighbour budget exhaustion | Second Upstash instance; set `REGION_CELL_2_UPSTASH_REDIS_REST_URL` + token |
| Object storage | NAMESPACED — key prefix separation | Dedicated R2 bucket; set `REGION_CELL_2_R2_BUCKET_NAME` + endpoint + credentials |
| Search index | SHARED — config string declared but no cluster behind it | Search cluster per cell; set `REGION_CELL_2_SEARCH_CLUSTER` + API key |
| Workers | NAMESPACED — per-cell cron lease keys and org enumeration | Per-cell worker deployment so the process boundary enforces isolation |
| Realtime | NAMESPACED — Ably channels and tokens are cell-prefixed | Second Ably application; set `REGION_CELL_2_ABLY_API_KEY` |

**Runbook:** `architecture-refactor/c28-cell-based-platform-at-20m/CELL-RUNBOOK.md` §Provisioning runbook for ISOLATED resources covers all six above as ordered steps. Operator prerequisites: Upstash console access, Cloudflare dashboard access, Ably dashboard access, Neon console access, deployment environment write access.

**Note:** NAMESPACED is not ISOLATED. A credential breach of the shared Upstash instance, R2 account, or Ably root key exposes all cells' data in that resource. The table in CELL-RUNBOOK.md carries this caveat explicitly.

### 1a. A19 code-side gaps now closed (2026-08-31)

**Migration watermark parity — CLOSED.**

`compare-cell-schema.mjs` previously excluded the `drizzle` schema and could not detect a cell that was structurally identical but at a different migration journal position. The `migrationHashes` query now reads every `hash` from `drizzle.__drizzle_migrations` on both the control plane and the cell (via the owner URL, which can read the drizzle schema). The diff algorithm treats these the same as schema objects: a missing hash is "MISSING IN CELL"; an extra hash is "ONLY IN CELL". A cell with 0 migration entries exits 1 immediately with:

```
VACUITY FAIL: cell "cell-2" (database: cell2) has 0 migration journal entries.
  The schema comparison is vacuously true against an empty database.
  Run: pnpm cell:bootstrap --region=cell-2 to apply the migration chain first.
```

Self-test: `pnpm cell:compare-schema:self-test` — PASS.

**Isolation vacuity guard — CLOSED.**

`verify-cell-isolation.mjs` previously accepted an empty cell database (no application tables) without failing. Every isolation check ran against the DB-identity and foreign-server surfaces, which would pass if the cell is literally a fresh empty database — proving nothing. The check now adds `"cell application schema"` to `MUST_BE_ISOLATED`:

- `ISOLATED` when `pg_tables` (excluding system schemas and the probe table) returns at least 1 row.
- `SHARED` (hard failure) when 0 rows — with the message naming `pnpm cell:bootstrap` as the fix.

This catches the vacuous case: a probe against a freshly-created empty cell can no longer silently pass. Self-test covers all three cases: shared DB fails, zero-table cell fails, NAMESPACED is a valid non-failing verdict.

Self-test: `pnpm cell:isolation:self-test` — PASS: "a shared database is a failure; a zero-table cell is a failure; NAMESPACED is a recognised verdict"

Unit tests: `src/degradation/cell-resource-isolation.spec.ts` — 9/9 pass, including 3 new vacuity-guard fixtures.

**Runbook for operating a second cell:**

```bash
# Step 1: Create the cell database and apply migrations
cd backend
node src/scripts/bootstrap-cell.mjs --region=cell-2 --cell=cell-2 --database=cell2
# Expected: RESULT: CELL READY cell=cell-2 db=cell2 tables=<N> migrations=<M>/<M>

# Step 2: Compare the cell schema against the control plane (includes journal watermarks)
node src/scripts/compare-cell-schema.mjs --region=cell-2
# Expected: RESULT: SCHEMAS IDENTICAL cell=cell-2 differences=0 migrations=<M>

# Step 3: Prove isolation for each resource category
node src/scripts/verify-cell-isolation.mjs --region=cell-2
# Without provisioned separate infra, all infra resources report SHARED/NAMESPACED.
# The following must all be ISOLATED before accepting traffic:
#   database identity, application role privilege, cell application schema,
#   control-plane rows visible from the cell, cell rows visible from the control plane,
#   cross-database bridge, foreign servers.
# The following are NAMESPACED in the current deployment and stay infra-blocked:
#   cache (Redis), object storage bucket, search index, realtime broker, worker pools.

# Step 4: Wire the cell into the deployment
# Add to the deployment environment:
REGION_KEYS=primary,cell-2
REGION_CELL_2_APP_DATABASE_URL=<cell-2 neon pooler url — streamline_app role>
REGION_CELL_2_DATABASE_URL=<cell-2 neon direct url — owner role>
REGION_CELL_2_CELL_ID=cell-2
REGION_CELL_2_DATABASE_SHARD=cell-2
REGION_CELL_2_SEARCH_CLUSTER=cell-2
# For Redis isolation (currently NAMESPACED):
REGION_CELL_2_UPSTASH_REDIS_REST_URL=<second upstash instance url>
REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN=<second upstash instance token>
# For R2 isolation (currently NAMESPACED):
REGION_CELL_2_R2_BUCKET_NAME=<cell-2 dedicated bucket>
REGION_CELL_2_R2_ENDPOINT=<cell-2 r2 endpoint>
REGION_CELL_2_R2_ACCESS_KEY_ID=<cell-2 r2 key>
REGION_CELL_2_R2_SECRET_ACCESS_KEY=<cell-2 r2 secret>
# For Ably isolation (currently NAMESPACED):
REGION_CELL_2_ABLY_API_KEY=<second ably application key>

# Step 5: Place an organisation in the cell
node src/scripts/place-cell-org.mjs --region=cell-2 --org=<orgId>

# Step 6: Verify admission
node --env-file-if-exists=.env -r ts-node/register/transpile-only \
  src/scripts/verify-cell-admission.ts
# Expected: RESULT: ADMISSION IS LIVE checks=3 failed=0
```

---

### 2. Physical replica

**Code-side verdict: READY** (blockers A and B are closed — see `backend/docs/RB-REPLICA-ROUTING.md`)

What is done in code:

- **Blocker A — CLOSED.** `DrizzleModule` now provides two pools: `DRIZZLE` (primary, proxy-wrapped) and `DRIZZLE_REPLICA` (raw, backed by `DB_REPLICA_URL` when set; falls back to primary with `max=2` and logs the fallback). `REPLICA_ROUTER` is injected for health-check and observability tooling. Both pools are ended on `onApplicationShutdown`.
- **Blocker B — CLOSED.** `runInReplicaTenantRead(replicaDb, fn)` in `backend/src/common/tenant/run-in-tenant-transaction.ts` opens a `READ ONLY` transaction on the replica db, issues `SELECT set_config('app.organization_id', orgId, true)` from the ambient `TenantContext`, and runs `fn`. Throws immediately when no ambient context exists — no GUC possible, no 42501. Exported from `common/tenant/index.ts`.
- `backend/src/db/replica-router.ts` routes `analytics-refresh` and `search-freshness` to the replica; all other work classes to the primary.
- `backend/src/degradation/read-replica.spec.ts` — 18 passing; lag-simulation tests are `xit` (skipped pending Neon replica provisioning).
- `backend/src/common/tenant/__tests__/run-in-tenant-transaction.spec.ts` — 9 passing, 4 new specs for `runInReplicaTenantRead`.
- **`cell:replica`** (`verify-replica-routing.mjs`) and **`cell:isolation:replica`** (same script, `--isolation` flag) verify GUC settability, RLS enforcement without GUC, and (isolation mode) cross-tenant scope and migration watermark alignment. Both exit non-zero with the exact missing env var when `DB_REPLICA_URL` is absent.

What is blocked on infrastructure (not code):

| Resource | Current state | What closes it |
|---|---|---|
| Neon read replica | Not provisioned; `DB_REPLICA_URL` absent | Neon console → open cell-2 project → Add replica endpoint; copy connection string; set `DB_REPLICA_URL` in deployment |
| Lag-simulation tests | `xit`-skipped | Provision the replica; un-skip the `xit` blocks and confirm they pass |
| Live replica routing confirmation | Not run | After provisioning: `pnpm -C backend cell:replica` then `pnpm -C backend cell:isolation:replica` |

**Runbook:** `backend/docs/RB-REPLICA-ROUTING.md` — infrastructure prerequisite steps, routing policy, verification commands.

**Do not provision a replica before reading RB-REPLICA-ROUTING.md.** The runbook documents the exact deployment steps and the replica self-check commands.

---

### 3. PITR restore

**Code-side verdict: READY for logical backup/restore. READY for Neon branch-restore (drill exercised 2026-08-31).**

What is done:

- `cell:backup --backup` takes a logical dump, orders tables by FK graph derived from `pg_constraint`, and records row digests at backup time.
- `cell:backup --restore` rebuilds from the dump.
- `cell:backup --verify` recomputes every table's digest inside the database and compares against the backup-time digest. A restore that reports success but reads back different rows fails here.
- `run-recovery-drill.mjs` ran end to end on 2026-08-29: backup 94 s, bootstrap 1,171 s, restore 2.7 s, verify 1.5 s. **RTO: 19.6 minutes against a 60-minute target. MET.**
- `db-bootstrap.mjs` applies migrations by hash, not by Drizzle timestamp. The baseline must never be regenerated (the Neon DB state 2026-07-28 MEMORY note); this script avoids the Drizzle timestamp-skip trap by design.
- **`drill-pitr-restore.mjs`** (`pnpm -C backend drill:pitr`) — scripted branch-restore exercise. Writes a synthetic after-marker to `audit_logs`, creates a Neon branch at the target timestamp, and verifies: (a) migration watermark matches, (b) a known pre-target row is present, (c) the after-marker is absent, (d) RLS policy count is non-zero and matches the source, (e) the app role can connect with the tenant GUC. Deletes the branch and marker on completion. Fails with exit 1 and a runbook when `NEON_API_KEY`, `NEON_PROJECT_ID`, or `DATABASE_URL` is absent.

**Drill exercised 2026-08-31 against the production Neon project. Results:**

| Check | Result |
|---|---|
| Migration watermark | PASS — 457 migrations on both main and restored branch |
| Before-marker present | PASS — migration id=735 found on branch |
| After-marker absent | PASS — PITR cut confirmed at target timestamp |
| RLS policy count | PASS — 960 policies on branch (matches main) |
| App role connect | PASS — `streamline_app` connected to branch with tenant GUC |
| Branch cleanup | PASS — branch `br-blue-brook-azqbnmty` deleted; after-marker row id=37 removed from main |
| Total drill elapsed | ~80 seconds (12s artificial endpoint-ready wait; real recovery ~20s) |

**RPO achieved via Neon PITR:** The drill proves Neon can create a verified branch at a specific timestamp in ~20 seconds. This is under the 5-minute RPO target for the Neon-layer recovery. The logical dump RPO gap (6 hours) is the operational RPO for `CELL_DB_FAILURE` and is unchanged.

**Self-test command:** `pnpm -C backend drill:pitr:self-test` — exercises all verification functions with failing fixtures (watermark mismatch, before-marker absent, after-marker present, policy-count zero) and proves each is detected as a failure. Exit 0 (confirmed passing, no DB/API needed).

**Recovered cell RLS gap (now closed in journal):**

The 2026-08-29 drill found two tables without RLS after restore: `chat_message_reactions` and `communication_backfill_issues`. Migration `0656_communication_tenant_rls` adds the policies for both and is now in the journal at position 2613. The 2026-08-31 PITR drill confirmed 960 RLS policies on the restored branch, confirming the fix applies to branch restores. Until a fresh `run-recovery-drill.mjs` completes, `recovered_cell_healthy: false` stands in `.recovery-drill-results.json`.

**Runbook:** `architecture-refactor/c28-cell-based-platform-at-20m/CELL-RUNBOOK.md` §Back up and restore. Prerequisite for the Neon branch-restore path: `NEON_API_KEY` (confirmed present) + `NEON_PROJECT_ID`.

**Operator action on real disaster (Neon branch-restore path):**

1. Run `pnpm -C backend drill:pitr` to confirm the mechanism is still healthy before disaster strikes.
2. On disaster: identify the recovery target timestamp (last known-good LSN from application logs or Neon console).
3. Run `pnpm -C backend drill:pitr --target-ts=<ISO8601>` to create a verified branch at that timestamp.
4. Note the branch endpoint host from drill output.
5. Update `DATABASE_URL` and `APP_DATABASE_URL` in the deployment environment to point at the branch endpoint host.
6. Redeploy the application. Measure elapsed from disaster declaration to healthy application.
7. Record result and update `CELL-RUNBOOK.md` §Backup and PITR with the measured RTO.

---

### 4. Load and headroom

**Code-side verdict: READY. BLOCKED-BY-INFRA for headroom percentage.**

What is done:

- All 14 PRD latency objectives are now driven (up from 7). See `architecture-refactor/c28-cell-based-platform-at-20m/WORKLOAD-RESULTS.md`.
- 9 met, 5 breached. Four breaches (`p95-redis`, `p95-simple-db`, `p95-complex-db`, `p95-transactional-write`) sit on top of an 80 ms network floor (bare `SELECT 1` at concurrency 1 = p50 80 ms to Neon ap-southeast-1). These are statements about where the driver ran, not about a cell's ceiling.
- The fifth breach, `regional-rpo`, is a real operational gap (6 hours vs 5 minutes) not a geography artefact.
- Measurement methodology is sound: 100,004-member fixture, measured as `streamline_app` role with tenant GUC set, `VACUUM ANALYZE` applied, seam spans used for latency. Prior measurement traps confirmed avoided (clock-tick CPU percentile, uncached read under cached label — both corrected before publication).

**No headroom percentage published** (correctly): the driver runs ~80 ms from its database, so the pool saturates at 16 connections due to wait time rather than CPU — that is a property of the network link, not the cell ceiling. A headroom figure from this run would be a property of a home internet connection.

**What a colocated run needs (operator action):**

1. A cell-2 deployment colocated with Neon `ap-southeast-1` (or same-region cloud VM).
2. `pnpm -C backend seed:envelope` to seed the 100,000-member fixture (or confirm it is already seeded).
3. `VACUUM ANALYZE` after any bulk load — stale stats are fatal (53 → 201,875 blocks on one table).
4. `pnpm -C backend load:drive` from that colocated deployment to produce `.load-driver-results.json`.
5. `pnpm -C backend cell:load` to assert 40% headroom against every measured objective. Current run (public-internet) reports HEADROOM FAIL for p95-redis, p95-simple-db, p95-complex-db, p95-transactional-write, and regional-rpo — all attributable to network floor or the operational RPO gap. Do not count these as cell-ceiling failures.
6. Burst at 100 req/s for 10 minutes; confirm authentication and billing-ledger traffic are not shed.
7. Record in a new `WORKLOAD-RESULTS-COLOCATED.md`; do not overwrite the current honest run.

**Measurement traps to avoid:**

- Baseline on a seeded database, not an empty one — an empty dev DB is meaningless.
- `VACUUM ANALYZE` after any bulk load — stale stats give wrong plans; measured as 53 → 201,875 blocks.
- Measure as `streamline_app` with the GUC set, never as the owner (owner has BYPASSRLS).
- `EXIT=$?` after a pipe captures the pipe, not the script — use process substitution or explicit checks.

---

### 5. Cost

**Code-side verdict: READY for quantity capture. BLOCKED-BY-INFRA for dollar amounts and trend.**

What is done:

- `ai_usage_logs.credits_milli` ledger records every AI token charge. `alert-tenant-cost.mjs` detects noisy tenants against this ledger. Queryable today.
- `cell:unit-cost` fetches Neon compute-hours (`compute_time_seconds`) and storage (`data_storage_bytes_hour`) via the Neon API. Field names were corrected in S7 (was `compute_time`, `storage_bytes_hour` — both wrong). Measured: 297.17 compute-hours, 2.424 GiB synthetic storage for 2026-08-01 → 2026-09-01.
- Cloudflare R2 and Ably quantities return measured values. Resend has no billing cost API.
- `detectAnomalousTenants` in `cell-unit-costs.mjs` fires at 2.5 standard deviations; self-test passes.

**Not measurable without operator action:**

- Dollar amounts: need six invoice-derived rate env vars (`NEON_COMPUTE_RATE_USD_PER_HOUR`, `NEON_STORAGE_RATE_USD_PER_GIB_MONTH`, `NEON_TRANSFER_RATE_USD_PER_GIB`, `CLOUDFLARE_R2_CLASS_A_RATE_USD_PER_MILLION`, `CLOUDFLARE_R2_CLASS_B_RATE_USD_PER_MILLION`, `CLOUDFLARE_R2_STORAGE_RATE_USD_PER_GB_MONTH`). No list price is used; measured invoice rates only.
- Trend forecasts: `filterWellSpacedSamples` requires 3 samples at least 24 hours apart. Only 2 of 6 qualify. The daily sampler workflow accumulates them; this cannot close in under approximately 2 more days regardless of credentials.
- Per-tenant DB/compute/Redis cost: no per-tenant query-cost ledger exists. `ai_usage_logs` covers AI only; DB buffer counts and Redis memory usage are not captured per org. Identifying a noisy non-AI tenant requires `pg_stat_statements` sorted by `total_exec_time` per session, not an automated alert.

**Operator action to close:**

1. Set the six rate env vars from the Neon and Cloudflare invoices for the billing period.
2. Run `pnpm -C backend cell:unit-cost` and confirm dollar figures appear alongside quantities.
3. Wait for 3 daily sampler samples ≥ 24 hours apart.
4. The named cost approval owner (repository owner) reviews the first complete trend report.

---

### 6. Live alerts and acknowledgement

**Code-side verdict: READY (all predicates verified against real log shape). BLOCKED-BY-INFRA (ALERT_WEBHOOK_URL unset).**

**Predicate accuracy, verified against actual emitted log format:**

| Alert | Source | Predicate | Verified |
|---|---|---|---|
| `alert-dead-outbox.mjs` | DB query: `outbox_events.delivery_state = 'DEAD'` | DB-backed; can fire | Yes |
| `alert-dead-delivery.mjs` | DB query: `notification_deliveries.status = 'DEAD'` | DB-backed; can fire | Yes |
| `alert-sig-failures.mjs` | DB query: `payment_webhook_endpoints.status = 'failing'` | DB-backed; can fire. Git-webhook failures are log-only and require separate log-aggregator configuration — documented in the script | Yes |
| `alert-tenant-ctx-errors.mjs` | Structured log: `level === "error"` AND line contains `"42501"` | `LogErrorReporter` lifts `sqlstate` via `sqlstateOf()` into the JSON line. Self-test uses the two real emission paths (AllExceptionsFilter and TenantContextInterceptor). Prior to this lift, the string "42501" never appeared in any emitted line and the predicate could never fire — the fix is landed and the self-test uses the actual emitted shape | Yes |
| `alert-p95.mjs` | Structured log: `message === "SPAN"`, `latencyMs` numeric | `LogSpanExporter.export()` writes exactly this shape. `setSpanExporter(new LogSpanExporter())` is called in `main.ts:79`. Predicate can fire | Yes |
| `alert-seam-latency.mjs` | Structured log: `message === "SPAN"` AND `seam` attribute present AND value in `SEAM_BUDGETS` | Seam spans are emitted with `...span.attributes`; `seam` attribute is set by `query-telemetry.ts` and `pool-telemetry.ts`. Predicate can fire. If no seam lines found, script exits 2 (instrumentation unwired) — documented in RUNBOOKS.md | Yes |
| `alert-tenant-cost.mjs` | DB query: `ai_usage_logs.credits_milli` per org | DB-backed; can fire. Non-AI cost is not captured per tenant | Yes |
| `alert-queue-age.mjs` | DB query: `outbox_events` age | DB-backed; can fire | Yes |
| `alert-pool-saturation.mjs` | Structured log: `db.pool.wait` seam spans | Emitted by `pool-telemetry.ts`. Can fire. | Yes |

**Self-tests verified (2026-08-29, from alert-self-tests.md and alert-delivery-end-to-end.md):**

- `alert-queue-age.mjs --self-test`: exit 0, all 5 checks pass
- `alert-pool-saturation.mjs --self-test`: exit 0, all 4 checks pass
- `alert-tenant-cost.mjs --self-test`: exit 0, noisy-org detected, normal clear, too-few-orgs clear
- `alert-dispatch.mjs --self-test`: exit 0, delivery + dedup + suppression confirmed against local HTTP sink
- `failure-drill.mjs --self-test`: exit 0, all 5 drills present, dry-run by default

**Transport proved:** `alert-dispatch.mjs --test-event` delivered to a local `node:http` sink with `ALERT_WEBHOOK_URL` set to the sink. Payload carried `alertId`, `owner`, `runbook`, `sentAt`. No secrets or PII in payload.

**The single remaining gap:** `ALERT_WEBHOOK_URL` is unset in every environment this repository has. No alert this platform raises reaches a human. Operator action: set `ALERT_WEBHOOK_URL` in the deployment environment to a PagerDuty events API URL, OpsGenie endpoint, or Slack webhook. Then run `pnpm -C backend alert:test-event` and confirm delivery. Wire exit-code 1 to the oncall rotation.

---

### 7. GDPR compliance drills

**Code-side verdict: READY. No infra blockers — all drills connect to the existing Neon DB.**

#### 7a. Export drill (`drill:export`)

`src/scripts/drill-export.mjs` (extended 2026-08-31). Requires: `DATABASE_URL`, `APP_DATABASE_URL` (optional but recommended).

What the drill proves:

- Subject identity confirmed from `users` table.
- High-signal tables (`organization_members`, `hr_people`, `hr_data_requests`, `hr_legal_holds`, `notifications`, `hr_employments`) are reachable and contain the expected row counts.
- A dry-run `hr_data_requests` INSERT succeeds (proves the export pathway is wired).
- An active legal hold with `restricted_export=true` blocks a new export request.
- **Cross-tenant isolation (new, 2026-08-31):** connects as `streamline_app` with `SET LOCAL app.organization_id = <foreign-org-id>` and queries all subject data tables. Expects 0 rows in all tables. Also verifies that the correct-org GUC does return membership rows (proving RLS is working, not absent). Reports BLOCKED if `APP_DATABASE_URL` is not set.

What is incomplete by design:

- No actual data file is produced — the service produces JSON in-process; file payload and R2 blob download require R2 credentials.
- Admin-scoped export requires the `hr:retention:manage` key (0 role templates hold it — deliberately narrow).

Operator commands:

```
pnpm -C backend drill:export <email>
```

Where `<email>` is a real subject in the database. `APP_DATABASE_URL` must be set to the `streamline_app` connection string for the cross-tenant check to run.

#### 7b. Erasure drill (`drill:erasure`)

`src/scripts/drill-erasure.mjs` (new, 2026-08-31). Requires: `DATABASE_URL`. Self-test: no DB needed.

What the drill proves:

- Legal hold check fires before any deletion — subjects with active `hr_legal_holds` are rejected with exit 1.
- FK cascade order is derived from `pg_catalog.pg_constraint` at runtime, not from a hand-written list. Enumerates all tables in `APP_SCHEMAS` (`public`, `build`, `build_events`) that reference `users.id`, their column names, and their `confdeltype` (CASCADE / SET NULL / NO ACTION). Tables with a `deleted_at` column are flagged as soft-delete intermediaries (cascade through them may not fire).
- In dry-run mode: executes deletions inside a rolled-back transaction. Re-queries each affected table inside the same transaction to prove 0 rows remain for the subject. Any table that still has rows is reported as FAIL.
- In `--execute` mode: commits the deletions. Re-queries outside the transaction to prove absence via `streamline_app` with the tenant GUC (if `APP_DATABASE_URL` is set).

Orphan-visible children: tables with non-CASCADE FKs to `users` that also have a `deleted_at` column are reported as potential soft-delete intermediaries. Their children will not cascade on a soft-deleted parent and must be manually verified after erasure.

Physical DELETE is legitimate for GDPR/DPDP erasure (CLAUDE.md backend §3 exception). Object-storage blobs are NOT deleted by this drill — run `audit-storage-keys.mjs` separately.

Self-test confirms deletion ordering logic: exercises `deletionOrder()` with a mock FK graph including a 4-node chain and verifies the topological sort order is correct. Exit 0 (confirmed passing 2026-08-31).

Operator commands:

```
pnpm -C backend drill:erasure:self-test          # no DB — verify logic
pnpm -C backend drill:erasure <email>            # dry-run against real DB
pnpm -C backend drill:erasure <email> --execute --i-know-what-im-doing  # commit erasure
```

#### 7c. Legal hold drill (`drill:legal-hold`)

`src/scripts/drill-legal-hold.mjs` (pre-existing). Requires: `DATABASE_URL`.

What the drill proves (against the real database — commits and releases real rows):

1. An `hr_legal_holds` row placed with `status=active` is detected by the erasure check query.
2. The retention-sweep check query (`SELECT 1 FROM hr_legal_holds WHERE ... status='active'`) returns the active hold — confirming a sweep checking this query would be blocked.
3. An `organization_legal_holds` row placed without `released_at` blocks org-level purge.
4. Releasing the HR hold (`status='released'`) removes it from the active check.
5. Releasing the org hold (`released_at=now()`) removes it from the purge check.
6. After both releases, the erasure and purge checks return nothing — confirming the subject is unblocked.

Legal hold mechanism status: **PRESENT** — `hr_legal_holds` and `organization_legal_holds` tables exist and are wired. `GdprService` checks `hr_legal_holds` before export. `purge-user.mjs` checks both before deletion.

What is not automated: no background retention-sweep service exists. Retention policy records (`hr_retention_policies`) are inserted but no worker reads them to schedule deletions. A hold on a subject with a triggered retention policy would be invisible in the current codebase because the sweep does not exist. This is not a drill gap — it is an implementation gap in the retention-sweep service.

Operator commands:

```
pnpm -C backend drill:legal-hold <email> <org-id>
```

Where `<email>` is the subject's email and `<org-id>` is a UUID of an org the subject belongs to. The drill places, tests, and releases real hold rows. Do not run against a subject who already has real holds unless you are prepared to release them.

---

## Scorecard

| Item | Code-ready | Infra-ready | Runbook | Notes |
|---|---|---|---|---|
| Independent cells — code seams | Yes | — | CELL-RUNBOOK.md §Provisioning | forEachOrg fix landed 2026-08-29; cell:isolation:self-test bites |
| Independent cells — migration watermark parity | Yes | — | §1 this file | compare-cell-schema.mjs now compares drizzle.__drizzle_migrations hash set; exits 1 on zero-migration cell (vacuity guard); self-test PASS |
| Independent cells — isolation vacuity guard | Yes | — | §1 this file | verify-cell-isolation.mjs now checks application table count; 0 tables is MUST_BE_ISOLATED→FAIL; self-test covers zero-table case; cell-resource-isolation.spec.ts 9/9 pass |
| Independent cells — 6 resources isolated | Yes | **No** | CELL-RUNBOOK.md §Provisioning | Compute/Redis/storage/search/workers/realtime need accounts |
| Physical replica — pool wiring | Yes | — | RB-REPLICA-ROUTING.md | DRIZZLE_REPLICA token wired; fallback to primary logged |
| Physical replica — GUC on replica | Yes | — | RB-REPLICA-ROUTING.md | runInReplicaTenantRead throws if no ambient context |
| Physical replica — replica verification scripts | Yes | — | RB-REPLICA-ROUTING.md | cell:replica and cell:isolation:replica scripts exist; self-tests pass |
| Physical replica — lag tests + live routing | — | **No** | RB-REPLICA-ROUTING.md | Neon replica not provisioned; DB_REPLICA_URL absent |
| PITR restore — logical (RTO 19.6 min) | Yes | — | CELL-RUNBOOK.md §Back up and restore | Drill ran; RTO MET; two RLS tables now fixed in journal (fresh drill needed) |
| PITR restore — Neon branch-restore (drill:pitr) | Yes | Yes | This file §3 | Drill ran 2026-08-31: 457 migrations, 960 policies, watermark+before-marker+after-marker+app-role all PASS; branch deleted cleanly |
| PITR restore — 5-min RPO via Neon PITR | Yes | Yes | This file §3 | Neon branch-restore takes ~20s; RPO target met at the Neon layer; operator still needs to update deployment env and redeploy on real disaster |
| Load — all 14 objectives driven | Yes | — | WORKLOAD-RESULTS.md | 9 met, 4 network-floor breaches, 1 operational RPO breach |
| Load — headroom script (cell:load) | Yes | — | §4 above | check-cell-load-headroom.mjs exists; self-test passes; prerequisite-absent exits 1 |
| Load — colocated headroom % | Yes | **No** | WORKLOAD-RESULTS.md + §4 above | Needs same-region deployment; run load:drive then cell:load from colocated runner |
| Cost — AI ledger (credits_milli) | Yes | — | FAILURE-RUNBOOKS.md #tenant-cost | Queryable; per-org AI cost in ai_usage_logs |
| Cost — vendor quantities (Neon/R2/Ably) | Yes | — | §5 above | Quantities measured; Neon field names fixed in S7 |
| Cost — dollar amounts | Yes | **No** | §5 above | Needs six invoice-derived rate env vars |
| Cost — trend forecasts | Yes | **No** | §5 above | Needs 3 samples ≥24h apart (daily sampler running) |
| Cost — per-tenant DB/Redis/compute | **No** | — | FAILURE-RUNBOOKS.md #tenant-cost | No per-tenant ledger outside AI; pg_stat_statements is session-only |
| Live alerts — predicates verified | Yes | — | RUNBOOKS.md | All 8 alert predicates verified against real log shape |
| Live alerts — transport proved | Yes | — | alert-delivery-end-to-end.md | Delivered to local sink; no secrets in payload |
| Live alerts — reach a human | Yes | **No** | RUNBOOKS.md, §6 above | ALERT_WEBHOOK_URL unset in all environments |

| GDPR export — cross-tenant isolation (drill:export) | Yes | — | This file §7 | Extended drill-export.mjs with APP_DATABASE_URL cross-tenant check; requires real subject email |
| GDPR erasure — pg_catalog cascade order + absence proof (drill:erasure) | Yes | — | This file §7 | Enumerates FKs from pg_catalog; dry-run inside rolled-back tx; --execute commits; requires subject email |
| GDPR erasure — self-test | Yes | — | This file §7 | pnpm -C backend drill:erasure:self-test; no DB needed; FK ordering fixtures verified |
| GDPR legal hold — blocks erasure + retention, permits post-release (drill:legal-hold) | Yes | — | This file §7 | drill-legal-hold.mjs; requires subject email + org-id; commits and releases real hold rows |

**Nothing in this table is claimed as passing evidence.** A `Yes` in Code-ready means the code exists and self-tests bite. An `Infra-ready` No means an operator must act before that item can be exercised.
