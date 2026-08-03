# C2 — HR Services Audit

> Phase-1 READ-ONLY recon. No files edited. All claims include file:line.

---

## 1. File Inventory

**Total non-controller, non-spec files in scope:** 324  
**Service files (`*.service.ts`):** 165  
**Files >300 LOC (soft-cap breach):** 48  
**Files >500 LOC (hard-review threshold):** 7

### Service Inventory — sorted by LOC desc

| LOC | File | Class | One-line responsibility |
|-----|------|-------|------------------------|
| 602 | `time/leaves.service.ts` | `LeavesService` | Read/list/analytics for leave requests and balances, leave-type CRUD, comp-off grant |
| 596 | `analytics-plus/hr-analytics-plus.service.ts` | `HrAnalyticsPlusService` | Command-centre, attrition, payroll-cost, engagement, skills-gap, succession analytics |
| 567 | `payroll-inputs/payroll-inputs.service.ts` | `PayrollInputsService` | Payroll input period lifecycle (create/build/lock/unlock) and adjustments |
| 560 | `onboarding/core/onboarding.service.ts` | `OnboardingService` | Employee onboarding initiation, task seeding from templates, final submission |
| 550 | `lifecycle/termination.service.ts` | `TerminationService` | Termination workflow (create/submit/review/send/complete), deactivation |
| 499 | `workflows/hr-workflow-engine.service.ts` | `HrWorkflowEngineService` | Workflow step transitions, approval/rejection, SLA tracking |
| 499 | `recruitment/recruitment-sourcing.service.ts` | `RecruitmentSourcingService` | Sourcing channels, referrals, talent-pool sourcing, job-board management |
| 487 | `recruitment/recruitment-offers.service.ts` | `RecruitmentOffersService` | Offer creation, approval, revocation, salary negotiation |
| 483 | `recruitment/recruitment-candidates.service.ts` | `RecruitmentCandidatesService` | Candidate CRUD, stage moves, notes, bulk import |
| 481 | `lifecycle/exit-write.service.ts` | `ExitWriteService` | Resignation create/update/review/final-approval/completion |
| 450 | `time/leaves-approval.service.ts` | `LeavesApprovalService` | Leave approve/reject, balance deduction, LOP calculation, payroll rebuild trigger |
| 432 | `recruitment/recruitment-jobs.service.ts` | `RecruitmentJobsService` | Job posting CRUD, publish/archive, metrics |
| 426 | `lifecycle/exit.service.ts` | `ExitService` | Resignation listing, timeline, experience letter generation |
| 418 | `automations/hr-webhooks.service.ts` | `HrWebhooksService` | Outbound webhook CRUD, delivery, retry, logs |
| 415 | `directory/employees.service.ts` | `EmployeesService` | Employee list (paginated/cached), stats, scorecard, reports-to |
| 411 | `cases/hr-cases.service.ts` | `HrCasesService` | Grievance/case CRUD, investigation, resolution |
| 408 | `workflows/hr-workflow-instances.service.ts` | `HrWorkflowInstancesService` | Workflow instance creation, history, overdue escalation |
| 408 | `lifecycle/onboarding-views.service.ts` | `OnboardingViewsService` | Admin onboarding progress views, bulk initiation |
| 404 | `payroll-inputs/payroll-inputs-build.service.ts` | `PayrollInputsBuildService` | Snapshot assembly (attendance/leave/OT/reimbursement/loans) for payroll period |
| 389 | `policies/hr-policies.service.ts` | `HrPoliciesService` | HR policy CRUD, scopes, versioning, cloning |
| 376 | `performance/performance-reviews.service.ts` | `PerformanceReviewsService` | Review CRUD, scoring, submission, calibration input |
| 374 | `onboarding/flow/module-checklist.service.ts` | `ModuleChecklistService` | Module-level onboarding checklist creation, step tracking |
| 373 | `governance/retention/retention.service.ts` | `RetentionService` | Retention plan CRUD, approval, GDPR export |
| 373 | `global/compliance-requirements.service.ts` | `ComplianceRequirementsService` | Compliance deadline scheduling, recurrence, overdue check |
| 363 | `recruitment/recruitment-candidate-ai.service.ts` | `RecruitmentCandidateAiService` | AI-powered CV screening, JD match scoring, interview question generation |
| 358 | `core/hr-org-catalog.service.ts` | `HrOrgCatalogService` | Job levels, employment types, worker classifications CRUD |
| 352 | `recruitment/recruitment-candidate-ops.service.ts` | `RecruitmentCandidateOpsService` | Candidate pipeline moves, disqualification, offer linking |
| 352 | `helpdesk/hr-helpdesk.service.ts` | `HrHelpdeskService` | HR helpdesk ticket CRUD, escalation, SLA |
| 351 | `cases/hr-safety.service.ts` | `HrSafetyService` | Safety incident CRUD, investigation, corrective actions |
| 349 | `time/leaves-write.service.ts` | `LeavesWriteService` | Leave request create/cancel/update, balance deduction |
| 342 | `directory/employee-onboarding.service.ts` | `EmployeeOnboardingService` | New employee creation (link existing/create new user), invite |
| 340 | `lifecycle/hr-dashboard.service.ts` | `HrDashboardService` | HR dashboard metrics, compliance, diversity, celebrations |
| 336 | `time/attendance.service.ts` | `AttendanceService` | Attendance list, stats, manual entry |
| 336 | `lifecycle/probation.service.ts` | `ProbationService` | Probation review CRUD, confirmation, extension |
| 330 | `performance/engagement.service.ts` | `EngagementService` | eNPS surveys, pulse checks, response aggregation |
| 326 | `cases/service-delivery-inbox.service.ts` | `ServiceDeliveryInboxService` | Unified inbox for tickets, cases, helpdesk |
| 323 | `directory/employee-mutations.service.ts` | `EmployeeMutationsService` | Employee profile patch, role/dept changes, deactivation |
| 323 | `automations/hr-automation-engine.service.ts` | `HrAutomationEngineService` | HR event-driven automation rule execution |
| 321 | `recruitment/recruitment-automation.service.ts` | `RecruitmentAutomationService` | Recruitment automation rule CRUD and execution |
| 320 | `core/person-employment-sync.service.ts` | `PersonEmploymentSyncService` | Sync between org-member and hr_people/hr_employments |
| 316 | `lifecycle/hr-dashboard-reports.service.ts` | `HrDashboardReportsService` | Headcount trends, time-to-fill, attendance analytics |
| 316 | `import/hr-import.service.ts` | `HrImportService` | CSV import pipeline for employees/leaves/attendance |
| 314 | `workflows/hr-workflow-definitions.service.ts` | `HrWorkflowDefinitionsService` | Workflow definition CRUD, version management |
| 313 | `interviews/hr-interview-scheduling.service.ts` | `HrInterviewSchedulingService` | Interview scheduling, slot assignment, calendar linking |
| 307 | `core/hr-effective-changes.service.ts` | `HrEffectiveChangesService` | Scheduled effective-dated HR changes (dept/designation/comp) |
| 305 | `interviews/hr-interviews.service.ts` | `HrInterviewsService` | Interview CRUD, feedback, results |
| 304 | `templates/hr-templates.service.ts` | `HrTemplatesService` | HR document template CRUD, versioning |
| 303 | `lifecycle/hr-analytics.service.ts` | `HrAnalyticsService` | Analytics overview, headcount, attrition, department breakdown |
| 299 | `time/attendance-clock.service.ts` | `AttendanceClockService` | Clock-in/clock-out, location validation |
| 298 | `time/attendance-summary.service.ts` | `AttendanceSummaryService` | Payroll-period attendance summary aggregation |
| …   | *(97 services under 300 LOC — omitted from this table)* | | |

