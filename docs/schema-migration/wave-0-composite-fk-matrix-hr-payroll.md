---
wave: 0
type: composite-FK matrix (HR + payroll)
status: DRAFT
date: 2026-07-26
---

# Wave 0 — Composite-FK Gate Matrix: HR + Payroll domains

> Extends `wave-7-composite-fk-matrix.md` (W7-E + W7-F clusters).
> That document covers ~9 tables already; this document covers the remaining ~130+ HR/payroll tables.
> Do NOT duplicate rows from wave-7 for: `hr_people`, `hr_employments`, `hr_leave_types`,
> `hr_leave_requests`, `hr_leave_balances`, `payroll_runs`, `payroll_run_employees`,
> `hr_payroll_input_periods`, `hr_payroll_input_snapshots`.

## Source files read (this session)

| Sub-file | Read |
|---|---|
| `backend/src/db/schema/hr/employees.ts` | ✔ |
| `backend/src/db/schema/hr/core-people.ts` | ✔ |
| `backend/src/db/schema/hr/core-org.ts` | ✔ |
| `backend/src/db/schema/hr/leaves.ts` | ✔ (wave-7 already covers) |
| `backend/src/db/schema/hr/leave-policies.ts` | ✔ |
| `backend/src/db/schema/hr/leave-ledger.ts` | ✔ |
| `backend/src/db/schema/hr/attendance.ts` | ✔ |
| `backend/src/db/schema/hr/attendance-regularizations.ts` | ✔ |
| `backend/src/db/schema/hr/shifts.ts` | ✔ |
| `backend/src/db/schema/hr/rosters.ts` | ✔ |
| `backend/src/db/schema/hr/geofencing.ts` | ✔ |
| `backend/src/db/schema/hr/biometric.ts` | ✔ |
| `backend/src/db/schema/hr/performance.ts` | ✔ |
| `backend/src/db/schema/hr/kpis.ts` | ✔ |
| `backend/src/db/schema/hr/feedback.ts` | ✔ |
| `backend/src/db/schema/hr/announcements.ts` | ✔ |
| `backend/src/db/schema/hr/learning.ts` | ✔ |
| `backend/src/db/schema/hr/training.ts` | ✔ |
| `backend/src/db/schema/hr/travel.ts` | ✔ |
| `backend/src/db/schema/hr/overtime.ts` | ✔ |
| `backend/src/db/schema/hr/allowances.ts` | ✔ |
| `backend/src/db/schema/hr/salary-structure-templates.ts` | ✔ |
| `backend/src/db/schema/hr/assets.ts` | ✔ |
| `backend/src/db/schema/hr/documents.ts` | ✔ |
| `backend/src/db/schema/hr/benefits.ts` | ✔ |
| `backend/src/db/schema/hr/bank-transfers.ts` | ✔ |
| `backend/src/db/schema/hr/tax.ts` | ✔ |
| `backend/src/db/schema/hr/probation.ts` | ✔ |
| `backend/src/db/schema/hr/succession.ts` | ✔ |
| `backend/src/db/schema/hr/cases.ts` | ✔ |
| `backend/src/db/schema/hr/safety.ts` | ✔ |
| `backend/src/db/schema/hr/access-requests.ts` | ✔ |
| `backend/src/db/schema/hr/core-audit.ts` | ✔ |
| `backend/src/db/schema/hr/requisitions.ts` | ✔ |
| `backend/src/db/schema/hr/hiring.ts` | ✔ |
| `backend/src/db/schema/hr/offboarding.ts` | ✔ |
| `backend/src/db/schema/hr/talent-pools.ts` | ✔ |
| `backend/src/db/schema/hr/staffing.ts` | ✔ |
| `backend/src/db/schema/hr/job-boards.ts` | ✔ |
| `backend/src/db/schema/hr/webhooks.ts` | ✔ |
| `backend/src/db/schema/hr/enterprise-comp.ts` | ✔ |
| `backend/src/db/schema/hr/enterprise-ops.ts` | ✔ |
| `backend/src/db/schema/hr/global-compliance.ts` | ✔ |
| `backend/src/db/schema/hr/workforce-planning.ts` | ✔ |
| `backend/src/db/schema/hr/governance.ts` | ✔ |
| `backend/src/db/schema/hr/import-jobs.ts` | ✔ |
| `backend/src/db/schema/hr/workflow-engine.ts` | ✔ |
| `backend/src/db/schema/hr/policy-engine.ts` | ✔ |
| `backend/src/db/schema/hr/template-engine.ts` | ✔ |
| `backend/src/db/schema/hr/automation-engine.ts` | ✔ |
| `backend/src/db/schema/hr/engagement-extras.ts` | ✔ |
| `backend/src/db/schema/hr/payroll-policies.ts` | ✔ |
| `backend/src/db/schema/hr/payroll-inputs.ts` | ✔ (partial: periods+snapshots in wave-7) |
| `backend/src/db/schema/hr/payroll-workforce.ts` | ✔ |
| `backend/src/db/schema/hr/payroll-payout.ts` | ✔ |
| `backend/src/db/schema/hr/payroll-runs.ts` | ✔ (partial: runs+employees in wave-7) |
| `backend/src/db/schema/hr/payroll.ts` | ✔ |

## Universal findings across HR + payroll

1. **NO type mismatch anywhere** — all `org_id` columns are `text`; `organizations.id` is `text`. ✔ across the board (unlike billing W7-HOTFIX).
2. **NO table uses composite `foreignKey({columns, foreignColumns})`** — every existing FK is single-column `.references()`. This is the universal gap.
3. **NO parent table has `UNIQUE(org_id, id)` candidate key** — prerequisite is missing everywhere. All must be added before any child composite FK can be created.
4. **Cross-module FKs** (HR→projects, HR→accounting) require coordination with those modules' waves; they are noted but their composite FK is deferred to a cross-module wave.

## Special table categories

### Tables missing `org_id` entirely (IMPLICIT-TENANT via parent FK)
These cannot have a composite FK to the parent until `org_id` is ADDED to the table first.
Before migrating these, add `org_id text NOT NULL REFERENCES organizations(id)` + backfill from parent.

