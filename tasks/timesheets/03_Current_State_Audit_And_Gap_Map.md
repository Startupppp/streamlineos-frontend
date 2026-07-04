# StreamlineOS Product Bible

# Timesheets / Worklogs

# 03_Current_State_Audit_And_Gap_Map.md

## Current Implementation

Frontend:

- Personal timesheets page exists.
- Team timesheets components exist.
- Log time dialog/form exists.
- Edit time entry dialog exists.
- Time entry detail sheet exists.
- Ticket time tracker exists.
- Dashboard timesheet widget exists.

Backend:

- `TimeEntriesController` supports:
  - list entries,
  - team entries,
  - approve entry,
  - reject entry,
  - update entry,
  - delete entry,
  - list ticket entries,
  - log ticket time.
- `TimesheetsService` supports:
  - scoped listing,
  - pending-only edit/delete,
  - admin approve/reject,
  - billing summary by project,
  - recompute ticket time spent.

Schema signals:

- `timesheets` table already has:
  - status,
  - approved_by,
  - approved_at,
  - rejection_reason,
  - is_billable,
  - updated_at.
- HR work logs exist separately.
- Unique worklog per day exists for non-ticket HR worklog case.

RBAC:

- Existing permissions include:
  - `projects:timesheets:view`
  - `projects:timesheets:create`
  - `projects:timesheets:manage`

## Gaps For Standalone Product

### Product Gaps

- No standalone product onboarding.
- No dedicated timesheet settings page.
- No weekly timesheet document concept.
- No timesheet period submission.
- No customer approval flow.
- No rates/rate cards.
- No invoice draft generation from approved hours.
- No payroll export.
- No budget and retainer tracking.
- No mobile/offline specification.

### UX Gaps

- Current personal page is list/filter oriented, not capture-first.
- No week grid as primary logging surface.
- No active timer command center.
- No calendar view.
- No manager approval queue as a first-class product page.
- No finance-ready billing queue.
- No client portal approval view.

### Backend Gaps

- Entries are approved individually, not as grouped timesheet periods.
- No period lock table.
- No audit/change history table.
- No timer sessions.
- No rate resolution service.
- No invoice/payroll export service.
- No reminders/escalations.
- No custom fields/required fields.

### Data Gaps

Need new tables or extensions for:

- timesheet periods,
- timesheet submissions,
- approval steps,
- timer sessions,
- time entry audit logs,
- time policies/settings,
- rate cards,
- budgets,
- client approvals,
- exports,
- reminders.

## Reuse Strategy

Keep:

- existing `timesheets` table as base time entry table if structurally viable,
- existing project/ticket linkage,
- existing frontend hooks during migration,
- existing approve/reject endpoints as compatibility wrappers,
- existing billing summary route as compatibility.

Add:

- standalone `/time` or `/timesheets` product IA,
- new `timesheet_periods` and `timesheet_submissions`,
- new service layer around entries,
- richer APIs under `/timesheets`.

Avoid:

- merging HR attendance and project time logs too early,
- breaking project ticket time tracker,
- introducing employee surveillance as default positioning,
- hard-deleting time data.

## Migration Philosophy

Use additive migrations.

Existing entry-level approvals can remain, but grouped weekly timesheets should become the primary workflow.

Legacy routes should continue until frontend is migrated:

- `/projects/time-entries`
- `/projects/:projectId/tickets/:ticketId/time-entries`
- `/projects/billing-summary`

New routes should live under:

- `/timesheets/*`

## Acceptance Criteria

- Current time entry creation still works from project tickets.
- Personal and team timesheet pages can migrate without data loss.
- New standalone product has its own settings, onboarding, dashboard, approvals, reports, exports.
- Existing HR work logs are either clearly separate or mapped through integration rules.
