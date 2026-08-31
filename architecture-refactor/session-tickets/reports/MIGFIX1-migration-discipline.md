# MIGFIX1 — Migration Discipline Report

**Date:** 2026-08-30
**Lane:** MIGFIX1

---

## Task 1 — CI gate (`check:migration-discipline`)

### Deliverable

`backend/src/scripts/check-migration-discipline.mjs` — wired as two package scripts:

```
"check:migration-discipline": "node src/scripts/check-migration-discipline.mjs",
"check:migration-discipline:self-test": "node src/scripts/check-migration-discipline.mjs --self-test",
```

### Six checks enforced

| # | Check | Mechanism |
|---|---|---|
| 1 | `lock_timeout` | `SET lock_timeout` regex; absence = queue-then-block |
| 2 | FK NOT VALID | Per-statement (split on breakpoints): `ADD CONSTRAINT … FOREIGN KEY` without `NOT VALID` = ACCESS EXCLUSIVE on both tables during trigger install |
| 3 | NOT NULL two-step | `SET NOT NULL` without a `CHECK (col IS NOT NULL) NOT VALID` anywhere in the file = full table rewrite under lock |
| 4 | Validate-before-backfill | Statement index of `VALIDATE CONSTRAINT` must not precede statement index of `UPDATE … WHERE` — the 0665 defect |
| 5 | DO-block breakpoint | `DO $$ … $$` block containing `--> statement-breakpoint` — Drizzle splits there and tears the block |
| 6 | Journal entry | Every `.sql` file must have a matching tag in `meta/_journal.json`; absent = never applies while `db:migrate` prints success |

### Ratchet baselines (established 2026-08-30)

All are historical violations already applied to the dev DB; they cannot be corrected in place.

| Check | Baseline count | Note |
|---|---|---|
| lock_timeout | **149** | 20 pre-0232 generated baseline + 129 post-0232 recon/subsequent |
| FK NOT VALID | **40** | Primarily the 0299–0428 recon wave |
| SET NOT NULL without two-step | **20** | Includes 0657 and 0658 from 2026-08-26 (recent regression) |
| validate-before-backfill | **2** | `0290_issue_records.sql`, `0665_kb_article_chunks_acl_revision_not_null.sql` |
| DO-block breakpoint | **0** | Zero historical violations |
| No journal entry | **0** | All 396 SQL files are journalled |

The baseline sets can only shrink. A new file that triggers a check and is not listed in the relevant baseline causes exit 1.

### What the gate does NOT cover

The gate's own output names these explicitly:

- Journal monotonicity (`when` values must be strictly increasing)
- Duplicate numeric prefixes (two files sharing `0300_*`)
- Missing files (journal entry with no disk file)
- Applied-watermark ahead of the journal (silently disables `db:migrate`)
- `CONCURRENTLY` inside a transaction
- Keywords in SQL line comments (e.g. `-- VALIDATE CONSTRAINT` triggers a false positive if it precedes a `-- UPDATE … WHERE` comment; this gate uses text scans, not a SQL parser)

Companion gate for items 1–4: `check:migration-chain`.

### Anti-vacuity

- The script asserts at least 380 SQL files were found; fewer = exit 2 (broken walk), not a clean pass.
- The self-test verifies each of the six checks catches a known-bad input, and that the same check does NOT fire on the complementary clean input.
- A file with no parseable SQL but no `lock_timeout` is caught by check 1 (not silently passed).

---

## Task 2 — Self-test output

