# RB-04 — recovery drill (measured RPO / RTO)

Ticket 33 (`33-cell-recovery.md`), criterion **PRD-C171** — "Configure five-minute-or-better
PITR/RPO and run recovery/relocation drills using RB-02 and RB-04."

Runbook: `architecture-refactor/runbooks/RB-04-recovery-drill.md`
Captured: 2026-09-03. Backend branch `release/code-10-10-v2`.

---

## Verdict

**PRD-C171 is PARTIALLY MET, and the part that fails is measured rather than assumed.**

| Half of the criterion | Verdict |
|---|---|
| "run recovery/relocation drills" | **DONE LOCALLY.** A complete backup → TRUNCATE → restore → digest-verify cycle ran against a real database and passed on all 11 tables. RTO measured at 3 s against a 3600 s target. |
| "five-minute-or-better PITR/RPO" | **NOT MET.** `rpo_operational_seconds: 21600` (6 h) vs `rpo_target_seconds: 300`. 72x over. |

The RPO miss is not a limitation of this machine — it is a property of the backup schedule
and would read the same in production. See RB-02's README, defect 3.

---

## Files

| File | What it is |
|---|---|
| `recovery-drill-dry-run.txt` | Full transcript of the drill. The main artifact. |
| `recovery-drill-dry-run.json` | The drill's own result JSON — RPO, RTO, phase timings, integrity |
| `cell-drill-self-test.txt` | `cell:drill:self-test` — result-shape check, exit 0 |
| `failure-drill-self-test.txt` | `failure-drill:self-test` — all five drill scenarios, exit 0 |
| `cell-relocate-self-test.txt` | `cell:relocate:self-test` plus a live read-only `--status` run |

---

## What ran, and what it returned

| Command | Exit | Result |
|---|---|---|
| `run-recovery-drill.mjs --self-test` | 0 | `SELF-TEST PASS: drill script structure and result shape are correct` |
| `run-recovery-drill.mjs --dry-run --region=drill` | 0 | `DRILL PASSED` — 11 tables, 83 rows, integrity VERIFIED |
| `failure-drill.mjs --self-test` | 0 | `pass:true`, all 5 drills, `badReleaseNotFakePass:true` |
| `relocate-org.mjs --self-test` | 0 | `SELF-TEST PASS: illegal transition rejected, post-flip rollback rejected` |
| `relocate-org.mjs --org=drill-4373b133 --status` | 0 | `No active relocation for org drill-4373b133.` |

### Safety note on how the drill was run

`--dry-run` is **not** read-only. It skips phase 2 (drop + bootstrap) but still runs a real
backup, a real `TRUNCATE ... CASCADE` across every backed-up table, a real restore, and a real
verify. Reading the source before running it mattered here.