| Table | Missing org_id | Parent FK column | Notes |
|---|---|---|---|
| `department_members` | ✔ | `department_id → departments` | No org_id col at all |
| `roster_entries` | ✔ | `roster_id → rosters` | No org_id col |
| `key_results` | ✔ | `goal_id → goals` | No org_id col |
| `survey_responses` | ✔ | `survey_id → pulse_surveys` | No org_id col |
| `assessment_attempts` | ✔ | `assessment_id → skill_assessments` | No org_id col |
| `competencies` | ✔ | `framework_id → competency_frameworks` | No org_id col |
| `feedback_cycle_requests` | ✔ | `cycle_id → feedback_cycles` | No org_id col |
| `feedback_cycle_responses` | ✔ | `request_id → feedback_cycle_requests` | No org_id col; 2-hop dependency |
| `announcement_reads` | ✔ | `announcement_id → announcements` | No org_id col |
| `course_enrollments` | ✔ | `course_id → courses` | No org_id col |
| `training_attendance` | ✔ | `program_id → training_programs` | No org_id col |
| `team_event_participants` | ✔ | `event_id → team_events` | No org_id col |
| `interview_scorecards` | ✔ | `interview_id → interviews` | No org_id col |
| `booking_link_interviewers` | ✔ | `booking_link_id → interview_booking_links` | No org_id col |
| `vault_access_logs` | ✔ | `vault_document_id → candidate_documents_vault` | No org_id col |
| `email_sequence_steps` | ✔ | `sequence_id → email_sequences` | No org_id col |
| `email_sequence_enrollments` | ✔ | `sequence_id → email_sequences` | No org_id col |
| `vendor_candidate_submissions` | ✔ | `vendor_id → recruitment_vendors` | No org_id col |
| `job_recruiters` | ✔ | `job_posting_id → job_postings` | No org_id col |
| `onboarding_template_steps` | ✔ | `template_id → onboarding_templates` | No org_id col |
| `exit_checklists` | ✔ | `resignation_id → resignations` | No org_id col |
| `hr_poll_votes` | ✔ | `poll_id → hr_polls` | No org_id col |
| `hr_community_members` | ✔ | `community_id → hr_communities` | No org_id col |
| `hr_workflow_steps` | ✔ | `definition_id → hr_workflow_definitions` | No org_id col |
| `hr_import_rows` | ✔ (UUID PK) | `job_id → hr_import_jobs` | No org_id col; UUID PK |

### Tables with missing `.references()` on FK columns (bare integer, no constraint)
These columns have no DB-enforced FK at all — the application references a parent by ID but the column carries no `.references()`. Must add single-column FK first, then composite FK.

| Table | Column | Intended parent | Notes |
|---|---|---|---|
| `hr_employments` | `job_role_id` | `hr_job_roles` | Bare integer |
| `hr_employments` | `job_level_id` | `hr_job_levels` | Bare integer |
| `hr_employments` | `employment_type_id` | *(no enum table found)* | Bare integer; may be enum |
| `hr_employments` | `location_id` | `hr_locations` | Bare integer |
| `hr_loan_repayments` | `loan_id` | `salary_loans` | Bare integer |
| `hr_travel_visit_logs` | `travel_request_id` | `travel_requests` | Bare integer |
| `hr_attendance_regularizations` | `attendance_id` | `attendance` | Bare integer |
| `hr_disciplinary_actions` | `letter_render_id` | `hr_template_renders` | Bare integer; nullable |
| `hr_positions` | `job_level_id` | `hr_job_levels` | Bare integer; nullable |
| `hr_hiring_plan_items` | `linked_requisition_id` | `job_requisitions` | Bare integer; nullable |
| `job_requisitions` | `linked_job_id` | `job_postings` | Bare integer; nullable |
| `hr_teams` | `parent_team_id` | `hr_teams` (self-ref) | Self-ref; no `.references()` |
| `payroll_accounting_mappings` | `component_id` | `salary_components` | Bare integer |
| `employee_salary_profiles` | `policy_version_id` | `payroll_policy_versions` | Bare integer; nullable |
| `payroll_line_items` | `component_id` | `salary_components` | Bare integer; nullable |
| `hr_templates` | `parent_template_id` | `hr_templates` (self-ref) | Self-ref; no `.references()` |
| `hr_policies` | `parent_policy_id` | `hr_policies` (self-ref) | Self-ref; no `.references()` |
| `hr_automation_runs` | `triggered_by_run_id` | `hr_automation_runs` (self-ref) | Self-ref; no `.references()` |
| `hr_time_devices` | `location_id` | `hr_locations` | Bare integer |
| `hr_emergency_events` | `location_id` | *(text col, no parent table)* | text, no `.references()` |
| `hr_access_requests` | `employee_id` | `hr_people` or `users` | text, no `.references()` |
| `hr_template_renders` | `rendered_for_employee_id` | `hr_employments` | Bare integer; nullable |
| `expenses` | `reimbursement_batch_id` | `reimbursements` | Bare integer; nullable |

---

## Per-table composite FK matrix

> Column key:
> - **org_id present?** — is `org_id` column present on the child table (N = must add first)
> - **Existing ID type** — child FK column type
> - **Target ID type** — parent PK type
> - **Type match** — do child FK col type and parent PK type agree (✔/❌)
> - **Parent UNIQUE(org_id,id)?** — does parent have `UNIQUE(org_id, id)` candidate key (all: ❌ — none do yet)
> - **Composite FK def** — the `foreignKey({...})` call needed
> - **Wave** — which sub-wave within W7-E/W7-F applies
> - **Validation** — DRAFT / TODO / DONE

