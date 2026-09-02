# 00 — A production-shaped seeded scratch database

**Status:** delivered. `scratch_perf_seed` exists on this machine, is at journal head (649/649),
holds ~1.7 GB across 88 non-empty tables and 8 organizations on a deliberately skewed split, and
is readable as the non-owner `streamline_app` role with row-level security active.

This report is infrastructure, not a ticket. It exists because tickets **07**, **12**, **20**,
**21**, **22** and **23** were all reporting BLOCKED on the same sentence: *no seeded database
exists on this machine.*

---

## 1. What was actually wrong

`scratch_boot_c` — the database ticket 07 was reading — has **5 non-empty tables out of 1,026**.
Every plan taken on it is degenerate: a table with no rows has no statistics, the planner picks
whatever is cheapest to *start*, and `idx_scan = 0` means "nothing ever ran", not "this index is
redundant". Ticket 07 was right to refuse to delete an index on that evidence.

There is a second failure mode that is easier to miss, and it is the one that decided the design
of this seed. **A tenant column with one distinct value is not a tenant column to the planner.**
If every row in `build.tickets` belongs to one organization, then:

- `org_id = $1` has selectivity 1.0, so it costs nothing and buys nothing;
- an `org_id`-leading index looks strictly worse than a narrower one, because the leading column
  discriminates nothing;
- the row-level-security post-filter removes zero rows, so it appears free.

Measured on this database, that is not a theoretical concern — see §6, where the majority tenant
and a minority tenant choose **different indexes for the identical query**, and the difference is
**1,237 buffers versus 6**.

---

## 2. Rebuilding it from scratch

Every command below is literal and was run in this order. Runtime end-to-end is about 10 minutes,
almost all of it the HNSW build and the calendar/notification load.

```bash
BE=/Users/tarunchintakunta/Personal/streamline/streamlineos-backend
HEAVY=/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/heavy.sh
OWNER='postgres://neondb_owner@127.0.0.1:5432/scratch_perf_seed'
APP='postgres://streamline_app@127.0.0.1:5432/scratch_perf_seed'

# 0. the database, with the five extensions migration 0000 assumes are already present
createdb -O neondb_owner scratch_perf_seed
psql -d scratch_perf_seed -c 'CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;   CREATE EXTENSION IF NOT EXISTS btree_gist;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS btree_gin;'

# 1. schema, zero to head. DIRECT_DATABASE_URL must be set explicitly: db-bootstrap.mjs falls
#    back to whatever .env holds, and .env's DATABASE_URL is the shared remote Neon branch.
cd $BE
DATABASE_URL=$OWNER DIRECT_DATABASE_URL=$OWNER PGSSLMODE=disable \
  $HEAVY 2 -- node src/scripts/db-bootstrap.mjs
# -> RESULT: REACHED_HEAD 649/649   (646 OK on the first pass; a later re-run applied
#                                     the 3 migrations another agent journalled meanwhile
#                                     and reported 3 OK / 646 SKIP / 0 FAIL)

# 2. the non-owner application role (RLS is meaningless measured as the owner)
DATABASE_URL=$OWNER DIRECT_DATABASE_URL=$OWNER PGSSLMODE=disable \
  node src/scripts/db-bootstrap-app-role.mjs
# -> RESULT: READY   tables granted 1028/1028   bypassrls=false

# 3. seed, three layers, in this order — each depends on the one before
SCRATCH="${OWNER}?sslmode=disable"
SCRATCH_DATABASE_URL=$SCRATCH $HEAVY 2 -- node src/scripts/seed-scratch-e2e.mjs
SCRATCH_DATABASE_URL=$SCRATCH $HEAVY 2 -- node test/perf/seed-heavy-query-load.mjs
SCRATCH_DATABASE_URL=$SCRATCH $HEAVY 2 -- node src/scripts/seed-perf-scratch.mjs

# 4. the AI retrieval corpus (ticket 12) — separate env var, separate tenants
PERF_DATABASE_URL=$SCRATCH $HEAVY 2 -- node test/perf/ai/seed-kb-retrieval-corpus.mjs

# 5. use it. Always as streamline_app, always with the tenant GUC.
APP_DATABASE_URL=$APP PGSSLMODE=disable \
  SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 \
  node src/scripts/run-read-cost-budgets.mjs
```

