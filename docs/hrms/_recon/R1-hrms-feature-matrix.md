# R1 — HRMS Feature Matrix & Gap Analysis (HR Domain)

**Lane:** R1 (Product Research)  
**Date:** 2026-07-31  
**Branch:** `refactoring-hrms`  
**Scope:** HR domain only. Payroll-engine mechanics and billing are excluded (separate lanes own those).  
**Evidence convention:** `[V]` = verified by reading cited file this session · `[L]` = reported by named recon lane with citation · `[WEB]` = external source cited with URL · `[UNVERIFIED]` = cannot be established from repo alone.

---

## 0. How to Read This Document

- **"We have?"** column cites `file:line` from the backend or frontend repo, or writes `NO` — no guessing.
- **"Already specced?"** points to the `tasks/hrms/NN_*.md` file if a spec exists.
- **Priority:** `P0` = table-stakes (blocking commercial launch) · `P1` = expected by buyers within 90 days of adoption · `P2` = differentiator / roadmap.
- Competitor columns use checkmarks: `Y` = present · `P` = partial / limited · `N` = absent · `[?]` = not verifiable from public docs.

---

## 1. Feature Matrix

### 1A. Employee Master & People Directory

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Employee list + search + filters | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/directory/employees.controller.ts:81` [V] | `tasks/hrms/09_EMPLOYEE_MASTER_AND_360_PROFILE.md` | P0 |
| 360° profile (personal, job, contact, emergency) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/directory/employees.service.ts:1` [L] | `tasks/hrms/09_EMPLOYEE_MASTER_AND_360_PROFILE.md` | P0 |
| Custom fields on employee profile | Y | Y | P | Y | P | Y | Y | P | `backend/src/modules/hr/core/hr-custom-fields.controller.ts:40` [V] | `tasks/hrms/32_CUSTOM_FORMS_OBJECTS_AND_DYNAMIC_FIELDS.md` | P0 |
| Sensitive data vault (salary, bank, national ID) | Y | Y | Y | P | P | Y | Y | P | `backend/src/db/schema/hr/core-people.ts:137` [V] — `hrEmployeeSensitiveFields` | `tasks/hrms/09_EMPLOYEE_MASTER_AND_360_PROFILE.md` | P0 |
| Employee timeline / audit trail | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/core/hr-audit.controller.ts:18` [V] | `tasks/hrms/09_EMPLOYEE_MASTER_AND_360_PROFILE.md` | P0 |
| Multi-employment / multiple active contracts | P | N | N | N | N | Y | P | Y | `backend/src/db/schema/hr/core-people.ts:103` [V] — `hrEmployments.isPrimary` | `tasks/hrms/04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md` | P1 |
| Pre-hire / contractor without login account | P | N | N | N | N | Y | P | Y | `backend/src/db/schema/hr/core-people.ts:67` [V] — `hrPeople.userId nullable` | `tasks/hrms/40_CONTRACTORS_INTERNS_TEMP_STAFF_AND_AGENCIES.md` | P1 |
| Employee import (CSV bulk) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/import/hr-import.service.ts` [L] | `tasks/hrms/36_HR_IMPORT_EXPORT_DATA_QUALITY_AND_MIGRATION.md` | P0 |
| People / ESS mobile app | Y | Y | Y | Y | Y | Y | Y | Y | NO — web only [V] frontend has no native app | `tasks/hrms/35_WORKFORCE_SCHEDULING_FIELD_FORCE_AND_MOBILE.md` | P2 |

### 1B. Org Structure & Reporting Lines

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Department hierarchy (multi-level) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/config/hr-departments.controller.ts:18` [V] | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P0 |
| Org chart (visual tree) | Y | Y | P | Y | Y | Y | Y | P | `frontend/app/(authenticated)/hr/org-chart/page.tsx:1` [V] | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P0 |
| Primary manager + reporting line (effective-dated) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/db/schema/hr/core-people.ts:225` [V] — `hrReportingLines.effectiveFrom/effectiveTo` | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P0 |
| Dotted-line / functional manager (secondary) | Y | P | N | P | N | Y | P | N | NO — `hrReportingLines` has no `isDotted` or `isPrimary` flag [V] `core-people.ts` | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P1 |
| Multi-location support | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/core/hr-org-catalog.controller.ts:96` [V] | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P0 |
| Cost centres / profit centres | Y | P | P | P | P | Y | Y | P | NO — no `cost_centers` table in HR schema [L Lane A] | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P1 |
| Workforce planning / headcount plan | Y | P | N | P | N | Y | Y | P | `backend/src/db/schema/hr/workforce-planning.ts` [L] + `hr-analytics-plus.controller.ts:118` [V] | `tasks/hrms/26_ANALYTICS_REPORTING_AND_WORKFORCE_PLANNING.md` | P1 |

### 1C. Position & Job Architecture

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Job roles / grades / levels catalog | Y | Y | Y | Y | P | Y | Y | Y | `backend/src/modules/hr/core/hr-org-catalog.controller.ts:136` [V] — roles+levels CRUD | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P0 |
| Position management (headcount-controlled) | Y | P | N | P | N | Y | Y | P | `backend/src/db/schema/hr/governance.ts` [L] — `hrPositions` table; `governance/positions` controller [V] | `tasks/hrms/10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md` | P1 |
| Compensation bands by grade | Y | Y | P | P | P | Y | Y | P | `backend/src/db/schema/hr/enterprise-comp.ts` [L] — comp cycles + budget pools | `tasks/hrms/22_PAYROLL_COMPENSATION_AND_FINANCE_INTEGRATION.md` | P1 |
| Job description generator (AI) | Y | P | N | N | N | P | P | N | `backend/src/modules/hr/recruitment/recruitment-candidate-ai.service.ts` [L] — `generate-jd` present | `tasks/hrms/27_AI_HR_COPILOT_AND_POLICY_QA.md` | P2 |

### 1D. Onboarding & Pre-boarding

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Template-driven onboarding checklists | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/onboarding/core/onboarding.service.ts:1` [L] — template steps seeded | `tasks/hrms/13_ONBOARDING_PROBATION_AND_CONFIRMATION.md` | P0 |
| Pre-joining portal (candidate fills docs) | Y | P | P | P | P | Y | Y | Y | `frontend/app/(authenticated)/hr/onboarding/[userId]/page.tsx` [V] — employee flow; no unauthenticated pre-join portal | `tasks/hrms/13_ONBOARDING_PROBATION_AND_CONFIRMATION.md` | P1 |
| Role-based task assignment (IT / HR / manager) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/onboarding/flow/module-checklist.service.ts` [L] | `tasks/hrms/13_ONBOARDING_PROBATION_AND_CONFIRMATION.md` | P0 |
| Document collection + e-sign on join | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/db/schema/hr/offboarding.ts` [L] — `onboardingDocuments`; e-sign module exists | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P0 |
| Buddy / mentor assignment | Y | P | N | P | P | Y | P | N | `backend/src/db/schema/hr/performance.ts` [L] — `hr_mentorships` table exists but flagged suspect dead [L Lane A] | `tasks/hrms/13_ONBOARDING_PROBATION_AND_CONFIRMATION.md` | P2 |
| IT provisioning trigger | Y | N | N | N | N | Y | Y | N | NO — no backend IT-provisioning module; `hrAccessRequests` table exists but bare text FK [V `access-requests.ts:8`] | `tasks/hrms/16_ASSETS_DEVICES_AND_ACCESS_MANAGEMENT.md` | P1 |

