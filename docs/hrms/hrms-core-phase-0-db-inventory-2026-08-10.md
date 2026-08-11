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

The original captured output contained a literal truncation marker and was not a complete column inventory. It was replaced on 2026-08-11 from a fresh authorized production catalog read in a bounded `REPEATABLE READ READ ONLY` transaction.

The verified catalog contains **45 tables and 572 columns** and is split to preserve the 500-line file cap:

- [Column catalog A-H](hrms-core-phase-0-column-catalog-a-h-2026-08-11.md): 26 tables / 316 columns.
- [Column catalog L-W](hrms-core-phase-0-column-catalog-l-w-2026-08-11.md): 19 tables / 256 columns.

## Index catalog

The complete **195-index** catalog and scan snapshot is in [the dedicated index appendix](hrms-core-phase-0-index-inventory-2026-08-10.md). Zero scans on the tiny live dataset are not deletion proof.

## Temporal type summary

Across the exact 45 tables listed above, the refreshed live catalog contains:

| SQL type | Columns |
|---|---:|
| `date` | 37 |
| `timestamp without time zone` | 89 |
| `timestamp with time zone` | 2 |

This corrects the incomplete temporal count derived from the truncated capture. It does not determine the semantic timezone of any legacy column; the Phase 1 conversion registry remains required.

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
