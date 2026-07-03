# Testing QA And Acceptance

## Unit Tests

- Salary component calculations.
- Formula engine.
- LOP calculation.
- Overtime calculation.
- Loan EMI recovery.
- Bonus/incentive inclusion.
- Tax toggle behavior.
- Payroll status transitions.

## Backend Tests

- Tenant scope.
- RBAC.
- Payroll generation.
- Payroll recalculation.
- Approval.
- Lock/reopen.
- Bank batch generation.
- Payslip publishing.
- Employee self-service access.

## Frontend Tests

- Template selection.
- Toggle builder.
- Payroll command center.
- Exception queue.
- Payroll preview.
- Payslip download.
- Employee portal.

## E2E Scenarios

1. Owner selects Indian Standard Payroll and activates policy.
2. Admin imports attendance, generates payroll, resolves exceptions, approves, locks, pays, publishes payslips.
3. Employee downloads payslip and submits tax declaration.
4. Sales incentive is approved and appears in payroll.
5. Contractor payroll runs without employee statutory components.

## Acceptance Criteria

- No ship without end-to-end payroll run test.
- No ship without sensitive payroll RBAC test.
- No ship without calculation snapshot integrity test.

