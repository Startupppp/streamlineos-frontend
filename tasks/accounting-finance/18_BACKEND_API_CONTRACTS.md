# Backend API Contracts

## Accounting
- `GET /accounting/accounts`
- `POST /accounting/accounts`
- `PATCH /accounting/accounts/:id`
- `GET /accounting/journal`
- `POST /accounting/journal`
- `GET /accounting/journal/:id`
- `POST /accounting/journal/:id/post`
- `POST /accounting/journal/:id/reverse`
- `GET /accounting/general-ledger`
- `GET /accounting/periods`
- `POST /accounting/periods`
- `POST /accounting/periods/:id/close`
- `POST /accounting/periods/:id/lock`
- `POST /accounting/periods/:id/reopen`

## Sales/Receivables
- `GET /accounting/customers`
- `GET /accounting/customers/:id/ledger`
- `GET /accounting/reports/aged-receivables`
- `GET /accounting/customer-statements/:id`
- `POST /accounting/credit-notes`
- `POST /accounting/recurring-invoices`

## Purchases/Payables
- `GET /accounting/vendors`
- `GET /accounting/vendors/:id/ledger`
- `GET /accounting/purchase-bills`
- `POST /accounting/purchase-bills`
- `GET /accounting/purchase-bills/:id`
- `PATCH /accounting/purchase-bills/:id`
- `POST /accounting/purchase-bills/:id/payments`
- `GET /accounting/reports/aged-payables`
- `POST /accounting/vendor-credits`
- `POST /accounting/payment-runs`

## Banking
- `GET /finance/bank-accounts`
- `POST /finance/bank-accounts`
- `GET /finance/bank-accounts/:id/transactions`
- `POST /finance/bank-imports`
- `GET /finance/reconciliation/:bankAccountId`
- `POST /finance/reconciliation/:bankAccountId/match`
- `POST /finance/reconciliation/:bankAccountId/create-rule`

## Reports
- `GET /accounting/reports/trial-balance`
- `GET /accounting/reports/profit-loss`
- `GET /accounting/reports/balance-sheet`
- `GET /accounting/reports/cash-flow`
- `GET /accounting/reports/gstr-1`
- `GET /accounting/reports/gstr-3b`
- `GET /accounting/reports/budget-vs-actual`
- `GET /accounting/reports/project-profitability`

## Settings
- `GET /accounting/settings`
- `PATCH /accounting/settings`
- `GET /accounting/tax-codes`
- `POST /accounting/tax-codes`
- `GET /accounting/approval-policies`
- `POST /accounting/approval-policies`

## Requirements
- Validate all inputs.
- Enforce permissions.
- Enforce org isolation.
- Use decimal-safe money handling.
- Use idempotency for external imports/payments.