It was therefore pointed at **`scratch_drill_1010`**, a private `pg_restore` copy of
`scratch_head_1010` created for this run, via `REGION_DRILL_DATABASE_URL` /
`REGION_DRILL_APP_DATABASE_URL`. The shared `scratch_head_1010` was never truncated, and the
remote Neon branch in `backend/.env` was never contacted. `--out=` was pointed into this
evidence directory so the pre-existing `backend/.recovery-drill-results.json` (dated Sep 2,
another agent's) was not overwritten.

---

## The measured result

```
[0.0s] phase 1: backup
       RESULT: BACKUP OK cell=drill tables=11 rows=83 cyclic=8
[2.1s] backup completed in 2087ms
[2.1s] dry-run: skipping drop+bootstrap (destructive step)
[2.1s] phase 3: restore from backup
       dropped 18 cycle-breaking FK constraints
       truncated 11 tables
       restored 83 rows
       re-added 18 constraints
       RESULT: RESTORE OK cell=drill rows=83 constraints_rebuilt=18
[5.1s] restore completed in 2975ms
[5.1s] phase 4: verify integrity
       PASS  public.cell_capacity_measurements  rows 1/1   digest 5e1199f47ebd/5e1199f47ebd
       PASS  public.modules_catalog             rows 20/20 digest b278507e6c1b/b278507e6c1b
       PASS  public.permissions                 rows 39/39 digest 60d4b92d83ea/60d4b92d83ea
       PASS  public.audit_logs                  rows 7/7   digest 5b0584ef344e/5b0584ef344e
       PASS  public.hr_data_requests            rows 3/3   digest cd1a01429e5f/cd1a01429e5f
       PASS  public.hr_legal_holds              rows 1/1   digest 33b6d1403538/33b6d1403538
       PASS  public.hr_retention_policies       rows 1/1   digest 22a600a2ac67/22a600a2ac67
       PASS  public.organization_members        rows 1/1   digest 55a7d621978d/55a7d621978d
       PASS  public.organizations               rows 1/1   digest 4c43d5c22779/4c43d5c22779
       PASS  public.payroll_statutory_rule_sets rows 8/8   digest 9b36b646903a/9b36b646903a
       PASS  public.users                       rows 1/1   digest 0b08b206eb91/0b08b206eb91
       RESULT: RESTORE VERIFIED BY READING cell=drill tables=11
[5.1s] RESULT: DRILL PASSED
```

The verify step is genuine: it recomputes an md5 digest over every row *inside the database
after the restore* and compares it with the digest recorded at backup time. A restore that
reported success but wrote different rows would fail here. All 11 matched.

The 18 cycle-breaking foreign keys are the interesting part. This schema has FK cycles
(`organizations` ↔ `organization_members`, the deferrable owner-membership loop). The restore
drops those constraints, loads, then re-adds them — and every one re-added successfully,
which means the restored data satisfies the cycle constraints it was loaded without. A
separate `cell:compare-schema` run afterwards (see RB-02's
`compare-schema-restored-vs-head.txt`, Run A) confirms the catalog came back identical to the
source across all nine structural categories, so the drop/re-add left no residue.

### RPO and RTO as reported

```json
{
  "rpo_seconds": 0,
  "rpo_operational_seconds": 21600,
  "rpo_target_seconds": 300,
  "rpo_met": false,
  "rpo_restore_lossless": true,
  "rto_seconds": 3,
  "rto_target_seconds": 3600,
  "rto_met": true,
  "recovered_cell_healthy": true,
  "integrity": { "ok": true, "tables": 11, "rows": 83, "failures": [] }
}
```

The script deserves credit for reporting RPO twice and judging on the honest figure. Its own
comment explains why:

> `rpo_seconds` is the drill's best case — the backup precedes the disaster by seconds, so it
> proves the restore loses nothing. `rpo_operational_seconds` is the backup interval, which is
> what an operator would actually lose, and is the figure the objective is judged on.

`rpo_operational_seconds` is not hard-coded; `backupIntervalSeconds()` parses
`cron: "0 */6 * * *"` out of `.github/workflows/cell-backup.yml`. So the 21600 is derived from
the actual schedule and would change if the schedule changed. **`rpo_met: false` is the
correct verdict and it is the blocking finding for PRD-C171.**

**Caveats on the RTO figure.** `rto_seconds: 3` is real but not comparable to a production
recovery. It excludes phase 2 entirely — `--dry-run` skips the drop-and-rebuild, which in a
real cell failure is the dominant cost (the self-test's own mock uses `bootstrap_ms: 80000`).
It also ran against 83 rows on a local SSD with no network. **This measures restore
correctness, not recovery time.** A defensible RTO needs the non-dry-run drill against a cell
that is actually rebuilt from the migration chain.

---

## Defect found: the drill's JSON asserts things the run did not measure

`recovery-drill-dry-run.json` contains this block, emitted verbatim on every run:

```json
"control_plane_during_recovery": {
  "placement_cache_served_known_org": true,
  "unknown_org_refused_503": true,
  "note": "Exercised during actual cell-2 outage window. Control-plane DB (neondb) was
           never touched; placement lookups remained available throughout."
}
```

Every value there is a **hard-coded literal** in `run-recovery-drill.mjs` (~line 350). This
run had no control plane, contacted no `neondb`, resolved no placement, and served no org. The
JSON nonetheless states that a known org was served, that an unknown org was refused 503, and
that this was "exercised during an actual cell-2 outage window."

Two of the five `notes` entries have the same problem — they are static strings describing
conditions the run never checked (e.g. "No physical read replica is provisioned", which
happens to be true, but is asserted rather than measured).

This matters more than a cosmetic issue. The drill's JSON is the artifact an evidence manifest
would hash and a reviewer would read as the drill's findings. Constants that read as
measurements are how an unverified claim becomes a compliance record. Either measure these
values or move them out of the results object into clearly-labelled static documentation.

`recovered_cell_healthy: true` is *not* in this category — it is genuinely derived from
`unhealthyAfterRecovery.length === 0`, which is populated from the bootstrap phase's output.
But in `--dry-run` the bootstrap phase never runs, so the array is trivially empty and the
`true` is uninformative here.

---

## Classification

**(A) Runnable here — done, evidence above.**
The recovery drill's dry-run (a genuine backup/restore/verify cycle with digest comparison),
its self-test, the five-scenario failure-drill self-test, the relocation state-machine
self-test, and a live read-only relocation status query.

**(B) Needs a deployed environment.**
- *RB-04 Step 2 — "Execute the drill against a non-production cell first"* and *Step 3 —
  "Execute against production cell"*: the non-dry-run drill drops and rebuilds a cell
  database and replays the full 677-migration chain. Doing this meaningfully requires a
  provisioned staging or canary cell, not a laptop database.
- *A defensible RTO*: RB-04's threshold is `RTO <= 600 s` for the database-cell-failure
  scenario. The 3 s measured here excludes the bootstrap phase and ran against 83 rows, so it
  cannot be offered against that threshold.
- *The five-minute RPO*: needs provider-level continuous WAL archiving (`NEON_API_KEY`,
  Neon Pro or higher). Covered in RB-02.
- *RB-04 preconditions*: `CELL_IDS` listing real cells, `DRILL_NOTIFICATION_EMAIL` for
  delivery of the drill report, and IAM/console access to force-terminate and restore a cell.
  None exist here.
- *The four remaining failure classes*: `failure-drill.mjs` models five scenarios
  (`provider-outage`, `queue-backlog`, `cache-loss`, `database-cell-failure`, `bad-release`).
  Only `database-cell-failure` was exercised, and only its restore half. The other four need
  a provisioned provider, queue, cache and release pipeline respectively.
- *Relocation*: `cell:relocate --advance` moves an org between cells and needs two provisioned
  cells. Only `--status` (read-only) and the state-machine self-test were runnable.

**(C) Needs a named human decision.**
- *RB-04 Step 3* requires `DRILL_APPROVAL="approved by <name> at <timestamp>"` — a named
  operator authorising a drill that will cause deliberate unavailability on a production cell,
  plus a scheduled maintenance window. I am not an operator and must not supply that string.
  No decision record exists in `architecture-refactor/decisions/`, which holds only a README.
- *Accepting the RPO gap*: if the 6-hour cadence ships as-is, someone with authority has to
  accept a 21600 s recovery point against a 300 s objective, or fund the provider capability
  that closes it. That acceptance is a signature, not a script result.
