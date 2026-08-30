# DASH1 — calendar_events.created_by Contraction Report

## Reader/Writer Inventory

All references to `calendarEvents.createdBy` found before changes:

| File | Kind | Line(s) | Action |
|---|---|---|---|
| `src/db/schema/common/calendar-events.ts` | Schema def + index + relation | 21, 37, 66 | Removed field, index, relation |
| `src/modules/calendar/calendar.service.ts` | Writer | 102 | Removed `createdBy: userId` (already had `createdByMembershipId`) |
| `src/modules/chat/chat-huddles.service.ts` | Writer | 164 | Removed `createdBy`, added `createdByMembershipId: starterMembershipId` |
| `src/modules/hr/interviews/hr-interview-scheduling.service.ts` | Writer | 192 | Removed `createdBy`, added membership lookup + `createdByMembershipId` |
| `src/modules/hr/interviews/hr-interview-booking.service.ts` | Writer | 120 | Removed `createdBy`, added membership lookup + `createdByMembershipId` |
| `src/modules/ai/core/services/meetings-prep.service.ts` | Reader (unused) | 51, 87 | Removed from interface and select (field never read after load) |
| `src/modules/dashboard/dashboard-personal.service.ts` | Reader | 162 | Changed to EXISTS subquery on `organizationMembers` |
| `src/modules/hr/interviews/hr-interviewers.service.ts` | Reader | 65, 130 | Added `aliasedTable` join, select `createdByUserId` from member join |
| `src/modules/notifications/time-sweeps/notification-time-sweeps.service.ts` | Reader | 197, 231 | Added `aliasedTable` join, select `createdByUserId` from member join |
| `src/modules/calendar/calendar-visibility.spec.ts` | Spec (stale) | 23, 65 | Updated predicate to `createdByMembershipId`, fixed assertions |
| `src/modules/dashboard/dashboard-hr-events.spec.ts` | Spec (stale) | 27, 113 | Updated predicate to EXISTS-based creator check, fixed assertions + fakeDb mock |
| `src/modules/dashboard/dashboard-personal-visibility.spec.ts` | Spec (stale) | 103, 151, 163 | Rewrote spec to match new capture order and new predicate |
| `src/db/schema/payroll/policies.ts:113` | Unrelated | — | `payrollCalendarEvents.createdBy` — different table, not in scope |

## Live Column State BEFORE Migration

Query: `select column_name, is_nullable from information_schema.columns where table_name='calendar_events'`

- `created_by` — `is_nullable: NO` (NOT NULL, FK to `users.id`)
- `created_by_membership_id` — `is_nullable: NO` (NOT NULL, FK to `organization_members`)
- Total rows: `0`

Since `created_by` was NOT NULL and the table was empty, code changes were safe to apply before the drop.

## Migration

Tag: `0722_calendar_events_created_by_contract`
Journal: idx=544, when=1798000044000 (> watermark 1798000043000)
File: `migrations/0722_calendar_events_created_by_contract.sql`

Steps executed:
1. `SET lock_timeout = '5s'`
2. Backfill re-run (no-op, table empty)
3. Validate guard — DO block asserting zero orphaned rows
4. `DROP INDEX IF EXISTS idx_calendar_events_created_by`
5. `ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "created_by"`

Apply output:
```
applying 0722_calendar_events_created_by_contract: 5 statement(s)
  OK   [1/5] SET lock_timeout = '5s';
  OK   [2/5] UPDATE calendar_events event
  OK   [3/5] DO $$
  OK   [4/5] DROP INDEX IF EXISTS idx_calendar_events_created_by;
  OK   [5/5] ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "created_by";
RECORDED 0722_calendar_events_created_by_contract at created_at=1798000044000
```

## Live Column State AFTER Migration

- `created_by` column: ABSENT
- `idx_calendar_events_created_by` index: ABSENT
- `created_by_membership_id` — `is_nullable: NO`, present

## Post-Drop Grep (no writer remains)

```
grep -rn "calendarEvents\.createdBy\b|calendar_events.*created_by\b" src/ --include="*.ts"
(no output)
```

Zero matches. The column is fully contracted.

## Gate Exit Codes

- `node src/scripts/check-migration-discipline.mjs` → exit 0 (`check:migration-discipline PASSED`, 429 SQL files, 0 new violations)
- `node -r dotenv/config src/scripts/verify-migration-chain.mjs` → exit 0 (`migration chain verified — no issues found`)

## Test Counts

Suite: `dashboard-personal|dashboard-hr-events|calendar-visibility|calendar-conflict|notification-time-sweeps|hr-interviewers`

```
Test Suites: 6 passed, 6 total
Tests:       61 passed, 61 total
```

## Files Changed

- `src/db/schema/common/calendar-events.ts` — removed `createdBy` field, `idx_calendar_events_created_by` index, `creator` relation; removed `users` import
- `src/modules/calendar/calendar.service.ts` — removed `createdBy: userId` from insert
- `src/modules/chat/chat-huddles.service.ts` — moved starterMembershipId lookup before insert, replaced `createdBy` with `createdByMembershipId`, added `BadRequestException` guard
- `src/modules/hr/interviews/hr-interview-scheduling.service.ts` — added creator membership lookup, replaced `createdBy` with `createdByMembershipId`
- `src/modules/hr/interviews/hr-interview-booking.service.ts` — added creator membership lookup inside tx, replaced `createdBy` with `createdByMembershipId`
- `src/modules/ai/core/services/meetings-prep.service.ts` — removed unused `createdBy` from interface and select
- `src/modules/dashboard/dashboard-personal.service.ts` — replaced `eq(calendarEvents.createdBy, userId)` with EXISTS subquery on `organizationMembers`
- `src/modules/hr/interviews/hr-interviewers.service.ts` — added `aliasedTable`, `creatorMember` alias, inner join, select `createdByUserId`
- `src/modules/notifications/time-sweeps/notification-time-sweeps.service.ts` — added `aliasedTable`, `calendarCreatorMember` alias, inner join, select `createdByUserId`
- `src/modules/calendar/calendar-visibility.spec.ts` — updated to `createdByMembershipId`, updated assertions
- `src/modules/dashboard/dashboard-hr-events.spec.ts` — updated `buildVisibilityPredicate` to EXISTS-based creator check, updated fakeDb mocks and assertions
- `src/modules/dashboard/dashboard-personal-visibility.spec.ts` — rewrote to match new capture order (0=creator, 1=attendee, 2=outer) and new predicate structure
- `migrations/0722_calendar_events_created_by_contract.sql` — new migration
- `migrations/meta/_journal.json` — added entry idx=544
