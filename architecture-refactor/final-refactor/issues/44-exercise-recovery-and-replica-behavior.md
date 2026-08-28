# 44: Exercise recovery and read-replica behavior

**What to build:** Operators can restore a cell within approved RPO/RTO and every replica-served workload has declared, tested consistency behavior.

**Blocked by:** 43 — Provision independently isolated cell resources.

**Status:** ready-for-agent

- [ ] Backup/restore drill records measured RPO, RTO and integrity verification.
- [ ] Placement/control-plane behavior during recovery fails safely and recovers cleanly.
- [ ] Replica-tolerant reads are enumerated and tested under lag; critical/read-after-write paths remain primary.
- [ ] Runbooks and alerts are updated from actual drill findings.
