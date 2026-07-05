# StreamlineOS PRD (v1 · Implementation-Grade)
## HRMS · ATS · Employee Lifecycle (Onboarding → Employment → Offboarding)

**Owner (PM)**: StreamlineOS Platform  
**Owner (Eng)**: People / HRMS  
**Status**: Implementation-ready (grounded in current repo)  
**Last updated**: 2026-07-01  
**Scope**: Frontend `frontend/` + Backend `backend/` (NestJS + Drizzle)  

## UI/UX source of truth

- **Source of truth**: [PRD-ui-ux-system.md](./PRD-ui-ux-system.md)
- **Canonical UI references**: `/signin` and `/signup`

---

## 0) Canonical implementation prompt (paste into Claude Code)

> Implement and harden StreamlineOS HRMS/ATS/Lifecycle end-to-end as described in `PRD-hrms.md`. Treat `CLAUDE.md` as constitution. Backend owns all business logic + DB schema + migrations; frontend is UI + TanStack Query hooks only; do **not** add frontend `app/api/**` business endpoints.  
>
> Ground work in existing routes and components: `PAGES.md` and `frontend/app/(authenticated)/hr/**` (plus `/onboarding` and `frontend/features/hr/**`). Match current query keys in `frontend/lib/query-keys.ts` and client routing in `frontend/lib/api-client.ts`.  
>
> Security: enforce tenant + object-level authorization on every backend read/write; apply module gating via `@RequireModule("hr")` and permission gating via `PermissionGuard` + `@RequirePermission("...")`. Audit log all sensitive actions (PII access, approvals, payroll actions, offer actions, termination).  
>
> Reliability: all reminders and outbound comms must be retryable + observable (cron + automation + notifications + email). Ship e2e controller specs for HR critical flows (cross-tenant isolation, allow/deny per permission/scope, idempotency on send/reminders).  

---

## 1) Product intent (why this exists)

HRMS is the system-of-record for people data, employee experience, and compliance. ATS + lifecycle workflows must feel “enterprise-ready”: fast, auditable, tenant-safe, permissioned, and automated (without hiding state changes).

StreamlineOS differentiates by integrating:
- **HR data + approvals + communications + tasks** in one place (no “email-only” workflows).
- **Module gating** (plan-based) + fine-grained RBAC (role + scoped permissions).
- **Automation hooks** (events emitted for workflow rules).
- Shared platform primitives: **Notifications**, **Tasks**, **Workflows**, **Audit log**, **Email**.

---

## 2) What must be true after shipping (outcomes)

### 2.1 User outcomes
- HR can onboard, manage, and offboard employees without spreadsheets.
- Managers can approve leave/time/requests and run their team workflows.
- Employees have self-service: attendance, leave requests, payslips, onboarding tasks and documents.
- Recruiting runs in a structured pipeline with SLAs, scorecards, offer workflow, and comms.

### 2.2 Engineering outcomes
- Every HR endpoint is tenant-scoped and permission-gated in backend.
- Module gating is consistent across HR endpoints and UI.
- All key write actions invalidate relevant caches (backend + TanStack Query).
- Scheduled reminders (offers, interviews, onboarding, expiries) are reliable and observable.
- Critical flows have backend e2e specs (success + deny + cross-tenant).

---

## 3) Non-goals (explicitly excluded)

- Frontend `app/api/**` business endpoints (auth-bridge only).
- Full enterprise SSO/SCIM provisioning for HR (design-compatible only).
- Rewriting the design system (follow existing tokens; improve UI page-by-page).
- “Warehouse analytics” (use Postgres + existing reporting patterns).

---

## 4) Repo-grounded constraints (must be followed)

- **Frontend ↔ backend boundary**: frontend calls backend via `apiClient` (`frontend/lib/api-client.ts`) or server-to-server via `serverApiClient` (`frontend/lib/api/server-client.ts`).
- **RBAC**: permission catalog in `backend/src/modules/rbac/permissions.constants.ts`; backend enforcement via `PermissionGuard` + `@RequirePermission`.
- **Module gating**: module enablement enforced via `@RequireModule("hr")` and `ModuleGuard` (entitlements backed by `backend/src/modules/access/entitlements.service.ts`).
- **Backend schema**: Drizzle schema lives under `backend/src/db/schema/hr/**`. Frontend does **not** own business tables.
- **Caching**: frontend uses TanStack Query keys in `frontend/lib/query-keys.ts`; backend uses Redis caching via `AccessService` and shared cache utilities (where present). Invalidate on mutation.

---

## 5) Domain map (modules and how they relate)

