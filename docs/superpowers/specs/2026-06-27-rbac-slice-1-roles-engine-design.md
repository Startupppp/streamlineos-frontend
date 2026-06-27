# RBAC Slice 1 — Dynamic Roles Engine + Roles/Permissions Admin UI

> **Status:** Approved design, ready for implementation planning.
> **Date:** 2026-06-27
> **Scope:** First slice of the StreamlineOS RBAC program (`rbac/` product bible). Additive and non-breaking — runs in parallel with the live CASL/colon system; routes are cut over module-by-module in later slices.

---

## 1. Context & problem

The `rbac/` product bible specifies a from-scratch access system (`Entitlement ∩ Seat ∩ Permission`) with dot-format keys, multi-role assignment, group roles, generic resource grants, per-row data scopes, versioned cache invalidation, commercial entitlements, and six UI surfaces. It is written for a Drizzle-in-Next.js world (`app/api/**`, `lib/auth/*`).

Reality differs on two axes:

1. **Architecture.** `CLAUDE.md` mandates that the **NestJS backend (`streamlineos-api`) owns all DB schema + APIs**; the Next.js frontend holds only UI + TanStack Query hooks. The spec's engine must therefore live in the backend, with the frontend consuming a `/me/access`-style endpoint.
2. **An RBAC already exists and is live**, structurally different from the spec:

| Concern | Existing (live) | Spec wants |
|---|---|---|
| Permission key format | `domain:resource:action` (colon) | `module.resource.action` (dot) |
| User → role | single `users.role` string | many-to-many `user_roles` |
| Role permissions | `roles.permissions` jsonb array + `role_permissions` (role-slug→permissionId) + `user_permissions` | normalized + per-row scope |
| Groups / resource grants | none | `group_roles`, `resource_grants` |
| Scopes / entitlements / cache versioning | none (CASL `manage all` for owner) | full |
| Engine | CASL `defineAbilityFor` + `AbilityGuard` + `@CheckAbility(verb, subject)`, reading `permissions[]` from the JWT | `authorize()` chokepoint resolved server-side |

**Key defect the slice fixes:** permissions are frozen into a 10-minute backend JWT minted by the frontend `/api/auth/backend-token` route from the NextAuth session. Role edits do not take effect until the session/JWT refreshes. The new engine resolves permissions **server-side from the DB (Redis-cached, version-busted)**, so edits apply instantly on routes that adopt the new guard.

### Decisions taken (approved)

1. **Strategy:** Engine-first, additive, strangled. Build the new engine + tables in the backend, keep the existing model intact, cut routes over later.
2. **Entitlements:** Permission-RBAC first. Module on/off only (off the existing `enabledModules`/subscription); seats/limits/tiers deferred.
3. **First slice surface:** Roles & Permissions admin UI + engine.
4. **Migration:** Keep both models; backfill new tables from current data; deprecate/remove old columns in a final cleanup slice.

---

## 2. Slice goal & boundary

Deliver **dynamic custom roles with multi-role assignment, resolved server-side with instant invalidation**, surfaced through `/settings/roles`. Permission **keys stay colon-format** — the existing `permissions` catalog and the frontend `lib/rbac/permissions/*` mirror are reused unchanged.

**In scope:** new tables (`user_roles`, `role_permission_grants`, `group_roles`, `access_versions`), the resolver + `authorize()` + `@RequirePermission` guard + version-bump invalidation, refactored role/permission/assignment APIs, `GET /me/access`, the upgraded roles admin UI (matrix with scope + assignments), backfill, tests.

**Explicitly deferred (later slices):** `resource_grants`, a `teams` table + team group-roles, per-module `applyScope` SQL enforcement, seats/limits/tiers, simulator, audit dashboard, feature flags, dot-key normalization, removal of the legacy model/CASL/JWT-claim.

---

## 3. Data model (backend, additive — no existing table altered)

New Drizzle tables. Type alignment with the live schema: `organizations.id` = `text`, `users.id` = `text`, `roles.id` = `serial` (int), `departments.id` = `serial` (int), `permissions.name` = unique `text`.

New enum: `data_scope` = `['all', 'team', 'own', 'none']`. New enum: `principal_group_type` = `['department']` (extensible to `'team'` later).