### 1E. Probation & Confirmation

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Probation period tracking + review | Y | Y | Y | Y | Y | Y | Y | P | `backend/src/modules/hr/lifecycle/probation.service.ts` [L] | `tasks/hrms/13_ONBOARDING_PROBATION_AND_CONFIRMATION.md` | P0 |
| Workflow-driven confirmation | Y | Y | Y | Y | Y | Y | Y | P | `backend/src/modules/hr/lifecycle/probation.service.ts` [L] — `confirm()` method | `tasks/hrms/13_ONBOARDING_PROBATION_AND_CONFIRMATION.md` | P0 |
| Confirmation letter generation | Y | Y | Y | Y | Y | Y | Y | P | `backend/src/modules/hr/config/hr-document-templates.controller.ts:94` [V] — render endpoint | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P0 |
| Probation policy (duration by employment type) | Y | Y | P | P | P | Y | P | P | `backend/src/db/schema/hr/probation.ts` [L] — `hrProbationReviews` exists; duration not verified as policy-driven | `tasks/hrms/05_POLICY_ENGINE.md` | P1 |

### 1F. Attendance Capture

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Web clock-in / clock-out | Y | Y | Y | Y | P | Y | Y | P | `backend/src/modules/hr/time/attendance-clock.service.ts:37` [V] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P0 |
| Mobile clock-in | Y | Y | Y | Y | P | Y | Y | P | NO — no mobile app; web-responsive only [V] | `tasks/hrms/35_WORKFORCE_SCHEDULING_FIELD_FORCE_AND_MOBILE.md` | P2 |
| GPS / geofencing attendance | Y | Y | Y | Y | N | Y | Y | N | `backend/src/db/schema/hr/geofencing.ts` [L] — table exists; `attendance-clock.service.ts:37` accepts `locationData` [V] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |
| Biometric device integration | Y | Y | Y | Y | N | Y | Y | N | `backend/src/db/schema/hr/biometric.ts` [L] — schema exists; `enterprise-comp/devices.controller.ts` [V] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |
| Regularization (missed punch correction) | Y | Y | Y | Y | P | Y | Y | N | `backend/src/modules/hr/time/attendance-regularization.service.ts:133` [V] — **overwrites in place, not append-only** (P1 bug F-21) | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P0 |
| Attendance anomaly detection | Y | Y | P | P | N | Y | Y | N | NO — no anomaly-detection service; manual review only [L Lane C2] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |
| WFH / remote attendance tracking | Y | Y | Y | Y | P | Y | Y | Y | `backend/src/db/schema/hr/attendance.ts` [L] — WFH flag in attendance | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P0 |
| Policy-driven late/absent thresholds | Y | Y | Y | Y | P | Y | Y | N | NO — **hardcoded from one representative employee** (F-18) [V `attendance-summary.service.ts:187`] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P0 |

### 1G. Shifts & Rosters

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Shift definitions (start/end/breaks/grace) | Y | Y | Y | Y | P | Y | Y | N | `backend/src/db/schema/hr/shifts.ts` [L] — `employeeShiftAssignments` but effective dates stored as text (bug) | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P0 |
| Rotational rosters | Y | Y | Y | Y | N | Y | Y | N | `backend/src/db/schema/hr/rosters.ts` [L] — `rosterEntries`; `isDayOff` as JSONB boolean (bug) | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |
| Shift swap / handoff requests | Y | Y | P | P | N | Y | P | N | `backend/src/db/schema/hr/shifts.ts` [L] — `shiftSwapRequests` table exists | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |
| Shift allowance / differential pay | Y | Y | P | P | N | Y | Y | N | NO — no allowance mapping from shift to pay component [L Lane J] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |

### 1H. Leave Policy Engine & Accrual

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Leave types with configurable rules | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/time/leaves.service.ts:1` [L] | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |
| Ledger-based accrual (audit-trail) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/db/schema/hr/leave-ledger.ts` [L] — `leaveLedger` table | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |
| Carry-forward / encashment | Y | Y | Y | Y | Y | Y | Y | P | `backend/src/modules/hr/config/hr-leave-blackout.controller.ts` [V] — blackout; carry-forward [L Lane C2] | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |
| Half-day / hourly leave | Y | Y | Y | Y | P | Y | Y | P | `backend/src/modules/hr/time/leaves-write.service.ts` [L] — half-day in service | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |
| Sandwich leave policy | Y | Y | Y | P | N | Y | P | N | [UNVERIFIED] — leave-policies schema exists but sandwich rule not confirmed in service [L] | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P1 |
| Leave blackout / restriction periods | Y | Y | Y | Y | P | Y | Y | P | `backend/src/modules/hr/config/hr-leave-blackout.controller.ts` [V] | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |
| Team availability / conflict detection | Y | Y | P | Y | Y | Y | Y | P | `backend/src/modules/hr/directory/employees.controller.ts:112` [V] — `availability` endpoint | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P1 |
| Effective-dated leave policy assignment | Y | Y | P | P | P | Y | P | P | `backend/src/db/schema/hr/leave-policies.ts` [L] — `effectiveFrom`/`effectiveTo` stored as text (bug) | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |

### 1I. Comp-Off & Overtime

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Comp-off earning from weekend/holiday work | Y | Y | Y | Y | P | Y | Y | N | `backend/src/modules/hr/time/leaves.service.ts` [L] — comp-off grant method | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |
| Overtime tracking + policy threshold | Y | Y | Y | Y | P | Y | Y | P | `backend/src/db/schema/hr/overtime.ts` [L] — `overtimeRequests`; threshold hardcoded (F-18) | `tasks/hrms/12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md` | P0 |

### 1J. WFH / Hybrid

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WFH policy (days per week, team limits) | Y | Y | P | Y | P | Y | Y | Y | `backend/src/db/schema/hr/attendance.ts` [L] — WFH flag; no per-team-cap enforcement | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P1 |
| Hybrid schedule calendar view | Y | P | N | P | N | Y | Y | P | NO — no dedicated hybrid calendar UI [V frontend] | `tasks/hrms/11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md` | P2 |

### 1K. Timesheets

