# Expenses, Receipts, Reimbursements And Cards

## Existing Baseline
- Expenses module exists.
- Expense frontend exists.
- Expense email templates exist.

## Backend Requirements
- Expense approval workflow.
- Receipt attachment support.
- OCR-ready metadata fields.
- Reimbursement batches.
- Expense posting to ledger.
- Expense policy rules.
- Duplicate receipt detection.
- Mileage/per diem support later.

## Frontend Requirements
Pages:
- My expenses
- Team expenses
- Expense detail
- Submit expense
- Receipt inbox
- Reimbursement runs
- Expense policies

## Expense Lifecycle
DRAFT -> SUBMITTED -> APPROVED -> REIMBURSEMENT_PENDING -> REIMBURSED -> REJECTED

## OCR Features
AI/OCR should extract:
- Merchant
- Date
- Amount
- Tax
- Currency
- Category
- Receipt number

## Corporate Cards Later
Add later:
- Card feeds
- Cardholder assignment
- Missing receipt alerts
- Spend limits

## Acceptance Criteria
- Approved expense posts to ledger.
- Reimbursed expense posts payment entry.
- Receipt attachments are visible.
- Duplicate detection warns user.

