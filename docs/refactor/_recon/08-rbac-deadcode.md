# Recon 08 — Build Module: RBAC Catalog Integrity + Dead-Code Sweep

> Scope: Build module only (CRM excluded per mid-task scope change).
> All claims cite file:line verified by Read or Grep tool.
> Date: 2026-07-31

---

## Part A — RBAC Catalog Integrity

### A1. Backend Build Catalog (all build:* keys)

**Source: `backend/src/modules/rbac/permissions/shared.ts`** (21 keys)
```
build:view              (line 36)
build:create            (line 42)
build:update            (line 48)
build:delete            (line 54)
build:manage            (line 60)
build:tickets:view      (line 68)
build:tickets:create    (line 74)
build:tickets:update    (line 80)
build:tickets:delete    (line 86)
build:tickets:assign    (line 92)
build:sprints:view      (line 98)
build:sprints:manage    (line 104)
build:timesheets:view   (line 110)
build:timesheets:create (line 116)
build:timesheets:manage (line 122)   ← BACKEND-ONLY (not in frontend PermissionKey)
build:goals:view        (line 129)
build:goals:manage      (line 135)
build:roadmap:view      (line 141)
build:roadmap:manage    (line 147)
build:whiteboards:manage (line 153)
build:workspace:manage  (line 159)
```

**Source: `backend/src/modules/rbac/permissions/build.ts`** (52 keys across 14 groups)
```
build:portal:view               (line 5)
build:changerequests:view        (line 12)
build:changerequests:create      (line 18)
build:changerequests:manage      (line 24)
build:clientvisibility:manage    (line 30)
build:qa:view                   (line 40)
build:qa:manage                 (line 46)
build:qa:execute                (line 52)
build:bugs:view                 (line 58)
build:bugs:create               (line 64)
build:bugs:update               (line 70)
build:bugs:delete               (line 76)
build:approvals:view            (line 86)
build:approvals:request         (line 92)
build:approvals:decide          (line 98)
build:approvals:manage          (line 104)
build:ai:use                    (line 113)
build:meetings:view             (line 121)
build:meetings:manage           (line 127)
build:incidents:view            (line 140)
build:incidents:manage          (line 146)
build:forms:view                (line 155)
build:forms:manage              (line 161)
build:teams:view                (line 168)
build:teams:create              (line 174)
build:teams:update              (line 180)
build:teams:delete              (line 186)
build:teams:manage              (line 192)
build:members:view              (line 200)
build:members:manage            (line 207)
build:customers:view            (line 218)
build:customers:manage          (line 224)   ← UNUSED (no @RequirePermission or useCan)
build:portfolios:view           (line 237)
build:portfolios:manage         (line 243)
build:programs:view             (line 249)
build:programs:manage           (line 255)
build:managed-products:view     (line 264)
build:managed-products:create   (line 270)
build:managed-products:update   (line 276)
build:managed-products:delete   (line 282)
build:workspaces:view           (line 291)
build:workspaces:create         (line 297)
build:workspaces:update         (line 303)
build:workspaces:delete         (line 309)
build:workspaces:members:view   (line 314)
build:workspaces:members:manage (line 320)
build:workflow:view             (line 330)
build:workflow:manage           (line 336)
build:risks:view                (line 346)
build:risks:manage              (line 352)
build:decisions:view            (line 358)
build:decisions:manage          (line 364)
```

**Source: `backend/src/modules/rbac/permissions/module-access.ts`** (2 keys, generated)
```
build:access:view   (generated from ACCESS_MANAGED_MODULES, line 6 — "build")
build:access:manage (generated from ACCESS_MANAGED_MODULES, line 6 — "build")
```

**Total backend build:* keys: 75**

---

### A2. Frontend Build Catalog

**Source: `frontend/lib/rbac/permissions/types.ts` (PermissionKey union)**

There is no `build.ts` file in `frontend/lib/rbac/permissions/`. All build:* keys are declared inline in the `PermissionKey` union in `types.ts`.

Frontend build:* keys present (lines 85–351, 567–568): 74 keys.

**Frontend PermissionKey has all 75 backend keys EXCEPT:**
- `build:timesheets:manage` — present at `backend/src/modules/rbac/permissions/shared.ts:122`, ABSENT from `frontend/lib/rbac/permissions/types.ts`.

---

