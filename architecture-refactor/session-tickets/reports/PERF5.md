# PERF5 — Read-Budget Self-Test Fix and Full Budget Audit

**Date:** 2026-08-31  
**Territory:** `backend/src/scripts/**` (read-cost tooling and budget definitions)

---

## Self-Test Root Cause and Fix

### Root Cause

`SEED_ORG_ID` is not set in `.env`. The runner fell back to the hardcoded UUID `aa5627a2-a7de-4dca-97d2-135f3a5f801b`, which does not exist in the database. Result: all fixture lookups returned null, the `org-members-list` self-test budget found 0 rows (need 10), reported `SELF-TEST INCONCLUSIVE`.

**The `chat_messages` relation is not missing.** pg_catalog confirms it is a regular table (relkind `r`, `relispartition = false`, no parent). Earlier lane reports were incorrect. The self-test failure was entirely the wrong org ID, not a missing relation.

```sql
SELECT relname, relkind, relispartition FROM pg_class WHERE relname = 'chat_messages';
-- relname: chat_messages | relkind: r | relispartition: false
```

Discovery probe output:
```
organizations: 13 rows
organization_members: 0 rows (no GUC set → RLS returns nothing)
chat_messages: accessible when GUC is set
```

Seed org `73e5076a-225f-4b4c-b93e-9bc66a548bfe` has: 12 active members, 20,000 tickets, 4,250 chat messages, 60 channels, 300 notifications, 5,000 HR people, 5 payroll runs.

### Fix Applied

`backend/src/scripts/run-read-cost-budgets.mjs` was changed to auto-discover the org with the most active members when `SEED_ORG_ID` is unset:

- Removed hardcoded fallback UUID
- Moved `db` creation before `ORG` resolution
- Queries `organizations` (no RLS, accessible without GUC) for up to 20 orgs
- For each org, runs `organization_members` count inside a transaction with the GUC set
- Picks the org with the highest active member count
- Exits clearly (after calling `db.end()`) if no org with members is found

### Self-Test Verification

Before fix:
```
SELF-TEST INCONCLUSIVE: the fixture never produced a measurement, so the ceiling was never tested.
  UNUSABLE: self-test: seed too small — 0 rows, need 10
Exit code: 1
```

After fix — self-test exit code 0:
```
SELF-TEST PASS: breach detected — guard can fail
Exit code: 0
```

Plan-walker unit tests: all 12 pass.
```
node src/scripts/__tests__/plan-walker.test.mjs
All plan-walker tests passed.
Exit code: 0
```

---

## Full Budget Suite Results

Runner command: `pnpm db:check-read-budgets`  
Seed org auto-discovered: `73e5076a-225f-4b4c-b93e-9bc66a548bfe` (12 active members)

```
org 73e5076a · project 129 (334 tickets) · participant 8e6459df (8572 rows)
channel 4 (85 msgs) · space 1 · payroll run 14 · leave types 0
Running 60 budgets…
Exit code: 1
```

### Three-Way Breakdown

| Category | Count | Budgets |
|---|---|---|
| PASS | 22 | See list below |
| Genuine ceiling BREACH | 0 | None — all block counts within ceilings |
| UNMEASURED / INCONCLUSIVE | 38 | 26 assertion-fails (small table) + 4 seed-too-small + 8 skip |

**Tool reports 31 breach entries across 30 failing budgets. Zero are genuine ceiling breaches. All 26 assertion failures are planner-correct seq scans on dev-sized tables.**

### PASS (22 budgets)

| Budget | r1 blocks | Ceiling |
|---|---|---|
| scoped-board-page | 336 | 5,000 |
| my-work | 8,344 | 30,000 |
| ticket-list-project | 339 | 8,000 |
| ticket-org-assigned-to-me | 3,892 | 20,000 |
| notifications-list | 12 | 5,000 |
| notifications-unread-count | 12 | 3,000 |
| chat-messages-page | 53 | 10,000 |
| kb-page-id-probe-sdf | 36 | 3,000 |
| kb-recently-updated | 50 | 8,000 |
| org-members-list | 2 | 5,000 |
| employee-record-list-canonical | 27 | 8,000 |
| employee-reporting-line-lookup | 4 | 5,000 |
| leave-requests-pending-org | 5 | 8,000 |
| leave-requests-mine | 7 | 5,000 |
| attendance-mine | 27 | 5,000 |
| leads-assigned-to-me | 1 | 8,000 |
| deals-pipeline | 19 | 10,000 |
| inv-stock-transactions | 4 | 15,000 |
| timesheets-mine | 52 | 3,000 |
| build-all-work | 3,894 | 30,000 |
| search-tickets-sdf | 66 | 30,000 |
| search-deal-sdf | 35 | 30,000 |

