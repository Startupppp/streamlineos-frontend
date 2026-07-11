# Banking, Reconciliation And Cash Management

## Goal
Add the biggest missing piece: bank accounts, imports, matching, and reconciliation.

## Backend Requirements
Create:
- Bank accounts
- Bank transactions
- Bank statement imports
- Reconciliation matches
- Transfer records
- Matching rules

## Required Tables
- finance_bank_accounts
- finance_bank_transactions
- finance_bank_imports
- finance_reconciliation_matches
- finance_reconciliation_rules

## Import Formats
Support:
- CSV
- OFX later
- CAMT/MT940 later
- Manual entry
- Live bank feed later

## Matching Engine
Match imported transactions to:
- Customer payments
- Vendor payments
- Expense reimbursements
- Payroll payments
- Bank fees
- Transfers
- Manual journal entries

Matching signals:
- Amount
- Date proximity
- Reference number
- Counterparty name
- Invoice/bill number
- UPI/transaction ID

## Frontend Requirements
Pages:
- Bank accounts
- Bank account detail
- Import statement
- Reconciliation workspace
- Matching rule builder
- Cash movement dashboard

## Reconciliation UI
Show:
- Left side: bank transactions
- Right side: suggested matches
- Actions: match, split, create transaction, ignore, transfer, mark as fee

## Acceptance Criteria
- User can import bank CSV.
- System suggests matches.
- User can confirm reconciliation.
- Reconciled bank balance matches ledger cash account.

