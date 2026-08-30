# L59 — HR Employees Filters Report

## Findings

### Root cause

The runtime-verification lane called `GET /hr/employees?status=ACTIVE` directly and received **400 VALIDATION_FAILED**.

The backend schema `listEmployeesSchema` (`backend/src/modules/hr/directory/dto/hr-directory.schemas.ts`) is declared with `.strict()` and has no `status` field. It accepts `isActive: "true" | "false" | "all"` as the employment-state filter.

**The frontend does not send `status`.** The UI uses `status` as a URL query param (`?status=active|inactive|all`) but `toHrEmployeesApiParams()` (`frontend/features/hr/employees/employee-list-filters.ts`) maps it to `isActive` before the API call:

```
status="active"   → isActive="true"
status="inactive" → isActive="false"
status="all"      → isActive="all"
```

The hook `HrEmployeesParams` (`frontend/hooks/api/hr/employees.ts`) carries `isActive?: "true" | "false" | "all"` — exactly what the backend schema expects. The probe was a raw API call with a different param name, not a regression in any rendered page.

**Verdict: non-issue for the frontend. No schema or service change is required.**

## Sibling filter gap audit

Every filter control rendered in `EmployeesFilters` (`frontend/features/hr/employees/employees-filters.tsx`) was checked against `listEmployeesSchema`:

| Filter control | URL param | API param sent | Backend schema key | Gap? |
|---|---|---|---|---|
| SearchInput | `q` | `search` | `search`, `q` both accepted | none |
| Department Select | `dept` | `departmentId` | `departmentId` | none |
| Status Select | `status` | `isActive` (via mapping) | `isActive` | none |
| Role Select (optional) | `role` | `role` | `role` | none |
| Cursor (infinite scroll) | — | `cursor` | `cursor` | none |
| Page size | `size` | `limit` | `limit` | none |

All filter params the frontend sends are accepted by the backend schema. No gap exists.

The employee export action (`employee-export-action.tsx`) also passes `{ search, departmentId, isActive, role }` — all accepted. The stats links in `employees-directory-stats.tsx` set `?status=active|inactive` in the **URL**, which `parseEmployeeListFilters()` correctly translates to `isActive` before the API call.

## Filters deliberately omitted

None. All rendered filters are mapped correctly.

## Changes made

### New spec file

`backend/src/modules/hr/directory/list-employees-schema-contract.spec.ts`

16 tests covering:
- Default values (`isActive` defaults to `"true"`, `limit` defaults to `20`)
- Accepted keys: every field in `HrEmployeesParams` (`cursor`, `limit`, `search`, `departmentId`, `isActive`, `role`) parsed without error
- Accepted enum values: `isActive` accepts exactly `"true"`, `"false"`, `"all"`
- Rejected keys: `status=ACTIVE`, `status=active`, `isActive=ACTIVE`, `organizationId`, and any other unrecognized field all throw (strict schema)

This spec would have caught the probe's mistake — sending `status` instead of `isActive` — and will catch any future hook change that starts sending the wrong param name.

## Verification

### Backend typecheck

`NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck` — **exit 0**, clean.

### Tests

**Before (baseline):**
- `hr/directory` pattern: 3 failed (pre-existing, `directory-tenant-isolation.spec.ts`), 68 passed, 71 total.

**After:**
- `hr/directory` pattern: 3 failed (same pre-existing), **84 passed, 87 total**.
- 16 new tests added, all passing.
- Zero new failures introduced.

### Frontend typecheck

Not run — no frontend files were changed.

### Lint

Not run (per task constraints).

## Files changed

- `backend/src/modules/hr/directory/list-employees-schema-contract.spec.ts` — **created** (new spec, 16 tests)