---

## 2. Tenant Scoping

### Unscoped queries where tenant safety is NOT ensured elsewhere

| # | File:Line | Table | Missing predicate | Assessment |
|---|-----------|-------|-------------------|-----------|
| 1 | `onboarding/core/onboarding.service.ts:485–488` | `leave_balances` | `orgId` | **Genuine gap.** `leaveBalances.findFirst` filters only `userId` and `year`. In multi-org tenancy a user's balance in Org A blocks leave seeding in Org B on onboarding submit. |
| 2 | `payroll-inputs/payroll-inputs.service.ts:510` | `hr_payroll_adjustments` | `orgId` | **Write not tenant-scoped.** `approveAdjustment` UPDATE uses only `eq(hrPayrollAdjustments.id, adjustmentId)`. The preceding `findFirst` at :499–500 IS org-scoped but the WRITE is not, breaking defence-in-depth. |
| 3 | `payroll-inputs/payroll-inputs.service.ts:546` | `hr_payroll_adjustments` | `orgId` | Same as above in `rejectAdjustment`. |
| 4 | `time/leaves-approval.service.ts:186–211` | `leave_requests` UPDATE | — | The `updateStatus` inner UPDATE at :186 uses only `eq(leaveRequests.id, leaveId)`. However, the `findFirst` at :165 IS org-scoped and throws if mismatched, so the write is protected. Flag as defence-in-depth gap only. |

