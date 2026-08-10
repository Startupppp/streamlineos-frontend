# HRMS core Phase 0 database inventory - 2026-08-10

Generated from the live database in an explicit read-only transaction with bounded statement and lock timeouts. It contains metadata and aggregate counts only; no tenant identifiers or row values are included.

## Table row counts and relation sizes

| Table | Rows | Heap bytes | Index bytes | Total bytes |
|---|---:|---:|---:|---:|
| alumni_profiles | 0 | 0 | 24576 | 32768 |
| attendance | 1 | 8192 | 65536 | 81920 |
| biometric_devices | 0 | 0 | 24576 | 32768 |
| biometric_logs | 0 | 0 | 32768 | 40960 |
| document_audit_logs | 0 | 0 | 16384 | 24576 |
| document_template_versions | 0 | 0 | 24576 | 32768 |
| document_templates | 0 | 0 | 24576 | 32768 |
| document_type_roles | 0 | 0 | 40960 | 49152 |
| document_types | 0 | 0 | 32768 | 40960 |
| documents | 0 | 0 | 40960 | 49152 |
| employee_devices | 0 | 0 | 16384 | 24576 |
| employee_shift_assignments | 0 | 0 | 32768 | 40960 |
| exit_checklists | 0 | 0 | 24576 | 32768 |
| geofences | 0 | 0 | 24576 | 32768 |
| holidays | 0 | 0 | 16384 | 24576 |
| hr_attendance_regularizations | 0 | 0 | 40960 | 49152 |
| hr_effective_dated_changes | 0 | 0 | 49152 | 57344 |
| hr_employee_sensitive_fields | 0 | 0 | 32768 | 40960 |
| hr_employment_custom_field_values | 0 | 0 | 32768 | 40960 |
| hr_employment_history | 0 | 0 | 32768 | 40960 |
| hr_employments | 0 | 0 | 49152 | 57344 |
| hr_job_levels | 0 | 0 | 32768 | 40960 |
| hr_job_roles | 0 | 0 | 32768 | 40960 |
| hr_leave_ledger | 0 | 0 | 40960 | 49152 |
| hr_people | 0 | 0 | 40960 | 49152 |
| hr_reporting_lines | 0 | 0 | 40960 | 49152 |
| leave_balances | 5 | 8192 | 65536 | 81920 |
| leave_blackout_dates | 0 | 0 | 24576 | 32768 |
| leave_policies | 0 | 0 | 24576 | 32768 |
| leave_requests | 0 | 0 | 65536 | 73728 |
| leave_types | 10 | 8192 | 49152 | 65536 |
| onboarding_documents | 0 | 0 | 32768 | 40960 |
| onboarding_tasks | 0 | 0 | 32768 | 40960 |
| org_unit_members | 0 | 0 | 32768 | 40960 |
| org_units | 49 | 16384 | 65536 | 114688 |
| organization_people | 3 | 8192 | 147456 | 163840 |
| resignations | 0 | 0 | 32768 | 40960 |
| roster_entries | 0 | 0 | 32768 | 40960 |
| rosters | 0 | 0 | 24576 | 32768 |
| shift_swap_requests | 0 | 0 | 32768 | 40960 |
| shift_templates | 0 | 0 | 32768 | 40960 |
| terminations | 0 | 0 | 40960 | 49152 |
| wfh_requests | 0 | 0 | 40960 | 49152 |
| worker_engagements | 2 | 8192 | 147456 | 163840 |
| workers | 1 | 8192 | 131072 | 147456 |

## Column catalog

