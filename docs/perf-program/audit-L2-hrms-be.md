# HRMS Backend Performance & Cleanup Audit — L2

**Date:** 2026-10-22  
**Scope:** `backend/src/modules/hr/**` + HR-called code in payroll/expenses/directory/goals/timesheets  
**Rules audited:** BE-07, BE-25, BE-47, BE-107, BE-119–126, BE-132, BE-143/144, BE-152/153, BE-158–160

---

## Summary Counts

| Category | Findings |
|---|---|
| 1. Duplicate / alias keys | 3 |
| 2. Inefficient DB access | 16 |
| 3. Caching gaps | 12 |
| 4. Pagination (offset / no-cursor) | 7 |
| 5. Dead and duplicate code | 6 |
| 6. NestJS principle violations | 10 |
| **Total** | **54** |

---

## Category 1 — Duplicate / Alias Keys

3 findings across DTO schemas and service interfaces.

- [ ] `backend/src/modules/hr/core/dto/hr-core.schemas.ts:4–7` — `const paginationSchema` is defined (with `page: pageNumberField`) but is never exported and is referenced nowhere else in the file; dead variable — delete the four lines (BE-152)
- [ ] `backend/src/modules/hr/time/attendance-clock.service.ts:41,70,78` — three public methods accept `organizationId: string` while every other HR service uses `orgId` as the canonical name; rename the parameter to `orgId` in all three method signatures and their call sites (BE-158)
- [ ] `backend/src/modules/hr/onboarding/core/onboarding-admin.service.ts:53,70` — `getProgressSummary(organizationId: string)` and `getProgressPage(organizationId: string, …)` use `organizationId` rather than `orgId`; rename to match the module convention (BE-158)

---

## Category 2 — Inefficient DB Access

16 findings: sequential independent awaits, N+1 write loop, unprojected selects on wide tables.

### Sequential independent awaits (→ Promise.all)

- [ ] `backend/src/modules/hr/time/attendance-read.service.ts:34–35` — `requireOrganizationMembershipId` and `orgBusinessDate` are independent DB calls issued one after the other; replace with `const [userMembershipId, today] = await Promise.all([requireOrganizationMembershipId(…), orgBusinessDate(…)])` (BE-160)
- [ ] `backend/src/modules/hr/time/attendance-read.service.ts:38–84` — `todayLogs` query (line 38) and `logs` query (line 80) both hit `attendance`; `logs` does not depend on `todayLogs` result; issue both in a single `Promise.all` and derive `status` from `todayLogs` after both resolve (BE-160)

### N+1 write loop

- [ ] `backend/src/modules/hr/core/hr-effective-change-applier.service.ts:150` — `for (const change of due) await this.applyOne(tx, …)` issues one `UPDATE hr_employments` per row serially; batch employment updates by change-type (one `UPDATE … WHERE id = ANY(…)` per change-type group where fields differ) and keep only the `compensation`/`manager` branches sequential for their upsert semantics (BE-160, BE-47)

### Unprojected `.select()` on wide tables (BE-07)

Wide = table has `jsonb`, `text` (content bodies), or many columns the caller ignores.

