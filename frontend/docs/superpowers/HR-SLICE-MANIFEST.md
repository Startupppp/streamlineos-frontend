# HR Domain — Strangler-Fig Migration Slice Manifest

Scope: every `route.ts` under `app/api/hr/**` (HR + recruitment) in the Next.js App Router frontend, classified for porting to the NestJS backend (`streamlineos-api`).

Generated: 2026-06-26. Read-only analysis of the frontend; no application code modified.

---

## How this was produced (confidence)

- Enumerated all `route.ts` under `app/api/hr/**` → **266 files** (`find app/api/hr -name route.ts | wc -l`).
- For **every** file (not a sample) extracted via content scan: exported HTTP methods, the auth wrapper (`withAuth` / `withAbility(verb,subject)` / `withModuleAbility` / inline `ability.can(...)` / role-string gate), Drizzle write targets (`insert/update/delete`) and read targets (`.from` / `db.query.*`), and integration coupling by import specifier **and** by server-action indirection.
- Fully **Read** the decisive/ambiguous files (identity-table writers, storage/PDF, session boundary, suspicious names): `my-profile`, `onboarding-docs`, `onboarding-docs/[docId]`, `termination/[terminationId]/complete`, `employees/[employeeId]`, `vault/[documentId]`, `vault`, `profile-pdf`, `payrolls/[payrollId]/download`, `jobs/[jobId]/share`, `sessions`, `sessions/[sessionId]`, `integrations/accounting-export`, `interviewers/availability`, `expenses/email-report`, `portals/[platform]/sync`, plus the `withAuth`/`withAbility` helper and `create-notification` action.
- Auth model (`lib/api/helpers.ts`): `withAuth` = NextAuth→org-scoped session bridge (org-only). `withAbility(verb,subject)`/`withModuleAbility(module,verb,subject)` = CASL RBAC gate. Both rely on the auth-context bridge **which already exists on the backend**, so the bridge is NOT a deferral reason.
- **Confidence: HIGH** for integration/identity coupling — every email/SMS/storage/AI/automation/esign hit was confirmed by precise import grep **and** the server-action indirection audit caught the two cases hidden behind `@/server/actions/*` (`expenses/email-report` → email; `create-notification` → DB-only). The only soft calls are the fire-and-forget automation-engine emissions (`runAutomationsForEvent` / `inngest.send`) — flagged DEFERRED per the rules but annotated as stubbable.

---

## 1. Summary counts

| Classification | Count |
|---|---:|
| **Total HR route files** | **266** |
| **PORTABLE-NOW** | **215** |
| **DEFERRED** (blocked on an unported integration) | **42** |
| **STAYS-FRONTEND** (users/identity table or NextAuth session boundary) | **9** |

### DEFERRED by primary blocking integration (sums to 42)

| Blocker | Count | Notes |
|---|---:|---|
| Email (`@/lib/email`, `@/lib/email-templates`, or email server-action) | 26 | incl. `expenses/email-report` (email hidden behind `@/server/actions/expense-export`) |
| Automation engine only (`runAutomationsForEvent` / `inngest.send`, no email) | 10 | fire-and-forget event emission; portable if the event sink is stubbed/queued |
| AI / Gemini (`@ai-sdk/google`, resume-parser) | 3 | candidate ai-score, composite-score, resume-parse |
| Google Calendar OAuth (`googleapis`) | 1 | `integrations/google-calendar` |
| E-sign (`@/lib/esign/documenso`) | 1 | `candidates/[candidateId]/rollout-documents` (also email + automation) |
| R2 storage (`@/lib/storage` signed URL) | 1 | `candidates/[candidateId]/vault/[documentId]` |
| **Total** | **42** | |

Integration **overlap** (routes touching ≥2 unported integrations, counted once above under their primary blocker): `recruitment/interviews/schedule` = email + Twilio/WhatsApp + Google Calendar + in-app notify + automation; `candidates/[candidateId]/rollout-documents` = e-sign + email + automation; `candidates/[candidateId]/stage` & `candidates/[candidateId]/route` = email + in-app notify; `leaves/[leaveId]/approve` & `/reject` = email + in-app notify + automation; `exit/route`, `expenses/route`, `leaves/route` = email + automation; `payrolls/[payrollId]/paid` & `termination/[terminationId]/send-email` = email + in-process PDF.

Routes touching each integration **including overlaps**: Email **27**, Automation engine **19**, AI **3**, Google Calendar **2**, Twilio/WhatsApp **1**, E-sign **1**, R2 storage **1**.

### Things that are NOT blockers (verified — kept PORTABLE-NOW)

- **In-process PDF / HTML document generation** (`pdf-lib`, `payslip`/`termination-letter`/`profile` HTML): pure compute, runs on Node/Nest. Routes: `payrolls/[payrollId]/download` (HTML payslip), `employees/[employeeId]/profile-pdf` (HTML), `termination/[terminationId]/letter` (PDF), `recruitment/offer-templates/[templateId]/generate-pdf` (pdf-lib), `recruitment/interviews/[interviewId]/ics` (ICS string). (PDF routes that ALSO email — `payrolls/paid`, `termination/send-email` — are DEFERRED for the email, not the PDF.)
- **In-app notifications** (`create-notification.ts` → `db.insert(notifications)` only, no email/push).
- **Accounting export** (`integrations/accounting-export`): generates Tally-XML / QuickBooks-CSV / JSON strings in-process; no external API.
- **Document/vault uploads**: store a client-provided `fileUrl` + `s3Key` **string** in the DB (`onboarding-docs`, `candidates/.../vault` POST, `candidates/.../documents` POST). Only the vault **download** (`vault/[documentId]`) calls `@/lib/storage` for a signed URL → that one is DEFERRED.
- **Job-portal `portals/[platform]/sync`**: currently a DB-only stub (updates `lastSyncedAt`; no real LinkedIn/Naukri/Indeed call) → PORTABLE.
- **`encryption`/`bcrypt`-as-hash-helper compute, redis caching, audit-log writes**: portable infra.

