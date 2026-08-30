# ACTOR2b — Build Module Actor Contraction

Date: 2026-08-30

---

## Task 1 — Baseline re-emitted

The checked-in baseline (555) predated the scanner fix. After re-emitting:

```
node src/scripts/scan-legacy-org-actors.mjs --emit-baseline
```

New baseline: **697** organizational users.id FKs (679 from scanner-fix state + 18 CRM FKs added by a concurrent lane).

`--check` result: `Ratchet OK: 697/697 remaining (0 migrated since baseline).` Exit 0.

Shrink-only enforcement confirmed: line 342 in the scanner checks `currentCount > baselineCount` and exits 1 with "RATCHET VIOLATION" on any increase. Verified live — the gate fired at exit 1 when baseline was stale at 555 vs current 697.

Note: the first emit (679) was overwritten by a concurrent lane resetting to 555. Re-emitted at 697 to capture the honest current state.

---

## Task 2 — Column dispositions

All 5 columns contracted. None declined.

| Column | Schema | Disposition | New column | FK constraint |
|---|---|---|---|---|
| `ticket_activity_log.user_id` | `build_events` | CONTRACTED | `user_membership_id` | `fk_ticket_activity_log_user_actor` |
| `ticket_comment_mentions.mentioned_user_id` | `build` | CONTRACTED | `mentioned_user_membership_id` | `fk_ticket_comment_mentions_mentioned_user_actor` |
| `ticket_related_links.created_by` | `build` | CONTRACTED | `created_by_membership_id` | `fk_ticket_related_links_created_by_actor` |
| `sprint_scope_events.actor_id` | `build_events` | CONTRACTED | `actor_membership_id` | `fk_sprint_scope_events_actor` |
| `workflow_transitions.created_by` | `build` | CONTRACTED | `created_by_membership_id` | `fk_workflow_transitions_created_by_actor` |

`ticket_comment_mentions.mentioned_user_id` is NOT NULL in the Drizzle declaration — the companion `mentioned_user_membership_id` column is nullable (correct: a mention row could reference a user who has since left the org; the FK allows NULL).

No column was excluded. None meets the global-actor criterion: all 5 tables have `org_id`, all actors are "org members who performed an action", and all columns are within the build/build_events schema.

---

## Task 3 — Schema and read paths

### Schema declarations updated

Five Drizzle schema files edited:

- `src/db/schema/build/activity.ts` — `ticketActivityLog` + `ticketCommentMentions`: added `userMembershipId`/`mentionedUserMembershipId` columns with `foreignKey` blocks; updated relations to add `actorMembership`/`mentionedMembership` sides; imported `foreignKey` and `organizationMembers` from common/auth.
- `src/db/schema/build/sprint-events.ts` — `sprintScopeEvents`: added `actorMembershipId` column and FK; imported `foreignKey` and `organizationMembers`.
- `src/db/schema/build/ticket-collaboration.ts` — `ticketRelatedLinks`: added `createdByMembershipId` column and FK (imports already present).
- `src/db/schema/build/workflow.ts` — `workflowTransitions`: added `createdByMembershipId` column and FK; imported `foreignKey` and `organizationMembers`.
- `src/db/schema/build/relations.ts` — `sprintScopeEventsRelations`: added `actorMembership` side; imported `organizationMembers`.

### Write paths updated

Three service files updated to populate the new membership_id columns on insert:

- `src/modules/build/core/projects-activity.service.ts` — `logTicketActivity` and `logTicketFieldChanges` now call `resolveMembershipId(orgId, userId)` (a private helper that queries `organization_members` with `limit(1)`) before inserting; `processCommentMentions` batch-looks up all mentioned users' membership IDs in one `inArray` query.
- `src/modules/build/core/projects-ticket-links.service.ts` — `addRelatedLink` looks up the caller's `organization_members.id` before inserting `ticketRelatedLinks`.
- `src/modules/build/workflow/workflow.service.ts` — `createTransition` looks up the caller's `organization_members.id` before inserting `workflowTransitions`.

`sprintScopeEvents` has no insert site in the module layer; no write-path update needed.

### Read path updated

- `src/modules/build/core/projects-ticket-subresources.service.ts` — the activity log list endpoint replaced the `leftJoin(users, ...)` pattern with a two-step membership join: `leftJoin(organizationMembers, (orgId, userMembershipId))` then `leftJoin(organizationPeople, (organizationId, userId))`. Projects `displayName`, `firstName`, `lastName`, `avatarUrl` from `organizationPeople` (which has `avatar_url`). The `image` field in the response now comes from `organizationPeople.avatarUrl` instead of `users.image`. Imported `organizationMembers` and `organizationPeople` from the schema barrel.

### Test fix

- `src/modules/build/core/projects-activity.isolation.spec.ts` — `makeEmptySelectMock()` updated to chain `.limit()` on the `.where()` return value, matching the new `resolveMembershipId` query shape.

---

## Migrations

10 SQL files + 10 journal entries, numbered 0690–0699 (0679 was taken by the KB lane's `0679_kb_versions_author_membership` entry at idx=395).

| File | idx | when | Purpose |
|---|---|---|---|
| `0690_build_ticket_activity_log_user_membership_id.sql` | 396 | 1788091267000 | ADD + backfill + NOT VALID FK |
| `0691_build_ticket_activity_log_user_membership_id_validate.sql` | 397 | 1788091268000 | VALIDATE |
| `0692_build_ticket_comment_mentions_membership_id.sql` | 398 | 1788091269000 | ADD + backfill + NOT VALID FK |
| `0693_build_ticket_comment_mentions_membership_id_validate.sql` | 399 | 1788091270000 | VALIDATE |
| `0694_build_ticket_related_links_created_by_membership_id.sql` | 400 | 1788091271000 | ADD + backfill + NOT VALID FK |
| `0695_build_ticket_related_links_created_by_membership_id_validate.sql` | 401 | 1788091272000 | VALIDATE |
| `0696_build_sprint_scope_events_actor_membership_id.sql` | 402 | 1788091273000 | ADD + backfill + NOT VALID FK |
| `0697_build_sprint_scope_events_actor_membership_id_validate.sql` | 403 | 1788091274000 | VALIDATE |
| `0698_build_workflow_transitions_created_by_membership_id.sql` | 404 | 1788091275000 | ADD + backfill + NOT VALID FK |
| `0699_build_workflow_transitions_created_by_membership_id_validate.sql` | 405 | 1788091276000 | VALIDATE |

All 10 applied and recorded in `drizzle.__drizzle_migrations`.

---

## Catalog confirmation (as streamline_app)

All 5 constraints exist and are VALIDATED in pg_catalog:

```
VALIDATED  build_events.ticket_activity_log     fk_ticket_activity_log_user_actor
VALIDATED  build.ticket_comment_mentions        fk_ticket_comment_mentions_mentioned_user_actor
VALIDATED  build.ticket_related_links           fk_ticket_related_links_created_by_actor
VALIDATED  build_events.sprint_scope_events     fk_sprint_scope_events_actor
VALIDATED  build.workflow_transitions           fk_workflow_transitions_created_by_actor
```

---

## Test results

```
node ./node_modules/jest/bin/jest.js "build|ticket|sprint|workflow" --maxWorkers=1
Test Suites: 111 passed, 111 total
Tests:       778 passed, 778 total
```

Exit 0.

---

## Declined contractions

None. All 5 columns are organizational actor references within tenant-scoped tables with org_id. The global-exclusion criterion (no org_id, platform-admin-only actor) does not apply to any of them.
