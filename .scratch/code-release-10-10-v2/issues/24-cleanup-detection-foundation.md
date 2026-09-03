# 24: Repository-cleanup detection foundation

**What to build:** Bite-proven inventories identify dead code, unused symbols, unsafe typing, dependency cycles, oversized files, and unreachable registrations without false greens.

**Blocked by:** 01 — PRD traceability manifest

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C022** — Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
- [ ] **PRD-C035** — After each cleanup batch, run focused behavior tests and the affected package typecheck/build; at final integration run both dead-code gates and their self-tests so a broken or under-scanning analyzer cannot report a false green result.
- [ ] **PRD-C037** — Confirm the cleanup does not remove authorization, validation, cache invalidation, outbox/worker registration, observability, accessibility, SEO metadata or error/offline states merely because those paths are uncommon in local development.
- [ ] **PRD-C105** — Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- [ ] **PRD-C106** — Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- [ ] **PRD-C107** — Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
- [ ] **PRD-C108** — Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
- [ ] **PRD-C109** — Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- [ ] **PRD-C110** — Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

