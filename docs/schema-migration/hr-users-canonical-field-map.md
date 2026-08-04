# Global users to canonical HR field map

This is the R-11 compatibility contract. It does not authorize dropping or rewriting `users` columns.

| Legacy `users` field | Canonical field | Status |
|---|---|---|
| `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `gender` | `hr_people` equivalents, joined by `(org_id, user_id)` | Exact mapping; parity-gated |
| `employee_id`, `designation`, `joining_date`, `org_department_id` | Active primary `hr_employments.employee_number`, `designation`, `joining_date`, `department_id` | Exact mapping after one-primary-employment invariant |
| `monthly_salary` | `hr_employee_sensitive_fields.salary_amount_cents`, frequency `MONTHLY` | Exact numeric conversion; currency must be explicit/defaulted by policy |
| `tax_id` | `hr_employee_sensitive_fields.tax_id` | Exact mapping |
| `bank_details` | `hr_employee_sensitive_fields.bank_details` | Blocked: legacy text encoding/encryption is not a typed JSON contract |
| `reporting_to` | `hr_reporting_lines.manager_employment_id` | Blocked: manager must resolve inside the same organization and effective period |
| `branch_id` | Possibly `hr_employments.location_id` | Blocked: legacy meaning is not proven |
| `emergency_contact` | `hr_people.emergency_contact` | Blocked: legacy uses `relation`; canonical uses `relationship`, so normalization must be specified |
| lifecycle timestamps/status and onboarding fields | Employment lifecycle/onboarding domain records | Blocked: requires an approved transition/history mapping, not a scalar copy |

Run `hr-users-canonical-parity-preflight.sql` read-only on a production clone. Backfill one approved field group at a time, dual-write, emit mismatch telemetry by organization, switch reads, and retain rollback before considering a legacy-column drop.