### 5.1 HRMS domains (current codebase)
- **Directory / Org**: employees, departments, org chart, reporting lines  
  - Frontend hooks: `frontend/hooks/api/hr/employees.ts`  
  - Backend: `backend/src/modules/hr-directory/employees.controller.ts`  
  - Schema: `backend/src/db/schema/hr/employees.ts`
- **Onboarding (employee lifecycle start)**: user onboarding tasks, templates, doc collection, reminders  
  - Frontend routes: `frontend/app/(authenticated)/onboarding/**` and `frontend/app/(authenticated)/hr/onboarding/**`  
  - Backend: `backend/src/modules/onboarding/onboarding.controller.ts` and `backend/src/modules/hr-lifecycle/onboarding-views.controller.ts`  
  - Schema: `backend/src/db/schema/hr/offboarding.ts` (contains onboarding/doc templates/tasks)
- **Time & Attendance**: check-in/out, breaks, logs, holidays, WFH, roster/shift tooling  
  - Backend: `backend/src/modules/hr-time/attendance.controller.ts`  
  - Schema: `backend/src/db/schema/hr/attendance.ts`
- **Leaves**: policies, balances, requests, approvals, analytics, calendar  
  - Backend: `backend/src/modules/hr-time/leaves.controller.ts`  
  - Schema: `backend/src/db/schema/hr/leaves.ts`
- **Payroll**: payroll runs, payslips, salary structures, approvals, bank files  
  - Backend: `backend/src/modules/hr-payroll/payrolls.controller.ts`  
  - Schema: `backend/src/db/schema/hr/payroll.ts`
- **Performance**: reviews, cycles, goals, KPIs/competencies, feedback  
  - Frontend routes: `frontend/app/(authenticated)/hr/performance/**`, `.../hr/goals`, `.../hr/kpis`, `.../hr/feedback`  
  - Schema: `backend/src/db/schema/hr/performance.ts`
- **Documents & Comms**: documents, rich docs, announcements, signatures, policy acknowledgements  
  - Frontend routes: `frontend/app/(authenticated)/hr/documents`, `.../hr/announcements`, `.../hr/signatures`  
  - Schema: `backend/src/db/schema/hr/documents.ts` and `backend/src/db/schema/hr/offboarding.ts` (audit logs)
- **Recruitment (ATS)**: requisitions, job postings, pipeline, interviews, scorecards, offer templates, automations, inbox  
  - Backend: `backend/src/modules/hr-recruitment/**` (multiple controllers)  
  - Schema: `backend/src/db/schema/hr/hiring.ts`
- **Offboarding**: resignations, exit checklists, termination, FNF, asset returns  
  - Backend: `backend/src/modules/hr-lifecycle/exit.controller.ts` and HR payroll schema tables  
  - Schema: `backend/src/db/schema/hr/offboarding.ts` and `backend/src/db/schema/hr/payroll.ts`

### 5.2 Cross-cutting platform services used by HR
- **Access / Entitlements**: `backend/src/modules/access/*`
- **Email**: `backend/src/modules/email/email.service.ts`
- **Notifications**: `backend/src/modules/notifications/notifications.service.ts`
- **Cron / Scheduler**: `backend/src/modules/cron/cron-hr.service.ts`, `cron-recruitment.service.ts`, `cron-holiday.service.ts`

---

## 6) Personas, scopes, and “who can do what”

> Source of truth is backend RBAC + module gating. Frontend checks (`useCan`) are UX only.

### 6.1 Personas
- **Org Owner / CEO**: full access (bypass in `AccessService`).
- **HR Admin**: manage employee data, onboarding, docs, payroll runs, recruitment operations, performance cycles.
- **Branch HR / Branch Manager**: limited to branch/team scope (where data scope applies).
- **Manager**: approvals + team management (leave approvals, interview feedback, performance actions).
- **Employee (self-service)**: own onboarding tasks, own leaves, attendance, payslips, view org announcements/docs as granted.

### 6.2 Access enforcement primitives
- **Permission gating**: `PermissionGuard` reads `@RequirePermission("module:resource:action")`.
- **Data scope** (where enabled): `applyScope` in backend (see `backend/src/modules/access/apply-scope.ts`).
- **Module gating**: `@RequireModule("hr")` + entitlements.

### 6.3 Required “sensitive action” audit events (must exist)
At minimum, record:
- **PII reads**: employee profile view/export; payslip download; tax documents download.
- **PII writes**: employee updates; bank/payroll details updates; document uploads.
- **Approvals**: leave approve/reject; payroll approve/mark paid; requisition approval; offer approve/reject; termination/exit approvals.
- **Outbound comms**: candidate emails, offer sends, reminder sends, signature request sends.

Implementation note: use existing “audit logs” tables where present (`documentAuditLogs` in `backend/src/db/schema/hr/offboarding.ts`) and/or extend via a dedicated audit table (backend-only).

