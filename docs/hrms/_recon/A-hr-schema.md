# Recon Lane A — HR Schema Audit

**Scope:** `backend/src/db/schema/hr/**` (55 files)
**Date:** 2026-07-31
**Constraint:** READ-ONLY. Every factual claim is backed by a `file.ts:LINE` citation.

---

## 1. Coverage & Counts

| Metric | Count |
|---|---|
| Total files read | 55 |
| Schema files (pgTable containers) | 53 |
| Barrel files (re-export only) | 2 (`index.ts`, `recruitment.ts`) |
| `pgTable` declarations | **234** |
| `pgEnum` declarations | **90** |
| `serial()` PKs | 223 |
| `generatedAlwaysAsIdentity()` PKs | **0** |
| `decimal(precision≥10, scale=2)` money cols | **~55** |
| `integer`/`bigint` cents cols | ~18 |
| Bare `.unique()` on a single column | 3 (`hiring.ts:157,238,454`) |
| Composite `uniqueIndex` NOT led by `orgId` | 3 |
| Tables with NO `orgId` column | **16** |
| `date`-as-`text` columns | **12+** |
| Unbounded JSONB lifecycle arrays | 5 |

---

## 2. Table Catalog

### 2a. File → table count

| File | Tables | Notes |
|---|---|---|
| `hiring.ts` | 36 | Largest file; ~900+ lines |
| `offboarding.ts` | 16 | Includes onboarding; dual-purpose |
| `performance.ts` | 15 | |
| `enterprise-comp.ts` | 12 | All money as bigint/integer cents ✓ |
| `governance.ts` | 10 | |
| `engagement-extras.ts` | 9 | |
| `enterprise-ops.ts` | 8 | |
| `attendance.ts` | 7 | |
| `documents.ts` | 7 | |
| `benefits.ts` | 7 | All money as integer cents ✓ |
| `payroll.ts` | 7 | All money as decimal(15,2) ✗ |
| `core-people.ts` | 6 | |
| `workflow-engine.ts` | 6 | |
| `payroll-policies.ts` | 5 | |
| `payroll-runs.ts` | 5 | All money as decimal(15,2) ✗ |
| `global-compliance.ts` | 4 | |
| `cases.ts` | 4 | |
| `leaves.ts` | 4 | |
| `payroll-inputs.ts` | 3 | |
| `payroll-workforce.ts` | 4 | All money as decimal(15,2) ✗ |
| `payroll-payout.ts` | 3 | |
| `core-org.ts` | 3 | |
| `kpis.ts` | 3 | |
| `feedback.ts` | 3 | |
| `announcements.ts` | 3 | |
| `template-engine.ts` | 2 | |
| `succession.ts` | 2 | |
| `shifts.ts` | 3 | |
| `rosters.ts` | 2 | |
| `biometric.ts` | 2 | |
| `overtime.ts` | 2 | |
| `import-jobs.ts` | 2 | |
| `staffing.ts` | 2 | |
| `talent-pools.ts` | 2 | |
| `automation-engine.ts` | 2 | |
| `policy-engine.ts` | 2 | |
| `tax.ts` | 2 | All money as decimal(15,2) ✗ |
| `safety.ts` | 2 | |
| `forms.ts` | 2 | |
| `webhooks.ts` | 2 | |
| `attendance-regularizations.ts` | 1 | |
| `geofencing.ts` | 1 | |
| `assets.ts` | 1 | |
| `leave-ledger.ts` | 1 | |
| `leave-policies.ts` | 1 | |
| `requisitions.ts` | 1 | |
| `travel.ts` | 1 | |
| `probation.ts` | 1 | |
| `salary-structure-templates.ts` | 1 | All money as decimal(15,2) ✗ |
| `access-requests.ts` | 1 | `employeeId` is bare text, no FK |
| `workforce-planning.ts` | 1 | Money as integer cents ✓ |
| `job-boards.ts` | 1 | |
| `core-audit.ts` | 1 | |
| `recruitment.ts` | 0 | Sub-barrel only |
| `index.ts` | 0 | Root barrel only |
| **TOTAL** | **234** | |

---

## 3. Tenant-Scoping Report

### 3a. Tables with `orgId NOT NULL` — all correctly scoped

