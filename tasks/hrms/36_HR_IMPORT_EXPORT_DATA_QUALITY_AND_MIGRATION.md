# HR Import, Export, Data Quality And Migration

## Goal
Make HRMS practical for real companies migrating data.

## Features
- Employee CSV/XLSX import
- Leave balance import
- Attendance import
- Asset import
- Document metadata import
- Payroll input import
- Bulk update
- Validation preview
- Duplicate detection
- Import rollback
- Export employee data
- Audit export

## Data Quality
Detect:
- Missing employee IDs
- Duplicate emails
- Invalid manager references
- Invalid departments
- Missing joining dates
- Missing salary/bank fields for payroll employees
- Expired documents

## Acceptance Criteria
- Admin can preview import errors before commit.
- Import creates audit logs.
- Bulk changes are permission-gated.

