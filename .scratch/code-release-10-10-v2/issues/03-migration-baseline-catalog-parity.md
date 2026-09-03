# 03: Migration baseline and catalog parity

**What to build:** A clean and interrupted database bootstrap reaches the same canonical catalog with reproducible migration evidence.

**Blocked by:** 02 — Schema and executable-key minimization

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C001** — **Schema/contracts:** complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity evidence.
- [ ] **PRD-C053** — Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and current-catalog parity. Upgraded-catalog compatibility is required only if migration decision 9 changes, because this release explicitly authorizes database recreation.
- [ ] **PRD-C054** — Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- [ ] **PRD-C055** — Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap at the same release commit: tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state must match exactly.
- [ ] **PRD-C056** — Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes for the current-head bootstrap and migration evidence.
- [ ] **PRD-C060** — Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column foreign key only after all callers and migrations target the composite relationship and clean-bootstrap/catalog parity passes.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