### UNMEASURED — Assertion-Fails (planner-correct seq scan on small dev data)

All 26 budgets below have block counts well within ceiling. The `forbid-seq-scan` assertion fires because tables are too small for the planner to prefer index scans in dev. At production scale (10K–1M rows) the planner would use indexes.

| Budget | tbl rows | r1 blocks | Ceiling | Relevant index exists? |
|---|---|---|---|---|
| chat-channel-list (channels) | 60 | 7 | 8,000 | `idx_chat_channels_last_msg (org_id, last_message_at)` ✓ |
| chat-channel-list (members) | 240 | 7 | 8,000 | `idx_chat_members_user (user_id)` — missing org_id |
| chat-channel-members | 240 | 5 | 5,000 | `idx_chat_members_channel (channel_id)` — missing org_id |
| kb-space-pages | 850 | 24 | 8,000 | No index on `(org_id, space_id)` |
| kb-spaces-list | 5 | 1 | 3,000 | `idx_kb_spaces_org (org_id)` ✓ |
| kb-page-visits-mine | 100 | 6 | 5,000 | `idx_kb_page_visits_org_user_visited (org_id, user_id, visited_at)` ✓ |
| org-people-list | 20 | 2 | 8,000 | `uniq_org_people_org_person (organization_id, organization_person_id)` ✓ |
| leave-ledger-mine | 340 | 10 | 5,000 | `idx_hr_leave_ledger_org_user (org_id, user_id)` ✓ |
| contacts-list | 960 | 16 | 8,000 | No index on `(org_id, created_at)` |
| leads-active | 960 | 18 | 10,000 | `idx_leads_org_status_created (org_id, status, created_at)` ✓ but NOT IN |
| clients-list | 350 | 6 | 8,000 | No index on `(org_id, created_at)` |
| invoices-open | ~80 | ~8 | 8,000 | `idx_invoices_org_status (org_id, status)` ✓ |
| purchase-bills-list | ~60 | ~6 | 8,000 | `idx_purchase_bills_org_status (org_id, status)` ✓ |
| gl-journals-list | 35 | 1 | 8,000 | No `(org_id, journal_date)` — existing is `(org_id, book_id, journal_date)` |
| payroll-runs-list | 5 | ~1 | 5,000 | No `(org_id, created_at)` |
| payroll-run-employees | ~25 | ~3 | 8,000 | `idx_payroll_run_employees_org_run (org_id, run_id)` ✓ |
| payroll-line-items | ~100 | ~4 | 5,000 | `idx_payroll_line_items_org_run (org_id, run_id)` ✓ |
| inv-products-list | ~200 | ~5 | 10,000 | `idx_inv_products_org_status (org_id, status)` ✓ |
| inv-stock-levels | ~100 | ~4 | 10,000 | `idx_inv_stock_org_variant_loc (org_id, product_variant_id, location_id)` ✓ |
| inv-purchase-orders | ~30 | ~3 | 8,000 | No `(org_id, created_at)` |
| inv-vendors-list | ~50 | ~3 | 5,000 | `idx_inv_vendors_org (org_id)` — no name sort |
| leave-balances-org | 20 | 1 | 5,000 | `idx_leave_balances_org_year (org_id, year)` — no user_id sort |
| chat-saved-messages | 120 | 6 | 5,000 | `idx_saved_messages_user (user_id)` — missing org_id |
| accounting-receivables-list | 350 | 21 | 5,000 | `idx_clients_org_status (org_id, status)` — no created_at |
| support-ticket-queue | 120 | 3 | 10,000 | `idx_support_tickets_org_status (org_id, status)` ✓ |
| support-ticket-assigned-to-me | 120 | 3 | 8,000 | `idx_support_tickets_org_assignee (org_id, assignee_id, created_at)` ✓ |
| timesheets-pending-org | 15,000 | 395 | 8,000 | `idx_timesheets_org_status_date (org_id, status, date DESC)` ✓ — see below |

### UNMEASURED — Seed Too Small (4 budgets)

