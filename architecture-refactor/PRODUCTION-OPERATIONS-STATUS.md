# Production Operations Status

**Generated: 2026-08-31. Lane: L18-PRODOPS.**

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

---

### 2. Physical replica

**Code-side verdict: BLOCKED-BY-CODE — two distinct blockers**

**Blocker A — DrizzleModule never creates a replica pool.**

`backend/src/db/pool.config.ts` reads `DB_REPLICA_URL` and exposes `replicaConnectionString` in `ResolvedPoolConfig`. `backend/src/db/drizzle.module.ts` ignores it: only one `postgres(config.connectionString, config.options)` client is constructed. `ReplicaRouter` is a pool-selection decision helper; it returns a `PoolHandle` (connection string + id) but nothing in `DrizzleModule` or `createTenantAwareDb` reads that decision or creates a second client.

To wire it:

```
backend/src/db/drizzle.module.ts — create a second postgres client from config.replicaConnectionString when defined, pass both to a ReplicaRouter instance, inject the router via a new DI token.
backend/src/common/tenant/tenant-db.ts — createTenantAwareDb must accept the router and route analytics-refresh / search-freshness reads to the replica pool.
```

**Blocker B — RLS GUC must be set on the replica connection.**

RLS is live and the tenant GUC (`app.organization_id`) is set only via `SET LOCAL` inside a transaction on the primary connection. The Neon pooler drops startup params — only `SET LOCAL` inside a transaction sets the GUC safely (confirmed in MEMORY.md: Neon pooler drops startup params). A replica connection is a separate pool; no transaction opens on it, so the GUC is never set and every RLS-protected query against the replica dies `42501`.

The two work classes currently routed to the replica (`analytics-refresh`, `search-freshness`) run inside `forEachOrg` → `runInTenantTransaction`. Any replica read must open its own transaction on the replica connection and set the GUC inside that transaction before running the query.

The code to do this does not exist yet.

**Blocker C — lag-simulation tests are explicitly skipped.**

`backend/src/degradation/read-replica.spec.ts` ratchets the replica env-var seam but skips lag-simulation tests with `xit` blocks. The comment reads "skipped pending Neon replica provisioning."

**Infrastructure prerequisite:** A Neon read replica and `DB_REPLICA_URL` set in the deployment environment — but this cannot be used until blockers A and B are fixed.

**Runbook:** `backend/docs/RB-REPLICA-ROUTING.md` (added by this lane). Do not attempt to provision a replica before the code blockers are closed.

---

### 3. PITR restore

**Code-side verdict: READY for logical backup/restore. BLOCKED-BY-INFRA for 5-minute RPO.**

What is done:

- `cell:backup --backup` takes a logical dump, orders tables by FK graph derived from `pg_constraint`, and records row digests at backup time.
- `cell:backup --restore` rebuilds from the dump.
- `cell:backup --verify` recomputes every table's digest inside the database and compares against the backup-time digest. A restore that reports success but reads back different rows fails here.
- `run-recovery-drill.mjs` ran end to end on 2026-08-29: backup 94 s, bootstrap 1,171 s, restore 2.7 s, verify 1.5 s. **RTO: 19.6 minutes against a 60-minute target. MET.**
- `db-bootstrap.mjs` applies migrations by hash, not by Drizzle timestamp. The baseline must never be regenerated (the Neon DB state 2026-07-28 MEMORY note); this script avoids the Drizzle timestamp-skip trap by design.

**RPO gap (code cannot close this):**

The operational RPO is 6 hours — the scheduled backup interval. A logical dump reads every table; it cannot be taken every 5 minutes. Meeting the PRD's 5-minute target requires Neon PITR, which needs `NEON_API_KEY` (now confirmed present in S7 environment — see S7-LIVE-DEV-EVIDENCE.md) and a scripted branch-restore exercise that has not been run.

**Recovered cell RLS gap (now closed in journal):**

The 2026-08-29 drill found two tables without RLS after restore: `chat_message_reactions` and `communication_backfill_issues`. Migration `0656_communication_tenant_rls` adds the policies for both and is now in the journal at position 2613. A fresh drill must be run to confirm the rebuilt cell is healthy. Until then `recovered_cell_healthy: false` stands in `.recovery-drill-results.json`.

