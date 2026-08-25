# 03 — A sweep reports what it did

**What to build:** An operator can see how long each sweep took per organisation and what failed, so growth is visible before it becomes an incident and a failure names the tenant and record rather than disappearing.

**Blocked by:** 02 — The remaining tenant-growing sweeps are set-based

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Duration is recorded per sweep per organisation.
- [ ] A failure names the tenant and the record.
- [ ] An error logs its underlying cause, not only its surface message — a driver failure inside a query template says nothing useful on its own.
- [ ] One tenant's failure does not abort the run.
- [ ] Sweeps whose queries grow are covered by read budgets.

## Todo

- [ ] Emit through the structured logger once c20-03 lands
- [ ] Assert the cause is logged, not just an error
- [ ] Add budget entries for the growing queries
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c14 — Background sweeps operate on sets, not on rows`](../prd.md) · Candidate index: [`../README.md`](../README.md)
