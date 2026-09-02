# S4 / ticket 19 — module release matrix: auth/identity/organization, RBAC, Settings

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
