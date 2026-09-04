# PRD-C057 — schema and executable-key inventory

**Generated** 2026-09-04 from `scratch_gates_head` (685/685 journal entries applied) at branch
`release/v2-closeout`. Regenerate and validate with:

```
node src/scripts/build-key-inventory.mjs \
  --db=postgres://neondb_owner@localhost:5432/scratch_gates_head \
  --out=<this directory>
node src/scripts/check-key-inventory.mjs \
  --dir=<this directory> \
  --db=postgres://neondb_owner@localhost:5432/scratch_gates_head
```

Both live in `streamlineos-backend/src/scripts/`. The second is the gate: it fails when a registry
the criterion names is missing, when any entry lacks a verdict, an owner, a concrete failure
prevented or evidence, when an extractor returns a suspiciously small population, or when the
database half no longer matches `pg_catalog`. `--self-test` exercises each of those in both
directions, and `src/scripts/__tests__/key-inventory.spec.ts` drives the real binary.

**This artifact is machine-readable on purpose.** The prior wave's inventory
(`.scratch/code-release-10-10/reports/07-key-inventory.md`) was prose. It went stale inside a day —
it recorded 15 baselined referential-action divergences where the gate prints 62 — and contradicted
itself between its own sections (§3.2 "Prefix-redundant indexes — REMOVE (299)" against §4.3 "Six
drops that a seeded database says were not free"). Nothing in the document said so. One `.jsonl`
row per entry, regenerated in one command and validated against the catalog, is the fix for that.

## Registries

| registry | file | entries | KEEP | REFACTOR | REMOVE |
|---|---|---|---|---|---|
| `code.cache-namespace` | `code-cache-namespace.jsonl` | 218 | 218 | 0 | 0 |
| `code.command` | `code-command.jsonl` | 17 | 17 | 0 | 0 |
| `code.configuration` | `code-configuration.jsonl` | 96 | 96 | 0 | 0 |
| `code.environment-variable` | `code-environment-variable.jsonl` | 114 | 114 | 0 | 0 |
| `code.event` | `code-event.jsonl` | 115 | 115 | 0 | 0 |
| `code.feature-flag` | `code-feature-flag.jsonl` | 7 | 6 | 1 | 0 |
| `code.module` | `code-module.jsonl` | 22 | 18 | 4 | 0 |
| `code.permission` | `code-permission.jsonl` | 704 | 661 | 34 | 9 |
| `code.query-key` | `code-query-key.jsonl` | 1089 | 1089 | 0 | 0 |
| `code.route` | `code-route.jsonl` | 3648 | 26 | 3622 | 0 |
| `code.translation` | `code-translation.jsonl` | 1 | 1 | 0 | 0 |
| `database.check` | `database-check.jsonl` | 311 | 306 | 5 | 0 |
| `database.column` | `database-column.jsonl` | 12267 | 10012 | 1915 | 340 |
| `database.foreign-key` | `database-foreign-key.jsonl` | 3090 | 1724 | 1366 | 0 |
| `database.index` | `database-index.jsonl` | 5394 | 4542 | 852 | 0 |
| `database.jsonb-column` | `database-jsonb-column.jsonl` | 431 | 414 | 0 | 17 |
| `database.jsonb-key` | `database-jsonb-key.jsonl` | 10 | 2 | 8 | 0 |
| `database.primary-key` | `database-primary-key.jsonl` | 978 | 978 | 0 | 0 |
| `database.unique` | `database-unique.jsonl` | 902 | 865 | 37 | 0 |
**29,414 entries.** Every row carries `registry`, `item`, `owner` (an area — this repo has no
CODEOWNERS), `verdict`, `failurePrevented` and `evidence` (a `file:line`, a `pg_catalog` object
definition, or the command that measured it).

`c059-redundancy-detection.json` is the PRD-C059 companion: 1,039 overlapping foreign keys, unique
constraints, checks and indexes, each with the reason it is preserved, and zero true duplicates.

## What each verdict means

- **KEEP** — a measured reach, or a structural guarantee (a key column, a tenant column, a
  lifecycle or audit anchor) that cannot be dropped without breaking something named in the row.
- **REFACTOR** — reached and load-bearing, but carrying a named defect class. It is never a
  deletion instruction.
- **REMOVE** — a *candidate*, measured at zero reach across the whole corpus. It is not an
  instruction either: PRD-C058 requires the ts-morph row-type pass before any drop, because a token
  census cannot see a column reached only through `select *` or a row spread.

## How reachability was measured, and where it is blind

Two corpora, both excluding `src/db/schema/**` (a declaration is not a read):

- **identifier census** — every identifier on every non-comment line of 5,445 backend files
  (735,865 lines), 5,166 frontend files (1,631,601 lines) and `openapi.json`, indexed to the
  `file:line` of its first sighting. Used for column and environment-variable names.
- **literal census** — every quoted string literal in the same corpus. Used for colon- and
  dot-joined keys. The identifier census cannot see them: it splits `"hr:bank-details:view"` into
  four unrelated tokens and reports the key as reached because the word `view` occurs somewhere.

Four traps, each of which produced a wrong answer here before it was handled:

1. **Migrations are not a read.** Every column name appears in the `CREATE TABLE` that made it.
   Counting `migrations/**` as a sighting made every column reachable and the census reported 2
   unused columns out of 12,267. They are excluded; PRD-C058's separate migration/export/analytics
   proof is not satisfied by this census and is not claimed to be.
2. **The inventory's own tooling is not a reader.** Its rule text names the columns it classifies,
   `feature_flags.rollout_percentage` among them. Until `src/scripts/key-inventory/**` was excluded
   the census laundered this document's prose into evidence and marked that column KEEP.
3. **Generated keys have no literal.** `<module>:access:view` and `<module>:access:manage` are
   synthesised per access-managed module and consumed through a template. A literal search reports
   all 20 as dead. They are marked KEEP with that reason.
4. **`name:` is the key, `resource:` is not.** Matching every quoted `a:b` in the permission
   catalog folder yields 984 keys where the catalog holds 704.

Known blind spots, stated rather than papered over: a column reached only through `select *` or a
row spread is invisible to a token census; a permission key assembled at runtime from fragments is
invisible to a literal census; and reach is measured at the repository, so an external consumer of
a published operation is out of its sight. Each is why REMOVE is a candidate and not an instruction.

## The largest populations, and what they mean

- **3,622 of 3,648 routes are REFACTOR** — the operation declares no 2xx JSON response schema, so
  removing a response field is invisible to `check:contract-breaking-change`. This is PRD-C063's
  blocker and belongs to ticket 04.
- **1,915 columns are REFACTOR** — almost all are `timestamp without time zone`. Structural ones
  (`created_at`, `deleted_at`) are a type migration to `timestamptz`, never a drop.
- **1,366 of 3,090 foreign keys are REFACTOR** — the child columns lead no index, so a parent
  delete seq-scans the child while holding a row lock. Measured at head on `inv_stock_transactions`
  (166,800 rows): Seq Scan, `Buffers: shared read=3404`, 71.760 ms for one `FOR KEY SHARE` probe.
- **852 indexes are REFACTOR** — live in the catalog and declared nowhere in `src/db/schema`.
- **340 columns and 17 JSONB columns are REMOVE candidates** — zero sightings in either census.
- **8 of 10 JSONB keys read with `->>` in SQL are REFACTOR** — filtered or joined with no expression
  index. The tenth, `metadata->>'liveSessionId'`, moved to KEEP in this pass: migration 1065 indexes
  it and `SurveyLiveParticipantService` now scopes and aggregates the reads that use it.
- **9 permission keys are REMOVE candidates** — bound to no route and reached by no literal.
  `hr:bank-details:view` is the one to decide first: it advertises authority over unmasked bank
  details and gates nothing.
- **115 events across three catalogs** — the notification catalogs, the OutboxWriter `events` and the
  outbound `webhooks` in `contracts/api-contract-registry.json`. An inventory built from the
  notification catalogs alone misses the last two populations entirely.
- **4 modules are REFACTOR** — permission keys whose second segment names a *different* plan-gated
  module, which `access-policy.ts` bills against the first segment. An org that buys Payroll
  without HR gets a 402 naming HR.

## PRD-C059 — the redundancy companion

`c059-redundancy-detection.json` is produced by `node src/scripts/check-redundant-objects.ts`
(via `ts-node --transpile-only`) with `REDUNDANT_OBJECTS_GATE_DATABASE_URL` set. It reads all four
inputs the criterion names:

1. **Schema declarations** — the Drizzle barrel, so every finding says whether the fix would be a
   schema edit or a migration against a live-only object.
2. **`pg_catalog`** — 5,394 indexes and 4,303 foreign-key/unique/check constraints at head.
3. **`EXPLAIN (ANALYZE, BUFFERS)`** — `--capture-plans` measures each overlapping pair on a seeded
   database (`scratch_perf_seed`, 166,800 `inv_stock_transactions` rows) by dropping the narrow
   member inside a transaction that rolls back, so the plan with and against it are measured on the
   same rows. 8 pairs on file in `src/scripts/redundant-objects/plan-evidence.json`. One of them:
   dropping `idx_chat_channel_members_org` doubles the estimated cost of its own probe, 10.74 to
   22.74.
4. **Workload/index statistics** — `pg_stat_user_indexes.idx_scan` and `pg_stat_user_tables.n_live_tup`,
   carried on every row. Provenance is stated honestly: these are bootstrap and probe counts from a
   local database, not production traffic.

**Result: 1,039 overlapping pairs, 0 redundant.** Every pair is preserved with a reason —
`tenant-anchored-fk-target` 531, `referenced-by-a-foreign-key` 302, `distinct-referential-action`
122, `implied-by-composite` 32, `backs-a-constraint` 20, `documented-access-pattern` 17,
`distinct-uniqueness-guarantee` 15.

Two things this measurement corrects:

- **The three "exact duplicate index pairs" are not duplicates.** `build.projects`,
  `crm_commission_assignments` and `crm_commission_plan_versions` each hold an ASC unique and a
  DESC-trailing plain index on the same columns. A comparison of `indkey` alone calls them
  identical; they differ in `indoption`, and "ordering" is the first thing PRD-C059's own sentence
  says to preserve. Comparing the key vector *with* its per-column options takes the exact-duplicate
  count from 3 to 0.
- **863 unique constraints are logically implied by a narrower one and every one is load-bearing.**
  `uniq_<t>_org_id` on `(org_id, id)` is implied by the primary key on `(id)`. It is also the
  reference target AR-02 requires for every tenant-owned composite foreign key, which
  `check:tenant-relationships` enforces. A minimiser that trusted the implication would drop 863
  constraints and break every composite foreign key that targets them.

**Statistics never justify a deletion here, and the gate proves it on every run.** No verdict branch
reads a scan count, and each run re-derives the whole report with the statistics replaced by
extremes and fails if a single verdict moved (`statisticsAreInert`).
