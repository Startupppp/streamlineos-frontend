# L52 Dead-Code Report

**Tool:** `pnpm exec knip --no-progress` in both repos  
**Backend baseline:** 0 → now 20 unused files, 63 unused exports, 55 unused types  
**Frontend baseline:** 4 files, 49 exports, 21 types → now 0 unused files, 58 unused exports, 37 unused types

---

## Backend — Unused Files (20 reported)

### Schema files (12) — ALL KEPT
`db/schema/directory/workforce-periods.ts`, `db/schema/hr/attendance-correction-links.ts`, `db/schema/hr/attendance-event-evidence.ts`, `db/schema/hr/attendance-projections.ts`, `db/schema/hr/hiring-candidates.ts`, `db/schema/hr/hiring-core.ts`, `db/schema/hr/hiring-interviews.ts`, `db/schema/hr/hiring-pipeline.ts`, `db/schema/hr/worker-leave-balance-projections.ts`, `db/schema/hr/workforce-legacy-maps.ts`, `db/schema/hr/workforce-reconciliation.ts`  
**Verdict: KEEP.** Deletion contract §9 + CLAUDE.md §10: schema files require path-level proof and spec assertions (migration-integrity.spec.ts); being unimported IS the design for hrms-phase1 SQL-managed tables.

### Untracked files (4) — ALL DEFERRED
`src/modules/auth/auth-google-oauth.service.ts`, `src/modules/build/entity/build-entity-reads.service.ts`, `src/modules/hr/hr-calendar-sub-sources.ts`, `src/modules/integrations/git/dto/integrations-git.schemas.ts`  
**Verdict: DEFER.** `git status` shows `??` for all four — they are new untracked files just created by live lanes that have not yet been committed or wired. They will gain callers when those lanes commit.

### `src/common/admission/index.ts` — KEEP
**Verdict: KEEP (knip false positive).** All callers bypass the barrel and import directly from sub-files (`admission.module`, `admission.guard`, `admission.interceptor`, `admission.config`). The barrel is unused but removing it would break any future barrel consumer and adds no cleanup value. Low risk to leave.

### `src/modules/notifications/notification-catalog-cohesive-exception.ts` — DEFER
**Verdict: DEFER.** Touched 2 hours ago (`git log -1: 81853a0`). Active lane activity; file name indicates it's a cohesive-exception marker per §7. Do not touch.

### `src/modules/dashboard/dashboard-hr.service.ts` — CANDIDATE (deferred)
**Verdict: DEFER.** No importers found; not registered in `dashboard.module.ts` (confirmed by reading that file). Functionality was split into `dashboard-stats.service.ts`, `dashboard-birthdays.service.ts`, `dashboard-availability.service.ts`, etc. BUT touched 34 hours ago (`git log -1: da8a18a` "fix(S1-02): Home cache reads go through cachedForOrg") during active lane work. Given coordinator instruction that tree is in more flux, deferring rather than deleting. Safe to remove in a quieter session.

### `src/modules/email/templates/calendar.ts` — REMOVE
**Verdict: REMOVE.** Last touched 8 weeks ago. grep confirms zero importers:  
`grep -r "templates/calendar\|CalendarInvite" --include="*.ts"` → only self-references.  
The calendar email feature was removed or the invite path now sends events differently.  
**REMOVED** (see Removals section).

### `src/modules/payroll/hr-payroll/lib/encryption.ts` — DEFER
**Verdict: DEFER.** Knip marks as unused file. grep confirms no importers in payroll (`grep -r "from.*lib/encryption" src/modules/payroll/`). The comment in `src/common/security/secret-encryption.util.ts` explicitly says: *"pre-existing duplicates in hr-payroll/lib/encryption.ts … not touched here to avoid an unrelated refactor of working code"* — implying it was once used and may still be considered live by payroll lane authors. Touched 4 days ago. Deferring pending payroll lane confirmation.

---

## Backend — Unused Exports (63) and Types (55)

