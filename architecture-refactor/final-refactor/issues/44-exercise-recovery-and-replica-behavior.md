# 44: Exercise recovery and read-replica behavior

**What to build:** Operators can restore a cell within approved RPO/RTO and every replica-served workload has declared, tested consistency behavior.

**Blocked by:** 43 — Provision independently isolated cell resources.

**Status:** partial — recovery code and drill evidence are complete, but physical replica and operational RPO evidence remain operator-blocked.

- [x] Backup/restore drill records measured RPO, RTO and integrity verification.

  **The drill now runs end to end: `RESULT: DRILL PASSED`.** The cell was destroyed and rebuilt from a
  logical backup, and every restored digest matched. `pnpm cell:drill` writes
  `.recovery-drill-results.json`.

  | Metric | Measured | Target | Failure class | Met |
  |---|---:|---:|---|---|
  | RTO | **1,175 s** (19.6 min) | ≤ 3,600 s | `CELL_DB_FAILURE` | **Yes** on elapsed |
  | Integrity | 3 tables, 66 rows, digests identical | lossless | `CELL_DB_FAILURE` | **Yes** |
  | RPO (restore itself) | **0 s** | ≤ 300 s | `CELL_DB_FAILURE` | **Yes** |
  | RPO (operational) | **21,600 s** (6 h) | ≤ 300 s | `CELL_DB_FAILURE` | **No** |
  | RPO / RTO | unverified | — | `REGIONAL_DISASTER` | **No** |

  Phases: backup 94 s, rebuild 1,171 s, restore 2.7 s, verify 1.5 s.

  **RPO is reported twice on purpose, because one of the two numbers flatters.** The drill takes its
  backup seconds before declaring the disaster, so its 0 s proves the *restore* loses nothing — which is
  worth knowing and is not the objective. What an operator loses is the age of the most recent backup.
  That was previously unbounded (an earlier run measured 47,468 s, i.e. "whenever someone last ran a
  dump"); `.github/workflows/cell-backup.yml` now takes and **reads back** a backup every 6 hours, so
  the operational figure is 21,600 s. The objective is judged on that and misses by 72×. A logical dump
  cannot be taken every 5 minutes — it reads every table — so closing this needs Neon PITR and a
  `NEON_API_KEY`, which is a purchase-and-credentials step, not code.

  **RTO became measurable because the cold chain now reaches head** (`REACHED_HEAD 371/371`) — see
  ticket 42. The drill also no longer conflates "the chain never applied" with "the chain applied and a
  health check failed": only the first makes recovery time unmeasurable, and reporting "RTO unknown"
  when the truth is "RTO 19.6 min, cell unhealthy" is knowing less, not being more careful. It records
  `rto_elapsed_within_target: true` alongside `unhealthy_after_recovery`, which currently lists the two
  tables from S3's `0628` that carry `org_id` with no RLS policy.

- [x] Placement/control-plane behavior during recovery fails safely and recovers cleanly.

  Exercised during the real cell-2 outage window rather than only in unit tests. The control plane
  (`neondb`) was never touched while cell-2 was dropped; placement lookups stayed available, and the
  11 tests in `placement-degraded-control-plane.spec.ts` remained green throughout. The ordering
  invariant holds: signed-cache TTL 10 min < fence lease 24 h, so a cached placement cannot outlive the
  write fence it implies. An unknown organization is refused 503-retryable and **not** cached, so an
  outage cannot be mistaken for a deletion.

- [ ] Replica-tolerant reads are enumerated and tested under lag; critical/read-after-write paths remain primary.

  **Lag is now genuinely tested, against a real database.** The earlier version of this work skipped the
  staleness half and asserted only pool-selection routing, which is not "tested under lag". A
  `REPEATABLE READ` transaction takes its snapshot at first read and cannot see anything committed
  afterwards — that is real, measurable staleness without provisioning a replica. The test opens the
  lagging snapshot, commits a row on the primary, and asserts the snapshot still counts 1 while the
  primary counts 2, then asserts a read-after-write path is `primary-required` and does see its own
  write. It runs against the live database (1.5 s of real work), not a double.

  What that does **not** reproduce is replication delay itself, so the remaining `it.skip` names exactly
  that and nothing more: provision a Neon read-replica, set `DB_REPLICA_URL`, re-run the staleness
  assertions against that endpoint. `read-replica.spec.ts`: **20 passed, 1 skipped**.

  The seam itself: `src/db/replica-router.ts` adds `ReadStrategy` (`primary-required` | `replica-safe`),
  `routingStrategyFor(workClass)` and `ReplicaRouter`. Only `analytics-refresh` and `search-freshness`
  route replica-safe; RBAC resolution, permission-cache misses and financial-ledger reads are
  primary-required. A faulted replica raises `ReplicaShedError` and **does not fall back to primary** —
  falling back would let stale projections compete for primary capacity, which is the failure the
  degradation matrix is trying to prevent.

  `pool.config.ts` gained `DB_REPLICA_URL` and `replicaConnectionString`. The two ratchet tests were
  **updated, not deleted** — they previously asserted no replica field could exist, which existed to stop
  a half-built replica shipping; they now assert the seam's correct shape.

- [x] Runbooks and alerts are updated from actual drill findings.

  `RUNBOOKS.md` gained `## cell-recovery` written from what the drill actually found — both missed
  objectives with their real numbers, and the cold-compute failure below — plus `## database-cell-failure`
  and `## tenant-cost`, two anchors the alert registry already referenced but which did not exist.
  `cell-recovery` is registered in `alert-dispatch.mjs` (owner `platform-reliability`, severity
  `critical`) and its dry-run dispatch was exercised.

## The finding that blocked RTO, and how it cleared

**Cold bootstrap used to die with `CONNECTION_CLOSED` part-way through the chain**, at statement 109 of
4,456 in `0000_light_vance_astro` and at 1,471 of 1,867 in `0619_chain_creates_what_production_has`. That
is the documented Neon behaviour where a very large migration on a freshly-woken compute has its
connection dropped — `backend/CLAUDE.md` §3 warns that a ~2,000-operation monolith `ECONNRESET`s there.
While it held, a cell could not be rebuilt from cold and a disaster-recovery restore could not be
trusted at all.

`apply-chain-cold.mjs` now reconnects up to 8 times and tracks which statements already succeeded, and
S3 fixed the `0628` ordering defect the reconnect then exposed. The chain reaches head, so the restore
has something to restore into and RTO is a number rather than a blocker.

**What remains open here is not recovery time but recovery health.** The rebuilt cell comes back with
two tables lacking an RLS policy, so `unhealthy_after_recovery` is non-empty and the drill's own
`rto_met` stays false even though the elapsed time is comfortably inside target. That is deliberate: a
cell that returns quickly and cross-tenant-readable has not recovered.

## S7 evidence refresh

On 2026-08-29, the non-destructive recovery tooling self-test passed. The latest stored drill remains
the evidence for the live recovery exercise: integrity passed for 3 tables and 66 rows, RTO was 1,175
seconds, operational RPO was 21,600 seconds, and the recovered-cell health check reported the two RLS
findings recorded above. A fresh recovery drill was not run because it drops and rebuilds cell-2.

The regional PITR exercise and physical replica lag exercise remain operator-controlled. The reproducible
evidence collector is `backend/src/scripts/collect-s7-evidence.mjs` and its latest report is
`evidence/45-scale/S7-LIVE-DEV-EVIDENCE.md`.
