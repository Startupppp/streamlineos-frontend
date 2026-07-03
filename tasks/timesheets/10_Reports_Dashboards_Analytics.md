# StreamlineOS Product Bible

# Timesheets / Worklogs

# 10_Reports_Dashboards_Analytics.md

## Dashboard Metrics

Owner dashboard:

- total hours,
- billable hours,
- billable ratio,
- utilization,
- uninvoiced approved hours,
- project budget alerts,
- missing timesheets,
- pending approvals.

Employee dashboard:

- this week total,
- submitted status,
- target hours,
- missing days,
- rejected items.

Manager dashboard:

- team submissions,
- pending approvals,
- missing logs,
- overtime,
- project burn.

Finance dashboard:

- approved uninvoiced hours,
- missing rates,
- invoice draft value,
- payroll export readiness.

## Core Reports

### Utilization

Shows:

- capacity,
- billable hours,
- non-billable hours,
- time off/holidays,
- utilization percent.

### Billable Ratio

By:

- person,
- team,
- client,
- project,
- task/work type.

### Project Budget Burn

Shows:

- budget hours/money,
- consumed,
- remaining,
- projected overrun,
- trend.

### Client Profitability

Shows:

- billable revenue,
- labor cost,
- margin,
- write-offs,
- retainer consumption.

### Timesheet Compliance

Shows:

- missing submissions,
- late submissions,
- rejected entries,
- edit frequency,
- reminders sent.

### Approval SLA

Shows:

- average approval time,
- aging approvals,
- approver bottlenecks,
- rejection rate.

### Billing Leakage

Shows:

- approved but uninvoiced,
- billable missing rates,
- client rejected hours,
- written-off hours,
- non-billable on billable projects.

## Visualizations

Required:

- stacked bar by billable/non-billable,
- weekly heatmap,
- budget progress bars,
- approval aging table,
- profitability table,
- trend line.

## Exports

Reports export to:

- CSV,
- XLSX,
- PDF,
- scheduled email.

## AI Insights

Examples:

- "Project Alpha is projected to exceed budget by 18% next week."
- "Client Beta has 23 approved uninvoiced hours."
- "Three employees usually submit late on Fridays."
- "Design tasks are consuming 40% more hours than estimated."

## Acceptance Criteria

- Reports support date range, client, project, user, team filters.
- Reports respect RBAC.
- Reports do not expose employee pay/cost rates without permission.
- Finance reports reconcile to invoice/payroll exports.
