# S4 / ticket 19 — module release matrix: auth/identity/organization, RBAC, Settings

> **Pass 3 (the first section) supersedes pass 2 where it restates it; pass 2 supersedes the
> pass-1 verdicts below it.** The tree moved
> between the two passes: `RoleGrantReconcilerService` landed, the `access-permission.resolver`
> `.limit(500)` was replaced by a keyset drain, migration `0997` added the missing permission-path
> index, and `@Idempotent` reached the RBAC controllers. Pass 1's §1 inventory is still the best
> file-by-file record and is kept; its §0 and §3–§5 verdicts are stale and are restated here.

---

# Pass 3 — supersedes P2 where it restates it

> Pass 3 resumed a pass that an infrastructure watchdog killed mid-edit; the predecessor's
> uncommitted work was on disk and was read before anything was rewritten. Its last written
> intent — "rewire the settings side to delegate the git aliases" — was already done in the
> working tree; what was missing was the deny coverage, the rung that makes the new keys
> reachable, the frontend key that has to follow the backend one, and every gate.

## P3.0 — What the move actually is, and why an alias controller rather than a deletion

Six of the fifteen module-owned routes at the global `/settings` path are moved:

| was | is now | gate was | gate is |
|---|---|---|---|
| `GET /settings/ai-usage` | `GET /ai/usage` | `settings:manage` | `ai:usage:view` |
| `GET /settings/integrations/git` | `GET /integrations/git/connections` | `settings:manage` | `integrations:git:view` |
| `POST /settings/integrations/git` | `POST /integrations/git/connections` | `settings:manage` | `integrations:git:manage` |
| `PATCH /settings/integrations/git/:id` | `PATCH /integrations/git/connections/:id` | `settings:manage` | `integrations:git:manage` |
| `DELETE /settings/integrations/git/:id` | `DELETE /integrations/git/connections/:id` | `settings:manage` | `integrations:git:manage` |
| `POST /settings/users/:userId/role` | delegates to `OrgMembershipService` | `settings:rbac:manage` | unchanged |

Root CLAUDE.md §8 says "when a page moves to its canonical route, delete the old route files — no
legacy redirects". That rule is about **frontend pages**; these are API paths with a shipped
browser client, and deleting them in the same release that moves them breaks the running app
between the two deploys. They therefore live for exactly one release on
`SettingsDeprecatedRoutesController`, every handler carrying the one shared
`SETTINGS_ALIAS_SUNSET` (`2027-03-31`) and a `Link` to where it went, which
`DeprecationInterceptor` turns into `Deprecation`/`Sunset`/`Link` response headers and
`recordRouteClassification` stamps onto the operation. Keeping them in **one file** is the
design: that file is exactly the debt, and `settings-route-gates.spec.ts` asserts nothing on the
primary `SettingsController` is deprecated, so the list cannot quietly grow.

`POST /settings/users/:userId/role` is not an alias of a move; it was a **second implementation**
of `PATCH /organization/members/:memberId`, and the weaker one — no `FOR UPDATE` on the member
row, no last-structural-admin check, no module-ownership check, no audit entry, no
role-changed notification — reachable through a *different* key. A caller holding
`settings:rbac:manage` could demote the last org admin through a route the organization module
already refuses. It now calls `OrgMembershipService.updateMemberRole`. `SettingsService` lost
`PlanLimitsService` and `AccessService` with it.

## P3.1 — The rung, which is what makes any of this reach a person

Minting `integrations:git:view|manage` alone would have made the page *less* reachable, not more:
`ROLE_DEFAULT_PERMISSIONS` gives `OWNER` and `ORG_ADMIN` `ALL_PERMISSION_NAMES`, and nobody else
would hold the new pair. `MODULE_ADMIN_EXTRA_KEYS.build` now carries it.

That entry is the sanctioned shape, not a widening. `/build/settings/integrations` is Build's own
page and `git_connections.project_id` points at a Build project, but the keys sit in the
`integrations` namespace, so `moduleScopedPermissions("build")` cannot find them — the same
situation `settings:record-layouts:manage` is in for CRM, with the same remedy and the same
comment beside it. The pair reaches repository connections and nothing else in `integrations`:
`integrations:connections:*` is deliberately NOT included, because that pair is in
`EMPLOYEE_SELF_SERVICE` and governs a person connecting their *own* external accounts.
`RoleGrantReconcilerService` reads `buildModuleAdminPermissionKeys` at boot, so organisations that
already exist converge with **no migration** — the mechanism box 7 proves on a database.

`ai:usage:view` gets no rung on purpose: org-wide AI spend is financial data, and
`AiUsageService` keeps the structural org-admin check *beside* the key rather than instead of it.

Module gating checked before minting: `moduleOf("integrations:git:view")` is `integrations` and
`moduleOf("ai:usage:view")` is `ai`; neither is in `planGatedModuleIds()`
(`hr,crm,build,accounting,inventory,support,feedbucket,surveys,payroll,sign,timesheets`), so
`isCoreModule` short-circuits `moduleAvailability` and no organisation gets a 402 it did not get
before.

## P3.2 — New defect: one table, four modules, one route that constrained neither end

`custom_field_definitions` is shared. Support scopes every read and write to `ticket`, HR to
`employee`, Build to its own constant. `/settings/custom-fields` scoped **neither**: the create
payload was CRM-only by enum, but `updateCustomField` and `deleteCustomField` took a bare
`fieldId` and keyed on `(id, org_id)` alone. A holder of `settings:custom-fields:manage` could
therefore rename or drop a Support ticket field or an HR employee field — same tenant, wrong
module, which no cross-tenant test can see and no RLS predicate can catch.

`CRM_CUSTOM_FIELD_ENTITY_TYPES` is now exported from the schemas file, feeds both the create enum
and the list filter, and is the third clause of every predicate in the service. A foreign row is a
**404**, never a 403: a 403 would confirm the id exists, which is the disclosure the containment
exists to prevent. `GET /settings/custom-fields` also moved from a `manage` gate to
`settings:custom-fields:view`, so there is a read rung at all, with all three writes still on
`manage`.

Bite-proof: the four `OWNED_ENTITY_TYPES` clauses stripped → **2 failed / 6** in
`settings-custom-fields-tenant-isolation.spec.ts`; restored, re-run green.

## P3.3 — Deny tests, because `check:authz-deny` counts them and a decorator is not a guard

The five new canonical handlers and five aliases arrived with no deny test, which pushed
`check:authz-deny` to **2457, four above its 2453 ratchet**. Fourteen handlers now have one, and
they are not metadata assertions: `settings-route-gates.spec.ts` builds a real `PermissionGuard`
over a real `Reflector`, feeds it the actual handler function and controller class, and resolves
`scopeFor` against a held-key set — so the `ForbiddenException` is the guard's own, and the
matching allow case proves the gate is a gate and not a wall. It also pins that a holder of only
`settings:custom-fields:view` can list and cannot write.

Result: `check:authz-deny` → **exit 0, uncovered 2443** (10 below the ratchet, which the gate
invites its owner to bank). Bite-proof: `scopeFor` forced to `"all"` → **17 failed / 41**.

## P3.4 — Gates run in pass 3. Every number was executed and read.

| command | exit | number |
|---|---|---|
| `pnpm -C …backend typecheck` | 0 | 0 errors |
| `pnpm -C …backend check:spec-typecheck` | 0 | passed |
| `pnpm -s check:authz-deny` | 0 | uncovered 2443 (ratchet 2453) |
| `pnpm -s check:permission-keys` | 0 | backend 702 keys / frontend union 700 |
| `pnpm -s check:navigation-permissions` | 0 | every nav gate names an enforced key |
| `pnpm -s check:route-classification` | 0 | 0 undeclared |
| `pnpm -s check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent` |
| `pnpm -s check:module-di` | 0 | 217 modules · 1712 classes · 0 violations |
| `pnpm -s check:file-sizes` | 0 | 3565 files, all within 500 |
| `pnpm -s check:unbounded-reads` | 0 | offset 0 · unbounded 0 |
| `pnpm -s check:mock-surface` | 0 | 3893 doubles · 0 defects |
| `pnpm -s check:scope-application` | 0 | 142/142 resolutions reach a predicate |
| `pnpm -s check:cache-invalidation` | 0 | 0 blockers |
| `pnpm -s check:openapi-coverage` | 0 | 3613 operations, 100% stamped |
| `pnpm -s check:operation-ids` | 0 | 3613 ops, no duplicates |
| `pnpm -s check:contract-registry` | 0 | 3625 operations classified |
| `pnpm -s check:envelope-consistency` | 0 | 0 violations |
| `pnpm -s check:openapi-path-params` | 0 | 3613 checked |
| `pnpm -s check:contract-breaking-change` | 0 | 0 breaking |
| `pnpm -C …backend check:cycles` | 0 | 5516 files, no cycle |
| `jest src/modules/{settings,ai/usage,integrations/git,rbac}` | 0 | 41 suites / **255 passed**, 1 skipped |
| `jest src/modules/access` | 0 | 40 suites / **398 passed** |
| `pnpm -C …frontend type-check` | 0 | 0 errors |
| `jest lib/rbac/permissions sidebar-permission-navigation hooks/api/access features/settings` | 0 | 17 suites / **120 passed** |
| `pnpm -s check:route-access-contract` (frontend) | 0 | 203 nav keys, all enforced |
| `pnpm -s check:query-scope` (frontend) | 0 | 5249 files, 0 violations |
| `pnpm -s check:contract-drift` (frontend) | 0 | 0 drift |
| `pnpm -s check:tenant-isolation` | 1 → **0** | red mid-pass on another agent's file; closed by `deff6b6f` before hand-off — see P3.6 |

Not run, and not claimed: `pnpm openapi:check`, `pnpm check:tenant-isolation:run`, the seeded e2e
suite, frontend `pnpm lint` (it lints build output and reports ~2,375 inflated errors; another
agent owns that fix), and any database measurement — pass 3 changed no schema and no query plan.

## P3.5 — Files changed in pass 3

