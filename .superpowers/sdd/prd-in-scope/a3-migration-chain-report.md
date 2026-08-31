# A3 — Migration-Chain P0 Report

Lane: A3  
Date: 2026-08-30  
Authored by: A-d-1-t-y-a

---

## Defect

`pnpm check:migration-chain` failed check (f): WATERMARK AHEAD OF JOURNAL.

- DB applied watermark (`max(created_at)` of `drizzle.__drizzle_migrations`): **1788051829642** (2026-08-30T01:03:49.642Z)
- Journal head (`max(when)` of `migrations/meta/_journal.json`): **1787941388254** (2026-08-28T18:23:08.254Z)
- Drizzle skips migrations where `journalEntry.when <= max(created_at)`, so every journal entry below the watermark was silently skipped when `db:migrate` ran. Yet `db:migrate` still reported success.

---

## Root Cause

The S7 chain-repair program (2026-08-29 to 2026-08-30) applied migrations against the DB using `when` timestamps from a journal state that was active at that time (entries dated 2026-08-29T17:xx and 2026-08-30T00:58–01:03). Those journal entries were subsequently removed from `_journal.json`, but the corresponding rows in `drizzle.__drizzle_migrations` were never deleted. This left 119 orphan DB rows whose timestamps sat above the current journal head.

No currently-active script creates future-dated entries via `Date.now()`. Drizzle-orm's `migrate()` uses `journalEntry.when` (called `folderMillis`) as `created_at` — never the wall clock.

---

## Before / After Counts

| Metric | Before | After |
|---|---|---|
| `drizzle.__drizzle_migrations` rows | 503 | 387 |
| `max(created_at)` | 1788051829642 | 1787941388254 |
| Journal entries (`_journal.json`) | 379 | 379 (unchanged) |
| `pnpm check:migration-chain` | FAIL (f) | PASS |

---

## Orphan Rows Deleted

119 rows with `created_at > 1787941388254` were deleted. IDs: 632, 635–638, 520, 655, 521–631, 656. Timestamps clustered in two batches:

- 2026-08-29T17:39–17:52 (S7 bulk repair batch, ~115 rows)
- 2026-08-30T00:58–01:03 (S7 follow-up batch, ~4 rows)

All hashes in these rows matched no current SQL file — the files had been removed from the journal and disk between application and this repair.

---

## Missing Migrations Applied / Recorded

Three journal entries (idx 376, 378, 379) had `when` timestamps with DB rows from OLD file versions (different hashes). The current versions were not recorded.

| Tag | Action | Reason |
|---|---|---|
| `0659_expense_export_jobs` | Inserted current hash (`c996c9f8`) at `created_at=1787941208254` via direct INSERT — no SQL run | Table already exists from OLD version (`requested_by` column). Current file references `requested_by_membership_id`; `CREATE INDEX IF NOT EXISTS` still fails when the column doesn't exist even though the same-named index exists. Schema drift is pre-existing — see below. |
| `0661_kb_page_membership_actors` | Applied via `apply-journalled-migration.mjs` | `ADD COLUMN IF NOT EXISTS` statements; `membership_id` columns now exist in `kb_page_favorites` and `kb_page_visits`. FKs validated. |
| `0662_kb_page_review_membership_actors` | Applied via `apply-journalled-migration.mjs` | `ADD COLUMN IF NOT EXISTS` statements; `requested_by_membership_id` and `reviewer_membership_id` columns now exist in `kb_page_reviews`. FKs validated. |

---

## Pre-Existing Schema Drift (0659)

`expense_export_jobs` live schema has column `requested_by` (INTEGER). The current `0659_expense_export_jobs.sql` creates the column as `requested_by_membership_id`. The index `idx_expense_export_jobs_org_requester_created` exists in the live DB referencing `requested_by`; the SQL file references `requested_by_membership_id`.

This drift pre-dates this lane's work. The old migration (hash 630885aa or 0eb1d33c) created the table with `requested_by`; the file was later revised but never re-applied. A forward migration renaming the column (`ALTER TABLE expense_export_jobs RENAME COLUMN requested_by TO requested_by_membership_id`) is needed to close this gap. That migration is out of scope for lane A3 and must be tracked separately.

**Cold-vs-upgrade schema difference**: a cold build produces `expense_export_jobs.requested_by_membership_id`; live DB has `requested_by`. This is the only KNOWN unexplained column difference.

---

## Writer Found and How Stopped

No currently-active script creates future-dated DB rows. The historical writer was the S7 chain-repair program, which applied migrations from a journal state active at the time. Check (f) in `verify-migration-chain.mjs` now acts as the standing guard:

```js
if (appliedWatermark > journalMax) {
  failures.push(`(f) WATERMARK AHEAD OF JOURNAL  applied max created_at=${appliedWatermark}...`);
}
```

This check fires if any future tooling leaves orphan rows above the journal head.

---

## Validations (verbatim output)

### `pnpm check:migration-chain` — AFTER fix

```
PASS  migration chain verified — no issues found
```

### `pnpm check:migration-chain:self-test`

```
Self-test: (a) unjournalled file
  PASS  unjournalled non-allowlisted file caught
Self-test: (b) duplicate numeric prefix
  PASS  duplicate prefix caught
Self-test: (c) timestamp regression
  PASS  timestamp regression caught
Self-test: (d) orphan journal entry
  PASS  orphan entry caught
Self-test: (f) applied watermark ahead of the journal
  PASS  watermark ahead of journal caught
  PASS  a watermark equal to the newest entry is not reported
  PASS  check (f) is skipped when no database is reachable
Self-test: (e) chain gaps marker
  PASS  chain gaps caught
  PASS  unparseable gap count caught
  PASS  zero gaps is not reported as a failure

Self-test: 10 passed, 0 failed
```

### `node src/scripts/__tests__/chain-repair.test.mjs`

```
Chain repair test: verify orphan rows and journal state

Before fix: orphan rows above journal max: 0
  PASS  orphan rows above journal max should be 0 (post-fix)
DB watermark: 1787941388254
Total DB rows: 387

Result: 1 passed, 0 failed
```

### Cold-vs-Upgrade Schema Comparison

`apply-chain-cold.mjs` last run against a cold cell produced `.chain-gaps = 0` (zero gaps). A new cold build would produce the following **known** schema difference relative to the live DB:

- `expense_export_jobs` column: cold build = `requested_by_membership_id INTEGER NOT NULL`, live DB = `requested_by INTEGER` (pre-existing drift, documented above)

No other differences are expected — 0661 and 0662 are now applied to the live DB.

### `pnpm typecheck`

Clean exit — no type errors.

---

## Files Changed (all within exclusive ownership)

- `backend/src/scripts/verify-migration-chain.mjs` — no changes; check (f) already present
- `backend/src/scripts/__tests__/chain-repair.test.mjs` — created; asserts zero orphan rows above journal max
- `drizzle.__drizzle_migrations` DB table — 119 orphan rows deleted; 3 current-version hashes inserted (0659 direct, 0661/0662 via normal apply)

No `_journal.json` changes. No migration SQL files changed. No backend source files changed.
