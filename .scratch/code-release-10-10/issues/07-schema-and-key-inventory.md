# 07 — Inventory and classify every schema object and code key registry

**What to build:** A complete classification pass over in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys, plus the executable registries for routes, permissions, modules, events, commands, query/cache keys, configuration, environment variables, feature flags and translations. Every entry is KEEP, REFACTOR or REMOVE with a named owner and the concrete failure it prevents. This ticket produces the verdicts; ticket 08 executes them.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every inventoried entry carries a verdict, an owner and a stated failure prevented. "May be useful later" is not a KEEP justification.
- [ ] Redundant or overlapping foreign keys, unique constraints, checks and indexes are detected from schema declarations, `pg_catalog` and representative `EXPLAIN (ANALYZE, BUFFERS)` plans — statistics alone never justify deletion.
- [ ] Nothing required for tenant isolation, referential integrity, concurrency, ordering or a documented access pattern is proposed for removal.
- [ ] Frequently filtered, joined, authorized or constrained JSONB properties are marked for normalization or indexing rather than retained as opaque payload.
- [ ] Empty tables are not treated as dead: a table with zero rows is usually an unseeded feature. Verify against live service references before classifying.
- [ ] A reference scan that reports everything unreferenced is a broken scan, not a finding — validate the scanner against a known-referenced table before trusting its output.