### Scoped reads confirmed safe (representative)

- `leaves.service.ts:69–76` `balance()` — `orgId` + `userId` in findMany WHERE.
- `termination.service.ts:56` `list()` — `eq(terminations.orgId, orgId)` leading condition.
- `employees.service.ts:82` — `eq(organizationMembers.orgId, orgId)` as first base condition.
- `payroll-inputs.service.ts:104–112` `getPeriod()` — `and(eq(id), eq(orgId))` pattern.

---

## 3. Transaction Integrity

### Methods with 2+ writes NOT in a transaction

| # | File:Line | Method | Tables written | Risk |
|---|-----------|--------|---------------|------|
| 1 | `lifecycle/exit-write.service.ts:316–337` | `finalReview` (approved path) | `resignations` UPDATE → `fnf_settlements` INSERT | **Torn FnF record.** Resignation is marked `FINAL_APPROVED` but if `fnfSettlements` insert fails (e.g. constraint violation), no FnF record exists. The two writes are sequential outside any transaction. |
| 2 | `onboarding/core/onboarding.service.ts:472–510` | `submit` | `users` UPDATE (`onboardingCompletedAt`) + `onboarding_sessions` (via `completeSession`) + conditional `leave_balances` INSERT | **Torn onboarding completion.** Five DB operations outside a transaction; leave balance seeding may be skipped or partially done if any step throws. |
| 3 | `lifecycle/termination.service.ts:392–408` | `sendEmail` | `terminations` UPDATE (post-email) | **Email-then-DB.** Email is sent, then DB status is updated. If the DB write fails the email was already sent but the record shows `emailSentAt = null` — the admin can re-send. Not critical but inconsistent. |

### Methods using `db.transaction` correctly

- `termination.service.ts:453–483` `complete()` — wraps deactivation + FnF insert + asset-returns insert.
- `exit-write.service.ts:135–153` `update` FINAL_APPROVED path — wraps resignation + FnF insert.
- `payroll-inputs.service.ts:163–204` `lockPeriod` — wraps period update + leave-ledger update + loan-repayment update.
- `payroll-inputs-build.service.ts:394–402` `buildSnapshots` — wraps delete + insert in single transaction.
- `leaves-approval.service.ts:286–346` `approve()` — wraps request update + balance deduction + ledger write.

### `this.db` call inside a `tx` callback (mixed writes)

No instances found where `this.db` is used inside a `tx` callback (all writes inside transaction callbacks correctly use `tx.*`). Clean.

---

## 4. N+1 and Unbounded Queries

### (a) `for`/`.map(async` loops containing `await this.db` calls