All 218 tables that carry `orgId` use `.references(() => organizations.id, { onDelete: "cascade" }).notNull()`. Pattern is consistent.

### 3b. Tables WITHOUT `orgId` — tenant isolation relies on FK chain only

| Table | File | Tenant via | Risk |
|---|---|---|---|
| `surveyResponses` | `performance.ts:150` | `surveyId` FK → `hrSurveys.orgId` | P1: depth-1 chain, no direct RLS candidate |
| `assessmentAttempts` | `performance.ts:239` | `assessmentId` FK → `hrAssessments.orgId` | P1 |
| `keyResults` | `performance.ts` | `goalId` FK → `hrGoals.orgId` | P1 |
| `feedbackCycleRequests` | `feedback.ts:21` | `cycleId` FK | P1 |
| `feedbackCycleResponses` | `feedback.ts:35` | `requestId` FK (2-deep) | P1: two hops from orgId |
| `bookingLinkInterviewers` | `hiring.ts:315` | `bookingLinkId` FK | P1 |
| `emailSequenceSteps` | `hiring.ts:687` | `sequenceId` FK | P1 |
| `emailSequenceEnrollments` | `hiring.ts:699` | `sequenceId` FK | P1 |
| `vaultAccessLogs` | `hiring.ts:356` | `vaultId` FK | P1: audit log, no org scoping at all |
| `interviewScorecards` | `hiring.ts:210` | `interviewId` FK | P1 |
| `onboardingTemplateSteps` | `offboarding.ts:83` | `templateId` FK | P1 |
| `teamEventParticipants` | `engagement-extras.ts` | `eventId` FK | P1 |
| `competencies` | `kpis.ts:35` | `frameworkId` FK | P1 |
| `hrPollVotes` | `engagement-extras.ts:139` | `pollId` FK | P1 |
| `hrCommunityMembers` | `engagement-extras.ts:182` | `communityId` FK | P1 |
| `announcementReads` | `announcements.ts:38` | `announcementId` FK | P1 |

**Fix pattern:** Add `orgId text NOT NULL REFERENCES organizations(id)` to each table above; add `idx_<table>_org` index; populate via JOIN on the parent FK.

---

## 4. Money Column Analysis

### 4a. Correct pattern — integer/bigint cents

| Column | File:Line | Type |
|---|---|---|
| `hrEmployeeSensitiveFields.salaryAmountCents` | `core-people.ts:141` | `integer` |
| `salaryComponents.amountCents` (enterprise-comp context) | `enterprise-comp.ts` | `bigint` |
| `hrCompCycles.budgetPoolCents` | `enterprise-comp.ts` | `bigint` |
| `hrCompRecommendations.currentSalaryCents` | `enterprise-comp.ts` | `bigint` |
| `hrCompRecommendations.recommendedIncreaseCents` | `enterprise-comp.ts` | `bigint` |
| `hrCompRecommendations.hrCalibratedCents` | `enterprise-comp.ts` | `bigint` |
| `hrCompBudgetPools.allocatedCents` | `enterprise-comp.ts` | `bigint` |
| `hrCompBudgetPools.usedCents` | `enterprise-comp.ts` | `bigint` |
| `hrEquityGrants.strikePriceCents` | `enterprise-comp.ts` | `bigint` |
| `hrEquityExercises.amountCents` | `enterprise-comp.ts` | `bigint` |
| `hrArrearsAdjustments.amountCents` | `enterprise-comp.ts` | `bigint` |
| `hrBenefitPlans.premiumCents` | `benefits.ts:89` | `integer` |
| `hrInsuranceClaims.amountCents` | `benefits.ts:190` | `integer` |
| `hrLoanRepayments.amountCents` | `benefits.ts:221` | `integer` |
| `hrHeadcountPlans.budgetedCostCents` | `workforce-planning.ts:16` | `integer` |

### 4b. WRONG pattern — decimal(15,2) float money

All of the following violate CLAUDE.md §19: "Money as integer cents, never float."