---

## 7) Backend data model (Drizzle) — authoritative schema surfaces

> This section enumerates the schema surfaces that exist today (files below) and defines how features must use them.

### 7.1 Directory / employees
- **Schema**: `backend/src/db/schema/hr/employees.ts`
- **Tables** (observed): `departments`, `departmentMembers`  
  - Department membership must be org-scoped and indexed by `(orgId, departmentId, userId)` (enforce in schema/migrations if missing).

### 7.2 Attendance / holidays / devices
- **Schema**: `backend/src/db/schema/hr/attendance.ts`
- **Tables** (observed): `attendance`, `holidays`, `wfhRequests`, `helpdeskTickets`, `employeeDevices`
- **Integrity rules**
  - Every list query must filter by `orgId`.
  - Attendance uniqueness: at most one check-in record per user per day (or per shift) — enforce via unique index.

### 7.3 Leaves
- **Schema**: `backend/src/db/schema/hr/leaves.ts`
- **Tables** (observed): `leaveTypes`, `leaveBalances`, `leaveRequests`, `leaveBlackoutDates`
- **Integrity rules**
  - Leave balances must be updated transactionally alongside approvals/cancellations.
  - Prevent overlapping approved leaves for same user/date range.

### 7.4 Payroll + offboarding financials
- **Schema**: `backend/src/db/schema/hr/payroll.ts`
- **Tables** (observed): `payrolls`, `salaryStructures`, `expenseCategories`, `expenses`, `reimbursements`, `salaryLoans`, `bonuses`, `fnfSettlements`, `assetReturns`
- **Integrity rules**
  - Payroll run generation must be idempotent per `(orgId, month, year, branch?)`.
  - Payslip downloads must be authorized (employee owns payslip OR HR permission).

### 7.5 Performance
- **Schema**: `backend/src/db/schema/hr/performance.ts`
- **Tables** (observed): review cycles + reviews, 1:1s, goals + key results, PIPs, pulse surveys + responses, feedback requests, recognitions, skills/assessments
- **Integrity rules**
  - Review visibility must respect org + data scope (manager/team).

### 7.6 Documents / templates / comms
- **Schema**: `backend/src/db/schema/hr/documents.ts`
- **Tables** (observed): `richDocuments`, `documents`, `handbookVersions`, `policyAcknowledgments`, `emailTemplates`, plus other enablement artifacts.

### 7.7 ATS (recruitment)
- **Schema**: `backend/src/db/schema/hr/hiring.ts`
- **Tables** (observed): job postings, candidates, applications, interviews, scorecards, booking links, requisitions, referrals, calibration
- **Integrity rules**
  - Candidate stage transitions must be auditable and permissioned.
  - Interview scheduling must prevent double-booking for interviewer calendars (where calendar integration exists).

### 7.8 Lifecycle (onboarding + offboarding)
- **Schema**: `backend/src/db/schema/hr/offboarding.ts` (contains onboarding + document templates + audit + resignations/terminations)
- **Tables** (observed): `documentTemplates`, `candidateDocuments`, `onboardingTemplates`, `onboardingTasks`, `onboardingDocuments`, `documentAuditLogs`, `resignations`, `exitChecklists`, `terminations`, plus related template/version tables
- **Integrity rules**
  - Onboarding tasks must be assigned, tracked, and completed with immutable timestamps.
  - Termination and resignation flows must track approvals and final state changes.

---

## 8) Backend API surface (NestJS) — authoritative endpoints

> This section is grounded in current controllers. Where a UI needs a capability that isn’t implemented, the change belongs in backend controllers/services and must be permissioned + tenant-scoped.

### 8.1 Directory — employees
- **Controller**: `backend/src/modules/hr-directory/employees.controller.ts`
- **Representative endpoints** (as referenced by frontend hooks and server pages)
  - `GET /hr/departments`
  - `POST /hr/departments`
  - `GET /hr/employees`
  - `GET /hr/employees/:employeeId`
  - `PATCH /hr/employees/:employeeId` / profile update endpoints (as implemented)
  - `POST /hr/employees/onboard`
  - `GET /hr/org-chart`
  - `GET /hr/employees/stats`
  - `GET /hr/employees/availability`
  - `GET /hr/employees/find-expert`
  - `GET /hr/employees/:employeeId/reports-to-me`
  - `GET /hr/employees/:employeeId/manager-scorecard`

