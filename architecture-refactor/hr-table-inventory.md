# HR Table Inventory

PRD lines 726-728. Lane L17, 2026-08-31.

## Overview

| Metric | Count |
|--------|-------|
| Total HR tables | 234 |
| Active (runtime barrel) | 218 |
| Compatibility-held (SQL-managed, out of barrel by design) | 16 |
| Superseded | 0 |
| Removable | 0 |
| Schema files scanned | 67 |
| HR service files | 191 |

## Scan Calibration Proof

The reference scan was validated against three known-live tables before classifying any entry:

| Table | Expected | Grep hit | Verdict |
|-------|----------|----------|---------|
| `hr_people` | live, referenced | `hr-custom-fields.service.ts:12` imports `hrPeople` | CALIBRATED |
| `hr_employments` | live, referenced | `hr-analytics-plus.service.ts:38` raw-SQL FROM | CALIBRATED |
| `hr_headcount_plans` | live, referenced | `hr-analytics-plus.service.ts:11` imports `hrHeadcountPlans` | CALIBRATED |

A scan claiming "everything is dead" would fail all three — the calibration passed, so individual table verdicts are sound.

## Classification Key

- **active** — in the runtime barrel (`db/schema/hr/index.ts`), referenced by live services
- **compatibility-held** — deliberately excluded from the runtime barrel (`hrms-phase1-sql-managed.ts`); managed by raw-SQL migrations; `migration-integrity.spec.ts` asserts this arrangement; must NOT be deleted
- **superseded** — replaced by a newer implementation; no live service reads or writes the table directly
- **removable** — no runtime references, no raw-SQL references, no FK dependents, no retention obligation; safe to drop after a migration

---

## Compatibility-Held Tables (16)

These 16 tables live in `db/schema/hr/` but are re-exported from `hrms-phase1-sql-managed.ts` and deliberately excluded from the runtime barrel. Drizzle must never generate DDL for them. `migration-integrity.spec.ts` asserts this arrangement; removing any of these files fails that spec.

| Table | Schema file | Notes |
|-------|-------------|-------|
| `attendance_correction_links` | `hr/attendance-correction-links.ts` | Links attendance events to correction requests |
| `attendance_event_evidence` | `hr/attendance-event-evidence.ts` | Evidence blobs for clock events |
| `attendance_evidence_legal_holds` | `hr/attendance-event-evidence.ts` | Legal hold tags on evidence rows |
| `attendance_event_locators` | `hr/attendance-event-store.ts` | Locator index for the event store |
| `attendance_events` | `hr/attendance-event-store.ts` | Append-only attendance event store (likely partitioned) |
| `attendance_session_projections` | `hr/attendance-projections.ts` | Pre-computed session projections |
| `attendance_daily_projections` | `hr/attendance-projections.ts` | Pre-computed daily projections |
| `hr_audit_event_sources` | `hr/audit-events.ts` | Source catalog for structured audit events |
| `hr_audit_events` | `hr/audit-events.ts` | Structured HR audit event log |
| `worker_leave_balance_projections` | `hr/worker-leave-balance-projections.ts` | Pre-computed leave balances |
| `worker_leave_entry_locators` | `hr/worker-leave-ledger.ts` | Keyset locators for the ledger |
| `worker_leave_ledger_entries` | `hr/worker-leave-ledger.ts` | Append-only worker leave ledger |
| `worker_leave_reversal_links` | `hr/worker-leave-ledger.ts` | Reversal link records for ledger entries |
| `hr_person_legacy_map` | `hr/workforce-legacy-maps.ts` | Maps legacy person IDs during migration |
| `hr_employment_legacy_map` | `hr/workforce-legacy-maps.ts` | Maps legacy employment IDs during migration |
| `hr_workforce_reconciliation_items` | `hr/workforce-reconciliation.ts` | Reconciliation diff items for workforce sync |

---

## Active Tables (218)

All tables below are in `db/schema/hr/index.ts` and have confirmed live service references.