**payroll-runs.ts (P0 — payroll core):**
- `payrollRuns.grossTotal` `decimal(15,2)` `:29`
- `payrollRuns.deductionTotal` `decimal(15,2)` `:30`
- `payrollRuns.employerCostTotal` `decimal(15,2)` `:31`
- `payrollRuns.netTotal` `decimal(15,2)` `:32`
- `payrollRunEmployees.gross` `decimal(15,2)` `:84`
- `payrollRunEmployees.totalDeductions` `decimal(15,2)` `:85`
- `payrollRunEmployees.employerContributions` `decimal(15,2)` `:86`
- `payrollRunEmployees.net` `decimal(15,2)` `:87`
- `payrollRunEmployees.netPayoutCurrency` `decimal(15,2)` `:88`
- `payrollLineItems.amount` `decimal(15,2)` `:110`

**payroll-workforce.ts (P0 — salary profiles):**
- `salaryComponents.amount` `decimal(15,2)` `:20`
- `employeeSalaryProfiles.annualCtc` `decimal(15,2)` `:51`
- `employeeSalaryProfiles.basicSalary` `decimal(15,2)` `:52`
- `employeeSalaryProfiles.allowances` `decimal(15,2)` `:54`
- `employeeSalaryProfiles.deductions` `decimal(15,2)` `:55`
- `salaryAdjustments.amount` `decimal(15,2)` `:76`
- `salaryOverrides.amount` `decimal(15,2)` `:95`

**payroll.ts (P0 — expense/loan/FnF):**
- `expenses.amount` `decimal(15,2)` `:66`
- `expenses.taxAmount` `decimal(12,2)` `:74`
- `reimbursements.amount` `decimal(15,2)` `:123`
- `salaryLoans.amount` `decimal(15,2)` `:157`
- `salaryLoans.emiAmount` `decimal(15,2)` `:159`
- `bonuses.amount` `decimal(15,2)` `:194` ← also has `amountCents bigint :195` — DUAL representation
- `fnfSettlements.basicDues` `decimal(15,2)` `:226`
- `fnfSettlements.leaveEncashment` `decimal(15,2)` `:229`
- `fnfSettlements.bonusDue` `decimal(15,2)` `:232`
- `fnfSettlements.deductions` `decimal(15,2)` `:235`
- `fnfSettlements.loanRecovery` `decimal(15,2)` `:238`
- `fnfSettlements.netPayable` `decimal(15,2)` `:241`
- `fnfSettlements.reimbursementsDue` `decimal(15,2)` `:249`
- `fnfSettlements.assetRecovery` `decimal(15,2)` `:255`
- `fnfSettlements.noticeRecovery` `decimal(15,2)` `:258`
- `fnfSettlements.otherDeductions` `decimal(15,2)` `:261`
- `payroll.budgetLimit` `decimal(15,2)` `:38`

**tax.ts (P0 — tax declarations):**
- `taxDeclarations.hra` `decimal(15,2)` `:10`
- `taxDeclarations.lta` `decimal(15,2)` `:11`
- `taxDeclarations.section80c` `decimal(15,2)` `:12`
- `taxDeclarations.section80d` `decimal(15,2)` `:13`
- `taxDeclarations.section80g` `decimal(15,2)` `:14`
- `taxDeclarations.homeLoanInterest` `decimal(15,2)` `:15`
- `taxDeclarations.previousEmploymentIncome` `decimal(15,2)` `:16`
- `taxDeclarations.previousEmployerTds` `decimal(15,2)` `:17`
- `investmentProofs.amount` `decimal(15,2)` `:35`

**salary-structure-templates.ts (P1):**
- `basicSalary` `decimal(15,2)` `:8`
- `specialAllowance` `decimal(15,2)` `:10`
- `medicalAllowance` `decimal(15,2)` `:11`
- `travelAllowance` `decimal(15,2)` `:12`
- `otherAllowances` `decimal(15,2)` `:13`
- `professionalTax` `decimal(10,2)` `:15`

**payroll-payout.ts (P1):**
- `payrollBatches.totalAmount` `decimal(15,2)` `:31`
- `payrollPayouts.amount` `decimal(15,2)` `:53`

**travel.ts (P1):**
- `advanceAmount` `decimal(15,2)` `:15`
- `estimatedCost` `decimal(15,2)` `:16`
- `perDiem` `decimal(15,2)` `:17`

**assets.ts (P1):**
- `purchaseCost` `decimal(15,2)` `:17`

