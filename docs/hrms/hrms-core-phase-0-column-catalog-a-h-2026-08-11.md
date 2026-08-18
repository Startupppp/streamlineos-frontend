# HRMS core Phase 0 live column catalog A-H

Snapshot: 2026-08-11
Source: authorized production catalog, `REPEATABLE READ READ ONLY`, bounded timeouts

Tables: 26; columns: 316

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
| hr_employments | confirmation_date | date | date | YES |  |
| hr_employments | notice_start_date | date | date | YES |  |
| hr_employments | expected_last_day | date | date | YES |  |
| hr_employments | last_working_day | date | date | YES |  |
| hr_employments | exit_date | date | date | YES |  |
| hr_employments | exit_reason | text | text | YES |  |
| hr_employments | is_primary | boolean | bool | NO | true |
| hr_employments | deleted_at | timestamp without time zone | timestamp | YES |  |
| hr_employments | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_employments | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_employments | location_id | text | text | YES |  |
| hr_employments | department_id | text | text | YES |  |
| hr_job_levels | id | integer | int4 | NO | nextval('hr_job_levels_id_seq'::regclass) |
| hr_job_levels | org_id | text | text | NO |  |
| hr_job_levels | name | text | text | NO |  |
| hr_job_levels | code | text | text | YES |  |
| hr_job_levels | grade | text | text | YES |  |
| hr_job_levels | rank | integer | int4 | NO | 0 |
| hr_job_levels | description | text | text | YES |  |
| hr_job_levels | is_active | boolean | bool | NO | true |
| hr_job_levels | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_job_levels | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_job_roles | id | integer | int4 | NO | nextval('hr_job_roles_id_seq'::regclass) |
| hr_job_roles | org_id | text | text | NO |  |
| hr_job_roles | name | text | text | NO |  |
| hr_job_roles | code | text | text | YES |  |
| hr_job_roles | description | text | text | YES |  |
| hr_job_roles | is_active | boolean | bool | NO | true |
| hr_job_roles | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_job_roles | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_leave_ledger | id | integer | int4 | NO | nextval('hr_leave_ledger_id_seq'::regclass) |
| hr_leave_ledger | org_id | text | text | NO |  |
| hr_leave_ledger | user_id | text | text | NO |  |
| hr_leave_ledger | leave_type_id | integer | int4 | NO |  |
| hr_leave_ledger | txn_type | USER-DEFINED | hr_leave_txn_type | NO |  |
| hr_leave_ledger | days | numeric | numeric | NO |  |
| hr_leave_ledger | effective_date | date | date | NO |  |
| hr_leave_ledger | period | text | text | YES |  |
| hr_leave_ledger | source | USER-DEFINED | hr_leave_ledger_source | NO |  |
| hr_leave_ledger | source_id | text | text | YES |  |
| hr_leave_ledger | note | text | text | YES |  |
| hr_leave_ledger | payroll_status | USER-DEFINED | hr_leave_payroll_status | NO | 'pending'::hr_leave_payroll_status |
| hr_leave_ledger | created_by | text | text | YES |  |
| hr_leave_ledger | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_people | id | integer | int4 | NO | nextval('hr_people_id_seq'::regclass) |
| hr_people | org_id | text | text | NO |  |
| hr_people | user_id | text | text | YES |  |
| hr_people | first_name | text | text | NO |  |
| hr_people | last_name | text | text | NO |  |
| hr_people | work_email | text | text | NO |  |
| hr_people | personal_email | text | text | YES |  |
| hr_people | phone | text | text | YES |  |
| hr_people | date_of_birth | date | date | YES |  |
| hr_people | gender | text | text | YES |  |
| hr_people | nationality | text | text | YES |  |
| hr_people | address | jsonb | jsonb | YES |  |
| hr_people | emergency_contact | jsonb | jsonb | YES |  |
| hr_people | avatar_url | text | text | YES |  |
| hr_people | deleted_at | timestamp without time zone | timestamp | YES |  |
| hr_people | created_at | timestamp without time zone | timestamp | NO | now() |
| hr_people | updated_at | timestamp without time zone | timestamp | NO | now() |
| hr_reporting_lines | id | integer | int4 | NO | nextval('hr_reporting_lines_id_seq'::regclass) |
| hr_reporting_lines | org_id | text | text | NO |  |
| hr_reporting_lines | employment_id | integer | int4 | NO |  |
| hr_reporting_lines | manager_employment_id | integer | int4 | NO |  |
| hr_reporting_lines | line_type | USER-DEFINED | hr_reporting_line_type | NO | 'primary'::hr_reporting_line_type |
| hr_reporting_lines | effective_from | date | date | NO |  |
| hr_reporting_lines | effective_to | date | date | YES |  |
| hr_reporting_lines | created_by | text | text | YES |  |
| hr_reporting_lines | created_at | timestamp without time zone | timestamp | NO | now() |