Backend, `27e901ec` — 31 files:
`src/modules/settings/{settings.controller,settings.service,settings.module,settings.helpers,settings-custom-fields.service}.ts`,
`src/modules/settings/{settings-deprecated-routes.controller,settings-route-deprecation}.ts` (new),
`src/modules/settings/{settings-route-gates,settings-custom-fields-tenant-isolation,settings-member-role-authority}.spec.ts`,
`src/modules/settings/dto/settings.schemas{,.spec}.ts`,
`src/modules/ai/usage/**` (new module + the `ai-usage.query` rename out of settings),
`src/modules/integrations/git/**` (new controller/service/helpers/dto + isolation spec),
`src/modules/rbac/permissions/{ai,catalog,index,shared}.ts`,
`src/modules/rbac/seed-system-roles.ts`, `src/modules/rbac/__tests__/seed-system-roles.spec.ts`.

Frontend, `4768441bc` — 4 files: `lib/rbac/permissions/{settings,permission-key-business,permission-key-extended}.ts`,
`hooks/api/git-integration.ts`.

## P3.6 — Handoffs from pass 3

1. **~~`check:tenant-isolation` is red on another agent's file~~ — closed during pass 3.** It
   read exit 1 / `MISSING src/modules/organization/setup/org-setup-completed-consumer.service.ts`
   (from `f4c7bdf5`, before this pass started). `deff6b6f` landed the suite while pass 3 was
   running and the gate now reads exit 0. Left here so the sequence is legible, not as open work.
2. **`openapi.json` is stale for five paths.** Regeneration boots the app and would sweep every
   agent's in-flight routes into one 7 MB artifact diff across two repos — a release-time step for
   the orchestrator, not a per-agent one. Two things unblock behind it: `pnpm openapi:check`, and
   the one-line nav flip in (3).
3. **One line waiting on (2).** `components/layout/sidebar/sidebar-nav-groups-work-management.ts`
   gates `/build/settings/integrations` on `settings:manage`. It should read `integrations:git:view`
   so a `BUILD_MODULE_ADMIN` sees the item, but `check:route-access-contract` reads the vendored
   `frontend/contracts/openapi.json` and fails on a nav key no *generated* operation carries.
   Measured both ways: flipped → exit 1; reverted → exit 0. Land the flip with the regeneration.
4. **`hooks/api/crm/custom-fields.ts` reads a capped page now.** `{ fields }` became
   `{ fields, pagination }` (default 50, cap 100) and the projection now returns `name`/`sortOrder`,
   which is what the hook's own type already declared — that half is a drift repair. An org with
   more than 50 CRM custom fields sees 50 until the hook follows the cursor. `hooks/api/**`
   response contracts belong to another agent.
5. **The nine routes still at `/settings/*`.** Custom fields (4) is now mechanical: the route is
   provably CRM-only in both directions, so mint `crm:custom-fields:view|manage` and move it under
   `/crm/settings/*`. Automations (6) genuinely spans CRM, HR, Support and Accounting and needs a
   product decision on ownership before a key can be named.
6. **`backend/CLAUDE.md` §5 still says a template key addition "must ship a backfill migration
   too".** Unchanged from pass 2, and following it still produces a dead migration. Replacement
   wording is in P2.0.

---

## P2.0 — Does box 7 need a backfill migration, or does the reconciler already satisfy it?

**Answer: it does not need one, and a migration structurally cannot do the job.** Measured, not
reasoned — on a local scratch database built from the migration chain
(`scratch_t19_rbac`, schema restored from a head DB, 943 tables, `modules_catalog` copied).

The script seeds one organisation the way the product seeds one — `permissions` filled with the
**previous** release's catalog (692 of 698 keys, the six `0990` targets withheld), `seedSystemRolesForOrg`
run against it, and a `CUSTOMER_SUPPORT` role materialised the way `RoleSeedService` does
(`is_system = false`, `version = 1`). Then it applies `0990` verbatim, then boots
`PermissionCatalogSyncService.onModuleInit()`.

```
catalog at previous release: 692 keys (full catalog 698)
seeded: roles=45 grants=1443
CUSTOMER_SUPPORT (is_system=false, version=1) holds 34 of the template's 40 keys
  of the six keys 0990 targets it holds: 0

--- migration 0990 applied ---
grants inserted by 0990: 0
rows matching its predicate (is_system=true AND slug='CUSTOMER_SUPPORT'): 0
rows matching the shape that actually exists (is_system=false): 1

--- boot: PermissionCatalogSyncService.onModuleInit() ---
catalog after sync: 698 keys
grants inserted by the reconciler: 18
  on CUSTOMER_SUPPORT, of the six keys 0990 targeted: 6 / 6
  CUSTOMER_SUPPORT total grants now: 40 (template declares 40)
  SUPPORT_MODULE_MEMBER (version=2, administered): 5 -> 5 grants (must not change)

second boot inserted: 0 grants (must be 0)
```

Read that in order:

1. **`0990` grants zero rows and always will.** Its predicate names a `ROLE_TEMPLATES` slug with
   `is_system = true`; the product only ever creates that slug with `is_system = false`. Zero rows
   match, so both statements — the grant and the `access_versions` bump that re-uses the same
   predicate — are no-ops. This is the trap the brief warns about, confirmed by counting rows rather
   than by reading SQL.
2. **The reconciler delivers all six**, plus 12 more to `SUPPORT_MODULE_ADMIN` and
   `SUPPORT_MODULE_OWNER`, and converges `CUSTOMER_SUPPORT` on the whole 40-key template.
3. **It refuses to touch an administered role.** `SUPPORT_MODULE_MEMBER` was moved to `version = 2`
   before the boot and came back unchanged, so an owner's deliberate narrowing is never resurrected —
   the invariant `seed-system-roles.spec.ts` protects.
4. **It is idempotent.** A second boot inserts nothing.

**Why a migration cannot replace it, restated precisely.** `role_permission_grants.permission_key`
has a foreign key to `permissions.name`, and `permissions` is filled by
`PermissionCatalogSyncService` at boot — after `db:migrate`. A backfill for a key introduced in the
same release therefore finds no catalog row, its mandatory `EXISTS` guard skips the key, and nothing
re-runs. That is why `PermissionCatalogSyncService.onModuleInit` calls the reconciler itself rather
than the reconciler owning a lifecycle hook: the ordering is the mechanism.

**What landed for this box**

- `backfill-slugs-exist.spec.ts` was red on `0990` and is now green **without suppressing it.**
  `0990` is recorded in a new, separate `SUPERSEDED_BY_RECONCILER` list — never appended to
  `KNOWN_INERT_BACKFILLS`, whose "must not grow" contract is intact at 9 entries — and the list
  carries a proof obligation: a new test asserts every permission key the superseded migration named
  is one the reconciler actually grants for the slug it named. Bite-proved: deleting
  `support:tickets:view` from the `CUSTOMER_SUPPORT` template turns it red (1 failed / 7 passed),
  file restored, sha verified. A third test pins that the reconciler still reads `ROLE_TEMPLATES`,
  because supersession is only true while it does.
- `buildDesiredGrants(catalog)` was extracted from the service as a pure exported function so the
  spec asserts against the real computation rather than against a comment.

**Constitution amendment needed — not applied, `backend/CLAUDE.md` is not my file to rewrite.**
§5 still says: *"Any change that adds a permission key to a template must ship a backfill migration
too, or it is inert everywhere that already exists — see `0436` for the shape."* That instruction now
produces a dead migration every time it is followed. It should read: a template or seeded-rung
widening is delivered by `RoleGrantReconcilerService` at the next boot for every role still at
`version = 1`; a migration is the wrong mechanism and cannot work for a key new in the same release.

---

## P2.1 — P0 found while proving the above: organisation creation is broken at head

`seedSystemRolesForOrg` raises `23503` and rolls back the whole organisation.

```
insert or update on table "roles" violates foreign key constraint "fk_roles_module"
Key (module_key)=(feedbucket) is not present in table "modules_catalog".
```

Chain of causes, each verified:

- `600b9b7c` (30 Aug, *"register feedbucket and settings, which controllers already required"*) added
  `feedbucket` to `MODULE_REGISTRY` as `planGated: true, ladder: "delegable"`. That puts it in both
  `MODULE_CATALOG` and `ACCESS_MANAGED_MODULES`, hence in `MODULE_ADMIN_MODULES` — 14 modules.
- `seedSystemRolesForOrg` therefore mints `FEEDBUCKET_MODULE_ADMIN` with `module_key = 'feedbucket'`.
- Migration `0634` gave `roles.module_key` a foreign key to `modules_catalog`. `NOT VALID` skips
  existing rows, **not** new inserts.
- No migration ever inserts `feedbucket` into `modules_catalog`. `0337`, `0372`, `0440`, `0441`,
  `0443`, `0463` insert 19 module keys between them and none deletes any; `feedbucket` is not among
  them, and it is absent from `modules_catalog` in every head database checked.
- `OrgProfileService.createOrganization` calls the seeder **inside** the creation transaction
  (`org-profile.service.ts:366`), so the failure is not partial — the organisation is never created.

Nothing catches it: `administering-module-exists.spec.ts` checks the registry against itself, and
every spec that exercises the seeder mocks the database.

**New gate, and it is deliberately RED:** `src/modules/rbac/__tests__/seeded-role-modules-are-catalogued.spec.ts`
asserts every module in `MODULE_ADMIN_MODULES` has a `modules_catalog` row created by some migration.
It reports exactly one offender, `feedbucket`. It is left red rather than pinned because the offender
is fixable, and pinning it would be the same mistake `KNOWN_INERT_BACKFILLS` exists to record.

**The fix is one statement and it is a migration, so it is not mine to land** — `migrations/` is
ticket 03's, and they added `1001`/`1002` while this ran. Ready to paste, numbered by whoever owns
the journal:

```sql
SET lock_timeout = '5s';
--> statement-breakpoint
INSERT INTO "modules_catalog"
  ("module_key", "name", "description", "is_core", "is_paid_only", "sort_order", "status")
VALUES ('feedbucket', 'Feedbucket', 'Embeddable feedback widget and its submissions',
        false, false, 13, 'ACTIVE')
ON CONFLICT ("module_key") DO NOTHING;
```

The alternative fix — dropping `ladder: "delegable"` from the registry entry, since feedbucket has
`route: null` and `productKey: null` and arguably needs no admin rung — lives in `src/common/`, also
outside this ticket. Either closes the gate; somebody has to choose.