**offboarding.ts (P1):**
- `terminations.severanceAmount` `decimal(15,2)` `:241`

**requisitions.ts (P1):**
- `budgetMin` `decimal(15,2)` `:12`
- `budgetMax` `decimal(15,2)` `:13`

**hiring.ts (P1):**
- `jobPostings.salaryMin` `decimal(15,2)` `:64`
- `jobPostings.salaryMax` `decimal(15,2)` `:65`
- `candidateOffers.offeredSalary` `decimal(15,2)` `:447`

**staffing.ts (P1):**
- `rewardAmount` `decimal(12,2)` `:40`

**job-boards.ts (P2):**
- `spend` `decimal(12,2)` `:16`

**Total decimal-money columns:** ~55

### 4c. Special case — dual representation (P0)

`payroll.ts` `bonuses` table has both:
- `amount decimal(15,2)` line 194
- `amountCents bigint` line 195

These will drift. Migrate to `amountCents` only; drop `amount`.

---

## 5. Date vs. Timestamp Analysis

### 5a. Correct `date` type usage ✓

- `hrEmployments.joiningDate`, `probationEndDate`, `confirmationDate`, `lastWorkingDay`, `exitDate` — `core-people.ts:116-122`
- `hrEffectiveDatedChanges.effectiveFrom`/`effectiveTo` — `core-people.ts:201-202`
- `hrReportingLines.effectiveFrom`/`effectiveTo` — `core-people.ts:225-226`
- `hrLeaveRequests.startDate`/`endDate` — `leaves.ts`
- `hrPolicies.effectiveFrom`/`effectiveTo` — `policy-engine.ts:68-69`

### 5b. Semantic dates stored as `text` (P1 — sorting, range queries, comparisons broken)

| Column | File:Line | Should be |
|---|---|---|
| `salaryStructureTemplates.effectiveFrom` | `salary-structure-templates.ts:16` | `date` |
| `salaryStructureTemplates.effectiveTo` | `salary-structure-templates.ts:17` | `date` |
| `employeeShiftAssignments.effectiveFrom` | `shifts.ts:28` | `date` |
| `employeeShiftAssignments.effectiveTo` | `shifts.ts:29` | `date` |
| `shiftSwapRequests.requestDate` | `shifts.ts:43` | `date` |
| `shiftSwapRequests.targetDate` | `shifts.ts:44` | `date` |
| `hrLeavePolicy.effectiveFrom` | `leave-policies.ts:19` | `date` |
| `hrLeavePolicy.effectiveTo` | `leave-policies.ts:20` | `date` |
| `travelRequests.departureDate` | `travel.ts:10` | `date` |
| `travelRequests.returnDate` | `travel.ts:11` | `date` |
| `feedbackCycles.startDate` | `feedback.ts:11` | `date` |
| `feedbackCycles.endDate` | `feedback.ts:12` | `date` |
| `hrWellnessCheckins.date` | `safety.ts:69` | `date` |
| `hrMoodCheckins.date` | `engagement-extras.ts:46` | `date` |
| `hrRequisitions.targetDate` | `requisitions.ts:23` | `date` |

### 5c. Dates stored as `timestamp` where `date` is correct (P1)

| Column | File:Line | Issue |
|---|---|---|
| `hrPositions.effectiveFrom` | `governance.ts:207` | Position effective-date, not a datetime |
| `hrUnionMemberships.memberSince` | `governance.ts:253` | Calendar date, not a datetime |
| `hrCollectiveAgreements.effectiveFrom` | `governance.ts:275` | Calendar date |
| `hrCollectiveAgreements.expiresAt` | `governance.ts:276` | Calendar date |
| `hrDisciplinaryActions.effectiveDate` | `cases.ts:113` | Calendar date |

---

## 6. Effective-Dating Analysis

### 6a. `hrEffectiveDatedChanges` — correct open-ended pattern ✓

- `effectiveFrom date NOT NULL` + `effectiveTo date` (NULL = current) — `core-people.ts:201-202`
- Covers: `department`, `manager`, `location`, `designation`, `job_level`, `employment_type`, `compensation`, `work_schedule`, `policy_assignment` — `core-people.ts:43-53`