### 8.2 Attendance
- **Controller**: `backend/src/modules/hr-time/attendance.controller.ts`
- **Representative endpoints** (presence tracking + logs + holidays)
  - `POST /hr/attendance/check-in`, `POST /hr/attendance/check-out`
  - `POST /hr/attendance/break/start`, `POST /hr/attendance/break/end`
  - `GET /hr/attendance/status`, `GET /hr/attendance/logs`
  - `GET /hr/attendance/monthly`, `GET /hr/attendance/heatmap`
  - `GET /hr/attendance/team-status`
  - Holidays endpoints as implemented under `hr-time` module

### 8.3 Leaves
- **Controller**: `backend/src/modules/hr-time/leaves.controller.ts`
- **Representative endpoints**
  - `POST /hr/leaves/request`
  - `POST /hr/leaves/:leaveId/cancel`
  - `POST /hr/leaves/:leaveId/approve`
  - `POST /hr/leaves/:leaveId/reject`
  - `GET /hr/leaves/approvals`
  - `GET /hr/leaves/my-requests`
  - `GET /hr/leaves/this-week`
  - `GET /hr/leaves/analytics`
  - `GET /hr/leave-calendar`
  - `GET /hr/holidays/year`, `GET /hr/holidays/calendar`

### 8.4 Payroll
- **Controller**: `backend/src/modules/hr-payroll/payrolls.controller.ts`
- **Representative endpoints**
  - `GET /hr/payrolls`
  - `POST /hr/payrolls/generate` (bulk)
  - `POST /hr/payslips/generate` (single)
  - `POST /hr/payrolls/:payrollId/approve`
  - `POST /hr/payrolls/:payrollId/mark-paid`
  - `GET /hr/payslips/me` (employee self-service)
  - `GET /hr/payslips/:payslipId/download`
  - Salary structure endpoints as implemented under `/hr/salary-structures`

### 8.5 ATS — recruitment controllers
- **Controllers**: `backend/src/modules/hr-recruitment/*`
  - `recruitment-jobs.controller.ts`
  - `recruitment-candidates.controller.ts`
  - `recruitment-pipeline.controller.ts`
  - `recruitment-offers.controller.ts`
  - `recruitment-requisitions.controller.ts`
- **Representative endpoints** (grounded in frontend hooks and routes)
  - Job postings: `GET/POST/PATCH/DELETE /hr/recruitment/jobs`, publish, share links, boards, portal sync
  - Pipeline: `GET /hr/recruitment/pipeline`, stage updates for candidates
  - Interviews: `GET /hr/recruitment/interviews`, create/update schedule, feedback submission (as implemented)
  - Requisitions: `GET/POST /hr/recruitment/requisitions`, submit/approve/reject
  - Offers: `GET/POST /hr/recruitment/candidates/:candidateId/offers`, submit/approve/reject

### 8.6 Lifecycle — onboarding views + exit/offboarding
- **Controllers**
  - `backend/src/modules/onboarding/onboarding.controller.ts` (employee onboarding system)
  - `backend/src/modules/hr-lifecycle/onboarding-views.controller.ts` (HR-facing onboarding docs views)
  - `backend/src/modules/hr-lifecycle/exit.controller.ts` (resignations, exit workflows)
- **Representative endpoints**
  - Onboarding: `GET /onboarding`, `POST /onboarding/initiate`, `GET /onboarding/:userId`, `PATCH /onboarding/tasks/:taskId`
  - HR onboarding docs: `/hr/onboarding-docs/**`
  - Exit: `/hr/exit/**` (create, review, withdraw, analytics, experience letters)

---

## 9) Frontend routing map (where users click)

> Canonical high-level route inventory is `PAGES.md`. This PRD focuses on HR routes under:
>- `frontend/app/(authenticated)/hr/**`
>- `frontend/app/(authenticated)/onboarding/**`

### 9.1 Shared frontend primitives and conventions (used by HR pages)
- **Permissions on client**: `useCan(...)` (`frontend/hooks/api/access.ts`)
- **Permissions on server pages**: `requirePermission(...)` (`frontend/lib/rbac/require-permission.ts`)
- **Server-side backend calls**: `serverApiClient` (`frontend/lib/api/server-client.ts`)
- **Query keys**: `frontend/lib/query-keys.ts` (must match invalidation and stale times)
- **API client**: `apiClient` (`frontend/lib/api-client.ts`) routes requests to backend for migrated prefixes (includes many `/hr/**` and `/onboarding`).

---

## 10) Page-by-page PRD (click-by-click, component-by-component)

> Each subsection ties a route to its page file, major components, hooks/endpoints, and expected interactions.

### 10.1 HR landing dashboard
- **Route**: `/hr`
- **Page**: `frontend/app/(authenticated)/hr/page.tsx`
- **Primary components** (observed)
  - `HrDashboardOverview`
  - `HrFilterBar`
  - `HrEmployeeTable`