### RBAC finding

HR-core routes use ability subjects (`hr:employees`, `hr:leaves`, `hr:payroll`, `hr:expenses`, `hr:documents`, `hr:performance`, `hr:attendance`*, `hr:assets`, `hr:exit`, `hr:onboarding`, `hr:analytics`, `hr:email-templates`, `hr:integrations`, `hr:handbook`, `hr:alumni`, `hr:bonuses`, `hr:career-ladders`, `hr:headcount`, `hr:salary`*, `hr:compliance`, `crm:incentives`*). The **recruitment** subtree is almost entirely `withAuth` + an **inline role-string gate** (`role !== "CEO" && role !== "HR" && role !== "ADMIN"`), NOT ability subjects — port these as auth-only + role-check, and consider normalizing to a `hr:recruitment` ability subject during the port.
*Subjects marked `*` (`hr:attendance`, `hr:salary`, `hr:payrolls`, `crm:incentives`, `hr:performance`, `hr:compliance`) are used by handlers but are not all present in the `AbilitySubject` union in `lib/api/helpers.ts` — verify the ability seed before porting.

---

## 2. Ordered slice plan

Ordering rule: a slice never depends (at runtime/schema-reference level) on a slice ported later. All slices share the one Neon database (strangler-fig), so cross-slice **FKs are read-only lookups**, not hard blockers; ordering is driven by reference-data ownership and coherence. Each slice below lists only its **PORTABLE-NOW** routes (DEFERRED/STAYS-FRONTEND siblings are in §3/§4).

### Slice 1 — Org Config & Reference Data  *(port first)*
Dominant tables: `departments`, `holidays`, `documentTypes`, `documentTemplates`(+versions), `emailTemplates`, `expenseCategories`, `leaveBlackoutDates`, `salaryStructures`, `careerLadders`, `learningPaths`, `certifications`, `interviewQuestions`, `handbookVersions`, `notificationPreferences`, `employeeSkills`.
RBAC: `manage hr:employees` (departments), `manage hr:attendance` (holidays), `manage hr:documents`, `manage hr:email-templates`, `manage hr:expenses`, `manage hr:salary`, `manage hr:career-ladders`, `manage hr:performance`, `manage hr:handbook`, `manage hr:leaves` (blackout), auth-only.
Dependency: none. Other slices FK to `departments`/`documentTypes`/`salaryStructures` — port these leaves first.

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `departments` | GET, POST | departments | manage hr:employees |
| `holidays/[holidayId]` | DELETE, PATCH | holidays | manage hr:attendance |
| `holidays/calendar` | GET | holidays | auth-only |
| `skills` | GET, POST | employeeSkills | auth-only |
| `document-types` | GET, POST | documentTypes | manage hr:documents |
| `document-types/[documentTypeId]` | DELETE, GET, PATCH | documentTypes | manage hr:documents |
| `documents/templates` | GET, POST | documentTemplates | manage hr:documents |
| `documents/templates/[templateId]` | DELETE, GET, PATCH, PUT | documentTemplates, documentTemplateVersions | manage hr:documents |
| `documents/templates/[templateId]/preview` | GET | documentTemplates | auth-only |
| `documents/templates/[templateId]/versions` | GET | documentTemplateVersions | auth-only |
| `email-templates` | GET, POST | emailTemplates | manage hr:email-templates |
| `email-templates/[templateId]` | DELETE, PATCH | emailTemplates | manage hr:email-templates |
| `expenses/categories` | GET, POST | expenseCategories | manage hr:expenses |
| `leaves/blackout` | GET, POST | leaveBlackoutDates | manage hr:leaves |
| `leaves/blackout/[blackoutId]` | DELETE | leaveBlackoutDates | manage hr:leaves |
| `salary-structures` | GET, POST | salaryStructures | manage hr:salary |
| `career-ladders` | GET, POST | careerLadders | manage hr:career-ladders |
| `learning-paths` | GET, POST | learningPaths | manage hr:performance |
| `certifications` | GET, POST | certifications | auth-only |
| `interview-questions` | GET, POST | interviewQuestions | manage hr:employees |
| `interview-questions/[questionId]` | DELETE, PATCH | interviewQuestions | manage hr:employees |
| `handbook` | GET, POST | handbookVersions | manage hr:handbook |
| `handbook/[handbookId]` | DELETE, PATCH | handbookVersions | manage hr:handbook |
| `notification-preferences` | GET, PATCH | notificationPreferences | auth-only |

