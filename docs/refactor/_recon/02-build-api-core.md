# Build API Core — Recon Report
> Generated 2026-07-31. READ-ONLY audit of `backend/src/modules/build/` core files.
> Every claim cites `file:line`. Permission keys quoted from source.

---

## 1. Endpoint Table

All four controllers share `@RequireModule("build")` + `@UseGuards(JwtAuthGuard, PermissionGuard)`.
Base route for all Build controllers is `build` (prefixed by global `api/v1`).

| # | Method | Route | Controller:Line | Guards | @RequirePermission (EXACT) | @RequireModule | Paginated? | Cursor/Offset | Max Limit | Tenant-scoped in WHERE? | Service Method |
|---|--------|-------|-----------------|--------|---------------------------|----------------|------------|---------------|-----------|-------------------------|----------------|
| 1 | GET | /build | projects.controller.ts:56-63 | JwtAuth + Permission | `"build:view"` | `"build"` | YES offset | offset | 100 | YES (`eq(projects.orgId, orgId)`) | `listProjects` |
| 2 | POST | /build | projects.controller.ts:65-74 | JwtAuth + Permission | `"build:create"` | `"build"` | — | — | — | YES (`orgId` param) | `createProject` → `provision.createProject` |
| 3 | POST | /build/from-deal | projects.controller.ts:76-85 | JwtAuth + Permission | `"build:create"` | `"build"` | — | — | — | YES (deal verified by orgId) | `createFromDeal` → `provision.createFromDeal` |
| 4 | GET | /build/labels | projects.controller.ts:87-91 | JwtAuth + Permission | `"build:view"` | `"build"` | NO | — | 300 | YES (`eq(ticketLabels.orgId, orgId)`) | `members.listLabels` |
| 5 | POST | /build/labels | projects.controller.ts:93-101 | JwtAuth + Permission | `"build:manage"` | `"build"` | — | — | — | YES | `members.createLabel` |
| 6 | PATCH | /build/labels/:labelId | projects.controller.ts:103-111 | JwtAuth + Permission | `"build:manage"` | `"build"` | — | — | — | YES (orgId in WHERE) | `members.updateLabel` |
| 7 | DELETE | /build/labels/:labelId | projects.controller.ts:113-121 | JwtAuth + Permission | `"build:manage"` | `"build"` | — | — | — | YES (orgId in WHERE) | `members.deleteLabel` |
| 8 | GET | /build/:projectId/members | projects.controller.ts:123-130 | JwtAuth + Permission | `"build:view"` | `"build"` | SOFT (limit 100) | — | 100 | YES (join projects + orgId) | `members.listMembers` |
| 9 | GET | /build/:projectId/roster | projects.controller.ts:132-139 | JwtAuth + Permission | `"build:view"` | `"build"` | SOFT (limit 500) | — | **500** | YES (orgId in assignments WHERE) | `members.getProjectRoster` |
| 10 | POST | /build/:projectId/members | projects.controller.ts:141-150 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (via assertProjectOwnership) | `members.addMember` |
| 11 | DELETE | /build/:projectId/members | projects.controller.ts:152-161 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (via assertProjectOwnership) | `members.removeMember` |
| 12 | PATCH | /build/:projectId/members/:memberUserId | projects.controller.ts:163-173 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (via assertProjectOwnership) | `members.updateMemberRole` |
| 13 | GET | /build/:projectId/custom-states | projects.controller.ts:175-182 | JwtAuth + Permission | `"build:view"` | `"build"` | **NO LIMIT** | — | **∞** | YES (orgId in WHERE) | `members.listCustomStates` |
| 14 | POST | /build/:projectId/custom-states | projects.controller.ts:184-193 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (orgId in assertion) | `members.createCustomState` |
| 15 | PATCH | /build/:projectId/custom-states/:stateId | projects.controller.ts:195-205 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (orgId in WHERE) | `members.updateCustomState` |
| 16 | DELETE | /build/:projectId/custom-states/:stateId | projects.controller.ts:207-215 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (orgId in WHERE) | `members.deleteCustomState` |
| 17 | GET | /build/:projectId/labels | projects.controller.ts:218-222 | JwtAuth + Permission | `"build:view"` | `"build"` | NO | — | 300 | YES | `members.listLabels` |
| 18 | POST | /build/:projectId/labels | projects.controller.ts:224-231 | JwtAuth + Permission | `"build:manage"` | `"build"` | — | — | — | YES | `members.createLabel` |
| 19 | GET | /build/:projectId | projects-by-id.controller.ts:33-40 | JwtAuth + Permission | `"build:view"` | `"build"` | — | — | — | YES (orgId in findFirst WHERE) | `projects.getProject` |
| 20 | PATCH | /build/:projectId | projects-by-id.controller.ts:42-49 | JwtAuth + Permission | **`"build:view"` ← WRITE with VIEW perm** | `"build"` | — | — | — | YES (orgId in UPDATE WHERE) | `projects.updateProject` |
| 21 | DELETE | /build/:projectId | projects-by-id.controller.ts:52-60 | JwtAuth + Permission | `"build:delete"` | `"build"` | — | — | — | YES (orgId in findFirst + DELETE WHERE) | `projects.deleteProject` |
| 22 | PATCH | /build/:projectId/managed-product | projects-by-id.controller.ts:62-71 | JwtAuth + Permission | `"build:managed-products:update"` | `"build"` | — | — | — | YES (orgId in findFirst + UPDATE WHERE) | `projects.linkProjectToManagedProduct` |
| 23 | GET | /build/:projectId/budget | projects-budget.controller.ts:26-33 | JwtAuth + Permission | `"build:manage"` | `"build"` | — | — | — | YES (orgId in findFirst) | `budget.getBudget` |
| 24 | PATCH | /build/:projectId/budget | projects-budget.controller.ts:35-43 | JwtAuth + Permission | `"build:manage"` | `"build"` | — | — | — | YES (orgId in UPDATE WHERE) | `budget.updateBudget` |
| 25 | GET | /build/customers | projects-customers.controller.ts:21-29 | JwtAuth + Permission | `"build:customers:view"` | `"build"` | YES offset | offset | 100 | YES (`eq(crmOrganizations.orgId, orgId)`) | `svc.list` |