### GROUP 1: Core org structure (employees.ts, core-org.ts)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `departments` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Direct tenant anchor — add `UNIQUE(org_id,id)` on departments for children | NOT NULL | `SELECT id FROM departments WHERE org_id NOT IN (SELECT id FROM organizations)` → delete | W7-E | DRAFT |
| `departments` | `manager_id` | `users` | ✔ | text | text | ✔ | N/A (users is global) | `foreignKey({columns:[orgId,managerId], foreignColumns:[users.orgId?]})` — users is global-identity, EXEMPT from composite FK | nullable | n/a | W7-E | DRAFT |
| `department_members` | `department_id` | `departments` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then `foreignKey({columns:[orgId,departmentId], foreignColumns:[departments.orgId,departments.id]})` | NOT NULL | `SELECT id FROM department_members WHERE department_id NOT IN (SELECT id FROM departments)` | W7-E | DRAFT |
| `hr_job_roles` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` on hr_job_roles | NOT NULL | `SELECT id FROM hr_job_roles WHERE org_id NOT IN (SELECT id FROM organizations)` | W7-E | DRAFT |
| `hr_job_levels` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` on hr_job_levels | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_teams` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` on hr_teams | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_teams` | `parent_team_id` | `hr_teams` (self-ref) | ✔ | integer | integer | ✔ | ❌ | **ADD `.references()` first**; then self-ref composite FK — `foreignKey({columns:[orgId,parentTeamId], foreignColumns:[hrTeams.orgId,hrTeams.id]})` | nullable | `SELECT id FROM hr_teams WHERE parent_team_id IS NOT NULL AND parent_team_id NOT IN (SELECT id FROM hr_teams)` | W7-E | DRAFT |
| `hr_locations` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` on hr_locations | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_custom_field_definitions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor; also self-ref on `field_definition_id` needs fixing | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_custom_field_values` | `field_definition_id` | `hr_custom_field_definitions` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,fieldDefinitionId], foreignColumns:[hrCustomFieldDefinitions.orgId,hrCustomFieldDefinitions.id]})` | NOT NULL | `SELECT id FROM hr_custom_field_values WHERE (org_id,field_definition_id) NOT IN (SELECT org_id,id FROM hr_custom_field_definitions)` | W7-E | DRAFT |

### GROUP 2: Core people (core-people.ts) — partial (hr_people + hr_employments in wave-7)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_employments` | `job_role_id` | `hr_job_roles` | ✔ | integer (bare, no `.references()`) | integer | ✔ | ❌ | **ADD `.references()` first**; then `foreignKey({columns:[orgId,jobRoleId], foreignColumns:[hrJobRoles.orgId,hrJobRoles.id]})` | nullable | `SELECT id FROM hr_employments WHERE job_role_id IS NOT NULL AND (org_id,job_role_id) NOT IN (SELECT org_id,id FROM hr_job_roles)` | W7-E | DRAFT |
| `hr_employments` | `job_level_id` | `hr_job_levels` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern → hr_job_levels | W7-E | DRAFT |
| `hr_employments` | `location_id` | `hr_locations` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern → hr_locations | W7-E | DRAFT |
| `hr_employee_profiles` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,employmentId], foreignColumns:[hrEmployments.orgId,hrEmployments.id]})` | NOT NULL | `SELECT id FROM hr_employee_profiles WHERE (org_id,employment_id) NOT IN (SELECT org_id,id FROM hr_employments)` | W7-E | DRAFT |
| `hr_employee_sensitive_fields` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_employment_history` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_effective_dated_changes` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_reporting_lines` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_reporting_lines` | `manager_employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,managerEmploymentId], foreignColumns:[hrEmployments.orgId,hrEmployments.id]})` | nullable | Same pattern | W7-E | DRAFT |

### GROUP 3: Leave system (leave-policies.ts, leave-ledger.ts, attendance.ts)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `leave_policies` | `leave_type_id` | `leave_types` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,leaveTypeId], foreignColumns:[leaveTypes.orgId,leaveTypes.id]})` | NOT NULL | `SELECT id FROM leave_policies WHERE (org_id,leave_type_id) NOT IN (SELECT org_id,id FROM leave_types)` | W7-E | DRAFT |
| `hr_leave_ledger` | `leave_type_id` | `leave_types` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `leave_blackout_dates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only (no HR parent FK) | NOT NULL | `SELECT id FROM leave_blackout_dates WHERE org_id NOT IN (SELECT id FROM organizations)` | W7-E | DRAFT |
| `attendance` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` on attendance for children | NOT NULL | Same pattern | W7-E | DRAFT |
| `holidays` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `wfh_requests` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only (users FKs are global-identity exempt) | NOT NULL | Same pattern | W7-E | DRAFT |
| `helpdesk_tickets` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for hr_helpdesk_comments | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_helpdesk_routing` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_helpdesk_comments` | `ticket_id` | `helpdesk_tickets` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,ticketId], foreignColumns:[helpdeskTickets.orgId,helpdeskTickets.id]})` | NOT NULL | `SELECT id FROM hr_helpdesk_comments WHERE (org_id,ticket_id) NOT IN (SELECT org_id,id FROM helpdesk_tickets)` | W7-E | DRAFT |
| `employee_devices` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 4: Attendance regularizations + shifts + rosters

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_attendance_regularizations` | `attendance_id` | `attendance` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then `foreignKey({columns:[orgId,attendanceId], foreignColumns:[attendance.orgId,attendance.id]})` | nullable | `SELECT id FROM hr_attendance_regularizations WHERE attendance_id IS NOT NULL AND (org_id,attendance_id) NOT IN (SELECT org_id,id FROM attendance)` | W7-E | DRAFT |
| `shift_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for children | NOT NULL | Same pattern | W7-E | DRAFT |
| `employee_shift_assignments` | `shift_id` | `shift_templates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,shiftId], foreignColumns:[shiftTemplates.orgId,shiftTemplates.id]})` | NOT NULL | `SELECT id FROM employee_shift_assignments WHERE (org_id,shift_id) NOT IN (SELECT org_id,id FROM shift_templates)` | W7-E | DRAFT |
| `shift_swap_requests` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `rosters` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for roster_entries | NOT NULL | Same pattern | W7-E | DRAFT |
| `roster_entries` | `roster_id` | `rosters` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then `foreignKey({columns:[orgId,rosterId], foreignColumns:[rosters.orgId,rosters.id]})` | NOT NULL | `SELECT id FROM roster_entries WHERE roster_id NOT IN (SELECT id FROM rosters)` | W7-E | DRAFT |
| `roster_entries` | `shift_id` | `shift_templates` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | nullable | Same pattern | W7-E | DRAFT |
| `geofences` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 5: Biometric

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `biometric_devices` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for biometric_logs | NOT NULL | Same pattern | W7-E | DRAFT |
| `biometric_logs` | `device_id` | `biometric_devices` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,deviceId], foreignColumns:[biometricDevices.orgId,biometricDevices.id]})` | NOT NULL | `SELECT id FROM biometric_logs WHERE (org_id,device_id) NOT IN (SELECT org_id,id FROM biometric_devices)` | W7-E | DRAFT |

