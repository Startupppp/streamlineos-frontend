# Budgeting, Forecasting And Cash Flow

## Goal
Add finance planning, not just bookkeeping.

## Backend Requirements
Tables:
- finance_budgets
- finance_budget_lines
- finance_forecasts
- finance_cash_flow_scenarios

## Budgeting
Support:
- Annual budget
- Monthly budget
- Department budget
- Project budget
- Account-level budget
- Budget approval
- Budget revision history

## Forecasting
Inputs:
- Current cash
- Open invoices
- Open bills
- Recurring revenue
- Recurring expenses
- Payroll schedule
- Tax liabilities
- Planned spend

## Frontend Requirements
Pages:
- Budgets
- Budget detail
- Budget vs actual
- Cash forecast
- Scenario builder

## Scenario Builder
Allow:
- Conservative
- Expected
- Aggressive
- Custom scenario

## Acceptance Criteria
- Budget vs actual ties to posted ledger.
- Cash forecast includes AR/AP/payroll/tax.
- User can create and compare scenarios.