---

## 2. Tenant-Scoping Audit

### ProjectsService.queryProjects
`projects.service.ts:79` — `conditions = [eq(projects.orgId, orgId)]` — orgId is leading condition.
All subsequent filters AND'd with it. Tenant-scoped at query time. ✓

### ProjectsService.getProject
`projects.service.ts:312` — `and(eq(projects.id, projectId), eq(projects.orgId, orgId))` — both id and org in WHERE. ✓

### ProjectsService.updateProject
`projects.service.ts:449-451` — UPDATE WHERE is `and(eq(projects.orgId, orgId), eq(projects.id, projectId))`. ✓
Member reassignment sub-queries at lines 497-507 and 522-534 include `eq(tickets.orgId, orgId)`. ✓

### ProjectsService.deleteProject
`projects.service.ts:566-568` — findFirst uses `and(eq(projects.id, projectId), eq(projects.orgId, orgId))`. ✓
Transaction sub-queries at lines 575-593 use `eq(tickets.orgId, orgId)` in the WHERE for tickets. ✓
FINDING: `projects.service.ts:598` — `tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId))` — NO orgId in DELETE WHERE. Safe only because projectId was verified to belong to orgId at line 566. Fragile; explicit orgId guard should be added.

### ProjectsService.linkProjectToManagedProduct
`projects.service.ts:634-637` — findFirst uses orgId. UPDATE at line 657 uses orgId. ✓

### ProjectsMembersService.listMembers
`projects-members.service.ts:148-152` — inner join on `projects` with `eq(projects.orgId, u.orgId)`. ✓

