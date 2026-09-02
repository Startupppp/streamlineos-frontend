# 20 — Prove explicit projections, correct indexes and no required full scans

**What to build:** Every read uses a named-column projection served by a tenant-leading index with no required full tenant or table scan and no avoidable sort. The named heavy queries — reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard — are exercised against seeded data rather than reasoned about.

**Blocked by:** 03 — plans taken against an empty or partially bootstrapped database measure nothing.

**Status:** measured; one box open by design

Report: `reports/20-query-plans.md`. Raw plan trees: `reports/20-query-plans/plans-{large,mid,small}.{json,txt}`.
Harness: `BE/test/perf/{heavy-query-fixtures,seed-heavy-query-load,heavy-query-catalog,heavy-query-catalog-{calendar,notifications,search,dashboard},heavy-query-plan-analysis,measure-heavy-query-plans}.mjs`.

- [ ] Every list, count and existence path selects named columns and returns a minimal projection; no full ORM row, global user record or large JSON/blob/vector field is hydrated for these paths.
  - Audited in full: 1,315 `db.query.*.find{Many,First}` sites and 500 bare `.select()` sites across the 33 in-scope module directories, resolved against a relation map built from all 610 `relations()` blocks, then every hit opened and read.
  - Zero findings in three categories: no vector/embedding column on any list path; no bare `.select()` touching global `users`; no `user: true`/`creator: true`/`approver: true`/`assignee: true` anywhere in scope.
  - Fixed 4 files. `build/core/projects-tickets-detail.service.ts` — an unprojected global `users` relation that was also **throwing on every ticket-detail call** (`users` has no `user` relation; Drizzle raises `Cannot read properties of undefined (reading 'referencedTable')` at query-build time). Proved by building and executing the query against `scratch_boot_d`: before `FAIL … referencedTable`, after `BUILD OK … EXECUTED OK rows: 1`. `notifications/notification-providers.service.ts` — the list read `config_encrypted` for 100 rows; `hasCredentials` is now derived in SQL. `finance/controls/audit-surface.service.ts` (3 × `select *`) and `hr/config/hr-email-templates.service.ts` (1 ×) — named projections.
  - BLOCKED: **242** `findMany` with no top-level `columns:` (93 on a jsonb/tsvector table) and **216** non-single-row bare `.select()` (124 on a jsonb/blob table) remain, itemised in the report. Several are load-bearing (`hr_form_submissions.formSchemaSnapshot` is what `maskSensitiveData` reads; the audit and event-stream jsonb columns are the diff the UI renders), so narrowing them is an API-contract change I will not make from a row count. Also measured: `dashboard-recent-activity` full-row and 8-field projections both cost **417 buffers / 19,587 rows read** — identical, because the columns share heap pages. `EXPLAIN (BUFFERS)` cannot ratchet a projection; that needs a bytes-returned instrument.
- [x] The named heavy queries run against a production-shaped seed with plans captured.
  - `node test/perf/measure-heavy-query-plans.mjs --org={large,mid,small}` → **36 queries × 3 tenant sizes**, all eight named categories covered. Seed: 3 orgs, 66,613 calendar events (9,507 recurring), 140,360 event attendees, 266,400 notifications, 13,320 kb chunks, 18,500 `build.tickets`.
- [x] Plans are taken as the application role with tenant context set, never as the database owner, so real authorization predicates are included.
  - The runner exits 1 unless `rolbypassrls = false` and `rolsuper = false`, and proves RLS is live before every session by checking that `SELECT count(*) FROM calendar_events` with no GUC raises `42501`. Printed on each run: `role streamline_app · bypassrls=false · no-GUC read denied 42501 · database scratch_boot_d`.
- [x] Seed first, then measure. A baseline taken on an empty database is not a baseline.
  - `scratch_boot_d` held **0 organizations** at session start. `seed-scratch-e2e.mjs` then `test/perf/seed-heavy-query-load.mjs` → the table above, in 468s. Both report every failed section and exit non-zero (two of my own SQL bugs were caught that way).
- [x] Run `VACUUM ANALYZE` after any table rewrite before trusting a count or a plan.
  - In `seed-heavy-query-load.mjs`, over all ten touched tables, before any count or plan is read: `[468.1s] VACUUM ANALYZE complete.`