### Slice 2 — Time: Leave, Attendance, WFH, Work-logs
Dominant tables: `leaveRequests`, `leaveBalances`, `leaveTypes`, `attendance`, `wfhRequests`, `timesheets`.
RBAC: `approve hr:leaves`, `read hr:leaves`, `manage hr:attendance`, auth-only (self-service).
Dependency: Slice 1 (`leaveTypes`/holidays). Note: leave **balances are seeded** by the DEFERRED `leaves/route` (apply) and STAYS-FRONTEND `employees/onboard` (`ensureUserBalances`); the read endpoints here operate on existing balances, so they port independently, but the **seeding write-path stays deferred until the leave-apply route is ported**.

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `leaves/balance` | GET | leaveBalances | auth-only |
| `leaves/my` | GET | leaveRequests, leaveBalances | auth-only |
| `leaves/team` | GET | leaveRequests | approve hr:leaves |
| `leaves/this-week` | GET | leaveRequests | auth-only |
| `leaves/analytics` | GET | leaveRequests | auth-only |
| `leave-calendar` | GET | leaveRequests, leaveTypes | read hr:leaves |
| `leaves/[leaveId]` | PATCH | leaveRequests, leaveBalances | approve hr:leaves |
| `leaves/comp-off` | POST | leaveBalances, leaveTypes | auth-only |
| `attendance/break` | POST | attendance | auth-only |
| `attendance/check-in` | POST | attendance | auth-only |
| `attendance/check-out` | POST | attendance | auth-only |
| `attendance/heatmap` | GET | attendance | auth-only |
| `attendance/logs` | GET | attendance | manage hr:attendance |
| `attendance/monthly` | GET | attendance | auth-only |
| `attendance/status` | GET | attendance | auth-only |
| `attendance/team-status` | GET | attendance, departments | manage hr:attendance |
| `wfh` | GET, POST | wfhRequests | auth-only |
| `wfh/pending` | GET | wfhRequests | auth-only |
| `wfh/[requestId]` | PATCH | wfhRequests | auth-only |
| `work-logs` | GET, POST | timesheets | manage hr:attendance |
| `work-logs/export` | GET | timesheets | manage hr:attendance |

### Slice 3 — Employee Directory, Org Structure, Assets & Devices
Dominant tables: `organizationMembers`, `users`(read-only joins), `departments`, `departmentMembers`, `employeeSkills`, `assetReturns`, `employeeDevices`, `backgroundVerifications`, `teamEvents`.
RBAC: `read hr:employees`, `manage hr:employees`, `manage hr:assets`, `manage hr:performance` (scorecard), auth-only.
Dependency: Slice 1 (departments). These are **reads of `users`** (never writes — writes live in STAYS-FRONTEND).

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `directory` | GET | departmentMembers, departments, users(r) | auth-only |
| `employees` | GET | organizationMembers | read hr:employees |
| `employees/stats` | GET | (aggregate) | auth-only |
| `employees/anniversary-feed` | GET | organizationMembers | auth-only |
| `employees/availability` | GET | leaveRequests, organizationMembers | auth-only |
| `employees/check-email` | GET | users(r) | auth-only |
| `employees/find-expert` | GET | employeeSkills, organizationMembers | auth-only |
| `employees/projects` | GET | (project joins) | auth-only |
| `employees/skills-matrix` | GET | employeeSkills, organizationMembers | auth-only |
| `employees/tickets` | GET | (helpdesk joins) | auth-only |
| `employees/[employeeId]/reports-to-me` | GET | organizationMembers, users(r) | auth-only |
| `employees/[employeeId]/manager-scorecard` | GET | attendance, leaveRequests, performanceReviews, users(r) | manage hr:performance |
| `employees/[employeeId]/profile-pdf` | GET | users(r) via getEmployee | auth-only + role-gate (HTML gen) |
| `org-chart` | GET | (org joins) | auth-only |
| `headcount` | GET | departments, organizationMembers | read hr:headcount |
| `teams/[teamId]` | GET | departments, users(r) | auth-only |
| `celebrations` | GET | organizationMembers | auth-only |
| `team-events` | GET, POST | teamEvents | manage hr:employees |
| `team-events/[eventId]` | POST | teamEventParticipants | auth-only |
| `asset-returns` | GET, POST | assetReturns | manage hr:assets |
| `asset-returns/[returnId]` | PATCH | assetReturns | manage hr:assets |
| `devices` | GET, POST | employeeDevices | manage hr:assets |
| `devices/[deviceId]` | DELETE, PATCH | employeeDevices | manage hr:assets |
| `background-verification` | GET, PATCH, POST | backgroundVerifications | manage hr:employees |