**Runbook:** `architecture-refactor/c28-cell-based-platform-at-20m/CELL-RUNBOOK.md` §Back up and restore. Exact commands, digest verification, rollback (rebuild from the dump). Prerequisite: a dedicated cell-2 not used by other work, `NEON_API_KEY` for the PITR exercise.

**Operator action to close PITR gap:**

1. Obtain `NEON_API_KEY` and confirm it has branch-restore rights for the cell-2 project.
2. Record the `lsn` at a known point using the Neon API: `GET /projects/{id}/branches/{id}/lsn`.
3. Write several rows, note their keys.
4. Create a branch at the earlier LSN: `POST /projects/{id}/branches` with `parent_lsn`.
5. Run `db:verify-rls` and a tenant-isolated read against the branch database.
6. Measure the wall-clock elapsed from disaster declaration to verified-healthy cell.
7. Record result and update `CELL-RUNBOOK.md` §Backup and PITR with the measured RPO.

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
2. `pnpm -C backend load:drive` from that deployment.
3. The 50 req/s sustained target must sustain with pool saturation below the connection-count limit, producing a measured headroom at least 40% of the limiting resource.
4. Burst at 100 req/s for 10 minutes without shedding authentication or billing-ledger traffic.
5. Record in a new `WORKLOAD-RESULTS-COLOCATED.md` alongside the existing file; do not overwrite the current honest run.

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

## Scorecard

| Item | Code-ready | Infra-ready | Runbook | Notes |
|---|---|---|---|---|
| Independent cells — code seams | Yes | — | CELL-RUNBOOK.md §Provisioning | forEachOrg fix landed 2026-08-29; cell:isolation:self-test bites |
| Independent cells — 6 resources isolated | Yes | **No** | CELL-RUNBOOK.md §Provisioning | Compute/Redis/storage/search/workers/realtime need accounts |
| Physical replica — pool wiring | **No** | — | RB-REPLICA-ROUTING.md | DrizzleModule creates one pool only; replicaConnectionString unused |
| Physical replica — GUC on replica | **No** | — | RB-REPLICA-ROUTING.md | SET LOCAL is connection-scoped; no mechanism to set GUC on replica tx |
| Physical replica — lag tests | — | **No** | RB-REPLICA-ROUTING.md | Skipped pending Neon replica provisioning |
| PITR restore — logical (RTO 19.6 min) | Yes | — | CELL-RUNBOOK.md §Back up and restore | Drill ran; RTO MET; two RLS tables now fixed in journal (fresh drill needed) |
| PITR restore — 5-min RPO via Neon | Yes | **No** | CELL-RUNBOOK.md §PITR (this file §3) | Logical dump cannot achieve 5 min; needs NEON_API_KEY branch-restore exercise |
| Load — all 14 objectives driven | Yes | — | WORKLOAD-RESULTS.md | 9 met, 4 network-floor breaches, 1 operational RPO breach |
| Load — colocated headroom % | Yes | **No** | WORKLOAD-RESULTS.md + §4 above | Needs same-region deployment; no headroom figure from public-internet run |
| Cost — AI ledger (credits_milli) | Yes | — | FAILURE-RUNBOOKS.md #tenant-cost | Queryable; per-org AI cost in ai_usage_logs |
| Cost — vendor quantities (Neon/R2/Ably) | Yes | — | §5 above | Quantities measured; Neon field names fixed in S7 |
| Cost — dollar amounts | Yes | **No** | §5 above | Needs six invoice-derived rate env vars |
| Cost — trend forecasts | Yes | **No** | §5 above | Needs 3 samples ≥24h apart (daily sampler running) |
| Cost — per-tenant DB/Redis/compute | **No** | — | FAILURE-RUNBOOKS.md #tenant-cost | No per-tenant ledger outside AI; pg_stat_statements is session-only |
| Live alerts — predicates verified | Yes | — | RUNBOOKS.md | All 8 alert predicates verified against real log shape |
| Live alerts — transport proved | Yes | — | alert-delivery-end-to-end.md | Delivered to local sink; no secrets in payload |
| Live alerts — reach a human | Yes | **No** | RUNBOOKS.md, §6 above | ALERT_WEBHOOK_URL unset in all environments |

**Nothing in this table is claimed as passing evidence.** A `Yes` in Code-ready means the code exists and self-tests bite. An `Infra-ready` No means an operator must act before that item can be exercised.
