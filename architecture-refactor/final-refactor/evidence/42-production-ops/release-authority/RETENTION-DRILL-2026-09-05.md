# Retention and legal-hold drill — 2026-09-05

Covers PRD-C188. Verified results only. Anything not measured is recorded as not measured.

## The defect the drill found — the centrepiece of this document

Before the fix the drill returned **INCONCLUSIVE (exit 2)** with the message
"control swept 0 of 4 seeded rows — sweep may not be running". The cause: a JavaScript
`Date` object interpolated directly into a raw `drizzle sql``...``  ` template throws
`ERR_INVALID_ARG_TYPE` at runtime. All three retention sweeps
(`CronHelpdeskRetentionService`, `CronMailRetentionService`,
`CronAnnouncementsRetentionService`) failed for all 6 organisations and had **never
deleted a single row** since the feature was written.

The failure was invisible for two reasons:

1. `forEachOrg` catches each organisation's error, logs it, and continues — so the cron
   endpoint still returned 200 and the sweep appeared healthy.
2. Drizzle's error message is `Failed query: <sql>` with the real cause buried on
   `error.cause`. No caller surfaced `error.cause`, so the error was swallowed.

**Fix:** commit `09e076f54` — four call sites now pass `cutoff.toISOString()` with an
explicit `::timestamptz` cast into the SQL template.

**Recurrence:** this is the second time this class of defect shipped. It broke
notification delivery platform-wide on 2026-08-14 and was fixed that day in four
notification workers. The fix was not generalised to the retention workers, so the same
bug re-entered on a different path.

## Drill command and environment

```
node src/scripts/drill-retention.mjs \
  --org-a=aaaaaaaa-1111-0000-0000-000000000001 \
  --org-b=aaaaaaaa-1111-0000-0000-000000000002
```

Database: Neon scratch branch, database `scratch_verify_0905`, port 5432, endpoint
`ep-polished-scene-azjhwmx9` (full `.neon.tech`-qualified hostname omitted — matches the
`managed-host-name` redaction pattern and must not appear in sealed evidence).

The drill was run twice; both passes are included in this record. The drill was not run a
third time as instructed.

## Drill result

| Attribute | Value |
|---|---|
| Exit code | 0 (PASS) |
| Total checks | 14 |
| Failed | 0 |
| Production paths exercised | 6 |
| Payload sha256 | `b60bd24bfac95825` |

### Per-phase measured outcomes

| Phase | Outcome |
|---|---|
| CONTROL | helpdesk 3 tickets deleted; mail 2 rows deleted; announcements 1 expired + 1 aged deleted. 6 orgs, 0 failed. |
| HELD | 6 checks; legal-hold subjects retained across all three services. |
| ISOLATED | 2 checks; org A's sweep did not reach org B's rows. |
| IDEMPOTENT | Second run completed without error or double-deletion. |
| BATCH | 201 tickets deleted with `truncated=false` (BATCH_SIZE+1), proving no silent truncation on a large batch. |

## Commits contributing to C188

| SHA | Change |
|---|---|
| `09e076f54` | Fix JS Date interpolation in retention sweep SQL; four sites now pass `.toISOString()` with `::timestamptz` cast. This is the direct fix for the defect described above. |
| `20b603967` | `CronMailRetentionService` and `CronAnnouncementsRetentionService` lacked any legal-hold check. Both now exclude held subjects (`subject_user_id IS NOT NULL` inside the `NOT IN` subquery, matching the helpdesk predicate). The `IS NOT NULL` guard is load-bearing: a NULL in a `NOT IN` list makes the predicate UNKNOWN and would stop the sweep from deleting anything. |

## Coverage of the four PRD-named tables

| Table | Decision | Policy |
|---|---|---|
| `helpdesk_tickets` | RETAIN-BOUNDED | 730 days after `resolved_at`; resolved or closed tickets only; `forEachOrg`, batch 200, legal-hold exclusion, comments cascade. |
| `performance_reviews` | KEEP-FOREVER | Employment-record obligation; no `deleted_at` column; deletion requires an approved per-org statutory rule. |
| `mail_message_metadata` | RETAIN-BOUNDED | 365 days from `synced_at`; re-syncable projection, not system of record; `forEachOrg`, batch 500. |
| `announcements` | RETAIN-BOUNDED | Expired past a 90-day grace and aged past 730 days; `forEachOrg`, batch 200 per phase; targets and reads cascade. |

## Gate: check:retention-coverage — measurer or replayer?

`check-retention-coverage.mjs` **opens a live database connection.** Confirmed by source
inspection: it imports `postgres` from `"postgres"` and reads `process.env.DATABASE_URL`.
Without that variable set it exits 2 INCONCLUSIVE — the exit-2 path is structurally
unreachable from an artifact. The gate reads live `pg_class` statistics from the Neon
scratch database named in the backend `.env` file (loaded via `--env-file-if-exists=.env`
in the npm script). Numbers below are a live measurement, not a replay.

### check:retention-coverage:self-test (exit 0)

31 checks, all true. Relevant subset:

```
decidedTablesAreNoLongerPending: true
everyMatrixOwnerIsCanonical: true
performanceReviewsIsKeepForever: true
sizeDivisorIsNumericNotInteger: true
boundedEntriesHaveWorker: true
keepForeverEntriesHaveNoWorker: true
```

### check:retention-coverage live run (exit 0)

```
thresholdMb: 1
highGrowthTables: 14
covered: 8
keepForever: 6
uncovered: 0
```

High-growth tables as measured:

| Table | MB | Status |
|---|---|---|
| `kb_article_chunks` | 497 | COVERED |
| `helpdesk_tickets` | 237 | COVERED |
| `performance_reviews` | 141 | KEEP-FOREVER |
| `mail_message_metadata` | 12 | COVERED |
| `timesheets` | 10 | KEEP-FOREVER |
| `announcements` | 10 | COVERED |
| `chat_messages` | 7 | COVERED |
| `hr_employments` | 3 | KEEP-FOREVER |
| `permissions` | 3 | KEEP-FOREVER |
| `role_permission_grants` | 3 | KEEP-FOREVER |
| `hr_people` | 2 | COVERED |
| `email_outbox` | 2 | COVERED |
| `notification_events` | 1 | COVERED |
| `hr_reporting_lines` | 1 | KEEP-FOREVER |

## Stale-gaps check

PRD-C188 asks for stale hardcoded "known gaps" to be removed. The `decidedTablesAreNoLongerPending`
self-test check verified all five formerly-pending tables now carry definitive `RETAIN-BOUNDED`
decisions and named workers; none remain as `PENDING-DECISION`. Every entry in the 31-entry
`RETENTION_MATRIX` carries a decision, notes and a canonical owner — verified by
`everyMatrixEntryHasDecision`, `everyMatrixEntryHasNotes` and `everyMatrixEntryHasOwner`
(all true). There are no stale gaps.

## RETENTION_MATRIX owner coverage

All 31 matrix entries carry an `owner` drawn from the canonical `RETENTION_OWNERS` set
(`people-team`, `delivery-team`, `support-team`, `finance-team`, `payments-team`,
`knowledge-team`, `communications-team`, `platform-reliability`). The
`everyMatrixOwnerIsCanonical` self-test check was proved to bite: a fabricated owner value
was injected and the check returned `false`, confirming the validation is not vacuous.

## Not measured

Typecheck and full test suite not run (8 GB jobs not permitted). The drill was not
re-run (two runs already completed before this session; the results are given facts, not
freshly measured here). Backup aging and restore-time deletion not measured — no PITR or
backup system available on this machine.