### ProjectsMembersService.getProjectRoster
`projects-members.service.ts:178-184` — `and(eq(projectTeamAssignments.projectId, projectId), eq(projectTeamAssignments.orgId, u.orgId))`. ✓
`projects-members.service.ts:204-207` — `and(eq(projectTeamMembers.orgId, u.orgId), inArray(...))`. ✓

### ProjectsMembersService.addMember
`projects-members.service.ts:234` — `assertProjectOwnership(this.db, orgId, projectId)` — verifies project belongs to org. ✓
Org member check at line 237-246 — `and(eq(organizationMembers.orgId, orgId), ...)`. ✓

### ProjectsMembersService.removeMember
`projects-members.service.ts:282` — `assertProjectOwnership(this.db, orgId, projectId)` verifies project. ✓
Transaction ticket update at line 301-306 includes `eq(tickets.orgId, orgId)`. ✓

### ProjectsMembersService.updateMemberRole
`projects-members.service.ts:339-340` — `assertProjectOwnership(this.db, orgId, projectId)` verifies project. ✓
UPDATE at lines 343-356 — WHERE is `and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, memberUserId))` — NO orgId. Safe via projectId pre-verification, but fragile.

### ProjectsMembersService.listCustomStates
`projects-members.service.ts:377-378` — `and(eq(projectStatuses.projectId, projectId), eq(projectStatuses.orgId, u.orgId))`. ✓

### ProjectsMembersService.updateCustomState
`projects-members.service.ts:482-484` — `and(eq(projectStatuses.id, stateId), eq(projectStatuses.orgId, orgId))` — orgId guards the stateId lookup. ✓
Transaction UPDATE at line 530-535 uses `eq(projectStatuses.orgId, orgId)`. ✓

### ProjectsMembersService.deleteCustomState
`projects-members.service.ts:551-553` — `and(eq(projectStatuses.id, stateId), eq(projectStatuses.orgId, orgId))`. ✓

### ProjectsMembersService.updateLabel / deleteLabel
`projects-members.service.ts:454-461`, `464-469` — both include `eq(ticketLabels.orgId, orgId)`. ✓

### ProjectsBudgetService.getBudget
`projects-budget.service.ts:29-33` — `and(eq(projects.id, projectId), eq(projects.orgId, u.orgId))` for project lookup. ✓
`projects-budget.service.ts:64-74` — timesheets query includes `eq(timesheets.orgId, orgId)`. ✓
FINDING: `projects-budget.service.ts:50-52` — `projectMembers.findMany({where: eq(projectMembers.projectId, projectId)})` — no orgId on this query. Safe only because projectId was already validated to belong to org above it.

### ProjectsBudgetService.updateBudget
`projects-budget.service.ts:122` — UPDATE WHERE `and(eq(projects.id, projectId), eq(projects.orgId, u.orgId))`. ✓

### ProjectsCustomersService.list
`projects-customers.service.ts:16` — `eq(crmOrganizations.orgId, orgId)` in WHERE. ✓

### ProjectsActivityService.resolveUserNames
`projects-activity.service.ts:199-208` — `SELECT FROM users WHERE id IN (...)` — **NO orgId filter**. User IDs are sourced from ticket assignees within the org, but the query leaks user data cross-tenant if an assignee ever references a foreign org's user ID.

---

## 3. BOLA / Object-Level Auth

### Reads
- `getProject` (endpoint 19): checks project belongs to org AND verifies caller is manager, member, or team-member. Object-level re-assertion: ✓ (`projects.service.ts:307-381`)
- `getBudget` (endpoint 23): `assertProjectAccess` verifies project belongs to org and caller is a member. ✓
- `listMembers`, `getProjectRoster` (endpoints 8, 9): `assertProjectAccess` called in service. ✓
- `listCustomStates` (endpoint 13): `assertProjectAccess` called in service. ✓