- [ ] `backend/src/modules/hr/benefits/hr-benefits-plans.service.ts:96` — `listPlans` calls `.select()` on `hr_benefit_plans` which has `coverage: jsonb`; project the columns the response schema declares
- [ ] `backend/src/modules/hr/benefits/hr-benefits-plans.service.ts:115` — `getPlan` same table, same fix
- [ ] `backend/src/modules/hr/benefits/hr-benefits-plans.service.ts:186` — `listWindows` calls `.select()` on `hr_benefit_enrollment_windows`; project needed columns; also: no cursor (see Cat 4)
- [ ] `backend/src/modules/hr/benefits/hr-benefits-plans.service.ts:212` — `updateWindow` reads `*` for existence check; project only `{ id: …, orgId: … }` before the update
- [ ] `backend/src/modules/hr/benefits/hr-benefits-claims.service.ts:140` — `reviewClaim` reads `*` from `hr_insurance_claims` as an existence guard; project `{ id, orgId, status, payoutRoute }` only
- [ ] `backend/src/modules/hr/benefits/hr-benefits-claims.service.ts:241` — `getDueLoanRepayments` reads `*` at a 2 000-row hard limit (no cursor, unbounded payroll batch); add an explicit projection and replace the hard limit with a bounded cursor page emitting `complete: false` when truncated
- [ ] `backend/src/modules/hr/benefits/hr-benefits-enrollment.service.ts:26,44,83` — `waive` reads `*` from `hr_benefit_enrollments` three times; project `{ id, planId, status, orgId }`
- [ ] `backend/src/modules/hr/cases/hr-cases.service.ts:140` — `getById` reads `*` from `hr_cases` (has `metadata: jsonb`, `resolutionNotes: text`); project the fields checked for authorization (`id`, `orgId`, `assignedToMembershipId`, `confidential`) plus those echoed back
- [ ] `backend/src/modules/hr/cases/hr-cases.service.ts:327,386` — `listNotes` and `listDocuments` each read `*` from `hrCaseNotes` / `hrCaseDocuments` with a hard limit of 100 and no cursor; add explicit projection and keyset cursor (see Cat 4)
- [ ] `backend/src/modules/hr/config/hr-document-templates.service.ts:30,39` — `list` and `getById` both read `*` from `document_templates` which has `content: text` (large); project without `content` in list; echo full row only in `getById` if the response schema needs it
- [ ] `backend/src/modules/hr/core/hr-employments.service.ts:382` — `transitionStatus` lock-read reads `*` from `hr_employments`; only `lifecycleStatus` and `rowVersion` are needed for the guard and the audit log
- [ ] `backend/src/modules/hr/core/hr-timeline.service.ts:430` — reads `*` from `hr_effective_dated_changes` (includes `oldValue: jsonb`, `newValue: jsonb`, `metadata: jsonb`); project the columns the timeline view renders

---

## Category 3 — Caching

12 findings: `cache.cached` where `cachedVersioned` is required, namespaces not registered, invalidation gaps.

### Analytics-plus: no invalidation ever

- [ ] `backend/src/modules/hr/analytics-plus/hr-analytics-plus.service.ts:44–88` — 6 `cache.cached` calls (not `cachedVersioned`); keys `hr:analytics-plus:attrition:*`, `:leave:*`, `:payroll:*`, `:engagement:*`, `:perf:*`, `:compliance:*` are not in `CACHE_KEYS` or `cache-invalidation-hr.ts`; no writer anywhere invalidates them — hiring, termination, leave mutations, payroll all miss; migrate to `cachedVersioned` under new namespace constants in `CACHE_KEYS`; add invalidation in `EmployeeOnboardingService.invalidateHrDashboardCache`, `TerminationLifecycleService.invalidateHrDashboardCache`, `LeavesWriteService`, and payroll run completion (BE-119, BE-121, BE-122, BE-159)

### Dashboard metrics: incomplete invalidation

- [ ] `backend/src/modules/hr/lifecycle/hr-dashboard.service.ts:153` — `hr:compliance:${orgId}` cached via `cache.cached`; NO writer ever invalidates this key; hiring and termination writers (which change compliance coverage) do not call `cache.invalidate` on it; add invalidation to both `EmployeeOnboardingService.invalidateHrDashboardCache` and `TerminationLifecycleService.invalidateHrDashboardCache` (BE-119)
- [ ] `backend/src/modules/hr/lifecycle/hr-dashboard.service.ts:244` — `hr:dashboard:diversity:${orgId}` via `cache.cached`; same gap — no writer invalidates; add to both invalidate helpers (BE-119)
- [ ] `backend/src/modules/hr/lifecycle/hr-dashboard-reports.service.ts:96` — `hr:dashboard:time-to-fill:${orgId}` via `cache.cached`; no writer calls `cache.invalidate` on it; hiring/offer-acceptance paths should invalidate (BE-119)
- [ ] `backend/src/modules/hr/lifecycle/hr-dashboard-reports.service.ts:157` — `hr:dashboard:attendance-analytics:${orgId}` via `cache.cached`; `AttendanceClockService` (clock-in/out writers) never invalidates it; add invalidation to `AttendanceEventWriterService` or `AttendanceClockService` (BE-119)

