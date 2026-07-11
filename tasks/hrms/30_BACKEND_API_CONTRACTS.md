# Backend API Contracts

## Core
- `/hr/employees`
- `/hr/employees/:id`
- `/hr/employees/:id/timeline`
- `/hr/employees/:id/sensitive`
- `/hr/org/departments`
- `/hr/org/locations`
- `/hr/org/roles`
- `/hr/org/levels`

## Engines
- `/hr/policies`
- `/hr/policies/:id/preview`
- `/hr/workflows`
- `/hr/workflows/:id/instances`
- `/hr/automations`
- `/hr/automations/:id/runs`
- `/hr/templates`
- `/hr/templates/:id/render`

## Modules
- `/hr/attendance`
- `/hr/shifts`
- `/hr/rosters`
- `/hr/leaves`
- `/hr/onboarding`
- `/hr/offboarding`
- `/hr/documents`
- `/hr/assets`
- `/hr/performance`
- `/hr/learning`
- `/hr/engagement`
- `/hr/cases`
- `/hr/reports`

## Payroll Integration APIs
- `GET /hr/payroll-inputs/periods/:periodId`
- `POST /hr/payroll-inputs/periods/:periodId/build`
- `POST /hr/payroll-inputs/periods/:periodId/lock`
- `POST /hr/payroll-inputs/periods/:periodId/unlock`
- `GET /hr/payroll-inputs/periods/:periodId/attendance`
- `GET /hr/payroll-inputs/periods/:periodId/leaves`
- `GET /hr/payroll-inputs/periods/:periodId/overtime`
- `GET /hr/payroll-inputs/periods/:periodId/reimbursements`
- `GET /hr/payroll-inputs/periods/:periodId/adjustments`
- `POST /hr/payroll-inputs/adjustments`

## Requirements
- Validate with zod.
- Enforce permissions.
- Enforce org isolation.
- Audit mutations.
- Use policy/workflow/template engines.
- Payroll integration APIs must return only approved/locked HR data unless explicitly called in preview mode by an authorized payroll admin.
