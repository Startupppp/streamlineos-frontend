# 03 — Tenant relationships, indexes and RLS verified against a fully bootstrapped target

**What to build:** Tenant-relationship verification last ran against the older fully-bootstrapped database; the current attempt was taken against a target observed mid-bootstrap and is not release evidence. Re-run relationship, index and RLS verification against a target that has completed the full chain, so each tenant relationship is proven to have one canonical composite organization-scoped key with a supporting index and a policy.

**Blocked by:** 02 — a partially bootstrapped target produces findings that are artifacts of the missing tail, not real.

**Status:** ready-for-agent

- [ ] Tenant-relationship verification reports zero actionable findings against a fully bootstrapped current-head target.
- [ ] Tenant-index coverage is complete, with every declared tenant relationship backed by an index.
- [ ] Every tenant-scoped table has an RLS policy. A table carrying `org_id` that grants the application role DML with no policy is readable org-wide, and that exposure is invisible until the migration is applied.
- [ ] Zero Drizzle-declared columns are absent from the live catalog — `db.select()` renders every declared column, so one missing column turns every full-table read into a `42703`.
- [ ] Benchmark and verify as the application role with tenant context set, never as the database owner; without the GUC the queries fail `42501` rather than returning rows.
- [ ] `db:generate` still fails closed while snapshots are stale.
