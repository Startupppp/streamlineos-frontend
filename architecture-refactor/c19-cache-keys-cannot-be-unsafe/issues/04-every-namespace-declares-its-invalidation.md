# 04 — Every namespace declares its invalidation

**What to build:** For every cached read it is written down which writes invalidate it, or that it is deliberately time-based. Staleness becomes a decision rather than an omission nobody noticed.

**Blocked by:** 02 — A cache key cannot omit its tenant

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each namespace has either a list of invalidating writes or an express statement that it is TTL-only.
- [ ] Finance reports invalidate on invoice, bill, transfer and payment writes.
- [ ] Aggregate dashboards may remain TTL-only where the matrix records that choice.
- [ ] The 216 call sites are migrated to the tenant-aware wrappers.
- [ ] A new cached read without a matrix entry is caught in review.

## Todo

- [ ] Write the matrix before changing code
- [ ] Migrate module by module
- [ ] Read-after-write test per event-invalidated entry
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
