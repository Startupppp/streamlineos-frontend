# StreamlineOS Product Bible

# Timesheets / Worklogs

# 02_Competitive_Research_Feature_Benchmark.md

## Purpose

Document benchmark features from Odoo, Zoho, Clockify, Harvest, and TimeCamp, then define how StreamlineOS should compete.

## Odoo

Observed strengths:

- Timesheets connect to Projects and Helpdesk.
- Users log working time across projects and employees.
- Managers validate timesheets.
- Time-and-material service invoicing depends on timesheets.
- Reporting by project, task, employee, billing type.
- Access rights require users to be employees.

What to copy:

- project/task-linked time logs,
- validation workflow,
- service invoicing from approved hours,
- reporting by employee/project/task/billing type.

What to improve:

- stronger standalone product onboarding,
- better weekly grid,
- client approval,
- richer profitability dashboard,
- mobile/offline field capture,
- clearer audit/change history.

## Zoho Projects

Observed strengths:

- Timesheets can group time logs.
- Timesheets can span up to 31 days.
- Draft and submit for approval.
- Approval statuses: pending, approved, rejected.
- Time logs include project, task/issue, user, billing type, daily hours.
- Approver can reject with comments.

What to copy:

- grouped timesheet documents,
- daily grid entry,
- approval status per sheet/log,
- billable/non-billable defaults,
- project/user/task filters.

What to improve:

- customer approval for billable work,
- better invoice/payroll integration,
- stronger budget burn visualization,
- AI missing-log detection.

## Zoho People

Observed strengths:

- Timesheets track employee hours by project/client/task/job.
- Supports payouts, client billing, shifts, reports.
- HR-aligned time tracking.

What to copy:

- employee-focused timesheets,
- job/client/project/work-item model,
- payroll use case,
- shift-aware logging.

What to improve:

- product should not feel HR-only,
- service billing and project profitability must be first-class.

## Clockify

Observed strengths:

- Timer.
- Weekly timesheet.
- Calendar.
- Kiosk.
- Auto-tracker.
- Offline timekeeping.
- Required fields.
- Reminders.
- Audit changes.
- Approvals.
- Reports, payroll, budgeting, attendance.

What to copy:

- multiple capture modes,
- required fields and audits,
- simple weekly grid,
- approval locks,
- reminders,
- exports.

What to improve:

- deeper connection to StreamlineOS projects, invoices, CRM clients, HR payroll.
- cleaner sellable SMB setup pack.

## Harvest

Observed strengths:

- Clear service-business positioning.
- Time tracking connects to invoices and payments.
- Multi-tier billing rates.
- Project budgets and profitability.
- Retainers/hour banks.
- Team capacity and utilization.
- Strong reports for agencies/consultancies.

What to copy:

- "hours to profit" positioning,
- client/project/task/rate hierarchy,
- invoice-ready approved hours,
- budget alerts,
- retainer tracking.

What to improve:

- add approval depth,
- add payroll export depth,
- add field/mobile/kiosk modes,
- add AI timesheet nudges.

## TimeCamp

Observed strengths:

- AI automation,
- project profitability,
- budget alerts,
- integrations with Jira/Asana/accounting.

What to copy:

- budget alerts,
- AI suggestions,
- integration-first positioning.

## Feature Benchmark Matrix

| Feature | Odoo | Zoho | Clockify | Harvest | StreamlineOS Target |
|---|---:|---:|---:|---:|---:|
| Manual entry | Yes | Yes | Yes | Yes | Yes |
| Timer | Yes/limited by context | Yes | Yes | Yes | Yes |
| Weekly grid | Partial | Yes | Yes | Yes | Yes |
| Calendar view | Limited | Limited | Yes | Partial | Yes |
| Project/task links | Yes | Yes | Yes | Yes | Yes |
| Billable/non-billable | Yes | Yes | Yes | Yes | Yes |
| Approvals | Yes | Yes | Yes | Limited | Yes |
| Client approval | Limited | Gap | Limited | Limited | Yes |
| Invoice generation | Yes | Yes via billing/invoice | Some plans | Yes | Yes |
| Payroll export | Partial | HR-oriented | Yes | Limited | Yes |
| Rates | Yes | Yes | Yes | Yes | Yes |
| Budgets | Yes | Yes | Yes | Yes | Yes |
| Profitability | Partial | Partial | Partial | Strong | Strong |
| Audit/change history | Partial | Partial | Yes | Partial | Yes |
| Offline/mobile | Partial | Yes | Yes | Yes | Yes |
| Kiosk | No | HR attendance context | Yes | No | Yes |
| Required fields | Partial | Yes | Yes | Yes | Yes |
| AI suggestions | Limited | Limited | Emerging | Limited | Yes |

## Product Standard

StreamlineOS TimeFlow must combine:

- Odoo's ERP/project/invoice integration,
- Zoho's grouped timesheet approval workflow,
- Clockify's capture modes and audit,
- Harvest's profitability/invoicing positioning,
- StreamlineOS's AI/workflow/platform integration.
