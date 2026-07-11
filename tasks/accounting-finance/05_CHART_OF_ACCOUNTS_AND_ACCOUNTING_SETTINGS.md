# Chart Of Accounts And Accounting Settings

## Goal
Make setup simple for founders but powerful enough for accountants.

## Backend Requirements
- Seed default chart of accounts by country/template.
- Support custom accounts.
- Support parent/child accounts.
- Prevent deleting accounts with posted activity.
- Allow deactivation.
- Track system accounts.
- Support opening balances.

## Frontend Requirements
Pages:
- Setup wizard
- Chart of accounts list
- Account detail
- Create/edit account dialog
- Opening balance import

## Setup Wizard
Steps:
1. Company country and currency
2. Fiscal year start
3. Tax registration
4. Accounting basis: accrual/cash reporting preference
5. Choose chart template
6. Confirm system accounts
7. Opening balances

## Required System Accounts
- Accounts receivable
- Accounts payable
- Bank clearing
- Sales income
- Discount given
- Tax payable
- Tax receivable/input tax
- Payroll payable
- Expense clearing
- Retained earnings
- Owner equity
- Payment processing fees

## Acceptance Criteria
- User can create account.
- User can deactivate account.
- User cannot delete account with activity.
- System account mapping is validated before posting invoices/bills/payments.

