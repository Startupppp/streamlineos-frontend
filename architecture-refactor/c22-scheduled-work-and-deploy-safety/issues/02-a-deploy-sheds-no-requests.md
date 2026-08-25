# 02 — A deploy sheds no requests

**What to build:** Releasing does not produce a burst of errors. Today the pool drains immediately on the shutdown signal while the readiness endpoint keeps reporting healthy, so the load balancer keeps routing traffic into a closing pool.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] On the shutdown signal, readiness reports unhealthy *before* the drain begins — the ordering is the assertion.
- [ ] A settling delay allows the load balancer to observe the change.
- [ ] In-flight requests complete during the drain.
- [ ] A request arriving after the readiness flip is not accepted.
- [ ] Liveness does not fail during shutdown, or the orchestrator kills the process mid-drain.
- [ ] The existing drain timeout is preserved.

## Todo

- [ ] Flip readiness on the pre-shutdown hook, then drain
- [ ] Keep liveness and readiness distinct
- [ ] Assert the ordering, not merely that both states exist
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
