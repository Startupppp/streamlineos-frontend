# Approvals RBAC Audit And Locking

## Purpose

Protect payroll operations.

## Roles

- Owner.
- Payroll admin.
- HR admin.
- Finance approver.
- Manager approver.
- Employee.
- Auditor.

## Permissions

- View payroll.
- View salary.
- Edit salary.
- Run payroll.
- Approve payroll.
- Lock payroll.
- Reopen payroll.
- Publish payslips.
- Export reports.
- View bank details.
- Manage templates.

## Audit Events

Log:

- Salary structure change.
- Template activation.
- Payroll generation.
- Manual adjustment.
- Approval.
- Lock.
- Reopen.
- Mark paid.
- Payslip publish.
- Bank detail access.

## Acceptance Criteria

- Payroll approval requires permission.
- Reopen requires reason.
- Sensitive data access is auditable.

