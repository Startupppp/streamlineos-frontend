# CALSET1 — calendar:admin:manage endpoint

## Finding

`pnpm check:route-access-contract` exited 1 because `calendar:admin:manage` appeared in
`frontend/lib/rbac/route-access/route-access-extensions.ts` (the `/calendar/settings` gate) but
no backend endpoint carried `@RequirePermission("calendar:admin:manage")`, so the key was absent
from the OpenAPI contract's `x-permission` values.

The `/calendar/settings` page is a placeholder `EmptyState` ("coming soon"). The backend has no
org-level calendar settings table. The per-user source preferences table
(`calendar_source_preferences`) and the `CalendarSourceRegistry` (runtime, no DB) are the only
existing calendar-configuration surfaces.

## Audit result

No existing endpoint uses `calendar:admin:manage`. No org-level calendar settings model exists.
The `CalendarSourceRegistry` is the closest thing to admin-visible calendar configuration: it
holds every registered event source and its owning module. An admin legitimately needs to know
what feeds the org calendar. `AccessService.isModuleEnabled(orgId, moduleKey)` provides the
org-level (not per-user) module availability check needed for an admin view.

No new DB table is required — the registry itself is the data.

## What was built

Three changes, no new schema:

1. **`CalendarSourceRegistry.getOrgLevelSources(orgId)`** — new method that maps each registered
   source to `{ key, label, module, moduleEnabled }` using `isModuleEnabled` (org-level, not
   per-user).

2. **`backend/src/modules/calendar/calendar-admin-settings.controller.ts`** — new controller,
   route `GET /calendar/admin/settings`, guarded by
   `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level and
   `@RequirePermission("calendar:admin:manage")` on the handler. Returns `{ sources }`.

3. **`backend/src/modules/calendar/dto/admin-settings.schemas.ts`** — Zod response schema
   (`z.object().strict()` throughout); types via `z.infer`.

`CalendarAdminSettingsController` registered in `CalendarModule.controllers`.

No `@Idempotent`, no new DB table, no new schema file. File is 21 lines.

## Gate exit codes

| Check | Exit code |
|---|---|
| `pnpm openapi:generate` (backend) | 0 — 3551 ops, 0 undeclared |
| `pnpm check:contract-vendor` (frontend) | 0 — SHA-256 match confirmed |
| `pnpm check:route-access-contract` (frontend) | 0 — 200 keys checked, all backed |

## Files changed

- `backend/src/modules/calendar/calendar-source.registry.ts` — added `getOrgLevelSources`
- `backend/src/modules/calendar/calendar-admin-settings.controller.ts` — new
- `backend/src/modules/calendar/dto/admin-settings.schemas.ts` — new
- `backend/src/modules/calendar/calendar.module.ts` — registered new controller
- `backend/openapi.json` — regenerated (3551 ops)
- `frontend/contracts/openapi.json` — vendored from backend
