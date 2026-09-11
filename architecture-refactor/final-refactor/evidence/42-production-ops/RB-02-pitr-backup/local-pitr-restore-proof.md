# Local backup/restore proof — the "restorable" half of PRD-C179

**Run date:** 2026-09-03 (UTC times inline below)
**Machine:** local developer laptop, PostgreSQL 18.4 (Homebrew), aarch64-apple-darwin
**Nothing remote was touched.** Every database named here is local. The backend `.env`
`DATABASE_URL` points at a shared remote Neon branch and was overridden on every command line.

---

## What this proves, and what it does not

PRD-C179 reads:

> Prove backups are **encrypted**, **controlled**, **restorable** and **periodically tested**
> with documented **key ownership**.

That is five claims. This file proves exactly one of them.

| Claim | Status | Why |
|---|---|---|
| **restorable** | **PROVEN LOCALLY** | Two independent restores into brand-new databases, verified against the source catalog and row-for-row. Detail below. |
| encrypted | **NOT PROVEN** | These dumps are plaintext files on a laptop disk. Backup-at-rest encryption is a provider/storage configuration. No deployed environment exists here. |
| controlled | **NOT PROVEN** | Access control over the backup store is an IAM configuration on a provisioned object store. None exists here. |
| periodically tested | **NOT PROVEN** | One manual run today is not a period. The scheduled job that would establish this is `backend/.github/workflows/cell-backup.yml`, and it has never run — it fails immediately without `CI_DATABASE_URL`. |
| documented key ownership | **NOT PROVEN** | There is no key. This is a named-human decision record, not a script result. |

A local `pg_dump` of an unencrypted laptop database says nothing about whether a production
backup is encrypted or who holds its key. It says a great deal about whether the schema and
data survive a round trip, and that is the part measured here.

---

## Method

Three databases, all created for this test:

| Database | Origin |
|---|---|
| `scratch_head_1010` | pre-existing, the migration-head database (677/677, read-only here) |
| `scratch_pitr_src_1010` | `pg_restore` of a `pg_dump` of head — **restore #1** |
| `scratch_pitr_restore_1010` | `pg_restore` of a later dump of `src` — **restore #2, the PITR cut** |

### Restore #1 — catalog and row fidelity

```
$ pg_dump -Fc -d postgresql://tarunchintakunta@localhost:5432/scratch_head_1010 \
      -f head_1010.dump
  exit=0  elapsed=1s  size=7,111,161 bytes

$ createdb scratch_pitr_src_1010
$ pg_restore -d postgresql://tarunchintakunta@localhost:5432/scratch_pitr_src_1010 \
      --no-owner --exit-on-error -j 4 head_1010.dump
  exit=0  elapsed=3s  stderr: 0 lines
```

`--exit-on-error` means any single failing statement would have aborted the restore
non-zero. It exited 0 with empty stderr.

Catalog census over 20 dimensions (`catalog-census.sql`, raw output in
`census_scratch_head_1010.txt` and `census_scratch_pitr_src_1010.txt`):

| Dimension | Source | Restored |
|---|---|---|
| schemas | 5 | 5 |
| extensions | 6 | 6 |
| tables | 1028 | 1028 |
| views / matviews | 0 / 0 | 0 / 0 |
| sequences | 772 | 772 |
| columns | 13539 | 13539 |
| indexes | 4765 | 4765 |
| constraints (total) | 14040 | 14040 |
| — primary key | 1028 | 1028 |
| — foreign key | 3199 | 3199 |
| — unique | 951 | 951 |
| — check | 311 | 311 |
| RLS policies | 983 | 983 |
| RLS-enabled tables | 983 | 983 |
| RLS-**forced** tables | 1 | 1 |
| triggers | 169 | 169 |
| functions | 468 | 468 |
| migrations applied | 677 | 677 |
| migration watermark | 1803000010128 | 1803000010128 |

`diff` of the two census outputs: **identical, no differences.**

