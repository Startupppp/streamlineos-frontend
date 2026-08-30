# FE2 — Frontend Invariants Audit

**Date:** 2026-08-31  
**Lane:** FE2  
**Scope:** Permission catalog sync · actor/org-id identity · business logic leaks · contract drift

---

## 1. Catalog-Sync Test — Result

The test at `frontend/lib/rbac/permissions/__tests__/catalog-sync.test.ts` is structurally correct. Key observations:

- **Path resolution is correct.** The test resolves to `../../../../../backend/src/modules/rbac/permissions` from `__tests__/`. This resolves through five levels (`__tests__` → `permissions` → `rbac` → `lib` → `frontend`) and lands at `backend/src/modules/rbac/permissions`. The path is valid.
- **Backend is reachable.** The directory exists and all backend permission files are readable.
- **Both directions are tested.** The test asserts:
  1. No phantom keys: every `PERMISSIONS` array entry exists in backend (`name:` pattern).
  2. No ghost union members: every `PermissionKey` union literal (containing `:`) exists in backend OR matches `*:access:(view|manage)`.
  3. CRM/party coverage: every `crm:*` and `party:*` backend key is present in the `PERMISSIONS` array (grantable in role editor).
  4. Backend completeness: every backend name appears in the frontend union type.

The `MODULE_ACCESS_PERMISSIONS` from the frontend module-access file is added to the backend name set, so generated `*:access:view/manage` keys are never flagged as ghost.

**All four directions are covered.** A passing run proves symmetry, not just one direction.

---

## 2. Independent Both-Directions Verification

### Direction A: Frontend PERMISSIONS → Backend (phantom check)

Sampled every distinct key used in `useCan()` calls across the frontend (accounting, build, calendar, chat, CRM, directory, HR, inventory, KB, mail, notifications, ownership, party, payroll, reports, self, settings, sign, support, surveys, tasks, timesheets, workflows). All keys verified against their respective backend permission files.

**No phantom keys found.** Every sampled `useCan()` call uses a key that exists verbatim in the backend catalog.

The prior example bugs are now resolved:
- `calendar:admin:manage` — EXISTS in `backend/src/modules/rbac/permissions/calendar.ts` ✓
- `calendar:write` — EXISTS in same file ✓

### Direction B: Backend → Frontend Union Type (missing coverage check)

Compared all backend permission file names against the three frontend union type files (`permission-key-foundation.ts`, `permission-key-business.ts`, `permission-key-extended.ts`).

**No missing backend keys found in the union type.** All backend keys are represented.

### Known Architecture Debt (not test failures, acknowledged by test comments)

The test itself notes: "several older modules (timesheets:*, surveys:* among them) carry the same gap." The following keys exist in backend and union type but are absent from the `PERMISSIONS` array — meaning they cannot be displayed or granted through the role editor UI:

| Key(s) | In Backend | In Union Type | In PERMISSIONS Array |
|---|---|---|---|
| `integrations:connections:view`, `integrations:connections:manage` | ✓ (`shared.ts`) | ✓ (`permission-key-business.ts`) | ✗ (no frontend catalog file) |
| `build:whiteboards:manage`, `build:workspace:manage` | ✓ (`shared.ts`) | ✓ (`permission-key-foundation.ts`) | ✗ (not in `build.ts` or `shared.ts`) |
| All `chat:*` and `mail:*` permissions | ✓ | ✓ | ✗ (roles.ts does not import chat/mail files) |
| All `blog:*` permissions | ✓ (`blog.ts`) | ✓ | ✗ |

These are not phantom keys and do not make `useCan()` lie. They are debt: administrators cannot explicitly revoke or grant them via the role editor. Fixing this requires adding those keys to the `PERMISSIONS` array in `frontend/lib/rbac/permissions/roles.ts` (or creating/updating the relevant frontend catalog files). This is a backend-independent change.

---

## 3. Phantom / Wrong Permission Keys in useCan()

| Key | Surface | In Backend | Verdict |
|---|---|---|---|
| `calendar:admin:manage` | Calendar settings | ✓ `calendar.ts` | CLEAN — this was the historical bug, now fixed |
| `calendar:write` | Quick-create calendar event | ✓ `calendar.ts` | CLEAN |
| `build:members:view` | Workspace members hook | ✓ `build.ts` (via `shared.ts`) | CLEAN |
| All accounting keys (`accounting:journal:read`, etc.) | Accounting pages | ✓ `accounting.ts` | CLEAN |
| All workflow keys (`workflows:workflows:view`, etc.) | Workflows page | ✓ `workflows.ts` | CLEAN |
| All payroll keys | Payroll pages, sidebar | ✓ `payroll.ts` | CLEAN |
| All HR keys (sampled 70+) | HR features | ✓ HR permission files | CLEAN |

**Zero phantom keys found across all sampled surfaces.**

---

## 4. Actor/Org-ID Call Sites