### Policy detail: wrong cache primitive, no list cache

- [ ] `backend/src/modules/hr/policies/hr-policies.service.ts:47,125` — detail cache uses a file-local `POLICY_CACHE` factory (not in `CACHE_KEYS`) and `cache.cached` (not `cachedVersioned`); `list` endpoint has no cache at all; migrate detail to `cachedVersioned` under `CACHE_KEYS.hrPolicyDetailNamespace`; add a versioned list cache keyed by `type`+`status`+`search` subkey (BE-120, BE-121)
- [ ] `backend/src/modules/hr/policies/hr-policies.service.ts:330–332` — `activate` archives predecessor policies with `inArray` in a transaction but only invalidates the newly-activated policy's cache (line 334); the stale predecessor caches still carry `status: active`; add `cache.invalidate(POLICY_CACHE(orgId, id))` for each predecessor ID before committing (BE-119)

### Hiring flows and candidates: unregistered namespaces

- [ ] `backend/src/modules/hr/interviews/hr-hiring-flows.service.ts:24` — `cachedVersioned` uses namespace string `hr:hiring-flows:${orgId}` that is not in `CACHE_KEYS` and not in `cache-invalidation-hr.ts`; add `hiringFlowsNamespace: (orgId: string) => namespace(...)` to `CACHE_KEYS` and register in `HR_CACHE_ENTRIES` (BE-121, BE-122)
- [ ] `backend/src/modules/hr/recruitment/recruitment-candidates.service.ts:92` — `cachedVersioned` uses namespace `hr:candidates:list:${orgId}` not in `CACHE_KEYS` or `HR_CACHE_ENTRIES`; same fix (BE-121, BE-122)

### Onboarding / termination invalidation gaps

- [ ] `backend/src/modules/hr/directory/employee-bulk-onboarding.service.ts:337–341` and `backend/src/modules/hr/directory/employee-onboarding.service.ts:610–614` — post-onboarding invalidation calls `hr:analytics` and `hr:dashboard:metrics` and `hr:celebrations` but misses `hr:compliance`, `hr:dashboard:diversity`, `hr:dashboard:time-to-fill`, and all `hr:analytics-plus:*` keys; extend both helpers to cover the full set (BE-119)
- [ ] `backend/src/modules/hr/lifecycle/termination-lifecycle.service.ts:108–111` — same invalidation gap as above for the termination path; misses compliance, diversity, time-to-fill, analytics-plus (BE-119)

---

## Category 4 — Pagination

7 findings: offset-based responses or hard-limit lists that should be keyset-paginated.

- [ ] `backend/src/modules/hr/interviews/hr-hiring-flows.service.ts:38` — `buildListResponse({ page: 1, pageSize: limit })` returns a total-count envelope with no cursor; replace with `buildCursorPage` keyed by `(isDefault DESC, createdAt DESC, id DESC)` (BE-25)
- [ ] `backend/src/modules/hr/automations/hr-automation-engine.service.ts:235` — automation rules list uses `buildListResponse`; replace with keyset cursor on `(createdAt DESC, id DESC)` (BE-25)
- [ ] `backend/src/modules/hr/automations/hr-webhooks.service.ts:64` — webhook subscriptions list uses `buildListResponse`; replace with keyset cursor (BE-25)
- [ ] `backend/src/modules/hr/automations/hr-webhooks.service.ts:171` — webhook deliveries list uses `buildListResponse`; replace with keyset cursor (BE-25)
- [ ] `backend/src/modules/hr/analytics-plus/hr-analytics-plus-drilldown.ts:15` — `offset = (page - 1) * limit` OFFSET pagination on a per-metric drill-down; replace with keyset cursor on the primary key of each metric table to avoid skip drift (BE-25, BE-160)
- [ ] `backend/src/modules/hr/cases/hr-cases.service.ts:327` — `listNotes` returns up to 100 rows with no cursor; add `keysetBeforeId` cursor on `(createdAt DESC, id DESC)` (BE-25)
- [ ] `backend/src/modules/hr/cases/hr-cases.service.ts:386` — `listDocuments` same: 100-row hard limit, no cursor; add keyset cursor (BE-25)