| # | File:Line | Loop source | DB op inside | Notes |
|---|-----------|-------------|-------------|-------|
| 1 | `core/hr-effective-changes.service.ts:196–280` | `dueChanges` (effective changes loaded earlier) | `tx.update(hrEmployments)` or `tx.update(hrEmployeeSensitiveFields)` | Inside a `db.transaction`; each change → 1 update. Safe if count is bounded by date range; no limit on `dueChanges` fetch. |
| 2 | `lifecycle/exit-write.service.ts:369–408` | `adminUsers` (all org admins with hr:exit:manage) | `email.sendResignationSubmittedEmail(...)` | N sequential email calls; not DB N+1 but N network round-trips. Runs fire-and-forget, acceptable latency. |
| 3 | `onboarding/core/onboarding.service.ts:424–434` | `hrUsers` (HR permission holders) | `email.sendOnboardingTaskEmail(...)` | N sequential email sends; same pattern as above. |
| 4 | `settings-hub/hr-settings-hub.service.ts:18–23` | `HR_POLICY_TYPES` (catalog constant) | `this.evaluation.evaluatePolicy(...)` — each does DB reads | `Promise.allSettled` parallelises all evaluations; not N sequential, but M parallel DB reads. Bounded by policy-type catalog size. |
| 5 | `workflows/hr-workflow-engine.service.ts:382–408` | `overdueInstances` | `db.update(hrWorkflowInstances)` + notification | For each overdue instance — a separate UPDATE. Runs in a cron/scheduler context; bounded in practice. |

### (b) `findMany`/`select` with no `.limit()` on growing tables

| # | File:Line | Table | Notes |
|---|-----------|-------|-------|
| 1 | `onboarding/core/onboarding.service.ts:265–269` | `onboarding_template_steps` | No limit; bounded by template steps count (dozens, not thousands). |
| 2 | `onboarding/core/onboarding.service.ts:277–286` | `onboarding_template_steps` (compliance steps) | No limit; same as above. |
| 3 | `payroll-inputs/payroll-inputs-build.service.ts:86–117` | `overtime_requests`, `reimbursements`, `salary_loans` | No limit on these selects — all active members for period. Bounded by org member count but could be large. |

### (c) `select()` with no column projection (SELECT *)

| # | File:Line | Table | Notes |
|---|-----------|-------|-------|
| 1 | `payroll-inputs/payroll-inputs-build.service.ts:85–95` | `overtime_requests` | `this.db.select().from(overtimeRequests)` — SELECT * including all columns. Used to build payroll snapshot, justified but pulls all columns. |
| 2 | `payroll-inputs/payroll-inputs-build.service.ts:99–109` | `reimbursements` | Same pattern — SELECT *. |
| 3 | `payroll-inputs/payroll-inputs-build.service.ts:112–119` | `salary_loans` | Same pattern — SELECT *. |
| 4 | `onboarding/core/onboarding.service.ts:264–269` | `onboarding_template_steps` | `select().from(onboardingTemplateSteps)` — SELECT *. |

---

## 5. Sensitive-Data Handling

### Salary/PAN/bank data in logs

No `console.log`, `this.logger.*`, or error message interpolating `salary|ctc|pan|aadhaar|bank|account|ifsc|ssn|passport|netPay|grossPay` found in service files. Clean.

### Salary exposed in API response to non-comp roles

| # | File:Line | Field | Accessible via | Risk |
|---|-----------|-------|---------------|------|
| 1 | `directory/employees.service.ts:121,158` | `users.monthlySalary` | Paginated employee list (`listEmployees`) — any user with employee list permission | **P1.** Salary included in the employee directory response. The controller's RBAC key controls list access, not comp access. Any role that can list employees (e.g. `hr:employees:view`) sees raw `monthlySalary` values. |
| 2 | `analytics-plus/hr-analytics-plus.service.ts:87–93,138` | `payroll_runs.gross_total` → `payrollCostLastMonth` | `getCommandCenter` — analytics dashboard for HR roles | **P1.** Payroll aggregate cost (last run gross total) included in the command-centre response without requiring a separate `payroll:read`-level permission. Cached at org-level, served to any analytics viewer. |
| 3 | `payroll-inputs/payroll-inputs-build.service.ts:53` | `users.monthlySalary` | Build snapshot process (internal; stored in `hr_payroll_input_snapshots`) | Low risk; internal payroll process, not exposed in API response. |
| 4 | `templates/hr-template-render.service.ts:86,112–114` | `users.monthlySalary` | Letter generation — invoked by HR admins only | Acceptable — letter generation is admin-gated. |