---

## P2.2 — Box: role, grant and module-access CRUD (strict Zod · stable OpenAPI · idempotent · owner protection)

| Sub-criterion | Verdict | Evidence |
|---|---|---|
| Strict Zod | PASS in territory, **one gap outside it** | `rbac.schemas.ts`, `principal-groups.schemas.ts`, `organization.schemas.ts`, `org-hierarchy.schemas.ts` are strict at every object. `settings.schemas.ts` was 12 strict of 32 objects and is now **32 of 32** — the nine `actions[].config` objects, the nine discriminated-union members, `automationConditionSchema` and the two `options[]` element objects were all stripping silently. Three new tests pin it. **Gap, not mine:** `module-access.schemas.ts:38`, the `items[]` element of `setModuleRolePermissionsSchema`, is the one non-strict object left on this surface — a typo'd key inside a role-permission write is stripped and returns 200 |
| Stable OpenAPI | PASS by artifact, freshness **not run** | The pass-1 "no document is built" claim is stale: `openapi.json` is committed (7 MB, 3613 operations) and six gates read it — `check:openapi-coverage` (3613/3613 exposure-stamped, 3613/3613 error-shaped, 1371/1371 mutating ops with a body schema), `check:operation-ids` (0 duplicates across 2676 paths), `check:openapi-path-params` (3613 checked), `check:contract-registry` (3625 classified; all 101 published ops carry a version, consumer, **idempotency/replay rule** and parameter baseline), `check:contract-breaking-change` (0 breaking), `check:envelope-consistency` (0). All exit 0. `openapi:check` — the regenerate-and-diff freshness gate — is **not run**: it boots the Nest application, and boot now runs `PermissionCatalogSyncService.onModuleInit`, which would write grants into the shared Neon database. My changes cannot drift the document anyway: `x-exposure` records the exposure *class*, not the permission key, and `@Idempotent` is not stamped |
| Idempotent mutations | PASS for role and grant CRUD; **4 named gaps in module-access** | Pass 1's "zero `@Idempotent` in rbac" is stale — `rbac.rolePermission.assign`, `rbac.roles.seedDefaults`, `rbac.role.materializeTemplate`, `rbac.role.addMember`, `rbac.principalGroup.create|addMember|assignRole` all carry it, as do four settings creates. Added here: `settings.userRole.update` (`POST /settings/users/:userId/role`) and `organization.workspaceOnboarding.generate` — the bulk org-structure generator, the most replay-dangerous mutation in the module. Every other mutation on these controllers is a `PATCH`/`PUT`/`DELETE` on a specific id, idempotent by end state. **Not mine:** `module-access.controller.ts` `createGroup` is a true replayable create with no fence; `grantAdminStanding`, `addGroupMember`, `addMember` are end-state idempotent. Adding the decorator is safe from the browser — `frontend/lib/api-client.ts:151` sets an `Idempotency-Key` on every non-public mutating request and reuses it across the 401 retry |
| Owner/descendant protection | PASS | `check:owner-authority` exit 0 — "nothing fabricates ownership and every owner gate reads the catalog", 12 named SKIPs. `assertTargetNotOwner`, `assertNotLastStructuralAdmin`, `assertPermissionsGrantable` (refuses the whole `billing:` namespace on every path), `isImmutableSystemRole`, `assertOwnerOnly`. Pinned by `role-structural-lockout`, `suspended-member-authority`, `assert-role-assignment`, `prd-s6-10-2-invariants` |

**Also fixed on this surface** (found while auditing, both in territory):

- `GET|POST|DELETE /settings/api-keys*` create and revoke **organisation-wide** API keys but were
  declared `@RequirePermission("settings:api-tokens:read|write")` — keys that
  `ROLE_DEFAULT_PERMISSIONS` grants to **`MEMBER`**, because they were minted for the *personal*
  token surface (`features/settings/api-tokens/personal-api-tokens-page.tsx`,
  `hooks/api/user-api-tokens.ts`). Only the in-service `isStructuralOrgAdminContext` check stood
  between every member and an org API key; delete that check as redundant — the obvious next
  cleanup, since "the permission already gates it" — and the hole opens. Re-gated on
  `settings:manage`, which is exactly the authority the service enforces. No consumer breaks:
  grep finds no frontend caller of `/settings/api-keys` at all.
- `revokeApiKey` issued its `UPDATE` keyed on `id` alone. Now `and(eq(id), eq(orgId))`, per §4's
  "re-assert the predicate on the mutation, not only on the preceding read".

---

## P2.3 — Box: effective-permission resolution batched and cached; scope bounded; indexes cover every path

**Both pass-1 failures are repaired — by another territory, verified here.**

| Sub-criterion | Verdict | Evidence |
|---|---|---|
| Batched and cached | PASS | Four reads in one `Promise.all`, owner and org-admin short-circuit, result under the version-keyed `accessPerms`. `access-resolution-cost.spec.ts` measures pooled-connection borrows cold vs warm |
| Scope expansion bounded | **now PASS** | The unordered `.limit(500)` at `access-permission.resolver.ts:283` is gone; `drainRolePermissionGrants` is a keyset drain ordered by `id`, and the comment records the 564-key arithmetic that motivated it |
| Permission-path index | **now PASS** | `idx_role_permission_grants_org_key (org_id, permission_key)` created by migration `0997`; confirmed present in `pg_indexes` on a head database. `check:tenant-indexes` — 745/745 |
| Residual, **not mine** | `access-permission.resolver.ts:230` still reads `user_permission_grants` for one membership under an unordered `.limit(500)`. The unique key is `(org_id, membership_id, permission_key)`, so a person can hold up to 698 rows — the identical defect at a later trigger, and the reason this box is marked PARTIAL rather than closed. Four sibling caps (role assignments, group members, module ownerships, group-role assignments) are bounded by real-world cardinality and are lower risk |

---

## P2.4 — Box: global Settings holds organisation configuration and access governance ONLY

**Frontend: PASS.** 23 pages under `app/(authenticated)/settings/**`, every one organisation
configuration (`organization/*` and its 8 hierarchy screens, `modules`, `billing`, `billing/ai-credits`,
`incoming-transfer`) or access governance (`roles/*`, `users`, `delegations`, `audit-log`,
`api-tokens`, `webhooks`). Custom fields, automations, integrations and import/export appear **only**
in module trees — 58 module `settings` pages across 15 modules. Workforce is at `/directory/workers`,
payroll administration under `/payroll/*`; neither is reachable from `/settings/*`.

**Backend: FAIL. 15 of `SettingsController`'s 23 routes are module-owned surfaces at a global path,
and every one of them 403s for the module administrator who owns the screen.** Each row below is the
route, the module that actually consumes it (traced to the calling hook and the page that renders it),
and who holds its gate — evaluated against the live catalog, not assumed:

| Global route (count) | Real owner, by consumer | Gate | Who holds it |
|---|---|---|---|
| `/settings/custom-fields[…]` (4) | **CRM only** — `hooks/api/crm/custom-fields.ts` → `/crm/settings/custom-fields`. Its own `createCustomFieldSchema.entityType` is `z.enum(["lead","deal","contact"])`, so the "global" engine only accepts CRM entities. HR and Support built their own | `settings:custom-fields:manage` | ORG_ADMIN, OWNER. **No seeded rung, no template** |
| `/settings/automations[…]` (6) | CRM + HR + Support + Accounting, all via `hooks/api/automations.ts`. The `workflows` module exists and is where this belongs | `settings:automations:view` / `:manage` | ORG_ADMIN, OWNER. **No seeded rung, no template** |
| `/settings/integrations/git[…]` (4) | **Build** — `hooks/api/git-integration.ts` → `/build/settings/integrations` | `settings:manage` | ORG_ADMIN, OWNER |
| `/settings/ai-usage` (1) | **CRM** — `hooks/api/ai.ts` → `/crm/settings/ai`. Operational reporting, not configuration | `settings:manage` + in-service org-admin check | ORG_ADMIN, OWNER |

> A `CRM_MODULE_ADMIN` cannot open CRM's own custom-fields or automations screen. A `BUILD_MODULE_ADMIN`
> cannot open Build's own git integrations. Module administration currently requires organisation-settings
> authority, which is precisely the standing the six-standing constitution says it should not require.

The 8 legitimately global routes: `provenance`, `permissions`, `api-keys` ×3, `feature-flags` ×2,
`users/:userId/role`.

Two further defects on the same surface, named for whoever lands the move:

- `GET /settings/custom-fields` is gated on a **`manage`** key, so there is no view-only rung at all —
  and `listCustomFields` is a bare `.select()` (SELECT \*) with **no `limit` and no cursor**, against
  CLAUDE.md §3's hard cap of 100.
- `POST /settings/users/:userId/role` duplicates `PATCH /organization/members/:memberId`. Two
  implementations of "change a member's org role" in two modules; pass 1 found the identical
  session-cache bug in both, which is what a duplicate costs.

**Status: PARTIAL, and the blocker is now smaller than it was.** The right fix is to move these
routes under their owning modules with module-namespaced keys — that spans six module controllers and
the frontend PermissionKey union, both outside this ticket. The cheap interim (widen
`MODULE_ADMIN_EXTRA_KEYS`) **no longer needs a backfill migration**: P2.0 proves the reconciler
converges every pristine rung at the next boot, so that half of the blocker is gone. What remains is a
genuine product decision with a sharp edge: **`settings:custom-fields:manage` and
`settings:automations:*` are not module-scoped.** Granting `settings:custom-fields:manage` to
`CRM_MODULE_ADMIN` would let them manage HR's and Support's field definitions too — the service filters
by `entityType`, never by the caller's module. Widening the rung trades a 403 for a cross-module
privilege. Move the routes, or mint module-namespaced keys; do not widen the global one.

---

## P2.5 — Coordinator hand-ins, both closed

**`check:tenant-isolation`: 924 / 926 with 2 MISSING (FAIL) → 926 / 926, 0 MISSING (exit 0, PASS).**
Of the two, `role-grant-reconciler.service.ts` was mine; `cron-gdpr-export-retention.service.ts` was
closed by another agent during this session.

