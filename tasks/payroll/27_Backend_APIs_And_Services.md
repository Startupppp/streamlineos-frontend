# Backend APIs And Services

## API Groups

- Payroll setup.
- Template library.
- Payroll policies.
- Salary components.
- Salary structures.
- Payroll runs.
- Payroll exceptions.
- Approvals.
- Payslips.
- Bank transfers.
- Tax declarations.
- Reimbursements.
- Bonuses.
- Incentives.
- Loans.
- FNF.
- Reports.
- Employee self-service.

## Service Requirements

Every service must enforce:

- Tenant scope.
- RBAC.
- Audit events.
- Validation.
- Idempotency where payout-related.
- Pagination and filtering.

## Critical APIs

- Activate template.
- Preview policy.
- Generate payroll run.
- Recalculate payroll run.
- Get exceptions.
- Submit approval.
- Lock payroll.
- Generate bank batch.
- Mark paid.
- Publish payslips.
- Export report.

## Acceptance Criteria

- Payroll calculation API returns explainable line items.
- Payout APIs are idempotent.
- Public/employee APIs cannot expose other employees.

