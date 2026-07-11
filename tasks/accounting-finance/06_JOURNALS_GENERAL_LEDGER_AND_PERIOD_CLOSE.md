# Journals, General Ledger And Period Close

## Existing Features
- Journal list
- Journal detail
- Create journal entry
- Post journal entry
- Reverse journal entry

## Additions

## General Ledger
Backend:
- Create general ledger endpoint by account/date/dimension.
- Include opening balance, debits, credits, running balance.

Frontend:
- Ledger page with account filter, date range, export, drill-down.

## Journal Approval
Backend:
- Optional approval policy for manual journals above threshold.
- Status: DRAFT -> PENDING_APPROVAL -> POSTED.

Frontend:
- Approval banner and approve/reject actions.

## Period Close
Backend:
- Create accounting periods.
- Allow close checklist.
- Lock period after close.
- Prevent posting into locked period.
- Support admin-only reopen with audit.

Frontend:
- Period close page.
- Checklist:
  - All bank accounts reconciled
  - No draft journals
  - No unposted bills/invoices needing close
  - Payroll posted
  - Tax reviewed
  - Reports generated

## Recurring Journals
Add recurring journal templates for rent, accruals, depreciation, prepaid expenses.

## Acceptance Criteria
- Posted journal cannot be edited.
- Reversal creates balanced reversing entry.
- Locked period rejects changes.
- General ledger matches trial balance.

