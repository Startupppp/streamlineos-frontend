# 03: Enforce the organization and module authority matrix

**What to build:** Owners, organization admins, module owners, module admins and members receive exactly the ownership and administration behavior declared by the PRD.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Organization ownership transfer and destructive lifecycle operations remain organization-owner only.
- [x] Organization admins and current module owners can perform the approved module-ownership operations.
- [x] Backend decisions, frontend visibility and permission templates agree.
- [x] Complete allow/deny and concurrent stale-owner tests pass.

## Decision fixed at start

PRD §12 says org admin **may** transfer module ownership. The code had two distinct paths, so the matrix row had to be read against both:

- the **nominate-and-accept handshake** (`initiateModuleTransfer` / `cancelTransfer` / accept), and
- **force-set / direct-transfer**, which rewrite ownership with no acceptance from either party.

Approved reading: org admin gains the **handshake only**. Force-set and direct-transfer stay organization-owner-only, and their entries in `OWNER_ONLY_OPERATIONS` (`organization.ownership.force-set-module-owner`, `organization.ownership.direct-module-transfer`) are untouched — an admin who could rewrite ownership with no acceptance step could simply take a module. Organization ownership transfer and archive/delete stay owner-only.

## Findings

1. **The rules table denied org admin.** `module-standing.ts` `STANDING["org-admin"].canTransferOwnership` was `false`, and `canTransferModuleOwnership` consulted only `actor.isOrgOwner` and the `module_ownerships` row.
2. **Two divergent copies of the same decision.** `ownership-transfers.service.ts` `initiateModuleTransfer` re-implemented it inline as `if (!isOrgOwner && currentOwnership.ownerMembershipId !== actorMembership.id) throw`, and `ownership-transfer-response.service.ts` `cancelTransfer` as `if (!isOrgOwner && actorMembership.id !== initiatorId) throw`. Both took a raw `isOrgOwner: boolean` from the controller, so neither could ever agree with the standing table.
3. **The frontend was stricter than any of them.** `module-access-page.tsx` had `const canViewOwnership = isModuleOwner`, so the Ownership tab was invisible to an org owner *and* an org admin, and `<OwnershipSection canManage />` was hardcoded true.
4. **`organization.legal-hold` was declared owner-only but never enforced.** `check:owner-authority` reported `9 declared, 8 enforced` and excused it with a note claiming it was enforced in `modules/hr/governance/legal-holds`. That note was wrong: those endpoints manage `hr_legal_holds`, a per-subject HR litigation hold. The organization-wide hold that blocks purge and ownership transfer is `organization_legal_holds`, managed by `organization.controller.ts` — S1 territory — where `POST/DELETE /organization/legal-holds` were gated only by `settings:organization:manage`, which an **org admin holds**. A destructive lifecycle operation was therefore available to org admins.

## Change

`module-standing.ts` — `STANDING["org-admin"].canTransferOwnership = true`. `canTransferModuleOwnership` now answers from the standing table through the three sources that can hold it: `principalIsOrgOwner(actor.principal)` → `isStructuralOrgAdmin(db, actor)` → the `module_ownerships` row. Module admin, module member and non-members stay `false`. It reads the principal rather than the denormalized `actor.isOrgOwner` flag, matching `resolveAuthoritySource`.

`ownership-transfers.service.ts` / `ownership-transfer-response.service.ts` — both inline copies deleted. Each takes the `CurrentUserContext` actor instead of a raw boolean and calls `canTransferModuleOwnership`. `cancelTransfer` keeps ORG-scope cancellation on initiator-or-org-owner; only MODULE scope widens. `initiateOrgTransfer`'s `actorMembership.isOwner` check is unchanged. Error messages updated to name the principals that can actually pass. Every validation, audit log, cache invalidation, notification and the `23505 → ConflictException` mapping are preserved.

`ownership.controller.ts` — both call sites pass `u` instead of `u.isOrgOwner`.

`organization.controller.ts` — `assertOwnerOnly(u, "organization.legal-hold")` added to `placeLegalHold` and `releaseLegalHold`. `GET` stays on `settings:organization:manage`; reading a hold is not placing one.

