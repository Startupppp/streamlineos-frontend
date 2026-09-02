# Ticket 14 — cross-tenant negative tests

Written S4, re-verified and corrected S5. Every number below the S5 heading was executed and read
in S5; the S4 numbers above it are kept for history and are labelled where they have gone stale.

## Files (both specs new; neither service file was modified)

- `streamlineos-backend/src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts` (456 lines, 13 tests)
- `streamlineos-backend/src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts` (393 lines, 8 tests — S5 edited it, see below)

Neither service file was changed. No isolation defect was found in either — both already
re-assert `org_id` on every read and write. `role-seed.service.ts` and
`support-kb-engagement.service.ts` are byte-identical to how I found them (sha256 verified
after the mutation experiment below).

## Boxes closed

| Box | Proof |
|---|---|
| executable cross-tenant negative test per service | `npx jest <2 paths> --maxWorkers=2` → **21 passed / 21**, 2 suites |
| test bites | service-side predicate strip → **8 failed / 21**; 6 permanent in-suite `BITE —` tests |
| non-owner actor | both actors `isOrgOwner:false`, `principalIsOrgOwner()` asserted false |
| `db.transaction` invokes its callback | real `runInTenantTransaction`; `transactionCallbackRuns() > 0` asserted |
| canonical actor helper carries membershipId | `humanSessionPrincipal(42/77, false)`; `actingMembershipId()` asserted |

## Box NOT closed — re-verified S5

**"Static declaration coverage reaches complete, and the executable isolation suite passes."**

Both halves are red, and neither cause is in this ticket's territory. S4's diagnosis named
`modules/calendar` as the sole gap; that is **stale** — calendar is now covered, and a different
service has become the gap.

### Static half — 924 / 925, exit 1

`pnpm -s check:tenant-isolation` reports one `MISSING`:
`src/modules/rbac/role-grant-reconciler.service.ts`.

`RoleGrantReconcilerService` was introduced by commit `b43cbba5`, *after* S4 measured the gate. It has
**no spec of any kind** anywhere in the repo — `grep -rn RoleGrantReconcilerService src test` returns
only `rbac.module.ts`, `permission-catalog-sync.service.ts`, `mark-role-administered.ts`,
`seed-system-roles.ts`, `src/scripts/seed-permissions.ts` and the service itself. So this is a genuine
untested service, not a keyword miss.

It is in ticket 19's territory (`src/modules/rbac/**` minus `role-seed.service.ts`), so it was not
touched. Adding the class name to this ticket's spec would satisfy the gate without proving anything —
precisely the vacuity the gate's own NOTE warns about. **Route to 19.**

`pnpm -s check:tenant-isolation:self-test` → all 7 checks pass, exit 0. The gate itself is sound.

### Executable half — 2 suites failed / 446, exit 1

`pnpm -s check:tenant-isolation:run` → **2 failed / 444 passed / 446 suites; 4 failed / 1808 passed /
1812 tests, exit 1**. Both failures are other lanes' regressions, reproduced twice:

1. `src/modules/cron/cron-group-a-tenant-isolation.spec.ts` (2 tests) —
   `Nest can't resolve dependencies of the CronHrEnginesService (DRIZZLE, ?, …). Please make sure that
   the argument "REDIS" at index [1] is available in the RootTestModule module.` The service gained a
   REDIS constructor dependency; the spec's `Test.createTestingModule` never provided it.
   **Territory: cron / HR.**
2. `src/modules/kb/retrieval/kb-acl-isolation.spec.ts` (2 tests) —
   `TypeError: this.indexing.bumpSpaceAclRevision is not a function` at
   `src/modules/kb/wiki/kb-members.service.ts:157`. The service gained a call the spec's `indexing`
   double does not stub. **Territory: KB.**

This ticket's own two suites are green inside that run.

## S5 change — the two vacuous loops in the RBAC spec