---

## 6. Caching

### Cache keys and patterns

| Key Pattern | File:Line | TTL | Notes |
|-------------|-----------|-----|-------|
| `hr:employees:paginated:${orgId}:${userId}:${scope}:...` | `directory/employees.service.ts:49–65` | SHORT | Contains `monthlySalary` in cached payload. Any cache consumer with the right key sees salary data. |
| `hr:analytics-plus:cc:${orgId}:${departmentId ?? "all"}` | `analytics-plus/hr-analytics-plus.service.ts:22–27` | MEDIUM | Contains `payrollCostLastMonth`. Org-level key — no user-scope or permission scope. |
| `hr:analytics-plus:payroll:${orgId}` | `analytics-plus/hr-analytics-plus.service.ts:235` | MEDIUM | `gross_total`, monthly totals from `payroll_runs`. Org-scoped only, no user-scope. |
| `hr:analytics:${orgId}` | `lifecycle/hr-analytics.service.ts:29` | MEDIUM | Org-scoped aggregate; no user scope. Intentional for analytics. |
| `hr:directory:${orgId}` | `directory/org-structure.service.ts:36` | MEDIUM | Org directory — no user scope, intentional. |
| `hr:anniversary-feed:${orgId}:${today}` | `directory/celebrations.service.ts:37` | MEDIUM | Date-keyed; cache auto-expires daily. |
| `hr:celebrations:${orgId}:${today}` | `directory/celebrations.service.ts:106` | MEDIUM | Same pattern. |
| `hr:leave-analytics:${orgId}:${year}` | `time/leaves.service.ts:205–206` | MEDIUM | Org + year key; no user-scope. Analytics-level data only. |

### Cache keys missing `orgId`

None found. All cache keys include `orgId` as a segment.

### Mutation paths that do NOT invalidate relevant caches

| # | Cache key | Write that should invalidate it | Status |
|---|-----------|--------------------------------|--------|
| 1 | `hr:employees:paginated:${orgId}:...` | `employee-mutations.service.ts` (profile patch including `monthlySalary`) | `employee-mutations.service.ts:310` only invalidates `userSession` cache, not the paginated employee list. The short TTL limits impact but salary updates won't be reflected until cache expires. |
| 2 | `hr:analytics-plus:payroll:${orgId}` | Any payroll run status change | No explicit invalidation found in payroll services. Cache expires at MEDIUM TTL. |

---

## 7. Date/Time Handling

### `new Date()` in leave/payroll calculations

| # | File:Line | Context | TZ risk |
|---|-----------|---------|---------|
| 1 | `time/leaves.service.ts:73` | `eq(leaveBalances.year, new Date().getFullYear())` — leave balance read | **TZ-sensitive.** Year resolved from server clock. IST midnight Dec 31 = UTC Dec 31 but IST midnight Jan 1 = UTC Dec 31 18:30 → wrong year for 5.5h window. |
| 2 | `time/leaves.service.ts:94` | Same `getFullYear()` in `my()` | Same risk. |
| 3 | `time/leaves-approval.service.ts:309` | `eq(leaveBalances.year, new Date().getFullYear())` in `approve()` | **Same TZ bug** — balance lookup for wrong year near year boundary. |
| 4 | `time/leaves.service.ts:559` | `year: new Date().getFullYear()` in comp-off balance insert | Same — comp-off assigned to wrong year near boundary. |
| 5 | `time/leaves-write.service.ts:73` | `eq(leaveBalances.year, new Date().getFullYear())` | Same. |
| 6 | `analytics-plus/hr-analytics-plus.service.ts:30–33` | `thirtyDaysAgo`, `twelveMonthsAgo`, `yearStart` computed from `new Date()` | Analytics time windows drift by server TZ but acceptable for approximate analytics. |
| 7 | `payroll-inputs/payroll-inputs.service.ts:120,131,148` | `new Date()` for `updatedAt`, `builtAt`, `lockedAt` | Acceptable for audit timestamps; does not affect money calculations. |