### Writes
- `updateProject` (endpoint 20): `projects.service.ts:393-423` — checks caller is org owner, has `build:manage`, is project manager, OR is project ADMIN. ✓
- `deleteProject` (endpoint 21): `projects.service.ts:556-562` — checks org owner or `build:delete`. ✓
- `addMember` (endpoint 10): `assertProjectOwnership` + `assertCanManageProject` called. ✓
- `removeMember` (endpoint 11): same guards. ✓
- `updateMemberRole` (endpoint 12): same guards. ✓
- `createCustomState` (endpoint 14): `assertCanManageProject` called. ✓
- `updateCustomState` (endpoint 15): looks up stateId with orgId in WHERE, then calls `assertCanManageProject`. ✓
- `deleteCustomState` (endpoint 16): looks up stateId with orgId in WHERE, then calls `assertCanManageProject`. ✓
- `updateBudget` (endpoint 24): `assertProjectAccess` called. ✓
- `linkProjectToManagedProduct` (endpoint 22): verifies project by orgId, verifies managedProduct by orgId. ✓

**BOLA PASS**: All endpoints re-assert object-level access. No raw id-without-tenant reads found.

**FRAGILITY NOTE**: Several service methods rely on a prior `assertProjectOwnership` call to validate `projectId` belongs to `orgId`, then issue follow-up queries without orgId in the WHERE. This is a brittle pattern; explicit orgId in every query is safer.

---

## 4. Pagination Findings

| Endpoint | Paginated? | Max Limit | Finding |
|----------|-----------|-----------|---------|
| GET /build | YES, offset | 100 | OK (`listProjectsSchema` `max(100)`) |
| GET /build/labels | NO | 300 | OK (labels are bounded in practice) |
| GET /build/:id/members | SOFT limit | 100 | OK |
| GET /build/:id/roster | SOFT limit | **500** | Roster of 500 users could be large |
| GET /build/:id/custom-states | **NO LIMIT** | **∞** | **FINDING**: unbounded select |
| GET /build/:id/labels | NO | 300 | OK |
| GET /build/customers | YES, offset | 100 | OK |

**FINDING**: `listCustomStates` at `projects-members.service.ts:374-383` has no `.limit()`:
```typescript
return this.db.select().from(projectStatuses).where(...).orderBy(projectStatuses.order);
```
Custom statuses are bounded by business logic but nothing enforces an upper bound at the DB layer.

**FINDING**: `getProject` (`projects.service.ts:313-330`) uses `with: { statuses: {...}, members: { with: { user: {...} } } }` — embeds `statuses` and all `members` (with user details) into the parent detail response. Members list is unbounded here (no limit in the relational query). This violates the "never hydrate collection through parent-detail endpoint" rule (CLAUDE.md §11).

---

## 5. N+1 Queries

### queryProjects — NOT N+1
`projects.service.ts:169-205`: After fetching the project list (max 100), runs three parallel queries (`Promise.all`) for progress, members, and teams — all scoped to `inArray(projectIds, ...)`. No per-project loop. ✓

### listProjectMembers — NOT N+1
`projects-members.service.ts:136-159`: Single SELECT with JOIN. ✓

### logTicketFieldChanges — Conditional sequential awaits
`projects-activity.service.ts:150-153`: If assigneeId changed, awaits `resolveUserNames` in the middle of building the `entries` array. Not a strict N+1 (single batch query) but blocks on a user-name lookup. Acceptable.
`projects-activity.service.ts:171-174`: Same for `resolveCycleNames`.

### addMember — Sequential un-transacted queries
`projects-members.service.ts:234-264`: Three separate DB calls before insert:
1. `assertProjectOwnership` (line 234) — query
2. `assertCanManageProject` (line 235) — 1-2 queries inside
3. org member check (line 237-246) — query
4. duplicate check (line 253-258) — query
5. INSERT (line 262-265)
Not an N+1 but 4-5 sequential round-trips; a transaction would be safer (see §6).

---

## 6. Transactions

### Multi-table writes NOT in a transaction:

**addMember** (`projects-members.service.ts:227-276`):
- Validates project, checks org membership, checks duplicates — all separate queries — then inserts.
- **Not wrapped in `db.transaction`.** A race condition between the duplicate check (line 253-258) and the insert (line 262-265) can produce a duplicate insert (the `ConflictException` at 259-260 is a catch-after-check, not atomic).