`src/modules/rbac/role-grant-reconciler-tenant-isolation.spec.ts` — a real cross-tenant negative test,
not a class name dropped into an unrelated file. There is no controller here and so no 404-vs-403
question: the reconciler is a `forEachOrg` sweep, and the boundary it can breach is a *write* landing
under the wrong `org_id`. The assertion sits where `orgId` reaches the query — the two keyset drains
and the insert — and the fake db evaluates the real predicates.

The trap row is the point. `role_permission_grants.role_id` is an integer unique only per
organisation, so organisation B legitimately holds a grant naming role id 1 while organisation A's own
role *is* id 1. Both bite proofs were run, and the file restored with its sha verified:

```
as landed                                                        4 passed / 4
eq(rolePermissionGrants.orgId) stripped from drainHeldGrantKeys  2 failed / 4
   — A reads B's row as its own, skips the insert, loses a permission silently
eq(roles.orgId) stripped from drainCandidateRoles                3 failed / 4
   — A's sweep reconciles B's role and stamps A's orgId on the rows it writes
```

Getting there needed two extensions to the shared doubles, both additive:

- `src/test/sql-predicate.ts` could not evaluate `inArray`. Drizzle renders it as a bare parameter
  array — no parentheses, no separators — and the parser only handled the `in (…)` form, so every
  predicate in the reconciler threw. Both shapes are now handled; the empty case still throws.
- `src/test/fake-select-db.ts` gained a persisting `InsertBuilder` (`values` / `onConflictDoNothing` /
  `onConflictDoUpdate` / `returning`, with property→column encoding and serial `id` assignment)
  **behind an opt-in `{ persistInserts: true }`**, so a spec about what a write does can select the
  row back. Default behaviour is byte-identical; all 9 existing consumers re-run green (9 suites / 58
  tests).

**`check:spec-typecheck`:** `permission-catalog-sync.service.spec.ts(72,21)` "Expected 2 arguments,
but got 1" is fixed — the spec now constructs the real `RoleGrantReconcilerService` with the same fake
db rather than inventing a stub, and `sync()` never calls it. The gate still exits 2 on **4 errors,
none in this territory**: `src/common/tenant/tenant-context.interceptor.ts(89,53)` (`TENANT_REQUEST_DEADLINE_MS`
undefined — an in-flight edit in `src/common/`, and it is a real error in `src/`, not a spec) and
three arity errors in `payroll/filings/__tests__/filings-list-pagination.spec.ts`.

---

## P2.6 — Product decision resurfaced, with a recommendation

The pass-1 note — *"CUSTOMER_SUPPORT grants only 7 of 22 support keys and omits `support:tickets:view`"* —
is **stale**. Measured against the live catalog:

```
support keys in catalog                 25
SUPPORT_MODULE_ADMIN / _OWNER           25
SUPPORT_MODULE_MEMBER                    9   (view/read only)
CUSTOMER_SUPPORT template               11 of its 40 keys are support:*
```

`CUSTOMER_SUPPORT` now carries `tickets:view|create|reply|manage`. It still omits
`support:tickets:internal_note`, so a templated agent can answer a customer but cannot leave a note
for a colleague.

**The live defect is one rung down, and it is the one a real support agent gets.**
`SUPPORT_MODULE_MEMBER` — what `seedSystemRolesForOrg` hands a member of the support module in a new
organisation — is built by `buildModuleMemberPermissionKeys`, which filters the namespace to keys
ending `:view`/`:read`. It holds `support:tickets:view` and **not** `create`, `reply` or
`internal_note`:

```
support:access:view, support:kb:view, support:macros:view, support:tickets:view,
support:reports:view, support:csat:view, support:ai:view, support:portal:tickets:view,
support:knowledge-gaps:view
```

A seeded support agent can read the inbox and cannot answer it.

**Recommendation — two changes, and they are independent:**

1. **Give the support member rung its verbs.** Add `support:tickets:create`, `support:tickets:reply`
   and `support:tickets:internal_note` to `MODULE_MEMBER_EXTRA_KEYS.support` in `seed-system-roles.ts`.
   This is now a one-file change: the reconciler backfills every existing organisation whose
   `SUPPORT_MODULE_MEMBER` is still pristine at the next boot, and an organisation that deliberately
   narrowed the rung keeps its narrowing. Held back here only because it widens what a member can do,
   which is a product call and not an auditor's.
2. **Decide `manage ⇒ view` once, globally.** It is still absent from resolution: `impliedViewKey`
   (`module-access/module-role-permissions.ts:63`) is applied only by `normalizeModulePermissionItems`
   on the module-access *write* path, and `computeUserPermissions` applies only
   `deriveAccessViewImplication`, whose map covers `<module>:access:manage → :view` and nothing else.
   Recommend implementing the general rule in `computeUserPermissions` using the existing
   `impliedViewKey` (it derives the sibling read key from the **last** segment, so it is arity-safe per
   §5). "Can manage but 403s on the list" is not a state anyone intends, and it recurs. Caveat: it must
   add only the `:view` sibling — `<module>:access:manage` is deliberately view-only, and an implication
   that added anything else would break that. Note this does **not** rescue the support agent, who
   holds no support `manage` key at all; recommendation 1 is still required.

---

## P2.7 — Gates run in pass 2. Every number below was executed and read.

| Command | Exit | Result |
|---|---|---|
| `pnpm check:permission-keys` | 0 | 3116 `@RequirePermission` usages, 627 unique keys; backend catalog 698, frontend union 696; all resolve |
| `pnpm check:scope-application` | 0 | 140 scope resolutions, 140 applied |
| `pnpm check:module-entitlement` | 0 | PASS |
| `pnpm check:owner-authority` | 0 | nothing fabricates ownership; 12 named SKIPs |
| `pnpm check:module-gate` | 0 | PASSED |
| `pnpm check:openapi-coverage` | 0 | 3613 ops; 3613/3613 exposure-stamped, 4xx-shaped and response-schemad; 1371/1371 mutating ops have a body schema |
| `pnpm check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent`; 11 named exclusions |
| `pnpm check:route-classification` | 0 | 0 undeclared |
| `pnpm check:tenant-isolation` | 0 | **926 / 926** (was 924 / 926, FAIL) |
| `pnpm check:cache-invalidation` | 0 | 0 blockers |
| `pnpm check:operation-ids` | 0 | 3613 ops / 2676 paths, 0 duplicates |
| `pnpm check:contract-registry` | 0 | 3625 classified; 101 published ops carry a replay rule |
| `pnpm check:contract-breaking-change` | 0 | 0 breaking changes |
| `pnpm check:route-duplicates` | 0 | 0 findings |
| `pnpm check:envelope-consistency` | 0 | 0 violations |
| `pnpm check:openapi-path-params` | 0 | 3613 checked |
| `pnpm check:unbounded-reads` | 0 | no gate violations |
| `pnpm check:migration-rollback` | 0 | 646 scanned |
| `pnpm typecheck` | **0** | 0 errors, 0 output lines (exit code read, not grepped) |
| `eslint` on the 12 changed files | 0 | 0 errors, 0 warnings |
| `jest --testPathPattern="src/modules/(rbac\|settings\|auth\|organization)"` | 1 | **105 suites passed / 106 run, 647 tests passed / 652.** The single failure is `seeded-role-modules-are-catalogued.spec.ts`, the deliberately red P2.1 gate |
| `jest --testPathPattern="role-grant-reconciler-tenant-isolation"` | 0 | 4 / 4 |
| `jest --testPathPattern="backfill-slugs-exist"` | 0 | 8 / 8 (was 1 failed / 5) |
| `jest --testPathPattern="settings.schemas.spec"` | 0 | 14 / 14 (was 11) |
| the 9 `makeFakeDb` consumers | 0 | 9 suites / 58 tests |
| scratch-DB reconciler proof | 0 | numbers in P2.0, against `scratch_t19_rbac` only |
| `pnpm check:spec-typecheck` | 2 | 4 errors, **none in this territory** (P2.5) |
| `pnpm check:migration-discipline` | 1 | 2 `no-journal` violations, **not mine** — `1001_s08_payroll_financial_immutability.sql` and `1002_s08_payroll_read_path_indexes.sql`, both untracked and landed by another agent mid-session |
| `pnpm openapi:check` | — | **not run.** Boots the app, and boot now writes grants; it would reach the shared Neon database |
| `pnpm check:navigation-permissions` | — | **not run.** Still assumes the Windows repo layout (`REPO_ROOT/frontend`) |
| `pnpm check:tenant-isolation:run` | — | **not run** |

---

## P2.8 — Files changed in pass 2

| File | Change |
|---|---|
| `src/modules/rbac/role-grant-reconciler.service.ts` | extracted `buildDesiredGrants(catalog)` as a pure exported function; the method delegates to it |
| `src/modules/rbac/role-grant-reconciler-tenant-isolation.spec.ts` | **new** — cross-tenant negative test, 4 cases, both bite proofs run |
| `src/modules/rbac/__tests__/backfill-slugs-exist.spec.ts` | `SUPERSEDED_BY_RECONCILER` list + two proof tests; `KNOWN_INERT_BACKFILLS` untouched |
| `src/modules/rbac/__tests__/seeded-role-modules-are-catalogued.spec.ts` | **new** — the deliberately red `feedbucket` gate |
| `src/modules/rbac/permission-catalog-sync.service.spec.ts` | constructor arity; builds the real reconciler with the same fake db |
| `src/modules/settings/dto/settings.schemas.ts` | 20 nested objects made `.strict()` — 32 of 32 |
| `src/modules/settings/dto/settings.schemas.spec.ts` | 3 tests pinning nested strictness |
| `src/modules/settings/settings.controller.ts` | `@Idempotent("settings.userRole.update")`; the three org API-key routes re-gated on `settings:manage` |
| `src/modules/settings/settings.service.ts` | `revokeApiKey` re-asserts `org_id` on the `UPDATE` |
| `src/modules/organization/onboarding/workspace-onboarding.controller.ts` | `@Idempotent("organization.workspaceOnboarding.generate")` |
| `src/test/sql-predicate.ts` | parse `inArray`'s bare parameter-array form |
| `src/test/fake-select-db.ts` | opt-in persisting `InsertBuilder` |

