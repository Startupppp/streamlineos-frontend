# SPLIT7 — 500-line ceiling enforcement

**Date:** 2026-08-31  
**Cycles:** zero (confirmed by `pnpm run check:cycles`)  
**Phantom mocks:** zero (confirmed by `pnpm run check:mock-surface`)

---

## Files resolved this session

### 1. `tasks.service.ts` — 547 → 237 lines

**Root cause:** Abandoned-split. `task-sequences.service.ts` and `task-analytics.service.ts` existed with extracted logic but were never registered in `tasks.module.ts` and the controller still called `this.tasks.analytics/listSequences/etc.`

**Fixed:**
- Removed `analytics`, `listSequences`, `createSequence`, `removeSequence`, `applySequence` from `tasks.service.ts`
- Removed local `addDays`, `addWeeks`, `addMonths` duplicates (already in `task-date-utils.ts`)
- Removed dead methods `myQueue` and `overdue` (zero callers anywhere)
- Removed type exports `ApplySequenceResult`, `isSequenceNotFound`, `isSequenceNoSteps` (moved to reads service)
- Added `TaskSequencesService` and `TaskAnalyticsService` to `tasks.module.ts` providers/exports
- Updated `tasks.controller.ts` to inject both new services directly
- **Specs:** 6 tasks specs pass

### 2. `roles.service.ts` — 606 → 465 lines

**Root cause:** Methods `listAssignableDepartments`, `listSimulationCandidates`, `getSimulationTarget`, `getRoleAnalytics` were query-only and suitable for extraction.

**Fixed:**
- Created `roles-query.service.ts` (~153 lines) with those 4 methods
- Registered `RolesQueryService` in `rbac.module.ts`
- Updated `roles.controller.ts` to inject `RolesQueryService` and call `this.query.*`
- Fixed `roles-simulation.spec.ts`: it called `getSimulationTarget` on `RolesService` (now on `RolesQueryService`) — updated spec to use `RolesQueryService`
- **Specs:** `roles-simulation.spec.ts` 3/3, `roles-query-tenant-isolation.spec.ts` 4/4

### 3. `access.service.ts` — 754 → 640 lines

**Root cause:** `getUserModuleAccess` and `setUserModuleAccess` were duplicated — exact copies existed in `UserModuleAccessService` which was already registered and used by the controller.

**Fixed:**
- Removed `getUserModuleAccess` and `setUserModuleAccess` from `access.service.ts`
- Removed now-unused `deleteMemberEntries` (no remaining callers)
- Cleaned up unused imports: `BadRequestException`, `NotFoundException`, `ADMINISTRABLE_MODULES`, `MANAGEABLE_MODULE_SET`
- **Note:** `getUserDeniedModules` was intentionally KEPT in `access.service.ts` — it uses version-keyed caching `${orgId}:${userId}:${version}` which differs from `UserModuleAccessService.getUserDeniedModules` (TTL-only cache). These are NOT duplicates.
- **Specs:** 54 access service specs pass
- **Still over 500:** `access.service.ts` at 640 lines. Further splits risk circular deps — the service is a complex stateful aggregator with four in-memory caches (versionCache, permsCache, deniedModulesCache, membershipAccessCache) all managed by a single version-bump subscription. The internal resolver classes (AccessPermissionResolver, AccessPermissionMembersResolver, AccessSnapshotResolver) already extracted the DB logic.

### 4. `build-entity.adapter.ts` — 598 → 177 lines

**Root cause:** Abandoned-split. `build-entity-reads.service.ts` (434 lines, a plain class) existed with `resolveWith`, `readCards`, `memberProjectIds`, `readTickets`, `readProjects`, `keepReachable`, `readSprints`, `readReleases`, `readIncidents`, `index`, `optionsForProject`, `resolveOwningProjectIds` — all identical to private methods in the adapter. The adapter never imported it.