| Capability | Darwinbox | Keka | P | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Project-based timesheet (billable hours) | P | Y | N | Y | P | Y | Y | Y | `backend/src/modules/timesheets/` [L Lane J] — full chain: timer → entry → period → approval → export | `tasks/hrms/22_PAYROLL_COMPENSATION_AND_FINANCE_INTEGRATION.md` | P1 |
| Timesheet → payroll feed (hours to payroll inputs) | Y | Y | N | Y | P | Y | Y | Y | NO — **Chain A (timesheets) and Chain B (payroll inputs) are fully disconnected** (F-20) [V Lane J] | `tasks/hrms/22_PAYROLL_COMPENSATION_AND_FINANCE_INTEGRATION.md` | P0 |

### 1L. Performance (Goals / OKR / Review / Calibration / 9-box)

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Goal / OKR setting + tracking | Y | Y | P | Y | P | Y | Y | P | `frontend/app/(authenticated)/hr/goals/page.tsx` [V] + `hr/kpis/page.tsx` [V] | `tasks/hrms/17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md` | P0 |
| Review cycles (multi-template) | Y | Y | P | Y | Y | Y | Y | P | `backend/src/modules/hr/performance/performance-reviews.service.ts` [L] | `tasks/hrms/17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md` | P0 |
| 360° review (self / manager / peer) | Y | Y | P | Y | Y | Y | Y | P | `backend/src/db/schema/hr/feedback.ts` [L] — `feedbackCycles`/`feedbackCycleRequests` | `tasks/hrms/17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md` | P0 |
| Calibration session + 9-box grid | Y | P | N | P | N | Y | P | N | `backend/src/db/schema/hr/performance.ts` [L] — `hrCalibrationSessions` table | `tasks/hrms/17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md` | P1 |
| Performance improvement plan (PIP) | Y | Y | P | P | P | Y | Y | N | `backend/src/db/schema/hr/performance.ts` [L] — `hrImprovementPlans` table | `tasks/hrms/17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md` | P1 |
| Continuous feedback / 1:1s | Y | Y | P | Y | Y | Y | Y | P | `backend/src/db/schema/hr/performance.ts:65` [V] — `oneOnOneMeetings` with JSONB `actionItems` (bug) | `tasks/hrms/17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md` | P1 |

### 1M. Learning, Skills & Career

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Skills catalog + employee skills | Y | Y | P | Y | P | Y | Y | P | `frontend/app/(authenticated)/hr/employees/skills-matrix/page.tsx` [V] — frontend exists; backend skills-matrix endpoint [V `employees.controller.ts:140`] | `tasks/hrms/18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md` | P1 |
| Courses / learning paths (LMS) | Y | Y | N | Y | P | Y | Y | P | NO — no LMS module in backend or frontend [L Lane F2] | `tasks/hrms/18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md` | P1 |
| Certification tracking + expiry reminders | Y | Y | N | Y | P | Y | Y | P | NO — no certification schema [L Lane A] | `tasks/hrms/18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md` | P1 |
| Career ladders / internal mobility | Y | P | N | P | N | Y | Y | P | NO — no career-ladder or internal-mobility tables [L Lane A] | `tasks/hrms/18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md` | P2 |
| Talent marketplace / mentorship | Y | P | N | P | N | Y | P | N | `backend/src/db/schema/hr/performance.ts` [L] — `hr_mentorships` flagged suspect-dead | `tasks/hrms/18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md` | P2 |

### 1N. Succession Planning

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Succession candidate mapping | Y | P | N | Y | N | Y | P | N | `backend/src/db/schema/hr/succession.ts` [L] — `hrSuccessionPlans` table | `tasks/hrms/18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md` | P2 |
| Attrition-risk scoring | Y | P | N | P | N | Y | Y | N | `backend/src/modules/hr/analytics-plus/hr-analytics-plus.service.ts` [L] — attrition forecast endpoint | `tasks/hrms/26_ANALYTICS_REPORTING_AND_WORKFORCE_PLANNING.md` | P2 |

### 1O. Recruitment / ATS & Offer Management

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Job posting with career page | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/recruitment/recruitment-jobs.service.ts` [L] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P0 |
| Candidate pipeline + stage management | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/recruitment/recruitment-candidates.service.ts` [L] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P0 |
| Interview scheduling + scorecards | Y | Y | P | Y | Y | Y | Y | Y | `backend/src/modules/hr/interviews/hr-interview-scheduling.service.ts` [L] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P0 |
| Offer letter creation + approval | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/recruitment/recruitment-offers.service.ts` [L] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P0 |
| Offer accepted → employee auto-created | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/recruitment/recruitment-handoff.service.ts` [L] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P0 |
| Internal job board | Y | Y | N | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/recruitment/internal-jobs/page.tsx` [V] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P1 |
| Employee referral program | Y | Y | N | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/recruitment/refer/page.tsx` [V] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P1 |
| AI CV screening / JD matching | Y | P | N | N | N | P | P | N | `backend/src/modules/hr/recruitment/recruitment-candidate-ai.service.ts` [L] | `tasks/hrms/27_AI_HR_COPILOT_AND_POLICY_QA.md` | P2 |
| Job board integrations (LinkedIn, Naukri, Indeed) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/db/schema/hr/job-boards.ts` [L] — schema; integration backend not confirmed [UNVERIFIED] | `tasks/hrms/37_THIRD_PARTY_INTEGRATIONS_AND_WEBHOOKS.md` | P1 |
| Recruitment SLA tracking | Y | Y | P | P | P | Y | Y | P | `frontend/app/(authenticated)/hr/recruitment/sla/page.tsx` [V] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P2 |

### 1P. Background Verification

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BGV initiation + status tracking | Y | P | P | P | P | Y | Y | Y | `backend/src/modules/hr/directory/background-verification.controller.ts:33` [V] | `tasks/hrms/23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md` | P1 |
| BGV vendor API integration | Y | P | N | N | N | Y | Y | Y | NO — no Composio BGV integration wired [UNVERIFIED] | `tasks/hrms/37_THIRD_PARTY_INTEGRATIONS_AND_WEBHOOKS.md` | P2 |

### 1Q. Asset Management

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Asset catalog + assignment | Y | Y | P | P | P | Y | Y | P | `backend/src/modules/hr/directory/assets.controller.ts:42` [V] | `tasks/hrms/16_ASSETS_DEVICES_AND_ACCESS_MANAGEMENT.md` | P1 |
| Asset return tracking | Y | Y | P | P | N | Y | Y | P | `backend/src/modules/hr/directory/assets.controller.ts:90` [V] — return endpoint | `tasks/hrms/16_ASSETS_DEVICES_AND_ACCESS_MANAGEMENT.md` | P1 |
| IT device / biometric device tracking | Y | Y | N | N | N | Y | Y | N | `backend/src/modules/hr/enterprise-comp/devices.controller.ts` [V] | `tasks/hrms/16_ASSETS_DEVICES_AND_ACCESS_MANAGEMENT.md` | P1 |

### 1R. Travel & Expense

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Travel request + approval | Y | Y | P | Y | P | Y | Y | P | `frontend/app/(authenticated)/hr/travel/page.tsx` [V] + travel.ts schema [L] — dates stored as text (bug) | `tasks/hrms/21_TRAVEL_EXPENSES_REIMBURSEMENTS_AND_BENEFITS.md` | P1 |
| Expense claim + reimbursement | Y | Y | Y | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/expenses/page.tsx` [V]; `hr/reimbursements/page.tsx` [V] | `tasks/hrms/21_TRAVEL_EXPENSES_REIMBURSEMENTS_AND_BENEFITS.md` | P0 |
| Per-diem policy configuration | Y | Y | P | P | P | Y | Y | P | `backend/src/db/schema/hr/travel.ts:17` [L] — `perDiem decimal(15,2)` (float money bug) | `tasks/hrms/21_TRAVEL_EXPENSES_REIMBURSEMENTS_AND_BENEFITS.md` | P1 |