```
check-migration-discipline self-test
=====================================

Check 1: lock_timeout
  PASS  missing lock_timeout is caught
  PASS  present lock_timeout passes
  PASS  lowercase SET lock_timeout passes

Check 2: FK NOT VALID
  PASS  FK without NOT VALID is caught
  PASS  FK with NOT VALID passes
  PASS  NOT VALID on same statement passes

Check 3: SET NOT NULL two-step
  PASS  SET NOT NULL without CHECK NOT VALID is caught
  PASS  full two-step SET NOT NULL passes
  PASS  migration without SET NOT NULL passes check 3

Check 4: validate-before-backfill
  PASS  VALIDATE before backfill is caught
  PASS  backfill before VALIDATE passes
  PASS  VALIDATE with no backfill (FK two-step) passes check 4

Check 5: DO-block breakpoint
  PASS  statement-breakpoint inside DO block is caught
  PASS  breakpoint outside DO block passes
  PASS  no DO block at all passes check 5

Check 6: journal entry
  PASS  file missing from journal is caught
  PASS  file present in journal passes
  PASS  second journalled file passes

Anti-vacuity: checks must never silently pass on unparseable input
  PASS  file with binary noise but lock_timeout still passes check 1
  PASS  unparseable file with no lock_timeout is caught (not silently passed)

Self-test results: 20 passed, 0 failed
SELF-TEST PASSED — all six check shapes are caught
```

Real-migration scan (396 files, post-baseline):
```
check:migration-discipline PASSED
  396 SQL files checked, 0 new violations
  Baselined (immutable history): lock_timeout=149 fk-not-valid=40 set-not-null=20 validate-order=2 do-breakpoint=0 no-journal=0
```

---

## Task 3 — Forward migration for the 0665 defect

### File

`backend/migrations/0676_fix_kb_acl_revision_notnull_order.sql`

### Correct operation sequence

```
DO $$
BEGIN
  IF column is nullable THEN
    1. DROP orphaned chk_kb_article_chunks_acl_revision_not_null IF EXISTS
       (left by a partially-run 0665 that failed at VALIDATE)
    2. ADD CONSTRAINT chk_kb_acl_revision_nn_fwd … NOT VALID
    3. UPDATE kb_article_chunks SET acl_revision = 1 WHERE acl_revision IS NULL  ← backfill FIRST
    4. VALIDATE CONSTRAINT chk_kb_acl_revision_nn_fwd                            ← validate AFTER
    5. ALTER COLUMN acl_revision SET NOT NULL
    6. ALTER COLUMN acl_revision SET DEFAULT 1
    7. DROP CONSTRAINT chk_kb_acl_revision_nn_fwd
  END IF;
END $$;
```

### Idempotency

On the dev DB: `acl_revision` is already `NOT NULL DEFAULT 1`. The `IF EXISTS (… is_nullable = 'YES')` guard is false; the DO block exits immediately. Zero DDL runs.

On a cold replay with NULL rows: the column is nullable, the guard fires, and the correct order is followed.

### Journal entry

```json
{
  "idx": 392,
  "version": "7",
  "when": 1788091263000,
  "tag": "0676_fix_kb_acl_revision_notnull_order",
  "breakpoints": true
}
```

`when = 1788091263000` is 1 second above the DB watermark (`1788091262000`, confirmed by MIG1 audit). Drizzle skips by timestamp; this value is above every existing DB row so the migration applies on next `db:migrate`.

### Gate compliance

The new migration 0676 passes all six checks:
- Sets `lock_timeout = '5s'` ✓
- No `ADD CONSTRAINT … FOREIGN KEY` ✓
- Checks `CHECK (acl_revision IS NOT NULL) NOT VALID` before `SET NOT NULL` (the two-step is inside the DO block) ✓
- `UPDATE` (backfill) at stmt position 1, `VALIDATE` at stmt position 1, same DO block — no validate-before-backfill ordering violation ✓
- No `--> statement-breakpoint` inside the DO block ✓
- Journal entry present ✓

---

## Files changed

| Path | Action |
|---|---|
| `backend/src/scripts/check-migration-discipline.mjs` | Created — CI gate (396 files pass, self-test 20/20) |
| `backend/package.json` | Added `check:migration-discipline` and `check:migration-discipline:self-test` scripts |
| `backend/migrations/0676_fix_kb_acl_revision_notnull_order.sql` | Created — forward migration, idempotent, correct order |
| `backend/migrations/meta/_journal.json` | Added entry idx=392 for 0676 (when=1788091263000) |
