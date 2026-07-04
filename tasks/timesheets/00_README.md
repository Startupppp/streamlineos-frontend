# StreamlineOS Product Bible

# Timesheets / Worklogs Standalone Product PRD Pack

# 00_README.md

## Product Name

Working name: **TimeFlow by StreamlineOS**

Internal module name: `timesheets`

## Purpose

Build Timesheets/Worklogs as a standalone product that can be sold independently to service businesses, agencies, consultancies, IT teams, construction teams, field teams, and SMBs that need to track hours, approve work, bill clients, control project budgets, and export payroll-ready data.

This must not feel like a hidden ERP subpage. It should feel like a focused time tracking product with enough depth to become an entry wedge into the full StreamlineOS platform.

## CTO Position

Timesheets are easy to sell when positioned around money:

- stop underbilling clients,
- know where team time goes,
- approve work before payroll/invoicing,
- track project profitability,
- convert approved billable hours into invoices.

Do not sell it as "employee monitoring" first. Sell it as revenue protection, payroll accuracy, and project control.

## Current Repo Context

Existing surfaces:

- `streamlineos-frontend/frontend/app/(authenticated)/timesheets/page.tsx`
- `streamlineos-frontend/frontend/app/(authenticated)/timesheets/loading.tsx`
- `streamlineos-frontend/frontend/app/(authenticated)/timesheets/error.tsx`
- `streamlineos-frontend/frontend/features/timesheets/**`
- `streamlineos-frontend/frontend/components/timesheets/**`
- `streamlineos-frontend/frontend/components/dashboard/timesheet-widget.tsx`
- `streamlineos-frontend/frontend/features/projects/ticket-details/ticket-time-tracker.tsx`
- `streamlineos-frontend/frontend/components/projects/ticket-details/ticket-time-tracker.tsx`
- `streamlineos-frontend/frontend/hooks/api/projects/time-entries.ts`
- `streamlineos-backend/src/modules/projects-execution/timesheets.controller.ts`
- `streamlineos-backend/src/modules/projects-execution/timesheets.service.ts`
- `streamlineos-backend/src/modules/projects-execution/dto/timesheets.schemas.ts`
- `streamlineos-backend/src/modules/projects-execution/timesheets-scope.ts`
- `streamlineos-backend/src/modules/hr-time/work-logs.controller.ts`
- `streamlineos-backend/src/modules/hr-time/work-logs.service.ts`
- `streamlineos-backend/migrations/0117_worklog_unique_per_day.sql`

Existing capabilities:

- personal `/timesheets` page,
- team timesheets page,
- project/ticket time entries,
- CRUD time entry hooks,
- approve/reject entry endpoints,
- basic billable flag,
- basic billing summary,
- HR work logs exist separately,
- dashboard timesheet widget exists.

Main gap:

- It is not yet a standalone sellable product with timer, weekly sheets, bulk approval, customer approval, rates, payroll/invoice export, audit, reminders, analytics, onboarding, mobile/offline, and polished UI.

## Research Sources

Primary sources and product benchmarks:

- Odoo Timesheets docs: https://www.odoo.com/documentation/19.0/applications/services/timesheets.html
- Odoo Timesheet features: https://www.odoo.com/app/timesheet-features
- Zoho Projects Timesheets: https://help.zoho.com/portal/en/kb/projects/timesheetsandtimelogs/timesheets/articles/timesheets-intro
- Zoho Projects Timesheet software: https://www.zoho.com/projects/timesheet-software.html
- Zoho People Timesheet software: https://www.zoho.com/people/employee-timesheet-software.html
- Clockify Timekeeping: https://clockify.me/timekeeping
- Clockify Approvals: https://clockify.me/help/track-time-and-expenses/approval
- Harvest time tracking/invoicing: https://www.getharvest.com/
- TimeCamp time tracking/profitability: https://www.timecamp.com/

Observed benchmark patterns:

- Odoo: project/task/service billing integration, validation, reporting, time-and-material invoicing.
- Zoho Projects: timesheet grouping up to 31 days, approval status, billable/non-billable, timesheet submission.
- Zoho People: employee timesheets for payouts, client billing, shifts, projects, jobs, work items.
- Clockify: timer, weekly timesheet, calendar, kiosk, auto-tracker, approvals, audit, reminders, required fields, payroll exports.
- Harvest: premium service-business positioning: hours to invoices, profitability, budgets, retainers, rates, team capacity.

## Product Direction

Build five connected layers:

1. **Time capture**: timer, manual entry, weekly grid, calendar, kiosk/mobile/offline.
2. **Approval control**: daily/weekly submissions, manager/project/client approval, rejection comments, lock periods.
3. **Money workflows**: billable status, rates, budgets, invoice export, payroll export, retainers.
4. **Operational intelligence**: utilization, profitability, overtime, missing logs, team capacity, client/project reports.
5. **Standalone GTM wrapper**: onboarding, pricing, templates, demo data, imports, integrations, product packaging.

## Reading Order

1. `01_Market_Positioning_And_Buyer_Personas.md`
2. `02_Competitive_Research_Feature_Benchmark.md`
3. `03_Current_State_Audit_And_Gap_Map.md`
4. `04_Product_Scope_And_Modules.md`
5. `05_User_Journeys_And_Workflows.md`
6. `06_UI_UX_Every_Screen.md`
7. `07_Time_Capture_Timer_Weekly_Calendar_Kiosk.md`
8. `08_Approvals_Locking_And_Audit.md`
9. `09_Billing_Rates_Budgets_Invoicing_And_Payroll.md`
10. `10_Reports_Dashboards_Analytics.md`
11. `11_Data_Model_And_Database.md`
12. `12_Backend_APIs_And_Services.md`
13. `13_RBAC_Settings_And_Compliance.md`
14. `14_Integrations_Imports_Exports_And_Mobile.md`
15. `15_AI_Automation_And_Reminders.md`
16. `16_Onboarding_Pricing_GTM_And_Packaging.md`
17. `17_Testing_QA_And_Acceptance.md`
18. `18_AI_Agent_Implementation_Guide.md`

## Definition Of Done

- A buyer can understand the product in 30 seconds.
- A new org can set up clients, projects, tasks, users, rates, and approvals in under 10 minutes.
- Employees can log time via timer, weekly grid, manual entry, and mobile/offline.
- Managers can approve/reject timesheets in bulk.
- Finance can export approved billable hours to invoice and approved payable hours to payroll.
- Admins can lock periods, audit changes, configure required fields, reminders, rounding, and billable defaults.
- Reports show utilization, billable ratio, project budget burn, client profitability, missing logs, overtime, and approval SLA.
- The product can be sold standalone without requiring the full ERP narrative.