Local `pg_hba.conf` is `trust` for `local` and `127.0.0.1`, so neither URL carries a password and
neither is a credential. `neondb_owner` and `streamline_app` already existed on this cluster.

**Every seeding script asserts its target's name contains `scratch` and refuses a URL equal to
`DATABASE_URL`/`APP_DATABASE_URL`.** Each has a `--self-test` proving that guard; all three pass.

**Step 1 and step 2 are idempotent and should be re-run whenever the journal moves.** The journal
grew from 646 to 649 entries while this database was being seeded; re-running `db-bootstrap.mjs`
applied exactly the three new migrations (`3 OK / 646 SKIP / 0 FAIL`) and re-running
`db-bootstrap-app-role.mjs` re-granted the two new tables (`1028/1028`). A stale scratch database
is the usual cause of a "column does not exist" that looks like an application bug — see
[[live-db-drifts-ahead-of-migrations]].

---

## 3. Audit of what already existed

| Script | Works? | Notes |
|---|---|---|
| `src/scripts/seed-scratch-e2e.mjs` | **yes**, after 3 fixes | 3.2 s. Was silently dropping three tables — §5. |
| `pnpm seed:scratch-e2e:self-test` | yes | 4/4 pass. |
| `test/perf/seed-heavy-query-load.mjs` | **yes, unmodified** | 471 s. 3 orgs, 66,636 events, 266,400 notifications, 13,320 chunks. Reports and fails on every bad section. |
| `test/perf/seed-heavy-query-load.mjs --self-test` | yes | 6/6 pass. |
| `test/perf/ai/seed-kb-retrieval-corpus.mjs` | **yes, unmodified** | 49,000 chunks over 4 tenants at 81/16/1.6/0.4%. Asserts the corpus is non-degenerate (no two tenants share a point) before it builds the ANN index. |
| `src/scripts/seed-build-load.mjs` | not run | Superseded by layers 1–3 for this purpose. |
| `src/scripts/seed-demo.ts`, `seed-enterprise-workspace.ts` | not run | Demo/workspace fixtures, not volume; nothing here needed them. |
| `src/scripts/seed-perf-scratch.mjs` | **new** | Written for this task — §4. |

Layers 1 and 2 together still left the CRM, inventory, finance and Build-product tables empty and
almost every other table single-tenant. That gap is what layer 3 exists to close.

---

## 4. The new script: `src/scripts/seed-perf-scratch.mjs`

Four organizations, one weight vector, every table written for all four:

| org | id | weight | role |
|---|---|---|---|
| large | `aaaaaaaa-…-0001` | 1.0 | the majority tenant a naive benchmark accidentally measures |
| mid | `aaaaaaaa-…-0003` | 0.1 | |
| small | `aaaaaaaa-…-0002` | 0.01 | minority tenant |
| **tiny** | `aaaaaaaa-…-0004` | 0.002 | **added here** — the sharpest minority probe |

Two implementation notes worth carrying forward:

- **The circular owner-membership FK.** `organizations.owner_membership_id` and
  `organization_members.org_id` reference each other. `ensureOrg` reserves the membership id from
  the sequence, then inserts both rows in one transaction under an explicit
  `SET CONSTRAINTS ALL DEFERRED` rather than relying on the constraint's declared default.
- **`OFFSET (g % n) LIMIT 1` inside a LATERAL does not scale.** Spreading 150,000 stock
  transactions over 12,000 stock levels that way is ~900M tuple reads; the first run had to be
  killed. `numberedPool()` emits a `row_number()`-numbered CTE joined on the modulus instead —
  one hash join. Same 150,000 rows now load in under a second. The pool size is passed as a
  parameter rather than left as a per-row `count(*)`.

The script is idempotent (every section tops a table up and inserts nothing when already at
target), takes `--scale=`, `--purge` and `--self-test` (11/11 pass), and **exits non-zero if any
section failed**.

---

## 5. Defects found and fixed in `seed-scratch-e2e.mjs`

All four are script-versus-schema drift, not schema defects. All four are inside my territory.

1. **`chat_saved_messages.user_id` does not exist.** Migration `0520_rbac_membership_keys` moved
   the key to `membership_id`. Every saved-message insert was failing.
