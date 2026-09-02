# 22b — Three measured defects that several tickets found and none owned

**Status:** all three fixed and measured. Two consequences are reported rather than fixed, because
both land outside this territory: `contracts/route-budgets.json` still records the stale
`measuredDbCalls: 5`, and fixing the six vacuous fixtures exposed one real plan defect that was
invisible while the budget measured nothing.

Everything below was measured on **`scratch_t22b`** — a database this ticket built from zero
(`db-bootstrap.mjs` → head, then the three seed layers with the fixes in them), 892 MB, 86
non-empty tables, four tenants at 89.93 / 9.0 / 0.90 / 0.18 percent — as **`streamline_app`**
(`rolbypassrls = false`) with `app.organization_id` set, **in buffers**. Baselines were taken
read-only on `scratch_perf_seed`, which was not written to. Backend HEAD at measurement:
`f4c7bdf5`.

---

## The headline numbers

| | before | after |
|---|---|---|
| `GET /notifications` database statements (ceiling 3) | **5** | **3** |
| `GET /notifications/unread-count` statements (ceiling 5) | **4** | **2** |
| partitions the notification list plans over | **49** | **8** |
| notification list total buffers (large tenant, warm) | **13,879** | **2,810** |
| read-cost budgets producing a non-empty measurement | **64/70 (91.4%)** | **70/70 (100%)** |
| vacuous read-cost budgets on the reference tenant | **6** | **0** |
| read-cost tally, reference tenant | 60 PASS / 20 FAIL | **66 PASS / 14 FAIL** |
| bytes of `fts` in one `GET /kb/pages/:id` response | **2,340 of 3,644 (64.2%)** | **0** |

---

## DEFECT 1 — `GET /notifications`: 5 statements, and a plan over 49 partitions

### 1.1 The five statements were three lookups of the same row

`NotificationsReadService.list` resolved the caller's membership, then called `fetchLastReadId`,
which **resolved the membership again** before reading the watermark:

```
resolveMembershipId(1) + fetchLastReadId[ resolveMembershipId(1) + watermark(1) ] + list(1) + ticketContext(1) = 5
```

`unread-count` had the same shape minus the ticket context, which is exactly the 4 ticket 22 used
to prove the harness was trustworthy.

The membership row and its watermark are one left join apart, so they are now one statement
(`resolveRecipient`). Nothing was removed from the result: `lastReadId` is `COALESCE`d to 0 exactly
as before, and a caller with no membership still throws.

```
recipient(1) + list(1) + ticketContext(1) = 3          # ceiling 3
recipient(1) + count(1)                   = 2          # ceiling 5
```

**Measured, not reasoned.** Ticket 22's own instrument, run against the real service over the seed:

```
SEED_ORG_ID=…0001 APP_DATABASE_URL=…streamline_app…/scratch_perf_seed \
  jest --config jest-e2e.json --runInBand --testPathPattern=route-db-call-budget
```

| route | before | after | ceiling |
|---|---|---|---|
| `GET /notifications` | **5** | **3** | 3 |
| `GET /notifications/unread-count` | **4** | **2** | 5 |

The "before" is my own measurement, not a quotation: I restored the pre-change service from
`HEAD`, ran the ratchet, read `5`, and restored my version. Both artifacts are on disk
(`calls-before.json`, `calls-after.json`) and the "after" reproduces identically on the fresh
`scratch_t22b`.

### 1.2 The partition scan: 49 partitions, and planning cost 5× execution

`notifications` is RANGE-partitioned on `created_at` (migration `0582`, 48 monthly partitions
2024-01 → 2027-12 plus a DEFAULT). A read with no `created_at` predicate **cannot prune**, so the
list plans a `Merge Append` over every partition — including 15 that are empty because they are in
the future, and the DEFAULT.

The interesting cost is not the scan. Each partition contributes ~2 buffers to execution, but
**planning** a 49-way Merge Append costs 13,728 buffers to return 20 rows — 90× the execution cost,
and it is paid on every uncached list request:

```
Limit (actual rows=20 loops=1)
  Buffers: shared hit=151                     <- execution
  ->  Merge Append   Sort Key: notifications.id DESC
        ->  49 × (Result → Index Scan Backward on notifications_yYYYY_mMM)
Planning:
  Buffers: shared hit=13728                   <- planning
Planning Time: 14.6 ms   Execution Time: 1.1 ms
```

