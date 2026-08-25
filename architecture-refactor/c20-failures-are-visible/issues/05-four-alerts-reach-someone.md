# 05 — Four alerts reach someone

**What to build:** Four conditions page a human: outbox rows reaching a dead state, webhook signature failures, the tenant-context error rate, and p95 on the ten hottest endpoints. Not a dashboard suite — four alerts.

**Blocked by:** 03 — A request can be followed end to end; 04 — No failure is swallowed

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each alert has a threshold and a named recipient — an alert nobody receives is not coverage.
- [ ] Given a dead outbox row, a signature failure and a burst of tenant-context errors, each predicate evaluates true.
- [ ] p95 is available for the ten hottest endpoints, so a regression is detectable.
- [ ] A noisy alert is tuned or removed rather than tolerated.
- [ ] Full APM, tracing, a metrics database and log analytics are explicitly deferred and recorded as such.

## Todo

- [ ] Test the predicates, not the delivery
- [ ] Use the existing health surface for p95; do not add a metrics stack
- [ ] Record the deferral so it is not re-raised as an omission
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
