# 33: Cell isolation, replicas and recovery

**What to build:** Production cells, credentials, replicas, backups, PITR, relocation, and recovery are isolated and proven through drills.

**Blocked by:** 31 — One-commit code-release verification

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C168** — Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.
- [ ] **PRD-C169** — Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
- [ ] **PRD-C170** — Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).
- [ ] **PRD-C171** — Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
- [ ] **PRD-C179** — Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