### Core People & Employment

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `hr_people` | `core-people.ts` | active | Core person record; FKed by `hr_employments`, many other tables |
| `hr_employments` | `core-people.ts` | active | Primary employment record; highest fan-out in HR |
| `hr_employee_sensitive_fields` | `core-people.ts` | active | Encrypted sensitive HR fields |
| `hr_employment_history` | `core-people.ts` | active | Snapshot history of employment changes |
| `hr_effective_dated_changes` | `core-people.ts` | active | Future-dated employment change queue |
| `hr_reporting_lines` | `core-people.ts` | active | Manager–report relationship graph |
| `hr_job_roles` | `core-org.ts` | active | Job role catalog |
| `hr_job_levels` | `core-org.ts` | active | Job level catalog |
| `hr_employment_custom_field_values` | `core-org.ts` | active | Custom field values on employment records |
| `hr_audit_logs` | `core-audit.ts` | active | Operational HR audit trail |

### Attendance & Time

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `attendance` | `attendance.ts` | active | Clocked attendance records |
| `holidays` | `attendance.ts` | active | Org holiday calendar |
| `wfh_requests` | `attendance.ts` | active | Work-from-home requests |
| `helpdesk_tickets` | `attendance.ts` | active | Attendance helpdesk tickets |
| `hr_helpdesk_routing` | `attendance.ts` | active | Routing rules for helpdesk |
| `hr_helpdesk_comments` | `attendance.ts` | active | Comments on helpdesk tickets |
| `employee_devices` | `attendance.ts` | active | Registered employee devices |
| `hr_attendance_regularizations` | `attendance-regularizations.ts` | active | Regularization requests for missed punches |
| `biometric_devices` | `biometric.ts` | active | Biometric hardware devices |
| `biometric_logs` | `biometric.ts` | active | Raw biometric scan logs |
| `geofences` | `geofencing.ts` | active | Geofence boundary definitions |
| `rosters` | `rosters.ts` | active | Roster definitions |
| `roster_entries` | `rosters.ts` | active | Individual roster slot entries |
| `shift_templates` | `shifts.ts` | active | Shift time templates |
| `employee_shift_assignments` | `shifts.ts` | active | Employee-to-shift assignments |
| `shift_swap_requests` | `shifts.ts` | active | Shift swap request records |
| `overtime_requests` | `overtime.ts` | active | Overtime approval requests |
| `comp_off_balances` | `overtime.ts` | active | Compensatory-off balance ledger |

### Leave

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `leave_types` | `leaves.ts` | active | Leave type catalog; FKed by `leave_balances`, `leave_requests` |
| `leave_balances` | `leaves.ts` | active | Per-employee leave balance per type per year |
| `leave_requests` | `leaves.ts` | active | Leave request and approval records |
| `leave_blackout_dates` | `leaves.ts` | active | Blackout date restrictions |
| `hr_leave_ledger` | `leave-ledger.ts` | active | Leave balance ledger (append-only debits/credits) |
| `leave_policies` | `leave-policies.ts` | active | Leave policy definitions |

### Performance & Goals

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `review_cycles` | `performance.ts` | active | Performance review cycle definitions |
| `performance_reviews` | `performance.ts` | active | Individual review records |
| `one_on_one_meetings` | `performance.ts` | active | 1:1 meeting records |
| `goals` | `performance.ts` | active | OKR/goal definitions |
| `key_results` | `performance.ts` | active | Key result definitions under goals |
| `performance_improvement_plans` | `performance.ts` | active | PIP records |
| `pulse_surveys` | `performance.ts` | active | Pulse survey definitions |
| `survey_responses` | `performance.ts` | active | Survey response records |
| `feedback_requests` | `performance.ts` | active | 360-feedback request records |
| `enps_scores` | `performance.ts` | active | eNPS score records |
| `recognitions` | `performance.ts` | active | Peer recognition records |
| `employee_skills` | `performance.ts` | active | Employee skill declarations |
| `skill_assessments` | `performance.ts` | active | Skill assessment definitions |
| `assessment_attempts` | `performance.ts` | active | Skill assessment attempt records |
| `hr_calibration_entries` | `performance.ts` | active | Calibration session entries |
| `kpi_definitions` | `kpis.ts` | active | KPI metric definitions |
| `competency_frameworks` | `kpis.ts` | active | Competency framework definitions |
| `competencies` | `kpis.ts` | active | Individual competency entries |
| `feedback_cycles` | `feedback.ts` | active | Feedback cycle orchestration |
| `feedback_cycle_requests` | `feedback.ts` | active | Cycle-specific feedback requests |
| `feedback_cycle_responses` | `feedback.ts` | active | Cycle-specific feedback responses |

