# StreamlineOS Product Bible

# Timesheets / Worklogs

# 09_Billing_Rates_Budgets_Invoicing_And_Payroll.md

## Billable Model

Each time entry has:

- billable status,
- billing type,
- rate source,
- cost rate,
- bill rate,
- invoicing status,
- payroll status.

Billing types:

- billable,
- non_billable,
- internal,
- retainer,
- fixed_fee,
- warranty/free.

## Rate Resolution

Rate priority:

1. explicit entry override,
2. project-member rate,
3. person rate,
4. task/work-type rate,
5. project rate,
6. client rate,
7. organization default rate.

Store resolved rate snapshot on approved/invoiced entries.

## Cost Rates

Used for profitability.

Sources:

- employee cost rate,
- role cost rate,
- contractor rate,
- project-specific cost.

## Budgets

Budget types:

- hours budget,
- money budget,
- retainer/hour bank,
- fixed-fee project budget,
- monthly recurring retainer.

Budget alerts:

- 50% consumed,
- 80% consumed,
- 100% consumed,
- projected overrun,
- retainer exhausted.

## Invoicing

Invoice queue includes:

- approved billable uninvoiced hours,
- client-approved hours if required,
- rate-resolved totals,
- grouped invoice drafts.

Group by:

- client,
- project,
- date period,
- task/work type,
- person optional.

Invoice line modes:

- detailed line per entry,
- summary by task,
- summary by project,
- summary by person,
- custom grouping.

Integration:

- StreamlineOS invoices,
- Razorpay/Stripe payment links future-ready,
- CSV/XLSX export.

## Payroll

Payroll queue includes:

- approved payable hours,
- regular hours,
- overtime,
- breaks,
- leave adjustments,
- holiday/weekend hours,
- shift premiums future-ready.

Export:

- CSV,
- XLSX,
- payroll-provider mapped export,
- audit record.

## Client Approval Before Invoice

If enabled:

- finance cannot create invoice until client approves billable hours,
- rejected client hours return to review,
- approval link expires by policy,
- client sees only their projects/data.

## Revenue Leakage Reports

Show:

- approved but uninvoiced hours,
- billable entries missing rates,
- rejected client hours,
- non-billable work on billable projects,
- write-offs,
- retainer overuse.

## Acceptance Criteria

- Approved billable hours can become invoice drafts.
- Missing rates are flagged before invoice draft.
- Approved payable hours can export to payroll.
- Budget burn updates from time entries.
- Retainer/hour bank usage is visible.