### 1S. Documents, Letters & E-Sign

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Document vault (upload / manage) | Y | Y | Y | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/documents/page.tsx` [V] | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P0 |
| Letter templates (offer / confirmation / appraisal) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/config/hr-document-templates.controller.ts` [V] | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P0 |
| E-signature workflow | Y | Y | P | P | Y | Y | Y | Y | e-sign module exists separately (`db/schema/e-sign`) [L] | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P0 |
| Document expiry reminders | Y | Y | P | P | P | Y | Y | Y | `backend/src/db/schema/hr/documents.ts` [L] — `expiresAt` field present | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P1 |
| Permanent public URLs for HR docs (security gap) | N | N | N | N | N | N | N | N | **YES (P0 BUG)** — `storage.service.ts:115` [V Lane M] — all uploads at permanent public URLs | — | P0 |

### 1T. HR Helpdesk / Cases

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Employee ticket submission | Y | Y | P | Y | P | Y | Y | P | `backend/src/modules/hr/helpdesk/hr-helpdesk.controller.ts:84` [V] | `tasks/hrms/24_HR_HELPDESK_SELF_SERVICE_AND_KNOWLEDGE.md` | P1 |
| Case management (grievance / disciplinary) | Y | Y | P | P | P | Y | Y | P | `backend/src/modules/hr/cases/hr-cases.controller.ts` [V] + `hr-disciplinary.controller.ts` [V] | `tasks/hrms/20_EMPLOYEE_RELATIONS_GRIEVANCE_AND_CASES.md` | P1 |
| SLA tracking on HR tickets | Y | P | N | P | N | Y | Y | N | `backend/src/modules/hr/helpdesk/hr-helpdesk.service.ts` [L] — SLA in service | `tasks/hrms/24_HR_HELPDESK_SELF_SERVICE_AND_KNOWLEDGE.md` | P2 |
| Anonymous grievance submission | Y | P | N | P | N | Y | P | N | `backend/src/modules/hr/cases/hr-cases.controller.ts:80` [V] — `POST hr/cases/anonymous` | `tasks/hrms/20_EMPLOYEE_RELATIONS_GRIEVANCE_AND_CASES.md` | P1 |

### 1U. Policies & Handbook

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Policy engine (no-code rule configuration) | Y | Y | P | Y | P | Y | Y | P | `backend/src/modules/hr/policies/hr-policies.service.ts` [L] | `tasks/hrms/05_POLICY_ENGINE.md` | P0 |
| Handbook builder + versioning | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/config/hr-handbook.controller.ts` [V] | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P1 |
| Policy acknowledgement tracking | Y | Y | P | Y | Y | Y | Y | Y | `backend/src/db/schema/hr/policy-engine.ts` [L] — `hrPolicies.effectiveFrom/effectiveTo` (text bug) | `tasks/hrms/05_POLICY_ENGINE.md` | P1 |
| Hardcoded policies blocking no-code config | N | N | N | N | N | N | N | N | **YES (P0 BUG)** — 54 hardcoded HR rules [L Lane I, `tasks/hrms/_reports/hardcode-audit.md`] | — | P0 |

### 1V. Engagement / Surveys / Pulse

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eNPS survey | Y | Y | P | Y | Y | Y | Y | P | `backend/src/modules/hr/performance/engagement.service.ts` [L] — eNPS | `tasks/hrms/19_EMPLOYEE_ENGAGEMENT_RECOGNITION_AND_SURVEYS.md` | P1 |
| Pulse / mood check-in | Y | Y | N | Y | P | Y | Y | N | `backend/src/db/schema/hr/engagement-extras.ts:46` [L] — `hrMoodCheckins` (date as text) | `tasks/hrms/19_EMPLOYEE_ENGAGEMENT_RECOGNITION_AND_SURVEYS.md` | P1 |
| Announcements + read tracking | Y | Y | Y | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/announcements/page.tsx` [V]; `announcementReads` no orgId (bug) | `tasks/hrms/38_EMPLOYEE_COMMUNICATIONS_COMMUNITY_AND_EVENTS.md` | P1 |
| Recognition / awards | Y | Y | N | Y | Y | Y | Y | P | `backend/src/db/schema/hr/engagement-extras.ts` [L] — polls/communities; recognition not confirmed | `tasks/hrms/19_EMPLOYEE_ENGAGEMENT_RECOGNITION_AND_SURVEYS.md` | P2 |