### Recruitment & Hiring

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `candidates` | `hiring-candidates.ts` | active | Candidate profiles |
| `candidate_resumes` | `hiring-candidates.ts` | active | Resume blobs |
| `candidate_applications` | `hiring-candidates.ts` | active | Application records |
| `candidate_referrals` | `hiring-candidates.ts` | active | Referral records |
| `candidate_documents_vault` | `hiring-candidates.ts` | active | Sensitive candidate document vault |
| `vault_access_logs` | `hiring-candidates.ts` | active | Access log for candidate vault |
| `candidate_reference_checks` | `hiring-candidates.ts` | active | Reference check records |
| `candidate_messages` | `hiring-candidates.ts` | active | Candidate communication records |
| `hiring_flows` | `hiring-core.ts` | active | Hiring pipeline flow definitions |
| `scorecard_templates` | `hiring-core.ts` | active | Interview scorecard templates |
| `hiring_flow_rounds` | `hiring-core.ts` | active | Rounds in a hiring flow |
| `job_postings` | `hiring-core.ts` | active | Job posting records |
| `candidate_sources` | `hiring-core.ts` | active | Candidate source catalog |
| `interviews` | `hiring-interviews.ts` | active | Interview records |
| `interview_scorecards` | `hiring-interviews.ts` | active | Interview scorecard fills |
| `interview_booking_links` | `hiring-interviews.ts` | active | Self-service booking links |
| `interview_panel_members` | `hiring-interviews.ts` | active | Interview panel membership |
| `booking_link_interviewers` | `hiring-interviews.ts` | active | Interviewers per booking link |
| `calibration_sessions` | `hiring-interviews.ts` | active | Hiring calibration sessions |
| `calibration_participants` | `hiring-interviews.ts` | active | Session participants |
| `interview_slas` | `hiring-interviews.ts` | active | Interview SLA definitions |
| `candidate_sla_tracking` | `hiring-interviews.ts` | active | Candidate-level SLA tracking |
| `interview_questions` | `hiring-interviews.ts` | active | Question bank |
| `pipeline_automations` | `hiring-pipeline.ts` | active | Pipeline automation rules |
| `offer_letter_templates` | `hiring-pipeline.ts` | active | Offer letter templates |
| `candidate_offers` | `hiring-pipeline.ts` | active | Offer records |
| `offer_versions` | `hiring-pipeline.ts` | active | Versioned offer documents |
| `offer_negotiations` | `hiring-pipeline.ts` | active | Negotiation records |
| `email_sequences` | `hiring-pipeline.ts` | active | Email sequence definitions |
| `email_sequence_steps` | `hiring-pipeline.ts` | active | Steps in an email sequence |
| `email_sequence_enrollments` | `hiring-pipeline.ts` | active | Candidate sequence enrollments |
| `recruitment_vendors` | `hiring-pipeline.ts` | active | Vendor agency records |
| `vendor_candidate_submissions` | `hiring-pipeline.ts` | active | Vendor-submitted candidates |
| `headcount_requests` | `hiring-pipeline.ts` | active | Headcount request approvals |
| `job_recruiters` | `hiring-pipeline.ts` | active | Recruiter-to-job assignments |
| `recruiter_activity_log` | `hiring-pipeline.ts` | active | Recruiter activity audit |
| `scheduled_reports` | `hiring-pipeline.ts` | active | Scheduled recruitment report definitions |
| `job_board_postings` | `job-boards.ts` | active | External job board sync records |
| `job_requisitions` | `requisitions.ts` | active | Headcount requisition records |
| `talent_pools` | `talent-pools.ts` | active | Talent pool definitions |
| `talent_pool_members` | `talent-pools.ts` | active | Pool membership records |
| `external_referrers` | `staffing.ts` | active | External referrer profiles |
| `external_referrals` | `staffing.ts` | active | External referral records |

