# c16 — The schema says what it means

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 9 tickets, 8 done, 1 open (seed data).

809+ tables, 1,210 tenant-led indexes, 654 composite tenant foreign keys, 79 org triggers and broad RLS coverage. **The schema is in good shape and this is not a redesign.** Eight tickets fix places where the schema or read/write implementation states something other than the truth. RLS enforcement itself is tracked by c25-04 because the current verifier reports coverage without gating it.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | One table owns a person's identity | — | done — 0486/0487/0488 applied; identity lives on organization_people |
| 02 | A calendar event carries its timezone | — | done — 0483 applied; TIMESTAMPTZ + timezone column |
| 03 | A recurring event recurs, or the columns go | 02 | done — implemented via rrule 2.8.1; expand-on-read |
| 04 | Invoice line items are queryable | — | done — 0477/0478 applied in order with the reconciliation gate between |
| 05 | Every audit row names its tenant | — | done — platform events use NULL `org_id` plus an exact consistency CHECK |
| 06 | [Candidate résumé text leaves the row](issues/06-candidate-resume-text-leaves-the-row.md) | — | in-progress — read-budget criterion open; blocked on seed data (0 candidates) |
| 07 | Free/busy and conflict checks share one expansion | 02, 03 | done — single CalendarOccurrenceService seam; rrule adapter |
| 08 | Calendar sources obey one bounded overlap contract | 02, 03, 07 | done — bounded queries; attendees reconciled; provider capabilities explicit |
| 09 | A leave policy that says it restricts, does | — | done — probation enforcement live; 16-test matrix |

## Closed ticket digests

**01 — One table owns a person's identity.** `organization_people` is the single identity owner, declared in `backend/CLAUDE.md` §1 and enforced through `modules/directory/person-seam.ts`. Migrations 0486 (`ADD CONSTRAINT … NOT VALID`), 0487 (`VALIDATE CONSTRAINT`), and 0488 (drop 11 duplicate identity columns from `hr_people`) are all journalled. A grep-only scan found 13 call sites; removing the columns from the Drizzle schema surfaced 5 more that write identity as object literals — `hr-import-commit` and `recruitment-handoff` were the missed ones writing phone and gender.

**02 — A calendar event carries its timezone.** Migration `0483_calendar_event_timezone.sql` promotes `start_date`/`end_date` to `TIMESTAMP WITH TIME ZONE` and adds `timezone TEXT NOT NULL DEFAULT 'UTC'`; Drizzle schema at `db/schema/common/shared.ts:221-223`. `calendar-timezone.spec.ts` covers DST spring-forward, fall-back, and Asia/Kolkata (+05:30). Existing naive timestamps are treated as UTC — a lossless cast documented in the migration comment.

**03 — A recurring event recurs, or the columns go.** Old `is_recurring` + `recurring_rule` columns dropped by `0484_calendar_event_drop_recurrence.sql`; `0507_calendar_recurrence_columns.sql` adds `rrule` + `recurrence_end`. Server-side expand-on-read uses `rrule 2.8.1` (`expandRecurring` in `calendar-occurrence.service.ts:60-85`) with DST conversion via `date-fns-tz`. Per-occurrence overrides and cancellations live in `calendar_event_exceptions` (migration `0508`). All 24 occurrence + DST tests pass.

**04 — Invoice line items are queryable.** `invoice_items` table created by `0477_invoice_items_backfill.sql` (journal idx 267); `invoices.line_items` JSONB column dropped by `0478_invoice_line_items_column_drop.sql` only after the reconciliation gate confirmed 0 un-migrated invoices. `0478` was held out of the journal until the gate passed, making the two steps independently verifiable. Database held 0 invoices at migration time; the gate proved structural correctness. See also c18-04 (removal-side evidence).

**05 — Every audit row names its tenant.** `orgId` stays nullable — platform events genuinely have no tenant; no sentinel organization. `0479_audit_log_platform_events.sql` (journal idx 268) adds `is_platform_event BOOLEAN NOT NULL DEFAULT false` and the exact CHECK `(org_id IS NULL) = is_platform_event`; `0606` tightened and validated it online-safely. Schema at `backend/src/db/schema/common/audit-logs.ts`. Backfill runs before the `ADD CONSTRAINT` in the same migration.

**07 — Free/busy and conflict checks share one expansion.** `CalendarOccurrenceService.expandToOccurrences(event, windowStart, windowEnd, exceptions?)` is the single seam — list, reminder, free/busy, and conflict callers all cross it; none parses recurrence independently. `rrule 2.8.1` is the parser; `isValidRrule` Zod validator at `dto/occurrence-exception.schemas.ts:6-11` rejects unparseable strings at the boundary. Conflict checks wrap insert + check in one transaction and always bind `orgId`. 52 tests across occurrence + conflict + timezone suites.

**08 — Calendar sources obey one bounded overlap contract.** Every source adapter applies interval overlap (`starts_at < range_end AND ends_at > range_start`) with a hard `limit: 2000`; external APIs receive `maxResults: 100`. `0500_attendees_backfill.sql` migrates `event_attendees` from `attendee_ids` JSONB; the `attendeeIds` DROP COLUMN is deferred to the orchestrator (out of territory for the authoring lane — recorded in the ticket at close). Provider capability parity lives in `PROVIDER_CAPABILITIES` at `external-event-normalizers.ts:13-20`.

**09 — A leave policy that says it restricts, does.** Enforcement at `leaves-write.service.ts:93-101` reads `probationRestricted`, resolves `ProbationCoverage` (a three-value type: `on-probation | past-probation | no-record` defined at `probation-coverage.ts:5`), and throws `BadRequestException` for `on-probation`. `no-record` allows — the flag seeds `true` for every new org, so refusing when no record exists would block leave universally. No override permission: the administrator's lever is the policy flag (`PATCH /leave-policies/:id`). 16-test matrix: `__tests__/probation-leave-restriction.spec.ts` (6) + `leaves-write-probation.spec.ts` (6) + `probation-coverage-query.spec.ts` (4).

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