```
user_roles
  id            serial pk
  orgId         text  → organizations.id (cascade)   not null
  userId        text  → users.id (cascade)           not null
  roleId        integer → roles.id (cascade)         not null
  assignedBy    text  → users.id (set null)
  createdAt     timestamp default now() not null
  unique (orgId, userId, roleId)
  index (orgId, userId)

role_permission_grants
  id            serial pk
  orgId         text  → organizations.id (cascade)   not null
  roleId        integer → roles.id (cascade)         not null
  permissionKey text  → permissions.name (cascade)   not null
  scope         data_scope default 'all'            not null
  createdAt     timestamp default now() not null
  unique (roleId, permissionKey)
  index (orgId, roleId)

group_roles
  id            serial pk
  orgId         text  → organizations.id (cascade)   not null
  groupType     principal_group_type                 not null
  groupId       integer                              not null   -- department id
  roleId        integer → roles.id (cascade)         not null
  createdAt     timestamp default now() not null
  unique (orgId, groupType, groupId, roleId)
  index (orgId, groupType, groupId)

access_versions
  orgId             text pk → organizations.id (cascade)
  permissionsVersion integer default 1 not null
  updatedAt         timestamp default now() not null
```

Drizzle relations added so `db.query` can join `user_roles`/`role_permission_grants`/`group_roles` to `roles`, `users`, `permissions`. The resolver is written to also accept future `resource_grants` without structural change.

---

## 4. Permission engine (backend — the new chokepoint)

New code under `backend/src/common/rbac/` (or a new `backend/src/modules/access/`), reusing `CacheService`, `AuditService`, `DRIZZLE`, and `CurrentUserContext`.

