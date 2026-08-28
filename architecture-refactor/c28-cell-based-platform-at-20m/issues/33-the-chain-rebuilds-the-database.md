# 33 — The migration chain rebuilds the database it claims to describe

**What to build:** A database built from empty through the committed migration chain is the database that is running. Not approximately — object for object, verified from `pg_catalog`. Until that is true, a new cell cannot be created, a disaster-recovery restore cannot be trusted, and CI's "rebuilds from empty" claim is not the claim it appears to be.

**Blocked by:** None — can start immediately

**Status:** partially done — **`differences=0` is reached and proved**; `chain_gaps` is 124, not 0, and the four unjournalled migrations and the CI guard are untouched

**This ticket was raised while the work was already in progress in another session, so read the criteria below rather than the framing above — two of its premises turned out to be wrong.** The repair is driven by `src/scripts/generate-chain-repair.mjs`, which reads both catalogues and emits the difference as idempotent SQL in either direction, landed as journalled migrations `0619`–`0623`.

## Where this came from

Ticket 26 tried to bootstrap `cell-2` from an empty database and could not reproduce production. This is the PRD's own mistake #13 — *"a type-safe table or constraint that is absent from the cold migration chain does not exist in production"* — found live, and it is the reason ticket 26's cold-bootstrap criterion is open.

The bootstrap script is not the problem. `pnpm -C backend cell:bootstrap --drop --i-mean-it` drops, creates, applies all 334 journal entries, grants the application role and verifies RLS with **no manual step**. It reaches head. The chain is what is wrong:

```text
RESULT: REACHED_HEAD 334/334 already_present=1 chain_gaps=130
  GAP  0591_tenant_isolation_for_unprotected_tables stmt 62: 42P01 relation "ap_allocations" does not exist
  GAP  0591_tenant_isolation_for_unprotected_tables stmt 67: 42P01 relation "ap_document_lines" does not exist
  GAP  0590_reconcile_baseline_shape_drift stmt 9:  42703 column "posted_journal_id" does not exist
  GAP  0352_custom_fields_consolidation  stmt 8:  42703 column "project_id" does not exist
  … 126 more
```

`pnpm -C backend cell:compare-schema` measures the consequence from `pg_catalog`, which is the evidence — the runner's exit code is not:

```text
FAIL  tables       control=  977  cell=  912  missing=  65  extra=  0
FAIL  columns      control=12423  cell=11419  missing=1013  extra=  9
FAIL  indexes      control= 4357  cell= 4071  missing= 346  extra= 60
FAIL  constraints  control=13294  cell=12313  missing=1139  extra=158
FAIL  enums        control= 2356  cell= 2075  missing= 281  extra=  0
FAIL  functions    control=  440  cell=  435  missing=   5  extra=  0
FAIL  policies     control=  929  cell=  870  missing=  62  extra=  3
FAIL  rlsEnabled   control=  929  cell=  870  missing=  62  extra=  3
FAIL  triggers     control=  104  cell=   73  missing=  34  extra=  3
RESULT: SCHEMAS DIFFER cell=cell-2 differences=3243
```

**The 65 missing tables are not one model, and an earlier draft of this ticket said they were.** Counted
from `CREATE TABLE` in the repair file, they are: **CRM 19** (commissions, call analysis, outbound,
reports, sending domains, `crm_org_party_map`), **accounting 31** (`gl` 13, `tax` 5, `ap` 5, `bank` 4,
`ar` 4), **customer lifecycle 5**, **relationships 3**, **subprocessor/subject 3**, **autonomy 2**,
`inv_import_rows`, `cell_capacity_measurements`. The accounting family is the set `0591`'s header says
*"the 0000 baseline never actually created"*, but it is under half the total — **CRM is the largest single
family**, and treating the 65 as one accounting problem will under-scope the review.

**At least one has a traced root cause.** `crm_org_party_map` is created by
`0263_crm_org_party_map.sql`, which is **absent from `meta/_journal.json`** and has therefore never
applied anywhere. Three more files are unjournalled in the same way — see the criterion below.

**It cuts both ways.** Three objects exist **only in the freshly-built cell** — `credit_note_items`, `fin_payment_run_items`, `vendor_credit_items`. Production dropped them out of band, and the chain still creates them. So the chain is not merely incomplete; it also builds things that should not exist.

## Acceptance criteria

- [x] `cell:compare-schema` reports `differences=0` across all nine object classes between a freshly-bootstrapped database and the control, or every remaining difference is listed with a written reason and a decision.

  ```
  PASS  tables       control=   976 cell=   976
  PASS  columns      control= 12426 cell= 12426
  PASS  indexes      control=  4417 cell=  4417
  PASS  constraints  control= 13455 cell= 13455
  PASS  enums        control=  2356 cell=  2356
  PASS  functions    control=   440 cell=   440
  PASS  policies     control=   933 cell=   933
  PASS  rlsEnabled   control=   933 cell=   933
  PASS  triggers     control=   109 cell=   109
  RESULT: SCHEMAS IDENTICAL cell=cell-2 differences=0
  ```

  The cell is the one built cold through `0000`–`0622`; `0623` was applied only to the control plane, because the chain had already given the cell those objects.

- [x] The 65 missing tables are created by journalled migrations, with their columns, constraints, indexes, enums, policies and triggers — not by a hand-run script and not by a snapshot dump nobody can review.

  `0619_chain_creates_what_production_has.sql`, journalled at `idx 340`. Generated from `pg_catalog`, not dumped: 39 enum types, 65 tables, 76 columns on tables that already existed, 5 functions, 1,139 constraints, 232 indexes, 34 triggers, 62 policies. Every statement is idempotent — `IF NOT EXISTS` where the syntax allows it, a whole `DO` block where it does not — so the file is a no-op against the database that supplied it, which `db:migrate` confirmed. **`--> statement-breakpoint` never appears inside a `DO` block**, because Drizzle splits on that marker and would tear the block into invalid fragments.