Both `for (const … of store.get(…) ?? [])` loops in `role-seed-tenant-isolation.spec.ts` asserted
**nothing at all** if the array were empty. They passed for the right reason today, but nothing held
them there: a harness whose insert stopped persisting, or a service that stopped writing grants, would
have kept them green. They now assert the population first:

```ts
const grants = store.get("role_permission_grants") ?? [];
expect(grants.length).toBeGreaterThan(0);
for (const grant of grants) expect(grant.orgId).toBe(ORG_A);

const versions = store.get("access_versions") ?? [];
expect(versions).toHaveLength(1);
for (const version of versions) expect(version.orgId).toBe(ORG_A);
```

Proven to bite: the spec's own harness was mutated once so grant writes were swallowed
(`onConflictDoUpdate` returning `[]`, `values()` dropping `role_permission_grants` rows). Result
**2 failed / 6 passed / 8**, red at exactly the two new `toBeGreaterThan(0)` lines. The file was then
restored and is byte-identical — sha256 `5e754bd759bd491925abe6f4218efdf84196ff3d8bcdda5cde4274399c15f6e9`
before and after.

## Gates run — S5, every one executed and read

| Command | Exit | Result |
|---|---|---|
| `pnpm -s check:tenant-isolation` | 1 | 924 / 925 declared; 1 MISSING (`role-grant-reconciler.service.ts`) |
| `pnpm -s check:tenant-isolation:self-test` | 0 | all 7 checks pass |
| `pnpm -s check:tenant-isolation:run` | 1 | 444 / 446 suites, 1808 / 1812 tests; 2 failing suites both other lanes |
| `jest <the 2 owned specs> --maxWorkers=2` | 0 | **21 passed / 21**, 2 suites |
| `pnpm -s check:spec-typecheck` | 1 | 5 errors, **none in this ticket's files** (was 2 an hour earlier — live churn) |
| `pnpm -s typecheck` (tsconfig.build.json, 8 GB) | 0 | **0 errors** |

Every heavy command ran through `.scratch/code-release-10-10/heavy.sh 2 --`.

`check:spec-typecheck` errors, all other lanes:
`ai-stream-abort.spec.ts` (2, `EndableResponse` missing `on`/`off`),
`kb-spaces-tenant-isolation.spec.ts` (arity 3 vs 2),
`rbac/permission-catalog-sync.service.spec.ts` (arity 2 vs 1 — the `RoleGrantReconcilerService` the
constructor gained; **ticket 19**), `workflows/engine/executors/ai-action.executor.ts` (missing return).

## How the "bites" proof works

The doubles are not `mockResolvedValue([])` stubs. They hold a two-org row store and actually
**evaluate the Drizzle `where` condition**: the `SQL` object is flattened into column/param
tokens, parsed into `eq` / `inArray` comparisons, and applied to the seeded rows. So a service
that stops emitting `eq(x.orgId, orgId)` really does see the other tenant's rows.

Two independent bite proofs:

1. **In-suite and permanent.** `makeDb(store, /* ignoreTenantPredicate */ true)` drops every
   `org_id` conjunct during evaluation — exactly equivalent to the service not emitting it. Six
   `BITE —` tests assert the concrete leak: org A's attachment file name reaching org B, org A's
   comment body listed for org B, org A's comment deleted by org B, org B commenting on org A's
   article, org B's role row returned to an org A actor, and org B's `ORG_ADMIN` membership row
   authorizing a role mutation in org A.
2. **Service-side, one-off.** I stripped the `org_id` predicates out of both service files, re-ran
   the two specs, then restored both files (sha256 confirmed byte-identical, restore under a
   shell `trap`). **8 of 21 tests went red**, and they are precisely the deny tests:
   - RBAC: `seeds org A's own starter roles although org B already holds every slug`,
     `returns org A's own role, never org B's row carrying the same slug`
   - Support: `getAttachmentDownloadUrl denies org B…`, `listComments / listFeedback /
     listAttachments deny org B…`, `deleteComment denies org B…`, `deleteAttachment denies
     org B…`, `createComment denies org B…`, `createAttachment denies org B…`

