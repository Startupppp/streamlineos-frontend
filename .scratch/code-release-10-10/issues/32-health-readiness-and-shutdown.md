# 32 — Liveness, dependency-aware readiness, graceful shutdown and lease handoff

**What to build:** Health interfaces that tell the truth under partial failure, and a shutdown path that finishes or hands off in-flight work rather than dropping it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Liveness is shallow; readiness is dependency-aware and reports an explicit degraded or unready state when the database, cache, queue or a required provider fails.
- [ ] A health probe must not amplify the outage it is reporting — readiness checks are bounded and cached, not a fresh fanout per probe.
- [ ] Graceful shutdown drains connections and stops accepting new work before exiting.
- [ ] Worker leases hand off or expire safely so an interrupted batch is resumed rather than lost or duplicated.
- [ ] Background sweeps iterate tenant context explicitly and expose retry, DLQ and cancellation states.
- [ ] Deployed probe and alert-delivery evidence stays classified as deferred; this ticket delivers the code-level interfaces only.
