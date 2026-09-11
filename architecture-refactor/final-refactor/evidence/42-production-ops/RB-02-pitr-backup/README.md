# RB-02 — PITR / backup frequency

Ticket 33 (`33-cell-recovery.md`), criteria **PRD-C171** (five-minute-or-better PITR/RPO)
and **PRD-C179** (backups encrypted, controlled, restorable, periodically tested, documented
key ownership).

Runbook: `architecture-refactor/runbooks/RB-02-pitr-backup.md`
Captured: 2026-09-03. Backend branch `release/code-10-10-v2`.

---

## Verdict

| Criterion | Verdict |
|---|---|
| PRD-C171 — 5-minute PITR/RPO | **NOT MET, and measured.** Backup cadence is 6 h (21600 s) against a 300 s target — 72x over. Closing it needs provider-level WAL archiving. |
| PRD-C179 — restorable | **PROVEN LOCALLY.** Two restores into new databases; catalog identical across 20 dimensions, rows identical, PITR cut lands exactly. |
| PRD-C179 — encrypted / controlled / periodically tested / key ownership | **NOT PROVEN.** Four separate claims, none of which a local script can establish. |

---

## Files

| File | What it is |
|---|---|
| `local-pitr-restore-proof.md` | The main result. Full method, measurements and limits of the local backup/restore proof. **Read this one.** |
| `cell-backup-live-run.txt` | `cell:backup --backup` against local `scratch_head_1010`. Exit 0, 11 tables, 83 rows. |
| `cell-backup-self-test.txt` | `cell:backup:self-test`, two runs — as documented (exit **1**) and with env supplied (exit 0). See defect 1. |
| `drill-pitr-self-test.txt` | `drill:pitr:self-test` 9/9 fixtures, plus the live `drill:pitr` prerequisite block. |
| `compare-schema-restored-vs-head.txt` | `cell:compare-schema` restored-vs-source, plus an anti-vacuity control. |
| `catalog-census.sql` | The 20-dimension census query, so any of this can be re-run. |
| `census_*.txt` | Raw census output per database. |

---

## What ran, and what it returned

All commands were run with `DATABASE_URL` / `APP_DATABASE_URL` **overridden on the command
line** to local scratch databases. The backend `.env` points `DATABASE_URL` at a shared
remote Neon branch; nothing here touched it.

| Command | Exit | Result |
|---|---|---|
| `node src/scripts/cell-backup.mjs --self-test` (as documented) | **1** | Crashes before the self-test runs — defect 1 |
| same, with `DATABASE_URL`/`APP_DATABASE_URL` exported | 0 | `SELF-TEST PASS: parents precede children and the cycle is reported` |
| `cell-backup.mjs --region=head --database=scratch_head_1010 --backup` | 0 | `BACKUP OK tables=11 rows=83 cyclic=8`, 17898 bytes, 1668 ms |
| `drill-pitr-restore.mjs --self-test` | 0 | `self-test PASS — all verification fixtures behave correctly` (9/9) |
| `drill-pitr-restore.mjs` (live) | 1 | `DRILL BLOCKED — missing env var(s): NEON_API_KEY, NEON_PROJECT_ID` |
| `compare-cell-schema.mjs --self-test` | 0 | `SELF-TEST PASS: diff, zero-migration vacuity, same-count hash-drift, control-plane orphan isolation` |
| `compare-cell-schema.mjs --region=drill` (restored vs source) | 1 | 9/10 categories identical; the one FAIL is pre-existing journal drift, not restore loss |
| `compare-cell-schema.mjs --region=pitr` (anti-vacuity control) | 1 | Correctly detects one extra table down to individual columns |
| `pg_dump` / `pg_restore` round trips (×2) | 0 | See `local-pitr-restore-proof.md` |

---

## Defects found

### 1. `cell:backup:self-test` cannot pass as the runbook documents it

RB-02 records:

> `cell:backup:self-test` PASSED on 2026-08-30:
> `SELF-TEST PASS: parents precede children and the cycle is reported, not silently ordered`

That result does not reproduce from this checkout. `npm run cell:backup:self-test` exits **1**:

```
Error: APP_DATABASE_URL (the non-BYPASSRLS app role) is required.
    at parseCellArgs (cell-topology.mjs:52:11)
    at cell-backup.mjs:27:18
```

Cause: `cell-backup.mjs:27` calls `parseCellArgs(argv, env)` at module scope, above the
`--self-test` branch at line ~320. The self-test is pure logic over an in-memory fixture and
opens no connection, but it cannot be reached without two database URLs. `backend/.env`
defines `DATABASE_URL` and no `APP_DATABASE_URL`, so the documented command fails on a
clean checkout.

With both variables exported the self-test passes, so the **ordering logic is correct and
the packaging is wrong**. Fix: move the `--self-test` branch above `parseCellArgs`.

Effect on the runbook: RB-02's "Self-test result (guard correctness)" section asserts a pass
that the repo cannot currently produce.

### 2. `cell:backup` excludes the `drizzle` schema, so its output is a data-only backup

`populatedTables()` filters `schemaname NOT IN ('pg_catalog','information_schema','drizzle')`.
Measured consequence on the same database:

| Tool | Tables | Rows |
|---|---|---|
| `pg_dump` | 12 populated | 760 |
| `cell:backup` | 11 | 83 |

The 677-row difference is exactly `drizzle.__drizzle_migrations`. **A cell restored from a
`cell:backup` NDJSON alone would have no migration history at all.**

This is not a bug in the drill flow, where `bootstrap-cell.mjs` replays the whole chain
first and the NDJSON is layered on top. It is a hazard for anyone treating the NDJSON as a
standalone backup: it is a data extract that depends on the migration chain still being
replayable from source. Worth stating in RB-02, which currently calls it "the backup
integrity script" without qualification.

### 3. The 6-hour cadence is the binding constraint on PRD-C171

`backend/.github/workflows/cell-backup.yml` sets `cron: "0 */6 * * *"`. `run-recovery-drill.mjs`
reads that cron rather than hard-coding a number, and reports `rpo_operational_seconds: 21600`
against `rpo_target_seconds: 300`.

To the workflow's credit it is honest about this in its own header, and it fails rather than
reporting green when `CI_DATABASE_URL` is absent — so it has never produced a false healthy
signal. But it also means no scheduled backup has ever run, which is why "periodically
tested" in PRD-C179 has no evidence behind it.

---

## Classification

**(A) Runnable here — done, evidence above.**
Backup script, its self-test, the PITR drill's self-test and prerequisite path, schema
comparison with an anti-vacuity control, and a genuine dump/restore round trip proving the
restorable half of C179.

**(B) Needs a deployed environment.**
- *"Configure five-minute-or-better PITR/RPO"* (PRD-C171) — continuous WAL archiving at the
  managed-database provider. RB-02 Step 1 requires `NEON_API_KEY` and a project/branch id to
  read `history_retention_seconds`; RB-02 Step 2's restore drill requires `neon branches
  restore`. Neither exists on this machine, and PITR requires a Neon Pro plan or higher.
- *"backups are **encrypted**"* (PRD-C179) — a property of the provider's backup store.
- *"**controlled**"* (PRD-C179) — IAM over that store.
- *"**periodically tested**"* (PRD-C179) — requires the scheduled workflow to actually run,
  which requires the `CI_DATABASE_URL` secret against a real database.

**(C) Needs a named human decision.**
- *"documented **key ownership**"* (PRD-C179) — naming the role or person who holds the
  backup encryption key, and who may use it to restore. No script produces this; it is an
  Operations/Security record. No such decision record exists in
  `architecture-refactor/decisions/`, which currently holds only a README.