### Onboarding, Offboarding & Documents

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `document_templates` | `offboarding.ts` | active | Document template definitions |
| `document_template_versions` | `offboarding.ts` | active | Versioned template content |
| `candidate_documents` | `offboarding.ts` | active | Candidate-side documents |
| `onboarding_templates` | `offboarding.ts` | active | Onboarding checklist templates |
| `onboarding_template_steps` | `offboarding.ts` | active | Steps in onboarding templates |
| `onboarding_tasks` | `offboarding.ts` | active | Per-employee onboarding task instances |
| `document_types` | `offboarding.ts` | active | Document type catalog |
| `document_type_roles` | `offboarding.ts` | active | Role assignments per document type |
| `onboarding_documents` | `offboarding.ts` | active | Documents collected during onboarding |
| `document_audit_logs` | `offboarding.ts` | active | Document lifecycle audit |
| `resignations` | `offboarding.ts` | active | Resignation records |
| `exit_checklists` | `offboarding.ts` | active | Exit checklist instances |
| `terminations` | `offboarding.ts` | active | Termination records |
| `alumni_profiles` | `offboarding.ts` | active | Post-exit alumni profiles |
| `background_verifications` | `offboarding.ts` | active | BGV records |
| `certifications` | `offboarding.ts` | active | Employee certification records |
| `onboarding_task_dependencies` | `onboarding-task-dependencies.ts` | active | DAG edges for task sequencing |
| `termination_reasons` | `termination-relational-records.ts` | active | Termination reason catalog |
| `termination_supporting_documents` | `termination-relational-records.ts` | active | Documents attached to terminations |
| `rich_documents` | `documents.ts` | active | Rich-text policy/handbook documents |
| `documents` | `documents.ts` | active | Binary document records |
| `handbook_versions` | `documents.ts` | active | Handbook version snapshots |
| `policy_acknowledgments` | `documents.ts` | active | Employee policy acknowledgment records |
| `hr_email_templates` | `documents.ts` | active | HR-specific email templates |
| `team_events` | `documents.ts` | active | Team event definitions |
| `team_event_participants` | `documents.ts` | active | Event participation records |
| `hr_document_tags` | `document-tags.ts` | active | Document tag associations |
| `assets` | `assets.ts` | active | Company asset records |

### Compensation & Benefits

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `salary_structure_templates` | `salary-structure-templates.ts` | active | Salary structure template definitions |
| `tax_declarations` | `tax.ts` | active | Employee tax declarations |
| `investment_proofs` | `tax.ts` | active | Tax investment proof submissions |
| `hr_benefit_plans` | `benefits.ts` | active | Benefits plan catalog |
| `hr_benefit_enrollment_windows` | `benefits.ts` | active | Enrollment window definitions |
| `hr_benefit_enrollments` | `benefits.ts` | active | Employee benefit enrollments |
| `hr_dependents` | `benefits.ts` | active | Employee dependent records |
| `hr_insurance_claims` | `benefits.ts` | active | Insurance claim records |
| `hr_loan_repayments` | `benefits.ts` | active | Loan repayment schedules |
| `hr_travel_visit_logs` | `benefits.ts` | active | Travel allowance visit logs |
| `hr_time_devices` | `enterprise-comp.ts` | active | Time device registrations |
| `hr_device_sync_logs` | `enterprise-comp.ts` | active | Device sync audit logs |
| `hr_device_employee_mappings` | `enterprise-comp.ts` | active | Device-to-employee mappings |
| `hr_payroll_variance_approvals` | `enterprise-comp.ts` | active | Payroll variance approval records |
| `hr_arrears_adjustments` | `enterprise-comp.ts` | active | Arrears adjustment records |
| `hr_payroll_compliance_tasks` | `enterprise-comp.ts` | active | Payroll compliance task tracking |
| `hr_comp_cycles` | `enterprise-comp.ts` | active | Compensation review cycles |
| `hr_comp_recommendations` | `enterprise-comp.ts` | active | Comp recommendation records |
| `hr_comp_budget_pools` | `enterprise-comp.ts` | active | Budget pool definitions |
| `hr_equity_grants` | `enterprise-comp.ts` | active | Equity grant records |
| `hr_equity_vesting_events` | `enterprise-comp.ts` | active | Vesting event records |
| `hr_equity_exercises` | `enterprise-comp.ts` | active | Option exercise records |