- [x] Row-level security defeats GIN and trigram indexes and post-filters ANN search; where that changes the plan, it is recorded as a constraint rather than treated as a defect.
  - Trigram, 18,500 `build.tickets`, 18 matching rows: owner (`BYPASSRLS`) → Bitmap Index Scan on `idx_tickets_title_trgm`, **106 buffers, 18 rows read**; `streamline_app` + GUC → **Seq Scan, 393 buffers, 18,500 rows read** (18,482 removed by filter); via `app.search_ticket_ids` → **72 buffers, 18 rows read**. `~~*` is not `LEAKPROOF`.
  - ANN, same k=20 query, three tenant shares: large (90%) chooses `idx_kb_chunks_embedding_hnsw` and reads 20–23 rows; mid (9%) declines it and reads all **1,200** org chunks; small (0.9%) declines it and reads all **120**. The HNSW index carries no `org_id`, so it orders the whole table and RLS filters afterwards. Recorded as a property of single-index ANN under tenant RLS.
  - Recorded as a third constraint: `notifications` is partitioned on `created_at` and no read filters on it, so every plan is an `Append` over **48 partitions** and the floor grows one partition per month.
- [x] An `OR` with a semi-join, and a partial index facing an `OR` with an outside branch, are both measured rather than assumed — the rewrite is not always faster, and buffer counts decide it.
  - `EXISTS(role_assignments)` broadcast fan-out vs the "drive from the selective side" rewrite: **302 vs 302** buffers on large (identical plans — the planner already does the transform), **38 vs 47** on mid, **5 vs 14** on small. Rewrite rejected.
  - READ-section `(is_read = true OR id <= watermark)` against the partial `idx_notifications_unread_count` vs a `UNION ALL` of two indexed branches: **563 vs 594** (large), **513 vs 543** (mid), **128 vs 152** (small). Rewrite rejected.

## Defects found, not fixed (owners outside this ticket)

- **P1** `unified-inbox.service.ts:232,379` key notifications on `user_id`, which no index covers: **10,240 buffers / 23,401 rows read** for a count the membership-keyed equivalent answers in **39 buffers / 451 rows**, same result. Re-keying needs a `membership_id` backfill + `NOT NULL` first or it silently drops rows. This is also why `db:check-read-budgets` breaches `dashboard-personal-notifications-count` at 11,042 blocks against a 3,000 ceiling.
- **P1** `app.search_kb_chunk_ids` uses `AS MATERIALIZED`, so the HNSW index is unreachable: **36,882 buffers** on the large org vs **1,379** for the same body without the CTE. ~3.0 buffers per chunk, linear, at all three sizes. Dropping the CTE is a strict improvement (migration territory).
- **P1** `calendar-reminder-sweep.service.ts:61` caps recurring candidates at `LIMIT 200` with **no `ORDER BY`** over a predicate that admits the org's whole history — 8,369 of the large org's 8,569 recurring events are never considered, nondeterministically.
- **P1** `calendar-conflict.service.ts:56` accumulates every keyset page with no overall cap: **8,653 rows** for one 7-day free/busy check on the large org.
- **P2** Indexes specified in the report for tickets 08/05b: a partial `(org_id, start_date) WHERE rrule IS NOT NULL` on `calendar_events`, a covering `(org_id, start_date) INCLUDE (end_date, rrule, recurrence_end)`, and `(org_id, updated_at DESC, id) WHERE deleted_at IS NULL` on `build.tickets` (today's dashboard tile seq-scans 19,587 rows to return 10).
- **P2** `db:check-read-budgets`'s `forbid-seq-scan` assertion fires on 60- and 90-row tables where a seq scan is correct. Four of its five dashboard failures are vacuous; it needs a minimum-rows guard.
- **P2** `seed-scratch-e2e.mjs` prints "All sections completed without errors" while emitting 18 `WARN payroll_line_item … violates not-null` — some `warn()` calls never reach the `errors` array, and `payroll_line_items` is left at 0 rows.

## Environment note

`scratch_boot_d` was cold-rebuilt by a concurrent agent after these measurements were captured (637 → 645 ledger rows, every seeded table back to 0, `streamline_app` grants dropped). The plans are checked in; re-running them needs a re-seed on a clean target, and the report gives the exact command sequence.
