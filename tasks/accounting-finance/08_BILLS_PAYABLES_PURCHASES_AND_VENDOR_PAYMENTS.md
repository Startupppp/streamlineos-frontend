# Bills, Payables, Purchases And Vendor Payments

## Existing Baseline
- Purchase bills exist.
- Vendor payments exist.
- Vendor ledger exists.
- Aged payables exists.

## Backend Requirements
- Bills post to AP and expense/tax accounts.
- Vendor payment reduces AP.
- Partial vendor payments supported.
- Vendor credits/debit notes supported.
- Recurring bills supported.
- Bill approval workflow supported.
- Payment run planning supported.

## Frontend Requirements
Pages:
- Vendor list
- Vendor detail
- Purchase bill list
- Create purchase bill
- Bill detail
- Vendor payments
- Payment run
- Aged payables

## Bill Lifecycle
DRAFT -> PENDING_APPROVAL -> POSTED -> PARTIALLY_PAID -> PAID -> CANCELLED

## Payment Run
Finance user can:
- Select bills due this week/month.
- Filter by vendor, due date, priority, amount.
- Approve payment batch.
- Mark as paid manually or through provider later.

## Acceptance Criteria
- Vendor bill creates balanced journal.
- Payment creates balanced journal.
- Cancelled bill reverses accounting impact.
- AP aging ties to vendor ledger.