- **Hooks**: `useHrEmployees`, `useTerminateEmployee` (`frontend/hooks/api/hr/employees.ts`)
- **Click-by-click**
  - **Landing**: show dashboard KPIs + employee list preview (or full list per current implementation).
  - **Filter**: typing in filters updates query params → refetch employees list.
  - **Row actions**: view employee → navigates to `/hr/employees/[employeeId]`; terminate action opens confirmation + triggers backend mutation.
  - **States**: skeleton on first load, empty state when no employees, error state with retry.

### 10.2 Employee directory
- **Route**: `/hr/employees`
- **Page**: `frontend/app/(authenticated)/hr/employees/page.tsx`
- **Primary components**
  - `EmployeesFilters`
  - `EmployeeCard` (grid)
  - `EmployeeRow` (table/list)
- **Hooks**: `useHrEmployees`, `useHrDepartments`
- **Click-by-click**
  - Toggle **grid/list view**.
  - Filter by department, search, status.
  - Click employee card/row → details page.
  - Primary CTA: “Add employee” / “Onboard employee” (drives `useOnboardEmployee` flow where implemented).

### 10.3 Employee details
- **Route**: `/hr/employees/[employeeId]`
- **Page**: `frontend/app/(authenticated)/hr/employees/[employeeId]/page.tsx`
- **Server behavior** (grounded in code)
  - Calls `requirePermission("hr:employees:view")`.
  - Fetches employee via `serverApiClient.get("/hr/employees/:employeeId")`.
  - Renders `EmployeeDetailsView` (route-local component).
- **Click-by-click** (expected in `EmployeeDetailsView`)
  - Tabs or sections: profile, payroll/bank (if permitted), documents, projects/tickets, reporting lines.
  - Edits open sheets/forms; saves call backend; success toast; invalidate employees list + employee detail query.

### 10.4 HR onboarding (HR-managed)
- **Route**: `/hr/onboarding`
- **Page**: `frontend/app/(authenticated)/hr/onboarding/page.tsx`
- **Primary components**
  - `OnboardingList`
  - `OnboardingWizard`
  - `HrDocumentsTab`
- **Hooks**: onboarding status and initiation (`frontend/hooks/api/hr/onboarding.ts`)
- **Click-by-click**
  - HR selects employee to onboard → opens wizard.
  - Wizard steps: assign template/steps, request docs, set due dates.
  - Submit triggers backend `POST /onboarding/initiate` and/or HR doc endpoints.
  - HR can view onboarding docs collected and review/approve.

### 10.5 Employee onboarding (self-service wizard)
- **Route**: `/onboarding`
- **Pages**: `frontend/app/(authenticated)/onboarding/page.tsx` (+ subcomponents)
- **Primary components**
  - `PersonalInfoTab`, `BankDetailsTab`, `DocumentsTab`, `ReviewTab`
- **Hooks**: `useUserOnboarding`, `useCompleteOnboardingTask`, `useInitiateOnboarding`
- **Click-by-click**
  - Employee completes personal info → save.
  - Adds bank details → save.
  - Uploads documents → save.
  - Review + submit finalizes onboarding (backend marks tasks, sends notifications where configured).
  - Reminders: see §12 (scheduler).

### 10.6 Recruitment hub
- **Route**: `/hr/recruitment`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/page.tsx`
- **Primary components** (observed)
  - Stats / funnel / analytics panels
  - Open positions list
  - Upcoming interviews list
- **Hooks**: `useRecruitmentStats`, `useJobPostings`, `useInterviews`, `useRecruitmentAnalytics`
- **Click-by-click**
  - Click open position → job posting details.
  - Click upcoming interview → interview details/schedule.
  - CTAs: create job posting, create requisition, view pipeline.

### 10.7 Recruitment pipeline (Kanban)
- **Route**: `/hr/recruitment/pipeline`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/pipeline/page.tsx`
- **Primary component**: `PipelineKanban`
- **Hooks**: `useAtsKanban`, `useUpdateCandidateStage`
- **Click-by-click**
  - Drag candidate card between stages → mutation fires.
  - Stage change triggers: audit log + optional automation event + notifications.
  - Filters: by job, recruiter, source, stage.