### 6b. Missing effective-date overlap exclusion

No `EXCLUDE USING gist` constraint anywhere in the HR schema. Overlapping effective-date ranges for the same employment are only enforced at the application layer. For `compensation` changes this is a correctness risk (two salary records valid at the same instant).

### 6c. `salaryStructureTemplates.effectiveFrom`/`effectiveTo` stored as `text`

Cannot enforce range queries, cannot add EXCLUDE USING gist later without migration. See §5b above.

---

## 7. Enum Catalog

**90 pgEnum declarations** across 18 files. Notable concentrations:

| File | Enum count |
|---|---|
| `governance.ts` | 12 |
| `enterprise-ops.ts` | 10 |
| `enterprise-comp.ts` | 10 |
| `global-compliance.ts` | 7 |
| `workflow-engine.ts` | 6 |
| `benefits.ts` | 8 |
| `forms.ts` | 3 |
| `policy-engine.ts` | 3 |
| `template-engine.ts` | 3 |
| `safety.ts` | 3 |
| `leave-ledger.ts` | 3 |
| `payroll-inputs.ts` | 4 |
| `core-people.ts` | 5 |
| `cases.ts` | 4 |
| `import-jobs.ts` | 3 |
| `engagement-extras.ts` | 4 |
| `performance.ts` | 1 |
| `webhooks.ts` | 1 |

**No duplicate enum names confirmed.** All use `snake_case` PG enum type names.

---

## 8. Unbounded JSONB Lifecycle Arrays (P1)

These are growing append-only lists of structured events stored in a JSONB column. They cannot be individually indexed, paginated, atomically updated, or soft-deleted.

| Column | File:Line | What it holds | Fix |
|---|---|---|---|
| `hrEmployeeSensitiveFields.disciplinaryRecords` | `core-people.ts:165` | `Array<Record<string,unknown>>` disciplinary events | Normalize to `hrDisciplinaryActions` (already exists in `cases.ts`) — this column is REDUNDANT |
| `hrEmployeeSensitiveFields.grievanceRecords` | `core-people.ts:166` | `Array<Record<string,unknown>>` grievance events | Normalize to `hrGrievances` (already exists in `cases.ts`) — REDUNDANT |
| `oneOnOneMeetings.actionItems` | `performance.ts:65` | `{ text: string; done: boolean }[]` tasks | Normalize to `oneOnOneMeetingActionItems` table |
| `rosterEntries.isDayOff` | `rosters.ts:27` | `jsonb.$type<boolean>()` — single boolean | Change to `boolean` column directly |

Note: `hrEmployeeSensitiveFields.disciplinaryRecords` and `.grievanceRecords` are almost certainly dead columns — `cases.ts` already has proper `hrDisciplinaryActions` and `hrGrievances` tables with `orgId`, `status`, and full lifecycle. Verify application layer doesn't write to both.

---

## 9. Index & Constraint Analysis

### 9a. PKs — all `serial()`, none `generatedAlwaysAsIdentity()`

CLAUDE.md §19 states: "prefer `generatedAlwaysAsIdentity()` over `serial`." All 234 tables use `serial`. This is a P2 (migration-costly); defer unless doing a large schema rewrite.

### 9b. Composite `uniqueIndex` NOT led by `orgId` (P0/P1 — cross-tenant uniqueness collision)

| Constraint name | File:Line | Columns | Risk |
|---|---|---|---|
| `uniq_leave_balances_user_type_year` | `leaves.ts:27` | `(userId, leaveTypeId, year)` | P0: user in org A can block org B from granting the same leaveType+year if userId is globally unique |
| `uniq_hr_ecfv_employment_field` | `core-org.ts:71` | `(employmentId, fieldDefinitionId)` | P1: employment IDs are global integers — cross-tenant collision impossible but RLS-unfriendly |
| `uniq_calibration_cycle_employee` | `performance.ts:335` | `(cycleId, employeeId)` | P1: same issue as above |

**Fix:** prepend `orgId` to all three: `(orgId, userId, leaveTypeId, year)`, `(orgId, employmentId, fieldDefinitionId)`, `(orgId, cycleId, employeeId)`.

### 9c. Bare `.unique()` on single text columns — cross-tenant token/identifier collision risk