### GROUP 6: Performance + OKR + feedback + recognition

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `review_cycles` | `template_id` | `hr_templates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,templateId], foreignColumns:[hrTemplates.orgId,hrTemplates.id]})` | nullable | `SELECT id FROM review_cycles WHERE template_id IS NOT NULL AND (org_id,template_id) NOT IN (SELECT org_id,id FROM hr_templates)` | W7-E | DRAFT |
| `performance_reviews` | `cycle_id` | `review_cycles` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,cycleId], foreignColumns:[reviewCycles.orgId,reviewCycles.id]})` | NOT NULL | `SELECT id FROM performance_reviews WHERE (org_id,cycle_id) NOT IN (SELECT org_id,id FROM review_cycles)` | W7-E | DRAFT |
| `one_on_one_meetings` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for action items | NOT NULL | Same pattern | W7-E | DRAFT |
| `one_on_one_action_items` | `meeting_id` | `one_on_one_meetings` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,meetingId], foreignColumns:[oneOnOneMeetings.orgId,oneOnOneMeetings.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `goals` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for children | NOT NULL | Same pattern | W7-E | DRAFT |
| `goals` | `parent_goal_id` | `goals` (self-ref) | ✔ | integer | integer | ✔ | ❌ | Self-ref composite FK: `foreignKey({columns:[orgId,parentGoalId], foreignColumns:[goals.orgId,goals.id]})` | nullable | `SELECT id FROM goals WHERE parent_goal_id IS NOT NULL AND (org_id,parent_goal_id) NOT IN (SELECT org_id,id FROM goals)` | W7-E | DRAFT |
| `key_results` | `goal_id` | `goals` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM key_results WHERE goal_id NOT IN (SELECT id FROM goals)` | W7-E | DRAFT |
| `performance_improvement_plans` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `pulse_surveys` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for survey_responses | NOT NULL | Same pattern | W7-E | DRAFT |
| `survey_responses` | `survey_id` | `pulse_surveys` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM survey_responses WHERE survey_id NOT IN (SELECT id FROM pulse_surveys)` | W7-E | DRAFT |
| `feedback_requests` | `cycle_id` | `review_cycles` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,cycleId], foreignColumns:[reviewCycles.orgId,reviewCycles.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `enps_scores` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `recognitions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `employee_skills` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `skill_assessments` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for assessment_attempts | NOT NULL | Same pattern | W7-E | DRAFT |
| `assessment_attempts` | `assessment_id` | `skill_assessments` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM assessment_attempts WHERE assessment_id NOT IN (SELECT id FROM skill_assessments)` | W7-E | DRAFT |
| `hr_calibration_entries` | `cycle_id` | `review_cycles` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,cycleId], foreignColumns:[reviewCycles.orgId,reviewCycles.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 7: KPIs + competencies

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `kpi_definitions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `competency_frameworks` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for competencies | NOT NULL | Same pattern | W7-E | DRAFT |
| `competencies` | `framework_id` | `competency_frameworks` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM competencies WHERE framework_id NOT IN (SELECT id FROM competency_frameworks)` | W7-E | DRAFT |

### GROUP 8: Feedback cycles

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `feedback_cycles` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `feedback_cycle_requests` | `cycle_id` | `feedback_cycles` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM feedback_cycle_requests WHERE cycle_id NOT IN (SELECT id FROM feedback_cycles)` | W7-E | DRAFT |
| `feedback_cycle_responses` | `request_id` | `feedback_cycle_requests` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first (2-hop)**; then composite FK | NOT NULL | Same pattern via chain | W7-E | DRAFT |

### GROUP 9: Announcements + learning + training + team events

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `announcements` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `announcement_targets` | `announcement_id` | `announcements` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,announcementId], foreignColumns:[announcements.orgId,announcements.id]})` | NOT NULL | `SELECT id FROM announcement_targets WHERE (org_id,announcement_id) NOT IN (SELECT org_id,id FROM announcements)` | W7-E | DRAFT |
| `announcement_reads` | `announcement_id` | `announcements` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM announcement_reads WHERE announcement_id NOT IN (SELECT id FROM announcements)` | W7-E | DRAFT |
| `course_categories` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `courses` | `category_id` | `course_categories` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,categoryId], foreignColumns:[courseCategories.orgId,courseCategories.id]})` | NOT NULL | `SELECT id FROM courses WHERE (org_id,category_id) NOT IN (SELECT org_id,id FROM course_categories)` | W7-E | DRAFT |
| `course_enrollments` | `course_id` | `courses` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM course_enrollments WHERE course_id NOT IN (SELECT id FROM courses)` | W7-E | DRAFT |
| `training_programs` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `training_attendance` | `program_id` | `training_programs` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM training_attendance WHERE program_id NOT IN (SELECT id FROM training_programs)` | W7-E | DRAFT |
| `team_events` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `team_event_participants` | `event_id` | `team_events` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM team_event_participants WHERE event_id NOT IN (SELECT id FROM team_events)` | W7-E | DRAFT |

