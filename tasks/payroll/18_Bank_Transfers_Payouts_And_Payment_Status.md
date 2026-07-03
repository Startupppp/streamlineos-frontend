# Bank Transfers Payouts And Payment Status

## Purpose

Prepare and track salary payments.

## Bank Transfer Workflow

1. Payroll approved.
2. Generate payout summary.
3. Validate bank details.
4. Generate bank file or payment batch.
5. Mark sent.
6. Mark paid.
7. Record transaction reference.

## Bank Validation

Check:

- Missing account.
- Invalid IFSC/routing code.
- Duplicate account warning.
- Zero/negative net pay.
- Hold salary flag.

## UI

Bank transfer page shows:

- Employee.
- Net payable.
- Bank account masked.
- Status.
- Transaction reference.
- Error reason.

## Acceptance Criteria

- Bank details are masked by default.
- Payout cannot be generated for unapproved payroll.
- Payment status updates are audited.

