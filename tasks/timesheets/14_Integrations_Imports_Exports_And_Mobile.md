# StreamlineOS Product Bible

# Timesheets / Worklogs

# 14_Integrations_Imports_Exports_And_Mobile.md

## Imports

Support CSV/XLSX import for:

- clients,
- projects,
- tasks/work types,
- users,
- rates,
- historical time entries.

Import requirements:

- preview,
- mapping,
- validation errors,
- duplicate detection,
- rollback batch.

## Exports

Export:

- time entries,
- approved periods,
- payroll,
- billing,
- reports,
- audit logs.

Formats:

- CSV,
- XLSX,
- PDF.

## Integrations

Project tools:

- Jira,
- Asana,
- Trello,
- GitHub Issues,
- Linear.

Accounting/billing:

- StreamlineOS invoices,
- Zoho Books,
- QuickBooks,
- Xero,
- Tally export future-ready.

Payroll:

- generic CSV,
- Zoho Payroll future-ready,
- RazorpayX Payroll future-ready,
- ADP/Gusto future-ready.

Communication:

- Slack,
- Microsoft Teams,
- email reminders,
- WhatsApp reminders future-ready.

Calendar:

- Google Calendar,
- Outlook Calendar.

## Webhooks

Events:

- timesheet.entry.created,
- timesheet.period.submitted,
- timesheet.period.approved,
- timesheet.period.rejected,
- timesheet.invoice_export.created,
- timesheet.payroll_export.created,
- timesheet.budget.exceeded.

## Mobile

Mobile web requirements:

- timer,
- manual entry,
- weekly summary,
- submit,
- approve/reject,
- rejected reason,
- offline drafts.

Native app future:

- push reminders,
- background timer,
- offline sync,
- kiosk mode,
- QR/PIN,
- optional location/photo.

## Offline Sync

Rules:

- drafts saved locally,
- sync when online,
- conflict if entry overlaps or period locked,
- user can resolve conflicts,
- audit source as mobile/offline.

## Acceptance Criteria

- Import preview prevents bad data.
- Payroll and billing exports are reproducible.
- Mobile 375px supports timer and quick entry.
- Webhooks are signed and auditable.