### Timezone conversions

No explicit timezone conversion libraries (e.g. `date-fns-tz`, `luxon`) found in service files. All date arithmetic uses native JS `Date` (server-TZ dependent). On a UTC server this is correct for most operations; on an IST-configured server, year-boundary leave operations would be wrong.

---

## 8. Dead Code

### Exported methods with zero callers in `backend/src`

| # | File | Symbol | Evidence |
|---|------|--------|---------|
| 1 | `analytics-plus/hr-analytics-plus.service.ts:330` | `getMetricDefinitions()` (static) | `grep -r "getMetricDefinitions" backend/src` returns only the definition. No controller or service calls it. Candidate for removal. |
| 2 | `lifecycle/exit.service.ts` — `ExitActor` interface | re-exported from `exit-write.service.ts` | Only imported by controllers (outside scope); not dead, just confirm controller usage. |
| 3 | `onboarding/core/onboarding.service.ts:106–116` | `isInitiateUserNotFound`, `isInitiateAlreadyDone` guard functions | Exported from service file; grep for call sites needed — likely only used by controllers (outside this scope). |

**Note:** barrel re-exports were not exhaustively scanned; the above are based on `grep -r` in `backend/src`. Controller-side consumers are outside Lane C2 scope.

---

## 9. `any` / Forced Types

**Total count:** 65 occurrences across 17 files (includes non-null `!` assertions counted together; pure `: any`/`as any` instances are ~5, `as SomeShape` casts ~15, `!` non-null ~45).

### Specific `as SomeShape` casts (banned by §7)

| File:Line | Pattern | Impact |
|-----------|---------|--------|
| `payroll-inputs/payroll-inputs-build.service.ts:372` | `payload as Record<string, unknown>` | Forces unknown payload into typed column; silences type error. |
| `payroll-inputs/payroll-inputs-build.service.ts:373` | `sourceRefs as Record<string, unknown> \| null` | Same. |
| `payroll-inputs/payroll-inputs.service.ts:96` | `err as { code?: string }` | Safe pattern for Postgres error code check. |
| `payroll-inputs/payroll-inputs.service.ts:479` | `sourceChangeRef as Record<string, unknown> \| null` | Forces input type to DB column type. |
| `time/leaves.service.ts:594` | `result.rules as Record<string, unknown>` | Policy rule payload cast. |
| `core/hr-effective-changes.service.ts:197` | `change.newValue as Record<string, unknown> \| null` | JSONB column cast — should use `z.record()` parse instead. |
| `governance/retention/retention.service.ts` | Multiple `as Record<string, unknown>` | JSONB payload handling. |
| `governance/positions/positions.service.ts` | `!` assertions | Non-null after DB lookup — restructure or add null checks. |
| `cases/hr-cases.service.ts` | Multiple `!` assertions | 8 occurrences; highest count in cases domain. |
| `governance/labor/labor.service.ts` | 9 occurrences | Highest total in governance domain. |

---

## 10. Top 25 Findings