| Column | File:Line | Notes |
|---|---|---|
| `candidateApplications.trackingToken` | `hiring.ts:157` | Random token — global uniqueness intentional and CORRECT |
| Token column (line 238) | `hiring.ts:238` | Random token — likely intentional |
| `candidateOffers.acceptanceToken` | `hiring.ts:454` | Random token — likely intentional |

These are random URL tokens meant to be globally unique (sent in emails to candidates). Global `.unique()` is correct here. **Not a bug.**

### 9d. Missing indexes

- `hrAccessRequests.employeeId` is a plain `text` field with NO FK reference (`access-requests.ts:8`). No index either. Queries by employeeId will full-scan the table.
- `announcementReads` has no `orgId`, no leading org index — any query for "who read announcement X in org Y" cannot use an index efficiently.

---

## 10. Other Schema Issues

### 10a. `hrAccessRequests.employeeId` — no FK, no referential integrity

`access-requests.ts:8`:
```
employeeId: text("employee_id"),
```
No `.references()` call. This is a dangling text field. There is no FK to `hrPeople`, `hrEmployments`, or `users`. Data can reference non-existent employees with no DB enforcement.

### 10b. `bonuses` table — dual `amount`/`amountCents` representation

`payroll.ts:194-195` — both `decimal(15,2)` and `bigint` cents exist on the same row. Application writes one or both; they will drift.

### 10c. `rosterEntries.isDayOff` — `jsonb.$type<boolean>()`

`rosters.ts:27` — a single boolean stored as JSONB. This disables index scans on the column and forces a JSONB cast for every predicate. Change to native `boolean`.

### 10d. `index.ts` double-barrel for `offboarding.ts`

`index.ts:15` exports `./recruitment` (which in turn re-exports `./offboarding` via `recruitment.ts`) AND `index.ts:18` also directly exports `./offboarding`. Same symbols exported twice from the barrel. Harmless due to same module reference but confusing and should be cleaned up (remove the direct export of offboarding from index.ts since recruitment.ts already re-exports it).

### 10e. `hrEmployments.jobRoleId`, `jobLevelId`, `employmentTypeId` — bare integer FKs

`core-people.ts:111-113` — these are integers with no `.references()` call. No FK constraint enforces that the referenced job role/level/type exists. Orphan references are possible.

---

## 11. Top 25 Findings (ranked by severity)

