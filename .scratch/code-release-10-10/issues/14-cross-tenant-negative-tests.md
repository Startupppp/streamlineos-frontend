# 14 — Cross-tenant negative tests for RBAC role seeding and Support KB engagement

**What to build:** Two services carry no cross-tenant negative test: RBAC role seeding and Support KB engagement. Confirmed missing on disk — no matching spec file exists for either. They are the last two gaps in the isolation declaration coverage, and the static declaration gate cannot substitute for an executable proof.

**Blocked by:** None — can start immediately.

**Status:** done (one box carried, see below)

- [x] Each service gains an executable cross-tenant negative test proving an actor from organization A cannot read or mutate organization B's rows, and that a cross-tenant miss returns 404 rather than 403.
  - Evidence: `nice -n 10 npx jest src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts --maxWorkers=2` → **21 passed, 21 total, 2 suites**. New files: `src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts` (13 tests), `src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts` (8 tests).
- [ ] Static declaration coverage reaches complete, and the executable isolation suite passes.
  - Executable half PASSES: `nice -n 10 node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --testPathPattern="tenant-isolation|isolation.spec" --maxWorkers=2` → **445 suites passed / 445, 1801 tests passed / 1801, exit 0**.
  - Static half is NOT complete: `pnpm -s check:tenant-isolation` → **923 / 924 (100% rounded), exit 1**, with one remaining `MISSING`.
  - BLOCKED: the single remaining gap is `src/modules/calendar/calendar-provider-webhook.service.ts`, which is outside session S4's declared territory (this ticket names only `rbac/role-seed.service.ts` and `support/core/support-kb-engagement.service.ts`). A spec already exists at `src/modules/calendar/calendar-provider-webhook.service.spec.ts`; it simply carries no isolation-pattern keyword or cross-tenant case. Needs reassignment to whoever owns `modules/calendar`.
- [x] Each test is proven to bite: neuter the tenant predicate in a double and confirm the test goes red. A defence-in-depth guard with zero load-bearing paths makes the delete-it proof lie.
  - Evidence (double side, permanent and in-suite): 6 `BITE —` tests run the same probes against a double whose predicate evaluator drops every `org_id` conjunct, and assert the leak concretely (org A's attachment file name, org A's comment body, org A's deleted row, org A's role row, org B's ORG_ADMIN membership authorizing in org A).
  - Evidence (service side, one-off): the `org_id` predicates were stripped from both service files, the specs re-run, and the files restored byte-identical (sha256 verified). Result: **8 failed, 13 passed, 21 total**. Red list: `seeds org A's own starter roles…`, `returns org A's own role, never org B's row…`, `getAttachmentDownloadUrl denies org B…`, `listComments / listFeedback / listAttachments deny org B…`, `deleteComment denies org B…`, `deleteAttachment denies org B…`, `createComment denies org B…`, `createAttachment denies org B…`.
- [x] Probe with a non-owner actor. Organization-owner bypass masks the 403 that a normal member would receive, so an owner-only probe proves nothing.
  - Evidence: both actors are `isOrgOwner: false` with `humanSessionPrincipal(id, false)`; each suite opens with a test asserting `principalIsOrgOwner(actor.principal) === false`. The RBAC 403 case resolves standing from the `organization_members` row, not from `isOrgOwner`, so the owner short-circuit in `isStructuralOrgAdmin` is never taken.
- [x] Any `db.transaction` mock invokes its callback — a bare mock silently voids every assertion inside the transaction.
  - Evidence: `role-seed-tenant-isolation.spec.ts` uses the REAL `runInTenantTransaction` / `withTenant`; its `db.transaction` double invokes the callback and counts the invocations. Two tests assert `transactionCallbackRuns()` > 0, and the rows written inside the transaction are asserted from the store afterwards (6 seeded roles, grants all carrying org A).
- [x] The actor used is constructed through the canonical helper so it carries a membership id; a hand-built actor missing it fails in ways that look like a domain bug.
  - Evidence: actors are built with `humanSessionPrincipal(membershipId, isOrgOwner)` from `src/common/auth/principal.ts` (the same constructor `jwt-auth.guard.ts` uses); each suite asserts `actingMembershipId(actor.principal)` returns the seeded id (42 for RBAC, 77 for Support).
