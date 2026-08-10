# HRMS core Phase 0 index inventory - 2026-08-10

Generated from the live database in an explicit read-only transaction. Scan counts are cumulative with no recorded reset timestamp. Zero scans are not deletion proof because most audited tables are empty.

| Table | Index | Bytes | Scans | Definition |
|---|---|---:|---:|---|
| alumni_profiles | alumni_profiles_pkey | 8192 | 0 | CREATE UNIQUE INDEX alumni_profiles_pkey ON public.alumni_profiles USING btree (id) |
| alumni_profiles | idx_alumni_org | 8192 | 0 | CREATE INDEX idx_alumni_org ON public.alumni_profiles USING btree (org_id) |
| alumni_profiles | uniq_alumni_profiles_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_alumni_profiles_org_id ON public.alumni_profiles USING btree (org_id, id) |
| attendance | attendance_pkey | 16384 | 1 | CREATE UNIQUE INDEX attendance_pkey ON public.attendance USING btree (id) |
| attendance | idx_attendance_org_date_status | 16384 | 304 | CREATE INDEX idx_attendance_org_date_status ON public.attendance USING btree (org_id, date, status) |
| attendance | idx_attendance_org_user_date | 16384 | 5672 | CREATE INDEX idx_attendance_org_user_date ON public.attendance USING btree (org_id, user_id, date) |
| attendance | uniq_attendance_org_id | 16384 | 13 | CREATE UNIQUE INDEX uniq_attendance_org_id ON public.attendance USING btree (org_id, id) |
| biometric_devices | biometric_devices_pkey | 8192 | 0 | CREATE UNIQUE INDEX biometric_devices_pkey ON public.biometric_devices USING btree (id) |
| biometric_devices | idx_biometric_devices_org | 8192 | 0 | CREATE INDEX idx_biometric_devices_org ON public.biometric_devices USING btree (org_id) |
| biometric_devices | uniq_biometric_devices_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_biometric_devices_org_id ON public.biometric_devices USING btree (org_id, id) |
| biometric_logs | biometric_logs_pkey | 8192 | 0 | CREATE UNIQUE INDEX biometric_logs_pkey ON public.biometric_logs USING btree (id) |
| biometric_logs | idx_biometric_logs_org_device | 8192 | 0 | CREATE INDEX idx_biometric_logs_org_device ON public.biometric_logs USING btree (org_id, device_id) |
| biometric_logs | idx_biometric_logs_user_time | 8192 | 1 | CREATE INDEX idx_biometric_logs_user_time ON public.biometric_logs USING btree (user_id, punch_time) |
| biometric_logs | uniq_biometric_logs_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_biometric_logs_org_id ON public.biometric_logs USING btree (org_id, id) |
| document_audit_logs | document_audit_logs_pkey | 8192 | 0 | CREATE UNIQUE INDEX document_audit_logs_pkey ON public.document_audit_logs USING btree (id) |
| document_audit_logs | uniq_document_audit_logs_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_document_audit_logs_org_id ON public.document_audit_logs USING btree (org_id, id) |
| document_template_versions | document_template_versions_pkey | 8192 | 0 | CREATE UNIQUE INDEX document_template_versions_pkey ON public.document_template_versions USING btree (id) |
| document_template_versions | idx_dtv_template_id | 8192 | 0 | CREATE INDEX idx_dtv_template_id ON public.document_template_versions USING btree (template_id) |
| document_template_versions | uniq_document_template_versions_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_document_template_versions_org_id ON public.document_template_versions USING btree (org_id, id) |
| document_templates | document_templates_pkey | 8192 | 0 | CREATE UNIQUE INDEX document_templates_pkey ON public.document_templates USING btree (id) |
| document_templates | idx_doc_templates_org | 8192 | 0 | CREATE INDEX idx_doc_templates_org ON public.document_templates USING btree (org_id, type) |
| document_templates | uniq_document_templates_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_document_templates_org_id ON public.document_templates USING btree (org_id, id) |
| document_type_roles | document_type_roles_pkey | 8192 | 0 | CREATE UNIQUE INDEX document_type_roles_pkey ON public.document_type_roles USING btree (id) |
| document_type_roles | idx_document_type_roles_org | 8192 | 2 | CREATE INDEX idx_document_type_roles_org ON public.document_type_roles USING btree (org_id) |
| document_type_roles | idx_document_type_roles_type | 8192 | 0 | CREATE INDEX idx_document_type_roles_type ON public.document_type_roles USING btree (document_type_id) |
| document_type_roles | uniq_document_type_roles_org_id | 8192 | 0 | CREATE UNIQUE INDEX uniq_document_type_roles_org_id ON public.document_type_roles USING btree (org_id, id) |
| document_type_roles | uniq_document_type_roles_type_slug | 8192 | 0 | CREATE UNIQUE INDEX uniq_document_type_roles_type_slug ON public.document_type_roles USING btree (document_type_id, role_slug) |
| document_types | document_types_pkey | 8192 | 0 | CREATE UNIQUE INDEX document_types_pkey ON public.document_types USING btree (id) |
| document_types | idx_doc_types_org | 8192 | 0 | CREATE INDEX idx_doc_types_org ON public.document_types USING btree (org_id) |
| document_types | idx_doc_types_org_country | 8192 | 0 | CREATE INDEX idx_doc_types_org_country ON public.document_types USING btree (org_id, country_code) |
| document_types | uniq_document_types_org_id | 8192 | 567 | CREATE UNIQUE INDEX uniq_document_types_org_id ON public.document_types USING btree (org_id, id) |
| documents | documents_pkey | 8192 | 0 | CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id) |
| documents | idx_documents_expiry | 8192 | 0 | CREATE INDEX idx_documents_expiry ON public.documents USING btree (expiry_date) |
| documents | idx_documents_org_type | 8192 | 111 | CREATE INDEX idx_documents_org_type ON public.documents USING btree (org_id, type) |
| documents | idx_documents_user | 8192 | 1 | CREATE INDEX idx_documents_user ON public.documents USING btree (user_id) |
| documents | uniq_documents_org_id | 8192 | 418 | CREATE UNIQUE INDEX uniq_documents_org_id ON public.documents USING btree (org_id, id) |
| employee_devices | employee_devices_pkey | 8192 | 0 | CREATE UNIQUE INDEX employee_devices_pkey ON public.employee_devices USING btree (id) |
| employee_devices | uniq_employee_devices_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_employee_devices_org_id ON public.employee_devices USING btree (org_id, id) |
| employee_shift_assignments | employee_shift_assignments_pkey | 8192 | 0 | CREATE UNIQUE INDEX employee_shift_assignments_pkey ON public.employee_shift_assignments USING btree (id) |
| employee_shift_assignments | idx_shift_assignments_org | 8192 | 0 | CREATE INDEX idx_shift_assignments_org ON public.employee_shift_assignments USING btree (org_id) |
| employee_shift_assignments | idx_shift_assignments_user | 8192 | 2 | CREATE INDEX idx_shift_assignments_user ON public.employee_shift_assignments USING btree (user_id, is_active) |
| employee_shift_assignments | uniq_employee_shift_assignments_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_employee_shift_assignments_org_id ON public.employee_shift_assignments USING btree (org_id, id) |
| exit_checklists | exit_checklists_pkey | 8192 | 0 | CREATE UNIQUE INDEX exit_checklists_pkey ON public.exit_checklists USING btree (id) |
| exit_checklists | idx_exit_checklists_org_resignation | 8192 | 4 | CREATE INDEX idx_exit_checklists_org_resignation ON public.exit_checklists USING btree (org_id, resignation_id) |
| exit_checklists | uniq_exit_checklists_org_id | 8192 | 0 | CREATE UNIQUE INDEX uniq_exit_checklists_org_id ON public.exit_checklists USING btree (org_id, id) |
| geofences | geofences_pkey | 8192 | 0 | CREATE UNIQUE INDEX geofences_pkey ON public.geofences USING btree (id) |
| geofences | idx_geofences_org_active | 8192 | 1 | CREATE INDEX idx_geofences_org_active ON public.geofences USING btree (org_id, is_active) |
| geofences | uniq_geofences_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_geofences_org_id ON public.geofences USING btree (org_id, id) |
| holidays | holidays_pkey | 8192 | 0 | CREATE UNIQUE INDEX holidays_pkey ON public.holidays USING btree (id) |
| holidays | uniq_holidays_org_id | 8192 | 172 | CREATE UNIQUE INDEX uniq_holidays_org_id ON public.holidays USING btree (org_id, id) |
| hr_attendance_regularizations | hr_attendance_regularizations_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_attendance_regularizations_pkey ON public.hr_attendance_regularizations USING btree (id) |
| hr_attendance_regularizations | idx_att_reg_org_date | 8192 | 0 | CREATE INDEX idx_att_reg_org_date ON public.hr_attendance_regularizations USING btree (org_id, attendance_date) |
| hr_attendance_regularizations | idx_att_reg_org_user | 8192 | 1 | CREATE INDEX idx_att_reg_org_user ON public.hr_attendance_regularizations USING btree (org_id, user_id) |
| hr_attendance_regularizations | idx_att_reg_status | 8192 | 0 | CREATE INDEX idx_att_reg_status ON public.hr_attendance_regularizations USING btree (org_id, status) |
| hr_attendance_regularizations | uniq_hr_attendance_regularizations_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_hr_attendance_regularizations_org_id ON public.hr_attendance_regularizations USING btree (org_id, id) |
| hr_effective_dated_changes | hr_effective_dated_changes_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_effective_dated_changes_pkey ON public.hr_effective_dated_changes USING btree (id) |
| hr_effective_dated_changes | idx_hr_eff_changes_effective_from | 8192 | 0 | CREATE INDEX idx_hr_eff_changes_effective_from ON public.hr_effective_dated_changes USING btree (effective_from) |
| hr_effective_dated_changes | idx_hr_eff_changes_org_employment | 8192 | 0 | CREATE INDEX idx_hr_eff_changes_org_employment ON public.hr_effective_dated_changes USING btree (org_id, employment_id) |
| hr_effective_dated_changes | idx_hr_eff_changes_org_status | 8192 | 0 | CREATE INDEX idx_hr_eff_changes_org_status ON public.hr_effective_dated_changes USING btree (org_id, status) |
| hr_effective_dated_changes | idx_hr_eff_changes_type | 8192 | 0 | CREATE INDEX idx_hr_eff_changes_type ON public.hr_effective_dated_changes USING btree (change_type) |
| hr_effective_dated_changes | uniq_hr_effective_dated_changes_org_id | 8192 | 3 | CREATE UNIQUE INDEX uniq_hr_effective_dated_changes_org_id ON public.hr_effective_dated_changes USING btree (org_id, id) |
| hr_employee_sensitive_fields | hr_employee_sensitive_fields_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_employee_sensitive_fields_pkey ON public.hr_employee_sensitive_fields USING btree (id) |
| hr_employee_sensitive_fields | idx_hr_sensitive_org | 8192 | 0 | CREATE INDEX idx_hr_sensitive_org ON public.hr_employee_sensitive_fields USING btree (org_id) |
| hr_employee_sensitive_fields | uniq_hr_employee_sensitive_fields_org_id | 8192 | 17 | CREATE UNIQUE INDEX uniq_hr_employee_sensitive_fields_org_id ON public.hr_employee_sensitive_fields USING btree (org_id, id) |
| hr_employee_sensitive_fields | uniq_hr_sensitive_employment | 8192 | 0 | CREATE UNIQUE INDEX uniq_hr_sensitive_employment ON public.hr_employee_sensitive_fields USING btree (employment_id) |
| hr_employment_custom_field_values | hr_employment_custom_field_values_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_employment_custom_field_values_pkey ON public.hr_employment_custom_field_values USING btree (id) |
| hr_employment_custom_field_values | idx_hr_ecfv_org_employment | 8192 | 0 | CREATE INDEX idx_hr_ecfv_org_employment ON public.hr_employment_custom_field_values USING btree (org_id, employment_id) |
| hr_employment_custom_field_values | uniq_hr_ecfv_employment_field | 8192 | 0 | CREATE UNIQUE INDEX uniq_hr_ecfv_employment_field ON public.hr_employment_custom_field_values USING btree (employment_id, field_definition_id) |
| hr_employment_custom_field_values | uniq_hr_ecfv_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_hr_ecfv_org_id ON public.hr_employment_custom_field_values USING btree (org_id, id) |
| hr_employment_history | hr_employment_history_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_employment_history_pkey ON public.hr_employment_history USING btree (id) |
| hr_employment_history | idx_hr_emp_history_created_at | 8192 | 0 | CREATE INDEX idx_hr_emp_history_created_at ON public.hr_employment_history USING btree (created_at) |
| hr_employment_history | idx_hr_emp_history_org_employment | 8192 | 1 | CREATE INDEX idx_hr_emp_history_org_employment ON public.hr_employment_history USING btree (org_id, employment_id) |
| hr_employment_history | uniq_hr_employment_history_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_hr_employment_history_org_id ON public.hr_employment_history USING btree (org_id, id) |
| hr_employments | hr_employments_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_employments_pkey ON public.hr_employments USING btree (id) |
| hr_employments | idx_hr_employments_org | 8192 | 0 | CREATE INDEX idx_hr_employments_org ON public.hr_employments USING btree (org_id) |
| hr_employments | idx_hr_employments_org_status | 8192 | 9 | CREATE INDEX idx_hr_employments_org_status ON public.hr_employments USING btree (org_id, lifecycle_status) |
| hr_employments | idx_hr_employments_person | 8192 | 0 | CREATE INDEX idx_hr_employments_person ON public.hr_employments USING btree (person_id) |
| hr_employments | uniq_hr_employments_org_emp_num | 8192 | 0 | CREATE UNIQUE INDEX uniq_hr_employments_org_emp_num ON public.hr_employments USING btree (org_id, employee_number) |
| hr_employments | uniq_hr_employments_org_id | 8192 | 66 | CREATE UNIQUE INDEX uniq_hr_employments_org_id ON public.hr_employments USING btree (org_id, id) |
| hr_job_levels | hr_job_levels_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_job_levels_pkey ON public.hr_job_levels USING btree (id) |
| hr_job_levels | idx_hr_job_levels_org | 8192 | 0 | CREATE INDEX idx_hr_job_levels_org ON public.hr_job_levels USING btree (org_id) |
| hr_job_levels | uniq_hr_job_levels_org_id | 8192 | 2 | CREATE UNIQUE INDEX uniq_hr_job_levels_org_id ON public.hr_job_levels USING btree (org_id, id) |
| hr_job_levels | uniq_hr_job_levels_org_name | 8192 | 0 | CREATE UNIQUE INDEX uniq_hr_job_levels_org_name ON public.hr_job_levels USING btree (org_id, name) |
| hr_job_roles | hr_job_roles_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_job_roles_pkey ON public.hr_job_roles USING btree (id) |
| hr_job_roles | idx_hr_job_roles_org | 8192 | 0 | CREATE INDEX idx_hr_job_roles_org ON public.hr_job_roles USING btree (org_id) |
| hr_job_roles | uniq_hr_job_roles_org_id | 8192 | 76 | CREATE UNIQUE INDEX uniq_hr_job_roles_org_id ON public.hr_job_roles USING btree (org_id, id) |
| hr_job_roles | uniq_hr_job_roles_org_name | 8192 | 0 | CREATE UNIQUE INDEX uniq_hr_job_roles_org_name ON public.hr_job_roles USING btree (org_id, name) |
| hr_leave_ledger | hr_leave_ledger_pkey | 8192 | 0 | CREATE UNIQUE INDEX hr_leave_ledger_pkey ON public.hr_leave_ledger USING btree (id) |
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