**ProjectsService.updateProject** — IS transacted:
`projects.service.ts:446-539` — wrapped in `db.transaction`. ✓

**ProjectsService.deleteProject** — IS transacted:
`projects.service.ts:571-611` — wrapped in `db.transaction`. ✓

**ProjectsProvisionService.createProject** — IS transacted:
`projects-provision.service.ts:46-114` — `db.transaction`. ✓

**ProjectsProvisionService.createFromDeal** — IS transacted:
`projects-provision.service.ts:149-208` — `db.transaction`. ✓

**ProjectsMembersService.removeMember** — IS transacted:
`projects-members.service.ts:285-319` — `db.transaction`. ✓

**ProjectsMembersService.updateCustomState** — IS transacted:
`projects-members.service.ts:515-540` — `db.transaction`. ✓

**ProjectsMembersService.deleteCustomState** — IS transacted:
`projects-members.service.ts:595-615` — `db.transaction`. ✓

---

## 7. Column Projection

### Missing projections (selects all columns):
- `projects-members.service.ts:374`: `this.db.select().from(projectStatuses)` in `listCustomStates` — no explicit column list
- `projects-members.service.ts:479`: `this.db.select().from(projectStatuses)` in `updateCustomState`
- `projects-members.service.ts:550`: `this.db.select().from(projectStatuses)` in `deleteCustomState`

The `listLabels` call uses `findMany` with no `columns` option (`projects-members.service.ts:438-443`) — returns all label columns (name, color, orgId, timestamps). Low risk given small table, but explicit projection is preferred.

### Good projections:
- `queryProjects` at `projects.service.ts:136-150`: explicit `select({...})` with named columns. ✓
- `listMembers` at `projects-members.service.ts:138-147`: explicit `select({...})`. ✓
- Budget queries in `projects-budget.service.ts`: explicit projections. ✓
- `getProject` uses Drizzle relational `findFirst` with explicit `columns` in the user sub-selection (`projects.service.ts:318-327`). ✓

---

## 8. Validation

All endpoint bodies and queries are validated via `ZodValidationPipe`:
- Bodies: `@Body(new ZodValidationPipe(<schema>))` pattern used consistently across all 4 controllers.
- Queries: `@Query(new ZodValidationPipe(<schema>))` on paginated endpoints.
- Schemas live in dedicated `dto/*.schemas.ts` files — ✓ compliant with CLAUDE.md §7.
- `ParseIntPipe` used for all `projectId`, `labelId`, `stateId` route params. ✓

DTO files:
- `dto/projects.schemas.ts` (653 lines) — contains all project + ticket + roadmap + template schemas. **Oversized** — these could be split by concern (ticket schemas to `dto/tickets.schemas.ts`, roadmap to `dto/roadmap.schemas.ts`).
- Other DTO files are all <50 lines. ✓

---

## 9. Caching

### Cache usage in `ProjectsService`:
`projects.service.ts:62-67` — `listProjects` uses:
```
key = `projects:list:${orgId}:${userId}:${scope}:${input.status}:${input.search ?? ""}:${input.page}:${input.limit}`
```
Key includes orgId, userId, scope — properly tenant+user scoped. ✓
TTL: `CACHE_TTL.SHORT` — short expiry. ✓

**Invalidation**:
- `updateProject`: `projects.service.ts:550` — `this.cache.invalidatePattern(`projects:list:${orgId}:*`)` — flushes all page/filter combos for that org. ✓
- `deleteProject`: `projects.service.ts:622` — same pattern. ✓
- `createProject`/`createFromDeal`: `projects-provision.service.ts:132` — same pattern. ✓

### Cache is NOT used in:
- `getProject` — no cache; reads DB directly. Appropriate for a detail view.
- `getBudget` — no cache; live timesheet data.
- `listMembers`, `listCustomStates`, `listLabels` — no cache.

### No blanket cache flush found. Invalidation is always org-scoped. ✓

---

## 10. File Sizes

