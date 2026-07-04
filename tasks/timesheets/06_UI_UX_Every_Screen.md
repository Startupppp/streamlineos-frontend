# StreamlineOS Product Bible

# Timesheets / Worklogs

# 06_UI_UX_Every_Screen.md

## Design Direction

This should feel like a focused operational product:

- dense but calm,
- fast data entry,
- clear weekly rhythm,
- obvious status badges,
- strong reports,
- no marketing hero inside the app,
- no decorative cards inside cards.

## Navigation

Primary product nav:

- Dashboard
- My Time
- Team
- Approvals
- Billing
- Payroll
- Reports
- Clients
- Projects
- Settings

## `/timesheets` Dashboard

Audience:

- all users, with role-based widgets.

First viewport:

- active timer strip,
- this week total,
- billable total,
- submission status,
- missing days,
- primary CTA.

Widgets:

- My week progress.
- Recent time entries.
- Due submission reminder.
- Team approval summary for managers.
- Billing leakage for finance/owners.
- Project budget alerts.

## `/timesheets/my-time`

Tabs:

- Timer.
- Week grid.
- Day timeline.
- Calendar.

Required UI:

- active timer bar,
- quick project/task selector,
- recent/favorites,
- weekly totals by day,
- billable/non-billable toggle,
- notes/work link,
- save draft,
- submit week.

## `/timesheets/team`

Required UI:

- week picker,
- team filter,
- status chips,
- employee rows,
- daily hour bars,
- submitted/missing/rejected flags,
- bulk reminder,
- drill-down sheet.

## `/timesheets/approvals`

Required UI:

- queue tabs: Pending, Rejected, Approved, Client Approval, Reopened.
- filters: week, team, project, client, approver.
- bulk approve/reject.
- detail drawer with employee week, entries, notes, audit, exceptions.

## `/timesheets/billing`

Required UI:

- approved uninvoiced hours.
- grouped by client/project.
- rate preview.
- invoice-ready total.
- create invoice draft.
- export.
- warnings for missing rates.

## `/timesheets/payroll`

Required UI:

- pay period picker.
- approved payable hours.
- overtime.
- missing approvals.
- export preview.
- payroll mapping.

## `/timesheets/reports`

Tabs:

- Overview.
- Utilization.
- Project Budgets.
- Client Profitability.
- Employee Compliance.
- Billing Leakage.
- Approval SLA.

Charts:

- stacked billable/non-billable bars,
- utilization heatmap,
- budget burn progress,
- approval aging,
- missing logs trend,
- top clients by hours/revenue.

## `/timesheets/settings`

Sections:

- General.
- Time entry rules.
- Approvals.
- Rounding.
- Required fields.
- Rates.
- Budgets.
- Reminders.
- Billing/invoice.
- Payroll export.
- Integrations.
- Audit and retention.

## `/timesheets/client-portal/[token]`

External secure page:

- client logo/project name,
- period summary,
- entries grouped by date/task/person,
- approve/reject buttons,
- comment box,
- download PDF/CSV.

## Mobile UX

Mobile must prioritize:

- start/stop timer,
- add quick entry,
- submit week,
- view rejection reason,
- approve/reject for managers.

Avoid:

- wide tables on mobile.

Use:

- day cards,
- horizontal week scroller,
- sticky timer/action bar.

## Empty States

No time this week:

- show quick start options and recent project/task shortcuts.

No projects:

- guide admin to create/import projects.

No approvals:

- show "All caught up" with next useful action.

Missing rates:

- explain impact on billing and link to rates settings.

## Accessibility

- Keyboard entry for weekly grid.
- Tab order follows week grid cells.
- Screen reader labels for day totals and status.
- Status not color-only.
- Focus states visible.
- Timer works without animation.