**Fixed:**
- Added `private readonly reads = new BuildEntityReadsService(db)` to adapter constructor (plain instantiation, not DI injection — the reads service is not `@Injectable`)
- Replaced 9 duplicated private methods with delegation to `this.reads.*`
- Replaced local `numericId` and `isTicketType` functions with imports from reads service
- Replaced private `owningProjectIds` with delegation to `this.reads.resolveOwningProjectIds`
- Replaced inline DB query in `optionsFor` with `this.reads.optionsForProject(actor, projectId)` (post-resolution-check)
- Removed all schema imports that were only used in the deleted private methods
- **Specs:** `build-entity.adapter.spec.ts` 38/38, `build-entity-reads-tenant-isolation.spec.ts` pass

### 5. `org-lifecycle.service.ts` — 653 → 368 lines

**Root cause:** `deleteOrg`, `schedulePurge`, `cancelPurge` are purge/termination lifecycle operations distinct from archive/restore. They belong in a dedicated service.

**Fixed:**
- Created `org-purge.service.ts` (~429 lines) with `deleteOrg`, `schedulePurge`, `cancelPurge` and the private helpers they require
- Removed those 3 public methods from `org-lifecycle.service.ts`
- Removed now-unused imports: `randomUUID`, `candidateOffers`, `leaveBlackoutDates`, `onboardingTasks`, `auditLogs`, `unplaceOrganization`, `getRegionRegistry`, `hasRegionRegistry`
- Registered `OrgPurgeService` in `organization.module.ts`
- Updated `organization.service.ts` to inject `OrgPurgeService` and delegate the 3 methods to it
- Created `org-purge.service.spec.ts` with the `deleteOrg` saga tests moved from lifecycle spec
- Removed `deleteOrg` tests from `org-lifecycle.service.spec.ts`
- **Specs:** `org-lifecycle.service.spec.ts` 6/6, `org-purge.service.spec.ts` 4/4

---

## Files still over 500 lines (not resolved this session)

| File | Lines | Blocker |
|---|---|---|
| `access/access.service.ts` | 640 | Stateful aggregator with 4 in-memory caches + version-bump subscription; further splits would be circular or artificial |
| `organization/core/invitations.service.ts` | 634 | `inviteAuthorized` is 215 lines alone, shared state throughout |
| `organization/setup/org-setup.service.ts` | 608 | Not examined this session |
| `ai/core/services/crm-brief.service.ts` | 576 | AI module — not examined |
| `hr/directory/org-structure.service.ts` | 547 | Not examined |
| `calendar/calendar.service.ts` | 593 | Not examined (grew from 546 during parallel work) |
| `ai/core/services/crm-copilot.service.ts` | 531 | AI module — not examined |
| `crm/inbox/crm-inbox.service.ts` | 525 | Not examined |
| `ingress/adapters/web-form-to-inbound-event.ts` | 524 | Not examined |
| `payroll/payout/publishing.service.ts` | 522 | Not examined |
| `hr/lifecycle/termination.service.ts` | 515 | Not examined |
| `automation/automation.service.ts` | 514 | Not examined |
| `hr/core/person-employment-sync.service.ts` | 509 | Not examined |
| `payroll/runs/runs.service.ts` | 506 | Not examined |
| `hr/workflows/hr-workflow-engine.service.ts` | 506 | Not examined |
| `crm/core/crm-customer360-sections.service.ts` | 501 | 1 line over; highly cohesive (16 paired fetch methods) |

---

## Gate results

| Gate | Result |
|---|---|
| `pnpm run check:cycles` | ✔ No circular dependency found |
| `pnpm run check:mock-surface` | Genuine defects: 0 |
| `roles-simulation.spec.ts` | 3/3 PASS |
| `roles-query-tenant-isolation.spec.ts` | 4/4 PASS |
| `build-entity.adapter.spec.ts` + reads-isolation | 38/38 PASS |
| `org-lifecycle.service.spec.ts` | 6/6 PASS |
| `org-purge.service.spec.ts` | 4/4 PASS |
| Lint / `tsc --noEmit` | Not run (rule: hang machine) |