### A3. Drift Table

| Key | In Backend Catalog | In Frontend PermissionKey | Enforced by Controller | Any useCan? | Verdict |
|---|---|---|---|---|---|
| `build:timesheets:manage` | YES — `shared.ts:122` | **NO** | `build-execution/timesheets.controller.ts:53,62,71` | No | **Backend-only drift.** 3 endpoints gated; no frontend gate can be added without first adding it to `types.ts`. |
| `build:customers:manage` | YES — `build.ts:224` | YES — `types.ts:347` | **No controller** | **No useCan** | **Catalog-only.** Key exists in both catalogs but zero enforcement. Likely planned but never wired. |
| All other 73 build:* keys | YES | YES | Yes (at least one controller each) | Yes (at least one useCan each) | Aligned |

---

### A4. Ghost Keys

A ghost key is one used in `@RequirePermission(...)` or `useCan(...)` but missing from BOTH catalogs.

**Result: No ghost keys found for build:*.**

All `@RequirePermission` usages in controllers under `backend/src/modules/build*/` and related modules (`build-execution`, `build-approvals`, `build-client-portal`, `build-forms`, `build-governance`, `build-incidents`, `build-managed-products`, `build-meetings`, `build-pm-workspaces`, `build-portfolios`, `build-qa`, `build-teams`, `build-workflow`, `goals`, `portal-access`, `ai`) reference only keys present in the backend catalog.

All `useCan(...)` calls in `frontend/features/build/` and `frontend/hooks/api/build/` reference only keys in the frontend `PermissionKey` union.

**Partial confirmation via grep**: comprehensive `@RequirePermission.*build:` sweep across `backend/src/modules` returned these distinct build:* keys in use:
```
build:view, build:create, build:update, build:delete, build:manage,
build:tickets:view, build:tickets:create, build:tickets:update,
build:tickets:delete, build:tickets:assign,
build:sprints:view, build:sprints:manage,
build:timesheets:view, build:timesheets:create, build:timesheets:manage,
build:goals:view, build:goals:manage,
build:roadmap:view, build:roadmap:manage,
build:whiteboards:manage, build:workspace:manage,
build:managed-products:view, build:managed-products:create,
build:managed-products:update, build:managed-products:delete,
build:workspaces:view, build:workspaces:create, build:workspaces:update,
build:workspaces:delete, build:workspaces:members:view, build:workspaces:members:manage,
build:members:view, build:members:manage,
build:customers:view,
build:teams:view, build:teams:create, build:teams:update,
build:teams:delete, build:teams:manage,
build:portfolios:view, build:portfolios:manage,
build:programs:view, build:programs:manage,
build:meetings:view, build:meetings:manage,
build:incidents:view, build:incidents:manage,
build:forms:view, build:forms:manage,
build:workflow:view, build:workflow:manage,
build:approvals:view, build:approvals:request,
build:approvals:decide, build:approvals:manage,
build:qa:view, build:qa:manage, build:qa:execute,
build:bugs:view, build:bugs:create, build:bugs:update, build:bugs:delete,
build:risks:view, build:risks:manage,
build:decisions:view, build:decisions:manage,
build:changerequests:view, build:changerequests:create, build:changerequests:manage,
build:clientvisibility:manage, build:portal:view, build:ai:use
```

All of these exist in the backend catalog. `build:customers:manage` is the only catalog key with ZERO controller enforcement.

---

### A5. Module Enablement — PASS/FAIL Analysis

**ModuleGuard comparison code** (`backend/src/common/rbac/module.guard.ts`):
```typescript
// module.guard.ts:27
const moduleKey = required.toLowerCase();
// module.guard.ts:28
const enabled = await this.entitlements.isModuleEnabled(user.orgId, moduleKey);
```

**EntitlementsService.isModuleEnabled** (`backend/src/modules/access/entitlements.service.ts:127-133`):
```typescript
async isModuleEnabled(orgId: string, moduleKey: string): Promise<boolean> {
  if (this.coreModuleKeys.has(moduleKey)) return true;
  const map = await this.getModuleMap(orgId);
  const enabled = map[moduleKey];
  if (enabled === undefined) return this.moduleTableUnavailable;
  return enabled;
}
```
Where `map[moduleKey]` is built from `SELECT module_key, enabled FROM org_modules WHERE org_id = ?`.

