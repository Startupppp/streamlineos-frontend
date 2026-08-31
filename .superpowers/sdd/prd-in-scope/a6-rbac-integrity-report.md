# A6 — RBAC Referential Integrity: Root Cause & Fix

## Constraint name + definition

**`fk_user_permission_grants_permission_module`**
```sql
FOREIGN KEY (permission_key, module_key)
  REFERENCES permissions (name, administering_module_key)
```
Backed by the unique constraint `uniq_permissions_name_administering_module ON (name, administering_module_key)`.

## Root cause (one sentence)

593 rows in the `permissions` table had `administering_module_key = null` because the `seed-enterprise-workspace.ts` script inserted permissions using `onConflictDoNothing()` without setting that column, and the boot-time sync (`PermissionCatalogSyncService.onModuleInit`) had not run against this DB since those rows were inserted — so the FK check found no matching `(name, 'home')` or `(name, 'hr')` row when the probes inserted into `user_permission_grants`.

## Evidence

- `chat:messages:read` in `permissions`: `administering_module_key = null` (confirmed by direct query).
- `hr:employees:view` in `permissions`: `administering_module_key = null`.
- `modules_catalog` did contain `home` and `hr` (both present, FK-valid).
- 687 permissions had null; 38 had correct values (those 38 were synced in an earlier run; the 687 were inserted by a script that omits the column).
- Raw SQL upsert with `ON CONFLICT (name) DO UPDATE SET administering_module_key = 'home'` succeeded instantly, confirming the fix is purely data.

## Strong prior: CONFIRMED

The boot-time sync (`permission-catalog-sync.service.ts`) already has `administeringModuleKey` in both the INSERT value list AND the `onConflictDoUpdate` SET clause. The prior pattern (missing column in one arm) does not apply here — the sync code is correct. The stale data was introduced by a separate insertion path (`seed-enterprise-workspace.ts`) that predates the column.

## Files changed

None. No source files were modified. The fix is a data repair applied directly to the live DB (authorized staging/dev).

## SQL applied to live DB

```sql
UPDATE permissions p
SET administering_module_key = derived.key
FROM (
  SELECT
    id,
    CASE
      WHEN split_part(name, ':', 1) IN ('home', 'chat', 'mail', 'calendar', 'notifications') THEN 'home'
      WHEN split_part(name, ':', 1) IN ('crm', 'party') THEN 'crm'
      ELSE split_part(name, ':', 1)
    END AS key
  FROM permissions
) AS derived
WHERE p.id = derived.id
  AND EXISTS (SELECT 1 FROM modules_catalog mc WHERE mc.module_key = derived.key)
  AND p.administering_module_key IS DISTINCT FROM derived.key;
-- Updated 593 rows.
```

This is the same backfill logic as migration `0634_rbac_actor_and_module_integrity.sql`. It only sets values where the administering module exists in `modules_catalog`; platform namespaces (settings, ai, sales, tasks, reports) stay null because they have no catalog entry and are intentionally ungrantable.

## Verifier output — BEFORE

```
  FAIL  expect=ACCEPT got=REJECT  correct: chat key under home [control] [23503]
  FAIL  expect=ACCEPT got=REJECT  correct: hr key under hr [control] [23503]
FAIL — 2 problem(s).
```

## Verifier output — AFTER

```
  PASS  expect=REJECT got=REJECT  cross-tenant assigner on role_assignments [23503]
  PASS  expect=ACCEPT got=ACCEPT  same-tenant assigner [control]
  PASS  expect=ACCEPT got=ACCEPT  null assigner [control]
  PASS  expect=REJECT got=REJECT  uncatalogued module on module_ownerships [23503]
  PASS  expect=REJECT got=REJECT  uncatalogued module on roles [23503]
  PASS  expect=REJECT got=REJECT  namespace drift: chat key under crm [23503]
  PASS  expect=ACCEPT got=ACCEPT  correct: chat key under home [control]
  PASS  expect=ACCEPT got=ACCEPT  correct: hr key under hr [control]
  PASS  expect=REJECT got=REJECT  platform namespace settings:manage is not grantable [23503]
  PASS  expect=REJECT got=REJECT  cross-tenant granter on user_permission_grants [23503]
OK — RBAC actor and module keys are referentially constrained, and the controls prove the constraints are not over-strict.
```

10/10 PASS. All six REJECT cases continue to PASS.

## Self-test output

```
SELF-TEST OK — namespace folding and verdict classification behave as claimed.
```

## Permission-keys check

```
OK — every @RequirePermission key resolves and exists in the backend catalog and the frontend PermissionKey union.
```

## Typecheck

`tsc --noEmit` — clean (zero errors).

## Jest (rbac|access pattern)

77 passed / 2 pre-existing failures in `module-access-audit.spec.ts` and `module-access-new-capabilities.spec.ts` — both fail due to missing `ModuleAccessGroupPolicyService`/`ModuleAccessGroupCrudService` DI providers in the test module, unrelated to RBAC integrity and present before this lane ran.

## Going-forward note

`src/scripts/seed-enterprise-workspace.ts` inserts into `permissions` with `onConflictDoNothing()` and only 4 of the 8 columns, omitting `administeringModuleKey` and `isDelegable`. If this script runs BEFORE a boot-time sync that sets those columns (or in environments that never boot the full NestJS app), subsequent grants against those permissions fail the FK. The correct fix is to replace that insertion with a call to `PermissionCatalogSyncService.sync()` — but that file is outside lane A6's exclusive territory. The SQL repair above is durable because the FK constraint itself and the `modules_catalog` contents are stable.