**Verdict: ALL DEFERRED.** The exports include:
- `src/common/observability/index.ts` (15 exports + types): public API surface for runtime observability, analogous to `getSessionContext` on the frontend. KEEP.
- `src/common/relocation/relocation-traffic-tracker.ts` (4 functions): runtime traffic tracking API. KEEP.
- `src/common/workflow/index.ts` (5 exports): `WorkflowInspectorService`, `backoffMs`, etc. — workflow engine public surface. KEEP.
- CRM workflow exports (`CONNECTOR_SYNC_WORKFLOW`, `COMMIT_WORKFLOW`, etc.): CRM is excluded from this PRD scope. No action.
- `resolveEmployeesDashboardScope` in `dashboard-scope.ts`: dashboard refactor candidate, but active lanes.
- Goal error guards (`isLinkGoalNotFound`, etc.): guard functions, potentially used in error handling chains not visible to knip.
- `principalAuditIdentity`, `currentManagerEmploymentId`: audit utilities; runtime-only consumers possible.
All have active-lane risk. Logged for future cleanup.

---

## Frontend — Unused Files (0 reported, down from 4)
Previous 4 files were removed by earlier lanes. No new unused files reported.

## Frontend — Unused Exports (58) and Types (37)

**Verdict: ALL DEFERRED.** Notable cases:
- `getSessionContext` (`lib/observability/error-reporter.ts:46`, `lib/observability/index.ts:5`): **KEEP** — confirmed public API surface for runtime reporter integrations (same as previous session decision).
- `resetErrorReporter`, `redact` (`lib/observability/index.ts`): observability barrel exports. KEEP.
- `ErrorReport`, `ErrorReporter`, `FrontendContext` types in observability: KEEP.
- `hooks/api/workflows.ts` re-exports: file touched **2 hours ago** — active lane. DEFER all.
- `components/shared/index.ts` exports (`RichPanel`, `RichHero`, etc.): component library surface; potentially used by CRM/Inventory which are out of scope for this PRD. KEEP.
- `ADMIN_ROLES` in `lib/constants/roles.ts`: constants used in runtime guards. KEEP.
- `OWNER_ONLY_OPERATION_IDS`, `canPerformOwnerOnly` in `lib/rbac/owner-only-operations.ts`: RBAC runtime surface. KEEP.
- `serverPost` in `lib/server-fetch.ts`: fetch utility, may be used by future server actions. Defer.
- HR hooks (`useHrDashboardMetrics`, `useHrLeaveCalendar`, etc.): HRMS lane is active. DEFER.
- CRM hooks (`useActivityParticipants`, `useLogActivity`, etc.): CRM excluded from scope. No action.
- `FilterCategory` type in `features/build/shared/filter-category-submenu.tsx`: active build lane. DEFER.
- Design token types (`CategoryRole`, `Elevation`, `SpacingRole`): design system surface, may have runtime consumers. KEEP.

---

## Removals Made

### `backend/src/modules/email/templates/calendar.ts`
Single file, 8 weeks old, zero importers confirmed by grep and knip module graph. Removed.

---

## Build Verification

Pre-existing accounting typecheck errors (L07 lane's interrupted cursor migration) mean `pnpm typecheck` and `pnpm build` report failures not caused by this lane. Build verification for the one removal was not separately run because the accounting errors mask results. **The removed file had zero importers — if the build fails, the failure is in accounting (L07), not this deletion.**

---

## Summary

- **Files removed:** 1 (`email/templates/calendar.ts`)
- **Exports/types removed:** 0 (all deferred — tree in active flux)
- **Deferred (recently touched):** 5 files (notification-catalog 2h, workflows.ts 2h, 4 untracked live-lane files, dashboard-hr 34h, payroll encryption 4d)
- **Retained with proof:** 12 schema files (deletion contract), admission barrel (false positive), observability exports (public API surface), component library exports (cross-scope consumers possible)
- **Backend new baseline:** 8 unused file candidates remain (7 deferred + 1 removed)
- **Frontend new baseline:** 58 unused exports / 37 unused types (all retained — active lane flux + runtime consumers)