Row counts, every populated table (`select count(*)` generated per relation):

```
populated tables (source):   12      populated tables (restored):   12
total rows      (source):   760      total rows      (restored):   760
diff: IDENTICAL — every populated table has the same row count
```

The RLS-forced row deserves a note: exactly one table in this schema has
`relforcerowsecurity` set (`external_effect_ledger`). Forced RLS filters even the table
owner, so it is the single most likely object to be silently lost or silently altered by a
restore. It round-tripped.

### Restore #2 — the point-in-time cut

The point of PITR is not that a backup restores; it is that it restores to a **chosen
moment**, keeping everything written before it and nothing written after. That is testable
without a provider, by taking the cut at a known point between two known writes.

```sql
-- in scratch_pitr_src_1010
CREATE TABLE public.pitr_drill_marker (
  id text PRIMARY KEY, phase text NOT NULL,
  written_at timestamptz NOT NULL DEFAULT clock_timestamp());

INSERT ... VALUES ('mig-001-before', 'BEFORE_BACKUP');   -- 21:52:37.913781+05:30
```

T1, the recovery target = `2026-09-03 21:52:37.938125+05:30`.

```
$ pg_dump -Fc -d <src> -f backup_at_T1.dump
  exit=0  elapsed_ms=854  size=7,110,187 bytes

-- then, AFTER the backup:
INSERT ... VALUES ('mig-002-after', 'AFTER_BACKUP');     -- 21:52:52.409014+05:30
```

Source now holds both markers. Restore the T1 backup into a **new, empty** database:

```
$ createdb scratch_pitr_restore_1010
$ pg_restore -d <restore> --no-owner --exit-on-error -j 4 backup_at_T1.dump
  exit=0  elapsed_ms=4761  stderr: 0 lines

$ psql <restore> -c "SELECT id, phase, written_at FROM public.pitr_drill_marker ORDER BY written_at;"
       id       |     phase     |            written_at
----------------+---------------+----------------------------------
 mig-001-before | BEFORE_BACKUP | 2026-09-03 21:52:37.913781+05:30
(1 row)
```

**Before-marker present. After-marker absent.** The cut landed where it was aimed.

Catalog diff, live source vs restored-to-T1: **identical.**
Row-count diff, live source vs restored-to-T1 — one line, and it is the right line:

```
12c12
< public.pitr_drill_marker|2
---
> public.pitr_drill_marker|1
```

These are the same four predicates `src/scripts/drill-pitr-restore.mjs` applies to a Neon
branch restore — `checkWatermark`, `checkBeforeMarker`, `checkAfterMarkerAbsent`,
`checkPolicies` — evaluated here against a logical dump/restore instead:

| Predicate | Required | Measured |
|---|---|---|
| `checkWatermark` | branch migration count == main | 677 == 677 |
| `checkBeforeMarker` | before-marker present | `mig-001-before` present |
| `checkAfterMarkerAbsent` | after-marker absent | `mig-002-after` absent |
| `checkPolicies` | non-zero and == source | 983 == 983 |

That is the same verification shape, over a different restore mechanism. It is **not** a
Neon branch restore, and it does not measure a provider RPO. See "What is still blocked".

---

## Cross-check with the repo's own tool

`cell:compare-schema` compares a cell's catalog against the control plane. Full output in
`compare-schema-restored-vs-head.txt`.

**Run A** — control plane `scratch_head_1010`, cell `scratch_drill_1010` (a `pg_restore`
copy of head that then had a complete `cell:backup` TRUNCATE-and-restore cycle run against
it, including dropping and re-adding 18 cycle-breaking FK constraints):

```
PASS  tables 1027/1027   PASS  columns 13536/13536   PASS  indexes 4764/4764
PASS  constraints 14037/14037   PASS  enums 2325/2325   PASS  functions 468/468
PASS  policies 983/983   PASS  rlsEnabled 983/983   PASS  triggers 169/169
FAIL  migrationHashes  journal=677 cell=677 missing=1 extra-in-cell=1
```