- **`AccessService.resolveUserPermissions(orgId, userId)` → `Map<permissionKey, DataScope>`**
  - Union of: roles from `user_roles` + roles from `group_roles` (the user's `department_members`) → their `role_permission_grants`; plus existing `user_permissions` (granted) overrides.
  - **Transition fallback:** if a role has no `role_permission_grants` rows yet, fall back to `roles.permissions` jsonb / `ROLE_DEFAULT_PERMISSIONS[slug]` (un-backfilled data still resolves). Also fall back to `users.role` when a user has no `user_roles` rows.
  - Owner (`organizationMembers.isOwner` / `isOrgOwner`) and platform admin → all permissions, scope `all`.
  - Scope merge uses `broadest` ranking `none<own<team<all`.
  - Cached via `CacheService` under key `access:perms:{orgId}:{userId}:v{permissionsVersion}` (read `permissionsVersion` once per request); plus per-request memoization.

- **`authorize(ctx, permissionKey, resource?)` → `{ allow, scope, reason? }`**
  - Reasons in this slice: `UNAUTHENTICATED | NO_MODULE | FORBIDDEN`. Module gate derives the module from the key prefix and checks `ctx.enabledModules`. Tier/seat reasons deferred.
  - Throwing variant `requirePermission(ctx, permissionKey, resource?)` for services/guards.

- **`@RequirePermission('key')` + `PermissionGuard`**
  - Resolves **server-side from DB/Redis**, not the JWT `permissions[]` array. This is the stale-permission fix.
  - The legacy `@CheckAbility` + `AbilityGuard` remain untouched on un-migrated routes.

- **Invalidation discipline (the core guarantee):** every mutation to `roles` / `role_permission_grants` / `user_roles` / `group_roles` calls **`bumpPermissionsVersion(tx, orgId)` in the same transaction** (`UPDATE access_versions SET permissionsVersion = permissionsVersion + 1`, upsert if absent). Cache keys embed the version, so a bump busts the org's resolver cache atomically. TTL is GC only.

---

## 5. Backend APIs

Refactor `backend/src/modules/rbac/` (`rbac.controller.ts`, `roles.controller.ts`, `roles.service.ts`, `rbac.service.ts`) and add an assignment surface + `/me/access`. All new/refactored endpoints guarded by `@RequirePermission('settings:rbac:manage')` (existing key), resolved server-side. Zod DTOs via the existing `ZodValidationPipe`.

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /roles` | list org roles (+ member counts) | keep; add counts |
| `POST /roles` | create custom role (name, optional clone-from) | writes role; bump version |
| `PATCH /roles/:roleId` | rename / update | guardrails below; bump version |
| `DELETE /roles/:roleId` | delete role | blocked if it has members (force reassignment); bump version |
| `GET /roles/:roleId/permissions` | matrix for a role | returns `{ permissionKey, scope }[]` |
| `PUT /roles/:roleId/permissions` | set full matrix atomically | replace `role_permission_grants` for the role in a tx; validate keys ⊆ catalog; bump version |
| `GET /roles/:roleId/members` | effective members | direct (`user_roles`) + via department (`group_roles`) |
| `POST /roles/:roleId/members` | assign user or department | `user_roles` / `group_roles`; bump version |
| `DELETE /roles/:roleId/members/...` | unassign | bump version |
| `GET /rbac/permissions` | permission catalog | keep |
| `GET /me/access` | **new** — current user's resolved access | `{ permissions[], scopes, modules, isOrgOwner, version }` |

The legacy `POST /rbac/role-permissions` (single grant) is superseded by `PUT /roles/:roleId/permissions` and removed once the UI is wired.

**Guardrails (server-side):** cannot delete a role that has members; cannot remove the last holder of an owner role / `settings:rbac:manage` (org-lockout protection); cannot grant a key for a module the org lacks; system-role keys immutable.

---

## 6. Frontend (refactor existing surface — minimal churn)

- **`/settings/roles`** (`app/(authenticated)/settings/roles/page.tsx`): upgrade `PermissionMatrix` to a module-grouped checkbox grid with a **per-row scope selector (All / Team / Own)** for scopable permissions; keep `CreateRoleDialog` (add "clone from" select) and `RoleTemplateDialog`. Wire to `PUT /roles/:roleId/permissions`. Full loading (skeleton) / empty / error states per `CLAUDE.md`.
- **Role Assignments** — a Sheet (large, multi-section per `CLAUDE.md`) to assign **users + departments** → `user_roles` / `group_roles`, showing effective members (direct + via department).
- **`useAccess()`** new hook → `GET /me/access`, becomes the data source for `useCan`/`<Can>` and the dynamic sidebar (`getNavGroupsForUser`), replacing the JWT-baked permission read. Invalidate `accessKeys.me` on any role/assignment mutation and on org switch. The existing CASL client layer stays, fed from the same permission list (no consumer rewrites).
- **Hooks** (`lib/api/hooks/rbac.ts`, `roles.ts`): replace `useUpdateRolePermissions` with the matrix `PUT`; add `useRolePermissions`(matrix), `useRoleMembers`, `useAssignRole`, `useUnassignRole`, `useAccess`. Add query keys to `lib/query-keys.ts`.

---

## 7. Backfill (idempotent, additive)

A one-time backfill (migration script / seed, safe to re-run):
1. Ensure each org has `isSystem` `roles` rows for the system slugs in use (OWNER, CEO, HR, …).
2. Populate `role_permission_grants` — system roles from `ROLE_DEFAULT_PERMISSIONS[slug]`, custom roles from `roles.permissions` jsonb (scope `all`).
3. Populate `user_roles` from each member's `users.role`.
4. Seed `access_versions` at 1 per org.

`users.role`, `roles.permissions` jsonb, `role_permissions`, `user_permissions`, CASL, and the JWT permissions claim all remain in place (read by un-migrated routes) until a final cleanup slice.

---

## 8. Testing

- **Backend unit:** resolver (multi-role union, `broadest` scope merge, owner shortcut, jsonb/`users.role` fallback), `authorize` matrix (allow / FORBIDDEN / NO_MODULE), invalidation (resolve → mutate+bump in tx → re-resolve returns fresh), guardrails (last-owner protection, delete-role-with-members).
- **Backend e2e:** the new role/permission/assignment endpoints + `GET /me/access` (auth + permission enforcement).
- **Frontend:** matrix scope toggle persists; `useAccess` gates a `<Can>`; sidebar reflects resolved permissions.

---

## 9. Deviations from the spec (deliberate) & why

- **Colon keys kept** (not dot) — additive/non-breaking; dot-normalization is an optional later slice.
- **Scope** is stored / resolved / editable now, but **SQL enforcement** (`applyScope` in list queries) lands per-module during cutover, not here.
- **Entitlements** = module on/off only; seats/limits/tiers deferred.
- **Groups** = departments only (no `teams` table); **`resource_grants`** deferred.
- **Engine in NestJS backend** (not Drizzle-in-Next), per `CLAUDE.md`.

---

## 10. Definition of done (this slice)

- New tables + relations created via a forward-only Drizzle migration; backfill runs idempotently.
- `AccessService` resolver + `authorize` + `@RequirePermission` guard + version-bump invalidation implemented and unit-tested.
- Refactored role/permission/assignment APIs + `GET /me/access` live and e2e-tested, each protected server-side.
- `/settings/roles` matrix (with scope) + assignments Sheet wired to the new APIs; `useAccess` drives gating + sidebar.
- Legacy model untouched and still functional; no route regressions.
- Backend + frontend lint, type-check, and production build all pass.