**The fix is a retention-aligned window, not a page cap.** `NOTIFICATION_RETENTION_POLICY`
already declares 180 days for this table, and `notification-retention.service` enforces it by
`DETACH PARTITION CONCURRENTLY` + `DROP` of every monthly partition whose last day falls before
the cutoff. So no row older than the start of the month containing `now() - 180 days` survives, and
a predicate at that boundary excludes nothing that exists. `notification-read-window.ts` derives
the window from the policy constant — the two cannot drift — with one day of slack at each end,
because partition bounds were stamped in the database server's local timezone rather than UTC and
the upper bound must tolerate app/database clock skew.

`notification-read-window.spec.ts` pins the non-truncation property directly against
`expiredPartitions()` over four clocks: **every partition retention keeps ends after the window
start**, and **every month the window excludes is one retention has already dropped**. That is the
assertion that makes this a window rather than a silent truncation, and it is why a bare `LIMIT`
was not the answer.

Measured on `scratch_t22b`, warm, as `streamline_app` with the tenant GUC, across three tenants in
the skew:

| tenant | query | partitions | exec buffers | planning buffers | total |
|---|---|---|---|---|---|
| large 89.9% | list before | 49 | 151 | 13,717 | 13,868 |
| large 89.9% | list **after** | **8** | **100** | **2,705** | **2,805** |
| mid 9.0% | list before | 49 | 152 | 13,717 | 13,869 |
| mid 9.0% | list **after** | **8** | **97** | **2,705** | **2,802** |
| small 0.90% | list before | 49 | 144 | 13,717 | 13,861 |
| small 0.90% | list **after** | **8** | **100** | **2,705** | **2,805** |
| large 89.9% | unread-count before | 49 | 35 | 11,717 | 11,752 |
| large 89.9% | unread-count **after** | **8** | **27** | **2,296** | **2,323** |

**4.9× fewer buffers, and the floor stops growing one partition per month.** The window also
prunes the DEFAULT partition, because the requested range lies wholly inside declared bounds.

Honest caveat, stated because it is the one thing a reader should check: **on this seed the window
does hide rows.** The fixture holds notifications back to 2025-10-07 and never runs retention, so
for the fixture membership 261 of 450 rows fall inside the window and 189 do not. Every one of the
189 sits in a partition `expiredPartitions()` reports as due for detach. In a deployment where the
retention sweep runs, the set is empty by construction. If retention is ever disabled, this window
becomes a truncation — which is why it is derived from the policy constant and asserted against
`expiredPartitions()` rather than hard-coded.

---

## DEFECT 2 — six budgets that passed over an empty result set

All six were fixture defects, exactly as ticket 22 reported. **None was waived**;
`allowEmptyResult` is still used zero times, and `src/scripts/read-cost-budgets.mjs` was not
touched.

| budget | before | after | why it was empty |
|---|---|---|---|
| `dashboard-personal-my-tasks` | 0 rows, VACUOUS | **10 rows**, fail (§2.1) | seed wrote title-case statuses |
| `leads-assigned-to-me` | 0 rows, VACUOUS | **16 rows**, pass, 6 blk | seed wrote only `assigned_to_membership_id` |
| `chat-saved-messages` | 0 rows, VACUOUS | **25 rows**, pass, 84 blk | every saved message belonged to membership 1 |
| `kb-page-visits-mine` | 0 rows, VACUOUS | **20 rows**, pass, 65 blk | every visit belonged to one user |
| `kb-page-id-probe-sdf` | 0 rows, VACUOUS | **51 rows**, pass, 128 blk | pages were titled `Page 1..60` with empty body |
| `module-access-roster` | 0 rows, VACUOUS | **25 rows**, pass, 101 blk | the `hr` role existed with no assignment |
| `dashboard-announcements` | 3 rows, seq-scan FAIL | **20 rows**, **pass**, 63 blk | 2–3 rows fit on one page |

```
Coverage: 70/70 declared read-cost budgets produced a non-empty measurement (100.0%).
0 unmeasured (0 vacuous, 0 below seed floor, 0 no fixture, 0 excluded).
--- Tally: 66 PASS / 14 FAIL / 0 UNMEASURED / 0 EXCL / 0 SKIP ---
```

### 2.1 The status vocabulary — the seed was the deviant side, and it still is a breach

Ticket 22's correction is confirmed and was acted on as written. `DEFAULT_PROJECT_STATUSES`
(`build/core/lib/default-statuses.ts`) and `ACTIVE_TICKET_STATUSES`
(`dashboard/dashboard-personal.service.ts`) both write `TODO / IN_PROGRESS / IN_REVIEW / DONE`.
Both seed scripts wrote `Todo / In Progress / In Review / Done`. **The seeds were changed, the
budget was not.**