### Engagement & Culture

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `hr_mood_checkins` | `engagement-extras.ts` | active | Daily mood check-in records |
| `hr_badges` | `engagement-extras.ts` | active | Badge definitions |
| `hr_badge_awards` | `engagement-extras.ts` | active | Badge award records |
| `hr_reward_points_ledger` | `engagement-extras.ts` | active | Reward points ledger |
| `hr_polls` | `engagement-extras.ts` | active | Poll definitions |
| `hr_poll_votes` | `engagement-extras.ts` | active | Poll vote records |
| `hr_communities` | `engagement-extras.ts` | active | Community group definitions |
| `hr_community_members` | `engagement-extras.ts` | active | Community membership records |
| `hr_campaigns` | `engagement-extras.ts` | active | HR engagement campaign records |
| `announcements` | `announcements.ts` | active | Org announcement records |
| `announcement_targets` | `announcements.ts` | active | Announcement targeting rules |
| `announcement_reads` | `announcements.ts` | active | Announcement read receipts |

### Cases, Safety & Governance

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `hr_cases` | `cases.ts` | active | HR case records |
| `hr_case_notes` | `cases.ts` | active | Notes on HR cases |
| `hr_case_documents` | `cases.ts` | active | Documents attached to cases |
| `hr_disciplinary_actions` | `cases.ts` | active | Disciplinary action records |
| `hr_safety_incidents` | `safety.ts` | active | Safety incident records |
| `hr_wellness_checkins` | `safety.ts` | active | Wellness check-in records |
| `hr_employee_sensitive_disciplinary_records` | `employee-sensitive-records.ts` | active | Sensitive disciplinary records |
| `hr_employee_sensitive_grievance_records` | `employee-sensitive-records.ts` | active | Sensitive grievance records |
| `hr_access_requests` | `access-requests.ts` | active | System access request records |
| `hr_legal_holds` | `governance.ts` | active | Legal hold definitions |
| `hr_legal_hold_items` | `governance.ts` | active | Records under legal hold |
| `hr_retention_policies` | `governance.ts` | active | Data retention policy definitions |
| `hr_data_requests` | `governance.ts` | active | Data subject access requests |
| `hr_proxy_access` | `governance.ts` | active | Proxy access grants |
| `hr_positions` | `governance.ts` | active | Org position catalog |
| `hr_reorg_scenarios` | `governance.ts` | active | Reorg scenario planning records |
| `hr_union_memberships` | `governance.ts` | active | Union membership records |
| `hr_collective_agreements` | `governance.ts` | active | Collective agreement documents |
| `hr_labor_cases` | `governance.ts` | active | Labor dispute case records |
| `hr_position_statuses` | `taxonomy.ts` | active | Position status lifecycle states |
| `hr_position_transitions` | `taxonomy.ts` | active | Position status transition rules |
| `hr_work_authorizations` | `global-compliance.ts` | active | Work authorization records |
| `hr_compliance_requirements` | `global-compliance.ts` | active | Compliance requirement definitions |
| `hr_compliance_events` | `global-compliance.ts` | active | Compliance event records |
| `hr_contracts` | `global-compliance.ts` | active | Employment contract records |