---

## Category 5 — Dead and Duplicate Code

6 findings.

- [ ] `backend/src/modules/hr/core/dto/hr-core.schemas.ts:4–7` — `const paginationSchema` is never exported and has zero references; delete it (BE-152)
- [ ] `backend/src/modules/hr/policies/hr-policies.service.ts:338–344` — `detectConflicts` and `detectOrgConflicts` are pure pass-through methods: their entire bodies forward arguments unchanged to `this.conflicts.detectConflicts` and `this.conflicts.detectOrgConflicts`; delete both wrappers and point the two controller call sites (`hr-policies.controller.ts:102,179`) directly at `HrPolicyConflictService` (BE-143, BE-144)
- [ ] `backend/src/modules/hr/core/hr-org-catalog.service.ts:47–49` — `createLocation(orgId, userId, input)` is a pure pass-through to `this.hierarchy.createLocation(orgId, userId, input)`; delete the wrapper and inject `OrgHierarchyService` into the controller or call site instead (BE-143)
- [ ] `backend/src/modules/hr/core/hr-org-catalog.service.ts:51–58` — `updateLocation(orgId, userId, locationId, input)` same pattern; delete (BE-143)
- [ ] `backend/src/modules/hr/core/hr-org-catalog.service.ts:144` — `createTeam(orgId, userId, input)` pure pass-through to `this.hierarchy.createTeam`; delete (BE-143)
- [ ] `backend/src/modules/hr/core/hr-org-catalog.service.ts:168–176` — `updateTeam(orgId, userId, teamId, input)` pure pass-through to `this.hierarchy.updateTeam`; delete (BE-143)

---

## Category 6 — NestJS Principle Violations

10 findings: authorization / RBAC logic embedded in controllers (BE-06).

Each of the following controller private methods calls `this.access.resolveUserPermissions` or `this.access.holds`, which is a DB-backed operation. Business / authorization logic that makes DB calls belongs in the service layer, not the controller.

- [ ] `backend/src/modules/hr/performance/performance.controller.ts:358–362` — `private async canManagePerformance(user)` resolves permissions inline; move resolution into `PerformanceGoalsService` and `PerformanceReviewsService` (pass the raw user context, let the service resolve once and cache within the request)
- [ ] `backend/src/modules/hr/benefits/hr-benefits-claims.controller.ts:48` — `private async isAdmin(u)` resolves permissions; move into `HrBenefitsClaimsService`
- [ ] `backend/src/modules/hr/benefits/hr-benefits.controller.ts:64` — `private async isAdmin(u)` same; move into service
- [ ] `backend/src/modules/hr/cases/hr-cases.controller.ts:214` — `private async canConfidential(user)` resolves `hr:cases:view-confidential`; move into `HrCasesService`
- [ ] `backend/src/modules/hr/cases/hr-safety.controller.ts:170` — `private async canSensitive(user)` same pattern; move into `HrSafetyService`
- [ ] `backend/src/modules/hr/enterprise-ops/accommodations/accommodations.controller.ts:55` — `private async hasSensitive(user)` resolves permissions; move into the accommodations service
- [ ] `backend/src/modules/hr/enterprise-ops/simulator/simulator.controller.ts:45` — `private async canViewSalary(user)` resolves `hr:sensitive:salary`; move into `SimulatorService`
- [ ] `backend/src/modules/hr/lifecycle/exit.controller.ts:91` — `private async isExitAdmin(currentUser)` resolves permissions; move into `ExitWriteService`
- [ ] `backend/src/modules/hr/lifecycle/hr-onboarding-docs-admin.controller.ts:60` — `private async canManageOnboarding(currentUser)` resolves permissions; move into the onboarding docs service
- [ ] `backend/src/modules/hr/onboarding/core/onboarding.controller.ts:103,128,139,266` — four private helpers (`hasChecklistModuleAccess`, `assertChecklistModuleAccess`, `accessibleChecklistModules`, `assertTourAccess`) all resolve permissions or module access inline; consolidate into `OnboardingService` methods that accept `CurrentUserContext`

