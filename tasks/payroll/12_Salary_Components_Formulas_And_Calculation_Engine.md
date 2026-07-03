# Salary Components Formulas And Calculation Engine

## Purpose

Support flexible payroll calculations.

## Component Types

- Earning.
- Deduction.
- Employer contribution.
- Reimbursement.
- Tax.
- Adjustment.

## Calculation Methods

- Fixed amount.
- Percentage of basic.
- Percentage of gross.
- Formula.
- Attendance based.
- Timesheet based.
- Manual amount.

## Formula Requirements

Support variables:

- basic.
- gross.
- ctc.
- days_in_month.
- paid_days.
- lop_days.
- overtime_hours.
- incentive_amount.
- reimbursement_amount.

## Calculation Order

1. Fixed earnings.
2. Attendance adjustments.
3. Variable earnings.
4. Reimbursements.
5. Statutory deductions.
6. Loans/advances.
7. Taxes.
8. Net pay.

## Acceptance Criteria

- Calculation output explains every line item.
- Rounding rules are configurable.
- Formula errors are caught before payroll approval.