The composite FK `build.tickets(org_id, project_id, status) → build.project_statuses(...)` is
`ON UPDATE CASCADE`, so an existing scratch database converges in one statement: both scripts now
rename the legacy status rows before inserting the canonical ones, and every ticket follows.

**Fixing it exposed a real plan defect that the vacuous budget was hiding.**
`dashboard-personal-my-tasks` now measures and **fails** — 1,801 rows scanned against
`maxScanRows: 1000`:

```
Index Scan using idx_tickets_org_updated_live on tickets t
  Index Cond: (org_id = '…0001')
  Filter: (assignee_membership_id = 3 AND status = ANY ('{TODO,IN_PROGRESS,IN_REVIEW}'))
  Rows Removed by Filter: 1791
```

The planner takes the `(org_id, updated_at)` index to satisfy `ORDER BY t.updated_at DESC` and
declines `idx_tickets_org_assignee_status`, because the sort column is not in it — the exact shape
`backend/CLAUDE.md` §3 names: *an inequality + `ORDER BY` on another column needs
`(tenant, eq cols, sort col)`*. The covering index would be
`(org_id, assignee_membership_id, status, updated_at DESC)`. **Not fixed here — `migrations/` and
`src/db/schema/**` are outside this territory.** `dashboard-my-issues` walks the identical 1,801
rows and passes only because it declares no `maxScanRows`.

This is the point of removing a vacuous budget: the count of failures went *down* by six and *up*
by one, and the one is real.

### 2.2 A seed section that had started failing silently against a live constraint

Not on the assignment, found while rebuilding. `seed-perf-scratch.mjs` inserts chat channels as
`type = 'GROUP'` without `is_private`, which now violates
`chk_chat_channels_privacy_matches_type` — `CHECK (is_private = (type <> 'PUBLIC'))`. On a fresh
head the mid, small and tiny tenants got **no chat channels and no messages at all**, and the
script exited non-zero with three recorded failures. `scratch_perf_seed` hides this because it was
built before the constraint landed and the top-ups now find the tables already full. Fixed;
`chat_messages` is back to 12,000 / 1,200 / 120 / 24 across the four tenants and layer 3 reports
`All sections completed without errors`.

---

## DEFECT 3 — `fts` on the wire

### 3.1 The frontend does not read it — verified, not assumed

```
grep -rn "fts" --exclude-dir=node_modules --exclude-dir=.next streamlineos-frontend/frontend
```
Three hits, all noise: a `pnpm-lock.yaml` integrity hash, the word *drifts* in `globals.css`, and
the word *drifts* in `contracts/README.md`. **Zero references to the field.** Ticket 20's claim
holds.

### 3.2 What it costs, measured

Using ticket 20's instrument (`test/perf/measure-projection-bytes.mjs`, self-test 8/8) — its
`buildSql` lifted out of the source and run as `streamline_app` with the tenant GUC in a
rolled-back transaction, because importing the module runs its `main()`:

| read | rows | with `fts` | without | saved | share |
|---|---|---|---|---|---|
| `GET /kb/pages/:id`, large tenant | 1 | **3,644 B** | 1,304 B | **2,340 B** | **64.2%** |
| `kb_pages` 50-row read, large tenant | 50 | 135,456 B | 51,440 B | 84,016 B | 62.0% |
| `GET /kb/pages/:id`, mid tenant | 1 | 288 B | 248 B | 40 B | 13.9% |

Across the large tenant's 600 pages: mean `content_text` 1,121 chars, mean `pg_column_size(fts)`
**1,241 bytes**, max 2,460, on a mean row of 2,060 bytes. **The search vector is larger than every
other column of the page put together.** The mid tenant's pages come from layer 2, which writes no
`content_text`, so its vector is built from the title alone — that 13.9% figure is what the old
fixture could show, and it is why the seed fix in §2 had to land first for this number to be
honest. For scale, the same instrument reports an unprojected 50-row `kb_article_chunks` read at
322,200 → 14,600 bytes (22.07×).

### 3.3 The fix

The three named sites are `kb-pages.service.ts` `get()`, `kb-articles.service.ts` `update()` and
`kb-page-versions.service.ts` `restoreVersion()`. Fixing only those would have been inert: the
`.returning()` on every page and article mutation emits `fts` too, and `update()` returns the
guard row unchanged when nothing changed. So the projection is now carried by the type.

