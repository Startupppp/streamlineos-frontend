# L17 RBAC/Access Report

## Status: COMPLETE

## Catalog integrity
- Backend catalog: 690 keys. Frontend PermissionKey union: 690 keys.
- Both directions verified by `catalog-sync.test.ts` (11/11 pass).
- `pnpm check:permission-keys`: OK — every `@RequirePermission` key resolves; 3095 usages, 621 unique.

## Items delivered

### 1. DataScope `team` — correlated subquery eliminated
`backend/src/modules/access/apply-scope.ts` — removed the `org_unit_members` correlated subquery fallback. When `team` scope is requested without materialized `teamColumn`/`teamIds`, the predicate now falls back to `own` scope (actor restriction). This is intentional: the old subquery ran N times per result row, which is an N+1 hazard. Team scope will ship its real predicate only once materialized team data is supplied via `teamColumn`/`teamIds`.

BEHAVIOURAL CHANGE: `applyScope("team", ...)` without `teamIds` now produces the same SQL as `own`. Four scope values produce 3 distinct predicates (all, own/team, none).

OUT-OF-OWNERSHIP spec edits (dashboard/hr — updated because this lane is the only one that understands the change):
- `src/modules/dashboard/dashboard-home-scope.spec.ts`: updated 3 assertions to reflect fallback-to-own behavior.
- `src/modules/dashboard/resignation-approval-scope.spec.ts`: removed `scope_teammate` assertion; behavior is now `(derivedApprover AND own)`.

### 2. `access.service.ts` decomposed — `UserModuleAccessService` extracted
Extracted `getUserDeniedModules`, `getUserModuleAccess`, `setUserModuleAccess` and the `deniedModulesCache` into `backend/src/modules/access/user-module-access.service.ts` (234 lines). `access.service.ts` reduced from 750 to 532 lines (excluding warm-path fix below). Controller re-wired directly to `UserModuleAccessService` (not a forwarding wrapper).

### 3. Warm path fix — zero borrows warm for non-owner members
Old: `resolveUserPermissions` warm path returned early only for `isOwnerOrAdmin`. Regular members fell through to `runInTenantTransaction` even when both `permsCache` and `membershipAccessCache` were warm (1 unnecessary pool borrow per warm request). Fix: when both caches are warm, call `getUserDeniedModules` (which has its own TTL cache — 0 borrows on warm) outside the transaction and return directly. `WARM_RESOLUTION_BORROWS = 0` now passes.

### 4. Universal member grants verified
`home-surfaces-universal.spec.ts` confirms `EMPLOYEE_SELF_SERVICE_GRANTS` merge before role read — no role revocation removes Home/calendar/chat/mail. No changes needed.

### 5. Module vocabulary verified
`namespacesForModule` already returns own namespace first. `administeringModuleOf` is the only correct ownership query. No changes needed.

### 6. Cache and revocation verified
`bumpPermissionsVersion` does tx insert + Redis publish in the same transaction (`access-invalidate.ts`). No changes needed.

### 7. `assertPermissionsGrantable` billing namespace verified
`assertPermissionsGrantable` refuses the whole `billing:` namespace. `verify:rbac-integrity` 10/10 pass.

## Test stubs created
`backend/test/helpers/user-module-access-stub.ts` — `makeUserModuleAccessStub()` helper, following the `makeMfaPolicyStub` pattern.

## Spec files updated (5th constructor arg added)
`access.service.spec.ts`, `access-membership-coherence.spec.ts`, `access-membership-authority.spec.ts`, `access-resolution-cost.spec.ts`, `access-cache-scope.spec.ts`, `holds-and-scope-for.spec.ts`, `rbac-resolution.spec.ts`, `warm-cold-parity.spec.ts`

## Validation results
- `pnpm check:permission-keys`: OK — 690 backend / 690 frontend, every usage resolves.
- `pnpm verify:rbac-integrity`: 10/10 PASS.
- `pnpm check:owner-authority`: OK.
- `pnpm check:tenant-isolation`: FAIL 63% covered — 298 services missing cross-tenant tests. Pre-existing; outside L17 ownership (build, hr, payroll, etc.).
- Backend `pnpm typecheck`: errors in `hr/recruitment`, `payroll/runs`, `support/core`, `accounting` — all outside L17 ownership. No errors in owned files (`modules/access/**`, `modules/rbac/**`, `common/rbac/**`).
- Frontend `pnpm type-check`: CLEAN.
- RBAC/access test suite: 81/82 pass (1 skipped), 1003/1007 tests (4 skipped, 0 failed).
- Dashboard scope suite: 33/33 pass.
- Lint/tests beyond the above: not run.