### 10.8 Interviews (list/calendar + feedback + scheduling)
- **Route**: `/hr/recruitment/interviews`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/interviews/page.tsx`
- **Primary components**
  - `BigCalendarWrapper` (calendar view)
  - `InterviewFormSheet` (schedule/edit)
  - `InterviewFeedbackForm`
- **Hooks**: `useInterviews` (+ scheduling hooks where implemented)
- **Click-by-click**
  - Toggle list vs calendar.
  - Create interview → open sheet, choose candidate, interviewers, time, location/link.
  - Submit feedback → scorecard-style form; save; updates candidate state if configured.

### 10.9 Requisitions (approval workflow)
- **Route**: `/hr/recruitment/requisitions`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/requisitions/page.tsx`
- **Hooks**: `useJobRequisitions`, `useCreateJobRequisition`, `useSubmitRequisition`, `useApproveRequisition`, `useRejectRequisition`
- **Click-by-click**
  - Create requisition → form; save draft.
  - Submit → routes to approver queue (manager/HR/CEO depending on org policy).
  - Approver approves/rejects → notification to requester; audit log.

### 10.10 Offer templates + offer PDFs
- **Route**: `/hr/recruitment/offer-templates`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/offer-templates/page.tsx`
- **Hooks**: `useOfferTemplates`, CRUD hooks, `useGenerateOfferPdf`
- **Click-by-click**
  - Create/edit template → rich editor; versioning recommended.
  - Generate PDF for candidate offer → backend generates and stores; HR downloads/sends.

### 10.11 Recruitment email sequences
- **Route**: `/hr/recruitment/email-sequences`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/email-sequences/page.tsx`
- **Hooks**: `useEmailSequences`, CRUD hooks
- **Click-by-click**
  - Define sequence steps (delay + template + triggers).
  - Enable/disable sequence.
  - Triggered by events: application received, moved to stage, interview scheduled, offer sent.

### 10.12 Recruitment automations
- **Route**: `/hr/recruitment/automations`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/automations/page.tsx`
- **Hooks**: `useAutomations`, `useCreateAutomation`, `useToggleAutomation`, `useDeleteAutomation`
- **Click-by-click**
  - Create rule: event → conditions → actions (notify, email, task, webhook where supported).
  - Enable/disable and observe last-run status.

### 10.13 Booking links (self-scheduling)
- **Route**: `/hr/recruitment/booking-links`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/booking-links/page.tsx`
- **Hooks**: `useHrBookingLinks`, `useRevokeBookingLink`
- **Click-by-click**
  - Create link for candidate → share.
  - Candidate books slot → interview created; notify interviewer.
  - Revoke link to stop bookings.

### 10.14 Scorecard templates + question bank
- **Routes**
  - `/hr/recruitment/scorecard-templates` (`.../scorecard-templates/page.tsx`)
  - `/hr/recruitment/question-bank` (`.../question-bank/page.tsx`)
- **Hooks**: scorecard CRUD; interview question list/delete; job postings list
- **Click-by-click**
  - Create template per role; attach competencies + ratings.
  - Maintain question bank per job; allow reuse across interviews.

### 10.15 Candidate inbox (messaging)
- **Route**: `/hr/recruitment/inbox`
- **Page**: `frontend/app/(authenticated)/hr/recruitment/inbox/page.tsx`
- **Hooks**: `useMessageThreads`, `useCandidateMessages`, `useSendCandidateMessage`
- **Click-by-click**
  - Select thread → load messages.
  - Send message → backend sends email (and stores message) and updates thread state.

### 10.16 Performance hub
- **Route**: `/hr/performance`
- **Page**: `frontend/app/(authenticated)/hr/performance/page.tsx`
- **Gate**: `DashboardGate` with permission `hr:performance:manage`
- **Primary components**: `ReviewsTab`, `GoalsTab`, `OneOnOnesTab`, `CyclesTab`, `PipTab`
- **Click-by-click**
  - Switch tabs → load respective lists.
  - Create cycles/goals/reviews → sheets; submit; invalidate lists.

### 10.17 Goals
- **Route**: `/hr/goals`
- **Page**: `frontend/app/(authenticated)/hr/goals/page.tsx`
- **Hooks**: `useHrGoals`, `useCreateHrGoal`, `useUpdateGoal`
- **Click-by-click**
  - Create goal + key results.
  - Update progress → immediate optimistic UI; backend persists.

### 10.18 KPIs + competency frameworks
- **Route**: `/hr/kpis`
- **Page**: `frontend/app/(authenticated)/hr/kpis/page.tsx`
- **Hooks**: KPI CRUD + competency framework CRUD
- **Click-by-click**
  - Define competency frameworks → attach to roles and scorecards.
  - Create KPI and map to departments/teams.

### 10.19 Feedback cycles (360)
- **Route**: `/hr/feedback`
- **Page**: `frontend/app/(authenticated)/hr/feedback/page.tsx`
- **Hooks**: feedback cycle CRUD/status updates, pending reviews, submit responses, results
- **Click-by-click**
  - Create cycle → choose participants + questions.
  - Employees complete pending reviews.
  - HR views results dashboard with privacy constraints.

