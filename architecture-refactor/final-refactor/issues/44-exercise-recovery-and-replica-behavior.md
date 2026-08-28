# 44: Exercise recovery and read-replica behavior

**What to build:** Operators can restore a cell within approved RPO/RTO and every replica-served workload has declared, tested consistency behavior.

**Blocked by:** 43 — Provision independently isolated cell resources.

**Status:** partial — the drill ran and **both objectives missed**; that is the finding, not a failure to
measure

- [ ] Backup/restore drill records measured RPO, RTO and integrity verification.

  **The drill ran end to end and produced numbers that miss their targets. Recorded as measured, not
  softened.** `pnpm cell:drill` (`src/scripts/run-recovery-drill.mjs`, self-test passing) times each
  phase and writes `.recovery-drill-results.json`.

  | Metric | Measured | Target | Failure class | Met |
  |---|---:|---:|---|---|
  | RPO | **47,468 s** (~13 h) | ≤ 300 s | `CELL_DB_FAILURE` | **No** |
  | RTO | **unmeasurable** | ≤ 3,600 s | `CELL_DB_FAILURE` | **No** |
  | RPO | unverified | ≤ 300 s | `REGIONAL_DISASTER` | **No** |

  **Why RPO is 13 hours:** there is no backup schedule at all. `cell:backup` is a manual logical dump,
  so RPO is simply the age of the last time somebody ran it (`2026-08-28T05:57:47Z`). Meeting 300 s
  requires scheduled backups at ≤ 5-minute intervals, which a logical dump cannot sustain — this points
  at Neon PITR, which needs a `NEON_API_KEY` and a scripted branch-restore that does not exist.

  **Why RTO could not be measured:** the restore cannot start because the cold bootstrap it depends on
  does not complete — see the finding below. This is a genuine operational blocker, not a gap in the
  drill.

- [x] Placement/control-plane behavior during recovery fails safely and recovers cleanly.

  Exercised during the real cell-2 outage window rather than only in unit tests. The control plane
  (`neondb`) was never touched while cell-2 was dropped; placement lookups stayed available, and the
  11 tests in `placement-degraded-control-plane.spec.ts` remained green throughout. The ordering
  invariant holds: signed-cache TTL 10 min < fence lease 24 h, so a cached placement cannot outlive the
  write fence it implies. An unknown organization is refused 503-retryable and **not** cached, so an
  outage cannot be mistaken for a deletion.

- [ ] Replica-tolerant reads are enumerated and tested under lag; critical/read-after-write paths remain primary.

  **Seam built and tested; no physical replica exists, and that is stated rather than implied.**
  `src/db/replica-router.ts` adds `ReadStrategy` (`primary-required` | `replica-safe`),
  `routingStrategyFor(workClass)` and `ReplicaRouter`. Only `analytics-refresh` and `search-freshness`
  route replica-safe; RBAC resolution, permission-cache misses and financial-ledger reads are
  primary-required. A faulted replica raises `ReplicaShedError` and **does not fall back to primary** —
  falling back would let stale projections compete for primary capacity, which is the failure the
  degradation matrix is trying to prevent.

  `pool.config.ts` gained `DB_REPLICA_URL` and `replicaConnectionString`. The two ratchet tests in
  `read-replica.spec.ts` were **updated, not deleted** — they previously asserted no replica field could
  exist, which existed to stop a half-built replica shipping; they now assert the seam's correct shape.
  The `it.skip` that named the three missing pieces is converted into 8 passing tests. 18 pass, 1 skip
  remains and names its blocker: Neon read-replica provisioning.

- [x] Runbooks and alerts are updated from actual drill findings.

  `RUNBOOKS.md` gained `## cell-recovery` written from what the drill actually found — both missed
  objectives with their real numbers, and the cold-compute failure below — plus `## database-cell-failure`
  and `## tenant-cost`, two anchors the alert registry already referenced but which did not exist.
  `cell-recovery` is registered in `alert-dispatch.mjs` (owner `platform-reliability`, severity
  `critical`) and its dry-run dispatch was exercised.

## The finding that blocked RTO

**Cold bootstrap dies with `CONNECTION_CLOSED` part-way through the chain.** Two runs, two different
places: `0000_light_vance_astro` at statement 109 of 4,456, and `0619_chain_creates_what_production_has`
at statement 1,471 of 1,867 after 739 seconds of successful work. This is the documented Neon behaviour
where a very large migration on a freshly-woken compute has its connection dropped —
`backend/CLAUDE.md` §3 already warns that a ~2,000-operation monolith `ECONNRESET`s on Neon.

It has a consequence beyond this ticket: **a cell cannot currently be rebuilt from cold, so a
disaster-recovery restore cannot be trusted.** `apply-chain-cold.mjs` now reconnects up to 8 times, which
is a mitigation rather than a fix; the real fix is splitting the two monolithic migrations, which is
ticket 42's territory.