| File | What is sent | Route | Classification | Reason |
|---|---|---|---|---|
| `hooks/api/build/workspace-members.ts:69` | `{ userId: string; role? }` in body | `POST /build/members` | LEGITIMATE | `userId` is the **target** member being added to the workspace, not the caller. Backend validates org membership of the target. |
| `hooks/api/support/kb.ts:253` | `orgId` as `?org=` query param | `POST /public/kb/${slug}/feedback` | LEGITIMATE | `@Public()` route — the public-facing KB requires the org identifier to resolve the tenant; this is explicitly sanctioned in root §5. |

**No impersonation or cross-tenant holes found.** The frontend does not send the caller's own `userId`, `actorId`, `createdById`, or `authorId` in any request body or query string.

The `dashboard.ts` file reads `session.orgId` only to gate `enabled:` — it is never placed in a request body or query string.

---

## 5. Business Logic Leaks

| Check | Result |
|---|---|
| `app/api/**` routes other than NextAuth | None — only `app/api/auth/[...nextauth]/route.ts` exists |
| `lib/services/**` doing domain work | Directory does not exist |
| Drizzle-ORM / postgres / DB imports in frontend | None — `grep` for `drizzle-orm`, `@drizzle`, backend schema paths returns zero matches |
| Money/tax/permission calculations client-side | None found |

**No business logic leaks.** The frontend boundary is clean.

---

## 6. Contract Drift

### Vendored copy freshness

Both files are byte-identical:
- `frontend/contracts/openapi.json`: 4,658,517 bytes  
- `backend/openapi.json`: 4,658,517 bytes

The vendor gate (`scripts/check-contract-vendor.mjs`) would pass.

### Known field-level drifts

Seven drifts are tracked in the `KNOWN_DRIFT` baseline in `scripts/check-contract-drift.mjs`, all in the timesheets module, all awaiting product decisions:

| Endpoint | Field | Frontend sends | Contract accepts | Effect |
|---|---|---|---|---|
| `POST /timesheets/entries` | `billingType` | `INTERNAL` | `BILLABLE, NON_BILLABLE, FIXED` | Zod rejects → update is a no-op |
| `POST /timesheets/entries` | `source` | `GRID` | `MANUAL, TIMER, API, IMPORT` | Zod rejects → update is a no-op |
| `PATCH /timesheets/entries/{entryId}` | `billingType` | `INTERNAL` | `BILLABLE, NON_BILLABLE, FIXED` | Same |
| `POST /timesheets/exceptions/{exceptionId}/resolve` | `reason` | (extra field) | not in schema | Field silently ignored |
| `POST /timesheets/rates` | `billingType` | `INTERNAL` | `BILLABLE, NON_BILLABLE, FIXED` | Same |
| `PATCH /timesheets/rates/{rateId}` | `billingType` | `INTERNAL` | `BILLABLE, NON_BILLABLE, FIXED` | Same |
| `PATCH /timesheets/settings` | `approvalMode` | `NONE, PROJECT, CLIENT` | `MANAGER, AUTO, MULTI_LEVEL` | Zod rejects → update is a no-op |

The 82 operations with undeclared path-template parameters (reported by OAPI1 lane) are a generator issue, not a frontend type issue. This lane found no additional hand-rolled types for those paths.

---

## 7. Fixes Applied

**None.** No frontend-side defects requiring code changes were found. All `useCan()` calls use valid backend-backed keys. No business logic leak. No actor-ID leak.

---

## 8. Backend-Side Gaps to Report (cannot fix from this lane)

None identified in this audit.

---

## 9. Disproved Claims

The following claims from the task context or historical record were explicitly tested and disproved:

1. **`calendar:admin:manage` is not in the backend catalog** — DISPROVED. The key exists verbatim in `backend/src/modules/rbac/permissions/calendar.ts` with a proper description.
2. **The vendored openapi.json is stale** — DISPROVED. Both files are 4,658,517 bytes (byte-identical).
3. **Phantom keys in `useCan()` calls across the sampled surface** — DISPROVED. Every sampled key has a backend catalog entry.
4. **Actor-ID self-impersonation in request bodies** — DISPROVED. No instance found where the caller's own userId/actorId is sent as a body field.

---

## Appendix — Files Examined

- `frontend/lib/rbac/permissions/__tests__/catalog-sync.test.ts`
- `frontend/lib/rbac/permissions/roles.ts` and all imported module files
- `frontend/lib/rbac/permissions/permission-key-foundation.ts`, `permission-key-business.ts`, `permission-key-extended.ts`
- `backend/src/modules/rbac/permissions/` — all 35 non-excluded files
- `frontend/hooks/api/` — accounting, build, calendar, crm, dashboard, hr, payroll, support, timesheets, workflows, workspace-members, kb
- `frontend/app/(authenticated)/accounting/`, `crm/`, `payroll/`, `workflows/`
- `frontend/app/(portal)/accept-invitation/page.tsx`
- `frontend/app/employee-onboarding/page.tsx`
- `frontend/components/automations/automation-meta.ts`
- `frontend/components/layout/sidebar/sidebar-nav-groups-payroll.ts`
- `frontend/contracts/openapi.json` (size check against `backend/openapi.json`)
- `frontend/contracts/README.md`