### Policies, Workflows & Automation

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `hr_policies` | `policy-engine.ts` | active | HR policy definitions |
| `hr_policy_scopes` | `policy-engine.ts` | active | Policy scope assignments |
| `hr_workflow_definitions` | `workflow-engine.ts` | active | Workflow definition templates |
| `hr_workflow_steps` | `workflow-engine.ts` | active | Steps within workflow definitions |
| `hr_workflow_instances` | `workflow-engine.ts` | active | Running workflow instances |
| `hr_workflow_step_actions` | `workflow-engine.ts` | active | Actions taken on workflow steps |
| `hr_workflow_instance_attachments` | `workflow-engine.ts` | active | Attachments on workflow instances |
| `hr_workflow_delegations` | `workflow-engine.ts` | active | Workflow step delegations |
| `hr_automation_rules` | `automation-engine.ts` | active | HR automation rule definitions |
| `hr_automation_runs` | `automation-engine.ts` | active | Automation execution records |
| `hr_webhook_subscriptions` | `webhooks.ts` | active | External webhook subscriptions |
| `hr_webhook_deliveries` | `webhooks.ts` | active | Webhook delivery records |

### Templates, Forms & Succession

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `hr_templates` | `template-engine.ts` | active | Document template library |
| `hr_template_renders` | `template-engine.ts` | active | Rendered template instances |
| `hr_forms` | `forms.ts` | active | Dynamic HR form definitions |
| `hr_form_submissions` | `forms.ts` | active | Form submission records |
| `hr_role_skill_requirements` | `succession.ts` | active | Skill requirements per role |
| `hr_succession_plans` | `succession.ts` | active | Succession planning records |
| `hr_probation_reviews` | `probation.ts` | active | Probation review records |

### Import/Export, Ops & Analytics

| Table | Schema file | Classification | Notes |
|-------|-------------|----------------|-------|
| `hr_import_jobs` | `import-jobs.ts` | active | Data import job records |
| `hr_import_rows` | `import-jobs.ts` | active | Row-level import records |
| `hr_export_jobs` | `export-jobs.ts` | active | Data export job records |
| `gdpr_export_jobs` | `gdpr-export-jobs.ts` | active | GDPR data export job records |
| `hr_headcount_plans` | `workforce-planning.ts` | active | Headcount plan records |
| `hr_access_provisioning` | `enterprise-ops.ts` | active | System access provisioning records |
| `hr_access_provisioning_templates` | `enterprise-ops.ts` | active | Provisioning template definitions |
| `hr_accommodation_requests` | `enterprise-ops.ts` | active | Workplace accommodation requests |
| `hr_accommodation_tasks` | `enterprise-ops.ts` | active | Tasks related to accommodations |
| `hr_emergency_events` | `enterprise-ops.ts` | active | Emergency event records |
| `hr_emergency_responses` | `enterprise-ops.ts` | active | Emergency response records |
| `hr_simulations` | `enterprise-ops.ts` | active | Workforce scenario simulations |
| `hr_event_stream` | `enterprise-ops.ts` | active | HR domain event stream |
| `hr_travel_visit_logs` | `benefits.ts` | active | (see Compensation section) |

---

## Section C — Serial PK Risk Plan

### Context

Drizzle schema rule (backend `CLAUDE.md §3`): "Every table: UUID or `generatedAlwaysAsIdentity()` PK (never `serial`)."  

All 234 HR tables were created before this rule was established and use `serial("id").primaryKey()` (int4, 4-byte signed, max ~2.1 billion). The rule applies to **new** tables; this plan ranks the existing ones for remedial migration. `users.id` is `text` in this codebase — verified in `db/schema/common/auth.ts` FK references (`text("user_id").references(() => users.id)`) — so user FK columns are safe.

### Risk Dimensions

| Dimension | Definition |
|-----------|------------|
| **Overflow** | At what write rate does int4 (max 2.1B) exhaust? 10K writes/day → 590 years; 1M writes/day → 5.9 years |
| **Fan-out** | How many child tables reference this PK via FK? A migration cascades to all of them |
| **Cross-cell identity** | Is this ID ever referenced in cross-cell analytics, imports, or external integrations? int4 is NOT globally unique |

### Ranked Table List

