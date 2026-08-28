# 33 — The migration chain rebuilds the database it claims to describe

**What to build:** A database built from empty through the committed migration chain is the database that is running. Not approximately — object for object, verified from `pg_catalog`. Until that is true, a new cell cannot be created, a disaster-recovery restore cannot be trusted, and CI's "rebuilds from empty" claim is not the claim it appears to be.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

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

**The 65 missing tables are the accounting, AP, AR, GL and tax model** — exactly the set `0591`'s own header says *"the 0000 baseline never actually created"*. They were created out of band and no migration has ever created them.

**It cuts both ways.** Three objects exist **only in the freshly-built cell** — `credit_note_items`, `fin_payment_run_items`, `vendor_credit_items`. Production dropped them out of band, and the chain still creates them. So the chain is not merely incomplete; it also builds things that should not exist.

## Acceptance criteria

- [ ] `cell:compare-schema` reports `differences=0` across all nine object classes between a freshly-bootstrapped database and the control, or every remaining difference is listed with a written reason and a decision.
- [ ] The 65 missing tables are created by journalled migrations, with their columns, constraints, indexes, enums, policies and triggers — not by a hand-run script and not by a snapshot dump nobody can review.
- [ ] The three cell-only objects are resolved in the correct direction: either the chain stops creating them, or production is wrong and they are restored. Decide from the product, not from whichever is easier.
- [ ] `chain_gaps` reaches **0**: no migration statement references an object that no earlier migration creates. A gap that is now harmless because the object arrives later is still a gap when the chain is replayed on a genuinely empty database.
- [ ] RLS parity holds — the 62 missing policies and 62 missing `rlsEnabled` tables close together. A table that exists without its policy is a silent cross-tenant hole, which is worse than a table that is absent.
- [ ] A CI step runs the comparison and fails the build non-zero when the chain and the schema diverge again, self-tested against a deliberately introduced divergence.
- [ ] Ticket 26's cold-bootstrap criterion can be ticked with this run as its evidence.

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