### GROUP 10: Travel + overtime + allowances + assets

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `travel_requests` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for hr_travel_visit_logs | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_travel_visit_logs` | `travel_request_id` | `travel_requests` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | NOT NULL | `SELECT id FROM hr_travel_visit_logs WHERE (org_id,travel_request_id) NOT IN (SELECT org_id,id FROM travel_requests)` | W7-E | DRAFT |
| `overtime_requests` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `comp_off_balances` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `allowance_types` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `salary_structure_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `assets` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for asset_returns | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 11: Documents + handbook + policies

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `rich_documents` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for handbook_versions | NOT NULL | Same pattern | W7-E | DRAFT |
| `documents` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for children | NOT NULL | Same pattern | W7-E | DRAFT |
| `documents` | `department_id` | `departments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,departmentId], foreignColumns:[departments.orgId,departments.id]})` | nullable | `SELECT id FROM documents WHERE department_id IS NOT NULL AND (org_id,department_id) NOT IN (SELECT org_id,id FROM departments)` | W7-E | DRAFT |
| `documents` | `parent_document_id` | `documents` (self-ref) | ✔ | integer | integer | ✔ | ❌ | Self-ref composite FK | nullable | Same pattern | W7-E | DRAFT |
| `handbook_versions` | `document_id` | `rich_documents` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,documentId], foreignColumns:[richDocuments.orgId,richDocuments.id]})` | NOT NULL | `SELECT id FROM handbook_versions WHERE (org_id,document_id) NOT IN (SELECT org_id,id FROM rich_documents)` | W7-E | DRAFT |
| `policy_acknowledgments` | `document_id` | `documents` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,documentId], foreignColumns:[documents.orgId,documents.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_email_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 12: Benefits + dependents + loans

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_benefit_plans` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for children | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_benefit_enrollment_windows` | `plan_id` | `hr_benefit_plans` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,planId], foreignColumns:[hrBenefitPlans.orgId,hrBenefitPlans.id]})` | NOT NULL | `SELECT id FROM hr_benefit_enrollment_windows WHERE (org_id,plan_id) NOT IN (SELECT org_id,id FROM hr_benefit_plans)` | W7-E | DRAFT |
| `hr_benefit_enrollments` | `plan_id` | `hr_benefit_plans` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_dependents` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_insurance_claims` | `plan_id` | `hr_benefit_plans` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_loan_repayments` | `loan_id` | `salary_loans` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then `foreignKey({columns:[orgId,loanId], foreignColumns:[salaryLoans.orgId,salaryLoans.id]})` | NOT NULL | `SELECT id FROM hr_loan_repayments WHERE (org_id,loan_id) NOT IN (SELECT org_id,id FROM salary_loans)` | W7-F | DRAFT |
| `bank_transfers` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |

### GROUP 13: Tax + probation + succession

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tax_declarations` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for investment_proofs | NOT NULL | Same pattern | W7-F | DRAFT |
| `investment_proofs` | `declaration_id` | `tax_declarations` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,declarationId], foreignColumns:[taxDeclarations.orgId,taxDeclarations.id]})` | NOT NULL | `SELECT id FROM investment_proofs WHERE (org_id,declaration_id) NOT IN (SELECT org_id,id FROM tax_declarations)` | W7-F | DRAFT |
| `hr_probation_reviews` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,employmentId], foreignColumns:[hrEmployments.orgId,hrEmployments.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_probation_reviews` | `person_id` | `hr_people` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,personId], foreignColumns:[hrPeople.orgId,hrPeople.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_probation_reviews` | `review_template_id` | `hr_templates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,reviewTemplateId], foreignColumns:[hrTemplates.orgId,hrTemplates.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `hr_role_skill_requirements` | `job_role_id` | `hr_job_roles` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,jobRoleId], foreignColumns:[hrJobRoles.orgId,hrJobRoles.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `hr_mentorships` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_succession_plans` | `job_role_id` | `hr_job_roles` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-E | DRAFT |

### GROUP 14: Cases + disciplinary + safety

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_cases` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for children | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_case_notes` | `case_id` | `hr_cases` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,caseId], foreignColumns:[hrCases.orgId,hrCases.id]})` | NOT NULL | `SELECT id FROM hr_case_notes WHERE (org_id,case_id) NOT IN (SELECT org_id,id FROM hr_cases)` | W7-E | DRAFT |
| `hr_case_documents` | `case_id` | `hr_cases` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_disciplinary_actions` | `case_id` | `hr_cases` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-E | DRAFT |
| `hr_disciplinary_actions` | `letter_render_id` | `hr_template_renders` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-E | DRAFT |
| `hr_safety_incidents` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_wellness_checkins` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 15: Access requests + audit (UUID PK tables)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_access_requests` (UUID PK) | `employee_id` | `hr_people` or `users` | ✔ | text (bare, no ref) | text/integer | ? | ❌ | **CLARIFY parent first**; if `hr_people` (integer PK) → type mismatch on employeeId text; if `users` (text PK) → global-identity exempt | nullable | `SELECT id FROM hr_access_requests WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id::text FROM hr_people)` | W7-E | DRAFT |
| `hr_audit_logs` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 16: Requisitions + hiring

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `job_requisitions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `job_requisitions` | `linked_job_id` | `job_postings` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | `SELECT id FROM job_requisitions WHERE linked_job_id IS NOT NULL AND (org_id,linked_job_id) NOT IN (SELECT org_id,id FROM job_postings)` | W7-E | DRAFT |
| `hiring_flows` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `scorecard_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hiring_flow_rounds` | `flow_id` | `hiring_flows` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,flowId], foreignColumns:[hiringFlows.orgId,hiringFlows.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hiring_flow_rounds` | `scorecard_template_id` | `scorecard_templates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,scorecardTemplateId], foreignColumns:[scorecardTemplates.orgId,scorecardTemplates.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `job_postings` | `hiring_flow_id` | `hiring_flows` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-E | DRAFT |
| `job_postings` | `department_id` | `departments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,departmentId], foreignColumns:[departments.orgId,departments.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `candidate_sources` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidates` | `duplicate_of_id` | `candidates` (self-ref) | ✔ | integer | integer | ✔ | ❌ | Self-ref composite FK | nullable | Same pattern | W7-E | DRAFT |
| `candidate_applications` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,candidateId], foreignColumns:[candidates.orgId,candidates.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_applications` | `job_posting_id` | `job_postings` | ✔ | integer | integer | ✔ | ❌ | Same pattern → job_postings | NOT NULL | Same pattern | W7-E | DRAFT |
| `interviews` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `interviews` | `job_posting_id` | `job_postings` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `interview_scorecards` | `interview_id` | `interviews` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | `SELECT id FROM interview_scorecards WHERE interview_id NOT IN (SELECT id FROM interviews)` | W7-E | DRAFT |
| `interview_scorecards` | `template_id` | `scorecard_templates` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `interview_booking_links` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_referrals` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `calibration_sessions` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `interview_panel_members` | `interview_id` | `interviews` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `booking_link_interviewers` | `booking_link_id` | `interview_booking_links` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `calibration_participants` | `session_id` | `calibration_sessions` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_documents_vault` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `vault_access_logs` | `vault_document_id` | `candidate_documents_vault` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `interview_slas` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_sla_tracking` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `interview_questions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_reference_checks` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_offers` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `offer_versions` | `offer_id` | `candidate_offers` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,offerId], foreignColumns:[candidateOffers.orgId,candidateOffers.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `offer_negotiations` | `offer_id` | `candidate_offers` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `pipeline_automations` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `offer_letter_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `email_sequences` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for steps/enrollments | NOT NULL | Same pattern | W7-E | DRAFT |
| `email_sequence_steps` | `sequence_id` | `email_sequences` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `email_sequence_enrollments` | `sequence_id` | `email_sequences` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `recruitment_vendors` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `vendor_candidate_submissions` | `vendor_id` | `recruitment_vendors` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `headcount_requests` | `department_id` | `departments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,departmentId], foreignColumns:[departments.orgId,departments.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_messages` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `job_recruiters` | `job_posting_id` | `job_postings` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `recruiter_activity_log` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-E | DRAFT |
| `recruiter_activity_log` | `job_posting_id` | `job_postings` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-E | DRAFT |
| `scheduled_reports` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 17: Offboarding + onboarding

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `document_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_documents` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,candidateId], foreignColumns:[candidates.orgId,candidates.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `candidate_documents` | `template_id` | `document_templates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,templateId], foreignColumns:[documentTemplates.orgId,documentTemplates.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `document_template_versions` | `template_id` | `document_templates` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `onboarding_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `onboarding_template_steps` | `template_id` | `onboarding_templates` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `document_types` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `onboarding_documents` | `document_type_id` | `document_types` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,documentTypeId], foreignColumns:[documentTypes.orgId,documentTypes.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `document_audit_logs` | `onboarding_document_id` | `onboarding_documents` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,onboardingDocumentId], foreignColumns:[onboardingDocuments.orgId,onboardingDocuments.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `onboarding_tasks` | `template_step_id` | `onboarding_template_steps` | ✔ | integer | integer | ✔ | ❌ | After org_id added to steps: `foreignKey({columns:[orgId,templateStepId], foreignColumns:[onboardingTemplateSteps.orgId,onboardingTemplateSteps.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `resignations` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `exit_checklists` | `resignation_id` | `resignations` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `terminations` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `alumni_profiles` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `background_verifications` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `certifications` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 18: Talent pools + staffing + job boards

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `talent_pools` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `talent_pool_members` | `pool_id` | `talent_pools` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,poolId], foreignColumns:[talentPools.orgId,talentPools.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `talent_pool_members` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern → candidates | NOT NULL | Same pattern | W7-E | DRAFT |
| `external_referrers` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `external_referrals` | `referrer_id` | `external_referrers` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,referrerId], foreignColumns:[externalReferrers.orgId,externalReferrers.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `external_referrals` | `candidate_id` | `candidates` | ✔ | integer | integer | ✔ | ❌ | Same pattern → candidates | NOT NULL | Same pattern | W7-E | DRAFT |
| `job_board_postings` | `job_posting_id` | `job_postings` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,jobPostingId], foreignColumns:[jobPostings.orgId,jobPostings.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 19: Webhooks

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_webhook_subscriptions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_webhook_deliveries` | `subscription_id` | `hr_webhook_subscriptions` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,subscriptionId], foreignColumns:[hrWebhookSubscriptions.orgId,hrWebhookSubscriptions.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 20: Enterprise comp + equity

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_time_devices` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for hr_device_sync_logs | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_time_devices` | `location_id` | `hr_locations` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-F | DRAFT |
| `hr_device_sync_logs` | `device_id` | `hr_time_devices` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,deviceId], foreignColumns:[hrTimeDevices.orgId,hrTimeDevices.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_device_employee_mappings` | `device_id` | `hr_time_devices` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_payroll_variance_approvals` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_arrears_adjustments` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_payroll_compliance_tasks` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_comp_cycles` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for children | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_comp_recommendations` | `cycle_id` | `hr_comp_cycles` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,cycleId], foreignColumns:[hrCompCycles.orgId,hrCompCycles.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_comp_budget_pools` | `cycle_id` | `hr_comp_cycles` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_comp_budget_pools` | `department_id` | `departments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,departmentId], foreignColumns:[departments.orgId,departments.id]})` | nullable | Same pattern | W7-F | DRAFT |
| `hr_equity_grants` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_equity_vesting_events` | `grant_id` | `hr_equity_grants` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,grantId], foreignColumns:[hrEquityGrants.orgId,hrEquityGrants.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `hr_equity_exercises` | `grant_id` | `hr_equity_grants` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-F | DRAFT |

### GROUP 21: Enterprise ops (UUID PK tables)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_accommodation_requests` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for hr_accommodation_tasks | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_accommodation_tasks` (UUID) | `request_id` | `hr_accommodation_requests` | ✔ | uuid | uuid | ✔ | ❌ | `foreignKey({columns:[orgId,requestId], foreignColumns:[hrAccommodationRequests.orgId,hrAccommodationRequests.id]})` | NOT NULL | `SELECT id FROM hr_accommodation_tasks WHERE (org_id,request_id) NOT IN (SELECT org_id,id FROM hr_accommodation_requests)` | W7-E | DRAFT |
| `hr_emergency_events` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for responses | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_emergency_responses` (UUID) | `event_id` | `hr_emergency_events` | ✔ | uuid | uuid | ✔ | ❌ | `foreignKey({columns:[orgId,eventId], foreignColumns:[hrEmergencyEvents.orgId,hrEmergencyEvents.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_access_provisioning` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_access_provisioning_templates` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_simulations` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_event_stream` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 22: Global compliance + governance

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_work_authorizations` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,employmentId], foreignColumns:[hrEmployments.orgId,hrEmployments.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_compliance_requirements` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_compliance_events` | `requirement_id` | `hr_compliance_requirements` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,requirementId], foreignColumns:[hrComplianceRequirements.orgId,hrComplianceRequirements.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_contracts` | `employment_id` | `hr_employments` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_headcount_plans` | `department_id` | `departments` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,departmentId], foreignColumns:[departments.orgId,departments.id]})` | nullable | Same pattern | W7-E | DRAFT |
| `hr_hiring_plan_items` | `plan_id` | `hr_headcount_plans` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,planId], foreignColumns:[hrHeadcountPlans.orgId,hrHeadcountPlans.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_hiring_plan_items` | `linked_requisition_id` | `job_requisitions` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-E | DRAFT |
| `hr_legal_holds` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_legal_hold_items` | `hold_id` | `hr_legal_holds` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,holdId], foreignColumns:[hrLegalHolds.orgId,hrLegalHolds.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_retention_policies` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_data_requests` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_proxy_access` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_positions` | `department_id` | `departments` | ✔ | integer | integer | ✔ | ❌ | Same pattern → departments | nullable | Same pattern | W7-E | DRAFT |
| `hr_positions` | `job_level_id` | `hr_job_levels` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-E | DRAFT |
| `hr_reorg_scenarios` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_union_memberships` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_collective_agreements` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_labor_cases` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 23: Import jobs (UUID PK)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_import_jobs` (UUID) | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_import_rows` (UUID) | `job_id` | `hr_import_jobs` | **N — missing** | uuid | uuid | ✔ | ❌ | **ADD org_id first**; then `foreignKey({columns:[orgId,jobId], foreignColumns:[hrImportJobs.orgId,hrImportJobs.id]})` | NOT NULL | `SELECT id FROM hr_import_rows WHERE job_id NOT IN (SELECT id FROM hr_import_jobs)` | W7-E | DRAFT |