### Slice 4 — Performance, Engagement & Documents/Compliance
Dominant tables: `goals`, `keyResults`, `performanceReviews`, `reviewCycles`, `oneOnOneMeetings`, `performanceImprovementPlans`, `feedbackRequests`, `skillAssessments`, `recognitions`, `enpsScores`, `pulseSurveys`, `documents`, `policyAcknowledgments`, `richDocuments`.
RBAC: `manage hr:performance`, `manage hr:documents`, `manage hr:feedback`, auth-only.
Dependency: Slices 1, 3.

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `my-goals` | GET | goals, keyResults | auth-only |
| `performance/goals` | GET, PATCH, POST | goals | manage hr:performance |
| `performance/goals/[goalId]` | DELETE, PATCH | goals | auth-only |
| `performance/key-results` | GET, PATCH, POST | keyResults, goals | auth-only |
| `performance/one-on-ones` | GET, POST | oneOnOneMeetings | auth-only |
| `performance/one-on-ones/[meetingId]` | DELETE, PATCH | oneOnOneMeetings | auth-only |
| `performance/pip` | GET, POST | performanceImprovementPlans | manage hr:performance |
| `performance/pip/[pipId]` | PATCH | performanceImprovementPlans | manage hr:performance |
| `performance/reviews/[reviewId]` | DELETE, GET, PATCH | performanceReviews | auth-only |
| `performance/cycles/[cycleId]` | DELETE, GET, PATCH | reviewCycles | manage hr:performance |
| `feedback` | GET, POST | feedbackRequests | manage hr:feedback |
| `feedback/[feedbackId]` | PATCH | feedbackRequests | auth-only |
| `assessments` | GET, POST | skillAssessments, assessmentAttempts | manage hr:performance |
| `recognition` | GET, POST | recognitions | auth-only |
| `enps` | GET, POST | enpsScores | manage hr:performance |
| `surveys` | GET, POST | pulseSurveys, surveyResponses | manage hr:performance |
| `surveys/[surveyId]` | PATCH | pulseSurveys | manage hr:performance |
| `documents` | GET, POST | documents | manage hr:documents |
| `documents/[documentId]` | DELETE, PATCH | documents | manage hr:documents |
| `documents/stats` | GET | documents | manage hr:documents |
| `document-expiry` | GET | certifications, documents | auth-only |
| `compliance` | GET, PATCH, POST | documents, policyAcknowledgments | manage hr:documents |
| `compliance/statutory` | GET | backgroundVerifications, certifications, policyAcknowledgments | manage hr:compliance |
| `rich-documents` | GET, POST | richDocuments | auth-only |
| `rich-documents/[documentId]` | DELETE, GET, PATCH | richDocuments | auth-only |
| `rich-documents/[documentId]/publish` | PATCH | richDocuments | auth-only |

### Slice 5 — Payroll, Compensation & Finance
Dominant tables: `payrolls`, `salaryStructures`, `bonuses`, `salaryLoans`, `incentives`/`incentiveConfig`, `reimbursements`, `fnfSettlements`, `expenses`(reads).
RBAC: `withModuleAbility("hr", …, "hr:payroll")`, `generate/approve/view/read hr:payroll`, `approve hr:expenses`, `manage hr:expenses`, `approve crm:incentives`, auth-only.
Dependency: Slice 1 (`salaryStructures`), Slice 3 (employee reads).

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `payrolls` | GET, POST | payrolls, salaryStructures | generate hr:payroll |
| `payrolls/all` | GET | payrolls | withModuleAbility hr view hr:payroll |
| `payrolls/generate` | POST | payrolls, salaryStructures | withModuleAbility hr generate hr:payroll |
| `payrolls/[payrollId]/download` | GET | payrolls, users(r), organizations(r) | approve/generate hr:payroll (HTML payslip) |
| `payroll-reports` | GET | payrolls | read hr:payrolls |
| `payslips` | GET | payrolls | read hr:payroll |
| `dashboard/payroll-summary` | GET | payrolls | read hr:analytics |
| `dashboard/salary-bands` | GET | salaryStructures | auth-only |
| `bonuses` | GET, POST | bonuses | manage hr:bonuses |
| `bonuses/[bonusId]` | PATCH | bonuses | manage hr:bonuses |
| `loans` | GET, POST | salaryLoans | approve hr:expenses |
| `loans/[loanId]` | PATCH | salaryLoans | approve hr:expenses |
| `incentives` | GET | incentives | auth-only |
| `incentives/config` | GET, POST | incentiveConfig | approve crm:incentives |
| `incentives/stats` | GET | incentives | auth-only |
| `incentives/[incentiveId]/approve` | PATCH | incentives | approve crm:incentives |
| `incentives/[incentiveId]/reject` | PATCH | incentives | approve crm:incentives |
| `reimbursements` | GET, POST | reimbursements | approve hr:expenses |
| `fnf` | GET, POST | fnfSettlements | manage hr:exit |
| `fnf/[fnfId]` | PATCH | fnfSettlements | manage hr:exit |
| `expenses/export` | GET | expenses | approve hr:expenses |
| `expenses/page-data` | GET | expenseCategories, expenses | approve hr:expenses |
| `expenses/report` | GET | expenses | approve hr:expenses |
| `integrations/accounting-export` | POST | payrolls, expenses (in-process export) | manage hr:integrations |
| `tax-calculator` | POST | (pure compute) | auth-only |
| `analytics/compensation` | GET | departments, organizationMembers | read hr:analytics |