### 10.20 Attendance operations (shifts, rosters, overtime, geofencing, biometric)
- **Routes** (each gated with `useCan("hr:attendance:manage")` where present)
  - `/hr/shifts`, `/hr/rosters`, `/hr/overtime`, `/hr/comp-off`, `/hr/geofencing`, `/hr/biometric`
- **Pages**: corresponding `frontend/app/(authenticated)/hr/*/page.tsx`
- **Click-by-click**
  - Configure shift templates and assignments.
  - Build rosters week-by-week.
  - Review overtime requests and comp-off balances.
  - Configure geofence locations and biometric devices/logs.

### 10.21 Leave policies + holidays
- **Routes**
  - `/hr/leave-policies` (`useCan("hr:leaves:manage")`)
  - `/hr/holidays`
- **Click-by-click**
  - HR defines policies (accrual, carry-forward, blackout).
  - Employees request leave; managers approve; balances update.
  - Holidays managed centrally and shown in calendars.

### 10.22 Announcements
- **Route**: `/hr/announcements`
- **Hooks**: `useHrAnnouncements`, `useAllHrAnnouncements`, create/update/delete, mark read
- **Click-by-click**
  - HR creates announcement (audience targeting recommended).
  - Employees see banner/list; mark read; analytics on read receipts if enabled.

### 10.23 Signatures
- **Route**: `/hr/signatures`
- **Hooks**: sent/received requests, create request, sign, void
- **Click-by-click**
  - HR sends signature request with doc.
  - Employee signs (audit trail captured).
  - HR can void request.

### 10.24 Documents
- **Route**: `/hr/documents`
- **Hooks**: `useHrDocuments`, `useRichDocuments`, delete actions
- **Click-by-click**
  - Upload document and assign visibility.
  - Manage rich documents (handbook/policies).
  - Track acknowledgments (where configured).

### 10.25 Payroll (employee self-service)
- **Route**: `/hr/my-payslips`
- **Hooks**: `useHrEmployeePayslips`
- **Click-by-click**
  - Employee views list of payslips; downloads permitted documents.

### 10.26 Payroll admin sub-pages
- **Routes**
  - `/hr/payroll/salary-structures`
  - `/hr/payroll/allowances`
  - `/hr/payroll/tax`
  - `/hr/payroll/bank-transfers`
- **Click-by-click**
  - HR configures salary templates, allowances/deductions.
  - Employees submit tax declarations + proofs; HR verifies.
  - HR generates bank transfer file for payroll disbursement.

### 10.27 Offboarding & exit (resignations, termination, FNF, asset returns)
- **Routes**
  - `/hr/exit`
  - `/hr/termination`
  - `/hr/fnf`
  - `/hr/asset-returns`
- **Click-by-click**
  - Employee resignation created → HR/CEO review actions.
  - Termination created → submit → complete → send termination email (hook exists).
  - FNF settlement created and marked paid.
  - Asset return workflow tracks status and completion.

---

## 11) Caching, invalidation, and performance requirements

### 11.1 Frontend (TanStack Query)
- Query keys must use `frontend/lib/query-keys.ts` factories.
- All mutations must invalidate only relevant prefixes:
  - Employee updates → invalidate `queryKeys.hr.employees()` and employee detail key.
  - Leave approvals → invalidate approvals + balances + calendars.
  - Recruitment stage change → invalidate pipeline + candidate list + stats.
  - Payroll actions → invalidate payroll list + payslips.
- Calibrate `staleTime` per volatility (permissions short; directory moderate; payroll immutable after approval unless corrected).

### 11.2 Backend caching
- Access resolution is cached in Redis in `AccessService`; must be busted by `bumpPermissionsVersion` on role/grant changes.
- HR domain read caches (if any) must never be shared across tenants and must be invalidated on writes.

### 11.3 Performance budgets (pragmatic targets)
- HR list pages (employees, candidates, leaves) initial render < 1.5s on broadband, < 3s on slow 4G.
- List endpoints paginated with hard cap 100/page; no unbounded list reads.

---

## 12) Scheduler, notifications, and email (reliability-first)

### 12.1 Existing schedulers to leverage
- `backend/src/modules/cron/cron-hr.service.ts`
- `backend/src/modules/cron/cron-recruitment.service.ts`
- `backend/src/modules/cron/cron-holiday.service.ts`

### 12.2 Required job categories (must exist end-to-end)
- **Onboarding reminders**
  - Trigger: onboarding tasks due in \(N\) days; overdue tasks.
  - Action: in-app notification + email to employee; escalate to manager/HR after threshold.
- **Offer deadline reminders**
  - Trigger: offer expiring soon / no response.
  - Action: notify recruiter + candidate reminder email (where appropriate).