Two new modules — `kb/wiki/kb-page-columns.ts` and `kb/help-centre/kb-article-columns.ts` — export
the column set minus `fts` plus `KbPageRow` / `KbArticleRow`. Seventeen `.returning()` calls and
three unprojected reads now use them, and `type PageRow` / `type ArticleRow` resolve to the
`fts`-free row, so a future read cannot reintroduce the field without a type error. The identical
`KB_PAGE_LIST_COLUMNS` block that was duplicated in `kb-page-visits.service.ts` and
`kb-page-tree.service.ts` now imports the shared one.

**This is a response-contract change** — `GET /kb/pages/:id`, `PATCH /kb/pages/:id`,
`POST /kb/pages`, page status/visibility/restore/duplicate/move, and every `kb_articles` mutation
stop returning `fts`. The frontend check above is the evidence that nothing reads it. `kb_articles`
holds **zero rows** in the seed, so the article-side saving is stated as unmeasured; the mechanism
is identical and the byte cost scales with `content_text` the same way.

---

## Gates

| command | exit | result |
|---|---|---|
| `pnpm typecheck` (backend, through the mutex) | **0** | **0 errors, whole repo** |
| `pnpm check:spec-typecheck` | 2 | 1 error, `src/modules/gdpr/gdpr-erasure-chat-attachments.spec.ts` — untracked, another territory. **Zero in mine.** |
| `pnpm check:unbounded-reads` | **0** | OK — 0 actionable |
| `pnpm check:unjoined-table-refs` | **0** | OK — 3,059 files, 5,396 queries |
| `pnpm check:db-call-count` | 1 | 1 UNCLASSIFIED: `src/modules/gdpr/gdpr-subject-erasure-chat-attachments.ts` — untracked, another territory. **Zero in mine.** |
| `jest --testPathPattern="modules/(notifications\|kb)/"` | 1 | **132 of 133 suites, 815 of 817 tests pass.** The one failure is `kb-page-record-links-uniqueness.spec.ts` — untracked, asserting a migration `1020_t29_kb_space_grants_tenant_fk` that does not exist yet |
| `jest --config jest-e2e.json --testPathPattern=route-db-call-budget` | **0** | **5/5**, on both `scratch_perf_seed` and `scratch_t22b` |
| `run-read-cost-budgets --self-test` | **0** | all 5 breach types detected |
| `run-read-cost-budgets` (large 89.93%) | 1 | **66 PASS / 14 FAIL, 70/70 measured** |
| `run-read-cost-budgets --profile=minority` (mid 9.0%) | 1 | 47 PASS / 10 FAIL, **48/70** (was 47/70) |
| `run-read-cost-budgets --profile=minority` (small 0.90%) | **0** | 36 PASS / 0 FAIL, **36/70** (was 34/70), PARTIAL |
| `seed-scratch-e2e --self-test` | **0** | 4/4 |
| `seed-perf-scratch --self-test` | **0** | 11/11 |
| `measure-projection-bytes --self-test` | **0** | 8/8 |
| `check-route-budgets --self-test` | **0** | 21 checks |
| `check:route-budgets` | 1 | see below — stale recorded value, not a live breach |
| `pnpm lint` | — | **not run** |
| full `pnpm test` / `pnpm test:e2e` | — | **not run** |

### `check:route-budgets` is still red, on a number that is no longer true

```
EXCEEDED: 2 measured value(s) above declared ceiling:
  GET /notifications — measuredDbCalls=5 exceeds maxDbCalls=3
  GET /notifications/unread-count — measuredBufferBlocks=10234 exceeds maxBufferBlocks=3000
```

`contracts/route-budgets.json` is on this ticket's do-not-edit list, so the recorded `5` was left
alone. It is stale: the live ratchet measures **3**. The measurement is written by ticket 22's own
script, which requires a full read-cost artifact and would rewrite 50 other entries, so it is that
ticket's call, not mine:

```bash
export APP_DATABASE_URL='postgres://streamline_app@127.0.0.1:5432/scratch_t22b' PGSSLMODE=disable
SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 node src/scripts/run-read-cost-budgets.mjs --samples=200 --json=/tmp/ref.json
SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 ROUTE_BUDGET_DB_CALL_ARTIFACT=/tmp/calls.json \
  pnpm exec jest --config ./jest-e2e.json --runInBand --forceExit --testPathPattern=route-db-call-budget
node src/scripts/measure-route-budgets.mjs --from=/tmp/ref.json --db-calls=/tmp/calls.json --database=scratch_t22b --write
```