### GROUP 24: Workflow engine

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_workflow_definitions` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_workflow_steps` | `definition_id` | `hr_workflow_definitions` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_workflow_instances` | `definition_id` | `hr_workflow_definitions` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,definitionId], foreignColumns:[hrWorkflowDefinitions.orgId,hrWorkflowDefinitions.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_workflow_step_actions` | `instance_id` | `hr_workflow_instances` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,instanceId], foreignColumns:[hrWorkflowInstances.orgId,hrWorkflowInstances.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_workflow_delegations` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 25: Policy engine

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_policies` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_policies` | `parent_policy_id` | `hr_policies` (self-ref) | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then self-ref composite FK | nullable | Same pattern | W7-E | DRAFT |
| `hr_policy_scopes` | `policy_id` | `hr_policies` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,policyId], foreignColumns:[hrPolicies.orgId,hrPolicies.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_policy_assignments` | `policy_id` | `hr_policies` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 26: Template engine

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_templates` | `parent_template_id` | `hr_templates` (self-ref) | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then self-ref composite FK | nullable | Same pattern | W7-E | DRAFT |
| `hr_template_renders` | `template_id` | `hr_templates` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,templateId], foreignColumns:[hrTemplates.orgId,hrTemplates.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_template_renders` | `rendered_for_employee_id` | `hr_employments` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-E | DRAFT |

### GROUP 27: Automation engine

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_automation_rules` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_automation_runs` | `rule_id` | `hr_automation_rules` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,ruleId], foreignColumns:[hrAutomationRules.orgId,hrAutomationRules.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_automation_runs` | `triggered_by_run_id` | `hr_automation_runs` (self-ref) | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then self-ref composite FK | nullable | Same pattern | W7-E | DRAFT |

### GROUP 28: Engagement extras

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_mood_checkins` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_badges` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_badge_awards` | `badge_id` | `hr_badges` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,badgeId], foreignColumns:[hrBadges.orgId,hrBadges.id]})` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_reward_points_ledger` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_polls` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for hr_poll_votes | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_poll_votes` | `poll_id` | `hr_polls` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_communities` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_community_members` | `community_id` | `hr_communities` | **N — missing** | integer | integer | ✔ | ❌ | **ADD org_id first**; then composite FK | NOT NULL | Same pattern | W7-E | DRAFT |
| `hr_campaigns` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-E | DRAFT |

