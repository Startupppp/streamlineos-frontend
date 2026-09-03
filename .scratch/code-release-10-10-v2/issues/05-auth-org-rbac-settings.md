# 05: Authentication, Organization, RBAC and Settings

**What to build:** Organization membership, module access, owner protection, settings, caching, API behavior, and frontend visibility enforce the same tenant-safe authority model.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts

**Status:** audited — 3 closed / 5 partial. Report: `reports/05-auth-org-rbac-settings.md`

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C004** — **Organization/RBAC/Settings:** complete v2 ticket 05's organization authority, module permission, owner/descendant protection, cache invalidation, contract and frontend criteria.
  PARTIAL: rolls up the seven below — closed once C112 is exercised and D1 (membership-FK drift) is fixed by the schema owner.
- [x] **PRD-C081** — Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.
  Measured as non-owner `streamline_app` (`rolbypassrls=f`): 824 RLS tables with `org_id` swept, **0 leaks**, 70 tables returned own-org rows (anti-vacuity), 0 tenant tables without RLS, fail-closed `42501` with no GUC, inverse direction clean. Static audit of all 199 territory files: 145 id-keyed loads, 29 without an in-window org predicate, **0 real defects** after triage. NOT COVERED: no booted-API HTTP test — 404-vs-403 rests on reading every load site, not on observed status codes.
- [x] **PRD-C111** — Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
  Resolution reads capped (`.limit(500)` ×5, `.limit(100)` ×1); every RBAC table carries an `org_id`-leading composite; invalidation proven by `access-resolution-cost.spec.ts` re-reading the version after a bump. `check:cache-invalidation` EXIT 0 (1076 service files, 475 invalidate sites) — but its verdict rests on 13 hardcoded checks, not a general rule.
- [ ] **PRD-C112** — Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.
  BLOCKED: not run. No E2E suite executed and `lib/query-scope-isolation.test.tsx` not run. Blocked on infrastructure (needs a booted app + Playwright), not on another territory.
- [ ] **PRD-C113** — Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
  PARTIAL: Zod — scanned 131 `z.object(` across 25 files, found 5 real gaps, **fixed 4** (1 deliberately left lenient: an outbox payload needing additive forward-compat). Owner/descendant — `verify:rbac-integrity` EXIT 0, 19 probes / 9 constraints, every rejection paired with an ACCEPT control. Idempotency — **4 of 13 grant/standing POSTs lack `@Idempotent`** (`module-access.controller.ts:102,115,239,283`); all four are upserts against real unique indexes so retries converge, but adding the decorator 400s the route without an `Idempotency-Key` header and needs a paired frontend change — a product decision, not a unilateral backend fix.
- [x] **PRD-C114** — Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.
  `access-resolution-cost.spec.ts` pins pooled-connection budgets **as a non-owner**: 2 cold / 0 warm / 1 steady-state / 2 without shared cache. Scope expansion bounded by explicit `.limit()` at all 6 resolver reads. `apply-scope.ts` no longer carries the correlated `org_unit_members` subquery. All 12 access-path tables carry tenant-leading composites (table in the report). 11 suites / 104 tests, EXIT 0.
- [ ] **PRD-C116** — Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
  PARTIAL: the ownership clause is **clean** — 23 global `/settings/*` routes, **0** module-owned surfaces and **0** operational work; 62 module `/<module>/settings/*` routes hold every custom-fields/automations/integrations/import-export surface; all 4 forbidden billing routes unreachable. BLOCKED on ticket 07 for the adjacent "no legacy redirects" clause: `hr/settings/company/page.tsx:6` and `hr/onboarding/my-tasks/page.tsx:4` are pure redirect pages that should have been deleted. One borderline needing a product ruling: `/settings/webhooks`.
- [ ] **PRD-C117** — Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.
  PARTIAL: tenant-leading indexes verified against `pg_indexes` on all 12 access-path tables. BLOCKED on the schema owner: `verify:membership-revocation` EXIT **1** — 248 PASS / **33 FAIL** / **68 SKIP**; 68 declared membership FKs do not exist in the database and 33 carry the wrong `ON DELETE`, so revocation leaves dangling `*_membership_id` values. In this territory: `org_unit_members` declared `set-null`, actual `cascade`. Fix needs `src/db/schema/**` + `migrations/**`, both DO-NOT-EDIT here.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