---

## Fix Lanes

Files in each lane are disjoint; lanes can run in parallel.

### Lane A — Caching + Invalidation (coordinator touches CACHE_KEYS and cache-invalidation-hr.ts)

| File | Findings |
|---|---|
| `analytics-plus/hr-analytics-plus.service.ts` | Cat 3 item 1 (cachedVersioned + 6 new constants) |
| `lifecycle/hr-dashboard.service.ts` | Cat 3 items 2–3 |
| `lifecycle/hr-dashboard-reports.service.ts` | Cat 3 items 4–5 |
| `policies/hr-policies.service.ts` | Cat 3 items 6–7 |
| `interviews/hr-hiring-flows.service.ts` | Cat 3 item 8 |
| `recruitment/recruitment-candidates.service.ts` | Cat 3 item 9 |
| `directory/employee-bulk-onboarding.service.ts` | Cat 3 item 10 |
| `directory/employee-onboarding.service.ts` | Cat 3 item 10 |
| `lifecycle/termination-lifecycle.service.ts` | Cat 3 item 11 |

### Lane B — Pagination + Projection (pure query changes, no schema changes)

| File | Findings |
|---|---|
| `interviews/hr-hiring-flows.service.ts` | Cat 4 item 1 |
| `automations/hr-automation-engine.service.ts` | Cat 4 item 2 |
| `automations/hr-webhooks.service.ts` | Cat 4 items 3–4 |
| `analytics-plus/hr-analytics-plus-drilldown.ts` | Cat 4 item 5 |
| `cases/hr-cases.service.ts` | Cat 4 items 6–7 + Cat 2 items 7–8 |
| `benefits/hr-benefits-plans.service.ts` | Cat 2 items 4–6 |
| `benefits/hr-benefits-claims.service.ts` | Cat 2 items 7–8 |
| `benefits/hr-benefits-enrollment.service.ts` | Cat 2 item 9 |
| `config/hr-document-templates.service.ts` | Cat 2 item 11 |
| `core/hr-employments.service.ts` | Cat 2 item 12 |
| `core/hr-timeline.service.ts` | Cat 2 item 13 |
| `time/attendance-read.service.ts` | Cat 2 items 1–2 |

### Lane C — Dead Code + NestJS Layering (pure delete / move)

| File | Findings |
|---|---|
| `core/dto/hr-core.schemas.ts` | Cat 1 item 1 + Cat 5 item 1 |
| `policies/hr-policies.service.ts` | Cat 5 items 2 |
| `core/hr-org-catalog.service.ts` | Cat 5 items 3–6 |
| `time/attendance-clock.service.ts` | Cat 1 item 2 |
| `onboarding/core/onboarding-admin.service.ts` | Cat 1 item 3 |
| `performance/performance.controller.ts` | Cat 6 item 1 |
| `benefits/hr-benefits-claims.controller.ts` | Cat 6 item 2 |
| `benefits/hr-benefits.controller.ts` | Cat 6 item 3 |
| `cases/hr-cases.controller.ts` | Cat 6 item 4 |
| `cases/hr-safety.controller.ts` | Cat 6 item 5 |
| `enterprise-ops/accommodations/accommodations.controller.ts` | Cat 6 item 6 |
| `enterprise-ops/simulator/simulator.controller.ts` | Cat 6 item 7 |
| `lifecycle/exit.controller.ts` | Cat 6 item 8 |
| `lifecycle/hr-onboarding-docs-admin.controller.ts` | Cat 6 item 9 |
| `onboarding/core/onboarding.controller.ts` | Cat 6 item 10 |
| `core/hr-effective-change-applier.service.ts` | Cat 2 item 3 (N+1) |

