# 02 — The remaining tenant-growing sweeps are set-based

**What to build:** The other sweeps whose loops grow with tenant data adopt the same shape, starting with the six that issue more than three calls per iteration — including the payment-run loop at seven calls per row inside a transaction.

**Blocked by:** 01 — Leave accrual is set-based

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each converted sweep's outcome is identical to the per-row implementation on a spanning fixture.
- [ ] Each is idempotent on re-run.
- [ ] The 33 bounded loops are untouched, and the branch description says why.
- [ ] A per-tenant failure is logged and the sweep continues to the next organisation.

## Todo

- [ ] Work the six highest-call loops first
- [ ] Re-classify before converting — a loop over a grouping key is not a defect
- [ ] Keep per-organisation commits so a restart still resumes
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c14 — Background sweeps operate on sets, not on rows`](../prd.md) · Candidate index: [`../README.md`](../README.md)
