# 07 — Inventory and classify every schema object and code key registry

**What to build:** A complete classification pass over in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys, plus the executable registries for routes, permissions, modules, events, commands, query/cache keys, configuration, environment variables, feature flags and translations. Every entry is KEEP, REFACTOR or REMOVE with a named owner and the concrete failure it prevents. This ticket produces the verdicts; ticket 08 executes them.

**Blocked by:** None — can start immediately.

**Status:** COMPLETE — all six boxes closed. Verdicts in `../reports/07-key-inventory.md`; the `EXPLAIN (ANALYZE, BUFFERS)` half closed 2026-09-02 against `scratch_perf_seed`. Ticket 08 has already executed 354 of the index drops (`0999`/`1002`/`1003`); **§4.3 hands it six measured regressions to repair and a widened S18 (5 -> 172 pairs).**

**Follow-up 07b — the inventory's blind spot, measured and partly closed.** `reports/07b-declaration-drift.md`.
The classification above reads the Drizzle declarations plus `pg_catalog`, but it never asked whether the
two agree. They do not, in two ways this ticket did not count:
**150 live tenant tables carry no Drizzle declaration at all** (49 `notifications` partitions,
34 inventory, 18 CRM, the 31-table `gl_*`/`ap_*`/`ar_*`/`bank_*`/`tax_*` `drizzle-kit push` artefact
documented in `0591b`'s own header, and 18 others — 17 of which have zero references in `src/` or
`test/` under a scanner validated in both directions); and **5 declared columns have a live type that
makes their declared foreign key impossible** (`integer` columns declared `text` referencing
`organizations.id`/`users.id`, all in `src/db/schema/billing/billing.ts`, all from migration `0000`).
That last one is a live 22P02 on `ReferralService.createReferral`, reproduced before the fix.
**Which gate saw what** is recorded in 07b §1: `check:tenant-indexes --db` (988/988),
`check:tenant-relationships` and `db:verify-rls` are `pg_catalog`-driven and DID cover all 150;
`check:tenant-indexes` default (839/839) is declaration-driven and covered none of them;
`check:tenant-isolation` reads neither. **No gate detects a declared foreign key with no live
constraint**, which is why the five sat undetected.

