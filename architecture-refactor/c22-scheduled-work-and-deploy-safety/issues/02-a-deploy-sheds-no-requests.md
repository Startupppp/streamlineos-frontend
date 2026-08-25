# 02 — A deploy sheds no requests

**What to build:** Releasing does not produce a burst of errors. Today the pool drains immediately on the shutdown signal while the readiness endpoint keeps reporting healthy, so the load balancer keeps routing traffic into a closing pool.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [x] On the shutdown signal, readiness reports unhealthy *before* the drain begins — the ordering is the assertion.
- [x] A settling delay allows the load balancer to observe the change.
- [x] In-flight requests complete during the drain.
- [x] A request arriving after the readiness flip is not accepted.
- [x] Liveness does not fail during shutdown, or the orchestrator kills the process mid-drain.
- [x] The existing drain timeout is preserved.

## Todo

- [x] Flip readiness on the pre-shutdown hook, then drain
- [x] Keep liveness and readiness distinct
- [x] Assert the ordering, not merely that both states exist
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