### 1W. Exit, Offboarding & Alumni

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Resignation initiation + approval | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/lifecycle/exit-write.service.ts` [L] | `tasks/hrms/14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md` | P0 |
| Exit interview | Y | Y | P | Y | Y | Y | Y | P | `backend/src/modules/hr/lifecycle/exit.service.ts` [L] | `tasks/hrms/14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md` | P1 |
| Clearance / offboarding checklist | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/db/schema/hr/offboarding.ts` [L] | `tasks/hrms/14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md` | P0 |
| Final settlement (FnF) initiation | Y | Y | Y | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/fnf/page.tsx` [V] | `tasks/hrms/14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md` | P0 |
| Experience letter generation | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/lifecycle/exit.service.ts` [L] — experience-letter method | `tasks/hrms/15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md` | P0 |
| Alumni portal / alumni status | Y | P | N | P | P | Y | P | P | `backend/src/db/schema/hr/core-people.ts:48` [V] — `ALUMNI` in `lifecycleStatus`; no dedicated alumni portal | `tasks/hrms/14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md` | P2 |
| Involuntary termination workflow | Y | Y | Y | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/termination/page.tsx` [V] — 516-LOC page, no permission gate (bug) | `tasks/hrms/14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md` | P0 |

### 1X. Analytics & Statutory Reporting

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HR analytics dashboard | Y | Y | Y | Y | Y | Y | Y | Y | `frontend/app/(authenticated)/hr/analytics/page.tsx` [V] | `tasks/hrms/26_ANALYTICS_REPORTING_AND_WORKFORCE_PLANNING.md` | P0 |
| Attrition / headcount / diversity reports | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/analytics-plus/hr-analytics-plus.service.ts` [L] | `tasks/hrms/26_ANALYTICS_REPORTING_AND_WORKFORCE_PLANNING.md` | P0 |
| India statutory compliance (PF/ESI/PT/TDS) | Y | Y | Y | P | N | P | N | N | **Hardcoded TypeScript constants (F-03)** [V `statutory-registry.ts`]; no DB-effective-dated config | `tasks/hrms/33_GLOBAL_LOCALIZATION_AND_LABOR_COMPLIANCE.md` | P0 |
| Multi-state PT / LWF coverage | Y | Y | Y | N | N | N | N | N | `statutory-registry.ts:122,147` [V] — ~17 states for PT, ~10 for LWF; partial; labelled "sample" | `tasks/hrms/33_GLOBAL_LOCALIZATION_AND_LABOR_COMPLIANCE.md` | P1 |
| Auto-filing to EPFO/ESIC/TDS portals | Y | Y | Y | N | N | N | N | N | NO — no portal-filing integration [L Lane I] | `tasks/hrms/33_GLOBAL_LOCALIZATION_AND_LABOR_COMPLIANCE.md` | P1 |
| Custom report builder | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/analytics-plus/hr-analytics-plus.controller.ts:106` [V] — drilldown | `tasks/hrms/26_ANALYTICS_REPORTING_AND_WORKFORCE_PLANNING.md` | P1 |

### 1Y. ESS / MSS

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Employee self-service (leave / attendance / profile) | Y | Y | Y | Y | Y | Y | Y | Y | HR portal exists [V F1] — multiple self-service routes | `tasks/hrms/09_EMPLOYEE_MASTER_AND_360_PROFILE.md` | P0 |
| Manager self-service (approvals / team view) | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/directory/employees.controller.ts:158` [V] — `reports-to-me` + manager-scorecard | Tasks (various) | P0 |
| Tax investment declaration (Form 12BB) | Y | Y | Y | P | N | N | N | N | `backend/src/db/schema/hr/tax.ts` [L] — `taxDeclarations`; investment proofs | `tasks/hrms/22_PAYROLL_COMPENSATION_AND_FINANCE_INTEGRATION.md` | P0 |

### 1Z. Integrations

| Capability | Darwinbox | Keka | greytHR | Zoho People | BambooHR | Workday | Rippling | Deel | We have? | Already specced? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Outbound webhooks | Y | Y | Y | Y | Y | Y | Y | Y | `backend/src/modules/hr/automations/hr-webhooks.controller.ts` [V] | `tasks/hrms/37_THIRD_PARTY_INTEGRATIONS_AND_WEBHOOKS.md` | P1 |
| HR automation engine (event-driven) | Y | Y | P | Y | P | Y | Y | P | `backend/src/modules/hr/automations/hr-automation-engine.service.ts` [L] | `tasks/hrms/07_AUTOMATION_ENGINE.md` | P1 |
| Calendar integration (Google/Outlook) | Y | Y | P | Y | Y | Y | Y | Y | NO — Composio not yet wired for HR calendaring [L Lane I] | `tasks/hrms/37_THIRD_PARTY_INTEGRATIONS_AND_WEBHOOKS.md` | P1 |
| HRMS ↔ payroll software handoff | Y | Y | Y | Y | Y | Y | Y | Y | Chain A timesheets → CSV export only; Chain B HR attendance → internal only [V Lane J] | `tasks/hrms/22_PAYROLL_COMPENSATION_AND_FINANCE_INTEGRATION.md` | P0 |
| Mobile app (iOS / Android) | Y | Y | Y | Y | Y | Y | Y | Y | NO [V] | `tasks/hrms/35_WORKFORCE_SCHEDULING_FIELD_FORCE_AND_MOBILE.md` | P2 |

---

## 2. Adoptable Structural Patterns (HR-specific)

### P-01 — Append-Only Punch Ledger (prevents mutable-attendance corruption)

**Problem:** Attendance regularization overwrites raw punches in place (`attendance-regularization.service.ts:149`), destroying the audit trail. A payroll dispute has no forensic record.

**Pattern:** Every raw punch is immutable once written. Corrections are written as a separate `attendance_adjustments` row with `(original_attendance_id, corrector_user_id, reason, approved_by)`. The effective view is a DB view or service layer that applies the latest approved adjustment on top of the raw row, similar to event sourcing at the record level.

**Why it fits:** The `hrEmploymentHistory` table already uses this pattern for employment changes (`core-people.ts:177`). Extend the same idea to `attendance`.

**Rough cost:** M — one new table, view, service method change, migration.

**First step:** Add `hr_attendance_adjustments` table in `backend/src/db/schema/hr/attendance-regularizations.ts` mirroring the existing `hrAttendanceRegularizations` shape but keeping the original row immutable.

---

### P-02 — Policy-Evaluated Attendance Rules (eliminates F-18 one-representative-user bug)

**Problem:** `AttendanceSummaryService.representativeUserId = userIds[0]` — policy parameters (late threshold, half-day threshold, overtime threshold) are resolved from one arbitrarily chosen employee and applied to everyone in the org.

**Pattern:** Each attendance period evaluation resolves the applicable policy for that employee by `(orgId, employmentTypeId, locationId, effectiveDate)` — same lookup the leave engine already uses in `HrPoliciesService`. Cache per `(orgId, policyHash)`.

**Why it fits:** `hrPolicies` + `hrPolicyEngine` already exists; this is wiring a missing call.

**Rough cost:** S — 1 service method change in `attendance-summary.service.ts`, no schema change.

**First step:** Replace `representativeUserId` logic at `attendance-summary.service.ts:187` with `this.hrPoliciesService.evaluateForEmployee(orgId, userId, 'attendance', periodDate)`.

---

### P-03 — Effective-Date Overlap Exclusion Constraint (prevents two salaries on same day)

**Problem:** `hrEffectiveDatedChanges` has no `EXCLUDE USING gist` constraint. Two compensation records with overlapping `(employmentId, effectiveFrom, effectiveTo)` ranges can coexist — a payroll run picks one arbitrarily.

**Pattern:** Add `EXCLUDE USING gist (employment_id WITH =, daterange(effective_from, effective_to, '[)') WITH &&)` on the `hr_effective_dated_changes` table, scoped to `change_type = 'compensation'` via a partial index.

**Why it fits:** Postgres natively supports range exclusion via `btree_gist` extension (already installed for W4 schema-hardening).

**Rough cost:** S — one migration, no application code change.

**First step:** Add migration `ALTER TABLE hr_effective_dated_changes ADD CONSTRAINT no_overlap_comp EXCLUDE USING gist (...)`.

---

### P-04 — Encrypted-at-Rest PII Fields (closes P0 finding F-01 / F-02)

**Problem:** `encrypt()` returns plaintext when `ENCRYPTION_KEY` is unset (fails open). The canonical `hr_employee_sensitive_fields` table stores PAN, national ID, passport, bank details in cleartext; legacy `users` sensitive columns were encrypted but the replacement table is not.

