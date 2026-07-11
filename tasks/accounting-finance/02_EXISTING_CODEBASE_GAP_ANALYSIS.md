# Existing Codebase Gap Analysis

## Already Available

### Backend
- Accounting module
- DTO validation for accounts, journals, statements, GST, payables, receivables
- Ledger controller
- Statements controller
- GST controller
- Payables/receivables controller
- Purchase bill workflow
- Vendor payment recording
- Customer/vendor ledgers
- Reports: trial balance, P&L, balance sheet, cash flow, aged AR/AP

### Frontend
- Accounting hub
- COA pages
- Journal list/detail/new pages
- Trial balance page
- Profit and loss page
- Balance sheet page
- Cash flow page
- GSTR-1 page
- GSTR-3B page
- Aged receivables page
- Aged payables page
- Customer/vendor pages
- Purchase bill pages

### Related Modules
- Invoices
- Expenses
- Payments
- Billing
- Payroll accounting mappings
- Client accounts

## Main Gaps
- No full bank account and reconciliation workflow.
- No bank transaction import/matching engine.
- No period close/lock workflow.
- No robust accounting settings wizard.
- No credit/debit notes.
- No recurring invoices/bills.
- No payment reminder engine.
- No fixed assets/depreciation.
- No budgeting and forecast module.
- No cost centers/classes/departments/projects as accounting dimensions.
- No multi-currency accounting.
- No TDS/TCS or broader tax engine beyond GST reports.
- No full approval workflow for journal entries, bills, payments, expenses.
- No accountant review mode.
- No finance dashboard with cash runway, AR risk, AP schedule, and burn.
- No AI categorization, anomaly detection, or cash-flow assistant.

## Implementation Strategy
Extend existing modules. Do not create duplicate invoice, payment, expense, or accounting systems.

## High-Risk Areas
- Ledger correctness
- Tax calculation correctness
- Period locking
- Payment reconciliation
- Multi-currency
- Permissions
- Audit logs