No id-collision fiction was needed. The attacker supplies the object id (`articleId=10`,
`attachmentId=1`), so a globally unique serial id isolates nothing — the `org_id` predicate is
the only thing standing between org B and org A's row. For RBAC the predicate is load-bearing for
a second reason: role `slug` is unique **per org** (`uniqueIndex(slug, org_id)`), so without the
org predicate org A's seeding sees org B's `SALES_REP` and silently creates nothing.

## 404 vs 403

- Every Support cross-tenant miss asserts `NotFoundException`, `getStatus() === 404`, **and**
  `not.toBeInstanceOf(ForbiddenException)` — a 403 there would be an existence oracle.
- RBAC's only 403 is the legitimate one: a caller **inside the correct tenant** who lacks
  standing. The test that produces it gives the actor an `ORG_ADMIN` membership in org B and a
  plain `MEMBER` row in org A — so the 403 comes from `isStructuralOrgAdmin`'s own `org_id`
  predicate, not from an owner bypass. An unresolvable template id returns 404, asserted
  explicitly as `not.toBeInstanceOf(ForbiddenException)`.

## Findings for the orchestrator (outside this territory — NOT touched)

1. **`src/modules/rbac/role-grant-reconciler.service.ts` has zero test coverage.** It is the only thing
   between the isolation gate and green. Ticket 19. Detail above.
2. **`cron-group-a-tenant-isolation.spec.ts` and `kb-acl-isolation.spec.ts` are red** — both are
   double-vs-service drift from recent commits, not isolation defects. Detail above.
3. **`check:spec-typecheck` is red at 5 errors** across ai / kb / rbac / workflows. Detail above.
   S4's report of 12 storage-signature errors is stale — those are fixed; `pnpm typecheck`
   (tsconfig.build.json) is now **exit 0, 0 errors**.
4. **Two predicate-evaluating db doubles now exist in the repo.** `src/test/sql-predicate.ts` +
   `src/test/fake-select-db.ts` landed at ~17:30 in another lane and are used by 7 `*-read-exclusion`
   specs. This ticket's two specs carry their own ~110-line evaluator. They are **not**
   interchangeable: the shared `makeFakeDb` has a no-op `insert` that never persists
   (`returning: () => Promise.resolve([{ id: 1 }])`), no `delete`, and no way to neuter the tenant
   predicate — so it cannot express "denies org B **and leaves org A's row intact**", "writes nothing",
   or any `BITE —` case. Consolidating them means extending the shared helper with a persisting
   insert/delete and an `ignoreTenantPredicate` mode; that file is another lane's, so it was left alone.
   Whoever writes the `RoleGrantReconcilerService` spec will need exactly that capability.

## Known weakness of my own work

The ~110-line predicate-evaluating double is duplicated across the two spec files, which is why
they are 456 and 393 lines (over the 300-line target, under the 500 hard-review line; the
`check:over-300` gate excludes specs). Extracting it to a shared test helper would need a file
outside my two-spec territory, so I left it. Recommended follow-up: lift it to
`test/helpers/tenant-predicate-double.ts` and have both specs import it — that also makes the
same bite proof cheap for the `RoleGrantReconcilerService` gap. See finding 4 above for why the
shared `src/test/fake-select-db.ts` cannot be used as-is.

One `as unknown as Db` remains per file, on the single line that returns the db double. That
violates the brief's rule 8 literally, but it is the established pattern in all ~40 existing
`*-tenant-isolation.spec.ts` files here (`accounting-settings-services-tenant-isolation.spec.ts`
is the model) and there is no cast-free way to satisfy Drizzle's `Db` type from a double. Every
other cast was removed: no `as any`, no `@ts-ignore`, no non-null abuse, and errors are narrowed
with `instanceof` rather than asserted.