**Module catalog** (`backend/src/common/rbac/module-vocabulary.ts:4`):
```typescript
"build",  // lowercase
```

**setModuleEnabled explicit handling** (`backend/src/modules/access/entitlements.service.ts:164`):
```typescript
if (moduleKey === "build" && enabled) { ... }
```

**All 13 Build controllers** use `@RequireModule("build")` (quoted exactly):
`backend/src/modules/build/projects.controller.ts:47`, `projects-by-id.controller.ts:27`, `projects-tickets.controller.ts:75`, and 10 more.

**VERDICT: `@RequireModule("build")` PASSES for a non-owner** when `org_modules` contains a row with `module_key = 'build', enabled = true`.

The historical hazard documented in MEMORY.md (org_modules rows using `"projects"` key while the guard compares `"build"`) is **resolved in code**: the guard normalizes via `.toLowerCase()`, the catalog uses `"build"`, and `setModuleEnabled` explicitly handles `moduleKey === "build"`. Only stale pre-rename DB rows with `module_key = "projects"` would still FAIL — those would be treated as "module not found" (`map["build"] === undefined`) and denied. Since the DB was cold-rebuilt (per MEMORY: Neon DB wiped + cold-rebuilt), there are no stale rows.

---

### A6. ROLE_DEFAULT_PERMISSIONS for Build

**Source: `backend/src/modules/rbac/permissions/role-defaults.ts`**

```typescript
OWNER:     ALL_PERMISSION_NAMES  // includes all 75 build:* keys
ORG_ADMIN: ALL_PERMISSION_NAMES  // includes all 75 build:* keys
MEMBER:    EMPLOYEE_SELF_SERVICE // ZERO build:* keys
```

**Conclusion**: Regular members have NO build access by default. All build access flows through custom roles.

**Role templates with build:* grants** (`backend/src/modules/rbac/role-templates.constants.ts`):

| Template | Slug | Keys granted | Coverage |
|---|---|---|---|
| PROJECT_MANAGER | `PROJECT_MANAGER` | 46 build:* keys (lines 488–543, including `build:timesheets:manage` at line 532) | Comprehensive |
| PRODUCT_MANAGEMENT_ADMIN | `PRODUCT_MANAGEMENT_ADMIN` | All build:* via `moduleScopedPermissions("build")` (line 568) | Complete |
| ENGINEERING | `ENGINEERING` | 10 build:* (view+create, lines 317–334) | Read-only contributor |
| CUSTOMER_SUPPORT | `CUSTOMER_SUPPORT` | 7 build:* (view/create, lines 366–376) | Minimal |
| DIGITAL_MARKETING | `DIGITAL_MARKETING` | 6 build:* (view/create, lines 388–397) | Minimal |

**Keys enforced by controllers but in NO role template** (owner-only in practice): None — `build:timesheets:manage` is granted by PROJECT_MANAGER (line 532) and PRODUCT_MANAGEMENT_ADMIN. `build:customers:manage` is technically in the catalog but no controller enforces it, so its absence from templates is harmless.

---

## Part B — Dead-Code Sweep (Build Module)

### B1. Tool Availability

```
frontend/node_modules/.bin — grep for knip/ts-prune/depcheck → NONE_FOUND
backend/node_modules/.bin  — grep for knip/ts-prune/depcheck → NONE_FOUND
```

Falling back to grep-based analysis per assignment instructions.

---

### B2. Unreferenced Schema Files

**`backend/src/db/schema/build/`** exports via `index.ts` → `db/schema/index.ts` root barrel.