The second breach, `measuredBufferBlocks=10234`, is the read-cost budget's own SQL and is discussed
below.

`test/perf/route-db-call-budget.e2e-spec.ts` did have to change: it pinned the breach with
`expect(...).toThrow(/over its declared maxDbCalls=3/)`. That test now asserts the route is
**within** budget, so a regression to 4 fails there. `assertNoDbCallRegression` is unchanged and
still ratchets. **No ceiling was raised anywhere.**

---

## Cross-territory findings

1. **`dashboard-personal-my-tasks` scans 1,801 rows against a 1,000 ceiling** (§2.1) → build /
   schema. Needs `(org_id, assignee_membership_id, status, updated_at DESC)`; the existing
   `idx_tickets_org_assignee_status` cannot serve the `ORDER BY`. Newly visible because the budget
   stopped being vacuous.
2. **The `notifications-list` and `notifications-unread-count` read-cost budgets have drifted from
   the service they describe.** Both filter `user_id = $2`. The service filters
   `membership_id` — migration `0520` moved the recipient authority, and the live indexes are
   `(org_id, membership_id, id)`. There is no index on `(org_id, user_id, …)` any more, which is
   why those budgets report 3,860–6,267 rows scanned per partition and 10,234 blocks. **The
   service-shaped query on the same data reads 100 buffers over 8 partitions.** Fixing the service
   cannot move those numbers; the budget SQL has to be re-pointed at `membership_id`
   → `src/scripts/read-cost-budgets.mjs`, ticket 22's file.
3. **`dashboard-personal-notifications-count` (11,044 blocks)** has the same drift and the same
   remedy → dashboard / ticket 22.
4. **Four budgets are still vacuous on the minority tenants** — `kb-page-id-probe-sdf` and
   `module-access-roster` at both 9.0% and 0.90%, plus `chat-saved-messages` /
   `support-ticket-assigned-to-me` at 9.0% and `dashboard-personal-calendar-events` /
   `dashboard-team-attendance` at 0.90%. `kb_page_visits`, `announcements`, `role_assignments` and
   the KB page bodies are seeded by layer 1, which only writes `LARGE_ORG`. Extending them to all
   four tenants means teaching layer 1 the tenant list or moving those sections into layer 3 — a
   larger change than these six defects, and it would alter the fixture shape tickets 20 and 22
   have already captured.
5. **`test/perf/heavy-query-fixtures.mjs` still knows three organizations**, so the tiny tenant has
   no notifications at all and every notification budget is unmeasurable there. Unchanged from
   report 00 §8.5, deliberately.
6. **Three files in the shared tree are red and are not mine:**
   `src/modules/gdpr/gdpr-subject-erasure-chat-attachments.ts` (unclassified in
   `check:db-call-count`), `src/modules/gdpr/gdpr-erasure-chat-attachments.spec.ts` (spec
   typecheck), and `src/modules/kb/wiki/kb-page-record-links-uniqueness.spec.ts` (asserts an
   unwritten migration). All three are untracked work in progress.
7. **`kb-articles.service.ts` is at `src/modules/kb/help-centre/`, not `src/modules/kb/wiki/`.**
   The assignment named it under `wiki/`. It was fixed where it actually lives; `kb/retrieval/**`
   was not touched.

---

## Honest gaps

- **`kb_articles` holds zero rows in every seed layer**, so the article-side `fts` saving is
  **unmeasured**. The page-side number is real and the code path is the same.
- **No route was timed over HTTP.** Every number here is buffers or statement counts; the
  millisecond figures are loopback-Postgres and exclude pool wait and network.
- **`pnpm lint` — not run. The full jest and e2e suites — not run**; two focused patterns were run
  and are reported above.
- **`contracts/route-budgets.json` was not updated**, by instruction. The gate therefore still
  reads `measuredDbCalls: 5` for a route that now issues 3.
- The **before** notification-plan numbers were taken on `scratch_perf_seed` and re-confirmed on
  `scratch_t22b`; they agree to within 11 planning buffers (49 vs 49 partitions, 13,728 vs 13,717).
- **`scratch_t22b` skips the AI retrieval corpus** (`test/perf/ai/seed-kb-retrieval-corpus.mjs`,
  step 4 of report 00). Nothing measured here needed it, and it is the 8-minute HNSW build.
- `scratch_perf_seed` could not be copied with `createdb -T` — 14 other sessions held it open — so
  the database was rebuilt from zero instead. That turned out to be the better proof: it shows the
  corrected seeds produce non-vacuous fixtures on a fresh head rather than relying on a repair pass.
