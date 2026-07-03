# StreamlineOS Product Bible

# Timesheets / Worklogs

# 12_Backend_APIs_And_Services.md

## Services

Create or extend:

- TimesheetsEntryService.
- TimesheetsPeriodService.
- TimerSessionService.
- TimesheetsApprovalService.
- TimesheetsSettingsService.
- TimesheetsRateService.
- TimesheetsBudgetService.
- TimesheetsInvoiceExportService.
- TimesheetsPayrollExportService.
- TimesheetsReportService.
- TimesheetsReminderService.
- TimesheetsAuditService.
- TimesheetsClientApprovalService.

## API Namespace

New standalone namespace:

- `/timesheets/*`

Keep compatibility:

- `/projects/time-entries`
- `/projects/:projectId/tickets/:ticketId/time-entries`
- `/projects/billing-summary`

## Entry APIs

`GET /timesheets/entries`

Filters:

- userId,
- clientId,
- projectId,
- taskId,
- status,
- billingType,
- startDate,
- endDate,
- invoicingStatus,
- payrollStatus.

`POST /timesheets/entries`

Creates manual entry.

`PATCH /timesheets/entries/:entryId`

Updates draft/rejected entry.

`POST /timesheets/entries/:entryId/void`

Voids entry with reason.

## Timer APIs

`GET /timesheets/timer/active`

`POST /timesheets/timer/start`

`POST /timesheets/timer/:timerId/pause`

`POST /timesheets/timer/:timerId/resume`

`POST /timesheets/timer/:timerId/stop`

`POST /timesheets/timer/:timerId/convert`

`POST /timesheets/timer/:timerId/discard`

## Period APIs

`GET /timesheets/periods`

`GET /timesheets/periods/current`

`GET /timesheets/periods/:periodId`

`POST /timesheets/periods/:periodId/submit`

`POST /timesheets/periods/:periodId/recall`

`POST /timesheets/periods/:periodId/reopen`

`POST /timesheets/periods/:periodId/lock`

`POST /timesheets/periods/:periodId/unlock`

## Approval APIs

`GET /timesheets/approvals`

`POST /timesheets/approvals/bulk-approve`

`POST /timesheets/approvals/bulk-reject`

`POST /timesheets/approvals/:approvalId/approve`

`POST /timesheets/approvals/:approvalId/reject`

`POST /timesheets/approvals/:approvalId/delegate`

## Billing APIs

`GET /timesheets/billing/uninvoiced`

`POST /timesheets/billing/create-invoice-draft`

`POST /timesheets/billing/export`

`GET /timesheets/billing/rate-preview`

## Payroll APIs

`GET /timesheets/payroll/period-summary`

`POST /timesheets/payroll/export`

`GET /timesheets/payroll/exports`

## Reports APIs

`GET /timesheets/reports/overview`

`GET /timesheets/reports/utilization`

`GET /timesheets/reports/project-budgets`

`GET /timesheets/reports/client-profitability`

`GET /timesheets/reports/compliance`

`GET /timesheets/reports/billing-leakage`

`GET /timesheets/reports/approval-sla`

## Settings APIs

`GET /timesheets/settings`

`PATCH /timesheets/settings`

`GET /timesheets/rates`

`POST /timesheets/rates`

`PATCH /timesheets/rates/:rateId`

`GET /timesheets/budgets`

`POST /timesheets/budgets`

`PATCH /timesheets/budgets/:budgetId`

## Client Approval APIs

Authenticated admin:

- `POST /timesheets/client-approvals/create-link`
- `GET /timesheets/client-approvals`

Public token:

- `GET /timesheets/client-portal/:token`
- `POST /timesheets/client-portal/:token/approve`
- `POST /timesheets/client-portal/:token/reject`

## Validation

Validate:

- tenant scope,
- permissions,
- required fields,
- max daily hours,
- overlapping entries,
- backdate limits,
- lock periods,
- rate availability,
- invoice/payroll status before edits.

## Acceptance Criteria

- APIs are tenant-scoped.
- Legacy project time entry APIs still work.
- New grouped weekly timesheet APIs work.
- Timer APIs are idempotent enough to survive retries.
- Financial state changes are audited.
