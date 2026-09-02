# S5 / ticket 20 — projections, indexes and plans for the named heavy reads

Target: `scratch_boot_d`, at head (637/637 ledger rows, 1027 tables). It held **zero organizations**
when I started, so seeding was the first thing I did, not the last. Every plan below was taken as
`streamline_app` (`rolbypassrls = false`, `rolsuper = false`) with `app.organization_id` set LOCAL,
inside a transaction that was rolled back. The runner refuses to start otherwise, and proves RLS is
live before it trusts a number by checking that `SELECT count(*) FROM calendar_events` with **no**
GUC raises `42501`. `.env` was never edited, the configured remote was never touched, and no git
command was run.

## The seed

`src/scripts/seed-scratch-e2e.mjs` first (it owns the organizations, users and memberships), then
`test/perf/seed-heavy-query-load.mjs`, which is new and mine. Three organizations of deliberately
different sizes, because a majority tenant makes RLS-post-filtered ANN look faster than it is for
everybody else:

| org | members | calendar_events | recurring | attendees | exceptions | notifications | unread | kb chunks |
|---|---|---|---|---|---|---|---|---|
| large | 500 | 60,000 | 8,569 | 125,976 | 7,500 | 240,000 | 22,605 | 12,000 (90%) |
| mid | 60 | 6,006 | 855 | 13,056 | 752 | 24,000 | 2,251 | 1,200 (9%) |
| small | 8 | 607 | 83 | 1,328 | 76 | 2,400 | 226 | **120 (0.9%)** |

Plus 18,500 `build.tickets` from the base seed. `VACUUM ANALYZE` runs over all ten touched tables
at the end of the seeder, before any count or plan is read.

Reproduce:

    # from BE, owner role
    SCRATCH_DATABASE_URL="…/scratch_boot_d?sslmode=disable" node src/scripts/seed-scratch-e2e.mjs
    SCRATCH_DATABASE_URL="…/scratch_boot_d?sslmode=disable" node test/perf/seed-heavy-query-load.mjs
    # then, as streamline_app
    PERF_APP_DATABASE_URL="postgresql://streamline_app@127.0.0.1:5432/scratch_boot_d?sslmode=disable" \
      node test/perf/measure-heavy-query-plans.mjs --org=large --out=<dir>

`--self-test` on both scripts passes (6 and 12 assertions); the plan-tree arithmetic is unit-tested
without a database, including that a nested-loop inner side is multiplied back out by its loop count.

## Headline — five findings the empty database could not have shown

**1. `GET` ticket-detail was throwing on every call. P0, fixed.**
`projects-tickets-detail.service.ts` asked Drizzle for `assignee: { with: { user: { with: { user: …` and
`comments: { with: { user: { with: { user: …`. `tickets.assignee` → `organization_members`, `.user` →
global `users`, and `usersRelations` declares only `organizations` and `accounts` — there is no
`users.user`. Built against the real schema barrel both forms raise
`TypeError: Cannot read properties of undefined (reading 'referencedTable')` at query-build time, so
`getTicket` and `getTicketByKey` could never return. Two call sites each, four expressions.
The two specs covering this file **pass either way** — they mock `db`, so they never resolve a
relation; CLAUDE.md §8's "mocked tests are not proof" is exactly this. Proof is a build+execute
against `scratch_boot_d`: before → `FAIL … referencedTable`, after → `BUILD OK … EXECUTED OK rows: 1`,
and the emitted SQL contains no `users.*` and no password column. The fix is also the projection fix:
the middle relation now carries `columns: USER_COLS`, so the global users row stops being hydrated.

**2. The unified inbox reads notifications on a column with no index. P1, measured, not fixed.**
`unified-inbox.service.ts:379` and `:232` key on `notifications.user_id`; every index on that table
leads `(org_id, membership_id, …)`. Same question, same answer (451), two keys, large org:

| query | buffers | rows read → returned | dominant node |
|---|---|---|---|
| `unified-inbox-unread-count-by-user` (as shipped) | **10,240** | 23,401 → 1 | Bitmap Heap Scan on `notifications_y2026_m07`, 936 excl. |
| `membership-unread-count-equivalent` | **39** | 451 → 1 | Index Only Scan via `…_org_id_membership_id_id_idx1` |

**263×.** The list form is the same defect: `unified-inbox-list-by-user` reads **42,602 rows to return
20**, 2,066 buffers, resolved by a merge-append over the partition primary keys.
I did **not** switch the key. `notifications.membership_id` is nullable, so re-keying silently drops
every row that has not been backfilled — that needs a backfill + `NOT NULL` migration first, which is
ticket 08's territory. Recorded as a prerequisite, not applied.

**3. `app.search_kb_chunk_ids` cannot use the HNSW index at all. P1, measured, migration needed.**
The function body is `WITH org_chunks AS MATERIALIZED (SELECT c.id, c.embedding FROM kb_article_chunks
WHERE c.org_id = app.current_org_id()) SELECT id FROM org_chunks ORDER BY embedding <=> p_vec LIMIT n`.
`AS MATERIALIZED` forbids pushing the ordering into `idx_kb_chunks_embedding_hnsw`, so every call
materialises the org's entire corpus of 1536-dimension vectors and sorts it.

