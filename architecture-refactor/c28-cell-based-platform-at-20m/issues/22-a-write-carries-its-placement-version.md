# 22 — Every write carries its placement version and dies without the fence

**What to build:** Placement is a lease, not a lookup. A write carries the placement version it was routed under, and the cell accepts it only while it holds the matching write fence. A router working from stale information fails a request; it cannot create two writable copies of one organization.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this is what makes ticket 28's relocation safe, and it has to exist before the relocation does. `withTenant` (`backend/src/common/tenant/with-tenant.ts`) is the single place a tenant transaction opens and where the regional connection is already chosen — deliberately, so a caller cannot forget — which makes it the one place the fence check belongs. Note the Neon constraint already recorded in this repo: the pooler drops startup parameters, so only `SET LOCAL` inside the transaction works for per-transaction settings.

## Acceptance criteria

- [ ] Every tenant write transaction carries the placement version it was routed under, set inside the transaction rather than as a connection parameter.
- [ ] The cell verifies it holds the matching write fence before the transaction commits; a mismatch aborts rather than warns.
- [ ] Losing the fence stops source writes before any target write begins — the ordering is the property, and it is what makes rollback possible in ticket 28.
- [ ] A stale router produces a clean, retryable failure with explicit retry information, never a partial write and never a silent success.
- [ ] The check is in `withTenant`, not at its callers; a fourth caller added later inherits it.
- [ ] A race test drives two concurrent writers under different placement versions and proves exactly one commits.

## Todo

- [ ] Measure the cost of the fence check on the write path before choosing where it reads from; a network round trip per write is not affordable and a cached fence needs an expiry shorter than the lease.
- [ ] Reads are not fenced — decide and record which reads, if any, are correctness-sensitive enough to need it, rather than fencing everything by reflex.
- [ ] `SET LOCAL` inside the transaction is the only mechanism that survives the Neon pooler; a `connection`-level option is silently dropped.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