| File | LOC | Status |
|------|-----|--------|
| projects.controller.ts | 233 | OK |
| projects.service.ts | **682** | **OVER 500 cap** |
| projects-by-id.controller.ts | 72 | OK |
| projects-by-id.module.ts | 9 | OK |
| projects.module.ts | 96 | OK |
| projects-members.service.ts | **619** | **OVER 500 cap** |
| projects-provision.service.ts | 221 | OK |
| projects-budget.controller.ts | 44 | OK |
| projects-budget.service.ts | 128 | OK |
| projects-customers.controller.ts | 30 | OK |
| projects-customers.service.ts | 51 | OK |
| projects-activity.service.ts | **321** | **OVER 300 (soft)** |
| projects-scope.ts | 16 | OK |
| dto/projects.schemas.ts | **653** | **OVER 500 cap** |
| dto/automation.schemas.ts | 31 | OK |
| dto/checklist.schemas.ts | 29 | OK |
| dto/custom-fields.schemas.ts | 32 | OK |
| dto/projects-customers.schemas.ts | 9 | OK |
| dto/projects-workspace-members.schemas.ts | 17 | OK |
| dto/releases.schemas.ts | 46 | OK |
| dto/webhook.schemas.ts | 9 | OK |

---

## 11. Permission Key Verification

All keys used in these 4 controllers, verified against catalog:

| Key Used | Controller:Line | In Catalog? | Catalog Location |
|----------|-----------------|-------------|-----------------|
| `"build:view"` | projects.controller.ts:57 | YES | permissions/shared.ts:36 |
| `"build:create"` | projects.controller.ts:66 | YES | permissions/shared.ts:42 |
| `"build:manage"` | projects.controller.ts:94 | YES | permissions/shared.ts:60 |
| `"build:delete"` | projects-by-id.controller.ts:53 | YES | permissions/shared.ts:54 |
| `"build:managed-products:update"` | projects-by-id.controller.ts:63 | YES | permissions/build.ts:274 |
| `"build:customers:view"` | projects-customers.controller.ts:22 | YES | permissions/build.ts:218 |

**FINDING**: `"build:update"` is in the catalog at `permissions/shared.ts:47-52` but is **never used** by any controller. The `PATCH /build/:projectId` endpoint (which updates a project) uses `"build:view"` instead. This is the key mismatch at the root of finding #1.

---

## 12. E2E Test Coverage

Three spec files exist (skipped in standard CI without `RBAC_E2E_DATABASE_URL`):
- `projects.controller.e2e-spec.ts` — auth/RBAC checks (401/403 for unauthenticated requests on all routes)
- `projects-access.e2e-spec.ts` — member vs. outsider access to project sub-resources
- `projects-scope.e2e-spec.ts` — list scope enforcement (admin sees all, member sees own)
- `projects-team-access.e2e-spec.ts` — team-based access inheritance

Unit specs: `projects-scope.spec.ts`, `tickets-scope.spec.ts`, `workflow-enforcement.spec.ts`, `projects-provision-plan-limit.spec.ts`.

**GAP**: No unit test for `addMember` race condition. No test for the `build:view` on write endpoints (the e2e spec only checks 401/403 for unauthenticated, not under-permissioned callers).

---

## Ranked Findings

### F1 — SECURITY P0: 7 write endpoints gated with `"build:view"` (read permission)
`projects.controller.ts:142, 153, 164, 185, 196, 208`; `projects-by-id.controller.ts:43`

Write mutations — add/remove/update member, create/update/delete custom-state, update project — all declare `@RequirePermission("build:view")` at the controller (PermissionGuard) level. While each service method does an additional `assertCanManageProject` check, the guard layer lets ANY user with `build:view` reach these mutation code paths. The catalog has `"build:update"` (`shared.ts:47`) and `"build:manage"` specifically for write access; neither is applied on these endpoints at the controller level.

### F2 — DESIGN P1: `"build:update"` permission in catalog is dead — never enforced
`permissions/shared.ts:47-52` defines `"build:update"` with description "Update projects". No controller uses it. `PATCH /build/:projectId` should require `"build:update"` not `"build:view"`.

