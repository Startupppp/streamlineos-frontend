# Payroll, Compensation And Finance Integration

## Features
- Salary structure mapping
- Compensation revision
- CTC history
- Payslips
- Bank transfers
- Payroll inputs from attendance/leaves/overtime
- Loans/advances deductions
- Payroll accounting handoff
- Attendance-to-payroll summary
- Leave-to-payroll summary
- Overtime-to-payroll summary
- Reimbursement-to-payroll summary
- Payroll cutoff and lock
- Retroactive adjustment handling

## Required Payroll Inputs From HRMS
- Employee master data: employee ID, name, department, location, designation, employment type, status.
- Compensation: effective-dated salary structure, allowances, deductions, tax declarations where applicable.
- Attendance: payable days, present days, absent days, late penalties, early exit penalties, approved regularizations.
- Leave: paid leave, unpaid leave, half-day leave, hourly leave, leave encashment, leave without pay.
- Overtime: approved overtime hours, holiday work, weekend work, shift allowance eligibility.
- Reimbursements: approved payroll-payable claims.
- Deductions: salary advances, employee loans, asset recovery, notice recovery, penalties where legal/configured.
- Lifecycle: joining date, last working date, probation/confirmation status, termination/resignation/FNF status.

## Payroll Data Contract
Backend must expose a clean payroll input contract:

```txt
buildPayrollInputs(orgId, payrollPeriodId)
```

It returns approved and locked HR data for the payroll period. Payroll should not query raw attendance/leave tables directly for final runs.

## Payroll Lock Rules
- HR attendance and leave data can be edited before payroll cutoff.
- After payroll cutoff, changes require adjustment workflow.
- After payroll run approval, HR changes create next-cycle arrears/recovery adjustments.
- FNF payroll can include offboarding asset recovery, leave encashment, notice recovery, and reimbursements.

## Acceptance Criteria
- Compensation changes are effective-dated.
- Payroll reads approved HR data only.
- Payroll posting can integrate with accounting-finance.
- Payroll run can trace every amount back to HR source records.
- Attendance, leave, overtime, and reimbursements are explicitly visible in payroll preview.
- Payroll adjustments are audited and explainable.
