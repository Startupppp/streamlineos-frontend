# Integrations With Other Modules

## Invoices
Invoice posting should create journal entries:
- Debit AR
- Credit revenue
- Credit tax payable

Payment receipt:
- Debit bank/payment clearing
- Credit AR
- Debit payment fee expense if provider fee exists

## Expenses
Approved expense:
- Debit expense
- Debit input tax if applicable
- Credit employee reimbursement payable

Reimbursement:
- Debit reimbursement payable
- Credit bank

## Payroll
Payroll posting:
- Debit salary expense
- Debit employer tax/benefit expense
- Credit payroll payable
- Credit tax/withholding payable

Payroll payment:
- Debit payroll payable
- Credit bank

## Inventory
Inventory purchase:
- Debit inventory asset
- Credit AP/bank

COGS on sale later:
- Debit COGS
- Credit inventory asset

## Projects
Project profitability should use:
- Invoice revenue
- Timesheet cost
- Expense cost
- Vendor bill cost
- Payroll allocation later

## Payments
Payment provider transactions should feed:
- Customer payments
- Fees
- Refunds
- Failed payments
- Chargebacks later

## Notifications
Accounting should emit notifications for:
- Invoice overdue
- Bill due
- Payment failed
- Approval requested
- Period close completed
- Bank reconciliation mismatch
- Tax due

## Acceptance Criteria
- Source modules do not manually create ledger lines inconsistently.
- Accounting service exposes posting helpers.
- Every source transaction links to journal entry.

