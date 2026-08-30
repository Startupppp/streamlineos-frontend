# A2 Organization Lane Report

## Item 1 — Membership-Revocation Test Graph (P0)

**Premise verdict: CONFIRMED**

`OrgMembershipService` constructor (line 85) injects `OrgMembershipReadService` at position [8]. Four spec files instantiated the service via `Test.createTestingModule` without providing this dependency, causing Nest DI to fail with "Can't resolve dependencies... OrgMembershipReadService at index [8]".

**Root cause:** `OrgMembershipReadService` was added to `org-membership.service.ts` to power `listMembers`, but none of the existing revocation/lifecycle specs were updated to include the new provider.

**Fix:** Added `import { OrgMembershipReadService } from "./org-membership-read.service"` and `{ provide: OrgMembershipReadService, useValue: {} }` to all four affected specs. No production code changed.

**Sabotage-proof result:**
- With fix applied, sabotaged `mockRunInTenantTransaction` in the first test to `() => Promise.resolve()` (not invoking callback).
- Result: `FAIL — "revokes agent tokens keyed by issuerMembershipId" (1 failed, 29 passed)` — assertions bit correctly.
- Restored. Final run: 30/30 pass in `membership-revocation.spec.ts`.

**Pre-existing failure in `membership-artifacts.spec.ts`:** 2 tests fail due to schema evolution (new `payroll_runs.approved_by_membership_id`, `kb_pages.*`, `event_attendees` and 18 other tables added after the inventory was last updated). These failures pre-date this lane, do not use `OrgMembershipService`, and require domain decisions about which new tables carry revocable grants vs. attribution columns. Left in pre-existing state; not introduced by this lane.

---

## Item 2 — Multi-Organization Creation Policy (P1)

**Premise verdict: CONFIRMED**

`OrganizationController.createOrganization` (lines 131-141) contained:
```typescript
if (!isStructuralOrgAdminContext(u)) {
  throw new ForbiddenException("Forbidden");
}
```
This blocked any caller whose `role !== ORG_ADMIN` and `isOrgOwner !== true`, preventing plain members from creating a second organization.

**Root cause:** Incorrect precondition — the product model allows any authenticated user to create a new organization and become its owner. The existing `switchOrg` path correctly enforces membership (in `OrgProfileService.switchOrg` via `organizationMembers.findFirst` check) and was not touched.

**Fix:**
1. Removed the `isStructuralOrgAdminContext(u)` check from `createOrganization`.
2. Removed now-unused imports: `ForbiddenException` from `@nestjs/common`, `isStructuralOrgAdminContext` from `common/rbac/is-structural-org-admin`.
3. Updated `@AuthorizedInService` description to accurately reflect that any authenticated user may create an org; plan limits are enforced inside `OrgProfileService.createOrganization`.

**Switch unchanged:** `OrgProfileService.switchOrg` already throws `BadRequestException("You are not a member of this organization")` when `organizationMembers.findFirst` returns null. Not modified.

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/modules/organization/core/membership-revocation.spec.ts` | Added `OrgMembershipReadService` import + provider |
| `backend/src/modules/organization/core/org-membership-eviction.spec.ts` | Added `OrgMembershipReadService` import + provider |
| `backend/src/modules/organization/core/org-membership-notifications.spec.ts` | Added `OrgMembershipReadService` import + provider |
| `backend/src/modules/organization/core/organization-member-status.spec.ts` | Added `OrgMembershipReadService` import + provider (2 locations) |
| `backend/src/modules/organization/core/organization.controller.ts` | Removed `isStructuralOrgAdminContext` check + unused imports |
| `backend/src/modules/organization/core/organization-creation-policy.spec.ts` | NEW — 4 tests: member/admin/owner create (allowed), non-member switch (denied) |

---

## Tests Added (`organization-creation-policy.spec.ts`)

- `allows a plain member (MEMBER role) to create a new organisation` — PASS
- `allows an org admin (ORG_ADMIN role) to create a new organisation` — PASS
- `allows an org owner to create a new organisation` — PASS
- `propagates BadRequestException from OrgProfileService when the user is not a member of the target org` — PASS

---

## Validation Output

### pnpm typecheck
```
> streamlineos-api@0.1.0 typecheck
> node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
(zero errors — clean exit)
```

### jest --testPathPattern="organization"
```
Test Suites: 1 failed (membership-artifacts.spec.ts — pre-existing schema drift), 35 passed, 36 total
Tests:       2 failed (membership-artifacts.spec.ts), 326 passed, 328 total
```

The 2 remaining failures are pre-existing and unrelated to either item in this task.

---

## Changes Needed Outside Ownership

None. All fixes are contained within `backend/src/modules/organization/**`.