**Pattern:** Fail-closed encryption helper: throw on missing key rather than returning plaintext. Apply at the DAL boundary in `HrSensitiveService` using the existing AES-256-GCM helper. Rotate key via double-encryption migration (encrypt existing rows batch by batch).

**Why it fits:** `common/security/secret-encryption.util.ts` is already the canonical helper. Four crypto helpers exist; consolidate to one and fail closed.

**Rough cost:** M — config validation change (S), `hr-sensitive.service.ts` write path (S), batch-encrypt migration for existing rows (M).

**First step:** Change `backend/src/config/env.validation.ts:53` from `optional()` to `required()` for `ENCRYPTION_KEY`.

---

### P-05 — DB-Effective-Dated Statutory Config (eliminates deploy-to-change F-03)

**Problem:** PF, ESI, PT, TDS slabs, gratuity rates are TypeScript constants in `statutory-registry.ts`. A budget change requires a code deploy.

**Pattern:** `statutory_rate_configs` table with `(country_code, rule_type, effective_from date, effective_to date, config jsonb NOT NULL)`. A service reads the row effective as of the payroll period end date. Seed with current values on migration; future changes are DB inserts, not code changes.

**Why it fits:** `hrEffectiveDatedChanges` already proves the pattern. The `global-compliance.ts` schema already has `hrComplianceRequirements` — extend it.

**Rough cost:** M — new table, migration with seed data, service refactor.

**First step:** Design schema in `backend/src/db/schema/hr/global-compliance.ts`, seed with current statutory-registry values, replace one statutory lookup in the payroll engine.

---

### P-06 — Timesheet ↔ HR Payroll Chain Bridge (closes Chain A/B disconnect, F-20)

**Problem:** Timesheets module produces approved hours (Chain A) that never reach the HR payroll inputs builder (Chain B). An employee can show 40 hours in timesheets and 0 payable hours in payroll.

**Pattern:** After timesheet period approval, emit an `hr.timesheets.period.approved` event via the outbox (once F-11 outbox stub is fixed). The `PayrollInputsBuildService` listens to this event and upserts an `hr_payroll_adjustments` record for timesheet-sourced hours. The build step reads these as normal payroll inputs.

**Why it fits:** `hr_payroll_adjustments` table exists; outbox pattern (`common/outbox`) is already in place; the only missing piece is the event and listener.

**Rough cost:** M — outbox event definition (S), listener (S), `PayrollInputsBuildService` consumer (M), schema field for `source='TIMESHEET'` (S).

**First step:** Fix the outbox `deliver()` stub at `common/outbox/outbox-publisher.service.ts:111` before any event-driven work can proceed.

---

### P-07 — Composite Tenant-Leading Unique Indexes on All HR Tables (closes F-05/A §9b)

**Problem:** `uniq_leave_balances_user_type_year` is not led by `orgId` — user in Org A can block Org B's leave seeding. Two other indexes share the same cross-tenant uniqueness gap.

**Pattern:** Every "unique per org" business key uses `uniqueIndex("uniq_<table>_org_<col>").on(orgId, col)`. Never `col.unique()` on a cross-tenant identifier.

**Why it fits:** 654 composite tenant FK indexes were already added in Wave 4 (MEMORY). These three uniqueness violations are a direct gap in that wave.

**Rough cost:** S — three migration entries, no application code change.

**First step:** Add migration to change `leaves.ts:27` `uniq_leave_balances_user_type_year` → `(orgId, userId, leaveTypeId, year)`.

---

### P-08 — Permission-Gate Every Ungated HR Page at the Server Layer

**Problem:** ~60 HR page.tsx files are `"use client"` with zero `requirePermission` — only session-checked. URL-navigating directly bypasses RBAC at the page layer. Backend `@RequirePermission` still gates data, but the page renders a shell then 403s on every hook call — 53% of HR query hooks fire without RBAC `enabled` gates (F-33), 403-spamming Neon.

**Pattern:** Every page.tsx that is not explicitly a universal-access self-service page is a thin Server Component calling `requirePermission()` and delegating to a feature client component. The `enabled` prop on every TanStack Query hook is set to `useCan("<exact endpoint permission key>")`.

**Why it fits:** Payroll pages already follow this pattern correctly — 20/23 use `requirePermission` server-side. HR simply needs to be brought to parity.

**Rough cost:** L — 60 pages to convert; systemic but mechanical.

**First step:** Start with the highest-risk ungated pages: `/hr/termination` (516 LOC, F-14 in F1 audit), `/hr/employees` (413 LOC), `/hr/onboarding/[userId]` (306 LOC).

---

### P-09 — Module Guard Global Registration (activates 114 inert `@RequireModule`)

**Problem:** 119 HR controllers carry `@RequireModule("hr")` but only 6 list `ModuleGuard` in `@UseGuards`. ModuleGuard is not a global `APP_GUARD`. 850+ HR endpoints have no module-enablement check.

**Pattern:** Register `ModuleGuard` as a global `APP_GUARD` in `app.module.ts` (same pattern as `PermissionGuard`). Add `@SkipModuleGuard()` decorator for the handful of endpoints that must be reachable before module enablement (e.g. `GET /hr/org-structure` for the org chart on the org settings page).

**Why it fits:** The guard, decorator, and service already exist — only the `APP_GUARD` registration is missing. Note the sequencing hazard documented in MEMORY: do not wire until `rename-projects-to-build-data.sql` has run.

**Rough cost:** S — one `app.module.ts` change; audit for routes needing `@SkipModuleGuard`.

**First step:** Add `{ provide: APP_GUARD, useClass: ModuleGuard }` in `app.module.ts`; run CI; fix any failing routes.

---

### P-10 — Private-Bucket-First Document Storage (closes public-URL P0, F-14)

**Problem:** Every uploaded HR document, payslip, and e-sign certificate is at a permanent public Cloudflare R2 URL with no TTL. Any third party with the URL can download an employee's PAN card, payslip, or offer letter indefinitely.

**Pattern:** Remove `NEXT_PUBLIC_R2_PUBLIC_URL` from the bucket configuration. Store only the R2 object key in the DB (not the public URL). Every download goes through `StorageService.getFileUrl(key, ttl)` which issues a short-lived (15 min) presigned URL. Extend `resolveFileOwnerOrgId` to include e-sign, payslip, and onboarding paths.

**Why it fits:** The presigned URL infrastructure already exists (`storage.service.ts:140`). The gaps are (1) the default public upload path and (2) the five missing table lookups in `resolveFileOwnerOrgId`.

**Rough cost:** M — config change (S), `resolveFileOwnerOrgId` extension (S), existing-rows migration (M — rewrite stored URLs to keys).

**First step:** Add `payslip_publications` to `resolveFileOwnerOrgId` lookup in `storage.controller.ts:182`.

---

### P-11 — Outbox-Backed Event Bus (unblocks automation, HR events, audit)