No migration was added. No file under `migrations/`, `src/db/schema/`, `src/common/` (other than
`src/test/`), `src/modules/access/`, `src/modules/module-access/` or the frontend was touched.
`src/modules/rbac/role-seed.service.ts` (ticket 14's) was read only.

---

## P2.9 — Handoffs

**P0 — migrations owner (ticket 03).** `feedbucket` has no `modules_catalog` row, so organisation
creation raises `23503` and rolls back. One `INSERT`, written out in P2.1.
`seeded-role-modules-are-catalogued.spec.ts` stays red until it lands.

**P0 — whoever owns `backend/CLAUDE.md`.** §5's "must ship a backfill migration too" now produces a
dead migration every time it is followed. Replacement wording in P2.0.

**P1 — the `modules/access` owner.** `access-permission.resolver.ts:230` reads `user_permission_grants`
under an unordered `.limit(500)` against a per-membership key space of up to 698. Same defect as the
one just repaired two functions away, later trigger.

**P1 — product + the six module owners.** 15 of `SettingsController`'s 23 routes are module surfaces
at a global path and 403 for their own module admins (P2.4). The migration half of the blocker is
gone; the remaining one is that the `settings:*` keys are not module-scoped, so widening a rung leaks
across modules.

**P1 — `src/common/` owner.** `src/common/tenant/tenant-context.interceptor.ts(89,53)` references an
undefined `TENANT_REQUEST_DEADLINE_MS`. This is an error in `src/`, not a spec; it appeared mid-session
and is red in `check:spec-typecheck`.

**P2 — the `module-access` owner.** `module-access.schemas.ts:38` `items[]` is the last non-strict
object on the role/grant/module-access write surface. `module-access.controller.ts::createGroup` is a
replayable create with no `@Idempotent`.

**P2 — product.** `SUPPORT_MODULE_MEMBER` can read the inbox and not answer it; and `manage ⇒ view`
is still not implemented anywhere on the resolution path. Recommendations in P2.6.

**P2 — repo hygiene.** `check:navigation-permissions` still cannot run on this machine's layout.

---
---

# Pass 1 (superseded where P2 restates it — inventory below is still current)

Scope: `BE/src/modules/{auth,rbac,organization,settings}/**` plus the FE `features/settings/**` and
`hooks/api/access.ts` consumers. `BE/migrations/**`, `BE/src/db/schema/**`, `BE/src/common/**`,
`BE/src/modules/access/**`, `BE/src/modules/module-access/**` and `FE/app/**` were **read** for the
verdicts below and **not edited** — they belong to other tickets.

---

## 0. Headline defect — the backfill criterion is FAILED, and the repo's own gate says so

The brief's premise is partly stale and the real defect is worse than described. Corrected, verified account:

**a) The template was already widened.** `role-templates.constants.ts:47` `CUSTOMER_SUPPORT` now carries
11 of the 23 `support:*` keys, including `support:tickets:view|create|reply`, `support:reports:view`,
`support:knowledge-gaps:view`, `support:csat:view`. Ticket 01 landed this. Nothing further to grant.

**b) Migration `0990` grants zero rows in every organisation that exists, and always will.** Both of its
statements share this predicate:

```sql
WHERE r."is_system" = true AND r."slug" = 'CUSTOMER_SUPPORT'
```

`CUSTOMER_SUPPORT` is a `ROLE_TEMPLATES` slug. The only two code paths that ever create it —
`RoleSeedService.seedDefaultRoles` (`role-seed.service.ts:70`) and `RoleSeedService.seedFromTemplate`
(`role-seed.service.ts:132`) — both insert it with **`isSystem: false`**. `seedSystemRolesForOrg`, the
function that mints `is_system = true` rows, mints only `ORG_ADMIN`, `MEMBER`,
`<MOD>_MODULE_ADMIN|OWNER|MEMBER` (`seed-system-roles.ts:104-150`). **No row in the product satisfies
`is_system = true AND slug = 'CUSTOMER_SUPPORT'`.** This is exactly the trap
`__tests__/backfill-slugs-exist.spec.ts` was written to catch, and it does:

```
npx jest src/modules/rbac/__tests__/backfill-slugs-exist.spec.ts --maxWorkers=2
→ 1 failed / 5 passed
+   "0990_support_template_grant_backfill.sql: CUSTOMER_SUPPORT"
```

That red test is the ticket's finding. **Do not add `0990` to `KNOWN_INERT_BACKFILLS`** — that list
carries an explicit "must not grow" contract; suppressing it hides the bug.

**c) Correction to the brief: `access_versions` is NOT bumped either.** The brief says 0990 "bumps
`access_versions` while granting zero". It does not — the second statement re-uses the same dead
`is_system = true` predicate, so its `SELECT DISTINCT r."org_id"` is also empty. The migration is a
complete no-op. The `rollback/0990_*.down.sql` inherits the same predicate and is therefore also inert.

**d) The `permissions`-catalog hazard the brief names is real, but it is the second lock on the door,
not the first.** `role_permission_grants.permission_key` carries an FK to `permissions.name`
(`db/schema/common/access.ts:84-86`), so 0990's `AND EXISTS (SELECT 1 FROM permissions …)` guard is
*required* to avoid a `23503`. But `permissions` is populated by
`PermissionCatalogSyncService.onModuleInit` (`permission-catalog-sync.service.ts:41`), which runs at
**application boot**, i.e. after `db:migrate`. Consequence, stated precisely:

> **A migration can never backfill a grant for a permission key introduced in the same release.**
> At migration time the catalog row does not exist, the `EXISTS` guard skips the key, and nothing
> re-runs the backfill after boot creates the row.

This is a structural defect in the backfill pattern that `0436` established, and it will silently
neuter every future template-widening migration. It is not specific to support.

**Recommendation (not applied — migrations are out of my territory, and widening is a product call):**

1. A repair migration `0992` targeting the shapes that actually exist. Two candidate shapes, and the
   choice is a product decision:
   - `slug = 'CUSTOMER_SUPPORT' AND is_system = false` — repairs orgs that materialised the template.
   - `slug = 'SUPPORT_MODULE_MEMBER'` — see the gap in §4 below; this is the rung most seeded support
     agents actually hold.
2. Make the catalog a migration, not a boot hook — seed `permissions` from
   `buildPermissionCatalogRows` in an ordinary migration so backfills in the same release can see it.
   `src/scripts/seed-permissions.ts` already exists and does exactly this work; it is simply not
   wired into the migration chain.
3. Extend `backfill-slugs-exist.spec.ts`'s `seededShape` with an `is_system` check, so a grant naming
   a template slug **with** `is_system = true` is flagged as its own class of error.

**e) A second, larger inert gap on the same surface.** `buildModuleMemberPermissionKeys`
(`seed-system-roles.ts:82-90`) filters to keys ending `:view`/`:read`. So a seeded
`SUPPORT_MODULE_MEMBER` — the default rung for a support agent in a new organisation — receives 9 keys
and holds **`support:tickets:view` but neither `support:tickets:create` nor `support:tickets:reply`
nor `support:tickets:internal_note`**. Confirmed by evaluating `moduleScopedPermissions("support")`:

```
support keys: 25   member rung (view/read only): 9
support:access:view, support:kb:view, support:macros:view, support:tickets:view,
support:reports:view, support:csat:view, support:ai:view, support:portal:tickets:view,
support:knowledge-gaps:view
```

A seeded support agent can read the inbox and cannot answer it. Widening the member rung is a product
decision — **recommended, not applied.**

**f) `manage` ⇒ `view` is confirmed absent from resolution.** `impliedViewKey` exists only in
`module-access/module-role-permissions.ts:63` and is applied only by `normalizeModulePermissionItems`
on the module-access *write* path. `computeUserPermissions` applies only
`deriveAccessViewImplication` (`access-policy.ts:123`), whose `ACCESS_MANAGE_TO_VIEW_MAP`
(`access-policy.ts:20-32`) covers **only** `<module>:access:manage → <module>:access:view`. There is no
general implication. 0990's header comment states this correctly.

---

## 1. §10 inventory and verdicts

Counts are files on disk at audit time. Verdict is per group; every non-KEEP names its failure.

### `src/modules/auth/` — 19 files

| Item | Verdict | Failure named |
|---|---|---|
| `auth.module.ts`, `auth.service.ts` (336), `auth-tokens.service.ts` (210), `auth-membership-resolver.service.ts` (141), `auth-analytics.service.ts` (126) | KEEP | — |
| `auth-passwordless.service.ts` (451) | REFACTOR | 451 lines, over the 300 target; magic-link, OTP and Google OAuth in one file |
| `auth.controller.ts` (339) | REFACTOR | 339 lines. `POST auth/google`, `POST auth/session-exchange` and `GET auth/session-data/:userId` are declared `@Public()` but are gated in-handler by a plain `!==` compare against `INTERNAL_API_SECRET`. Two problems: (i) the exposure declaration reads "public" to `check:route-classification` and to the `x-exposure` OpenAPI stamp, understating the real gate — `@AuthorizedInService("INTERNAL_API_SECRET header")` is the honest declaration; (ii) unlike every other `@Public()` route on this controller these three call **no** `enforceRateLimit`, so a leaked shared secret mints sessions without a limiter. The compare is also not constant-time. |
| `dto/auth.schemas.ts` (60) | KEEP | 8 objects, 9 `.strict()` — all strict |
| 10 spec files incl. `jwt-guard-revocation.spec.ts`, `auth-otp-brute-force.spec.ts`, 4 tenant-isolation specs | KEEP | — |

No workers, no outbox emitters, no event consumers in this module. Cache keys touched:
`CACHE_KEYS.userSession` (`auth.service.ts:229`, TTL 60s), `CACHE_KEYS.membershipAccount`.

### `src/modules/rbac/` — 88 files