- **Interview no-show follow-up**
  - Trigger: interview time passed, status not completed.
  - Action: create follow-up task, notify recruiter, email candidate template (optional).
- **Holiday reminders**
  - Trigger: upcoming holiday.
  - Action: notify employees (audience policy).

### 12.3 Reliability requirements (must be enforced)
- **Idempotency**: outbound “send” operations must be deduped by `(orgId, eventId, recipientId, templateId)` within a TTL.
- **Retries**: email send failures must retry with backoff; permanent failures logged.
- **Observability**: every job run logs counts (processed/sent/failed/skipped) with correlation IDs.

---

## 13) Security, privacy, and compliance requirements

### 13.1 PII classification (minimum)
- **Highly sensitive**: bank details, tax proofs, payslips, government IDs, salary.
- **Sensitive**: DOB, home address, phone, emergency contact, performance feedback.
- **Work data**: department, title, manager, attendance logs (still sensitive).

### 13.2 Enforcement rules
- Backend must re-assert:
  - tenant (`orgId`) scoping on **every** query,
  - object-level access for employee-specific reads/writes,
  - permission checks for the operation.
- Frontend checks are advisory; never rely on them for enforcement.

### 13.3 Audit requirements
- Log all sensitive reads/writes and all approvals (see §6.3).
- Protect audit logs with separate permission (view-only, export restricted).

---

## 14) Observability (what we must measure)

### 14.1 KPIs (product)
- Time-to-hire per role, stage conversion rates, offer acceptance rate.
- Onboarding completion time and task SLA adherence.
- Leave approval SLA, payroll run SLA.

### 14.2 KPIs (engineering)
- API latency P95/P99 for list endpoints.
- Job success rate for cron tasks, email delivery success.
- Authorization deny counts by permission key (signal misconfig or abuse).

---

## 15) Test plan (must ship with changes)

### 15.1 Backend e2e specs (NestJS controllers)
For each critical controller, add:
- **Auth required** (401 without token).
- **Permission required** (403 without permission).
- **Tenant isolation** (Org A cannot access Org B resource).
- **Data scope** (where scopable permissions exist): own/team/all/none.
- **Idempotency** for send/reminder endpoints (if added).

Minimum suites:
- Employees: list, get by id, update, onboard.
- Leaves: request, approve/reject, cancel; balances update.
- Payroll: generate, approve, mark paid; payslip download access.
- Recruitment: stage update; offer approval; requisition approval.
- Onboarding: initiate; task completion; HR docs views.
- Exit/termination: create, review, submit/complete; email send (dedupe).

### 15.2 Frontend test expectations
- Page-level smoke: renders loading/empty/error states.
- Permission gating: pages hide actions without permissions.
- Mutation flows: optimistic UI where used; toasts; list invalidation.

---

## 16) Competitor parity + differentiation (execution checklist)

### 16.1 Parity targets
- **BambooHR**: directory + onboarding checklists + docs + time off approvals.
- **Rippling**: lifecycle workflows, device/asset management, payroll ops.
- **Zoho People**: attendance (shift/roster), leave policies, HR requests.
- **Deel (parts)**: offers/contracts + signature workflows, global employee document management patterns.

### 16.2 StreamlineOS differentiation (must be visible in-product)
- **Automation-first workflows**: recruitment and HR lifecycle events trigger rules (without custom code).
- **Unified approvals + audit**: every approval has a timeline, rationale, and immutable audit trail.
- **Module gating**: orgs can enable HR submodules via entitlements; UI and API both enforce.
- **Single activity feed**: notifications unify HR + recruitment + payroll events (no hidden state).

---

## 17) Implementation backlog (sequenced for safest delivery)

> This is an engineering sequencing guide; actual tasks should be executed page-by-page per `CLAUDE.md`.

### 17.1 Foundation (always first)
- Confirm permission keys and module gating coverage for each controller under `/hr/**` and `/onboarding`.
- Add/verify audit logging for sensitive actions and approvals.
- Add/verify pagination and `orgId` scoping on all list endpoints.

### 17.2 HR core
- Employees directory + details + onboarding initiation (HR + employee self-service).
- Leaves + policies + approvals + calendar.
- Attendance operational pages (shifts/rosters/overtime/geofence/biometric) consistent gating and states.

### 17.3 Payroll
- Salary structures + allowances/deductions + tax declarations + payroll runs.
- Payslip access model and download auditing.

### 17.4 Recruitment / ATS
- Requisitions approvals, job postings, pipeline stage transitions, interviews, scorecards, offer workflow.
- Inbox + email sequences + automations (event-driven).

### 17.5 Lifecycle end
- Resignations, termination workflows, asset returns, FNF settlements, experience letters.

