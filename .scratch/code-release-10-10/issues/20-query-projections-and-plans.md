# 20 — Prove explicit projections, correct indexes and no required full scans

**What to build:** Every read uses a named-column projection served by a tenant-leading index with no required full tenant or table scan and no avoidable sort. The named heavy queries — reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard — are exercised against seeded data rather than reasoned about.

**Blocked by:** 03 — plans taken against an empty or partially bootstrapped database measure nothing.

**Status:** ready-for-agent

- [ ] Every list, count and existence path selects named columns and returns a minimal projection; no full ORM row, global user record or large JSON/blob/vector field is hydrated for these paths.
- [ ] The named heavy queries run against a production-shaped seed with plans captured.
- [ ] Plans are taken as the application role with tenant context set, never as the database owner, so real authorization predicates are included.
- [ ] Seed first, then measure. A baseline taken on an empty database is not a baseline.
- [ ] Run `VACUUM ANALYZE` after any table rewrite before trusting a count or a plan.
- [ ] Row-level security defeats GIN and trigram indexes and post-filters ANN search; where that changes the plan, it is recorded as a constraint rather than treated as a defect.
- [ ] An `OR` with a semi-join, and a partial index facing an `OR` with an outside branch, are both measured rather than assumed — the rewrite is not always faster, and buffer counts decide it.