### GROUP 29: Payroll policies

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `payroll_policies` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_policy_versions` | `policy_id` | `payroll_policies` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,policyId], foreignColumns:[payrollPolicies.orgId,payrollPolicies.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_template_activations` | `policy_version_id` | `payroll_policy_versions` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,policyVersionId], foreignColumns:[payrollPolicyVersions.orgId,payrollPolicyVersions.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_calendar_events` | `policy_id` | `payroll_policies` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-F | DRAFT |
| `payroll_accounting_mappings` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — also has bare `component_id` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_accounting_mappings` | `component_id` | `salary_components` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | NOT NULL | `SELECT id FROM payroll_accounting_mappings WHERE (org_id,component_id) NOT IN (SELECT org_id,id FROM salary_components)` | W7-F | DRAFT |

### GROUP 30: Payroll inputs (partial — period+snapshots in wave-7)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `hr_payroll_adjustments` | `period_id` | `hr_payroll_input_periods` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,periodId], foreignColumns:[hrPayrollInputPeriods.orgId,hrPayrollInputPeriods.id]})` | nullable | `SELECT id FROM hr_payroll_adjustments WHERE period_id IS NOT NULL AND (org_id,period_id) NOT IN (SELECT org_id,id FROM hr_payroll_input_periods)` | W7-F | DRAFT |

### GROUP 31: Payroll workforce + payout

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `salary_components` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` | NOT NULL | Same pattern | W7-F | DRAFT |
| `employee_salary_profiles` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — also has bare `policy_version_id` | NOT NULL | Same pattern | W7-F | DRAFT |
| `employee_salary_profiles` | `policy_version_id` | `payroll_policy_versions` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-F | DRAFT |
| `employee_salary_profile_components` | `profile_id` | `employee_salary_profiles` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,profileId], foreignColumns:[employeeSalaryProfiles.orgId,employeeSalaryProfiles.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `employee_salary_profile_components` | `component_id` | `salary_components` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,componentId], foreignColumns:[salaryComponents.orgId,salaryComponents.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_loan_adjustments` | `loan_id` | `salary_loans` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,loanId], foreignColumns:[salaryLoans.orgId,salaryLoans.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_loan_adjustments` | `run_id` | `payroll_runs` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,runId], foreignColumns:[payrollRuns.orgId,payrollRuns.id]})` | nullable | Same pattern | W7-F | DRAFT |
| `payslip_templates` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_bank_batches` | `run_id` | `payroll_runs` | ✔ | integer | integer | ✔ | ❌ | Same pattern → payroll_runs | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_bank_batch_items` | `batch_id` | `payroll_bank_batches` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,batchId], foreignColumns:[payrollBankBatches.orgId,payrollBankBatches.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_bank_batch_items` | `run_employee_id` | `payroll_run_employees` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,runEmployeeId], foreignColumns:[payrollRunEmployees.orgId,payrollRunEmployees.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |

### GROUP 32: Payroll runs (partial — runs+employees in wave-7)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `payroll_line_items` | `run_id` | `payroll_runs` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,runId], foreignColumns:[payrollRuns.orgId,payrollRuns.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_line_items` | `run_employee_id` | `payroll_run_employees` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,runEmployeeId], foreignColumns:[payrollRunEmployees.orgId,payrollRunEmployees.id]})` | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_line_items` | `component_id` | `salary_components` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-F | DRAFT |
| `payroll_exceptions` | `run_id` | `payroll_runs` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-F | DRAFT |
| `payroll_exceptions` | `run_employee_id` | `payroll_run_employees` | ✔ | integer | integer | ✔ | ❌ | Same pattern | nullable | Same pattern | W7-F | DRAFT |
| `payroll_approvals` | `run_id` | `payroll_runs` | ✔ | integer | integer | ✔ | ❌ | Same pattern | NOT NULL | Same pattern | W7-F | DRAFT |

