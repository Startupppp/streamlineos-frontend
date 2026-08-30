# ACTOR3 — Timesheets ATTR actor contraction

## What was done

Expanded 6 legacy `users.id` actor columns in the timesheets module to carry companion `organization_members` membership FKs (EXPAND phase only — legacy columns stay until a future CONTRACT migration).

## Columns expanded

| Table | Legacy column | Companion column | FK constraint name |
|---|---|---|---|
| `timesheets` | `locked_by` | `locked_by_membership_id` | `fk_timesheets_locked_by_membership` |
| `timesheet_audit_events` | `actor_user_id` | `actor_membership_id` | `fk_timesheet_audit_actor_membership` |
| `timesheet_exports` | `created_by` | `created_by_membership_id` | `fk_timesheet_exports_created_by_membership` |
| `timesheet_exports` | `ack_by` | `ack_by_membership_id` | `fk_timesheet_exports_ack_by_membership` |
| `timesheet_settings_history` | `changed_by` | `changed_by_membership_id` | `fk_ts_settings_history_changed_by_membership` |
| `timesheet_exceptions` | `resolved_by` | `resolved_by_membership_id` | `fk_timesheet_exceptions_resolved_by_membership` |

All FKs: `REFERENCES organization_members (org_id, id) ON DELETE SET NULL NOT VALID`.

## Migrations

| File | Journal idx | Journal when | Purpose |
|---|---|---|---|
| `0700_timesheets_attr_expand.sql` | 519 | 1798000018000 | ADD 6 columns, BACKFILL from org_members, ADD 6 FKs NOT VALID |
| `0701_timesheets_attr_validate.sql` | 520 | 1798000019000 | VALIDATE all 6 FKs |

Migration discipline gate: `check-migration-discipline.mjs` — **exit 0**, 0 new violations (414 SQL files, all baselined).

## Schema files updated

- `db/schema/timesheets/entries.ts`
- `db/schema/timesheets/audit.ts`
- `db/schema/timesheets/exports.ts`
- `db/schema/timesheets/settings.ts`
- `db/schema/timesheets/exceptions.ts`

## Service write paths updated

- `modules/timesheets/core/approvals.service.ts` — `lockedByMembershipId` set on approve
- `modules/timesheets/core/periods.service.ts` — membership lookup in `lockPeriod`; NULL on unlock/reopen
- `modules/timesheets/core/exceptions.service.ts` — membership lookup in `resolveOrDismiss`
- `modules/timesheets/core/settings.service.ts` — membership lookup in `updateSettings` transaction
- `modules/timesheets/core/timesheets-audit.service.ts` — `actorMembershipId` optional param added to `AuditEventParams`; NOT added to hash chain (would break backward verification)
- `modules/timesheets/payroll/payroll-export.service.ts` — membership lookup in `runExport` and `ackExport`
- `modules/timesheets/core/billing.service.ts` — membership lookup in BILLING and INVOICE_DRAFT export transactions

## Scanner counts

| Metric | Count |
|---|---|
| Scanner baseline before session | 697 |
| Scanner total after session | 705 |
| Timesheets `users.id` refs (scanner) | 15 |

The total rose from 697 to 705 across concurrent lanes. The 6 companion columns we added reference `organization_members`, not `users.id`, so they are not counted by the scanner. No legacy columns were dropped in this EXPAND phase.

## Migration rules compliance

- `lock_timeout = '5s'` at top of both files
- All FK `ADD CONSTRAINT` statements inside a `DO` block with `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...')` guard
- No `-- > statement-breakpoint` inside any DO block
- BACKFILL in `0700` (expand), VALIDATE in `0701` (separate migration)
- Both files have journal entries with strictly increasing `idx` and `when`