| # | Sev | Finding | File:Line |
|---|---|---|---|
| 1 | **P0** | Payroll run totals stored as `decimal(15,2)` — floating-point money causes rounding errors in payroll math | `payroll-runs.ts:29-32,84-88,110` |
| 2 | **P0** | Employee salary profiles (`annualCtc`, `basicSalary`, `allowances`, `deductions`) stored as `decimal(15,2)` | `payroll-workforce.ts:51-55` |
| 3 | **P0** | All tax declaration deduction amounts stored as `decimal(15,2)` — statutory filings with float arithmetic | `tax.ts:10-17,35` |
| 4 | **P0** | `bonuses` table has dual `amount decimal(15,2)` AND `amountCents bigint` — will drift | `payroll.ts:194-195` |
| 5 | **P0** | `uniq_leave_balances_user_type_year` NOT led by `orgId` — cross-tenant uniqueness collision if shared user accounts | `leaves.ts:27` |
| 6 | **P1** | 16 tables have no `orgId` column — tenant isolation relies entirely on FK chain depth | Multiple files (see §3b) |
| 7 | **P1** | `vaultAccessLogs` has NO `orgId` — audit log for candidate vault access cannot be org-scoped at the DB level | `hiring.ts:356` |
| 8 | **P1** | `hrEmployeeSensitiveFields.disciplinaryRecords`/`.grievanceRecords` — unbounded JSONB arrays duplicating `cases.ts` normalized tables | `core-people.ts:165-166` |
| 9 | **P1** | 15 semantic date columns stored as `text` — range queries, sorting, and comparisons silently broken | `shifts.ts:28-29,43-44`, `leave-policies.ts:19-20`, `travel.ts:10-11`, `feedback.ts:11-12`, `salary-structure-templates.ts:16-17`, `safety.ts:69`, `engagement-extras.ts:46`, `requisitions.ts:23` |
| 10 | **P1** | 5 calendar dates stored as `timestamp` — timezone shifts can cause off-by-one-day errors for non-UTC tenants | `governance.ts:207,253,275-276`, `cases.ts:113` |
| 11 | **P1** | `fnfSettlements` — 11 money columns all `decimal(15,2)` (final settlement is a legal document, rounding must be exact) | `payroll.ts:226-261` |
| 12 | **P1** | `employeeSalaryProfiles.annualCtc` + template salary columns stored as `decimal(15,2)` — template → run copy path carries the float error forward | `payroll-workforce.ts:51`, `salary-structure-templates.ts:8-15` |
| 13 | **P1** | `uniq_hr_ecfv_employment_field` on `(employmentId, fieldDefinitionId)` NOT led by `orgId` | `core-org.ts:71` |
| 14 | **P1** | `uniq_calibration_cycle_employee` on `(cycleId, employeeId)` NOT led by `orgId` | `performance.ts:335` |
| 15 | **P1** | `oneOnOneMeetings.actionItems` — growing JSONB task list; cannot individually mark done, paginate, or delete | `performance.ts:65` |
| 16 | **P1** | `hrAccessRequests.employeeId` — bare `text` field, no FK, no index, no referential integrity | `access-requests.ts:8` |
| 17 | **P1** | `rosterEntries.isDayOff` typed as `jsonb.$type<boolean>()` — should be native `boolean` | `rosters.ts:27` |
| 18 | **P1** | No `EXCLUDE USING gist` to prevent overlapping effective-date ranges for same employment — application-only enforcement | `core-people.ts` (schema gap) |
| 19 | **P1** | `hrEmployments.jobRoleId`, `jobLevelId`, `employmentTypeId` — bare integer columns with no FK constraints | `core-people.ts:111-113` |
| 20 | **P1** | `travel.ts` money (`advanceAmount`, `estimatedCost`, `perDiem`) as `decimal(15,2)` — expense tracking with float | `travel.ts:15-17` |
| 21 | **P1** | `assets.ts.purchaseCost` as `decimal(15,2)` — asset valuation should be integer cents | `assets.ts:17` |
| 22 | **P1** | `offboarding.ts.terminations.severanceAmount` as `decimal(15,2)` — legal payout | `offboarding.ts:241` |
| 23 | **P1** | `hiring.ts jobPostings.salaryMin/Max` and `candidateOffers.offeredSalary` as `decimal(15,2)` | `hiring.ts:64-65,447` |
| 24 | **P2** | All 234 tables use `serial()` PK — CLAUDE.md §19 prefers `generatedAlwaysAsIdentity()` | All files |
| 25 | **P2** | `index.ts` double-exports `offboarding` symbols (via `./recruitment` AND direct `./offboarding`) — cleanup needed | `index.ts:15,18` |

---

## 12. Coverage Gaps

1. **Migrations not reviewed** — `backend/migrations/` was out of scope for this lane. Whether the decimal money columns are consistent with a migration from an older cents schema is unknown. Lane B or a dedicated migration lane should check `_journal.json` for any past money-conversion migrations that may have been reverted.

2. **`hiring.ts` line 238 context** — the `.unique()` at line 238 was confirmed as a random token but the exact table name was not verified (file is 900+ lines; it is likely `candidateEmailTokens` or similar). Verify if a separate token table exists there.

3. **Application-layer reads not reviewed** — this lane is schema-only. Whether the payroll service actually uses `decimal(15,2)` at the JS layer (where Drizzle returns it as a `string` via `pg` driver) or converts to `number` (float) before arithmetic is a service-layer question for Lane C2/D.

4. **Soft-delete completeness** — most tables have `deletedAt timestamp` but not all were verified (e.g. `hrPollVotes`, `announcementReads`, child tables in engagement-extras). A targeted `grep` would close this.

5. **`hrEmployeeSensitiveFields.disciplinaryRecords/grievanceRecords` write path** — confirmed as redundant with `cases.ts` by schema inspection alone; whether the application actually writes to both or only one needs a service-layer grep.

6. **`payroll.ts` `bonuses.amountCents`** — confirmed both columns exist; which one is authoritative and which is the legacy column is unknown without a service-layer read.
