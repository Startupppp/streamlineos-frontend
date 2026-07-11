# Invoicing, Receivables And Collections

## Goal
Upgrade invoices into a complete accounts receivable workflow.

## Existing Baseline
- Invoices module exists.
- Customer ledger exists.
- Aged receivables exists.
- Payments module exists.

## Backend Requirements
- Ensure invoice posting creates journal entry.
- Ensure payment receipt creates journal entry.
- Support partial payments.
- Support credit notes.
- Support invoice voiding/reversal.
- Support payment allocation across invoices.
- Support recurring invoices.
- Support payment reminders.
- Support customer statements.

## Frontend Requirements
Pages:
- Invoice list
- Invoice detail
- Create invoice
- Recurring invoices
- Credit notes
- Payments received
- Customer statement
- Collection dashboard

## Invoice Lifecycle
DRAFT -> SENT -> PARTIALLY_PAID -> PAID -> OVERDUE -> VOID

## Collection Features
- Reminder schedules
- Email/WhatsApp reminder templates
- Promise-to-pay notes
- Internal collection owner
- Aging buckets
- Customer risk score

## Acceptance Criteria
- Invoice posts to AR and income/tax accounts.
- Payment reduces AR.
- Credit note reduces AR and revenue/tax correctly.
- Customer statement matches ledger.

