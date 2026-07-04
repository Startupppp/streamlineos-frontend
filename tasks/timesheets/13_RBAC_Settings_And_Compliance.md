# StreamlineOS Product Bible

# Timesheets / Worklogs

# 13_RBAC_Settings_And_Compliance.md

## Permissions

Required permission keys:

- `timesheets:entries:view`
- `timesheets:entries:create`
- `timesheets:entries:update`
- `timesheets:entries:void`
- `timesheets:team:view`
- `timesheets:approvals:view`
- `timesheets:approvals:manage`
- `timesheets:billing:view`
- `timesheets:billing:export`
- `timesheets:billing:invoice`
- `timesheets:payroll:view`
- `timesheets:payroll:export`
- `timesheets:reports:view`
- `timesheets:settings:view`
- `timesheets:settings:manage`
- `timesheets:rates:view`
- `timesheets:rates:manage`
- `timesheets:audit:view`
- `timesheets:client-approvals:manage`

Compatibility:

- keep mapping from existing `projects:timesheets:*` permissions during migration.

## Roles

### Owner/Admin

All permissions.

### Employee

- create/view own entries,
- submit periods,
- view own status.

### Manager

- view team,
- approve/reject team,
- reports for team.

### Project Manager

- approve project hours,
- view project reports,
- billing readiness if allowed.

### Finance

- billing queue,
- rates,
- invoice export,
- payroll export if granted.

### Client Approver

- token-scoped approval only.

## Settings

Admin settings:

- work week start,
- pay period,
- daily max hours,
- required fields,
- rounding,
- approval mode,
- client approval,
- period lock,
- reminders,
- billable defaults,
- rates,
- exports.

## Compliance Rules

- Do not expose cost/pay rates to employees unless permissioned.
- Do not expose other users' timesheets without team/report permission.
- Do not let employees edit locked/invoiced/payroll-exported entries.
- Keep audit trail immutable.
- Public client approval links must be tokenized, expiring, and scoped.
- Location/photo capture must be optional and policy-visible.

## Audit Requirements

Audit:

- sensitive settings changes,
- rate changes,
- approval decisions,
- client approvals,
- invoice/payroll exports,
- locked period reopen,
- void/correction.

## Acceptance Criteria

- Employee sees only own time unless granted.
- Manager sees scoped team/project only.
- Finance can export but not necessarily manage all settings.
- Client link exposes only relevant client/project period data.