2. **`support_source_channel` is not a type.** `support_tickets.source_channel` is plain `text`;
   the cast made the whole batch fail, so `support_tickets` was **0 rows** while the script
   reported success.
3. **`payroll_line_items.calc_explain` is `jsonb NOT NULL` with no default.** Every line item was
   rejected. Fixed and proved by executing the corrected statement: `INSERT 0 30`.
4. **The seed reported false green.** `warn()` logged and discarded; 40 failed row inserts still
   printed *"All sections completed without errors."* and exited 0. `warn()` now records into
   `errors[]`, the summary groups duplicates, and the process **exits 1**.

Defect 4 is the one that matters most: it is why 1–3 survived. A seed that hides its failures
reports a shape the database does not have, and every measurement downstream inherits the lie.

---

## 6. The resulting shape

8 organizations · 88 non-empty tables · 1,699 MB (487 MB of which is the HNSW index) ·
`VACUUM ANALYZE` run over all 41 tables layer 3 touches, and again by the corpus seeder.

Four are the perf tenants; four (`perf_kb_*`) belong to the AI retrieval corpus.

### Per-tenant distribution (layer-3 report output, verbatim)

```
table                          large       mid     small      tiny     total  majority%  minority%
build.tickets                  18500      1850       185        37     20572     89.93%      1.08%
notifications                 240000     24000      2400         0    266400     90.09%      0.90%
calendar_events                60012      6012       612         0     66636     90.06%      0.92%
event_attendees               125004     12720      1296         0    139020     89.92%      0.93%
chat_messages                  12000      1200       120        24     13344     89.93%      1.08%
contacts                        8000       800        80        16      8896     89.93%      1.08%
leads                           8000       800        80        16      8896     89.93%      1.08%
deals                           6000       600        60        12      6672     89.93%      1.08%
business_parties               20000      2000       200        40     22240     89.93%      1.08%
inv_stock_transactions        150000     15000      1500       300    166800     89.93%      1.08%
inv_stock_levels               12000      1200       120        24     13344     89.93%      1.08%
inv_product_variants           12000      1200       120        24     13344     89.93%      1.08%
inv_products                    5000       500        50        10      5560     89.93%      1.08%
support_tickets                 3000       300        30         6      3336     89.93%      1.08%
attendance                      9000       900        90        18     10008     89.93%      1.08%
timesheets                      3995       180        40         8      4223     94.60%      1.14%
leave_requests                  1200       120        12         2      1334     89.96%      1.05%
mail_message_metadata           4000       400        40         8      4448     89.93%      1.08%
hr_employments                  5100       510        51        10      5671     89.93%      1.08%
hr_people                       5600       510        51        10      6171     90.75%      0.99%
kb_pages                         600        60        30         0       690     86.96%      4.35%
kb_article_chunks              12000      1200       120         0     13320     90.09%      0.90%
organization_members             500        60         8         5       573     87.26%      2.27%
```

**Minority share: ~1.08%** on every table layer 3 owns (small + tiny combined). The **tiny** tenant
alone holds **0.18%** — 300 of 166,800 stock transactions, 37 of 20,572 tickets.

Three tables show `tiny = 0` (`notifications`, `calendar_events`, `event_attendees`,
`kb_article_chunks`). Those belong to layer 2, whose `ORG_PROFILES` names three organizations, and
ticket 20's captured evidence is keyed to exactly those three. **I did not widen it** — see §8.

### AI retrieval corpus (ticket 12)

```
perf_kb_major   40,000   81.6%
perf_kb_mid      8,000   16.3%
perf_kb_minor      800    1.6%   <- the minority tenant to measure ANN recall as
perf_kb_tiny       200    0.4%
TOTAL           49,000
```
Plus the 13,320 application chunks from layers 1–2 → **62,320 rows in `kb_article_chunks`**, all
covered by the rebuilt `idx_kb_chunks_embedding_hnsw` (93.3 s to build, 487 MB). The seeder
asserts `Distinct embeddings: 49,000 of 49,000` before building it, so no two tenants share a
point and the post-filter has something real to discard.

---

## 7. Proof the database is usable for plan work