| ANN path (as `streamline_app`, GUC set) | large (12k chunks) | mid (1.2k) | small (120) |
|---|---|---|---|
| `app.search_kb_chunk_ids` (as shipped) | **36,882 buf** | 4,043 | 758 |
| same body without the CTE | **1,379 buf** | 3,653 | 368 |

~3.0 buffers per chunk in the org, at every size — linear, with no index. An org with 500k chunks
would move roughly 1.5M buffers per search. Removing `AS MATERIALIZED` is a **strict** improvement:
27× on the majority tenant and no worse on either smaller one, because where the planner declines
HNSW it falls back to exactly the scan the CTE forces today. Exact change:

    -- app.search_kb_chunk_ids(p_vec vector, p_limit integer)
    SELECT c.id FROM public.kb_article_chunks c
    WHERE c.org_id = app.current_org_id()
    ORDER BY c.embedding <=> p_vec
    LIMIT p_limit

**4. The recurring reminder sweep silently drops 97% of its work. P1, not fixed.**
`calendar-reminder-sweep.service.ts:61` selects recurring events with `start_date <= dueBy`, which
admits the org's entire history, then `LIMIT 200` — **with no `ORDER BY`**. The large org holds 8,569
recurring events, so 8,369 of them are never considered for a reminder, and *which* 200 survive is
whatever the plan happens to emit. The plan is a `Seq Scan`, 1,504 rows read for 200 returned, 1,304
removed by filter, 40 buffers. Cheap today, wrong today, and it grows O(organisation).
This is the "never solve growing work with silent truncation" rule: it needs a keyset drain over
`(org_id, id)`, not a bare cap.

**5. The free/busy conflict scan pulls the whole matching set into Node memory. P1, not fixed.**
`calendar-conflict.service.ts:56` runs a keyset loop whose comment says "the keyset loop consumes
every batch" — and it does, with no overall cap. For a 7-day window in the large org the predicate
matches **8,653 rows** (measured, not estimated), so ~87 pages at 712 buffers each land in one array
before `expandToOccurrences` runs over them. First page: 712 buffers, 701 rows read, 100 returned,
`Incremental Sort` over `idx_calendar_events_org_date` (the index gives `start_date` but not the
`(start_date, id)` tiebreak). The uncapped count of the same predicate seq-scans the table: 1,730
buffers, **66,613 rows read to return one number**.

## Every measured query, three tenant sizes

`buffers / rows-read → rows-returned`, cold run, as the app role with the tenant GUC.

| id | large | mid | small |
|---|---|---|---|
| reminder-nonrecurring-due | 3 / 0→0 | 3 / 0→0 | 4 / 1→1 |
| reminder-recurring-candidates | 40 / 1504→200 | 47 / 1414→200 | 19 / 607→83 |
| reminder-exception-window | 23 / 800→0 | 725 / 752→0 | 38 / 76→0 |
| reminder-attendee-fanout-page | 24 / 900→400 | — | 29 / 16→8 |
| export-calendar-range | **3,882 / 3942→500** | 3,895 / 3843→500 | 44 / 687→118 |
| fanout-all-members-page | 10 / 500→500 | 3 / 60→60 | 3 / 8→8 |
| fanout-roles-exists | 302 / 213→100 | 38 / 125→12 | 5 / 114→1 |
| fanout-roles-semijoin-rewrite | 302 / 213→100 | 47 / 24→12 | 14 / 6→1 |
| unread-count | 39 / 447→1 | 37 / 380→1 | 36 / 57→1 |
| unread-section-page | 129 / 31→20 | 412 / 380→20 | 77 / 57→20 |
| read-section-page-or-watermark | 563 / 452→4 | 513 / 400→3 | 128 / 287→20 |
| read-section-page-union-rewrite | 594 / 456→4 | 543 / 403→3 | 152 / 287→20 |
| unified-inbox-unread-count-by-user | **10,240 / 23401→1** | 2,242 / 2313→1 | 226 / 226→1 |
| membership-unread-count-equivalent | 39 / 451→1 | 37 / 383→1 | 36 / 57→1 |
| unified-inbox-list-by-user | **2,066 / 42602→20** | 216 / 1771→20 | 129 / 210→20 |
| notification-list-search-ilike | 561 / 450→20 | 407 / 383→18 | 128 / 287→13 |
| freebusy-conflict-first-page | 712 / 701→100 | 713 / 698→100 | 43 / 606→100 |
| freebusy-conflict-total-rows | **1,730 / 66613→1** | 165 / 6006→1 | 19 / 607→1 |
| freebusy-ooo-leave | 5 / 70→1 | 5 / 61→0 | 5 / 61→0 |
| recurrence-exceptions-uncapped | 23 / 800→800 | 725 / 752→752 | 38 / 76→76 |
| recurrence-series-page | **3,507 / 3495→500** | 165 / 6006→500 | 37 / 607→83 |
| vector-ann-security-definer | **36,882 / 20→20** | 4,043 / 20→20 | 758 / 20→20 |
| vector-ann-direct-under-rls | 1,385 / 20→20 | 3,653 / 1200→20 | 368 / 120→20 |
| vector-ann-org-filtered-direct | 1,379 / 20→20 | 3,653 / 1200→20 | 368 / 120→20 |
| search-ticket-trigram-sdf | 72 / 18→18 | 23 / 0→0 | 23 / 0→0 |
| search-ticket-ilike-under-rls | **393 / 18500→18** | 3 / 0→0 | 3 / 0→0 |
| search-trigram-security-definer (kb pages) | 67 / 1→1 | 68 / 1→1 | 68 / 1→1 |
| search-kbpage-fts-under-rls | 24 / 600→1 | 5 / 60→1 | 3 / 30→1 |
| search-ilike-under-rls | 27 / 600→1 | 8 / 60→1 | 6 / 30→1 |
| dashboard-unread-notifications | 39 / 451→1 | 37 / 383→1 | 36 / 57→1 |
| dashboard-upcoming-events | 6 / 3→3 | 6 / 3→3 | 4 / 1→1 |
| dashboard-recent-activity-fullrow | 417 / 19587→10 | — | — |
| dashboard-recent-activity-projected | 417 / 19587→10 | — | — |
| dashboard-announcements | 9 / 2→1 | 6 / 1→0 | 6 / 1→0 |
| dashboard-recent-notifications | 125 / 16→5 | 125 / 16→5 | 123 / 17→5 |
| dashboard-member-headcount | 10 / 500→1 | 3 / 60→1 | 3 / 8→1 |

