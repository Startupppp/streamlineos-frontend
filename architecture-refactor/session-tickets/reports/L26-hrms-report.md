# L26 HRMS Report

**Status:** DONE — all owned work items complete, zero errors in L26 paths.

## Files Split
- `db/schema/hr/hiring.ts` (976 lines, DELETED) → `hiring-core.ts` (140), `hiring-candidates.ts` (227), `hiring-interviews.ts` (242), `hiring-pipeline.ts` (377)
- `modules/hr/hr-calendar-source.ts` (589→479 lines) → extracted `hr-calendar-sub-sources.ts` (122 lines; pure utilities + `loadAttendanceOnly`)
- `db/schema/hr/recruitment.ts` barrel updated; `seed-enterprise-workspace.ts` import path updated

## Outbox Orphans Closed
- `hr.helpdesk.ticket_assigned` and `hr.helpdesk.ticket_status_changed` were dynamically registered via `registry.register({eventType, handle})` — invisible to the `check:outbox-consumers` script's `readonly eventType = "..."` class-property grep. Fixed by replacing the plain-object registrations with `HrHelpdeskTicketAssignedConsumer` / `HrHelpdeskTicketStatusChangedConsumer` delegate classes (same file). Both events now appear in the consumed list.

## Re-verified Known Items
- WFH cross-tenant index: CONFIRMED FIXED — `uniqueIndex("uniq_wfh_requests_org_user_date").on(table.orgId, table.userId, table.date)` (orgId leads)
- Ghost key `hr:employees:export`: CONFIRMED EXISTING — key missing from HR catalog; CSV export fails for non-owners

## Schema Relation Fixes (hiring.ts split caused cross-file type drift)
- Added `emailSequences.description` column (transcription error from split)
- Consolidated `candidatesRelations` (resume + applications + interviews) into `hiring-interviews.ts` to avoid multiple `relations()` per table breaking Drizzle type inference
- Added `jobPostingsApplicationsRelations` in `hiring-candidates.ts` for reverse `applications` reference

## Validation
- `check:route-classification`: ALL ROUTES CLASSIFIED (0 undeclared)
- `check:scope-application`: OK — 122/122 DataScopes reach a predicate
- `check:record-access`: OK — every read excludes soft-deleted rows
- `check:outbox-consumers`: hr.helpdesk.* RESOLVED; remaining orphans in chat/e-sign/inventory/accounting (pre-existing, outside L26)
- `check:tenant-isolation`: FAIL pre-existing (65% covered, 286 missing; 0 in L26's modules)
- `tsc --noEmit`: 0 errors in owned paths; 155 total errors all pre-existing in tasks/timesheets/accounting/inventory
- Tests: 1,361 pass / 2 fail (leaves-scope + attendance-scope, both pre-existing)
