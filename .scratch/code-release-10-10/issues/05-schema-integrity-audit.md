# 05 — Audit primary keys, tenant uniqueness, foreign-key indexes and column semantics

**What to build:** A schema-wide audit covering primary-key strategy, tenant-scoped uniqueness, foreign-key indexes, named constraints, referential actions, check constraints, money units, timestamps and audit columns — with a verdict per finding rather than a list of observations.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every tenant-owned relationship uses the canonical composite organization-scoped key.
- [ ] Every foreign key has a supporting index; every constraint is explicitly named.
- [ ] Referential actions are correct per relationship. A composite `SET NULL` needs an explicit column list, and applying one blindly across composite foreign keys produces `23502` on any non-nullable member — filter on `attnotnull` first.
- [ ] Money is stored in integer minor units, never floating point.
- [ ] Timestamps and audit columns are consistent and timezone-correct.
- [ ] Findings are recorded with the concrete failure each one prevents, not as style preferences.
