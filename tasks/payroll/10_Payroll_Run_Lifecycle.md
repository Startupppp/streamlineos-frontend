# Payroll Run Lifecycle

## Purpose

Define the monthly payroll process.

## Statuses

- Not started.
- Preparing.
- Draft.
- Preview ready.
- Exceptions found.
- Pending approval.
- Approved.
- Locked.
- Paid.
- Payslips published.
- Closed.
- Reopened.

## Lifecycle

1. Create payroll run.
2. Pull employee salary structures.
3. Pull attendance/LOP inputs.
4. Pull reimbursements.
5. Pull bonuses/incentives.
6. Pull loan EMIs.
7. Calculate gross/net.
8. Generate preview.
9. Compare variance.
10. Resolve exceptions.
11. Submit approval.
12. Lock run.
13. Generate payout file.
14. Mark paid.
15. Publish payslips.
16. Export reports.

## Locking Rules

- Locked payroll cannot be edited.
- Reopen requires admin permission and reason.
- Reopen creates audit event.

## Acceptance Criteria

- Payroll run has immutable calculation snapshot after lock.
- Recalculation before lock is supported.
- Paid payroll cannot be deleted.

