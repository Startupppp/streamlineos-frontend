# Leave, Absence, Comp-Off And Overtime

## Features
- Leave types
- Leave accrual
- Carry forward
- Encashment
- Sandwich leave
- Half day
- Hourly leave
- Leave blackout
- Leave conflict detection
- Comp-off earning
- Comp-off usage
- Overtime request
- Leave calendar
- Team availability

## Configurations
- accrual frequency
- accrual amount
- max balance
- carry forward limit
- encashment eligibility
- probation restrictions
- notice period restrictions
- gender/role/location eligibility

## Acceptance Criteria
- Leave balance comes from ledger-style transactions.
- Leave approval uses workflow engine.
- Cron leave reset becomes policy-driven scheduled job.
- Approved leave affects payroll payable days according to policy.
- Unpaid leave, paid leave, half-day leave, hourly leave, comp-off, leave encashment, and leave without pay are exported to payroll as structured inputs.
- Leave changes after payroll cutoff create payroll adjustment records, not silent recalculation.