---

## Coordinator-Owned Items

These require changes to shared infrastructure files that must not be touched by fix lanes.

### New cache-key constants to add to `backend/src/common/cache/cache-keys.ts`

```sql
-- Add alongside existing HR namespace keys (around line 197):
hrPolicyDetailNamespace: (orgId: string) => namespace(`hr:policies:detail:${orgId}`),
hrHiringFlowsNamespace: (orgId: string) => namespace(`hr:hiring-flows:${orgId}`),
hrCandidatesListNamespace: (orgId: string) => namespace(`hr:candidates:list:${orgId}`),
hrAnalyticsPlusAttritionNamespace: (orgId: string) => namespace(`hr:analytics-plus:attrition:${orgId}`),
hrAnalyticsPlusLeaveNamespace: (orgId: string) => namespace(`hr:analytics-plus:leave:${orgId}`),
hrAnalyticsPlusPayrollNamespace: (orgId: string) => namespace(`hr:analytics-plus:payroll:${orgId}`),
hrAnalyticsPlusEngagementNamespace: (orgId: string) => namespace(`hr:analytics-plus:engagement:${orgId}`),
hrAnalyticsPlusPerfNamespace: (orgId: string) => namespace(`hr:analytics-plus:perf:${orgId}`),
hrAnalyticsPlusComplianceNamespace: (orgId: string) => namespace(`hr:analytics-plus:compliance:${orgId}`),
```

### New entries to add to `backend/src/common/cache/cache-invalidation-hr.ts`

Add the 9 new namespaces as `CacheNamespaceEntry` objects documenting their invalidation writers and dimensions.

### No new migrations required

All findings are query, service, and caching changes. No index additions or schema changes are needed: the HR tables already have the required org-led composite indexes for the queries identified in Cat 2 (attendance, employments, benefit plans all have `idx_*_org_*` indexes); the drilldown offset→keyset migration requires no DDL change.

### `app.module.ts`

No changes needed — all affected modules are already registered.

### Permission constants

No new permission keys are introduced by any fix.

---

## Frontend Contract Changes

No endpoint URLs, HTTP methods, or response shapes change as a direct result of fixes in this audit. The following shape changes are introduced:

| Endpoint | Old shape | New shape | Note |
|---|---|---|---|
| `GET /hr/automations/rules` | `{ data, total, page, pageSize }` | `{ data, nextCursor, hasMore }` | Cat 4 item 2 — remove total |
| `GET /hr/automations/webhooks` | `{ data, total, page, pageSize }` | `{ data, nextCursor, hasMore }` | Cat 4 items 3–4 |
| `GET /hr/interviews/hiring-flows` | `{ data, total, page, pageSize }` | `{ data, nextCursor, hasMore }` | Cat 4 item 1 |
| `GET /hr/analytics-plus/drilldown` | `{ rows, total, page, pageSize }` | `{ rows, nextCursor, hasMore }` | Cat 4 item 5 |
| `GET /hr/cases/:id/notes` | `T[]` (no cursor) | `{ data, nextCursor, hasMore }` | Cat 4 item 6 |
| `GET /hr/cases/:id/documents` | `T[]` (no cursor) | `{ data, nextCursor, hasMore }` | Cat 4 item 7 |

The frontend hooks for each of these must be updated in the same PR as the backend change. The `total` field in the automations and hiring-flows responses is currently used in pagination UI components — those components must switch to cursor-driven "Load more" before the backend shape changes ship.
