# 02: Schema and executable-key minimization

**What to build:** Unused schema fields and executable keys are removed only after cross-layer reachability and dependency proof, leaving one canonical tenant-safe representation.

**Blocked by:** 01 — PRD traceability manifest

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C001** — **Schema/contracts:** complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity evidence.
- [ ] **PRD-C050** — Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- [ ] **PRD-C051** — Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- [ ] **PRD-C052** — Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
- [ ] **PRD-C057** — Inventory and classify in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys plus executable code registries for routes, permissions, modules, events, commands, query/cache keys, configuration, environment variables, feature flags and translations. Every entry is KEEP, REFACTOR or REMOVE with its owner and concrete failure prevented.
- [ ] **PRD-C058** — Remove unused database columns and JSONB properties only after proving zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts. Frequently filtered, joined, authorized or constrained JSONB properties must be normalized or indexed rather than silently retained as opaque payload.
- [ ] **PRD-C059** — Detect redundant or overlapping foreign keys, unique constraints, checks and indexes using schema declarations, `pg_catalog`, representative `EXPLAIN (ANALYZE, BUFFERS)` plans and workload/index statistics. Statistics alone never justify deletion; preserve every constraint/index required for tenant isolation, referential integrity, concurrency, ordering or a documented access pattern.
- [ ] **PRD-C060** — Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column foreign key only after all callers and migrations target the composite relationship and clean-bootstrap/catalog parity passes.
- [ ] **PRD-C061** — Remove dead or duplicate code keys and aliases from permission catalogs, route/operation registries, module manifests, event/command catalogs, TanStack factories, cache namespaces, configuration schemas, feature flags and translation catalogs only after static and runtime registration/caller proof. Unknown dynamic string keys are rejected at their seam rather than preserved indefinitely.
- [ ] **PRD-C062** — Keep one typed, domain-owned factory/catalog for each surviving key family; prohibit ad-hoc string literals, parallel aliases and generic global dumping grounds. Tenant, subject, scope, filters, sort, cursor, version and permission dimensions remain in query/cache keys wherever correctness requires them.
- [ ] **PRD-C063** — Remove unused request/response/DTO/Zod fields and object properties across backend, OpenAPI, frontend hooks/forms and persisted events as one contract change. Never remove server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions, audit fields or compatibility fields with a published consumer without an explicit migration/deprecation path.
- [ ] **PRD-C064** — After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI/contract compatibility, cache invalidation and focused behavior tests. Final acceptance is zero unclassified unnecessary keys and no orphaned schema/code reference.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