| SEV | File:Line | One-line Fact |
|-----|-----------|---------------|
| P0 | `onboarding/core/onboarding.service.ts:485–488` | `leaveBalances.findFirst` missing `orgId` — multi-org user skips leave seeding in new org |
| P0 | `payroll-inputs/payroll-inputs.service.ts:510` | `approveAdjustment` UPDATE uses only `id`, no `orgId` — BOLA write not tenant-defended |
| P0 | `payroll-inputs/payroll-inputs.service.ts:546` | `rejectAdjustment` UPDATE same pattern — no `orgId` on write |
| P1 | `lifecycle/exit-write.service.ts:316–337` | `finalReview` resignation UPDATE + fnfSettlements INSERT NOT in transaction — torn FnF record on insert failure |
| P1 | `onboarding/core/onboarding.service.ts:472–510` | `submit` performs 5 DB writes outside any transaction — torn onboarding state possible |
| P1 | `directory/employees.service.ts:121,158` | `monthlySalary` included in paginated employee list response — salary exposed to any `hr:employees:view` role |
| P1 | `analytics-plus/hr-analytics-plus.service.ts:87–93,138` | `payrollCostLastMonth` (gross payroll total) in command-centre response — no payroll-specific permission gate |
| P1 | `time/leaves.service.ts:73` + `leaves-approval.service.ts:309` | `new Date().getFullYear()` for balance year lookup — server-TZ: wrong year for 5.5h window on Jan 1 UTC (IST) |
| P1 | `time/leaves.service.ts:559` | Comp-off balance insert uses `new Date().getFullYear()` — same TZ year bug assigns credits to wrong year |
| P1 | `analytics-plus/hr-analytics-plus.service.ts:235–254` | `getPayrollCost` caches `gross_total, net_total, deduction_total` from `payroll_runs` — no payroll permission scope |
| P2 | `directory/employees.service.ts:50–65` | Cache at `hr:employees:paginated:*` stores `monthlySalary` in payload — salary data in short-TTL cache served to all scopes |
| P2 | `directory/employee-mutations.service.ts:310` | Employee profile update only invalidates `userSession` cache, not `hr:employees:paginated:*` — stale salary in cache post-update |
| P2 | `analytics-plus/hr-analytics-plus.service.ts:343–403` | `getDrilldown` returns `rows: unknown[]` — untyped raw SQL rows passed directly to API response |
| P2 | `lifecycle/exit-write.service.ts:369–408` | For loop sending N sequential emails to HR admins on resignation — N network calls, no parallelism (`Promise.allSettled`) |
| P2 | `payroll-inputs/payroll-inputs-build.service.ts:85–117` | `select().from(overtime_requests/reimbursements/salary_loans)` — SELECT * on tables with financial data; no column projection |
| P2 | `time/leaves.service.ts:602 LOC` | Exceeds 500-line hard-review threshold |
| P2 | `analytics-plus/hr-analytics-plus.service.ts:596 LOC` | Exceeds 500-line hard-review threshold |
| P2 | `payroll-inputs/payroll-inputs.service.ts:567 LOC` | Exceeds 500-line hard-review threshold |
| P2 | `onboarding/core/onboarding.service.ts:560 LOC` | Exceeds 500-line hard-review threshold |
| P2 | `lifecycle/termination.service.ts:550 LOC` | Exceeds 500-line hard-review threshold |
| P2 | `payroll-inputs/payroll-inputs-build.service.ts:372–373` | `payload as Record<string, unknown>` — forced type cast, §7 violation |
| P2 | `time/leaves.service.ts:594` | `result.rules as Record<string, unknown>` — forced type cast, §7 violation |
| P2 | `core/hr-effective-changes.service.ts:197` | `change.newValue as Record<string, unknown>` — forced type cast on JSONB column |
| P3 | `analytics-plus/hr-analytics-plus.service.ts:330` | `getMetricDefinitions()` static method — no callers found in `backend/src`; dead code candidate |
| P3 | `cases/hr-cases.service.ts` | 8 non-null `!` assertion occurrences — highest in cases domain; restructure to optional chaining |

---

## Coverage Gaps

- **Payroll-module services** (`hr/payroll/*.service.ts`) were read at LOC level only; their internal logic (FnF, tax, incentives) was not individually line-audited due to all being under 165 LOC. Recommend a focused pass on `fnf.service.ts` and `tax.service.ts` for money correctness.
- **`recruitment-candidate-vault.service.ts`** (264 LOC) stores encrypted PII documents; encryption/decryption correctness was not verified (crypto helper exists at `lifecycle/crypto.helpers.ts`).
- **Dead-code analysis** for barrel re-exports: confirmed for `getMetricDefinitions` only; other exported helpers require controller-side grep (Lane C1 scope).
- **Caching race conditions**: `cached()` helper implementation was not read; its internal locking/stampede-prevention mechanism is unknown.
- **`hr-workflow-engine.service.ts:382` for-loop** over `overdueInstances` with per-instance UPDATE was identified but iteration bound not confirmed (no `.limit()` on overdue query found).
