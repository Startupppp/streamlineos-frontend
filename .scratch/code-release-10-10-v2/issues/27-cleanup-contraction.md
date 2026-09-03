# 27: Cleanup contraction and dependency proof

**What to build:** Compatibility seams, cycles, unused dependencies, exports, scripts, and files are removed only after all runtime and build-time consumers are disproven.

**Blocked by:** 26 — Dead-code and dependency-cycle contraction

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C012** — **Repository hygiene/types:** complete the v2 tickets 24–27 expand–migrate–contract sequence for unused symbols, dead surface, unsafe assertions, dependency cycles and dependency proof.
- [ ] **PRD-C022** — Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
- [ ] **PRD-C027** — Remove unreachable branches, obsolete compatibility shims, commented-out implementation, debug logging, stale TODO scaffolding and constants that duplicate an authoritative enum/config/schema. Retain a compatibility path only with a named consumer, removal date and contract test.
- [ ] **PRD-C029** — Remove unused runtime and development dependencies, package scripts, environment variables, configuration keys, feature flags and asset references; update lockfiles, deployment manifests, validation schemas and documentation in the same change.
- [ ] **PRD-C032** — Replace duplicated or weakly owned constants with the canonical domain-owned schema/catalog only when at least two real callers share the invariant; do not create generic dumping-ground helpers or speculative seams. Apply the deletion test to pass-through wrappers and retain modules that provide real depth, policy or adaptation.
- [ ] **PRD-C033** — Reduce public interfaces and barrel surfaces to verified consumers. Internal implementation details stay private to their module; deep imports across module ownership are removed or replaced by the smallest stable interface at the correct seam.
- [ ] **PRD-C034** — Prove every deletion with import/dependency graph results plus checks for Nest metadata/DI, Next.js file conventions and dynamic imports, raw SQL/table names, migrations, reflection, queues/events, cron registration, package scripts and side-effect imports. Text search or a successful editor rename alone is insufficient evidence.
- [ ] **PRD-C035** — After each cleanup batch, run focused behavior tests and the affected package typecheck/build; at final integration run both dead-code gates and their self-tests so a broken or under-scanning analyzer cannot report a false green result.
- [ ] **PRD-C036** — Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions. Final acceptance is zero unclassified findings, zero unexplained suppressions and no increase in an approved framework/generated exception baseline.
- [ ] **PRD-C037** — Confirm the cleanup does not remove authorization, validation, cache invalidation, outbox/worker registration, observability, accessibility, SEO metadata or error/offline states merely because those paths are uncommon in local development.
- [ ] **PRD-C109** — Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- [ ] **PRD-C110** — Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