- [x] The three cell-only objects are resolved in the correct direction: either the chain stops creating them, or production is wrong and they are restored. Decide from the product, not from whichever is easier.

  **The premise was wrong and the correction is the finding.** They were never three cell-only *tables* — `credit_note_items`, `fin_payment_run_items` and `vendor_credit_items` exist in both databases. What existed only in the cell was their `org_id` column, their `trg_set_org_id` trigger, their RLS and their `tenant_isolation` policy. So the direction is **toward the chain**: production was the one missing tenant isolation, on three tables where `streamline_app` holds full DML.

  Resolved in `0620`, with `orgId` added to the Drizzle schema and the three insert sites. A fourth table, `candidate_resumes`, had the same shape in *both* databases and is resolved in `0621`; a fifth, `workflow_variables`, had it in the cell and not the control plane and is resolved in `0623`.

- [ ] `chain_gaps` reaches **0**: no migration statement references an object that no earlier migration creates. A gap that is now harmless because the object arrives later is still a gap when the chain is replayed on a genuinely empty database.

  **Open.** `REACHED_HEAD 339/339 already_present=0 chain_gaps=124`, down from 130. The end state converges; the middle does not. Closing this means the 65 tables are created *at the point in the chain where the statements that reference them run*, not appended at the end — which is a re-ordering of history rather than an addition to it, and a materially different job from the one that produced `differences=0`.

- [x] RLS parity holds — the 62 missing policies and 62 missing `rlsEnabled` tables close together. A table that exists without its policy is a silent cross-tenant hole, which is worse than a table that is absent.

  `policies 933/933` and `rlsEnabled 933/933` above, and `db:verify-rls` on the cold cell reports `RLS VERIFIED` with coverage `933 of 938`. The five gaps are the registered platform-global control-plane tables.

  The guard that reports this was itself extended, because it could not see the worst case: both its checks require the org column to *exist*, so a tenant table that lost its tenant column entirely passed by being more broken rather than less. A third check applies 0320's own predicate — a NOT NULL single-column foreign key to an org-bearing parent — and failed on four real tables before the fix, then passed after it.
- [ ] **The four unjournalled migrations are resolved, not left on disk.** `0263_crm_org_party_map.sql`, `0264_crm_org_party_backfill.sql`, `0266_party_association_backfill.sql` and `0267_record_layout_adjustments.sql` are absent from `meta/_journal.json` and have never applied. Verified 2026-08-28: `0263` is why `crm_org_party_map` is in the 65; `0267` is harmless because `0590_reconcile_baseline_shape_drift.sql` creates the same table and *is* journalled. **`0264` and `0266` are data backfills, so a repair that only creates the table leaves it empty** — decide whether that data is still needed, and delete any file that is genuinely superseded rather than leaving a `.sql` that looks applied and is not.

  **Open, and untouched.** Re-verified this session: all four files are present and none appears in `meta/_journal.json`. `crm_org_party_map` now exists in both databases — `0619` created it from the catalogue — and holds **0 rows in both**, so the two backfills have nothing to backfill at today's data volume. That does not decide their fate; it means only that deciding is not urgent. The decision belongs to whoever owns CRM.

- [ ] A CI step runs the comparison and fails the build non-zero when the chain and the schema diverge again, self-tested against a deliberately introduced divergence.

  **Open.** `cell:compare-schema` already exits non-zero on divergence and has a self-test, and `cell:chain-repair:self-test` proves the generator emits SQL for a source-only table and nothing for identical catalogues — but neither is wired into CI, and CI has no second database to compare against. Wiring it means giving CI a cold-built database per run, which is the expensive half.
- [x] Ticket 26's cold-bootstrap criterion can be ticked with this run as its evidence.

  Ticked there, with this run's output pasted as its evidence.

## Todo

- [ ] Classify the 3,243 differences before writing a single migration. Tables, columns, indexes, constraints, enums, policies and triggers have different fix shapes, and the count is misleading — 1,139 missing constraints will mostly follow from creating 65 tables.
- [ ] Derive the DDL from `pg_catalog` on the running database, not from the Drizzle schema files. The schema files are what *should* be true; the catalog is what *is*. Where they disagree, that disagreement is itself a finding.
- [ ] Do not reach for `db:generate` to solve this wholesale. `generate --custom` copies the snapshot instead of diffing it, so the next `db:generate` re-proposes work already applied.
- [ ] Fix the chain gaps in dependency order — `0591` fails because the tables it protects were never created, so creating them earlier in the chain may close many gaps at once.
- [ ] Journal every migration. A `.sql` absent from `meta/_journal.json` never applies and `db:migrate` reports success anyway. `meta/_journal.json` is append-only and shared.
- [ ] Re-run `cell:bootstrap --drop` from genuinely empty after each batch rather than at the end — a chain error is far cheaper to locate in a batch of five than in a batch of sixty-five.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Why this is not a schema-file exercise

`db/schema/hrms-phase1-sql-managed.ts` is a deliberate holding barrel for tables managed by raw SQL in a pending root, kept out of the runtime barrel so Drizzle never manages them, and `migration-integrity.spec.ts` asserts that arrangement. knip reports all 11 of its files as unused **by design**. Some of the 65 may belong to that pattern rather than being an oversight — check before assuming every one is a mistake, and grep a schema file's **path**, not only its symbols, before concluding anything about it.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
