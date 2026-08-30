# ACTOR4 — Legacy Actor Contraction Cutover

**Session date:** 2026-08-30
**Scope:** Timesheets tranche (0700/0701) and Build tranche (0690–0699)

---

## Findings

### Blockers — deferred, not dropped

| Column | Reason |
|---|---|
| `timesheet_audit_events.actor_user_id` | Used in hash chain computation inside `verifyChain()` — `computeAuditRowHash(prevHash, { actorUserId: row.actorUserId })`. Dropping breaks all existing hash verifications irreversibly. |
| `ticket_comment_mentions.mentioned_user_id` | NOT NULL + part of unique index `uniq_ticket_comment_mentions_comment_user (comment_id, mentioned_user_id)`. Cannot drop without replacing the index first (separate expand step required). |
| `ticket_related_links.created_by` | Used for ownership-based access control: `if (link.createdBy !== u.userId && !u.isOrgOwner)`. `CurrentUserContext` has no `membershipId`; switching to membership-based auth requires a broader change. |

### Reader switches required before drop

Two columns had readers still using the legacy column for JOINs:

**`ticket_activity_log.user_id`** — `projects-ticket-subresources.service.ts` joined `organizationPeople` on `userId = ticketActivityLog.userId`. Switched to `organizationPeople.organizationMembershipId = ticketActivityLog.userMembershipId`.

**`timesheet_exports.created_by`** — `payroll-export.service.ts` had three `leftJoin(users, eq(timesheetExports.createdBy, users.id))` calls in `listExports`, `getExportRows`, and `ackExport`. Switched to `leftJoin(organizationPeople, and(eq(organizationPeople.organizationId, ...), eq(organizationPeople.organizationMembershipId, timesheetExports.createdByMembershipId)))`. The `ackExport` join existed only to fetch a `creatorName` that was never used — removed entirely.

---

## Changes made

### Service files — reader switches and writer cleanup

| File | Change |
|---|---|
| `modules/timesheets/payroll/payroll-export.service.ts` | Switch 3 joins to `organizationPeople` via `createdByMembershipId`; remove `createdBy` and `ackBy` from writes; `toExportDto` returns `createdBy: null` |
| `modules/build/core/projects-ticket-subresources.service.ts` | Switch join to `organizationPeople.organizationMembershipId`; DTO uses `actorUserId` from people join, falls back to `"Former Member"` |
| `modules/build/core/projects-activity.service.ts` | Remove `userId` from `ticketActivityLog` inserts in `logTicketActivity` and `logTicketFieldChanges` |
| `modules/timesheets/core/approvals.service.ts` | Remove `lockedBy: u.userId` from timesheet approval update |
| `modules/timesheets/core/periods.service.ts` | Remove `lockedBy` from reopen and unlock updates |
| `modules/timesheets/core/exceptions.service.ts` | Remove `resolvedBy: u.userId` from resolution update |
| `modules/timesheets/core/settings.service.ts` | Remove `changedBy: u.userId` from history insert |
| `modules/timesheets/core/billing.service.ts` | Remove `createdBy: u.userId` from both `timesheetExports` inserts |
| `modules/build/workflow/workflow.service.ts` | Remove `createdBy: userId` from `workflowTransitions` insert |

### Schema files — legacy column removal

| File | Columns removed |
|---|---|
| `db/schema/timesheets/entries.ts` | `lockedBy` |
| `db/schema/timesheets/exports.ts` | `ackBy`, `createdBy`; removed stale `idx_timesheet_exports_created_by` index; removed `users` import |
| `db/schema/timesheets/settings.ts` | `changedBy`; removed `users` import |
| `db/schema/timesheets/exceptions.ts` | `resolvedBy` |
| `db/schema/timesheets/relations.ts` | `timesheetExportsRelations` (entire export removed — only contained dropped column relation); removed `timesheetExports` import |
| `db/schema/build/activity.ts` | `userId` from `ticketActivityLog`; `user` relation from `ticketActivityLogRelations` |
| `db/schema/build/sprint-events.ts` | `actorId`; removed `users` import |
| `db/schema/build/workflow.ts` | `createdBy`; removed `users` import |
| `db/schema/build/relations.ts` | `actor` relation from `sprintScopeEventsRelations` |

### SQL migrations

| File | idx | when | Content |
|---|---|---|---|
| `migrations/0715_timesheets_attr_contract.sql` | 537 | 1798000037000 | DROP COLUMN locked_by, created_by, ack_by, changed_by, resolved_by |
| `migrations/0716_build_attr_contract.sql` | 538 | 1798000038000 | DROP COLUMN user_id, actor_id, created_by in build schemas |

Both added to `migrations/meta/_journal.json`.

### Gate

`check-migration-discipline.mjs` — PASSED. 423 SQL files, 0 new violations.

---

## Still deferred

| Column | Action needed |
|---|---|
| `timesheet_audit_events.actor_user_id` | Must redesign hash chain to exclude the column before it can be dropped (new hash function, rehash all rows) |
| `ticket_comment_mentions.mentioned_user_id` | Drop unique index, create replacement on `(comment_id, mentioned_user_membership_id)`, then DROP COLUMN |
| `ticket_related_links.created_by` | Reclassify as MIXED/AUTH; add `membershipId` to `CurrentUserContext` or use a service-side lookup |
