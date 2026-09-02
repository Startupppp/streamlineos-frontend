# 14 — Cross-tenant negative tests for RBAC role seeding and Support KB engagement

**What to build:** Two services carry no cross-tenant negative test: RBAC role seeding and Support KB engagement. Confirmed missing on disk — no matching spec file exists for either. They are the last two gaps in the isolation declaration coverage, and the static declaration gate cannot substitute for an executable proof.

**Blocked by:** None — can start immediately.

**Status:** done except one box — blocked outside this territory (re-verified S5)

- [x] Each service gains an executable cross-tenant negative test proving an actor from organization A cannot read or mutate organization B's rows, and that a cross-tenant miss returns 404 rather than 403.
  - Evidence: `nice -n 10 npx jest src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts --maxWorkers=2` → **21 passed, 21 total, 2 suites**. New files: `src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts` (13 tests), `src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts` (8 tests).
- [ ] Static declaration coverage reaches complete, and the executable isolation suite passes.
  - Re-verified S5. BOTH halves are now red, and neither cause is in this ticket's territory.
  - Static half: `pnpm -s check:tenant-isolation` -> **924 / 925 (100% rounded), exit 1**, one `MISSING`.
    `pnpm -s check:tenant-isolation:self-test` -> all 7 checks pass, exit 0, so the gate itself is sound.
  - BLOCKED (static): the sole remaining gap has MOVED. It is no longer `modules/calendar` — that one is
    now covered. It is `src/modules/rbac/role-grant-reconciler.service.ts`, a service introduced by
    commit `b43cbba5` *after* this ticket's first pass measured the gate. `RoleGrantReconcilerService`
    has **no spec of any kind** anywhere in the repo (grep: only `rbac.module.ts`,
    `permission-catalog-sync.service.ts` and `src/scripts/seed-permissions.ts` name it). It sits in
    ticket 19's territory (`src/modules/rbac/**` minus `role-seed.service.ts`). Needs routing to 19.
    Declaring it from this ticket's spec without proving it would be exactly the vacuity the gate warns about.
  - Executable half: `pnpm -s check:tenant-isolation:run` -> **2 suites failed / 446, 4 tests failed / 1812,
    exit 1**. Both failures are other lanes' regressions:
    - `src/modules/cron/cron-group-a-tenant-isolation.spec.ts` — `Nest can't resolve dependencies of
      CronHrEnginesService … argument "REDIS" at index [1]`. The service gained a REDIS constructor
      dependency; the spec's TestingModule never provided it. Territory: cron / HR.
    - `src/modules/kb/retrieval/kb-acl-isolation.spec.ts` — `TypeError: this.indexing.bumpSpaceAclRevision
      is not a function` at `kb-members.service.ts:157`. The service gained a call the spec's double
      does not stub. Territory: KB.
  - This ticket's own two suites are green inside that run: 21 passed / 21, 2 suites, exit 0.
- [x] Each test is proven to bite: neuter the tenant predicate in a double and confirm the test goes red. A defence-in-depth guard with zero load-bearing paths makes the delete-it proof lie.
  - Evidence (S5, non-vacuity): the two `for … of store.get(…)` loops in the RBAC spec asserted nothing if
    the array were empty. They now assert `grants.length > 0` and `access_versions` has exactly 1 row first.
    Proven to bite by a one-off mutation of the spec's own harness (grant writes swallowed): **2 failed / 8**,
    red at the two new lines; file restored byte-identical (sha256 `5e754bd7…f6e9` before and after).
  - Evidence (double side, permanent and in-suite): 6 `BITE —` tests run the same probes against a double whose predicate evaluator drops every `org_id` conjunct, and assert the leak concretely (org A's attachment file name, org A's comment body, org A's deleted row, org A's role row, org B's ORG_ADMIN membership authorizing in org A).
  - Evidence (service side, one-off): the `org_id` predicates were stripped from both service files, the specs re-run, and the files restored byte-identical (sha256 verified). Result: **8 failed, 13 passed, 21 total**. Red list: `seeds org A's own starter roles…`, `returns org A's own role, never org B's row…`, `getAttachmentDownloadUrl denies org B…`, `listComments / listFeedback / listAttachments deny org B…`, `deleteComment denies org B…`, `deleteAttachment denies org B…`, `createComment denies org B…`, `createAttachment denies org B…`.
- [x] Probe with a non-owner actor. Organization-owner bypass masks the 403 that a normal member would receive, so an owner-only probe proves nothing.
  - Evidence: both actors are `isOrgOwner: false` with `humanSessionPrincipal(id, false)`; each suite opens with a test asserting `principalIsOrgOwner(actor.principal) === false`. The RBAC 403 case resolves standing from the `organization_members` row, not from `isOrgOwner`, so the owner short-circuit in `isStructuralOrgAdmin` is never taken.
- [x] Any `db.transaction` mock invokes its callback — a bare mock silently voids every assertion inside the transaction.
  - Evidence: `role-seed-tenant-isolation.spec.ts` uses the REAL `runInTenantTransaction` / `withTenant`; its `db.transaction` double invokes the callback and counts the invocations. Two tests assert `transactionCallbackRuns()` > 0, and the rows written inside the transaction are asserted from the store afterwards (6 seeded roles, grants all carrying org A).
- [x] The actor used is constructed through the canonical helper so it carries a membership id; a hand-built actor missing it fails in ways that look like a domain bug.
  - Evidence: actors are built with `humanSessionPrincipal(membershipId, isOrgOwner)` from `src/common/auth/principal.ts` (the same constructor `jwt-auth.guard.ts` uses); each suite asserts `actingMembershipId(actor.principal)` returns the seeded id (42 for RBAC, 77 for Support).