| Item | Verdict | Failure named |
|---|---|---|
| `permissions/` (37 catalog files + `role-defaults.ts` + `index.ts`), 698 keys | KEEP | `check:permission-keys` exit 0; `catalog-sync.test.ts` 8/8 both directions |
| `permissions/crm.ts` (434), `shared.ts` (421), `accounting.ts` (417), `build.ts` (367) | KEEP | Over 300 lines but they are flat data tables, not logic; splitting adds no seam |
| `role-templates.constants.ts`, `-crm-hr.constants.ts` (312), `-build.constants.ts`, `role-template.types.ts` | KEEP | — |
| `rbac.controller.ts`, `roles.controller.ts`, `principal-groups.controller.ts` | REFACTOR | Every one of the 40 handlers across the three is `@RequirePermission`-gated with `@Validate` — good. **Zero carry `@Idempotent`.** `POST roles/:roleId/members`, `POST roles/seed-defaults`, `POST roles/templates`, `POST principal-groups`, `POST principal-groups/:groupId/roles` are all replayable creates. 118 controllers elsewhere in the repo use `@Idempotent`; RBAC uses it nowhere. Criterion 10.2's "idempotent mutations" is not met. |
| `roles.service.ts` (362), `role-member.service.ts` (360), `role-permission.service.ts` (315), `principal-groups.service.ts` (337) | REFACTOR | All over the 300 target. Behaviour is sound: keyset-drained assignee invalidation, `bumpPermissionsVersion` in-transaction, `rolesList`/`userSession` busted on every write |
| `seed-system-roles.ts`, `role-seed.service.ts`, `assert-role-assignment.ts`, `roles-query.service.ts`, `permission-catalog-sync.service.ts`, `permission-catalog-rows.ts` | KEEP | — |
| `dto/rbac.schemas.ts`, `dto/principal-groups.schemas.ts` | KEEP | All object schemas `.strict()` |
| 25 spec files | KEEP | 1 red — `__tests__/backfill-slugs-exist.spec.ts`, and it is red **correctly** (§0). Do not silence. |

Cache keys: `CACHE_KEYS.rolesList(orgId)`, `CACHE_KEYS.userSession(userId)`, `access:version` via
`bumpPermissionsVersion`. No workers, no outbox, no event consumers.

### `src/modules/organization/` — 120 files

| Item | Verdict | Failure named |
|---|---|---|
| `core/organization.controller.ts` (469, 32 handlers), `core/org-profile.service.ts` (440), `core/org-membership*.ts`, `core/invitation*.ts`, `core/lifecycle/*` | KEEP | Only controller in the four modules that uses `@Idempotent` (`organization.create`). Keyset pagination throughout, cap 100 enforced by `PAGE_SIZE_CAP` |
| `core/membership-artifacts.ts` (**2496**) | REFACTOR | 2496 lines — 8× the target and the largest file in the four modules by a factor of five. It is a schema-derived artifact inventory; it should be generated or split per artifact family, not hand-maintained at this size |
| `core/org-purge.service.ts` (449) | **DO NOT TOUCH — in-flight** | Currently contributes 2 of the 7 live `tsc` errors (see §5). Another agent is mid-landing a keyset drain here; a new spec `org-purge-member-drain.spec.ts` appeared during this audit |
| `core/invitation-acceptance.service.ts` (509), `hierarchy/org-hierarchy.service.ts` (495), `hierarchy/org-hierarchy.controller.ts` (447), + 8 more files 300–450 | REFACTOR | Over the 300 target |
| `core/organization-settings.service.ts` (394) | REFACTOR | Over 300. Also `listHolidays` (`:284-291`) and `listCustomDomains` (`:331-338`) use bare `.select()` (SELECT \*, returning raw ORM rows — CLAUDE.md §1) behind `.limit(1000)` / `.limit(100)` with no cursor |
| `hierarchy/**` (6 unit-kind services + command/read/tree-source/dependencies) | KEEP | Every list is cursor-paginated and cache-invalidated per `org:units:<KIND>` |
| `hierarchy/org-hierarchy-tree-source.service.ts` `.limit(10000)` (`:141,:150`) | REFACTOR | A `.limit(10000)` on a whole-tree load is a silent-truncation cap on growing work (brief rule 7). Defensible for a tree render, but it must fail loudly or stream at the cap, not truncate |
| `onboarding/` (4 files + 2 specs) | REFACTOR | `POST workspace-onboarding/generate` bulk-creates a whole org structure from a template and carries **no `@Idempotent`** — the most replay-dangerous mutation in the module |
| `setup/announcements.schemas.ts` | REFACTOR | `createHrAnnouncementSchema` (`:87`) is **not** `.strict()` while its sibling `updateHrAnnouncementSchema` (`:89`) is. I attempted the one-line fix and **reverted it**: `__tests__/announcements-create.spec.ts:66` deliberately pins "strips unknown fields", so flipping strip→400 is an API contract change and a product call, not mine. The two schemas disagreeing is the defect; which way to unify is the decision. |
| `setup/org.controller.ts` `GET org/members` | REFACTOR | The only handler in the module with no `@Validate` — `search`/`limit` are hand-parsed, bypassing the Zod boundary |
| `core/integration-connection-disconnected-consumer.service.ts` | KEEP | Correct outbox/inbox pair with `OutboxWriter.emit` at `org-membership-access-revocation.ts:291` |
| 57 spec files | KEEP | 57/57 suites, 393/393 tests green |

Cache keys: `userSession`, `accessVersion`, `membershipAccount`, and tag namespaces
`org:settings`, `org:profile`, `org:members:list`, `rbac:members`, `module-access:candidates`,
`users:stats`, `org:ip-allowlist`, `org:units:<KIND>`, `branches:list`.

### `src/modules/settings/` — 16 files

| Item | Verdict | Failure named |
|---|---|---|
| `settings.controller.ts` (283) | REFACTOR | 14 of its 23 routes are not global settings — see §3 |
| `settings.service.ts` (350) | REFACTOR | Over 300. `listApiKeys` (`:122`) and `listGitConnections` (`:209`) have **no `.limit()` and no cursor** — unbounded per-org reads on endpoints with no pagination params. `updateFeatureFlag` (`:182`) is a read-modify-write of the whole `organizations.settings` JSONB outside a transaction: a concurrent `OrganizationSettingsService.updateSettings` silently loses `primaryColor`/`ipAllowlist`/`loginBgUrl`. `revokeApiKey` (`:170`) issues its `UPDATE` keyed on `id` alone without re-asserting `org_id` (the preceding `findFirst` does check it, so this is TOCTOU-only, but §4 mandates the predicate on the mutation) |
| `settings-custom-fields.service.ts` (96) | REFACTOR | `listCustomFields` (`:20-24`) is a bare `.select()` (SELECT \*, raw ORM rows) with no `.limit()` and no cursor |
| `settings-automations.service.ts` (133) | REFACTOR | `listAutomations` is correctly keyset-paginated. `listAutomationRuns` (`:119-131`) is a bare `.limit(50)` with no cursor — run history past the 50th is unreachable, which is silent truncation on an append-only stream |
| `dto/settings.schemas.ts` (266) | REFACTOR | All 12 top-level schemas `.strict()`. `automationConditionSchema` (`:123`) and the nine `config` sub-objects inside `automationActionSchema` (`:130-192`) are not — a typo'd key inside `actions[].config` is silently stripped and returns 201 |
| `ai-usage.query.ts`, `settings.helpers.ts` | KEEP / see §3 | — |
| 7 spec files | KEEP | 7/7 suites green |

No workers, no outbox emitters, no event consumers. Before this ticket the module cached **nothing**
and invalidated one key; see §2.

### Frontend

| Item | Verdict | Failure named |
|---|---|---|
| `app/(authenticated)/settings/**` — 24 route files across 8 areas | KEEP | Scope is clean; see §3 |
| `features/settings/**` — ~90 files across `api-tokens/`, `audit-log/`, `delegations/`, `organization/` (+`hierarchy/`), `roles/` (+`groups/`), `simulate/`, `webhooks/` | REFACTOR | 18 files over the 300-line target, led by `organization/org-danger-zone-section.tsx` (491), `delegations/delegations-page.tsx` (479), `organization/hierarchy/locations-page.tsx` (477), `delegations/grant-delegation-sheet.tsx` (466), `organization/hierarchy/branches-page.tsx` (462). The six `hierarchy/*-page.tsx` files (386–477) are near-duplicates of one list-page shape and are the highest-value extraction |
| `hooks/api/access.ts` (118) — `useAccess`, `useCan`, `useScope`, `usePermissionGate`, `useModuleEnabled`, `usePermissionCatalog`, `useRbacDiscovery*` | KEEP | — |
| `hooks/api/access/{org-modules,simulate,user-module-access}.ts`, `hooks/api/module-access/*`, `components/auth/require-module.tsx` | KEEP | — |
| Query keys `["streamlineos","access", …]`, `["streamlineos","moduleAccess", …]` | KEEP | Carry no `orgId` **by design** — isolation is structural, see §5 of the criteria below |
| ~40 test files across `features/settings/**`, `hooks/api/access*`, `lib/rbac/**`, `lib/query-scope-isolation.test.tsx`, `lib/prefetch/access.test.tsx` | KEEP | — |

---

## 2. Criterion — membership and session reads bounded and indexed; session, effective-access and organization caches invalidate immediately  ✅ (two defects found and FIXED)

**Bounded and indexed: PASS.** Every membership and session read is keyset-paginated or single-row.
`pnpm -s check:tenant-indexes` → **exit 0, 745 tenant tables / 745 with a leading tenant index.**
`org-read-keyset-pagination.spec.ts` pins the member-list cursor.

**Effective-access invalidation: PASS.** `CACHE_KEYS.accessPerms(orgId, userId, version)` is
**version-keyed**, so `bumpPermissionsVersion` rotates the key rather than racing a delete, and
`access-invalidate.ts` publishes on the channel *before* commit deliberately (a rolled-back grant
costs one wasted re-read; publishing after commit could miss one and honour a revoked grant). Proven
by `access-resolution-cost.spec.ts` — "re-reads the version after a bump rather than serving the
cached one". `syncStructuralRoleAssignment` calls `bumpPermissionsVersion` in the same transaction, so
a structural role change does invalidate resolution.

**Two organization/session cache gaps found — both fixed:**

