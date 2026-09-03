# 14 — Cross-tenant negative tests for RBAC role seeding and Support KB engagement

**What to build:** Two services carry no cross-tenant negative test: RBAC role seeding and Support KB engagement. Confirmed missing on disk — no matching spec file exists for either. They are the last two gaps in the isolation declaration coverage, and the static declaration gate cannot substitute for an executable proof.

**Blocked by:** None — can start immediately.

**Status:** done — all 6 boxes closed (S6: both halves of the gate now green)

- [x] Each service gains an executable cross-tenant negative test proving an actor from organization A cannot read or mutate organization B's rows, and that a cross-tenant miss returns 404 rather than 403.
  - Evidence: `nice -n 10 npx jest src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts --maxWorkers=2` → **21 passed, 21 total, 2 suites**. New files: `src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts` (13 tests), `src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts` (8 tests).
- [x] Static declaration coverage reaches complete, and the executable isolation suite passes.
  - **S6 — BOTH HALVES ARE NOW GREEN. Measured, not inferred.**
    - Static: `pnpm -s check:tenant-isolation` -> **exit 0, 928 / 928 (100%)**, zero MISSING.
    - Executable: `pnpm -s check:tenant-isolation:run` -> **exit 0, 450 suites passed / 450,
      1847 tests passed / 1847**. The two S5 failures (`cron-group-a-tenant-isolation.spec.ts`
      REDIS injection, `kb-acl-isolation.spec.ts` `bumpSpaceAclRevision`) were fixed by their
      own lanes and no longer fail.
    - The static gap had MOVED AGAIN, and this time it was inside reach. It is no longer
      `role-grant-reconciler.service.ts` (ticket 19 covered it); it was
      `src/modules/organization/setup/org-setup-completed-consumer.service.ts`, which no
      exclusion list claims. Closing it vacuously was not an option — the gate's own note says a
      spec that names a service and contains the word "isolation" ticks it without proving
      anything — so a real cross-tenant negative suite was written, and it found a real hole.
    - **The hole.** That consumer provisions an entire organisation: it seeds every system role,
      provisions the module checklists, closes the setup session and dispatches the owner's
      welcome. Every one of those writes takes `orgId` from the event **payload**, while the
      inbox fence, the relay's lease and the audit trail are all bound to the outbox row's
      `organization_id`. Nothing compared the two. An event recorded against organisation A
      carrying a payload naming organisation B would have seeded roles and dispatched a
      notification inside B. The payload schema was also a bare `z.object({})`, which strips an
      unexpected key rather than rejecting it, so a producer that renamed `orgId` would have
      parsed clean with the tenant field simply gone. Both are now closed: the schema is
      `.strict()`, and the consumer refuses a mismatch, marks the inbox row FAILED with the
      reason and throws so the publisher retries and finally dead-letters where the dead-outbox
      alert reports it. The producer sets both fields from one value
      (`org-setup.service.ts:emitSetupCompleted`), so the guard costs nothing legitimate.
    - Evidence: new `src/modules/organization/setup/__tests__/org-setup-completed-tenant-isolation.spec.ts`
      (10 tests). `jest --runInBand --testPathPattern="organization/setup"` -> **9 suites,
      47 tests passed, exit 0**.
    - Proven to bite, twice, both one-off with the files restored byte-identical (sha256 verified
      before and after — `f8ed5195...c9439` consumer, `1d63c9e3...0edda` schema):
      the tenant guard forced false -> **4 failed / 6 passed / 10** (`refuses to provision
      organization B...`, `names neither organization in any write...`, `records the refusal
      durably on the inbox row...`, `never reads the subject when it refuses...`);
      `.strict()` removed -> **1 failed / 9 passed / 10** (`an unexpected key is rejected by the
      schema, not stripped and provisioned`).
    - Cross-boundary note: this box required editing two files in `src/modules/organization/setup/`
      (the consumer and its payload schema), not only a spec. That module is on no exclusion list
      and is held by no other agent, but the edit is a fix rather than a test and is called out here
      deliberately.
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

---

## S7 (2026-09-03) — the gate had REGRESSED, and is green again

Ticket 14 closed at `928 / 928`. The service count has since grown to **930** and the
static gate was red again when this lane picked it up:

- `pnpm check:tenant-isolation` → **exit 1, 929 / 930**,
  `MISSING src/modules/storage/storage-pending-purge.service.ts`.

`StoragePendingPurgeService` arrived after S6 and carried no cross-tenant negative.
Closed by `src/modules/storage/storage-pending-purge-tenant-isolation.spec.ts` (8 tests),
written behavioural rather than declarative — the fake store returns every tenant's rows
when no tenant id reaches the predicate, so removing `eq(orgId)` leaks org B's storage key
into org A's result.

- `pnpm check:tenant-isolation` → **exit 0, 930 / 930 (100%)**, zero MISSING.
- `pnpm check:tenant-isolation:self-test` → exit 0, `"pass": true`.
- `pnpm check:tenant-isolation:run` → **exit 0, 451 suites / 451, 1859 tests / 1859**.
- Bite-proved hermetically in a `git archive HEAD` sandbox, both directions: control
  8/8 pass, defect planted in the sandbox only → 7 of 8 fail. No defect entered the
  shared working tree.

Detail, plus a separate silent data-integrity defect found in the same area (KB object
deletes addressing the wrong R2 bucket) and the cross-territory changes it still needs in
`kb/` and `cron/`: `reports/44-storage-bucket-symmetry-and-pending-purge-isolation.md`.

**Note for whoever verifies at the release commit:** this gate has now moved three times
(role-grant reconciler → org-setup consumer → storage pending purge). It goes red whenever
a new tenant-owned service lands, so a green reading is only good for the commit it was
taken at.
