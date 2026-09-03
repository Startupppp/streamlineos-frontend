# 05: Authentication, Organization, RBAC and Settings

**What to build:** Organization membership, module access, owner protection, settings, caching, API behavior, and frontend visibility enforce the same tenant-safe authority model.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C004** — **Organization/RBAC/Settings:** complete v2 ticket 05's organization authority, module permission, owner/descendant protection, cache invalidation, contract and frontend criteria.
- [ ] **PRD-C081** — Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.
- [ ] **PRD-C111** — Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
- [ ] **PRD-C112** — Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.
- [ ] **PRD-C113** — Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- [ ] **PRD-C114** — Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.
- [ ] **PRD-C116** — Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
- [ ] **PRD-C117** — Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