1. **`SettingsService.updateFeatureFlag` wrote `organizations.settings` and invalidated nothing.**
   `OrganizationSettingsService.getSettings` caches that whole row under `org:settings` for
   `CACHE_TTL.MEDIUM`, and `getProfile` caches under the `org:profile` namespace. Toggling a feature
   flag therefore served the pre-toggle value for the full TTL. **Fixed** — the write now invalidates
   both, matching `OrganizationSettingsService.invalidateSettingsCache`.

2. **Neither role-change path busted the session cache.** `CACHE_KEYS.userSession(userId)` embeds
   `role`, `isOrgOwner`, `enabledModules` and `organizationAccess` with a 60s TTL
   (`auth.service.ts:229,333`). `bustMembershipStatusCache` busts `membership:account:<userId>` and the
   `membership:status:<userId>` namespace but **not** `user:session:<userId>`. Every membership
   *status* mutation (suspend/reactivate/remove/leave) goes through
   `org-membership-access-revocation.ts:369` and does bust it; the two *role* mutations did not:
   - `OrgMembershipService.updateMemberRole` (`org-membership.service.ts:211`)
   - `SettingsService.updateUserRole` (`settings.service.ts:351`) — a second, parallel implementation
     of the same operation

   Blast radius is bounded and is **not** an authorization bypass: `JwtAuthGuard` resolves standing
   through `MembershipStateService`/`membershipAccount`, which *was* busted, so guards deny correctly.
   The stale value is the session/profile *view* — a demoted admin keeps seeing admin chrome for up to
   60s. **Both fixed.**

**Proof, and it bites.** `settings-member-role-authority.spec.ts` gained a real `CacheService` double
(it was `{}`) plus two assertions. Removing the service-side invalidation and re-running turns the
success test red:

```
with fix:     3 passed / 3
invalidation stripped from settings.service.ts:  1 failed / 3   (file restored, sha verified)
```

**Remaining, not fixed:** the three unbounded reads in `settings.service.ts` / `settings-custom-fields`
(§1). They are not membership or session reads, so they do not block this criterion, but they violate
CLAUDE.md §2's "all list endpoints paginated, hard cap 100".

---

## 3. Criterion — global Settings holds organization configuration and access governance ONLY  ❌ FAILED on the backend

**Frontend: PASS, and cleanly.** All 24 global `/settings/*` routes are organization configuration
(`organization/*` incl. the 8 hierarchy screens, `modules`, `billing`, `incoming-transfer`) or access
governance (`roles/*`, `users`, `delegations`, `audit-log`, `api-tokens`). Custom fields, automations,
integrations and import/export exist **only** inside module trees — `/crm/settings/custom-fields`,
`/hr/settings/automations`, `/support/settings/automations`, `/accounting/settings/automations`,
`/build/settings/integrations`, `/hr/settings/import-export`, `/payroll/settings/import-export`.
Workforce is at `/directory/workers` and payroll administration under `/payroll/*`; **neither is
reachable from `/settings/*`** (grep of the global tree finds one descriptive subtitle string and no
link or import). One item to decide deliberately: `/settings/webhooks` is the closest thing left in
the global tree to an "integrations" surface.

**Backend: FAILED, and it produces a live 403.** The FE moved the screens; the BE endpoints did not
move with them. `SettingsController` still owns 14 of its 23 routes as module-owned surfaces:

| Route group | Gate | Belongs to |
|---|---|---|
| `GET/POST/PATCH/DELETE /settings/custom-fields[…]` | `settings:custom-fields:manage` | the entity's own module |
| `GET/POST/PATCH/DELETE /settings/automations[…]`, `…/:ruleId/runs` | `settings:automations:view|manage` | the workflow engine |
| `GET/POST/PATCH/DELETE /settings/integrations/git[…]` | `settings:manage` | build / dev-tools |
| `GET /settings/ai-usage` | `settings:manage` | AI module (and it is operational, not configuration) |

The module screens call those exact global endpoints — `hooks/api/crm/custom-fields.ts:50,62,74,86` →
`/settings/custom-fields`; `hooks/api/automations.ts:149-228` → `/settings/automations`. And the
gating keys are held by **nobody but the org owner and org admin**. Evaluated against the live
catalog:

```
settings:custom-fields:manage   module-admin rungs: NONE   ROLE_DEFAULT_PERMISSIONS: OWNER, ORG_ADMIN
settings:automations:manage     module-admin rungs: NONE   ROLE_DEFAULT_PERMISSIONS: OWNER, ORG_ADMIN
settings:automations:view       module-admin rungs: NONE   ROLE_DEFAULT_PERMISSIONS: OWNER, ORG_ADMIN
```

> **A `CRM_MODULE_ADMIN`, `HR_MODULE_ADMIN`, `SUPPORT_MODULE_ADMIN` or `ACCOUNTING_MODULE_ADMIN`
> opening their own module's custom-fields or automations screen gets a 403.** Six module settings
> trees are affected. Module administration currently requires organisation-settings authority.

The team already knows this shape: `MODULE_ADMIN_EXTRA_KEYS` (`seed-system-roles.ts:64-67`) patches
exactly this for `crm → settings:record-layouts:manage` and `hr → settings:view,
settings:organization:manage`. It was simply never extended to custom-fields or automations.

Two additional findings on this surface:
- `GET /settings/custom-fields` is gated on `settings:custom-fields:manage` — a **read gated by a
  manage key**, so there is no view-only rung at all.
- `POST /settings/users/:userId/role` duplicates `PATCH /organization/members/:memberId`. Two
  independent implementations of "change a member's org role" in two modules; both carried the
  identical session-cache bug fixed in §2, which is what a duplicate costs.

**Recommendation (not applied — widening a role rung is a product decision and needs a backfill
migration, both out of territory):** either move these routes under their owning modules' controllers
with module-namespaced keys, or — the cheap interim — add `settings:custom-fields:manage` and
`settings:automations:view|manage` to `MODULE_ADMIN_EXTRA_KEYS` for the six affected modules **plus a
backfill migration**, which per §0 must also solve the catalog-ordering problem.

---

## 4. Criterion — role/grant/module-access CRUD: strict Zod, stable OpenAPI, idempotent mutations, exhaustive owner/descendant protection  ❌ NOT MET

