# HRMS core Phase 0 live column catalog L-W

Snapshot: 2026-08-11
Source: authorized production catalog, `REPEATABLE READ READ ONLY`, bounded timeouts

Tables: 19; columns: 256

| Table | Column | SQL type | UDT | Nullable | Default |
|---|---|---|---|---|---|
| leave_balances | id | integer | int4 | NO | nextval('leave_balances_id_seq'::regclass) |
| leave_balances | org_id | text | text | NO |  |
| leave_balances | user_id | text | text | NO |  |
| leave_balances | leave_type_id | integer | int4 | NO |  |
| leave_balances | balance | numeric | numeric | NO | '0'::numeric |
| leave_balances | year | integer | int4 | NO |  |
| leave_blackout_dates | id | integer | int4 | NO | nextval('leave_blackout_dates_id_seq'::regclass) |
| leave_blackout_dates | org_id | text | text | NO |  |
| leave_blackout_dates | start_date | date | date | NO |  |
| leave_blackout_dates | end_date | date | date | NO |  |
| leave_blackout_dates | reason | text | text | NO |  |
| leave_blackout_dates | applies_to | text | text | NO | 'ALL'::text |
| leave_blackout_dates | created_by | text | text | YES |  |
| leave_blackout_dates | created_at | timestamp without time zone | timestamp | NO | now() |
| leave_policies | id | integer | int4 | NO | nextval('leave_policies_id_seq'::regclass) |
| leave_policies | org_id | text | text | NO |  |
| leave_policies | leave_type_id | integer | int4 | NO |  |
| leave_policies | name | text | text | NO |  |
| leave_policies | accrual_type | text | text | NO | 'ANNUAL'::text |
| leave_policies | accrual_rate | numeric | numeric | NO |  |
| leave_policies | max_balance | numeric | numeric | YES |  |
| leave_policies | carry_forward_days | numeric | numeric | NO | '0'::numeric |
| leave_policies | carry_forward_expiry_months | integer | int4 | YES |  |
| leave_policies | encashable | boolean | bool | NO | false |
| leave_policies | probation_restricted | boolean | bool | NO | false |
| leave_policies | gender_restriction | text | text | YES |  |
| leave_policies | applies_to | text | text | NO | 'ALL'::text |
| leave_policies | effective_from | text | text | NO |  |
| leave_policies | effective_to | text | text | YES |  |
| leave_policies | is_active | boolean | bool | NO | true |
| leave_policies | created_at | timestamp without time zone | timestamp | NO | now() |
| leave_requests | id | integer | int4 | NO | nextval('leave_requests_id_seq'::regclass) |
| leave_requests | org_id | text | text | NO |  |
| leave_requests | user_id | text | text | NO |  |
| leave_requests | leave_type_id | integer | int4 | NO |  |
| leave_requests | start_date | date | date | NO |  |
| leave_requests | end_date | date | date | NO |  |
| leave_requests | reason | text | text | YES |  |
| leave_requests | priority | text | text | NO | 'MEDIUM'::text |
| leave_requests | status | USER-DEFINED | leave_status | NO | 'PENDING'::leave_status |
| leave_requests | approver_id | text | text | YES |  |
| leave_requests | rejection_reason | text | text | YES |  |
| leave_requests | manager_comment | text | text | YES |  |
| leave_requests | attachment_url | text | text | YES |  |
| leave_requests | is_half_day | boolean | bool | NO | false |
| leave_requests | half_day_period | text | text | YES |  |
| leave_requests | covering_employee_id | text | text | YES |  |
| leave_requests | lop_days | numeric | numeric | NO | '0'::numeric |
| leave_requests | created_at | timestamp without time zone | timestamp | NO | now() |
| leave_types | id | integer | int4 | NO | nextval('leave_types_id_seq'::regclass) |
| leave_types | org_id | text | text | NO |  |
| leave_types | name | text | text | NO |  |
| leave_types | days_per_year | integer | int4 | NO |  |
| leave_types | carry_forward | boolean | bool | NO | false |
| onboarding_documents | id | integer | int4 | NO | nextval('onboarding_documents_id_seq'::regclass) |
| onboarding_documents | org_id | text | text | NO |  |
| onboarding_documents | user_id | text | text | NO |  |
| onboarding_documents | document_type_id | integer | int4 | NO |  |
| onboarding_documents | file_url | text | text | NO |  |
| onboarding_documents | file_name | text | text | NO |  |
| onboarding_documents | file_size | integer | int4 | YES |  |
| onboarding_documents | mime_type | text | text | YES |  |
| onboarding_documents | version | integer | int4 | NO | 1 |
| onboarding_documents | status | USER-DEFINED | onboarding_document_status | NO | 'SUBMITTED'::onboarding_document_status |
| onboarding_documents | reviewed_by | text | text | YES |  |
| onboarding_documents | reviewed_at | timestamp without time zone | timestamp | YES |  |
| onboarding_documents | remarks | text | text | YES |  |
| onboarding_documents | created_at | timestamp without time zone | timestamp | NO | now() |
| onboarding_documents | updated_at | timestamp without time zone | timestamp | NO | now() |
| onboarding_tasks | id | integer | int4 | NO | nextval('onboarding_tasks_id_seq'::regclass) |
| onboarding_tasks | user_id | text | text | NO |  |
| onboarding_tasks | org_id | text | text | NO |  |
| onboarding_tasks | template_step_id | integer | int4 | YES |  |
| onboarding_tasks | title | text | text | NO |  |
| onboarding_tasks | description | text | text | YES |  |
| onboarding_tasks | owner_role | text | text | NO | 'NEW_HIRE'::text |
| onboarding_tasks | due_date | timestamp without time zone | timestamp | YES |  |
| onboarding_tasks | status | text | text | NO | 'PENDING'::text |
| onboarding_tasks | completed_at | timestamp without time zone | timestamp | YES |  |
| onboarding_tasks | completed_by | text | text | YES |  |
| onboarding_tasks | depends_on_task_ids | jsonb | jsonb | YES | '[]'::jsonb |
| onboarding_tasks | created_at | timestamp without time zone | timestamp | NO | now() |
| org_unit_members | id | text | text | NO |  |
| org_unit_members | org_id | text | text | NO |  |
| org_unit_members | org_unit_id | text | text | NO |  |
| org_unit_members | user_id | text | text | NO |  |
| org_unit_members | role | text | text | NO | 'member'::text |
| org_unit_members | created_at | timestamp without time zone | timestamp | NO | now() |
| org_units | id | text | text | NO |  |
| org_units | org_id | text | text | NO |  |
| org_units | kind | text | text | NO |  |
| org_units | parent_id | text | text | YES |  |
| org_units | name | text | text | NO |  |
| org_units | code | text | text | NO |  |
| org_units | description | text | text | YES |  |
| org_units | head_user_id | text | text | YES |  |
| org_units | status | text | text | NO | 'ACTIVE'::text |
| org_units | metadata | jsonb | jsonb | YES |  |
| org_units | created_at | timestamp without time zone | timestamp | NO | now() |
| org_units | updated_at | timestamp without time zone | timestamp | NO | now() |
| org_units | deleted_at | timestamp without time zone | timestamp | YES |  |
| organization_people | organization_person_id | text | text | NO |  |
| organization_people | organization_id | text | text | NO |  |
| organization_people | user_id | text | text | YES |  |
| organization_people | organization_membership_id | integer | int4 | YES |  |
| organization_people | first_name | text | text | NO |  |
| organization_people | last_name | text | text | NO |  |
| organization_people | display_name | text | text | YES |  |
| organization_people | preferred_name | text | text | YES |  |
| organization_people | work_email | text | text | YES |  |
| organization_people | personal_email | text | text | YES |  |
| organization_people | phone | text | text | YES |  |
| organization_people | whatsapp_number | text | text | YES |  |
| organization_people | avatar_url | text | text | YES |  |
| organization_people | date_of_birth | date | date | YES |  |
| organization_people | gender | text | text | YES |  |
| organization_people | nationality | text | text | YES |  |
| organization_people | timezone | text | text | YES |  |
| organization_people | language_code | text | text | YES | 'en'::text |
| organization_people | address | jsonb | jsonb | YES |  |
| organization_people | emergency_contact | jsonb | jsonb | YES |  |
| organization_people | linkedin_url | text | text | YES |  |
| organization_people | github_url | text | text | YES |  |
| organization_people | bio | text | text | YES |  |
| organization_people | deleted_at | timestamp without time zone | timestamp | YES |  |
| organization_people | created_at | timestamp without time zone | timestamp | NO | now() |
| organization_people | updated_at | timestamp without time zone | timestamp | NO | now() |
| resignations | id | integer | int4 | NO | nextval('resignations_id_seq'::regclass) |
| resignations | org_id | text | text | NO |  |
| resignations | user_id | text | text | NO |  |
| resignations | reason | text | text | YES |  |
| resignations | reason_category | text | text | YES |  |
| resignations | last_working_date | date | date | YES |  |
| resignations | notice_period_days | integer | int4 | NO | 30 |
| resignations | status | USER-DEFINED | resignation_status | NO | 'SUBMITTED'::resignation_status |
| resignations | resignation_letter_url | text | text | YES |  |
| resignations | approved_by | text | text | YES |  |
| resignations | approved_at | timestamp without time zone | timestamp | YES |  |
| resignations | hr_reviewed_by | text | text | YES |  |
| resignations | hr_reviewed_at | timestamp without time zone | timestamp | YES |  |
| resignations | hr_remarks | text | text | YES |  |
| resignations | final_reviewed_by | text | text | YES |  |
| resignations | final_reviewed_at | timestamp without time zone | timestamp | YES |  |
| resignations | final_remarks | text | text | YES |  |
| resignations | willing_for_exit_interview | boolean | bool | NO | true |
| resignations | company_feedback | text | text | YES |  |
| resignations | exit_interview_notes | text | text | YES |  |
| resignations | exit_interview_date | timestamp without time zone | timestamp | YES |  |
| resignations | exit_interview_conducted_by | text | text | YES |  |
| resignations | feedback | jsonb | jsonb | YES |  |
| resignations | created_at | timestamp without time zone | timestamp | NO | now() |
| resignations | updated_at | timestamp without time zone | timestamp | NO | now() |
| roster_entries | id | integer | int4 | NO | nextval('roster_entries_id_seq'::regclass) |
| roster_entries | roster_id | integer | int4 | NO |  |
| roster_entries | user_id | text | text | NO |  |
| roster_entries | shift_id | integer | int4 | YES |  |
| roster_entries | date | date | date | NO |  |
| roster_entries | is_day_off | jsonb | jsonb | YES | 'false'::jsonb |
| roster_entries | notes | text | text | YES |  |
| roster_entries | created_at | timestamp without time zone | timestamp | NO | now() |
| roster_entries | org_id | text | text | NO |  |
| rosters | id | integer | int4 | NO | nextval('rosters_id_seq'::regclass) |
| rosters | org_id | text | text | NO |  |
| rosters | name | text | text | NO |  |
| rosters | week_start | date | date | NO |  |
| rosters | week_end | date | date | NO |  |
| rosters | status | text | text | NO | 'DRAFT'::text |
| rosters | created_by | text | text | NO |  |
| rosters | created_at | timestamp without time zone | timestamp | NO | now() |
| rosters | updated_at | timestamp without time zone | timestamp | NO | now() |
| shift_swap_requests | id | integer | int4 | NO | nextval('shift_swap_requests_id_seq'::regclass) |
| shift_swap_requests | org_id | text | text | NO |  |
| shift_swap_requests | requester_id | text | text | NO |  |
| shift_swap_requests | target_user_id | text | text | NO |  |
| shift_swap_requests | request_date | text | text | NO |  |
| shift_swap_requests | target_date | text | text | NO |  |
| shift_swap_requests | reason | text | text | YES |  |
| shift_swap_requests | status | text | text | NO | 'PENDING'::text |
| shift_swap_requests | approver_id | text | text | YES |  |
| shift_swap_requests | created_at | timestamp without time zone | timestamp | NO | now() |
| shift_templates | id | integer | int4 | NO | nextval('shift_templates_id_seq'::regclass) |
| shift_templates | org_id | text | text | NO |  |
| shift_templates | name | text | text | NO |  |
| shift_templates | type | text | text | NO | 'FIXED'::text |
| shift_templates | start_time | time without time zone | time | NO |  |
| shift_templates | end_time | time without time zone | time | NO |  |
| shift_templates | break_minutes | integer | int4 | NO | 60 |
| shift_templates | is_night_shift | boolean | bool | NO | false |
| shift_templates | grace_period_minutes | integer | int4 | NO | 15 |
| shift_templates | is_active | boolean | bool | NO | true |
| shift_templates | created_at | timestamp without time zone | timestamp | NO | now() |
| shift_templates | updated_at | timestamp without time zone | timestamp | NO | now() |
| terminations | id | integer | int4 | NO | nextval('terminations_id_seq'::regclass) |
| terminations | org_id | text | text | NO |  |
| terminations | user_id | text | text | NO |  |
| terminations | reasons | ARRAY | _text | NO | '{}'::text[] |
| terminations | detailed_explanation | text | text | NO |  |
| terminations | effective_date | date | date | NO |  |
| terminations | severance_amount | numeric | numeric | YES |  |
| terminations | notice_period_waived | boolean | bool | NO | false |
| terminations | termination_letter_url | text | text | YES |  |
| terminations | supporting_doc_urls | ARRAY | _text | YES | '{}'::text[] |
| terminations | internal_notes | text | text | YES |  |
| terminations | status | USER-DEFINED | termination_status | NO | 'DRAFT'::termination_status |
| terminations | initiated_by | text | text | YES |  |
| terminations | final_reviewed_by | text | text | YES |  |
| terminations | final_reviewed_at | timestamp without time zone | timestamp | YES |  |
| terminations | final_remarks | text | text | YES |  |
| terminations | email_sent_at | timestamp without time zone | timestamp | YES |  |
| terminations | email_status | text | text | YES |  |
| terminations | created_at | timestamp without time zone | timestamp | NO | now() |
| terminations | updated_at | timestamp without time zone | timestamp | NO | now() |
| wfh_requests | id | integer | int4 | NO | nextval('wfh_requests_id_seq'::regclass) |
| wfh_requests | org_id | text | text | NO |  |
| wfh_requests | user_id | text | text | NO |  |
| wfh_requests | date | date | date | NO |  |
| wfh_requests | reason | text | text | YES |  |
| wfh_requests | status | USER-DEFINED | wfh_request_status | NO | 'PENDING'::wfh_request_status |
| wfh_requests | approver_id | text | text | YES |  |
| wfh_requests | rejection_reason | text | text | YES |  |
| wfh_requests | created_at | timestamp without time zone | timestamp | NO | now() |
| wfh_requests | updated_at | timestamp without time zone | timestamp | NO | now() |
| worker_engagements | worker_engagement_id | text | text | NO |  |
| worker_engagements | organization_id | text | text | NO |  |
| worker_engagements | worker_id | text | text | NO |  |
| worker_engagements | starts_on | date | date | NO |  |
| worker_engagements | ends_on | date | date | YES |  |
| worker_engagements | worker_type | text | text | NO |  |
| worker_engagements | status | USER-DEFINED | worker_engagement_status | NO | 'PLANNED'::worker_engagement_status |
| worker_engagements | is_primary | boolean | bool | NO | false |
| worker_engagements | department_id | text | text | YES |  |
| worker_engagements | business_unit_id | text | text | YES |  |
| worker_engagements | branch_id | text | text | YES |  |
| worker_engagements | location_id | text | text | YES |  |
| worker_engagements | team_id | text | text | YES |  |
| worker_engagements | manager_engagement_id | text | text | YES |  |
| worker_engagements | designation | text | text | YES |  |
| worker_engagements | job_role_id | integer | int4 | YES |  |
| worker_engagements | job_level_id | integer | int4 | YES |  |
| worker_engagements | employment_type_id | integer | int4 | YES |  |
| worker_engagements | probation_ends_on | date | date | YES |  |
| worker_engagements | notice_period_days | integer | int4 | YES |  |
| worker_engagements | termination_reason | text | text | YES |  |
| worker_engagements | termination_notes | text | text | YES |  |
| worker_engagements | created_by | text | text | YES |  |
| worker_engagements | created_at | timestamp without time zone | timestamp | NO | now() |
| worker_engagements | updated_at | timestamp without time zone | timestamp | NO | now() |
| workers | worker_id | text | text | NO |  |
| workers | organization_id | text | text | NO |  |
| workers | organization_person_id | text | text | NO |  |
| workers | worker_number | text | text | YES |  |
| workers | status | text | text | NO | 'INACTIVE'::text |
| workers | is_payee | boolean | bool | NO | false |
| workers | deleted_at | timestamp without time zone | timestamp | YES |  |
| workers | created_at | timestamp without time zone | timestamp | NO | now() |
| workers | updated_at | timestamp without time zone | timestamp | NO | now() |
