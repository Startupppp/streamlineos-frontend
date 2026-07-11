# HR Policy Engine

## Goal
One configurable engine for HR rules.

## Policy Types
- Leave policy
- Attendance policy
- Shift/roster policy
- Overtime policy
- Comp-off policy
- Probation policy
- Notice period policy
- Document requirement policy
- Approval policy
- Expense/reimbursement policy
- Travel policy
- Asset policy
- Work-from-home policy
- Remote work policy
- Payroll eligibility policy

## Policy Scope
Policies can apply by:
- Organization
- Country
- State
- Location
- Department
- Team
- Role
- Job level
- Employment type
- Employee

## Effective Dates
Every policy must support:
- effective_from
- effective_to
- version
- active/draft/archive

## Policy Evaluation
Backend service:
```txt
evaluatePolicy(orgId, employeeId, policyType, eventDate, context)
```

## Acceptance Criteria
- No leave/attendance/probation/overtime rule is hardcoded.
- Policy conflict resolution is deterministic.
- Admin can preview policy for an employee/date.

