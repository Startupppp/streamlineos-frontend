# RBAC Slice 2 — Strangle modules onto the new guard (+ data-row scope)

> **Status:** Queued design, pending go-ahead. Follows Slice 1 (`2026-06-27-rbac-slice-1-roles-engine-design.md`).
> **Date:** 2026-06-27
> **Pilot:** CRM Leads.

---

## 1. Goal

Replace the legacy CASL chokepoint (`@CheckAbility(verb, subject)` + `AbilityGuard`, resolved from the stale JWT) with the Slice 1 chokepoint (`@RequirePermission('key')` + `PermissionGuard`, resolved server-side from the DB/Redis) on backend module controllers, and enforce **data-row scope** (`applyScope`) on scopable list/read endpoints — **one module at a time**, preserving effective access (parity). Prove the recipe on CRM Leads, then fan out.

**Size of the job:** 77 controllers, 310 `@CheckAbility` usages.

## 2. Hard prerequisite (blocking)

The new `PermissionGuard` resolver reads the Slice 1 tables (`user_roles`, `role_permission_grants`, `access_versions`). **Migration `frontend/migrations/0119_rbac_access_tables.sql` must be applied in every environment — including the test/CI DB — before any cutover is deployed or its e2e can pass.** The backfill (`pnpm -C backend backfill:rbac`) should also run so non-owner users resolve to real permissions (the resolver's legacy jsonb/`users.role` fallback covers correctness pre-backfill, but the table reads still require the migration). Cutover code can be *written* before this; it cannot be *verified e2e* or *deployed* before it.

## 3. The cutover is NOT a find-replace

`@CheckAbility("read", "crm:leads")` checks CASL `can("read", "crm:leads")`, but the permission catalog key is `crm:leads:view` (→ `can("view", "crm:leads")`). The verb/subject pair does **not** map mechanically to one catalog key. Each endpoint's `@RequirePermission(...)` key MUST be chosen from the catalog (`backend/src/modules/rbac/permissions.constants.ts`) to preserve intended access, cross-checked against `ROLE_DEFAULT_PERMISSIONS`. This requires per-endpoint judgment and a parity check — which is why this is per-module agent work, not a regex sweep.

## 4. Repeatable recipe (one module = one unit)

For each controller in the module:
1. **Map** every endpoint's legacy `@CheckAbility(verb, subject)` to the correct catalog permission key (judgment, verified against `ROLE_DEFAULT_PERMISSIONS` — the set of users who passed before must still pass).
2. **Swap guards:** `@UseGuards(JwtAuthGuard, AbilityGuard)` → `@UseGuards(JwtAuthGuard, PermissionGuard)`; each `@CheckAbility(...)` → `@RequirePermission('<catalog key>')`. Endpoints with no `@CheckAbility` (currently open-within-auth) stay open unless they clearly should be gated (note, don't silently change).
3. **Scope (scopable list/read endpoints only):** add a backend `applyScope` helper (port spec §10 of Slice 1) — fetch the resolved scope from `AccessService` for that permission, AND a WHERE fragment into the list query: `own` → ownerCol = userId; `team` → own OR teamCol ∈ user's teams (degrade to own if no team column); `all` → no filter; `none` → no rows. Identify the table's owner/team columns. Never filter in JS after fetch.
4. **Scopable-keys source of truth:** the colon catalog lacks a `scopable` flag. Add an additive `scopable?: boolean` to the `Permission` entries (and the matching frontend mirror) for the keys that support row scope (start with the CRM/HR/projects/inventory/support/kb `view`/`read`/`update`/`delete` keys). The frontend matrix already uses a heuristic; replace it with this authoritative flag.
5. **Verify (e2e):** own-scope user sees only their rows; team/all as configured; owner sees all; denied → 403; **parity:** a user who could access before still can.
6. Remove that module's now-dead CASL imports. Leave the shared CASL infra (`abilities.factory`, `AbilityGuard`, `@CheckAbility`) until the last module is cut, then delete in a final cleanup slice.

## 5. Pilot — CRM Leads

Controllers: `leads.controller.ts`, `leads-detail.controller.ts`, `leads-ops.controller.ts`, `leads-reports.controller.ts`, `leads.ingest.controller.ts` (the ingest controller is webhook/public — confirm its auth model before touching).
- Owner column for scope: `leads.assignedToId`. No team column → `team` degrades to `own` (per spec, never widen).
- Endpoint keys: list/board/stats/detail → `crm:leads:view` (scopable); create → `crm:leads:create`; update/status/assign/verify/reject/bulk → `crm:leads:update`; delete/bulk-delete → `crm:leads:delete`; assign → consider `crm:leads:assign`. Confirm each against `ROLE_DEFAULT_PERMISSIONS`.
- Add `scopable: true` to `crm:leads:view`/`:update`/`:delete`.
- `applyScope` on `GET /leads`, `/leads/board`, `/leads/stats`, analytics — filter by `assignedToId` when scope is `own`.
- e2e: SALES user (own) sees only assigned leads; owner sees all; non-permitted → 403; parity vs. pre-cutover.

**Pilot deliverable:** Leads cut over + `applyScope` + e2e proving scope & parity + a written per-module checklist (the recipe above, concretized) to drive the fan-out.

## 6. Fan-out (after the pilot proves the recipe)

A per-module **pipeline workflow**: one agent per remaining module, each isolated to that module's controller/service files, following the proven checklist; a verify stage per module (typecheck + the module's e2e). Batch by domain (CRM, HR, projects, inventory, support, accounting, …). Track progress against the 77-controller list; `log()` any module that can't be mechanically cut (needs a new catalog key or has no clean owner column) for human review — no silent gaps.

## 7. Risks & decisions

- **Parity is the acceptance bar.** The new resolver is intentionally a superset (folds in `user_permissions`, legacy fallbacks); verify no endpoint becomes *more* restrictive than before for any role.
- **Missing catalog keys:** some endpoints may have no precise catalog key (the `read` vs `view` gap). Decision: add the missing key to the catalog (additive) rather than reusing a wrong one.
- **Tables without owner/team columns:** scope degrades to `own`/`all` per `applyScope`; never widen.
- **Internal keys** (`settings:*`, `self:*`, `dashboard:*`) are module-gate-exempt (already handled by `authorize`).
- **Deploy gate:** never ship a cut-over module before migration 0119 is live in that environment.

## 8. Definition of done (Slice 2)

- CRM Leads fully on `@RequirePermission`/`PermissionGuard` with `applyScope` + passing e2e (scope + parity); `scopable` flag added to the catalog; the per-module checklist written.
- (Fan-out, separate execution) all 77 controllers cut over, each parity-verified; legacy CASL infra removal queued as the final cleanup slice.
- Backend typecheck green; no module left silently un-gated.