### Slice 6 — Lifecycle (Exit/Termination), Onboarding views, Alumni & HR Analytics/Dashboards
Dominant tables: `resignations`, `terminations`, `alumniProfiles`, `onboardingDocuments`(read), plus cross-domain aggregates for dashboards.
RBAC: `approve hr:leaves` (exit), `manage hr:employees` (termination), `manage hr:onboarding`, `read hr:analytics`, `read hr:alumni`, auth-only.
Dependency: Slices 1, 3 (+ reads almost everything for dashboards — port near-last). Exit/termination **state-machine writes that email/notify or deactivate the user are NOT here** (see §3/§4).

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `exit/[resignationId]/letter` | GET | resignations, organizations(r) | approve hr:leaves (in-process letter) |
| `exit/[resignationId]/progress` | GET | resignations, users(r) | approve hr:leaves |
| `exit/[resignationId]/withdraw` | PATCH | resignations | approve hr:leaves |
| `exit/experience-letter` | POST | richDocuments, users(r) | approve hr:leaves |
| `exit/analytics` | GET | organizationMembers, resignations | approve hr:leaves |
| `termination` | GET, POST | terminations | manage hr:employees |
| `termination/[terminationId]` | GET | terminations | manage hr:employees |
| `termination/[terminationId]/submit` | PATCH | terminations | auth-only |
| `termination/[terminationId]/ceo-review` | PATCH | terminations | auth-only |
| `termination/[terminationId]/letter` | GET | terminations, organizations(r) | manage hr:employees (in-process PDF) |
| `alumni` | GET, POST | alumniProfiles | read hr:alumni |
| `onboarding-docs/summary` | GET | documentTypes, onboardingDocuments, users(r) | manage hr:onboarding |
| `dashboard/onboarding-status` | GET | onboardingTasks, users(r) | read hr:analytics |
| `analytics` | GET | attendance, departments, expenses, leaveRequests, payrolls, resignations | read hr:analytics |
| `analytics/attendance` | GET | attendance, departments | read hr:analytics |
| `analytics/attrition` | GET | organizationMembers, resignations | read hr:analytics |
| `dashboard/metrics` | GET | jobPostings, leaveRequests, organizationMembers | read hr:analytics |
| `dashboard/compliance` | GET | organizationMembers | auth-only |
| `dashboard/diversity` | GET | organizationMembers | read hr:analytics |
| `dashboard/export` | GET | organizationMembers | auth-only |
| `dashboard/headcount-trends` | GET | organizationMembers | read hr:analytics |
| `dashboard/time-to-fill` | GET | departments, jobPostings | read hr:analytics |
| `dashboard/attendance-analytics` | GET | attendance, departments, organizationMembers, wfhRequests | read hr:analytics |
| `helpdesk` *(see note)* | — | — | — |

> Note: `helpdesk` and `expenses` create/edit, `payrolls/approve|paid`, `leaves/apply|approve|reject|cancel`, `performance/reviews|cycles`, `reimbursements/[id]` are DEFERRED (email/automation) — see §3.