Taken as **`streamline_app`**, `rolbypassrls = false`, `rolsuper = false`, with
`SET app.organization_id`. The RLS predicate is visibly in the plan
(`One-Time Filter: current_org_id() = …`) and `relrowsecurity = t` on the relation.

### 7a. Index versus the sequential floor, minority tenant, 166,800 rows

```
 role           | bypassrls | superuser | db
 streamline_app | f         | f         | scratch_perf_seed
 rls_on: t      | visible_rows: 300

=== A. planner free to choose ===
 Limit (actual rows=50.00 loops=1)
   Buffers: shared read=6
   ->  Result (actual rows=50.00 loops=1)
         One-Time Filter: (current_org_id() = 'aaaaaaaa-1111-0000-0000-000000000004'::text)
         ->  Index Scan Backward using idx_inv_txn_org_created on inv_stock_transactions
               Index Cond: (org_id = 'aaaaaaaa-1111-0000-0000-000000000004'::text)
               Buffers: shared read=6
 Execution Time: 0.852 ms

=== B. same query, enable_indexscan/bitmapscan/indexonlyscan = off ===
 Limit (actual rows=50.00 loops=1)
   Buffers: shared hit=5 read=3403
   ->  Sort   Sort Key: created_at DESC   Sort Method: top-N heapsort  Memory: 28kB
         ->  Seq Scan on inv_stock_transactions (actual rows=300.00 loops=1)
               Filter: (org_id = 'aaaaaaaa-1111-0000-0000-000000000004'::text)
               Rows Removed by Filter: 166500
               Buffers: shared hit=2 read=3403
 Execution Time: 36.832 ms
```

**6 buffers vs 3,408. 0.85 ms vs 36.8 ms — 568× in buffers.** A sequential scan is now measurably
worse than an index scan, which is the thing an empty database cannot demonstrate.

### 7b. Why the skew was the point

The identical query, same index set, same session — only the tenant changes:

| tenant | share | index chosen | buffers | rows removed by filter |
|---|---|---|---|---|
| tiny | 0.18% | `idx_inv_txn_org_created` | **6** | 0 |
| large | 89.9% | `idx_inv_txn_created` | **1,237** | 1,165 |

The majority tenant declines the org-leading index and walks the org-less
`created_at` index instead, discarding 1,165 rows to find 50. **On a single-tenant seed only one
of those two plans is reachable**, and `idx_inv_txn_org_created` would have looked unused. This is
a direct answer to ticket 07's open box: index redundancy cannot be judged from one tenant.

### 7c. ANN under RLS, measured as the minority tenant

`k=20` nearest-neighbour over 62,320 chunks, as `streamline_app` with `app.organization_id =
'perf_kb_minor'` (800 chunks, 1.6% of the corpus):

```
 ->  Sort (actual rows=20.00 loops=1)   Sort Method: top-N heapsort  Memory: 26kB
       Buffers: shared hit=5654 read=816
       ->  Result   One-Time Filter: (current_org_id() = 'perf_kb_minor'::text)
             ->  Index Scan using idx_kb_chunks_org_source on kb_article_chunks (actual rows=800.00)
                   Index Cond: (org_id = 'perf_kb_minor'::text)
 Execution Time: 16.165 ms
```

The planner **declines `idx_kb_chunks_embedding_hnsw`** and reads all 800 of the tenant's chunks,
because the HNSW index carries no `org_id` and would order the whole 62,320-row table before RLS
filtered it. This reproduces the constraint ticket 20 recorded, now on a corpus large enough for
ticket 12 to quantify it. It is a property of single-index ANN under tenant RLS, not a defect
introduced here.

### 7d. The read-cost budget gate now runs

```
APP_DATABASE_URL=…streamline_app…/scratch_perf_seed PGSSLMODE=disable \
  SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 node src/scripts/run-read-cost-budgets.mjs
exit 1
--- Tally: 56 PASS / 14 FAIL / 10 EXCL / 0 SKIP ---
```

**Zero SKIP** is the deliverable: no budget reports `seed-too-small` any more. The 14 failures are
real measurements, not missing data — see §8.

---

## 8. Cross-territory findings (not fixed — not my territory)