| Table | Column | SQL type | UDT | Nullable | Default |
|---|---|---|---|---|---|
| alumni_profiles | id | integer | int4 | NO | nextval('alumni_profiles_id_seq'::regclass) |
| alumni_profiles | org_id | text | text | NO |  |
| alumni_profiles | user_id | text | text | NO |  |
| alumni_profiles | current_company | text | text | YES |  |
| alumni_profiles | current_role | text | text | YES |  |
| alumni_profiles | linkedin_url | text | text | YES |  |
| alumni_profiles | email | text | text | YES |  |
| alumni_profiles | left_date | date | date | YES |  |
| alumni_profiles | is_opted_in | boolean | bool | NO | true |
| alumni_profiles | rehire_eligibility | boolean | bool | NO | true |
| alumni_profiles | created_at | timestamp without time zone | timestamp | NO | now() |
| attendance | id | integer | int4 | NO | nextval('attendance_id_seq'::regclass) |
| attendance | org_id | text | text | NO |  |
| attendance | user_id | text | text | NO |  |
| attendance | date | date | date | NO |  |
| attendance | check_in | timestamp without time zone | timestamp | YES |  |
| attendance | check_out | timestamp without time zone | timestamp | YES |  |
| attendance | status | text | text | NO | 'PRESENT'::text |
| attendance | work_hours | numeric | numeric | YES |  |
| attendance | break_hours | numeric | numeric | NO | '0'::numeric |
| attendance | breaks | jsonb | jsonb | NO | '[]'::jsonb |
| attendance | location_data | jsonb | jsonb | YES |  |
| attendance | is_overtime | boolean | bool | NO | false |
| attendance | auto_checked_out | boolean | bool | NO | false |
| attendance | location_verified | boolean | bool | NO | false |
| attendance | created_at | timestamp without time zone | timestamp | NO | now() |
| biometric_devices | id | integer | int4 | NO | nextval('biometric_devices_id_seq'::regclass) |
| biometric_devices | org_id | text | text | NO |  |
| biometric_devices | name | text | text | NO |  |
| biometric_devices | ip_address | text | text | NO |  |
| biometric_devices | port | integer | int4 | NO | 4370 |
| biometric_devices | vendor | text | text | NO | 'ZKTeco'::text |
| biometric_devices | location | text | text | YES |  |
| biometric_devices | is_online | boolean | bool | NO | false |
| biometric_devices | last_sync_at | timestamp without time zone | timestamp | YES |  |
| biometric_devices | created_at | timestamp without time zone | timestamp | NO | now() |
| biometric_logs | id | integer | int4 | NO | nextval('biometric_logs_id_seq'::regclass) |
| biometric_logs | org_id | text | text | NO |  |
| biometric_logs | device_id | integer | int4 | NO |  |
| biometric_logs | user_id | text | text | YES |  |
| biometric_logs | biometric_user_id | text | text | YES |  |
| biometric_logs | punch_time | timestamp without time zone | timestamp | NO |  |
| biometric_logs | punch_type | text | text | NO | 'IN'::text |
| biometric_logs | raw_data | jsonb | jsonb | YES |  |
| biometric_logs | processed | boolean | bool | NO | false |
| biometric_logs | created_at | timestamp without time zone | timestamp | NO | now() |
| document_audit_logs | id | integer | int4 | NO | nextval('document_audit_logs_id_seq'::regclass) |
| document_audit_logs | org_id | text | text | NO |  |
| document_audit_logs | onboarding_document_id | integer | int4 | NO |  |
| document_audit_logs | action | USER-DEFINED | doc_audit_action | NO |  |
| document_audit_logs | performed_by | text | text | NO |  |
| document_audit_logs | remarks | text | text | YES |  |
| document_audit_logs | metadata | jsonb | jsonb | YES |  |
| document_audit_logs | created_at | timestamp without time zone | timestamp | NO | now() |
| document_template_versions | id | integer | int4 | NO | nextval('document_template_versions_id_seq'::regclass) |
| document_template_versions | template_id | integer | int4 | NO |  |
| document_template_versions | org_id | text | text | NO |  |
| document_template_versions | version | integer | int4 | NO |  |
| document_template_versions | title | text | text | NO |  |
| document_template_versions | type | text | text | NO |  |
| document_template_versions | html_content | text | text | NO |  |
| document_template_versions | variables | jsonb | jsonb | NO | '[]'::jsonb |
| document_template_versions | archived_at | timestamp without time zone | timestamp | NO | now() |
| document_template_versions | archived_by | text | text | NO |  |
| document_templates | id | integer | int4 | NO | nextval('document_templates_id_seq'::regclass) |
| document_templates | org_id | text | text | NO |  |
| document_templates | title | text | text | NO |  |
| document_templates | type | text | text | NO | 'OFFER'::text |
| document_templates | html_content | text | text | NO | ''::text |
| document_templates | variables | jsonb | jsonb | NO | '[]'::jsonb |
| document_templates | version | integer | int4 | NO | 1 |
| document_templates | is_active | boolean | bool | NO | true |
| document_templates | is_default | boolean | bool | NO | false |
| document_templates | created_by | text | text | NO |  |
| document_templates | created_at | timestamp without time zone | timestamp | NO | now() |
| document_templates | updated_at | timestamp without time zone | timestamp | NO | now() |
| document_type_roles | id | integer | int4 | NO | nextval('document_type_roles_id_seq'::regclass) |
| document_type_roles | org_id | text | text | NO |  |
| document_type_roles | document_type_id | integer | int4 | NO |  |
| document_type_roles | role_slug | text | text | NO |  |
| document_types | id | integer | int4 | NO | nextval('document_types_id_seq'::regclass) |
| document_types | org_id | text | text | NO |  |
| document_types | name | text | text | NO |  |
| document_types | slug | text | text | NO |  |
| document_types | description | text | text | YES |  |
| document_types | is_mandatory | boolean | bool | NO | true |
| document_types | is_active | boolean | bool | NO | true |
| document_types | sort_order | integer | int4 | NO | 0 |
| document_types | created_at | timestamp without time zone | timestamp | NO | now() |
| document_types | updated_at | timestamp without time zone | timestamp | NO | now() |
| document_types | country_code | text | text | YES |  |
| documents | id | integer | int4 | NO | nextval('documents_id_seq'::regclass) |
| documents | org_id | text | text | NO |  |
| documents | user_id | text | text | YES |  |
| documents | name | text | text | NO |  |
| documents | description | text | text | YES |  |
| documents | type | USER-DEFINED | document_type | NO |  |
| documents | category | text | text | YES |  |
| documents | file_url | text | text | NO |  |
| documents | file_name | text | text | YES |  |
| documents | file_size | integer | int4 | YES |  |
| documents | mime_type | text | text | YES |  |
| documents | version | integer | int4 | NO | 1 |
| documents | parent_document_id | integer | int4 | YES |  |
| documents | is_public | boolean | bool | NO | false |
| documents | is_active | boolean | bool | NO | true |
| documents | expiry_date | date | date | YES |  |
| documents | expiry_reminder_sent | boolean | bool | NO | false |
| documents | tags | ARRAY | _text | NO | '{}'::text[] |
| documents | metadata | jsonb | jsonb | YES |  |
| documents | uploaded_by | text | text | YES |  |
| documents | created_at | timestamp without time zone | timestamp | NO | now() |
| documents | updated_at | timestamp without time zone | timestamp | NO | now() |
| documents | department_id | text | text | YES |  |
| employee_devices | id | integer | int4 | NO | nextval('employee_devices_id_seq'::regclass) |
| employee_devices | org_id | text | text | NO |  |
| employee_devices | user_id | text | text | NO |  |
| employee_devices | device_type | text | text | NO |  |
| employee_devices | device_name | text | text | NO |  |
| employee_devices | serial_number | text | text | YES |  |
| employee_devices | brand | text | text | YES |  |
| employee_devices | model | text | text | YES |  |
| employee_devices | assigned_date | date | date | YES |  |
| employee_devices | return_date | date | date | YES |  |
| employee_devices | status | USER-DEFINED | device_status | NO | 'ACTIVE'::device_status |
| employee_devices | notes | text | text | YES |  |
| employee_devices | created_at | timestamp without time zone | timestamp | NO | now() |
| employee_devices | updated_at | timestamp without time zone | timestamp | NO | now() |
| employee_shift_assignments | id | integer | int4 | NO | nextval('employee_shift_assignments_id_seq'::regclass) |
| employee_shift_assignments | org_id | text | text | NO |  |
| employee_shift_assignments | user_id | text | text | NO |  |
| employee_shift_assignments | shift_id | integer | int4 | NO |  |
| employee_shift_assignments | effective_from | text | text | NO |  |
| employee_shift_assignments | effective_to | text | text | YES |  |
| employee_shift_assignments | is_active | boolean | bool | NO | true |
| employee_shift_assignments | created_at | timestamp without time zone | timestamp | NO | now() |
| exit_checklists | id | integer | int4 | NO | nextval('exit_checklists_id_seq'::regclass) |
| exit_checklists | resignation_id | integer | int4 | NO |  |
| exit_checklists | item | text | text | NO |  |
| exit_checklists | assigned_to | text | text | YES |  |
| exit_checklists | status | USER-DEFINED | exit_checklist_status | NO | 'PENDING'::exit_checklist_status |
| exit_checklists | completed_at | timestamp without time zone | timestamp | YES |  |
| exit_checklists | notes | text | text | YES |  |
| exit_checklists | org_id | text | text | NO |  |
| geofences | id | integer | int4 | NO | nextval('geofences_id_seq'::regclass) |
| geofences | org_id | text | text | NO |  |
| geofences | name | text | text | NO |  |
| geofences | lat | numeric | numeric | NO |  |
| geofences | lng | numeric | numeric | NO |  |
| geofences | radius_meters | integer | int4 | NO | 200 |
| geofences | is_active | boolean | bool | NO | true |
| geofences | created_at | timestamp without time zone | timestamp | NO | now() |
| geofences | updated_at | timestamp without time zone | timestamp | NO | now() |
| holidays | id | integer | int4 | NO | nextval('holidays_id_seq'::regclass) |
| holidays | org_id | text | text | NO |  |
| holidays | name | text | text | NO |  |
| holidays | date | date | date | NO |  |
| holidays | message | text | text | YES |  |
| holidays | is_public | boolean | bool | NO | false |
| holidays | notification_sent | boolean | bool | NO | false |
| holidays | created_at | timestamp without time zone | timestamp | NO | now() |
| holidays | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_attendance_regularizations | id | integer | int4 | NO | nextval('hr_attendance_regularizations_id_seq'::regclass) |
| hr_attendance_regularizations | org_id | text | text | NO |  |
| hr_attendance_regularizations | user_id | text | text | NO |  |
| hr_attendance_regularizations | attendance_date | date | date | NO |  |
| hr_attendance_regularizations | requested_check_in | timestamp without time zone | timestamp | YES |  |
| hr_attendance_regularizations | requested_check_out | timestamp without time zone | timestamp | YES |  |
| hr_attendance_regularizations | reason | text | text | NO |  |
| hr_attendance_regularizations | status | text | text | NO | 'PENDING'::text |
| hr_attendance_regularizations | workflow_instance_id | text | text | YES |  |
| hr_attendance_regularizations | approved_by | text | text | YES |  |
| hr_attendance_regularizations | approved_at | timestamp without time zone | timestamp | YES |  |
| hr_attendance_regularizations | rejected_by | text | text | YES |  |
| hr_attendance_regularizations | rejected_at | timestamp without time zone | timestamp | YES |  |
| hr_attendance_regularizations | rejection_reason | text | text | YES |  |
| hr_attendance_regularizations | attendance_id | integer | int4 | YES |  |
| hr_attendance_regularizations | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_attendance_regularizations | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_effective_dated_changes | id | integer | int4 | NO | nextval('hr_effective_dated_changes_id_seq'::regclass) |
| hr_effective_dated_changes | org_id | text | text | NO |  |
| hr_effective_dated_changes | employment_id | integer | int4 | NO |  |
| hr_effective_dated_changes | change_type | USER-DEFINED | hr_effective_dated_change_type | NO |  |
| hr_effective_dated_changes | old_value | jsonb | jsonb | YES |  |
| hr_effective_dated_changes | new_value | jsonb | jsonb | YES |  |
| hr_effective_dated_changes | effective_from | date | date | NO |  |
| hr_effective_dated_changes | effective_to | date | date | YES |  |
| hr_effective_dated_changes | status | USER-DEFINED | hr_effective_dated_change_status | NO | 'draft'::hr_effective_dated_change_status |
| hr_effective_dated_changes | approved_by | text | text | YES |  |
| hr_effective_dated_changes | approved_at | timestamp without time zone | timestamp | YES |  |
| hr_effective_dated_changes | applied_at | timestamp without time zone | timestamp | YES |  |
| hr_effective_dated_changes | notes | text | text | YES |  |
| hr_effective_dated_changes | created_by | text | text | NO |  |
| hr_effective_dated_changes | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_effective_dated_changes | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_employee_sensitive_fields | id | integer | int4 | NO | nextval('hr_employee_sensitive_fields_id_seq'::regclass) |
| hr_employee_sensitive_fields | org_id | text | text | NO |  |
| hr_employee_sensitive_fields | employment_id | integer | int4 | NO |  |
| hr_employee_sensitive_fields | salary_amount_cents | integer | int4 | YES |  |
| hr_employee_sensitive_fields | salary_currency | text | text | YES | 'INR'::text |
| hr_employee_sensitive_fields | salary_frequency | text | text | YES | 'MONTHLY'::text |
| hr_employee_sensitive_fields | bank_details | jsonb | jsonb | YES |  |
| hr_employee_sensitive_fields | tax_id | text | text | YES |  |
| hr_employee_sensitive_fields | pan_number | text | text | YES |  |
| hr_employee_sensitive_fields | national_id | text | text | YES |  |
| hr_employee_sensitive_fields | passport_number | text | text | YES |  |
| hr_employee_sensitive_fields | passport_expiry | date | date | YES |  |
| hr_employee_sensitive_fields | visa_type | text | text | YES |  |
| hr_employee_sensitive_fields | visa_expiry | date | date | YES |  |
| hr_employee_sensitive_fields | medical_notes | text | text | YES |  |
| hr_employee_sensitive_fields | blood_group | text | text | YES |  |
| hr_employee_sensitive_fields | disciplinary_records | jsonb | jsonb | YES |  |
| hr_employee_sensitive_fields | grievance_records | jsonb | jsonb | YES |  |
| hr_employee_sensitive_fields | bgv_status | text | text | YES |  |
| hr_employee_sensitive_fields | bgv_completed_at | timestamp without time zone | timestamp | YES |  |
| hr_employee_sensitive_fields | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_employee_sensitive_fields | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_employment_custom_field_values | id | integer | int4 | NO | nextval('hr_employment_custom_field_values_id_seq'::regclass) |
| hr_employment_custom_field_values | org_id | text | text | NO |  |
| hr_employment_custom_field_values | employment_id | integer | int4 | NO |  |
| hr_employment_custom_field_values | field_definition_id | integer | int4 | NO |  |
| hr_employment_custom_field_values | value | jsonb | jsonb | YES |  |
| hr_employment_custom_field_values | created_at | timestamp with time zone | timestamptz | NO | now() |
| hr_employment_custom_field_values | updated_at | timestamp with time zone | timestamptz | NO | now() |
| hr_employment_history | id | integer | int4 | NO | nextval('hr_employment_history_id_seq'::regclass) |
| hr_employment_history | org_id | text | text | NO |  |
| hr_employment_history | employment_id | integer | int4 | NO |  |
| hr_employment_history | from_status | USER-DEFINED | hr_employment_lifecycle_status | NO |  |
| hr_employment_history | to_status | USER-DEFINED | hr_employment_lifecycle_status | NO |  |
| hr_employment_history | reason | text | text | YES |  |
| hr_employment_history | notes | text | text | YES |  |
| hr_employment_history | effective_date | date | date | YES |  |
| hr_employment_history | created_by | text | text | YES |  |
| hr_employment_history | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_employments | id | integer | int4 | NO | nextval('hr_employments_id_seq'::regclass) |
| hr_employments | org_id | text | text | NO |  |
| hr_employments | person_id | integer | int4 | NO |  |
| hr_employments | employee_number | text | text | NO |  |
| hr_employments | lifecycle_status | USER-DEFINED | hr_employment_lifecycle_status | NO | 'ACTIVE'::hr_employment_lifecycle_status |
| hr_employments | worker_type | USER-DEFINED | hr_worker_type | NO | 'FULL_TIME'::hr_worker_type |
| hr_employments | job_role_id | integer | int4 | YES |  |
| hr_employments | job_level_id | integer | int4 | YES |  |
| hr_employments | employment_type_id | integer | int4 | YES |  |
| hr_employments | designation | text | text | YES |  |
| hr_employments | joining_date | date | date | YES |  |
| hr_employments | probation_end_date | date | date | YES |  |
| hr_employments | confirmation_date | date | date …10 tokens truncated…ublic.hr_leave_ledger USING btree (id) |
| hr_leave_ledger | idx_hr_leave_ledger_org_user | 8192 | 1 | CREATE INDEX idx_hr_leave_ledger_org_user ON public.hr_leave_ledger USING btree (org_id, user_id) |
| hr_leave_ledger | idx_hr_leave_ledger_payroll_status | 8192 | 0 | CREATE INDEX idx_hr_leave_ledger_payroll_status ON public.hr_leave_ledger USING btree (org_id, payroll_status) |
| hr_leave_ledger | idx_hr_leave_ledger_user_type_date | 8192 | 9 | CREATE INDEX idx_hr_leave_ledger_user_type_date ON public.hr_leave_ledger USING btree (org_id, user_id, leave_type_id, effective_date) |
| hr_leave_ledger | uniq_hr_leave_ledger_org_id | 8192 | 5 | CREATE UNIQUE INDEX uniq_hr_leave_ledger_org_id ON public.hr_leave_ledger USING btree (org_id, id) |
| hr_people | hr_people_pkey | 8192 | 2 | CREATE UNIQUE INDEX hr_people_pkey ON public.hr_people USING btree (id) |
| hr_people | idx_hr_people_org | 8192 | 0 | CREATE INDEX idx_hr_people_org ON public.hr_people USING btree (org_id) |
| hr_people | idx_hr_people_user | 8192 | 1 | CREATE INDEX idx_hr_people_user ON public.hr_people USING btree (user_id) |
| hr_people | uniq_hr_people_org_id | 8192 | 58 | CREATE UNIQUE INDEX uniq_hr_people_org_id ON public.hr_people USING btree (org_id, id) |
| hr_people | uniq_hr_people_org_work_email | 8192 | 0 | CREATE UNIQUE INDEX uniq_hr_people_org_work_email ON public.hr_people USING btree (org_id, work_email) |
| hr_reporting_lines | hr_reporting_lines_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_reporting_lines_pkey ON public.hr_reporting_lines USING btree (id) |
| hr_reporting_lines | idx_hr_reporting_lines_manager | 8192 | 0 | CREATE INDEX idx_hr_reporting_lines_manager ON public.hr_reporting_lines USING btree (manager_employment_id) |
| hr_reporting_lines | idx_hr_reporting_lines_org_emp | 8192 | 0 | CREATE INDEX idx_hr_reporting_lines_org_emp ON public.hr_reporting_lines USING btree (org_id, employment_id) |
| hr_reporting_lines | idx_hr_reporting_lines_org_type | 8192 | 0 | CREATE INDEX idx_hr_reporting_lines_org_type ON public.hr_reporting_lines USING btree (org_id, line_type) |
| hr_reporting_lines | uniq_hr_reporting_lines_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_hr_reporting_lines_org_id ON public.hr_reporting_lines USING btree (org_id, id) |
| leave_balances | idx_leave_balances_org_year | 16384 | 152 | CREATE INDEX idx_leave_balances_org_year ON public.leave_balances USING btree (org_id, year) |
| leave_balances | leave_balances_pkey | 16384 | 5 | CREATE UNIQUE INDEX leave_balances_pkey ON public.leave_balances USING btree (id) |
| leave_balances | uniq_leave_balances_org_id | 16384 | 7 | CREATE UNIQUE INDEX uniq_leave_balances_org_id ON public.leave_balances USING btree (org_id, id) |
| leave_balances | uniq_leave_balances_user_type_year | 16384 | 288 | CREATE UNIQUE INDEX uniq_leave_balances_user_type_year ON public.leave_balances USING btree (user_id, leave_type_id, year) |
| leave_blackout_dates | idx_leave_blackout_org | 8192 | 0 | CREATE INDEX idx_leave_blackout_org ON public.leave_blackout_dates USING btree (org_id, start_date) |
| leave_blackout_dates | leave_blackout_dates_pkey | 8192 | 0 | CREATE UNIQUE INDEX leave_blackout_dates_pkey ON public.leave_blackout_dates USING btree (id) |
| leave_blackout_dates | uniq_leave_blackout_dates_org_id | 8192 | 4 | CREATE UNIQUE INDEX uniq_leave_blackout_dates_org_id ON public.leave_blackout_dates USING btree (org_id, id) |
| leave_policies | idx_leave_policies_org_type | 8192 | 0 | CREATE INDEX idx_leave_policies_org_type ON public.leave_policies USING btree (org_id, leave_type_id) |
| leave_policies | leave_policies_pkey | 8192 | 0 | CREATE UNIQUE INDEX leave_policies_pkey ON public.leave_policies USING btree (id) |
| leave_policies | uniq_leave_policies_org_id | 8192 | 102 | CREATE UNIQUE INDEX uniq_leave_policies_org_id ON public.leave_policies USING btree (org_id, id) |
| leave_requests | idx_leave_requests_dates | 8192 | 0 | CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree (start_date, end_date) |
| leave_requests | idx_leave_requests_org_approver | 8192 | 1 | CREATE INDEX idx_leave_requests_org_approver ON public.leave_requests USING btree (org_id, approver_id) |
| leave_requests | idx_leave_requests_org_created | 8192 | 193 | CREATE INDEX idx_leave_requests_org_created ON public.leave_requests USING btree (org_id, created_at) |
| leave_requests | idx_leave_requests_org_status | 8192 | 3 | CREATE INDEX idx_leave_requests_org_status ON public.leave_requests USING btree (org_id, status) |
| leave_requests | idx_leave_requests_org_user_status | 8192 | 444 | CREATE INDEX idx_leave_requests_org_user_status ON public.leave_requests USING btree (org_id, user_id, status) |
| leave_requests | idx_leave_requests_user_id | 8192 | 1 | CREATE INDEX idx_leave_requests_user_id ON public.leave_requests USING btree (user_id) |
| leave_requests | leave_requests_pkey | 8192 | 0 | CREATE UNIQUE INDEX leave_requests_pkey ON public.leave_requests USING btree (id) |
| leave_requests | uniq_leave_requests_org_id | 8192 | 1878 | CREATE UNIQUE INDEX uniq_leave_requests_org_id ON public.leave_requests USING btree (org_id, id) |
| leave_types | leave_types_pkey | 16384 | 35 | CREATE UNIQUE INDEX leave_types_pkey ON public.leave_types USING btree (id) |
| leave_types | uniq_leave_types_org_id | 16384 | 84 | CREATE UNIQUE INDEX uniq_leave_types_org_id ON public.leave_types USING btree (org_id, id) |
| leave_types | uniq_leave_types_org_name | 16384 | 15 | CREATE UNIQUE INDEX uniq_leave_types_org_name ON public.leave_types USING btree (org_id, name) |
| onboarding_documents | idx_onboarding_docs_org | 8192 | 0 | CREATE INDEX idx_onboarding_docs_org ON public.onboarding_documents USING btree (org_id) |
| onboarding_documents | idx_onboarding_docs_user | 8192 | 1 | CREATE INDEX idx_onboarding_docs_user ON public.onboarding_documents USING btree (user_id) |
| onboarding_documents | onboarding_documents_pkey | 8192 | 0 | CREATE UNIQUE INDEX onboarding_documents_pkey ON public.onboarding_documents USING btree (id) |
| onboarding_documents | uniq_onboarding_documents_org_id | 8192 | 329 | CREATE UNIQUE INDEX uniq_onboarding_documents_org_id ON public.onboarding_documents USING btree (org_id, id) |
| onboarding_tasks | idx_onboarding_tasks_status | 8192 | 0 | CREATE INDEX idx_onboarding_tasks_status ON public.onboarding_tasks USING btree (org_id, status) |
| onboarding_tasks | idx_onboarding_tasks_user | 8192 | 1 | CREATE INDEX idx_onboarding_tasks_user ON public.onboarding_tasks USING btree (user_id, org_id) |
| onboarding_tasks | onboarding_tasks_pkey | 8192 | 0 | CREATE UNIQUE INDEX onboarding_tasks_pkey ON public.onboarding_tasks USING btree (id) |
| onboarding_tasks | uniq_onboarding_tasks_org_id | 8192 | 62 | CREATE UNIQUE INDEX uniq_onboarding_tasks_org_id ON public.onboarding_tasks USING btree (org_id, id) |
| org_unit_members | idx_org_unit_members_org_user | 8192 | 112 | CREATE INDEX idx_org_unit_members_org_user ON public.org_unit_members USING btree (org_id, user_id) |
| org_unit_members | idx_org_unit_members_unit | 8192 | 18 | CREATE INDEX idx_org_unit_members_unit ON public.org_unit_members USING btree (org_unit_id) |
| org_unit_members | org_unit_members_pkey | 8192 | 0 | CREATE UNIQUE INDEX org_unit_members_pkey ON public.org_unit_members USING btree (id) |
| org_unit_members | uniq_org_unit_members_unit_user | 8192 | 0 | CREATE UNIQUE INDEX uniq_org_unit_members_unit_user ON public.org_unit_members USING btree (org_unit_id, user_id) |
| org_units | idx_org_units_org_kind | 16384 | 0 | CREATE INDEX idx_org_units_org_kind ON public.org_units USING btree (org_id, kind) |
| org_units | idx_org_units_parent | 16384 | 0 | CREATE INDEX idx_org_units_parent ON public.org_units USING btree (parent_id) |
| org_units | org_units_pkey | 16384 | 53 | CREATE UNIQUE INDEX org_units_pkey ON public.org_units USING btree (id) |
| org_units | uniq_org_units_org_kind_code | 16384 | 268 | CREATE UNIQUE INDEX uniq_org_units_org_kind_code ON public.org_units USING btree (org_id, kind, code) |
| organization_people | idx_org_people_membership | 16384 | 2 | CREATE INDEX idx_org_people_membership ON public.organization_people USING btree (organization_membership_id) |
| organization_people | idx_org_people_org | 16384 | 0 | CREATE INDEX idx_org_people_org ON public.organization_people USING btree (organization_id) |
| organization_people | idx_org_people_user | 16384 | 0 | CREATE INDEX idx_org_people_user ON public.organization_people USING btree (user_id) |
| organization_people | organization_people_pkey | 16384 | 0 | CREATE UNIQUE INDEX organization_people_pkey ON public.organization_people USING btree (organization_person_id) |
| organization_people | uniq_org_people_org_membership | 16384 | 0 | CREATE UNIQUE INDEX uniq_org_people_org_membership ON public.organization_people USING btree (organization_id, organization_membership_id) WHERE (organization_membership_id IS NOT NULL) |
| organization_people | uniq_org_people_org_person | 16384 | 0 | CREATE UNIQUE INDEX uniq_org_people_org_person ON public.organization_people USING btree (organization_id, organization_person_id) |
| organization_people | uniq_org_people_org_user | 16384 | 1 | CREATE UNIQUE INDEX uniq_org_people_org_user ON public.organization_people USING btree (organization_id, user_id) WHERE (user_id IS NOT NULL) |
| organization_people | uniq_org_people_org_work_email | 16384 | 0 | CREATE UNIQUE INDEX uniq_org_people_org_work_email ON public.organization_people USING btree (organization_id, work_email) WHERE (work_email IS NOT NULL) |
| organization_people | uniq_organization_people_org_id | 16384 | 345 | CREATE UNIQUE INDEX uniq_organization_people_org_id ON public.organization_people USING btree (organization_id, organization_person_id) |
| resignations | idx_resignations_org | 8192 | 0 | CREATE INDEX idx_resignations_org ON public.resignations USING btree (org_id) |
| resignations | idx_resignations_user | 8192 | 1 | CREATE INDEX idx_resignations_user ON public.resignations USING btree (user_id) |
| resignations | resignations_pkey | 8192 | 0 | CREATE UNIQUE INDEX resignations_pkey ON public.resignations USING btree (id) |
| resignations | uniq_resignations_org_id | 8192 | 1826 | CREATE UNIQUE INDEX uniq_resignations_org_id ON public.resignations USING btree (org_id, id) |
| roster_entries | idx_roster_entries_roster | 8192 | 0 | CREATE INDEX idx_roster_entries_roster ON public.roster_entries USING btree (roster_id) |
| roster_entries | idx_roster_entries_user_date | 8192 | 12 | CREATE INDEX idx_roster_entries_user_date ON public.roster_entries USING btree (user_id, date) |
| roster_entries | roster_entries_pkey | 8192 | 0 | CREATE UNIQUE INDEX roster_entries_pkey ON public.roster_entries USING btree (id) |
| roster_entries | uniq_roster_entries_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_roster_entries_org_id ON public.roster_entries USING btree (org_id, id) |
| rosters | idx_rosters_org_week | 8192 | 0 | CREATE INDEX idx_rosters_org_week ON public.rosters USING btree (org_id, week_start) |
| rosters | rosters_pkey | 8192 | 0 | CREATE UNIQUE INDEX rosters_pkey ON public.rosters USING btree (id) |
| rosters | uniq_rosters_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_rosters_org_id ON public.rosters USING btree (org_id, id) |
| shift_swap_requests | idx_shift_swaps_org_status | 8192 | 0 | CREATE INDEX idx_shift_swaps_org_status ON public.shift_swap_requests USING btree (org_id, status) |
| shift_swap_requests | idx_shift_swaps_requester | 8192 | 1 | CREATE INDEX idx_shift_swaps_requester ON public.shift_swap_requests USING btree (requester_id) |
| shift_swap_requests | shift_swap_requests_pkey | 8192 | 0 | CREATE UNIQUE INDEX shift_swap_requests_pkey ON public.shift_swap_requests USING btree (id) |
| shift_swap_requests | uniq_shift_swap_requests_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_shift_swap_requests_org_id ON public.shift_swap_requests USING btree (org_id, id) |
| shift_templates | idx_shift_templates_org_active | 8192 | 74 | CREATE INDEX idx_shift_templates_org_active ON public.shift_templates USING btree (org_id, is_active) |
| shift_templates | shift_templates_pkey | 8192 | 0 | CREATE UNIQUE INDEX shift_templates_pkey ON public.shift_templates USING btree (id) |
| shift_templates | uniq_shift_templates_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_shift_templates_org_id ON public.shift_templates USING btree (org_id, id) |
| shift_templates | uniq_shift_templates_org_name | 8192 | 0 | CREATE UNIQUE INDEX uniq_shift_templates_org_name ON public.shift_templates USING btree (org_id, name) |
| terminations | idx_terminations_org | 8192 | 0 | CREATE INDEX idx_terminations_org ON public.terminations USING btree (org_id) |
| terminations | idx_terminations_status | 8192 | 0 | CREATE INDEX idx_terminations_status ON public.terminations USING btree (status) |
| terminations | idx_terminations_user | 8192 | 1 | CREATE INDEX idx_terminations_user ON public.terminations USING btree (user_id) |
| terminations | terminations_pkey | 8192 | 0 | CREATE UNIQUE INDEX terminations_pkey ON public.terminations USING btree (id) |
| terminations | uniq_terminations_org_id | 8192 | 4 | CREATE UNIQUE INDEX uniq_terminations_org_id ON public.terminations USING btree (org_id, id) |
| wfh_requests | idx_wfh_requests_org_status | 8192 | 0 | CREATE INDEX idx_wfh_requests_org_status ON public.wfh_requests USING btree (org_id, status) |
| wfh_requests | idx_wfh_requests_org_user_status | 8192 | 59 | CREATE INDEX idx_wfh_requests_org_user_status ON public.wfh_requests USING btree (org_id, user_id, status) |
| wfh_requests | uniq_wfh_requests_org_id | 8192 | 20 | CREATE UNIQUE INDEX uniq_wfh_requests_org_id ON public.wfh_requests USING btree (org_id, id) |
| wfh_requests | uniq_wfh_requests_user_date | 8192 | 1 | CREATE UNIQUE INDEX uniq_wfh_requests_user_date ON public.wfh_requests USING btree (user_id, date) |
| wfh_requests | wfh_requests_pkey | 8192 | 0 | CREATE UNIQUE INDEX wfh_requests_pkey ON public.wfh_requests USING btree (id) |
| worker_engagements | excl_worker_engagements_overlap | 8192 | 14 | CREATE INDEX excl_worker_engagements_overlap ON public.worker_engagements USING gist (organization_id, worker_id, daterange(starts_on, COALESCE(ends_on, 'infinity'::date), '[)'::text)) WHERE (status <> ALL (ARRAY['COMPLETED'::worker_engagement_status, 'TERMINATED'::worker_engagement_status, 'CANCELLED'::worker_engagement_status])) |
| worker_engagements | idx_worker_engagements_manager | 16384 | 0 | CREATE INDEX idx_worker_engagements_manager ON public.worker_engagements USING btree (manager_engagement_id) |
| worker_engagements | idx_worker_engagements_org | 16384 | 0 | CREATE INDEX idx_worker_engagements_org ON public.worker_engagements USING btree (organization_id) |
| worker_engagements | idx_worker_engagements_org_starts | 16384 | 0 | CREATE INDEX idx_worker_engagements_org_starts ON public.worker_engagements USING btree (organization_id, starts_on) |
| worker_engagements | idx_worker_engagements_org_status | 16384 | 0 | CREATE INDEX idx_worker_engagements_org_status ON public.worker_engagements USING btree (organization_id, status) |
| worker_engagements | idx_worker_engagements_worker | 16384 | 0 | CREATE INDEX idx_worker_engagements_worker ON public.worker_engagements USING btree (worker_id) |
| worker_engagements | uniq_worker_engagements_active_primary | 8192 | 0 | CREATE UNIQUE INDEX uniq_worker_engagements_active_primary ON public.worker_engagements USING btree (organization_id, worker_id) WHERE ((is_primary = true) AND (status = 'ACTIVE'::worker_engagement_status)) |
| worker_engagements | uniq_worker_engagements_org_engagement | 16384 | 0 | CREATE UNIQUE INDEX uniq_worker_engagements_org_engagement ON public.worker_engagements USING btree (organization_id, worker_engagement_id) |
| worker_engagements | uniq_worker_engagements_org_id | 16384 | 15 | CREATE UNIQUE INDEX uniq_worker_engagements_org_id ON public.worker_engagements USING btree (organization_id, worker_engagement_id) |
| worker_engagements | worker_engagements_pkey | 16384 | 0 | CREATE UNIQUE INDEX worker_engagements_pkey ON public.worker_engagements USING btree (worker_engagement_id) |
| workers | idx_workers_org | 16384 | 0 | CREATE INDEX idx_workers_org ON public.workers USING btree (organization_id) |
| workers | idx_workers_org_status | 16384 | 0 | CREATE INDEX idx_workers_org_status ON public.workers USING btree (organization_id, status) |
| workers | idx_workers_person | 16384 | 1 | CREATE INDEX idx_workers_person ON public.workers USING btree (organization_person_id) |
| workers | uniq_workers_org_id | 16384 | 68 | CREATE UNIQUE INDEX uniq_workers_org_id ON public.workers USING btree (organization_id, worker_id) |
| workers | uniq_workers_org_number | 16384 | 0 | CREATE UNIQUE INDEX uniq_workers_org_number ON public.workers USING btree (organization_id, worker_number) WHERE (worker_number IS NOT NULL) |
| workers | uniq_workers_org_person | 16384 | 132 | CREATE UNIQUE INDEX uniq_workers_org_person ON public.workers USING btree (organization_id, organization_person_id) |
| workers | uniq_workers_org_worker | 16384 | 0 | CREATE UNIQUE INDEX uniq_workers_org_worker ON public.workers USING btree (organization_id, worker_id) |
| workers | workers_pkey | 16384 | 0 | CREATE UNIQUE INDEX workers_pkey ON public.workers USING btree (worker_id) |