| Sub-criterion | Verdict | Evidence |
|---|---|---|
| Strict Zod contracts | PASS with one gap | `rbac.schemas.ts` 10 `.strict()`, `principal-groups.schemas.ts` 5, `organization.schemas.ts` 15/15, `org-hierarchy.schemas.ts` 19. Gaps: nested automation schemas (§1), `createHrAnnouncementSchema` (§1) |
| Stable OpenAPI | **BLOCKED** | `main.ts` builds no document outside development, and `recordRouteClassification`'s `x-exposure` stamp is dev-only. Cannot verify document stability on this machine without booting the API in dev and diffing two builds. `check:route-classification` does pass — **3602 handlers, 0 undeclared** — which is the guard the document is derived from |
| Idempotent mutations | **FAIL** | 118 controllers in the repo use `@Idempotent`. Across `auth` + `rbac` + `settings` there are **zero**; `organization` has exactly one (`organization.create`). Every role create, grant write, group-role assignment, template materialisation, seed-defaults call and the workspace-onboarding bulk generate is replayable. `PUT roles/:roleId/permissions` is the one write with real concurrency control — optimistic `roles.version` CAS returning 409 (`module-role-permissions.ts:171-180`), pinned by `role-permission-cas.spec.ts` |
| Owner/descendant protection | PASS | `assertTargetNotOwner`, `assertNotLastStructuralAdmin`, `assertMayGrantRole`, `assertPermissionsGrantable` (refuses the whole `billing:` namespace on every path incl. the owner's own), `isImmutableSystemRole`, `assertOwnerOnly` on archive/delete/purge/legal-hold. Pinned by `role-structural-lockout.spec.ts`, `suspended-member-authority.spec.ts`, `assert-role-assignment.spec.ts`, `prd-s6-10-2-invariants.spec.ts` |

---

## 5. Criterion — effective-permission resolution batched and cached; scope expansion bounded; indexes cover subject, role, permission, module and tenant paths  ❌ NOT MET

**Batched and cached: PASS.** `AccessPermissionResolver.computeUserPermissions`
(`modules/access/access-permission.resolver.ts:95`) issues four reads in one `Promise.all`, then at
most three more, and short-circuits entirely for owner and org-admin. Result cached under the
version-keyed `accessPerms`. `access-resolution-cost.spec.ts` measures it in **pooled connection
borrows**, cold vs warm, and asserts warm resolves the same key set as cold.
`AccessPermissionMembersResolver.computeMembersWithPermissionCached` is properly keyset-paginated at
100/page with a per-page version-keyed cache entry.

**Scope expansion bounded: FAIL — silent, non-deterministic permission loss.**
`computeUserPermissions` reads the role grants with a bare, **unordered** cap:

```ts
// access-permission.resolver.ts:283-297
.select({ roleId, permissionKey, scope })
.from(rolePermissionGrants)
.where(and(eq(orgId, …), inArray(roleId, roleIdList)))
.limit(500)
```

This is one row per `(role, key)` across **all** of the user's roles. Measured against the live
catalog:

```
total catalog keys: 698
per-module admin rung: hr 135, crm 82, build 75, accounting 73, inventory 49,
                       payroll 28, support 25, timesheets 24, surveys 16, workflows 16, …
sum of all 14 module-admin rungs: 564
```

A member holding the HR + CRM + Build + Accounting + Inventory + Payroll + Support + Timesheets +
Surveys admin rungs reaches 507 grant rows and **silently loses permissions past the 500th**. Holding
both `<MOD>_MODULE_OWNER` and `<MOD>_MODULE_ADMIN` for the same module doubles the row count for
identical keys, halving the effective ceiling. With no `ORDER BY`, *which* grants are dropped is
whatever the planner returns — so the same user can resolve differently between two requests. This is
brief rule 7 exactly: a bare `.limit(N)` on a drain is a defect, not a safeguard. The fix is a keyset
drain over `(roleId, permissionKey)`, the pattern `invalidateRoleAssigneePages` already uses two files
away. Five sibling `.limit(500)`/`.limit(100)` caps in the same function (role assignments, group
members, module ownerships, personal grants, delegation permissions) are the same shape at lower risk.

**Not fixed: `src/modules/access/**` is outside my territory.** This is the highest-severity finding
in the ticket after §0 and needs an owner.

**Indexes: PASS on subject, role, module and tenant; FAIL on the permission path.**

| Path | Index | Verdict |
|---|---|---|
| subject | `idx_role_assignments_org_membership`, `idx_user_permission_grants_org_membership`, `idx_principal_group_members_org_member` | ✅ |
| role | `idx_role_assignments_org_role`, `idx_role_permission_grants_org_role`, `idx_group_role_assignments_org_group` | ✅ |
| module | `idx_user_permission_grants_org_module` | ✅ |
| tenant | every table leads with `org_id`; `check:tenant-indexes` 745/745 | ✅ |
| **permission** | `role_permission_grants` has **no index leading with `permission_key`** — its only composite is `uniq_role_permission_grants_role_key (org_id, role_id, permission_key)`, unusable for a `permission_key` predicate | ❌ |

Four live queries filter `role_permission_grants` by `permission_key` and get an `org_id`-prefix scan:
`access-permission-members.resolver.ts:131` (the members-with-permission page, on the request path),
`payroll/payout/payroll-approver-resolver.service.ts:46`,
`support/kb-gap/support-kb-gap.service.ts:270`, `permission-catalog-sync.service.ts:129`. Note
`user_delegation_permissions` *does* have `idx_user_delegation_permissions_key`, so the omission is
inconsistent rather than deliberate. Recommended: `(org_id, permission_key)`. Migration territory.

---

## 6. Criterion — workspace and onboarding gates, organization-switch state, query-key tenant isolation and auth error states covered by allow/deny/cross-tenant tests  ✅ MET

| Concern | Coverage | Proof |
|---|---|---|
| Workspace / onboarding gates | `lib/wizard-gate.test.ts` (`/org-setup` vs `/employee-onboarding`, platform-admin-with-no-orgId), `app/(authenticated)/me/onboarding/page.test.tsx`, BE `workspace-onboarding-tenant-isolation.spec.ts`, `setup/org-setup-tenant-isolation.spec.ts` | green |
| Organization-switch state | BE `org-switch-revalidation.spec.ts` asserts `switchOrg` invalidates `userSession(userId)` **and** `accessVersion(outgoingOrgId)` (`org-profile.service.ts:186-188`); `organization-placement.e2e-spec.ts`; FE `features/notifications/org-switch-stream-teardown.test.ts` | green |
| Query-key tenant isolation | **Structural, not by key shape.** Keys deliberately carry no `orgId`; `lib/query-scope.ts` hashes every key as `[authenticated:<orgId>:<userId>, key]`, and `QueryProvider` renders `<ScopedQueryProvider key={scope}>` so an org switch **unmounts and recreates the QueryClient** rather than invalidating it. `queryClient.clear()` at 8 sites is defence-in-depth. Proven by `lib/query-scope-isolation.test.tsx` and `lib/prefetch/access.test.tsx` ("org switch — org B cannot read org A hydrated snapshot") | green |
| Auth error states | `lib/membership-lifecycle-route.test.ts` (suspended → recovery, no redirect loop, exits on reactivation), `lib/get-error-message.test.ts`, `components/shared/access-denied.test.tsx`, `lib/rbac/permission-denial-is-not-emptiness.test.tsx` (a refusal renders distinctly from "no data") | green |
| Allow/deny/cross-tenant | BE: 14 tenant-isolation specs across the three modules, `roles-rbac-admin.controller.e2e-spec.ts`, `suspended-member-authority.spec.ts`. FE: `lib/rbac/route-access/__tests__/*` (6 files incl. repo-wide "no legacy role gates" and "every authenticated route resolves through the access registry") | green |

Measured: FE `jest lib/query-scope-isolation lib/prefetch/access lib/wizard-gate lib/membership-lifecycle-route hooks/api/access` → **8 suites / 44 tests, all passed.**

---

## 7. Gates run — every number below was executed and read

| Command | Result |
|---|---|
| BE `jest src/modules/{settings,organization,rbac,auth} --maxWorkers=2` | **101 suites passed / 102 run, 624 tests passed / 629** (1 skipped suite, 4 skipped tests) |
| — the one failure | `rbac/__tests__/backfill-slugs-exist.spec.ts` — **the §0 defect, correctly red** |
| BE `jest src/modules/organization` | 57/57 suites, 393/393 tests |
| BE `jest src/modules/settings` | 7/7 suites, 29/29 tests |
| BE `jest src/modules/settings/settings-member-role-authority.spec.ts` | 3/3 (was 2/2; +1 test) |
| — bite proof | invalidation stripped from the service → **1 failed / 3**; file restored, sha verified |
| BE `tsc --noEmit -p tsconfig.json` | **exit 1, 7 errors — none in any file I touched** (see §8) |
| BE `eslint` on my 3 changed files | **exit 0, 0 errors**, 1 pre-existing warning (`bumpPermissionsVersion` imported but unused in `org-membership.service.ts` — dead since `syncStructuralRoleAssignment` bumps internally; trivial REMOVE) |
| BE `pnpm -s check:permission-keys` | **exit 0** — 3116 `@RequirePermission` usages, 627 unique keys, backend catalog 698, all resolve |
| BE `pnpm -s check:route-classification` | **exit 0** — 3602 handlers: 236 public / 100 universal / 3206 permissioned / 60 in-service, **0 undeclared** |
| BE `pnpm -s check:tenant-indexes` | **exit 0** — 745 tenant tables / 745 with a leading tenant index |
| BE `pnpm -s check:cache-invalidation` | **exit 0** — 1068 service files, LOW-only, 0 blockers |
| BE `pnpm -s verify:rbac-integrity:self-test` | **exit 0** |
| BE `pnpm -s check:navigation-permissions` | **exit 2 — environment, not a defect.** `NAV_DIR = join(REPO_ROOT, "frontend", …)` assumes the Windows layout; here the FE is at `streamlineos-frontend/frontend`. It fails loudly (good) but cannot run on this machine |
| FE `jest lib/query-scope-isolation lib/prefetch/access lib/wizard-gate lib/membership-lifecycle-route hooks/api/access` | **8 suites / 44 tests, all passed** |
| FE `jest lib/rbac/permissions/__tests__/catalog-sync.test.ts` | **8/8** — both catalog directions green (the 698-vs-696 count in `check:permission-keys` is that script's own counter, not a real gap) |

---

## 8. Backend `tsc` is red, and it is not mine

7 errors, all `TS7022`/`TS7024`/`TS7006` circular-inference failures in keyset-drain loops:

```
core/org-purge-member-drain.spec.ts(46,11) (53,28)
core/org-purge.service.ts(75,13) (88,13)
support/core/support-ticket-erasure.ts(51,11) (65,33) (91,11)
```

`org-purge.service.ts` sits in my territory folder but this is not my work: the two files are a matched
pair from one in-flight GDPR-erasure change (identical loop shape, and `org-purge.service.ts:67-69`
carries a fresh comment describing the `.limit(10000)` → keyset replacement). The spec file
`org-purge-member-drain.spec.ts` **did not exist** when I inventoried the module at the start of this
session and appeared mid-audit; error count went 5 → 7 while I worked. I did not touch it. The fix is
an explicit annotation on the `page` local so `cursor`'s type stops circling through the Drizzle
overload. **Handing to whoever owns the erasure lane.** ORCHESTRATOR-FINDINGS F1's "0 errors" is stale,
and so is ticket 14's "12 errors in storage" — those cleared, these are new.

---

## 9. Files I changed

| File | Change |
|---|---|
| `BE/src/modules/settings/settings.service.ts` | `updateFeatureFlag` now invalidates `org:settings` + the `org:profile` namespace; `updateUserRole` now invalidates `CACHE_KEYS.userSession(targetUserId)`; added the `CACHE_KEYS` import |
| `BE/src/modules/organization/core/org-membership.service.ts` | `updateMemberRole` now invalidates `CACHE_KEYS.userSession(memberUserId)`; added the `CACHE_KEYS` import |
| `BE/src/modules/settings/settings-member-role-authority.spec.ts` | `CacheService` double was `{}` and threw on the fixed code path; gave it a real `invalidate` mock, asserted the session key is busted on success, added a deny-path test asserting it is **not** busted on refusal |

Nothing else was edited. `announcements.schemas.ts` was edited and **reverted** (§1). No migration, no
schema file, no file under `src/common/`, `src/modules/access/`, `src/modules/module-access/` or
`FE/app/**` was touched. No git command was run.

---

## 10. Handoffs

**P0 — needs a migration owner.** Migration `0990` is inert in every organisation (§0a–c). Its
`is_system = true AND slug = 'CUSTOMER_SUPPORT'` predicate matches nothing the product creates. Repair
migration required; `backfill-slugs-exist.spec.ts` stays red until it lands, and must not be silenced.

**P0 — needs a migration/catalog owner.** A migration can never backfill a grant for a permission key
added in the same release, because `permissions` is filled by `onModuleInit` after `db:migrate` and
the FK guard skips the key (§0d). Every future template widening inherits this. Fix direction: seed
the catalog from a migration — `src/scripts/seed-permissions.ts` already does the work.

**P1 — needs the `modules/access` owner.** `computeUserPermissions`'s unordered `.limit(500)` on
`role_permission_grants` silently and non-deterministically drops permissions for any member holding
roles summing past 500 grant rows; the 14 module-admin rungs sum to 564 (§5).

**P1 — needs a product decision + migration.** Six module settings trees 403 for their own module
admins because custom-fields and automations are gated on `settings:*` keys held only by org
owner/admin (§3).

**P1 — needs the erasure lane owner.** Backend `tsc` is red at 7 errors in `org-purge.service.ts` /
`support-ticket-erasure.ts` / `org-purge-member-drain.spec.ts` (§8).

**P2 — product decision.** `SUPPORT_MODULE_MEMBER`, the default seeded support rung, holds
`support:tickets:view` but not `create`/`reply`/`internal_note` (§0e).

**P2 — repo hygiene.** `check:navigation-permissions` cannot run on this machine's repo layout (§7).
`CACHE_KEYS.orgMembers` is documented as dead in `cache-invalidation-matrix.ts:135` ("Factory never
called in any service") and should be removed — `src/common/` territory.
