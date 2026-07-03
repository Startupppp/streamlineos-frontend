# Data Model And Database

## Purpose

Define product-grade payroll entities.

## Existing Entities To Reuse

- Payrolls.
- Salary structures.
- Salary structure templates.
- Expenses.
- Reimbursements.
- Salary loans.
- Bonuses.
- Incentives.
- FNF settlements.

## New Entities Needed

- Payroll policies.
- Payroll policy versions.
- Payroll templates library.
- Payroll template activations.
- Salary components.
- Payroll run.
- Payroll run employees.
- Payroll line items.
- Payroll exceptions.
- Payroll approvals.
- Payroll locks/reopen events.
- Payslip templates.
- Payslip publish events.
- Bank payout batches.
- Tax declarations.
- Tax proof documents.
- Payroll calendar events.
- Accounting mappings.

## Acceptance Criteria

- Payroll calculation snapshot survives future salary changes.
- Policy versions are effective dated.
- Every payroll run is tenant-scoped.