## Row-level security catalog

| Table | RLS enabled | FORCE RLS | Policies |
|---|---|---|---|
| alumni_profiles | true | false | tenant_isolation |
| attendance | true | false | tenant_isolation |
| biometric_devices | true | false | tenant_isolation |
| biometric_logs | true | false | tenant_isolation |
| document_audit_logs | true | false | tenant_isolation |
| document_template_versions | true | false | tenant_isolation |
| document_templates | true | false | tenant_isolation |
| document_type_roles | true | false | tenant_isolation |
| document_types | true | false | tenant_isolation |
| documents | true | false | tenant_isolation |
| employee_devices | true | false | tenant_isolation |
| employee_shift_assignments | true | false | tenant_isolation |
| exit_checklists | true | false | tenant_isolation |
| geofences | true | false | tenant_isolation |
| holidays | true | false | tenant_isolation |
| hr_attendance_regularizations | true | false | tenant_isolation |
| hr_effective_dated_changes | true | false | tenant_isolation |
| hr_employee_sensitive_fields | true | false | tenant_isolation |
| hr_employment_custom_field_values | true | false | tenant_isolation |
| hr_employment_history | true | false | tenant_isolation |
| hr_employments | true | false | tenant_isolation |
| hr_job_levels | true | false | tenant_isolation |
| hr_job_roles | true | false | tenant_isolation |
| hr_leave_ledger | true | false | tenant_isolation |
| hr_people | true | false | tenant_isolation |
| hr_reporting_lines | true | false | tenant_isolation |
| leave_balances | true | false | tenant_isolation |
| leave_blackout_dates | true | false | tenant_isolation |
| leave_policies | true | false | tenant_isolation |
| leave_requests | true | false | tenant_isolation |
| leave_types | true | false | tenant_isolation |
| onboarding_documents | true | false | tenant_isolation |
| onboarding_tasks | true | false | tenant_isolation |
| org_unit_members | true | false | tenant_isolation |
| org_units | true | false | tenant_isolation |
| organization_people | true | false | tenant_isolation |
| resignations | true | false | tenant_isolation |
| roster_entries | true | false | tenant_isolation |
| rosters | true | false | tenant_isolation |
| shift_swap_requests | true | false | tenant_isolation |
| shift_templates | true | false | tenant_isolation |
| terminations | true | false | tenant_isolation |
| wfh_requests | true | false | tenant_isolation |
| worker_engagements | true | false | tenant_isolation |
| workers | true | false | tenant_isolation |