**Follow-up 07b, resumed pass (session killed mid-migration by a watchdog; 1023-1026 were already
committed and the journal was consistent).** Two routed items closed out.
**Routed A — the `dashboard-personal-my-tasks` read-cost breach: measured, and the routing was
half wrong.** That budget does not breach `maxScanRows` at head; it is *vacuous* (its predicate is
the application's `'TODO','IN_PROGRESS','IN_REVIEW'`, the seed writes `'Todo','In Progress'`), and
the 1,801 rows belong to `dashboard-my-issues`, which declares no `maxScanRows`. The plan defect
is real and shared by both, and the shape proposed —
`(org_id, assignee_membership_id, status, updated_at DESC)` — was measured and is **identical to
head on all four tenants**: a `status` key between the equality columns and the sort column makes
the ordering unusable, so the majority tenant declines it and keeps walking
`idx_tickets_org_updated_live`. Dropping `status` is the fix. Migration `1027` adds
`idx_tickets_org_assignee_updated_live (org_id, assignee_membership_id, updated_at DESC) WHERE
deleted_at IS NULL`: `dashboard-my-issues` **261 → 22** buffers at 89.93%, 40 → 19, 175 → 75,
61 → 60, and the same query with the status filter 252 → 13, 34 → 13, 31 → 15, 10 → 10; rows
scanned on `build.tickets` at the majority tenant **1,801 → 10**. Chosen on every tenant, never
worse than head on any, 440 kB against a 3,584 kB heap. Measured as `streamline_app` with the
tenant GUC set, in buffers, on `scratch_t07c`. Details in `reports/07b-declaration-drift.md` §9.
    PARTIAL: `dashboard-personal-my-tasks` stays VACUOUS after the index — the seed writes
    title-case ticket statuses. `read-cost-budgets.mjs:1094` says the seed is the side that
    deviates and the predicate must not be retuned to it, so the fix is in `src/scripts/`, which
    is not this territory. Its `maxScanRows: 1_000`, `forbid-seq-scan` assertion and 2,000-buffer
    ceiling are unenforced at every tenant until then.
**Routed B — the payroll TDS ledger: FK half done, key half deliberately not taken.** `1026`
already gave `payroll_tds_ytd_ledger.run_id` its composite FK. The natural-key widening is NOT
taken and is handed on in full in `reports/07b-declaration-drift.md` §11.
    BLOCKED: needs one owner holding both halves, and a payroll product decision first. The
    destructive case is already refused at the data layer by `1030`'s
    `trg_guard_paid_payroll_tds_ytd_row` (23514) once the earlier run is PAID/PUBLISHED/CLOSED;
    the residual window is a LOCKED-not-yet-PAID run. Adding `run_id` to the two *partial* unique
    indexes is insufficient as routed because `run_id` is nullable — it needs `NOT NULL` plus a
    backfill — and **nothing in `src/` or `test/` reads this table**, so no read path decides
    whether "accumulate" means summing per-run rows or incrementing one. `1030`'s own header
    reports the follow-up to ticket 24.

- [x] Every inventoried entry carries a verdict, an owner and a stated failure prevented. "May be useful later" is not a KEEP justification.
      Evidence: `reports/07-key-inventory.md` §2 — 70 verdict rows (24 schema S01-S24 + 46 registry P01-P46), each with owner + failure; 29 KEEP / 37 REFACTOR / 11 REMOVE. `grep -c '^| S[0-9]'` = 24, `grep -c '^| P[0-9]'` = 46.
- [x] Redundant or overlapping foreign keys, unique constraints, checks and indexes are detected from schema declarations, `pg_catalog` and representative `EXPLAIN (ANALYZE, BUFFERS)` plans — statistics alone never justify deletion.
      Declarations + `pg_catalog` half (done earlier): 895 Drizzle tables parsed (both `pgTable(` and `pgSchema().table()` forms) and 5,067 live indexes / 12,903 constraints read from `scratch_boot_c`. Detected: 47 exact-duplicate indexes, 299 prefix-redundant indexes, 5 overlapping FK pairs, 0 duplicate unique constraints, 0 subsumed checks. Full executable lists in `reports/07-key-inventory.md` §3.
      `EXPLAIN (ANALYZE, BUFFERS)` half (2026-09-02, on `scratch_perf_seed` — head, 1,699 MB, 88 non-empty tables, four tenants at 89.93/9.0/0.90/0.18%): `OWNER_DATABASE_URL=…scratch_perf_seed node test/perf/measure-index-redundancy.mjs` → exit 2, **354 candidates · 319 NO_QUERY · 22 CHOSEN_NO_GAIN · 7 CONFIRMED_REDUNDANT · 6 REGRESSION**. Every candidate is probed on **all four tenants**, as `streamline_app` (`rolbypassrls = false`, no-GUC read denied), in a rolled-back transaction with the dropped index recreated inside it, so the only difference between the two measurements is the index. `--self-test` 13/13. Raw plans and buffer counts: `reports/07-index-redundancy/index-redundancy.{json,txt}`; analysis `reports/07-key-inventory.md` §4.
      Statistics did not justify anything: the 319 NO_QUERY rows are stated as still structural-only, and the six REGRESSION rows are the case where structural containment was *insufficient* — a narrow `(org_id)` index dropped for a wider one it prefixes costs 6.5x-21.5x buffers on the 89.9% tenant (`contacts` 645 -> 30, a full Seq Scan) while being free on every minority tenant. Routed to ticket 08 as a REFACTOR, not a revert.
      FK/unique/check overlap cannot appear in a read plan, so it was measured on the write path instead (§4.4): S18 re-derived at head is **172 pairs, not 5**, and a 1,000-row insert into `inv_stock_transactions` fires **2,000 redundant FK trigger invocations** that disappear when the two narrow members are dropped. Call counts are reported, not wall clock — three paired runs gave 75.97->27.26, 53.36->29.26 and 33.21->33.52 ms.
- [x] Nothing required for tenant isolation, referential integrity, concurrency, ordering or a documented access pattern is proposed for removal.
      Evidence: §8 lists the protected set — 554 `unique(org_id,id)` tenant anchors, 883 RLS policies, all 2,418 FKs, 23 SQL-managed + 21 guard-only tables, 49 `notifications` partitions, 6 published webhook event names, the documented `social_profiles->>'twitter'` access path. Two selection rules were added to the index remover after it first proposed dropping a `UNIQUE` in favour of a non-unique index: never drop a constraint-backing index, never drop a UNIQUE unless an equally-UNIQUE twin remains. Post-fix check `any UNIQUE proposed for drop with a non-unique keeper` = 0.
- [x] Frequently filtered, joined, authorized or constrained JSONB properties are marked for normalization or indexing rather than retained as opaque payload.
      Evidence: §5. 457 live JSONB columns, only 2 jsonb-aware indexes in the whole database. 5 filtered-but-unindexed paths marked: `survey_response_sessions.metadata->>'liveSessionId'` and both `org_units.metadata->>'address'`/`'email'` marked NORMALIZE, `support_ai_suggestions.payload->>'escalated'` marked INDEX; `business_parties.social_profiles->>'twitter'` kept as a documented access path. Plus 229/402 declared JSONB columns carry no `$type<>` (row S22).
- [x] Empty tables are not treated as dead: a table with zero rows is usually an unseeded feature. Verify against live service references before classifying.
      Evidence: row counts were used for nothing — 1,021 of 1,026 tables are empty and none was classified on that basis. Classification is by reader presence only. The 49 `notifications` partition children (never named in code) and the 23 `hrms-phase1-sql-managed` tables are KEEP. A guard-script corpus was split out of business code after `check-hr-table-freeze.mjs` was found masking 21 tables as "referenced"; they remain KEEP for the documented reason. The one table where empty and dead genuinely coincide (`feature_flags`, P43) is proven by zero readers, not zero rows.
- [x] A reference scan that reports everything unreferenced is a broken scan, not a finding — validate the scanner against a known-referenced table before trusting its output.
      Evidence: §0. Validated against `inv_stock_levels`/`invStockLevels`, confirmed independently by grep BEFORE the scanner was written (249 lines across 12+ named services + 18 raw-SQL refs); scanner reported `symRuntime=261, symRuntimeFiles=23, nameRuntime=18`, consistent. Scan classifies 870/895 tables as referenced, not everything-dead. Validation caught two real scanner bugs: a `pgTable(`-only pattern silently omitted 83 `build.table(...)` tables (the whole Build module, incl. `bugs`), and a column splitter dropped 200 comment-prefixed columns, fabricating a false "2 tables have no primary key" finding (both in fact have `.primaryKey()`; post-fix count is 0).