### Slice 7 — Recruitment Core: Candidates, Jobs, Pipeline, Sources, Vendors, Referrals, Headcount
Dominant tables: `candidates`, `candidateApplications`, `candidateOffers`, `candidateDocuments`, `candidateDocumentsVault`, `candidateReferrals`, `candidateReferenceChecks`, `candidateSlaTracking`, `calibrationSessions`, `jobPostings`, `jobRecruiters`, `candidateSources`, `recruitmentVendors`, `vendorCandidateSubmissions`, `headcountRequests`, `pipelineAutomations`, `candidateMessages`, `emailSequences*`, `recruiterActivityLog`.
RBAC: mostly `withAuth` + inline role-gate (`CEO`/`HR`/`ADMIN`); a few use `manage hr:employees`. (See RBAC finding — normalize to `hr:recruitment`.)
Dependency: Slices 1 (departments) & 3 (org members for recruiters). Recruitment is otherwise self-contained.

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `recruitment/candidates` | GET, POST | candidates | auth-only + role-gate |
| `recruitment/candidates/bulk-import` | POST | candidates | auth-only + role-gate |
| `recruitment/candidates/import` | POST | candidates | manage hr:employees |
| `recruitment/candidates/[candidateId]/sla` | GET, PATCH | candidateSlaTracking | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/calibration` | GET, PATCH, POST | calibrationSessions | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/referral` | GET, PATCH, POST | candidateReferrals | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/reference-checks` | GET, POST | candidateReferenceChecks | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/reference-checks/[checkId]` | DELETE, PATCH | candidateReferenceChecks | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/documents` | GET, POST | candidateDocuments (stores URL/s3Key string) | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/documents/[documentId]/view` | GET | candidateDocuments | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/vault` | GET, POST | candidateDocumentsVault (stores s3Key string) | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/vault/access-logs` | GET | vaultAccessLogs | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/offers` | GET, POST | candidateOffers | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/offers/[offerId]/approve` | POST | candidateOffers | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/offers/[offerId]/reject-approval` | POST | candidateOffers | auth-only + role-gate |
| `recruitment/candidates/[candidateId]/offers/[offerId]/submit-for-approval` | POST | candidateOffers | auth-only + role-gate |
| `recruitment/jobs` | GET, POST | jobPostings | manage hr:employees |
| `recruitment/jobs/[jobId]` | DELETE, GET, PATCH | jobPostings | manage hr:employees |
| `recruitment/jobs/[jobId]/publish` | POST | jobPostings, candidateSources | auth-only + role-gate |
| `recruitment/jobs/[jobId]/recruiters` | DELETE, GET, POST | jobRecruiters | auth-only + role-gate |
| `recruitment/jobs/[jobId]/share` | GET | jobPostings, organizations(r) (share-URL gen) | auth-only |
| `recruitment/pipeline` | GET | candidates, candidateSlaTracking | auth-only + role-gate |
| `recruitment/portals` | GET, POST | candidateSources | auth-only + role-gate |
| `recruitment/portals/[platform]/sync` | POST | candidateSources (DB-only stub) | auth-only + role-gate |
| `recruitment/internal-jobs` | GET | jobPostings | auth-only + role-gate |
| `recruitment/internal-jobs/[jobId]/apply` | POST | candidateApplications, candidates | auth-only + role-gate |
| `recruitment/recruiters` | GET | jobRecruiters, organizationMembers, recruiterActivityLog | auth-only + role-gate |
| `recruitment/recruiters/activity` | GET, POST | recruiterActivityLog, candidates | auth-only + role-gate |
| `recruitment/referrals` | GET, POST | candidateReferrals, candidates | auth-only + role-gate |
| `recruitment/referrals/[referralId]` | PATCH | candidateReferrals | auth-only + role-gate |
| `recruitment/vendors` | GET, POST | recruitmentVendors | auth-only + role-gate |
| `recruitment/vendors/[vendorId]` | DELETE, PATCH | recruitmentVendors | auth-only + role-gate |
| `recruitment/vendors/[vendorId]/submissions` | GET, PATCH, POST | vendorCandidateSubmissions | auth-only + role-gate |
| `recruitment/headcount` | GET, POST | headcountRequests | auth-only + role-gate |
| `recruitment/headcount/[requestId]` | DELETE, PATCH | headcountRequests | auth-only + role-gate |
| `recruitment/headcount/[requestId]/approve` | POST | headcountRequests | auth-only + role-gate |
| `recruitment/headcount/[requestId]/reject` | POST | headcountRequests | auth-only + role-gate |
| `recruitment/headcount/[requestId]/create-job` | POST | headcountRequests, jobPostings | auth-only + role-gate |
| `recruitment/diversity-report` | GET | candidates | auth-only + role-gate |
| `recruitment/bgv-compliance` | GET | candidateApplications | auth-only + role-gate |
| `recruitment/automations` | GET, POST | pipelineAutomations (rule definitions) | auth-only + role-gate |
| `recruitment/automations/[automationId]` | DELETE, PATCH | pipelineAutomations | auth-only + role-gate |
| `recruitment/messages/[messageId]` | PATCH | candidateMessages | auth-only + role-gate |
| `recruitment/messages/threads` | GET | candidateMessages | auth-only + role-gate |
| `recruitment/email-sequences` | GET, POST | emailSequences, emailSequenceSteps (definitions) | auth-only + role-gate |
| `recruitment/email-sequences/[sequenceId]` | DELETE, GET, PATCH | emailSequences, emailSequenceSteps | auth-only + role-gate |
| `recruitment/email-sequences/[sequenceId]/enroll` | POST | emailSequenceEnrollments | auth-only + role-gate |

> Note: `recruitment/candidates/[candidateId]/route`, `/stage`, `/bulk-reject` (email/notify), `/applications`, `/bgv-status`, `/offers/[offerId]/route` (automation), `/ai-score`, `/composite-score`, `/resume-parse` (AI), `/rollout-documents` (e-sign), `/vault/[documentId]` (R2), `recruitment/messages` (email) are DEFERRED — see §3.

### Slice 8 — Recruitment Interviews, Offers, Scorecards & Reporting
Dominant tables: `interviews`, `interviewScorecards`, `interviewSlas`, `interviewBookingLinks`, `calendarEvents`(read), `hiringFlows`(+rounds), `offerLetterTemplates`, `richDocuments`(offer letter), `scorecardTemplates`, `scheduledReports`.
RBAC: `withAuth` + inline role-gate; `manage hr:employees` on offer-letter.
Dependency: Slices 1, 7 (candidates/jobs). Port last within recruitment.

| Route | Methods | Key tables | RBAC |
|---|---|---|---|
| `recruitment/interviews/[interviewId]/ics` | GET | interviews, candidates (ICS gen) | auth-only + role-gate |
| `recruitment/interviews/[interviewId]/scorecard/summary` | GET | interviews, interviewScorecards | auth-only + role-gate |
| `recruitment/interviews/sla-report` | GET | candidateSlaTracking | auth-only + role-gate |
| `recruitment/interviews/slas` | GET, PUT | interviewSlas | auth-only + role-gate |
| `recruitment/interviewers/availability` | GET | calendarEvents(r), interviews (DB-only) | auth-only |
| `recruitment/interviewer-performance` | GET | interviews, interviewScorecards | auth-only + role-gate |
| `recruitment/booking-links` | GET | interviewBookingLinks | auth-only + role-gate |
| `recruitment/booking-links/[linkId]` | PATCH | interviewBookingLinks | auth-only + role-gate |
| `recruitment/hiring-flows` | GET, POST | hiringFlows | auth-only + role-gate |
| `recruitment/hiring-flows/[flowId]` | DELETE, GET, PATCH | hiringFlows | auth-only + role-gate |
| `recruitment/hiring-flows/[flowId]/rounds` | GET, POST | hiringFlowRounds | auth-only + role-gate |
| `recruitment/hiring-flows/[flowId]/rounds/[roundId]` | DELETE, PATCH | hiringFlowRounds | auth-only + role-gate |
| `recruitment/offer-templates` | GET, POST | offerLetterTemplates | auth-only + role-gate |
| `recruitment/offer-templates/[templateId]` | DELETE, PATCH | offerLetterTemplates | auth-only + role-gate |
| `recruitment/offer-templates/[templateId]/generate-pdf` | POST | offerLetterTemplates (pdf-lib in-process) | auth-only + role-gate |
| `recruitment/offer-letter` | POST | richDocuments, candidates, jobPostings | manage hr:employees |
| `recruitment/scorecard-templates` | GET, POST | scorecardTemplates | auth-only + role-gate |
| `recruitment/scorecard-templates/[templateId]` | DELETE, PATCH | scorecardTemplates | auth-only + role-gate |
| `recruitment/scorecard-analytics` | GET | interviewScorecards | auth-only + role-gate |
| `recruitment/analytics` | GET | candidates, candidateSlaTracking | auth-only |
| `recruitment/stats` | GET | candidates, interviews, jobPostings | auth-only |
| `recruitment/reports/generate` | POST | candidateOffers, candidates, interviews, jobPostings | auth-only + role-gate |
| `recruitment/reports/scheduled` | GET, POST | scheduledReports (definitions) | auth-only + role-gate |
| `recruitment/reports/scheduled/[reportId]` | DELETE | scheduledReports | auth-only + role-gate |

> Note: `recruitment/interviews` (GET/POST), `/[interviewId]` (PATCH/DELETE), `/[interviewId]/scorecard` (POST) are DEFERRED (automation engine); `/schedule` & `/self-schedule` DEFERRED (email + Twilio + Google Calendar) — see §3.

---

## 3. DEFERRED routes (42) — by blocking integration

| Route | Methods | Key tables | Auth | Blocker(s) |
|---|---|---|---|---|
| `assets` | GET, PATCH, POST | assets | withAuth + manage hr:assets | **Email** (`sendAssetAssignedEmail`) |
| `assets/[assetId]` | PATCH | assets | withAuth + manage hr:assets | **Email** |
| `exit/route` | GET, POST | resignations | approve hr:leaves / manage all | **Email** + automation |
| `exit/[resignationId]/route` | GET, PATCH | resignations, exitChecklists, fnfSettlements | approve hr:leaves | **Email** |
| `expenses/route` | GET, POST | expenses | approve hr:expenses | **Email** + automation |
| `expenses/[expenseId]` | DELETE, PATCH | expenses | approve hr:expenses | **Email** |
| `expenses/email-report` | POST | (server-action) | read hr:expenses | **Email** (via `@/server/actions/expense-export`) |
| `helpdesk` | GET, POST | helpdeskTickets | manage hr:employees | **Email** |
| `holidays` | GET, POST | holidays | manage hr:attendance | **Email** (broadcast) — *note: `holidays/[id]` & `/calendar` are PORTABLE (Slice 1)* |
| `integrations/send-email` | POST | candidates, emailTemplates | manage settings | **Email** + inngest |
| `leaves/route` | GET, POST | leaveRequests, leaveBalances | withAuth | **Email** + automation (+seeds leaveBalances) |
| `leaves/[leaveId]/approve` | PUT | leaveRequests, leaveBalances | withAuth | **Email** + in-app notify + automation |
| `leaves/[leaveId]/reject` | PUT | leaveRequests | withAuth | **Email** + in-app notify |
| `leaves/[leaveId]/cancel` | PATCH | leaveRequests | withAuth | **Email** |
| `onboarding/reminders` | POST | notifications, onboardingTasks | manage hr:onboarding | **Email** |
| `payrolls/[payrollId]/approve` | PATCH | payrolls | withModuleAbility hr approve hr:payroll | **Email** |
| `payrolls/[payrollId]/paid` | PATCH | payrolls | withModuleAbility hr manage hr:payrolls | **Email** (+ in-process PDF) |
| `performance/reviews` | GET, POST | performanceReviews | manage hr:performance | **Email** |
| `recruitment/candidates/[candidateId]/route` | DELETE, GET, PATCH | candidates, candidateApplications, interviews | auth + role-gate | **Email** + in-app notify |
| `recruitment/candidates/[candidateId]/stage` | PATCH | candidates, candidateSlaTracking | auth + role-gate | **Email** + in-app notify + automation |
| `recruitment/candidates/bulk-reject` | POST | candidates, candidateApplications | auth + role-gate | **Email** |
| `recruitment/interviews/self-schedule` | POST | interviewBookingLinks | auth + role-gate | **Email** |
| `recruitment/messages` | GET, POST | candidateMessages | auth + role-gate | **Email** |
| `termination/[terminationId]/send-email` | POST | terminations | auth + role-gate | **Email** (+ in-process PDF) |
| `work-logs/status` | PATCH | timesheets | manage hr:attendance | **Email** |
| `recruitment/interviews/schedule` | POST | interviews, calendarEvents | auth + role-gate | **Email** + **Twilio/WhatsApp** + **Google Calendar** + notify + automation |
| `exit/[resignationId]/ceo-review` | PATCH | resignations | withAuth | **Automation engine** |
| `exit/[resignationId]/hr-review` | PATCH | resignations | manage hr:exit | **Automation engine** (inngest) |
| `performance/cycles` | GET, POST | reviewCycles | manage hr:performance | **Automation engine** |
| `recruitment/candidates/[candidateId]/applications` | POST | candidateApplications | auth + role-gate | **Automation engine** |
| `recruitment/candidates/[candidateId]/bgv-status` | PATCH | candidates | auth + role-gate | **Automation engine** |
| `recruitment/candidates/[candidateId]/offers/[offerId]` | DELETE, PATCH | candidateOffers | auth + role-gate | **Automation engine** |
| `recruitment/interviews` | GET, POST | interviews, candidates | auth + role-gate | **Automation engine** |
| `recruitment/interviews/[interviewId]` | DELETE, PATCH | interviews | auth + role-gate | **Automation engine** (inngest) |
| `recruitment/interviews/[interviewId]/scorecard` | GET, POST | interviewScorecards | auth + role-gate | **Automation engine** (inngest) |
| `reimbursements/[reimbursementId]` | PATCH | reimbursements | approve hr:expenses | **Automation engine** |
| `recruitment/candidates/[candidateId]/ai-score` | POST | candidates | auth + role-gate | **AI/Gemini** |
| `recruitment/candidates/[candidateId]/composite-score` | POST | candidates(r), interviews | auth + role-gate | **AI/Gemini** |
| `recruitment/candidates/[candidateId]/resume-parse` | POST | candidates | auth + role-gate | **AI/Gemini** (resume-parser) |
| `integrations/google-calendar` | POST | interviews, users(r) | withAuth | **Google Calendar OAuth** |
| `recruitment/candidates/[candidateId]/rollout-documents` | GET, POST | candidateDocuments | auth + role-gate | **E-sign** (documenso) + email + inngest |
| `recruitment/candidates/[candidateId]/vault/[documentId]` | DELETE, GET | candidateDocumentsVault, vaultAccessLogs | auth + role-gate | **R2 storage** (signed-URL download) |

> Automation-engine routes use fire-and-forget `void import("@/lib/services/automation/engine").then(runAutomationsForEvent)` or `inngest.send`. They can be **made PORTABLE-NOW by stubbing/queuing the event emission** if the migration team accepts deferring the workflow side-effect; counted DEFERRED here per the rules.

---

## 4. STAYS-FRONTEND routes (9) — users/identity table or NextAuth session boundary

| Route | Methods | Identity coupling | Reason |
|---|---|---|---|
| `employees/onboard` | POST | writes `users` + `organizationMembers` + `passwordResetTokens` (+ `salaryStructures`) | **Hard** — full identity provisioning; the canonical NextAuth boundary. Auth: `manage hr:employees`. |
| `employees/[employeeId]` | GET, PATCH | writes `users` (role, isActive, salary, profile) + `invalidateUserSession` + `inngest` + `sendTerminationEmail` | **Hard** — identity mutation, session invalidation, role changes. Auth: `manage hr:employees`/HR/CEO. |
| `change-password` | PATCH | writes `users.password` + `passwordHistory` | **Hard** — NextAuth credential. Auth: withAuth (self). |
| `my-profile` | GET, PATCH | writes `users` (own name/phone/bank/whatsapp/emergency) | **Hard** — direct `users` write. Auth: withAuth (self). |
| `termination/[terminationId]/complete` | PATCH | writes `users.isActive=false` (deactivation) + automation + fnf/assetReturns | **Hard** — identity deactivation. Auth: withAuth + HR/CEO role. |
| `sessions` | GET, DELETE | `userSessions` + redis `revoked:session:*` revocation | **Session boundary** — same revocation keys `withAuth` reads. Auth: withAuth (self). |
| `sessions/[sessionId]` | DELETE | `userSessions` + redis `revoked:session:*` revocation | **Session boundary**. Auth: withAuth (self). |
| `onboarding-docs` | GET, POST | writes `onboardingDocuments`/`documentAuditLogs` **and** `users.onboardingDocStatus` (via `recalcOnboardingStatus`) + automation | **Soft** — only `users` write is a denormalized status column; becomes PORTABLE if that column moves off `users` or the recalc is delegated. Auth: withAuth + manage hr:documents/onboarding. |
| `onboarding-docs/[docId]` | GET, PATCH | writes `onboardingDocuments`/`documentAuditLogs` + `users.onboardingDocStatus` (imports `recalcOnboardingStatus`) | **Soft** — same status-column coupling as above. Auth: manage hr:documents/onboarding. |

> The two `onboarding-docs` routes and `sessions/*` are the soft cases: with a small schema change (move `onboardingDocStatus` off `users`) or backend ownership of `userSessions` + the redis revocation keys, they could migrate to PORTABLE. The five **Hard** rows are genuine NextAuth-owned identity boundaries.

---

## 5. Per-slice confidence

| Slice | Routes (portable) | Confidence | Caveat |
|---|---:|---|---|
| 1 Org Config & Reference | 24 | HIGH | leaf CRUD, no hidden integration (`holidays` collection POST is deferred-email) |
| 2 Time (leave/attendance/wfh/work-logs) | 21 | HIGH | leave *write* path (apply/approve) is deferred; reads portable |
| 3 Directory/Org/Assets | 24 | HIGH | all `users` access is read-only |
| 4 Performance/Engagement/Documents | 26 | HIGH | review *create* (email) & cycle *create* (automation) deferred |
| 5 Payroll/Comp/Finance | 26 | HIGH | payroll approve/paid (email) & reimbursement PATCH (automation) deferred |
| 6 Lifecycle/Analytics/Dashboards | 23 | HIGH | dashboards are cross-domain reads; port near-last |
| 7 Recruitment Core | ~47 | HIGH | mostly role-gated (not ability subjects); upload routes store URL strings (portable) |
| 8 Recruitment Interviews/Offers/Reporting | ~24 | MEDIUM-HIGH | interview *mutation* routes deferred (automation/email/calendar); reads/templates portable |

Slice route counts above are the PORTABLE-NOW members and sum exactly to **215** (24+21+24+26+26+23+47+24). The `holidays` resource splits: collection POST is deferred-email (§3); `holidays/[holidayId]` + `holidays/calendar` are portable (Slice 1). The authoritative per-route classification for all 266 files is the union of §2 (portable, by slice), §3 (deferred, 42), and §4 (stays-frontend, 9).