Nine of ten categories identical. **The `migrationHashes` FAIL is not caused by the
restore.** It is pre-existing drift between `scratch_head_1010`'s migration rows and the
repo journal, which the restore reproduced faithfully — which is what a correct restore
should do. Proof, md5 over all 677 hashes sorted:

```
scratch_head_1010          677 rows  488ca85e8718e2fb9427aabb7ed2a3c7
scratch_drill_1010         677 rows  488ca85e8718e2fb9427aabb7ed2a3c7
scratch_pitr_restore_1010  677 rows  488ca85e8718e2fb9427aabb7ed2a3c7
```

Source and both restored databases hold exactly the same migration set. The journal
discrepancy is a separate pre-existing condition of the head database and belongs to
migration-chain work, not to this ticket.

**Run B — anti-vacuity control.** Same tool, cell `scratch_pitr_restore_1010`, which has one
extra table (the marker). If the tool reported PASS here, Run A's nine PASS lines would mean
nothing:

```
FAIL  tables       control=1027 cell=1028  ONLY IN CELL  public.pitr_drill_marker
FAIL  columns      control=13536 cell=13539  (all three marker columns named individually)
FAIL  indexes      control=4764 cell=4765  ONLY IN CELL  public.pitr_drill_marker_pkey
FAIL  constraints  control=14037 cell=14041  (pkey + three not-nulls named individually)
```

The tool resolves a single extra table down to its individual columns and constraints. Run
A's PASS lines are load-bearing.

`cell:compare-schema --self-test` also passes:
`SELF-TEST PASS: diff, zero-migration vacuity, same-count hash-drift, and control-plane orphan isolation all verified`

---

## Honest limits of this evidence

1. **The dataset is tiny.** `scratch_head_1010` is a migration-head database: 1028 tables but
   only 12 populated, 760 rows total. Catalog fidelity is proven at full scale (1028 tables,
   14040 constraints, 4765 indexes). Row fidelity is proven over 760 rows. A restore that
   only breaks at volume would not be caught here.
2. **A logical dump is not PITR.** `pg_dump` reads a consistent snapshot at one instant. Real
   point-in-time recovery replays WAL to an arbitrary timestamp. The cut demonstrated above
   was *chosen by taking the dump at that moment*, not by rewinding to it. The recovery point
   granularity of a logical dump is the dump interval — which is the whole problem recorded
   under "what is still blocked".
3. **Nothing here is encrypted.** Both dump files are plaintext on a laptop disk in a
   scratchpad directory. They were deleted after measurement.
4. **Single-tenant data.** This database holds one organization, so a restore that leaked
   rows across tenants could not be distinguished from a correct one by row counts alone.

---

## What is still blocked, and on what

**The five-minute RPO of PRD-C171 is not met, and this is measurable rather than
speculative.** `backend/.github/workflows/cell-backup.yml` schedules
`cron: "0 */6 * * *"` — every six hours. `run-recovery-drill.mjs` reads that cron rather
than hard-coding a figure, and reports `rpo_operational_seconds: 21600` against
`rpo_target_seconds: 300`. That is **72x the target**, and it is a property of the schedule,
not of the machine it ran on. The workflow's own header comment says so plainly:

> A logical dump CANNOT reach the PRD's 5-minute recovery point — it reads every table. This
> job makes the recovery point bounded and known; Neon PITR is the mechanism that reaches 5
> minutes, and it needs `NEON_API_KEY`. Do not read a green run here as the objective being met.

Reaching 300 s needs continuous WAL archiving at the provider. `drill:pitr` is the script
that would exercise it and it blocks correctly:

```
$ node src/scripts/drill-pitr-restore.mjs
DRILL BLOCKED — missing env var(s): NEON_API_KEY, NEON_PROJECT_ID
exit 1
```

Its verification logic is proven correct by `drill:pitr:self-test` (9/9 fixtures, including
all five failure detections). Only the Neon API access is missing.