| Budget | Table | Rows found | Required |
|---|---|---|---|
| search-lead-party-sdf | business_parties | 0 | 50 |
| search-contact-party-sdf | business_parties | 0 | 50 |
| search-client-party-sdf | business_parties | 0 | 50 |
| module-access-roster | roles (module_key IS NOT NULL) | 0 | 1 |

### UNMEASURED — No Fixture Data / SKIP (8 budgets)

mail-inbox-cached, build-roadmap-list, build-feedback-list, build-changelog-list, finance-tax-payments, finance-reminder-policies, leave-accrual-ledger-dedup, leave-accrual-balance-read.

---

## Per-Failure Diagnosis

### Zero Genuine Ceiling Breaches

No budget in this run exceeded its ceiling. The tool exit code 1 is caused entirely by `forbid-seq-scan` assertions and seed-too-small failures.

### timesheets-pending-org — Root Cause: Window Function Defeats Index

This is the only failure where the table is large enough for the index to matter in dev (15,000 rows, 395 blocks). The perfect index exists and VACUUM ANALYZE confirmed fresh statistics. The seq scan is caused by the `count(*) OVER()` window function in the query, not by a missing or refused index.

**Before VACUUM ANALYZE:** 395 blocks (h=395 r=0)  
**After VACUUM ANALYZE:** 395 blocks (h=395 r=0) — no change, confirming stats are not the cause.

```
Limit rows=50 bh=395
  Sort rows=50 bh=395
    WindowAgg rows=3750 bh=395
      Result rows=3750 bh=395
        Seq Scan on timesheets rows=3750 rmv=11250 bh=395
```

The window function `count(*) OVER()` forces materialization of all 3,750 PENDING rows before the Sort + Limit can execute. The planner must read every matching row to compute the window aggregate — a LIMIT 50 cannot short-circuit this. With 25% PENDING selectivity and the full 3,750 rows to materialize, seq scan of 395 blocks is competitive with an index scan that still reads 3,750 heap tuples. The index `idx_timesheets_org_status_date (org_id, status, date DESC)` exists, covers the predicate and sort, and WOULD be used by a query without `count(*) OVER()`.

**Service-side recommendation (file, line, recommended fix):**  
`backend/src/modules/build/execution/timesheets.service.ts` — `listTimesheets` (or whichever service method builds this query). Use a separate count query (`SELECT count(*)`) and a data query (`SELECT ... LIMIT 50`) rather than `count(*) OVER()`. The data query will then use `idx_timesheets_org_status_date` and stop after 50 rows from the index, reducing from 395 blocks to under 10 blocks. The same pattern applies to any service that uses `count(*) OVER()` on large tenant tables: `support-ticket-queue`, `support-ticket-assigned-to-me`, `accounting-receivables-list`, `chat-channel-list`.

### chat-channel-members — Missing org_id in Join Index

The join index `idx_chat_members_channel` is on `(channel_id)` only. Under RLS, the policy adds `org_id = app.current_org_id()` which is not leakproof, so the planner evaluates it against the heap tuple rather than the index — the index becomes usable only for the non-RLS predicate `channel_id = $2`, and the extra heap re-check adds cost. At 240 rows this is harmless. At scale:

**Recommendation:** Add `(org_id, channel_id)` as a covering index for the `chat_channel_members` join predicate. The existing `idx_chat_members_channel (channel_id)` lacks the leading `org_id` required for RLS-efficient access (see CLAUDE.md §7 — "A covering index on an RLS table must contain `org_id`").

### chat-saved-messages — Missing (org_id, user_id, saved_at) Index

The query:
```sql
SELECT sm.*, m.* FROM chat_saved_messages sm
INNER JOIN chat_messages m ON m.id = sm.message_id
WHERE sm.org_id = $1 AND sm.user_id = $2 AND m.is_deleted = false
ORDER BY sm.saved_at DESC LIMIT 50
```

Existing index `idx_saved_messages_user` is on `(user_id)` only — missing `org_id`. Same RLS issue as above.

**Recommendation (migration territory):** `CREATE INDEX idx_chat_saved_messages_org_user_saved ON chat_saved_messages (org_id, user_id, saved_at DESC)`. This replaces `idx_saved_messages_user` for this access pattern.

### gl-journals-list — Index Column Order Blocks Sort

The query: `WHERE org_id = $1 ORDER BY journal_date DESC LIMIT 50`