`check-owner-authority.mjs` — the incorrect `UNENFORCED_EXEMPT` entry removed, so the check can never again excuse this gap.

`module-access-page.tsx` — `canViewOwnership = isOrgOwner || isOrgAdmin || isModuleOwner` (deliberately **not** module admin), driving both the `TabsTrigger`, the `TabsContent` and the `canManage` prop.

## Verification

```
node ./node_modules/jest/bin/jest.js src/modules/module-access/__tests__/authority-matrix.spec.ts --maxWorkers=1
Tests: 18 passed, 18 total

node ./node_modules/jest/bin/jest.js src/modules/ownership/__tests__/module-transfer-stale-owner.spec.ts --maxWorkers=1
Tests: 3 passed, 3 total
```

`authority-matrix.spec.ts` drives the full six-standing matrix for `canTransferModuleOwnership` and `resolveModuleManagementStanding`, and asserts `assertOwnerOnly` still denies an org admin for `organization.ownership.transfer`, `organization.archive`, `organization.delete`, `force-set-module-owner` and `direct-module-transfer`.

Its database double **renders the drizzle `where` condition with `PgDialect.sqlToQuery` and only returns the ownership row when the queried module key is actually in the parameters.** The first version ignored the module key and returned the owner for every module, so "refuses the module owner of a DIFFERENT module" passed for the wrong reason — it was a false pass until the double was made to inspect the real query.

`module-transfer-stale-owner.spec.ts` proves the concurrency criterion: `applyModuleTransfer` rejects when `moduleOwnerships.ownerMembershipId` no longer equals the transfer's `fromMembershipId`; `applyOrgTransfer` rejects when the `from` membership is no longer owner; and a conditional `UPDATE ... WHERE status='PENDING'` returning zero rows raises `ConflictException`.

Whole-territory run:

```
node ./node_modules/jest/bin/jest.js src/modules/module-access src/modules/ownership \
  src/modules/dashboard src/modules/users src/common/organization src/modules/access src/modules/rbac --maxWorkers=2
Test Suites: 1 skipped, 70 passed, 70 of 71 total
Tests:       4 skipped, 726 passed, 730 total
```

Structural checks:

```
pnpm check:owner-authority   →  owner-only operations 9 declared, 9 enforced
                                OK — nothing fabricates ownership and every owner gate reads the catalog.
pnpm check:owner-authority:self-test → SELF-TEST OK
```

`pnpm typecheck` → 0 errors. Frontend `tsc --noEmit` → 0 errors. `madge --circular` → zero, including the new `ownership → module-access` edge.

## Runtime (e2e) evidence

`ownership.controller.e2e-spec.ts` went from **13 passed / 22 failed to 21 passed / 14 failed** (measured both ways against HEAD). The spec had overridden `AccessService` with a two-method mock while `authorize()` calls `getModuleState`, `buildModuleAvailabilityResolver` and `scopeFor` — so every ownership route answered NO_MODULE or FORBIDDEN before its permission was read, and the guard tests were passing for the wrong reason. The mock now mirrors production, including the org-owner short-circuit and `isCoreModuleKey` being true for a namespace with no registry entry.

The residual 14 are a fixture-level gap affecting every session, not this ticket: `createE2eApp` signs tokens for `org_1`, which has no `organizations` row, so every `@Idempotent` route 500s inserting into `command_fences` (**sqlstate 23503**). Recorded in `CROSS-SESSION.md` with the unblock condition.

`dashboard.controller.e2e-spec.ts` passes 18/18, which is real runtime proof the Home module still boots and every route is auth-gated after ticket 02's changes.

## Resolved after review — the rank spec is no longer failing

`src/modules/module-access/__tests__/module-access-groups-rank.spec.ts` — "allows a STRUCTURAL org admin to create a group without querying rank" expects 1 `db.select` call and receives 2. The earlier note attributed this correctly but stopped short of the cause. Root-caused in review: `createGroup` calls `runInTenantTransaction`, which fires `refreshRelocationTargets` — an unmocked `db.select` on `organization_relocations` — and that consumed the spec's scripted mock, making the count 2 instead of 1. Isolating the tracker in the spec fixes it with the assertion intact, so "does not query rank for a structural admin" still bites. **7/7 passing.**