Dashes are `SKIP` — the org has no `build.projects` rows, so the query would have measured nothing.
The runner skips rather than reporting a vacuous zero.

## Constraints, recorded rather than treated as defects

**RLS defeats the trigram GIN index.** `build.tickets` carries `idx_tickets_title_trgm`. The same
predicate, same 18 matching rows, on 18,500 tickets:

| who | plan | buffers | rows read |
|---|---|---|---|
| owner (`BYPASSRLS`) | Bitmap Index Scan on `idx_tickets_title_trgm` | **106** | 18 |
| `streamline_app` + GUC, direct | **Seq Scan on tickets** | 393 | **18,500** (18,482 filtered) |
| `streamline_app` + GUC, via `app.search_ticket_ids` | Function Scan | 72 | 18 |

`~~*` is not `LEAKPROOF`, so the user qual may not run before the RLS qual and the index is refused.
The seq-scan side is O(table) and the definer side is O(matches), so the gap widens with the table —
CLAUDE.md's 203k-row figure (12,036 buffers) is the same curve. The `SECURITY DEFINER` escape works
and is measurably the right call here.

**RLS post-filters ANN, and the effect is a function of tenant share.** Same query, same k=20,
three tenants:

- large (90% of the corpus): HNSW **is** chosen — `Index Scan using idx_kb_chunks_embedding_hnsw`, 20–23 rows read for 20 returned.
- mid (9%): HNSW is **not** chosen — Bitmap Heap Scan, **1,200 rows read** (the org's whole corpus) for 20.
- small (0.9%): HNSW is **not** chosen — Index Scan on `idx_kb_chunks_org_source`, **120 rows read** for 20.

`idx_kb_chunks_embedding_hnsw` is `hnsw (embedding vector_cosine_ops)` with **no `org_id`**, so the
index orders the whole table and RLS filters afterwards. For a minority tenant the planner correctly
declines it and scans the org instead — which is the right choice at 120 rows and the wrong shape at
120,000. This is a property of single-index ANN under tenant RLS, not a bug in a query; the durable
answers are a per-tenant partitioned corpus or deliberate over-fetch with `hnsw.ef_search`.

**`notifications` is partitioned by `created_at` and no read filters on it.** Every notification read
keys `(org_id, membership_id, id)`, so partition pruning never applies and the plan is an `Append`
over **48 partitions** — `unread-count` spends 39 buffers to count 451 rows, and the floor grows by
one partition per month forever. Partitioning was chosen for a retention/archival property and the
read shape does not pay for it; that is a trade-off to record, not a query to fix.

## The two shapes the ticket asked me to measure rather than assume

**An `OR` with a semi-join.** `broadcasts-audience.queries.ts:63` filters members with
`EXISTS (role_assignments …)`. Large org: `fanout-roles-exists` **302 buffers**, the hand-written
"drive from the selective side" rewrite **302 buffers** — byte-for-byte identical plans, because the
planner already transforms the `EXISTS` into a semi-join. Mid: 38 vs 47, small: 5 vs 14 — the rewrite
is *worse* at both smaller sizes. **Leave it alone.**

**A partial index facing an `OR` with an outside branch.** The READ section is
`(is_read = true OR id <= watermark)` against `idx_notifications_unread_count`, which is partial on
`is_read = false`. The `UNION ALL`-of-two-indexed-branches rewrite loses at all three sizes:
563 vs 594 (large), 513 vs 543 (mid), 128 vs 152 (small). The union pays for two full index descents
per partition and the extra sort; the `OR` does not. **Leave it alone.**

## Projections

I audited every list, count and existence path in the 33 in-scope module directories (excluding
`ai`, `gdpr`, `storage`, `kb/retrieval`, `rbac`, `auth`, `organization`, `settings`) by parsing all
1,315 `db.query.*.find{Many,First}` call sites and all 500 bare `.select()` sites against a relation
map built from the 610 `relations()` blocks, then opening every hit.

**Clean, with zero findings:** no vector/embedding column is hydrated on any list path (all three
vector tables are reached only through explicit similarity projections); no bare `.select()` reads
global `users` directly or through a join; and `user: true` / `creator: true` / `approver: true` /
`assignee: true` appear **nowhere** in scope.

**Fixed (4 files):**

- `build/core/projects-tickets-detail.service.ts` — the P0 above; 4 expressions, 2 call sites.
- `notifications/notification-providers.service.ts:38` — the list read `config_encrypted`, the
  provider-credential ciphertext, for 100 rows and stripped it in JS afterwards. Now
  `columns: { configEncrypted: false }` with `hasCredentials` derived in SQL, so the ciphertext never
  crosses the database boundary.
- `finance/controls/audit-surface.service.ts:38,52,69` — three `.select()` with no argument on a
  cursor-paginated feed, a 100-row timeline and a 10,000-row CSV export. Named projection; the
  `rows as AuditRow[]` cast is gone with it.
- `hr/config/hr-email-templates.service.ts:36` — `.select()` → named columns.

**Not fixed, with the reason (this is why checkbox 1 stays open):**

- **242** `findMany` with no top-level `columns:` (93 on a table carrying a `jsonb`/`json`/`tsvector`
  column) and **216** non-single-row bare `.select()` (124 on a table with a jsonb/blob column).
  Confirmed by reading: `hr/core/hr-audit.service.ts:120` (`before`/`after` diffs), the two
  `hr/enterprise-ops/event-stream/event-stream.service.ts` reads (`payload`),
  `hr/forms/hr-forms-submissions.service.ts:201`, `hr/recruitment/recruitment-candidates.service.ts:97`
  (returns `notes`, `bgvNotes`, `aiScoreBreakdown`, `resumeUrl`, `gender` on a browse endpoint),
  `hr/automations/hr-webhooks.service.ts:148`, `notifications/notification-templates.service.ts:37`,
  `support/core/support-macros.service.ts:63`, `inventory/returns/customer-returns.service.ts:36`,
  six `findMany` in `hr/time/attendance-read.service.ts`, `surveys/survey-analytics.service.ts:48,56`,
  and `dashboard/dashboard-project.service.ts:46,66,87,215`.
- Several of these are load-bearing, not dead weight: `hr_form_submissions.formSchemaSnapshot` is what
  `maskSensitiveData` reads to decide which fields to redact, and the audit/event-stream `jsonb`
  columns are the diff the UI renders. Narrowing them changes an API contract, and I will not do that
  from a row count.
- **Buffers do not measure a projection.** `dashboard-recent-activity-fullrow` (38 ticket columns +
  a whole `organization_members` row) and the 8-field projection of the same rows both cost **417
  buffers and read 19,587 rows** — identical, because the columns live in the same heap pages. The
  projection cost is bytes on the wire and bytes in the Node heap, which is real but is not what
  `EXPLAIN (BUFFERS)` reports. Anyone ratcheting projections needs a different instrument.
- 70 existence-only `findFirst` with no `columns:` (28 on a table with a jsonb/tsvector column) —
  e.g. `kb/wiki/kb-page-duplicate.service.ts:28` hydrates `kb_pages.content` and the generated `fts`
  tsvector for an `if (!root)`.
- `crm/core/crm-sales-dashboard.service.ts:54` is the only surviving `<relation>: true` in scope. It
  targets `crm_people`, not global `users`, so it is not a §3 violation — but it is still an
  unprojected relation on a list.

## Indexes I need but did not create (tickets 08 / 05b own migrations)

Specified exactly, with the measurement that motivates each.

1. `CREATE INDEX idx_calendar_events_org_recurring_start ON calendar_events (org_id, start_date) WHERE rrule IS NOT NULL;`
   For `reminder-recurring-candidates` and `recurrence-series-page`. Today the recurring branch walks
   `(org_id, start_date)` over all 60,000 events: 3,507 buffers, 3,495 rows read, 2,995 discarded, to
   return 500. Only 8,569 rows are recurring.
2. `CREATE INDEX idx_calendar_events_org_start_cover ON calendar_events (org_id, start_date) INCLUDE (end_date, rrule, recurrence_end);`
   For `freebusy-conflict-total-rows`, which references only those columns and today seq-scans:
   1,730 buffers, 66,613 rows read for one number. With `org_id` in the key an index-only scan is
   reachable (CLAUDE.md §7 — a covering index on an RLS table must contain `org_id`).
3. `notifications` — **no new index.** The fix for finding 2 is to key the unified inbox on
   `membership_id`, which existing indexes already cover (39 buffers vs 10,240). That needs
   `membership_id` backfilled and `NOT NULL` first, or the re-key silently drops unbackfilled rows.
4. `build.tickets` — there is no `(org_id, updated_at)` index, so `dashboard-recent-activity` with
   200 project ids **seq-scans 19,587 rows to return 10** (417 buffers).
   `CREATE INDEX idx_tickets_org_updated_live ON build.tickets (org_id, updated_at DESC, id) WHERE deleted_at IS NULL;`
5. `announcements` — no index satisfies `ORDER BY is_pinned DESC, created_at DESC`; the plan sorts.
   Trivial at current volume (9 buffers), listed for completeness, not urgency.

## Migrations / function changes I need but did not make

- `app.search_kb_chunk_ids` — drop `AS MATERIALIZED` (finding 3). 27× on the majority tenant, no
  regression on either smaller one, both measured.
- `calendar_events` reminder sweep and free/busy scan — both are code changes in the calendar module
  (a keyset drain and an overall cap). They are behaviour changes with correctness consequences, not
  projection changes, so I have specified rather than applied them.

## Box by box

1. **Named columns / minimal projection on every list, count and existence path — NOT closed.**
   Audited in full, 4 files fixed including one P0 outage, exact inventory of what remains above.
2. **Named heavy queries against a production-shaped seed with plans captured — CLOSED.**
   36 queries × 3 tenant sizes; reminder, export, fanout, unread, free/busy, recurrence, search/vector
   and dashboard all covered. Plans in `plans-{large,mid,small}.{json,txt}`.
3. **Plans taken as the application role with tenant context — CLOSED.** Enforced by the runner, and
   the no-GUC `42501` check runs before every session.
4. **Seed first — CLOSED.** `scratch_boot_d` went from 0 organizations to the table above.
5. **`VACUUM ANALYZE` after any table rewrite — CLOSED.** In the seeder, over all ten touched tables,
   before any count or plan is read.
6. **RLS vs GIN/trigram/ANN recorded as a constraint — CLOSED.** Three measured cases above.
7. **`OR` + semi-join and partial-index-vs-`OR` measured, not assumed — CLOSED.** Both rewrites lose;
   both are staying.

## Also worth the orchestrator's attention

- **`pnpm db:check-read-budgets` breaches on a production-shaped seed.** Against `scratch_boot_d` as
  `streamline_app`, the 10 required dashboard budgets: 5 PASS / 5 FAIL.
  `dashboard-personal-notifications-count` is **11,042 blocks against a ceiling of 3,000**, scanning
  25,047 rows — it is the same `user_id`-keyed shape as finding 2, so the gate has been carrying that
  defect all along and only an empty database hid it.
  The other four failures are **vacuous, not real**: `forbid-seq-scan` fires on `attendance` (90 rows),
  `announcements` (1 row) and `leave_requests` (60 rows), where a seq scan is the correct plan. That
  assertion needs a minimum-rows guard before it means anything.
- **`seed-scratch-e2e.mjs` reports "All sections completed without errors" while printing warnings.**
  It emitted 18 `WARN payroll_line_item: null value in column "calc_explain" … violates not-null` and
  still claimed a clean run; `payroll_line_items` is 0 rows. Some `warn()` calls do not push into the
  `errors` array. My seeder records every failed section and exits non-zero, which is how I found two
  of my own bugs.
- `kb_pages` holds only 600 rows in the large org, so the tsvector comparison
  (`search-trigram-security-definer` vs `search-kbpage-fts-under-rls`) is measured below the scale
  where the definer earns its overhead. The 18,500-row `build.tickets` pair is the load-bearing one.
- On `scratch_boot_d` the `app.search_*` functions are owned by the local OS superuser that replayed
  the chain, not by `neondb_owner`. The mechanism is the same either way (the owner is BYPASSRLS or,
  in production, the table owner with `relforcerowsecurity = false`), but the ownership is an
  environment artifact and should not be read as production state.

## Files changed

- `BE/test/perf/heavy-query-fixtures.mjs` (new) — org profiles, scratch-target guard, scale helper.
- `BE/test/perf/seed-heavy-query-load.mjs` (new) — the load seeder; `--purge`, `--scale`, `--self-test`.
- `BE/test/perf/heavy-query-catalog.mjs` + `-calendar` / `-notifications` / `-search` / `-dashboard` (new) — 36 queries transcribed from the owning services, one file per domain behind a barrel.
- `BE/test/perf/heavy-query-plan-analysis.mjs` (new) — plan arithmetic + its own unit self-test.
- `BE/test/perf/measure-heavy-query-plans.mjs` (new) — the runner and its RLS-honesty guards.
- `BE/src/modules/build/core/projects-tickets-detail.service.ts` — P0 fix.
- `BE/src/modules/notifications/notification-providers.service.ts` — credential ciphertext off the list path.
- `BE/src/modules/finance/controls/audit-surface.service.ts` — three `select *` → named projection.
- `BE/src/modules/hr/config/hr-email-templates.service.ts` — `select *` → named projection.
- `FEROOT/.scratch/code-release-10-10/issues/20-query-projections-and-plans.md` — ticks and evidence.

One deviation from CLAUDE.md §7: `seed-heavy-query-load.mjs` is 550 lines, over the 500-line
hard-review threshold. Its twelve section functions are each single-purpose and separately named, and
I chose not to split them because the target database was rebuilt underneath me (see Handoff) and I
could not exercise a post-split run against real data. An unverified refactor of the exact script that
produced this evidence is a worse trade than the extra 50 lines. The query catalog **was** split, into
four per-domain files behind a barrel, and verified: 36 queries, 8 categories, no duplicate ids.

No migration, no `src/db/schema/**`, no `check-*.mjs`, no `.env`. Backend `tsc --noEmit`: exit 2,
**5 errors, none of them mine** — `common/tenant/__tests__/for-each-org-failure-sink.spec.ts` (TS2322)
and `modules/cron/__tests__/cron-retention-scheduler.spec.ts` / `cron-sweep-failure-sink.spec.ts`
(TS2556/TS7022/TS7024), all in another agent's sweep-failure lane.

## Handoff — and a collision the orchestrator should know about

**`scratch_boot_d` was rebuilt underneath me while I was working, by another agent.** My brief
assigned it to me ("at head and free"; `scratch_boot_a` was the one flagged as possibly taken). At
17:49 it held my seed. Minutes later it was back to **0 organizations, 0 users, 0 rows in every table
I had seeded, 645 ledger rows** (it was 637 when I started) and `streamline_app` had lost SELECT on
`organization_members` and `calendar_events` — a fresh cold bootstrap with no `db:bootstrap-role`
after it.

Nothing measured here is lost: every number in this report was captured before the rebuild and the
full plan trees are checked in beside it. But **the plans cannot be re-run today without re-seeding**,
and I deliberately did not re-seed: whoever rebuilt it is plainly mid-bootstrap, and dropping 300k
rows into a database that ticket 02's parity comparison may be about to read would break their work
to protect mine.

To reproduce on a clean target (roughly 8 minutes, dominated by HNSW maintenance on 13,320 vectors):

    DATABASE_URL=<owner url> DIRECT_DATABASE_URL=<same> node src/scripts/db-bootstrap.mjs   # as neondb_owner
    DATABASE_URL=<owner url> DIRECT_DATABASE_URL=<same> APP_DB_SCHEMA=public,build,build_events \
      node src/scripts/db-bootstrap-app-role.mjs
    SCRATCH_DATABASE_URL=<owner url> node src/scripts/seed-scratch-e2e.mjs
    SCRATCH_DATABASE_URL=<owner url> node test/perf/seed-heavy-query-load.mjs
    PERF_APP_DATABASE_URL=<streamline_app url> node test/perf/measure-heavy-query-plans.mjs --org=large --out=<dir>

`--scale=0.2` on the load seeder gets a usable shape in about 90 seconds if the full set is too slow;
the qualitative results (which index is chosen, which side of a head-to-head wins) hold at that scale,
the absolute buffer counts obviously do not. Every measurement transaction was rolled back; the only
writes this ticket made were the seeders'. `test/perf/seed-heavy-query-load.mjs --purge` removes the
load and leaves the base seed intact.

---

# Session 2 (2026-09-02) — the projection box, on `scratch_perf_seed`

The plans above were taken on `scratch_boot_d` and are unchanged. This section covers only the one
box that was left open: *every list, count and existence path selects named columns and returns a
minimal projection; no full ORM row, global user record or large JSON/blob/vector field is
hydrated.* Target for everything below: **`scratch_perf_seed`** — journal head, 1,699 MB, 88
non-empty tables, four tenants at 89.93 / 9.0 / 0.90 / 0.18 percent. Every measurement was taken as
`streamline_app` (`rolsuper = false`, `rolbypassrls = false`) with `app.organization_id` set inside a
transaction that was rolled back; a no-GUC read raises
`no tenant context: app.organization_id is not set for this transaction`, which the runners assert
before they trust a number.

## 1. The global-users clause is closed, and now locked

CLAUDE.md §3 is specific: *never use an unprojected relation to global `users`* — those rows still
hold authentication secrets and legacy PII. The previous pass asserted this was clean by grepping for
four literal spellings (`user: true`, `creator: true`, `approver: true`, `assignee: true`). That test
is too narrow to be trusted: `crm_deals.salesRep`, `blog_posts.author`, `sign_envelopes.signer` and
329 other relation names also point at `users`, and none of them matches those four strings.

Re-audited properly, by building a relation map from **every** `relations()` block in
`src/db/schema/**` and resolving each `with:` entry against it:

| | |
|---|---:|
| `db.query.*.find{Many,First}` call sites scanned | **1,573** |
| of which carry a `with:` block | 251 |
| relations declared in the schema that target global `users` | 333 |
| relations to `users` actually hydrated by application code | **169** |
| …of those, hydrated **without** an explicit `columns:` projection | **0** |
| relation names the map could not resolve (a silent hole in the scan) | **0** |

The union of every users projection in the codebase is
`id, name, firstName, lastName, email, image, phone, bio, isActive, designation, linkedinUrl,
twitterUrl, githubUrl, websiteUrl`. `users.totpSecret` — the TOTP shared secret — appears in none of
them, and neither do `emergencyContact`, `dateOfBirth` or `metadata`. Separately: no bare `.select()`
reads `users` directly or through a join, and `getTableColumns(users)` appears nowhere in the repo.

**Locked** by `BE/src/db/users-relation-projection.spec.ts`. It rebuilds the relation map at test
time, so a new users relation added tomorrow is covered without touching the spec, and it asserts
three things:

1. every relation to `users` declares an explicit `columns` projection;
2. no projection names `totpSecret`, `emergencyContact`, `dateOfBirth` or `metadata`;
3. **the scan is not vacuous** — it must resolve >1,000 query sites, find >100 users relations, and
   leave zero relation names unresolved. AGENT-BRIEF rule 8 in miniature: a scan that reports
   everything clean is a broken scan until it proves it found something.

`jest --runInBand --testPathPattern=users-relation-projection` → **3 passed, 0 failed**. Assertion 1
fired on a real false positive while the spec was being written: `reporter: { columns: USER_COLS }`
in `projects-tickets-detail.service.ts` passes an identifier rather than an object literal, and a
naive `columns:\s*\{` test reads it as unprojected. The spec now inlines module-level `const
UPPER_CASE = {…}` for both `with:` and `columns:` before matching.

## 2. Buffers cannot score a projection — bytes can, and here they are

The previous pass ended on a real obstacle: `dashboard-recent-activity` full-row and 8-field
projections both cost **417 buffers / 19,587 rows**, because the columns share heap pages, so
`EXPLAIN (BUFFERS)` reports a projection as free. That is true and it is not a reason to stop
measuring — it is a reason to change instrument. What a projection costs is bytes across the
database boundary and bytes resident in the Node heap, and `pg_column_size(row(…))` measures exactly
the columns named.

`BE/test/perf/measure-projection-bytes.mjs` (`--self-test` **8/8**), as the app role with the GUC:

| path | rows | cols | projected | bytes | projected bytes | x |
|---|---:|---:|---:|---:|---:|---:|
| `kb-chunks-page-50` (`kb_article_chunks`) | 50 | 20 | 19 | **322,200** | **14,600** | **22.07** |
| `kb-pages-update-guard` | 1 | 37 | 4 | 270 | 45 | 6.00 |
| `dashboard-recent-activity` (`build.tickets`) | 10 | 40 | 8 | 1,560 | 1,080 | **1.44** |
| `notifications-list-page` | 20 | 26 | 25 | 6,168 | 5,368 | 1.15 |
| `kb-pages-list-100` | 100 | 37 | 34 | 27,000 | 23,800 | 1.13 |
| `attendance-list-page` | 100 | 18 | 16 | 14,800 | 14,400 | 1.03 |

Two things this establishes. First, **the instrument discriminates where buffers do not**:
`dashboard-recent-activity` is 417/417 in buffers and 1.44x in bytes (1.37x on mid, 1.38x on tiny) —
so a projection ratchet is now possible, which is what the previous pass said was missing. Second,
**the size of the stake when a vector is involved**: one unprojected 50-row read of
`kb_article_chunks` would move 315 kB of 1536-dimension embeddings for 14 kB of content. No shipped
read does that — which is the vector clause of this box, now measured rather than asserted.

**Honest limit.** `attendance` (1.03x) and `notifications` (1.15x) are low because the seeded jsonb
payloads are small: `attendance.breaks` is set on all 10,188 rows but is a stub, `location_data` is
null on every row, and `chat_messages.metadata` and `business_parties.social_profiles` are null on
all 13,344 / 22,240 rows. These ratios are a **floor**, not an estimate of production. Making them
representative is a seed change (ticket 23's dataset manifest), not an instrument change.

The full-column set is taken from the **declared** Drizzle columns, not `information_schema`. That
distinction is load-bearing: a bare `.select()` in Drizzle emits the declared column list, not
`SELECT *`, so scanning the live catalog overstates every count. Verified by building the query and
printing its SQL — `select "id", "org_id", …, "content", "content_text", "fts", … from "kb_pages"`.
`kb_pages.fts` **is** declared (`tsvector("fts").generatedAlwaysAs(…)`, `kb/pages.ts:39`), so a bare
`.select()` on that table really does drag the generated search vector across the wire.

## 3. Fixed — 13 files

Eleven existence-only reads that hydrated a jsonb-bearing row to answer `if (!x) throw`, narrowed to
the columns actually consumed:

`build/core/projects-write.service.ts` · `chat/chat-pins.service.ts` ·
`e-sign/sign-envelope-validation.service.ts` · `finance/ar/reminders.service.ts` ·
`hr/performance/compliance.service.ts` · `hr/performance/review-cycles.service.ts` ·
`hr/recruitment/recruitment-candidate-ai.service.ts` (also dropped a `with: { resume: true }` whose
result was never read) · `inventory/ai/inv-ai.service.ts` · `inventory/channels/tpl.service.ts` ·
`inventory/traceability/inv-traceability.service.ts` · `kb/wiki/kb-page-duplicate.service.ts`

Plus two KB reads:

- `kb/wiki/kb-page-tree.service.ts` — `getTrash()` returned 100 whole `kb_pages` rows including
  `content` (jsonb), `content_text` and the generated `fts` tsvector. The frontend
  (`features/wiki/components/trash-page.tsx`) reads exactly four fields: `id`, `title`, `icon`,
  `deletedAt`, and `fts` appears nowhere in the frontend at all. Now projected through the same
  `KB_PAGE_LIST_COLUMNS` / `KbPageListItem` shape `kb-page-visits.service.ts:19-25` already
  established in the same folder, so this follows the repo's own pattern rather than inventing one.
- `kb/wiki/kb-pages.service.ts` — `update()` read the whole row to check `isLocked`, `trustState`
  and `content`.

**Typecheck is what made this safe, and it caught four real bugs.** The "value used only as a
boolean guard" heuristic looked 25 lines past the call; in four files the value was used further
down. `tsc` failed with `Property 'name' does not exist on type '{ id: number; }'` and three more
like it. Each was widened to exactly the columns consumed. A mocked spec could not have caught any
of them — ts-jest runs `isolatedModules`, so a spec never enforces a signature. This is
CLAUDE.md §8's point, from the wrong end.

## 4. Why the box stays open

Re-counted at head against the declared column set:

| shape | total | on a table with a jsonb/array/tsvector/vector column |
|---|---:|---:|
| `findMany` with no top-level `columns:` | **200** | 100 |
| `findFirst` with no `columns:` | **456** | 222 |
| non-single-row bare `.select()` | **373** | 151 |

Narrowing the bulk of these changes a response DTO. `hr_form_submissions.formSchemaSnapshot` is what
`maskSensitiveData` reads to decide which fields to redact; the audit and event-stream jsonb columns
are the diff the UI renders; `survey_questions.settings` and `automation_rules.conditions` *are* the
payload the endpoint exists to return. That is a **product decision about API contracts**, not a
measurement, and it is not one to take from a row count. The two clauses that were measurable —
global user records and large vector fields — are closed above. The instrument to score the third
now exists; the decision does not.

## 5. Cross-territory findings (not fixed)

- **P1 — `GET /kb/pages/:id` returns the generated `fts` tsvector to the browser.**
  `kb-pages.service.ts:123` spreads the whole `PageRow` into the response, and `PageRow` includes
  `fts` and `content_text`. The frontend references `fts` nowhere. Narrowing it changes the
  `PageRow` return type across `kb/wiki/`, so it is a contract change and is left to the KB owner.
  Same shape at `kb-articles.service.ts:116` and `kb-page-versions.service.ts:98`, where the row is
  also passed to `snapshotIfNeeded`.
- **P2 — `attendance-read.service.ts`** has six `findMany` with no `columns:` on a table carrying
  `breaks` and `location_data` jsonb; `recruitment-candidates.service.ts:97` returns `notes`,
  `bgvNotes`, `aiScoreBreakdown` and `resumeUrl` on a browse list. Both are contract narrowings.
- **Ticket 08 — six index drops are measured regressions.** See `reports/07-key-inventory.md` §4.3.
  All six are a narrow `(org_id)` index dropped as a "leading prefix" of a much wider index; on the
  89.9% tenant `contacts` goes to a full Seq Scan (645 buffers against 30) and `inv_stock_levels`
  costs 609 against 39, while every minority tenant is flat. The `inv_stock_levels` probe is the
  literal query at `inventory/settings/settings.service.ts:137`.
- **Ticket 08 — S18 has grown from 5 overlapping FK pairs to 172 at head**, 25 on non-empty tables.
  Measured cost: 2,000 redundant FK trigger invocations per 1,000 inserts on
  `inv_stock_transactions`. See §4.4 of the same report.

## 6. Gates

| command | exit | number |
|---|---:|---|
| `pnpm check:unjoined-table-refs` | **0** | 3,052 files · 5,398 queries · every referenced table in its FROM/JOIN |
| `pnpm typecheck` (through `heavy.sh`) | 2 | **1 error, not mine** — `finance/ap/payment-run-executor.service.ts:157 TS2552 newStatus`, a file with 13 insertions / 10 deletions of another agent's uncommitted work |
| `pnpm check:spec-typecheck` | 2 | same single error; the new spec compiles clean |
| `jest --runInBand` over the 10 changed module trees + the new spec | **0** | **173 suites, 1,119 tests, all passed** |
| `pnpm check:unbounded-reads` | 1 | 1 unclassified path, `cron/cron-hr-retention-documents.ts:130` — not a file I touched, no entry in the baseline |
| `pnpm check:db-call-count` | 1 | **96** unclassified files repo-wide (access, accounting, ai, billing, calendar, chat, crm, cron, …). One is a file I touched, `build/core/projects-write.service.ts`, where my diff is `+1` line at 254 and the flagged loop-internal call is at 196/204 |
| `node test/perf/measure-index-redundancy.mjs --self-test` | 0 | 13/13 |
| `node test/perf/measure-projection-bytes.mjs --self-test` | 0 | 8/8 |

Both red `check:*` gates are pre-existing drift in a shared working tree that currently holds other
agents' uncommitted changes across ~200 files. Neither is claimed as passing.

## 7. Files changed

- `BE/test/perf/measure-index-redundancy.mjs` (new) — the multi-tenant index-redundancy harness.
- `BE/test/perf/index-redundancy-candidates.json` (new) — all 354 executed drops with the definition
  each one removed, so the measurement reproduces without `scratch_boot_c`.
- `BE/test/perf/measure-projection-bytes.mjs` (new) — the bytes-returned instrument.
- `BE/src/db/users-relation-projection.spec.ts` (new) — locks the global-users clause.
- 13 service files listed in §3.
- `FEROOT/.scratch/code-release-10-10/reports/07-key-inventory.md` §4 (rewritten), §2 rows S14/S15/S18, §6, §7.
- `FEROOT/.scratch/code-release-10-10/reports/07-index-redundancy/` (new), `reports/20-query-plans/projection-bytes-*.json` (new).
- Both ticket files.

No migration, no `src/db/schema/**`, no `.env`, no `package.json`. `DATABASE_URL` was never read and
no `cornerstone_*` database was touched.