### GROUP 33: Payroll core (payroll.ts)

| Child table | Child FK col | Parent table | org_id present? | Existing ID type | Target ID type | Type match | Parent UNIQUE(org_id,id)? | Composite FK definition | Nullable? | Repair query sketch | Wave | Validation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `payrolls` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `salary_structures` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `expense_categories` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — also cross-module FK to ledger_accounts (deferred) | NOT NULL | Same pattern | W7-F | DRAFT |
| `expenses` | `category_id` | `expense_categories` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,categoryId], foreignColumns:[expenseCategories.orgId,expenseCategories.id]})` | nullable | Same pattern | W7-F | DRAFT |
| `expenses` | `project_id` | `projects` | ✔ | integer | integer | ✔ | ❌ | Cross-module FK → projects; deferred to cross-module wave | nullable | Same pattern | W7-H | DRAFT |
| `expenses` | `reimbursement_batch_id` | `reimbursements` | ✔ | integer (bare) | integer | ✔ | ❌ | **ADD `.references()` first**; then composite FK | nullable | Same pattern | W7-F | DRAFT |
| `reimbursements` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `salary_loans` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor — add `UNIQUE(org_id,id)` for hr_loan_repayments | NOT NULL | Same pattern | W7-F | DRAFT |
| `bonuses` | `org_id` | `organizations` | ✔ | text | text | ✔ | ❌ | Tenant anchor only | NOT NULL | Same pattern | W7-F | DRAFT |
| `fnf_settlements` | `resignation_id` | `resignations` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,resignationId], foreignColumns:[resignations.orgId,resignations.id]})` | nullable | Same pattern | W7-F | DRAFT |
| `asset_returns` | `asset_id` | `assets` | ✔ | integer | integer | ✔ | ❌ | `foreignKey({columns:[orgId,assetId], foreignColumns:[assets.orgId,assets.id]})` | nullable | Same pattern | W7-E | DRAFT |

---

## Summary

| Metric | Count |
|---|---|
| HR/payroll tables inventoried in this document | ~145 |
| Already covered by wave-7 (excluded here) | 9 |
| Tables with org_id present, needing composite FK | ~110 |
| Tables missing org_id entirely (must add first) | 25 |
| Tables with no `.references()` on FK col (bare integers) | 22 instances across 20 tables |
| Type mismatches (org_id integer vs text) | 0 — none |
| Tables using composite `foreignKey({})` today | 0 — none |
| Cross-module FKs deferred | 2 (expenses→projects, expense_categories→ledger_accounts) |

## Biggest FK gaps (priority order)

1. **25 child tables have no org_id column** — these cannot receive a composite FK until org_id is added and backfilled. Affects engagement-extras (polls/communities), hiring pipeline (scorecards/booking/vendor submissions/job_recruiters), learning (enrollments/training), performance (key_results/survey_responses/assessment_attempts), feedback (cycle requests/responses), offboarding (onboarding_template_steps/exit_checklists), audit (import_rows), and org-structure (department_members/roster_entries/workflow_steps/competencies).

2. **22 bare-integer FK columns have no `.references()` constraint** — the DB enforces no referential integrity on these today. The most dangerous: `hr_employments.job_role_id/job_level_id/location_id` (core employment record), `payroll_line_items.component_id` (every payroll run item), `hr_loan_repayments.loan_id`, `expenses.reimbursement_batch_id`.

3. **No parent has `UNIQUE(org_id, id)` yet** — this prerequisite must be batch-added across all anchor tables (departments, hr_job_roles, hr_job_levels, hr_locations, hr_teams, hr_templates, hr_policies, review_cycles, hiring_flows, candidates, job_postings, payroll_runs, payroll_run_employees, salary_loans, salary_components, etc.) before any child composite FK can be created.

4. **Self-referential FK columns missing `.references()`**: `hr_teams.parent_team_id`, `hr_templates.parent_template_id`, `hr_policies.parent_policy_id`, `hr_automation_runs.triggered_by_run_id` — these create silent orphan hierarchies.

5. **`hr_access_requests.employee_id`**: text column with no `.references()` and ambiguous parent (hr_people has integer PK; users has text PK) — requires schema clarification before migration.