**Problem:** `outbox-publisher.service.ts:111` — `deliver()` is a `logger.debug` stub. Every HR event (leave approved, employee terminated, payroll locked, onboarding completed) is claimed and marked DELIVERED without actual dispatch. The automation engine, webhooks, and notifications all depend on real event delivery.

**Pattern:** Implement a real delivery method in `OutboxPublisherService.deliver()` that routes by `event_type` prefix to the registered channel: HTTP webhook delivery for external subscribers, internal in-process event bus for HR automations, Redis pub/sub for cross-service fan-out. Use the existing `outbox_messages` table (which already exists) with `status=DELIVERED` stamped only after confirmed delivery.

**Why it fits:** The outbox table, publisher, and poller all exist. Only `deliver()` is a stub.

**Rough cost:** M — implement one delivery method, add Redis pub/sub wiring, integrate with existing `HrWebhooksService`.

**First step:** Implement `deliver()` for the HTTP webhook case using the already-existing `HrWebhooksService.dispatchWebhook()`.

---

### P-12 — Semantic Date Columns (eliminates 15 text-date sorting bugs)

**Problem:** 15 semantic date columns are stored as `text` — `shifts.ts:28`, `leave-policies.ts:19`, `travel.ts:10`, `feedback.ts:11`, `salary-structure-templates.ts:16`, etc. Range queries, sorting, and comparisons are silently broken. An IST 09:15 check-in late-detection is broken for the same reason (F-19).

**Pattern:** Migrate all 15 columns to native Drizzle `date()` type. This is a non-breaking migration (add `date` column, backfill via `TO_DATE(old_col, 'YYYY-MM-DD')`, drop `text` column). Enforce in PR review: any `text("xxx_date")` column fails the schema lint.

**Why it fits:** `hrEmployments.joiningDate` is already a native `date` — this is pattern parity.

**Rough cost:** S per column; M total for 15 columns as a single migration.

**First step:** Fix `employeeShiftAssignments.effectiveFrom/effectiveTo` in `shifts.ts:28-29` as the most operationally impactful.

---

## 3. Deliberate Non-Goals

### NG-01 — Native Mobile App (iOS / Android)
Building a native mobile app requires a separate runtime (React Native or Flutter), separate release pipeline, App Store/Play Store accounts, and push notification infrastructure outside the web stack. The current platform is web-only with responsive design. **Decision:** Build progressive-web-app (PWA) features — service worker, manifest, push notifications — before committing to a native app. A native app is a company-stage decision, not an HRMS feature decision.

### NG-02 — Built-in Payroll Filing to Government Portals (EPFO/ESIC/TDS)
Direct government portal e-filing requires registering as an ESP (e-Filing Service Provider) with EPFO/ESIC, maintaining digital signature certificates, and keeping pace with portal API changes. This is a regulated activity. **Decision:** Generate the filing-ready files (ECR for PF, monthly return for ESI, Form 24Q for TDS) — then hand off to an accredited filing partner or the operator's CA. Never claim automated portal filing without the legal infrastructure.

### NG-03 — Employer of Record (EOR) / Global Payroll for Foreign Jurisdictions
Running payroll in 185 countries (Rippling/Deel pattern) requires per-country legal entity registration, local tax authority relationships, and regulatory compliance in each jurisdiction. **Decision:** Scope statutory compliance to India first, then tier-2 expansion (UAE, Singapore, UK) through a licensed EOR partner integration via Composio, not native implementation.

### NG-04 — ABAC / DSL-Based Policy Language
A full attribute-based policy DSL (Rego/Cedar/OpenFGA) adds implementation complexity without clear benefit at our scale. The existing `hrPolicies` engine with evaluatable rules and the scope system already covers 90% of HR policy needs. **Decision:** Extend the current `HrPoliciesService` evaluation model; do not introduce a new DSL. (North-star rule 7 explicitly rejects ABAC DSL.)

### NG-05 — Real-Time Biometric Device SDK
Native biometric vendor SDK integration (ZKTeco, eSSL, Suprema) requires per-vendor embedded C/C++ SDKs or proprietary TCP/IP protocols. **Decision:** Support biometric data import via standardised CSV/API push from the device vendor's management software. The `hr_biometric_devices` schema already supports this pattern. Never bundle a vendor SDK.

### NG-06 — LMS Content Authoring (SCORM/xAPI Runtime)
Full SCORM/xAPI content player requires a significant runtime and licensing. **Decision:** Build course/learning-path management (create courses, assign, track completion, issue certificates) with video URL embedding and PDF attachments. Link to external LMS (Moodle/TalentLMS/Udemy Business) via Composio for orgs that need a full content authoring runtime.

### NG-07 — Recruitment Job Board Aggregator (Direct API Contracts)
Direct API contracts with LinkedIn, Naukri, Indeed, Shine require per-platform approval, commercial agreements, and ongoing API maintenance. **Decision:** Route job board postings via Composio's existing job-board connectors. Do not build or maintain direct API clients for job boards.

---

## 4. Canonical HR Vocabulary

### Decision: code names are authoritative; docs align to code

The code uses `hrPeople`, `hrEmployments` — these win. Documents and specs are being updated to match.

| Concept | Term we use | Retiring | Rationale |
|---|---|---|---|
| A human who may or may not have a login | **person** (`hrPeople`) | employee (too narrow — excludes contractors, pre-hires, alumni), worker, candidate | A person is a human in the tenant's scope regardless of login or contract status |
| A dated contract record | **employment** (`hrEmployments`) | job, role assignment, contract (too specific), engagement | An employment record has a lifecycle status and may be one of several concurrent records for one person |
| A person who is currently active under an employment | **employee** | staff, headcount, associate | "Employee" is the UI-facing label for an `hrPerson` with an active `hrEmployment.lifecycleStatus IN (ACTIVE, PROBATION, CONFIRMED)` |
| Pre-hire person (offer accepted, not yet joined) | **pre-joinee** | new hire, pending employee, applicant | Matches `lifecycleStatus = PRE_JOINING` |
| Organisation unit (department or team) | **org unit** (`orgUnits` — north-star target) / **department** (current code `hr_departments`) | division, group, business unit, cost centre | Until north-star `org_units` migration is complete, keep `department` for UI labels; use `orgUnit` in new code |
| Physical or logical location | **location** | office, branch, site, workspace | `hrLocations` is the current table; `branch` is a distinct concept for legal/banking branches |
| The person an employee reports to | **manager** (primary) / **functional manager** (dotted-line) | supervisor, reporting manager, line manager, HOD | Two distinct roles, not one. "HOD" retired as ambiguous |
| A person applying for a job | **candidate** | applicant, prospect, talent | Matches `candidateApplications` schema |
| A rule governing HR behaviour | **policy** (`hrPolicies`) | scheme, plan (except for benefits plans), rule | "Plan" is reserved for benefits plan (`hrBenefitPlans`) only |
| A leave rule set | **leave policy** (`hrLeavePolicy`) | leave plan, leave scheme, leave type definition | Leave type is a sub-concept of leave policy; both exist and are distinct |
| A member with no HR record | **org member** (`organizationMembers`) | user (avoid for people; use for login identity only), employee | A login identity is a `user`; a person inside a tenant is an `org member`; HR enriches them to a `person` |
| A worker not on the payroll | **contractor** / **contingent worker** | freelancer (retired — confusing with Rippling freelancer context), consultant (keep for UI label only) | `hrEmployments.employmentType = CONTRACTOR` |

