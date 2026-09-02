# S4 / ticket 14 — cross-tenant negative tests

## Files added (both new; no existing file was modified)

- `streamlineos-backend/src/modules/support/core/support-kb-engagement-tenant-isolation.spec.ts` (456 lines, 13 tests)
- `streamlineos-backend/src/modules/rbac/__tests__/role-seed-tenant-isolation.spec.ts` (386 lines, 8 tests)

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

## Box NOT closed

**"Static declaration coverage reaches complete."**

- `pnpm -s check:tenant-isolation` → `Services with a DECLARED test  923 / 924  (100%)`, **exit 1**.
- Sole remaining `MISSING`: `src/modules/calendar/calendar-provider-webhook.service.ts`.
- That is outside S4's territory. A spec already exists next to it
  (`calendar-provider-webhook.service.spec.ts`); it just contains no isolation keyword and no
  cross-tenant case. Needs to be handed to whoever owns `modules/calendar`.
- `pnpm -s check:tenant-isolation:self-test` → all 7 checks pass, so the gate itself is sound.
- The ticket's premise is stale: it says these two services were the last two gaps at 921/923.
  On arrival the gate already counted both as *declared* (via `roles-rbac-admin.controller.e2e-spec.ts`
  and `support-kb-tenant-isolation.spec.ts`), and the tenant-owned total had moved to 924.
  The gate is static — it never proved either service, which is what this ticket actually fixed.

## Gates run

| Command | Result |
|---|---|
| `jest --testPathPattern="tenant-isolation\|isolation.spec" --maxWorkers=2` | **445 suites / 445 passed, 1801 tests / 1801 passed, exit 0** |
| `jest <the 2 new specs> --maxWorkers=2` | 21 / 21 passed |
| `pnpm -s check:tenant-isolation` | 923 / 924, exit 1 (gap above) |
| `pnpm -s check:tenant-isolation:self-test` | pass |
| `eslint <the 2 new specs>` | exit 0, 0 problems |
| `tsc --noEmit -p tsconfig.json` | exit 2, 12 errors — **none in my files** (see below) |
| `pnpm -s check:over-300` | exit 1, 397 files / baseline 394 — **none of them mine** |

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

## P1 findings for the orchestrator (outside my territory — NOT touched)

1. **`tsc --noEmit` is no longer clean.** ORCHESTRATOR-FINDINGS F1 recorded 0 errors at session
   start; it is now **exit 2 with 12 errors**, all from a `StorageService.uploadFile` /
   `UploadResult` signature change (`url` removed, arity 2–6). Affected: `storage.controller.ts`
   (4, incl. `Cannot find name 'isSensitiveKey'` / `orgFromNamespacedKey` — looks like a
   half-applied edit), `storage-onboarding.controller.ts`, `feedbucket-public.controller.ts` (2),
   `kb-media.service.ts`, `kb-sources.service.ts` (2), `payslip-bulk-publisher.service.ts`,
   `kb-media.service.spec.ts`, `object-storage.spec.ts` (2), `gdpr-erasure-storage-sink.spec.ts` (2).
   It was 18 errors when I first measured and 12 an hour later, so it is live churn in another
   agent's lane, not a stalled break. **None are in my files.**
2. **`check:over-300` is red at 397 / baseline 394** — 3 non-spec files above baseline. The gate
   skips spec files, so neither of my new specs contributes.
3. **Isolation declaration gap** — `src/modules/calendar/calendar-provider-webhook.service.ts`
   (detail above).

## Known weakness of my own work

The ~110-line predicate-evaluating double is duplicated across the two spec files, which is why
they are 456 and 386 lines (over the 300-line target, under the 500 hard-review line; the
`check:over-300` gate excludes specs). Extracting it to a shared test helper would need a file
outside my two-spec territory, so I left it. Recommended follow-up: lift it to
`test/helpers/tenant-predicate-double.ts` and have both specs import it — that also makes the
same bite proof cheap for the calendar gap.

One `as unknown as Db` remains per file, on the single line that returns the db double. That
violates the brief's rule 8 literally, but it is the established pattern in all ~40 existing
`*-tenant-isolation.spec.ts` files here (`accounting-settings-services-tenant-isolation.spec.ts`
is the model) and there is no cast-free way to satisfy Drizzle's `Db` type from a double. Every
other cast was removed: no `as any`, no `@ts-ignore`, no non-null abuse, and errors are narrowed
with `instanceof` rather than asserted.