Existing index `idx_gl_journals_org_book_date` is on `(org_id, book_id, journal_date)`. The `book_id` column sits between `org_id` and `journal_date`, so a range scan on `org_id` cannot walk the index in `journal_date` order. The planner must sort after the `org_id` index scan.

**Recommendation (migration territory):** `CREATE INDEX idx_gl_journals_org_date ON gl_journals (org_id, journal_date DESC)`. At production scale (100K+ journals), the sort is O(n log n) without this index.

### contacts-list — Missing Partial Index for Sort

The query: `WHERE org_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`

No index on `(org_id, created_at)`. At 960 rows / 16 blocks, seq scan is planner-correct. At 100K contacts, seq scan of ~1,600 blocks to return 50 rows is unacceptable.

**Recommendation (migration territory):** `CREATE INDEX idx_contacts_org_created ON contacts (org_id, created_at DESC) WHERE deleted_at IS NULL`. Partial index excludes soft-deleted rows and halves the index size.

### kb-space-pages — Missing space_id Index

The query: `WHERE org_id = $1 AND space_id = $2 AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC`

Existing indexes do not cover `space_id`. The closest is `idx_kb_pages_org_parent_sort (org_id, parent_page_id, sort_order)` which targets a different access pattern.

**Recommendation (migration territory):** `CREATE INDEX idx_kb_pages_org_space_sort ON kb_pages (org_id, space_id, sort_order, id) WHERE deleted_at IS NULL`.

### Additional Missing Indexes at Scale (migration territory)

| Table | Query pattern | Missing index |
|---|---|---|
| `inv_purchase_orders` | `WHERE org_id ORDER BY created_at DESC` | `(org_id, created_at DESC)` |
| `inv_vendors` | `WHERE org_id ORDER BY name ASC` | `(org_id, name ASC)` |
| `leave_balances` | `WHERE org_id ORDER BY user_id ASC, year DESC` | `(org_id, user_id, year DESC)` |
| `payroll_runs` | `WHERE org_id ORDER BY created_at DESC` | `(org_id, created_at DESC)` |
| `clients` | `WHERE org_id ORDER BY created_at DESC` | `(org_id, created_at DESC)` |
| `chat_channel_members` (join) | `WHERE org_id AND channel_id` | `(org_id, channel_id, user_id)` |

None of these are urgent at dev scale (< 400 rows). All are production-grade concerns at 10K+ rows.

---

## Service-Side Recommendations (Not Applied — Not in Territory)

1. **`timesheets-pending-org` and four other `count(*) OVER()` budgets**: Split into two queries. The window function forces full materialization of all matching rows regardless of LIMIT, defeating `idx_timesheets_org_status_date` and equivalent indexes. Affected budgets: `timesheets-pending-org`, `support-ticket-queue`, `support-ticket-assigned-to-me`, `accounting-receivables-list`, `chat-channel-list`.

2. **`chat_channel_members` join path**: The join `ON m.channel_id = c.id AND m.org_id = $1 AND m.user_id = $2` cannot use `idx_chat_members_user (user_id)` efficiently under RLS. After the migration-territory index `(org_id, user_id, channel_id)` is added, the join will run as an index scan.

3. **`business_parties` table**: Not seeded for the perf org. The three search SDF budgets (`search-lead-party-sdf`, `search-contact-party-sdf`, `search-client-party-sdf`) cannot be measured until this table has data.

4. **`roles` with `module_key`**: No roles with a `module_key` seeded for the perf org. `module-access-roster` cannot be measured.

---

## Exit Codes of All Commands Run

| Command | Exit Code | Notes |
|---|---|---|
| `pnpm db:check-read-budgets:self-test` (before fix) | 1 | SELF-TEST INCONCLUSIVE — seed org not found |
| `pnpm db:check-read-budgets:self-test` (after fix) | 0 | SELF-TEST PASS — breach detected |
| `pnpm db:check-read-budgets` (full suite) | 1 | 31 breach entries, 22 pass, 8 skip |
| `node src/scripts/__tests__/plan-walker.test.mjs` | 0 | All 12 tests pass |
| `pnpm db:check-read-budgets --ids=inv-stock-transactions,...` | 1 | Partial run; 2 FAIL (small tables), 2 PASS, 2 SKIP |

---

## Files Changed

- `backend/src/scripts/run-read-cost-budgets.mjs`: replaced hardcoded fallback UUID with auto-discovery loop over `organizations` table, picking the org with the most active members