1. **10 of the 70 read-cost budgets are excluded on a premise that is now false.**
   `src/scripts/read-cost-budgets.mjs` hardcodes `excluded: "CRM module not seeded on scratch_e2e"`
   (4×), `"Inventory module not seeded on scratch_e2e"` (5×) and one more. CRM and inventory are
   now seeded across four tenants. Deleting those 10 `excluded:` lines takes measured coverage
   from 60/70 to **70/70** on this database. → tickets 20/21/22.

2. **14 genuine budget breaches, all in `notifications` and `announcements`.**
   - `notifications-list` scans 3,860–6,267 rows in **each of 11 monthly partitions**
     (`maxScanRows 2000`). No read filters on `created_at`, so every plan is an `Append` over all
     partitions and the floor grows one partition per month. Ticket 20 already recorded this shape
     as a constraint; here it is with numbers.
   - `notifications-unread-count` **10,234 blocks** and
     `dashboard-personal-notifications-count` **11,043 blocks**, both against a ceiling of 3,000.
   - `dashboard-announcements` resolves `announcements` by **Seq Scan** — 2 rows, so this one is a
     genuinely too-small table rather than a plan defect. → ticket 22 should either seed it or
     drop the assertion.

3. **The budget catalog's ticket-status vocabulary does not match the schema.**
   `read-cost-budgets.mjs:1053` filters `t.status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW')`.
   `build.tickets.status` is a composite FK to
   `build.project_statuses(org_id, project_id, name)`, and every row the application writes is
   title-case (`'Todo'`, `'In Progress'`). **That predicate matches zero rows in any tenant.** I
   seeded the schema's real vocabulary rather than fabricating one to make the budget pass.
   → ticket 20/22.

4. **The budget runner is not parameterized for a minority tenant.** Run with
   `SEED_ORG_ID=<tiny>` it reports `9 PASS / 43 FAIL / 10 EXCL / 8 SKIP`, because its fixture
   resolution (project, channel, participant, payroll run) is resolved against the seed org but
   several budget SQL bodies still carry large-org-shaped assumptions. Ticket 22's box *"measure
   as a minority tenant"* needs that fixed before it can be closed honestly.

5. **`test/perf/heavy-query-fixtures.mjs` knows three organizations.** Adding `tiny` there would
   give `notifications`/`calendar_events`/`event_attendees` a fourth slice, but it would also
   change the shape ticket 20 has already captured and reported. Left alone deliberately; ticket
   20 should decide.

---

## 9. Honest gaps

- `pnpm seed:scratch-e2e:purge` — **not run.** The purge path was never exercised on this database.
- `src/scripts/seed-build-load.mjs`, `seed-demo.ts`, `seed-enterprise-workspace.ts` — **not run.**
- Backend `pnpm typecheck` — **not run.** Every file I changed is a `.mjs` script excluded from
  `tsconfig.build.json`; `node --check` passes on both.
- Jest — **not run.** No spec covers these scripts.
- The three fixes in §5 were proved by re-running the seed and by executing the corrected
  `payroll_line_items` statement directly (`INSERT 0 30`); `support_tickets` and
  `chat_saved_messages` are proved by their non-zero counts (3,336 and 230).
- `tiny` holds no rows in `notifications`, `calendar_events`, `event_attendees` or
  `kb_article_chunks` — see §8.5.

---

## 10. Which blocked tickets this now serves

| Ticket | What it needed | Served? |
|---|---|---|
| **07** | representative `EXPLAIN (ANALYZE, BUFFERS)` plans | **yes** — §7a/§7b, and §7b is a direct counter-example to judging index redundancy from one tenant |
| **12** | a realistic retrieval corpus, measured as a minority tenant | **yes** — 62,320 chunks, `perf_kb_minor` at 1.6%, HNSW rebuilt, corpus asserted non-degenerate |
| **20** | plans on a production-shaped seed, as the app role | **yes** — the shape matches what ticket 20 built on `scratch_boot_d`, plus CRM/inventory/finance/Build |
| **21** | database-call counts | **yes** — the budget runner completes with 0 SKIP |
| **22** | percentiles and coverage as a fraction | **partly** — 70 budgets measurable, but §8.1 (10 false exclusions) and §8.4 (minority-tenant fixtures) are theirs to close |
| **23** | dataset size + regression gates | **yes** for dataset size; the manifest itself is theirs |
