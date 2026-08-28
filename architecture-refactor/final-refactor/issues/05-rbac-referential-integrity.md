# 05: Enforce RBAC actor and module referential integrity

**What to build:** Every grant, assignment, ownership and transfer record references a valid same-organization membership and cataloged module.

**Blocked by:** 03 — Enforce the organization and module authority matrix.

**Status:** done

- [x] Assigning/granting actors use same-tenant membership foreign keys.
- [x] Role, permission, ownership and transfer module keys are catalog constrained.
- [x] Permission namespace and stored module cannot drift.
- [x] Expand/backfill/constraint migrations and negative cross-tenant tests pass.

## Finding

Three separate holes, all verified against the live development database before any edit:

1. **Assigning actors were bare integers.** `role_assignments.assigned_by_membership_id` and `user_permission_grants.granted_by_membership_id` had no foreign key at all. Nothing stopped a membership id from *another organization* being recorded as the grantor of a permission.
2. **Every module key was free text.** `roles.module_key`, `module_ownerships.module_key`, `ownership_transfers.module_key`, `user_module_access.module_key` and `user_permission_grants.module_key` referenced nothing. A typo produced a grant scoped to a module that does not exist.
3. **Namespace and stored module could disagree.** `user_permission_grants` stores both `permission_key` and `module_key`, where `module_key` must be the *administering* module of that key — `home` administers `chat:`, `mail:`, `calendar:` and `notifications:`; `crm` administers `party:`. Nothing enforced the relationship, so a `chat:` key could be stored under `crm` and would then be invisible to the module it actually belongs to.

Orphan counts before the change (live DB): `roles`, `module_ownerships`, `ownership_transfers`, `user_permission_grants`, `user_module_access` → **0 each**, so every catalog FK could be added and validated with no backfill.

## The one thing deliberately NOT constrained

`permissions.module_key` has **97 rows across 17 keys** that are not modules: `ai`, `audit-log`, `billing`, `branch`, `compliance`, `dashboard`, `feedbucket`, `integrations`, `onboarding`, `ownership`, `payments`, `reports`, `sales`, `self`, `settings`, `tasks`, `workforce`. That column holds a permission *namespace*, and `module-registry.ts` says so explicitly: "Namespaces without a registry entry are platform surfaces (for example settings and ownership) and therefore have no org-module toggle." Adding a catalog FK there would be wrong, not merely inconvenient.

Instead the ticket's "catalog constrained" and "cannot drift" criteria are met by a new, additive column.

## Change

`permissions` gains `administering_module_key`, backfilled by the same rule the code uses (`administeringModuleOf`): namespace folded through `home` and `crm`, then kept only if it names a real catalog module. Result: **623 permissions mapped, 97 left NULL** — exactly matching the derivation computed before writing the migration.

That column then carries the whole guarantee:

- `permissions.administering_module_key` → `modules_catalog.module_key` (FK)
- `UNIQUE (permissions.name, permissions.administering_module_key)`
- `user_permission_grants (permission_key, module_key)` → `permissions (name, administering_module_key)` (composite FK)

The composite FK is what makes drift unrepresentable: a `chat:` key can only ever be stored under `home`, and a platform-namespace key such as `settings:manage` has a NULL administering module, so it can never be written to `user_permission_grants` at all — which is precisely the existing `assertPermissionsGrantable` rule, now enforced by the database rather than only by the service.

Plus the direct constraints:

- `role_assignments (org_id, assigned_by_membership_id)` → `organization_members (org_id, id)`, `ON DELETE SET NULL (assigned_by_membership_id)`
- `user_permission_grants (org_id, granted_by_membership_id)` → `organization_members (org_id, id)`, same
- `roles.module_key`, `module_ownerships.module_key`, `ownership_transfers.module_key`, `user_module_access.module_key`, `user_permission_grants.module_key` → `modules_catalog.module_key`

Column-list `ON DELETE SET NULL` (PG 15+; the server is 18.6) is required here: a plain `SET NULL` on a composite whose other column is `org_id NOT NULL` would fail at delete time, and `NO ACTION` would make a membership undeletable merely because it once granted something.

Schema files: `db/schema/common/auth.ts`, `db/schema/common/access.ts`, `db/schema/common/ownership.ts`.

## Migration

`migrations/0634_rbac_actor_and_module_integrity.sql`, journal `idx` 354, `when` 1787939838254 — stamped above the dev DB's `max(created_at)` of `1787939718254`, without which drizzle would skip it by timestamp while still reporting success.

