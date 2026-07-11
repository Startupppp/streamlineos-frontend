# Core Schema: People, Organization And Employment

## Required Core Tables
- hr_people
- hr_employments
- hr_employee_profiles
- hr_employee_sensitive_fields
- hr_employment_history
- hr_departments
- hr_teams
- hr_locations
- hr_job_roles
- hr_job_levels
- hr_employment_types
- hr_reporting_lines
- hr_effective_dated_changes
- hr_custom_fields
- hr_audit_logs

## Employee Lifecycle Status
- CANDIDATE
- PRE_JOINING
- ONBOARDING
- ACTIVE
- PROBATION
- CONFIRMED
- NOTICE
- EXITED
- ALUMNI
- SUSPENDED

## Effective-Dated Changes
Track changes for:
- Department
- Manager
- Location
- Designation
- Job level
- Employment type
- Compensation
- Work schedule
- Policy assignment

## Sensitive Fields
Protect:
- Salary
- Bank details
- Tax ID/PAN
- Government ID
- Medical data
- Disciplinary records
- Grievance records
- Background verification

## Acceptance Criteria
- Employee timeline is generated from effective-dated events.
- Salary/bank/tax fields require stricter permission.
- Manager history and department history are queryable.