| Rank | Table | PK | Write-rate estimate | Fan-out | Cross-cell risk | Migrate? |
|------|-------|----|---------------------|---------|----------------|---------|
| 1 | `hr_people` | `serial` int4 | Low (one row/hire) | **Very high** — `hr_employments`, `hr_employment_history`, `hr_effective_dated_changes`, `hr_reporting_lines`, and many others FK to this | Yes — person IDs appear in cross-org analytics and payroll exports | **Migrate to bigint identity** |
| 2 | `hr_employments` | `serial` int4 | Low (one row/hire) | **High** — employment ID appears in leave, attendance, payroll, benefits, and custom-field value tables | Yes — employment ID used in cross-cell payroll batch references | **Migrate to bigint identity** |
| 3 | `leave_types` | `serial` int4 | Very low (catalog) | Medium — `leave_balances.leave_type_id`, `leave_requests.leave_type_id` | Low | Migrate to bigint identity (simple cascade, low risk) |
| 4 | `attendance` | `serial` int4 | **High** — one row per clock-event, potentially many/day per employee | Low (few child FKs) | Low | Monitor; bigint identity migration at 100M row threshold |
| 5 | `hr_leave_ledger` | `serial` int4 | Medium-high — one entry per balance change | Low (self-contained ledger) | Low | Monitor; bigint identity migration at 100M row threshold |
| 6 | `hr_audit_logs` | `serial` int4 | Medium-high — one row per HR operation | None (leaf table) | Low | Defer; leaf table, no FK children |
| 7 | `leave_requests` | `serial` int4 | Medium | Low | Low | Defer |
| 8 | `performance_reviews` | `serial` int4 | Low (periodic) | Low | Low | Defer |
| 9 | `hr_automation_runs` | `serial` int4 | Medium (event-driven) | None (leaf) | Low | Defer |
| 10 | All remaining 224 tables | `serial` int4 | Low to very low | Low | Low | Defer; future new tables MUST use `generatedAlwaysAsIdentity()` |

### Recommended Immediate Migrations

Only `hr_people.id` and `hr_employments.id` are genuinely unsafe from a cross-cell identity perspective and have fan-out high enough to matter.

**Approach for both:**
```sql
-- Step 1: add a new bigint identity column alongside the old serial
ALTER TABLE hr_people ADD COLUMN id_new bigint GENERATED ALWAYS AS IDENTITY;
-- Step 2: backfill and establish new FK chains (cascade update child tables)
-- Step 3: rename columns, drop the old serial column
-- Step 4: update all FK references in child tables
```

Do NOT write this migration yet. The cascade order must be derived from `pg_catalog.pg_constraint` ordered by table dependency depth, not from agent JSON. The migration requires:
- `SET lock_timeout = '5s'` on every step
- `ADD CONSTRAINT ... NOT VALID` + `VALIDATE CONSTRAINT` for each FK change
- Separate migrations per FK group to avoid ACCESS EXCLUSIVE lock chains

`leave_types.id` can migrate in a single weekend window; it has only two child FK columns.

### Deferral Criteria

A table's serial PK does NOT need immediate migration if:
1. No cross-cell identity requirement (not referenced in analytics exports or cell relocations)
2. Write rate < 1M/day (keeps it under int4 overflow for decades)
3. No children FK pointing to it (no cascade risk)

All 10-and-below entries meet at least two of these three criteria. Propose migration only when write-rate monitoring or a cell-relocation requirement changes the calculus.

---

## Freeze Gate

`backend/src/scripts/check-hr-table-freeze.mjs` + `pnpm check:hr-table-freeze`.

A new `pgTable(...)` call in `src/db/schema/hr/` that is not in the `BASELINE` set causes `exit 1`. To approve a genuinely necessary new table, add it to `APPROVED_EXCEPTIONS` in the gate script with the PR link and rationale. The gate also has a `--self-test` flag (8 assertions) that proves it bites on unapproved tables; see below for the exact output.

### Self-test output

```
Self-tests: 8 passed.
```

### Live-run output (current codebase)

```
Scanned 67 HR schema files.
HR table freeze: all 234 tables approved. Gate passed.
```