### F3 — FILE SIZE P1: 3 files over 500-line cap
- `projects.service.ts`: 682 lines — split by concern: `projects-crud.service.ts`, `projects-member-ops.service.ts`
- `projects-members.service.ts`: 619 lines — split: labels + states + members
- `dto/projects.schemas.ts`: 653 lines — split: `ticket.schemas.ts`, `roadmap.schemas.ts`, keep core project schemas

### F4 — PERF P2: Unbounded `listCustomStates` query
`projects-members.service.ts:374-383`: `select().from(projectStatuses).where(...).orderBy(...)` — no `.limit()`. Add `.limit(100)` or similar cap.

### F5 — PERF P2: `getProject` embeds unbounded members list via relational query
`projects.service.ts:313-330`: `db.query.projects.findFirst({ with: { statuses: {...}, members: { with: { user: {...} } } } })` — `members` sub-relation has no limit, fetching ALL members of the project in the detail response. This is the "never hydrate collection through parent-detail endpoint" violation (CLAUDE.md §11).

### F6 — COLUMN PROJECTION P2: 3 `select()` calls with no column list
`projects-members.service.ts:374` (listCustomStates), `projects-members.service.ts:479` (updateCustomState), `projects-members.service.ts:550` (deleteCustomState). Add explicit `select({ id: ..., name: ..., ... })`.

### F7 — TRANSACTION SAFETY P2: `addMember` check-then-insert is not atomic
`projects-members.service.ts:253-265`: duplicate check at line 253 is a separate query from the INSERT at line 262. Under concurrent requests, two callers can both pass the duplicate check and then both insert. Should be a single `INSERT ... ON CONFLICT DO NOTHING RETURNING` or wrapped in a transaction with an advisory lock.

### F8 — PERF P2: Leading-wildcard ILIKE in search (two sites)
`projects.service.ts:117-121`: `ILIKE ${"%" + search + "%"}` — can't use a B-tree index. Use `pg_trgm` GIN index instead.
`projects-customers.service.ts:18`: same pattern.

### F9 — SECURITY P3: `resolveUserNames` has no orgId filter
`projects-activity.service.ts:199-208`: `SELECT FROM users WHERE id IN (...)` without orgId. User IDs come from ticket assignees within the org, so in practice safe, but a cross-org assigneeId reference (e.g., from a data-import bug) would leak another org's user name.

### F10 — FRAGILITY P3: Two DELETE/UPDATE queries have no explicit orgId in WHERE
`projects.service.ts:598`: `tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId))` — relies on prior project-to-org verification.
`projects-members.service.ts:343-355`: `updateMemberRole` UPDATE WHERE lacks orgId.
Both are safe today but fragile — a future refactor that skips the prior check would silently break tenant isolation.

### F11 — ROSTER LIMIT P3: `getProjectRoster` limit is 500
`projects-members.service.ts:210`: `.limit(500)` for team member list. This could return 500 user records in a single response. Reduce to 100 or paginate.

### F12 — E2E GAP P3: Write-permission mismatch not caught by tests
The existing e2e spec at `projects.controller.e2e-spec.ts` checks 401/403 for unauthenticated callers only. No test verifies that a user with only `build:view` (but not `build:manage`) cannot add members or update projects — so F1 is currently undetected by the test suite.

---

## Endpoints Missing Permission Decorators
None found. All 25 audited endpoints have `@RequirePermission(...)` explicitly applied.

## Endpoints Missing Tenant Scoping in WHERE
All service methods that query by projectId first validate the project belongs to the org (either via `assertProjectOwnership`, `assertProjectAccess`, or a direct `and(eq(...orgId...), ...)` findFirst). No bare id-without-org reads found.

However, two queries LACK explicit orgId in the final write WHERE, relying on a prior validation:
- `projects.service.ts:598`: DELETE projectMembers by projectId only
- `projects-members.service.ts:343-355`: UPDATE projectMembers by projectId + userId only