Expand → backfill → constrain. Every FK is added `NOT VALID` then `VALIDATE`d as a separate statement, so neither side takes a long `ACCESS EXCLUSIVE` lock; `lock_timeout = '5s'` makes a blocked build fail fast. Every `ADD CONSTRAINT` is preceded by `DROP CONSTRAINT IF EXISTS`, so the file is re-runnable. A closing `DO $$` block raises unless all nine constraints exist, all nine are `convalidated`, the unique constraint exists, and zero permissions that resolve to a catalog module were left unbackfilled — so a half-executed migration cannot report success.

## Verification

Catalog state after applying (live dev DB) — all nine constraints present and validated:

```
fk_module_ownerships_module                    f  convalidated=true  module_ownerships      -> modules_catalog
fk_ownership_transfers_module                  f  convalidated=true  ownership_transfers    -> modules_catalog
fk_permissions_administering_module            f  convalidated=true  permissions            -> modules_catalog
fk_role_assignments_assigner_membership        f  convalidated=true  role_assignments       -> organization_members
fk_roles_module                                f  convalidated=true  roles                  -> modules_catalog
fk_user_module_access_module                   f  convalidated=true  user_module_access     -> modules_catalog
fk_user_permission_grants_granter_membership   f  convalidated=true  user_permission_grants -> organization_members
fk_user_permission_grants_module               f  convalidated=true  user_permission_grants -> modules_catalog
fk_user_permission_grants_permission_module    f  convalidated=true  user_permission_grants -> permissions
uniq_permissions_name_administering_module     u  convalidated=true  permissions
```

Backfill: `mapped 623 / platform_ns 97`, matching the pre-migration derivation exactly.

**Negative cross-tenant tests.** `pnpm verify:rbac-integrity` (new, `src/scripts/verify-rbac-referential-integrity.mjs`) runs ten probes in rolled-back transactions against the real database:

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

The three **controls matter as much as the denials**. An earlier run of this probe showed the "chat key under home" control being rejected, which would have meant the constraint blocked a legitimate grant — the cause was a made-up permission key in the probe (`chat:channels:view` does not exist), not a defect. Without controls that would have shipped as a false pass in the other direction.

`pnpm verify:rbac-integrity:self-test` proves the harness itself distinguishes accept from reject and folds namespaces correctly, so a broken probe cannot report success.

## Defect this migration introduced, found in review and fixed

Adding the composite FK made a latent gap in `PermissionCatalogSyncService` fatal. That service runs on **every boot** and upserts the whole catalog, but it never wrote `administering_module_key`. Existing rows were safe (the backfill had set them and the conflict set did not clear them), but any **newly added permission key** would land with a NULL administering module and then be impossible to grant per person.

Proved against the live database, both directions, in rolled-back transactions:

```
OLD sync (administering_module_key NULL)  -> REJECTED 23503
NEW sync (administering_module_key = hr)  -> ACCEPTED
probe rows left behind: 0
```

The column is now written on insert **and** in the conflict set, derived from `modules_catalog` read at sync time rather than from a hard-coded list, so a namespace that is not a module (`settings`, `ownership`, `billing`) correctly stays NULL and correctly stays ungrantable. Five regression tests in `permission-catalog-sync.service.spec.ts` pin all of it, including that the conflict set carries the column so an existing row is corrected rather than left stale.

`seed-enterprise-workspace.ts` and the leads e2e fixture also insert permissions, both with `onConflictDoNothing`; the boot-time sync corrects whatever they create, so they need no change.

## Known, accepted

**Decision taken with the owner:** `assigned_by_membership_id` stays unpopulated for now. It is written as `NULL` at eight call sites (`sync-structural-role.ts`, `module-access-groups.service.ts` ×3, `module-standing-mutations.service.ts`, `module-owner-role.helper.ts`) because `syncStructuralRoleAssignment(tx, orgId, membershipId, role)` takes no actor. Populating it means threading an actor through ~15 callers across four modules and is a separate change — two of the eleven call sites (`hr/directory`, `settings`) are outside S1's territory, so it cannot be done without another session's agreement. The ticket's criterion is referential integrity, which the FK delivers: a cross-tenant assigner is now impossible. The FK is not vacuous meanwhile: `granted_by_membership_id` **is** written (`user-permission-grants.service.ts:175`), and that live path is now protected against a cross-tenant grantor.