---

## 5. Top 15 Gaps Ranked

| Rank | Gap | Why it matters commercially | Effort | Depends on |
|---|---|---|---|---|
| 1 | **Sensitive-field encryption fails open (F-01/F-02)** — PAN, passport, bank IFSC stored in cleartext in the canonical sensitive table | A single DB credential leak exposes every employee's financial identity. Unacceptable for any Indian employer after DPDP 2023. Sales to enterprise will stall on any security questionnaire. | S | `env.validation.ts` config fix first |
| 2 | **Statutory config hardcoded (F-03/F-04)** — PF/ESI/PT/TDS rates are TypeScript constants; a Budget change is a deploy | Statutory compliance is the primary sales trigger for Indian HR software (greytHR/Keka win on this). Any miscalculation is a legal liability. Cannot claim compliance-ready without DB-effective-dated statutory config. | M | New `statutory_rate_configs` schema table |
| 3 | **Attendance policy applied from one arbitrary user (F-18/F-19)** — late/absent/overtime thresholds pulled from `userIds[0]`; IST timezone late-detection is broken | Directly corrupts LOP (Loss of Pay) calculation for every employee except the first in the list. Wrong payroll deductions = employee complaints + legal exposure. | S | `HrPoliciesService.evaluateForEmployee()` |
| 4 | **Timesheet ↔ HR payroll chain disconnected (F-20)** — timesheets and HR payroll inputs are two isolated systems | An employee can clock 40 hours in timesheets and receive zero payable hours in payroll. Makes the timesheet module commercially useless for any org that also uses internal payroll. | M | Outbox fix (gap 8) first |
| 5 | **HR documents at permanent public URLs (F-14 / Lane M gap 1+2)** — payslips, ID proofs, offer letters are at unauthenticated public R2 URLs with no TTL | A shared link, log leak, or misconfigured CDN exposes every uploaded HR document permanently. DPDP violation. Blocks enterprise sales. | M | `resolveFileOwnerOrgId` extension + R2 config change |
| 6 | **53% of HR query hooks fire without RBAC `enabled` gate (F-33)** — 157 of 298 hooks 403-spam Neon on every page mount | 403-spam saturates DB connections, inflates Neon compute cost, and masks real errors in logs. Additionally ~60 HR page.tsx files have zero server-side permission gate. | L | Systematic — must be done page-by-page |
| 7 | **LMS / courses / certifications absent** — no learning module in backend or frontend | Keka, Zoho People, Darwinbox all ship LMS. Any org that asks "can we assign mandatory compliance training?" gets a NO. Second most-requested HR feature after payroll for Indian SMBs. | L | Skills schema exists; need courses + enrollments tables |
| 8 | **Outbox `deliver()` is a stub (F-11)** — all HR events are claimed and marked DELIVERED without dispatch | HR automations, webhooks, and notification engine all depend on real event delivery. Currently none of them fire. Makes the automation engine and webhooks features inoperable. | M | None — self-contained |
| 9 | **Dotted-line / functional manager absent** — `hrReportingLines` has no secondary-manager support | Matrix organisations (common in engineering, sales, consulting) cannot be modelled. Required for 360 reviews, project assignments, and skip-level approvals. Darwinbox and Workday both support this. | S | `hrReportingLines` schema + service change |
| 10 | **114 inert `@RequireModule("hr")` decorators (F-17)** — module guard not a global APP_GUARD | A tenant with HR module disabled can still hit every HR endpoint. Module billing enforcing and tenant isolation both fail. | S | Sequencing hazard: must wait for `rename-projects-to-build-data.sql` (see MEMORY) |
| 11 | **Raw attendance punch is mutable (F-21)** — regularization overwrites `checkIn`/`checkOut` in place | No forensic audit trail for attendance disputes. Cannot reconstruct what an employee actually clocked. Required for any employment tribunal defence. | M | New `hr_attendance_adjustments` table |
| 12 | **Cost centres / profit centres absent** — no cost-centre table in HR schema | Finance teams need to allocate headcount cost to GL cost centres. Without it, workforce-cost analytics (`/hr/workforce-cost`) cannot produce a meaningful number. | S | Schema + org-structure service |
| 13 | **15 semantic date columns stored as text** — shifts, leave policies, travel dates, feedback cycles stored as `text` | Range queries, sorting, and comparisons are silently broken. Late-detection for IST timezones is broken (F-19) because of this. Cross-month leave approval queries return wrong results. | S | Migration batch; no service-layer changes |
| 14 | **No career ladders / internal mobility feature** — no career-ladder or role-progression schema | Employees and managers cannot plan promotions within the platform. A key retention driver that Keka and Darwinbox use as differentiators. `hrSuccessionPlans` exists but career path is absent. | M | Depends on job-architecture tables (job grades, level mappings) |
| 15 | **Auto-filing to EPFO/ESIC/TDS portals absent** — generates filings but does not submit them | greytHR and Keka win enterprise HR deals on "one-click payroll close + auto-filing". Without this, an HR admin must manually upload ECR files to the EPFO portal every month. | L | DB-effective-dated statutory config (gap 2) first; then Composio connector |

---

## 6. External Sources

- Darwinbox feature overview: [Top HRMS Modules in 2026 | Darwinbox](https://darwinbox.com/en-us/blog/top-hr-modules) [WEB]
- Keka HR features: [Keka HR Software – LLM Information Page](https://keka.com/us/llm-info) [WEB]
- greytHR features: [Cloud-based HRMS and Payroll Software in India — greytHR](https://www.greythr.com/) [WEB]
- greytHR statutory compliance: [HR Statutory Compliance Checklist in India 2025–2026](https://www.greythr.com/guides/hr-statutory-compliance-checklist-in-india/) [WEB]
- Zoho People features: [Zoho People Features | HR Software Features](https://www.zoho.com/en-us/people/features.html) [WEB]
- Zoho People 2025 review: [Zoho People in 2025: A year in review](https://www.zoho.com/blog/people/zoho-people-in-2025-a-year-in-review.html) [WEB]
- BambooHR vs Rippling vs Workday comparison: [Rippling vs. Workday vs. BambooHR: The Mid-Market Decision Guide 2026](https://www.thepeoplestack.co/post/rippling-vs-workday-vs-bamboohr-decision-guide-2026) [WEB]
- Rippling global HR: [Workday HCM Competitors & Alternatives in 2025 | Rippling](https://www.rippling.com/blog/workday-competitors) [WEB]