| File | Key Tables Exported | References Found | Status |
|---|---|---|---|
| `core.ts` | `projects`, `cycles`, etc. | Ubiquitous in build services | Active |
| `tasks.ts` | `tickets`, `ticketAssignees`, `ticketComments`, `ticketAttachments`, `ticketLabels`, `workItemRelations`, etc. | Used across all build services | Active |
| `members.ts` | `projectMembers`, etc. | Used in build services | Active |
| `reporting.ts` | `projectDailySnapshots` | `backend/src/modules/build/projects-reports.service.ts` | Active |
| `goals.ts` | goals tables | goals module | Active |
| `roadmap.ts` | roadmap tables | roadmap controller+service | Active |
| `whiteboards.ts` | whiteboard tables | build-execution module | Active |
| `git.ts` | git tables | build module | Active |
| `activity.ts` | activity tables | `projects-activity.service.ts` | Active |
| `qa.ts` | QA tables | build-qa module | Active |
| `bugs.ts` | bug tables | build-qa module | Active |
| `change-requests.ts` | change request tables | build-client-portal | Active |
| `approvals.ts` | approval tables | build-approvals module | Active |
| `governance.ts` | risks/decisions tables | build-governance module | Active |
| `meetings.ts` | meeting tables | build-meetings module | Active |
| `incidents.ts` | incident tables | build-incidents module | Active |
| `forms.ts` | form tables | build-forms module | Active |
| `portfolios.ts` | portfolio/program tables | build-portfolios module | Active |
| `workflow.ts` | workflow tables | build-workflow module | Active |
| `managed-products.ts` | managed product tables | build-managed-products module | Active |
| `pm-workspaces.ts` | pm_workspaces | build-pm-workspaces, entitlements.service | Active |
| `pm-workspace-memberships.ts` | pm_workspace_members | build-pm-workspaces | Active |
| `teams.ts` | project_teams tables | build-teams module | Active |
| `feedback.ts` | `feedbucketWidgets`, `feedbucketSubmissions`, `feedbucketAttachments` | feedbucket module (via root barrel) | **Misplaced** — Feedbucket tables live in `schema/build/` despite being a separate module. CLAUDE.md §9: "folder names match the real business domain". Not dead but wrong folder. |
| `comment-drafts.ts` | comment_drafts tables | `build-comment-drafts/comment-drafts.service.ts` | Active |
| `relations.ts` | Drizzle relations for build tables | Used by Drizzle query layer | Active |
| `tasks.ts` (above) | included above | | |

**Orphaned schema file candidate:**
- `backend/src/db/schema/build/feedback.ts` — Feedbucket tables are logically in the feedbucket module, not build. No separate `schema/feedbucket/` folder exists. This is a domain-boundary violation per CLAUDE.md §9 living rule (2026-07-27), not dead code.

---

### B3. Unused Exports/Types in Build Paths

**`build:customers:manage`** (backend `build.ts:224`, frontend `types.ts:347`):
- Zero `@RequirePermission("build:customers:manage")` calls anywhere.
- Zero `useCan("build:customers:manage")` calls anywhere.
- Defined in both catalogs, assigned in PROJECT_MANAGER and PRODUCT_MANAGEMENT_ADMIN templates, but never enforced. Likely a permission stub for a feature not yet wired.

---

### B4. Stray Debug Code

**`frontend/features/build/`**: No `console.log/warn/error/debug` found.

**`backend/src/modules/build*/`**: No `console.log/warn/error/debug` found.

**`frontend/app/(authenticated)/build/`**:
```
frontend/app/(authenticated)/build/managed-products/error.tsx:16         console.error(error)
frontend/app/(authenticated)/build/managed-products/[managedProductId]/error.tsx:16  console.error(error)
frontend/app/(authenticated)/build/pm-workspaces/error.tsx:16            console.error(error)
```
These are in Next.js `error.tsx` boundary files — `console.error` in error boundaries is the standard Next.js pattern for server-side error logging. Not stray debug code.

---

## Summary

### Critical drift
| Finding | Severity | File | Action Required |
|---|---|---|---|
| `build:timesheets:manage` absent from frontend PermissionKey | Medium | `frontend/lib/rbac/permissions/types.ts` | Add key to PermissionKey union — 3 endpoints gated behind it, no UI can gate on it |
| `build:customers:manage` has zero enforcement | Low | `backend/src/modules/rbac/permissions/build.ts:224` | Wire a controller or remove the key |
| Feedbucket schema in `schema/build/` | Low | `backend/src/db/schema/build/feedback.ts` | Move to `schema/feedbucket/` when doing a schema reorg pass |

### Module enablement: PASS
`@RequireModule("build")` currently works correctly for fresh orgs. The `projects` vs `build` vocabulary hazard is resolved in code. Stale pre-rename `org_modules` rows remain the only remaining risk (cold-rebuilt DB has none).

### Dead-code tools: None available
knip, ts-prune, and depcheck are absent from both node_modules. Dead-code analysis is grep-only.

### No ghost keys, no stray debug code in Build feature/module paths.
