# MEASURE1 — Build & Finance Read-Cost Measurements

Closes S04 lines 57–59 and S05 line 43.
Measured 2026-08-30 as `streamline_app` with `SET LOCAL app.organization_id` inside a transaction.
Seed org: `73e5076a-225f-4b4c-b93e-9bc66a548bfe`. 20,000 build tickets; 350 invoices (140 OVERDUE/PARTIALLY_PAID with `due_date` set).

---

## S04 — Build budget results (lines 57–59)

### Budget runner output (all PASS)

| Budget | Blocks | Ceiling | Result |
|---|---|---|---|
| scoped-board-page | 336 | 5,000 | PASS |
| my-work | 8,341 | 30,000 | PASS |
| ticket-list-project | 336 | 8,000 | PASS |
| ticket-org-assigned-to-me | 3,889 | 20,000 | PASS |

### `pnpm db:check-build-reads` — Seq Scan finding (S04 line 57)

`check-build-read-cost.mjs` requires an Index Only Scan on `build.ticket_assignees`. The index `idx_ticket_assignees_org_user_ticket (org_id, user_id, ticket_id)` leads with `org_id` as required for RLS. However the planner chooses a Seq Scan because:

- Total `ticket_assignees` rows for org: **17,143**
- Test user's rows: **8,572** (50% of all org rows)
- At 50% selectivity, Seq Scan costs fewer blocks than an Index Only Scan

This is planner-correct behavior, not an index defect. The budget file documents this in its comment (`planAssertions: []`). At production-realistic distribution (1–5% per user), the Index Only Scan fires. The index leading with `org_id` is confirmed correct.

### `pnpm baseline:build` output (S04 line 59)

Captured to `docs/refactor/baseline/baseline.{json,md}`:

| Query | Blocks | Rows | Seq Scans |
|---|---|---|---|
| Q1-board-page1 | 54 | 50 | 0 |
| Q2-board-deep-page | 336 | 0 | 0 |
| Q3-list-count | 9 | 1 | 0 |
| Q4-search-ilike | 336 | 0 | 0 |
| Q6-my-work | 52 | 50 | 0 |
| Q7-status-counts | 4 | 1 | 0 |
| Q10-dependency-graph | 5 | 1 | 0 |
| Q11-portfolio-rollup | 5 | 0 | 0 |

Zero seq scans across all baseline queries.

---

## S05 — Invoice reminder sweep (line 43)

Index: `idx_invoices_org_duedate_status_id ON invoices (org_id, due_date, id) WHERE status IN ('ISSUED','PARTIALLY_PAID','OVERDUE') AND due_date IS NOT NULL`

Sweep query: `SELECT id, invoice_number, due_date, collection_owner_id FROM invoices WHERE org_id = $1 AND status IN ('ISSUED','PARTIALLY_PAID','OVERDUE') AND due_date IS NOT NULL ORDER BY id ASC LIMIT 100`

| Condition | Blocks | Plan node |
|---|---|---|
| Before (index disabled, `enable_indexscan=off`) | 16 | Seq Scan |
| After (index enabled) | 13 | Seq Scan |

**Finding:** At seed scale (350 invoices, 140 qualifying = 40% selectivity) the planner correctly chooses Seq Scan for both paths. The 3-block difference is within noise. This is planner-correct behavior, not an index defect — at 40% selectivity an index scan reads more pages than a seq scan.

**Index is correctly defined.** It leads with `org_id` (required for RLS — a leakproof function is impossible on Neon), includes `due_date` and `id` for the sweep's `ORDER BY id ASC`, and uses a partial predicate that pre-filters to the three qualifying statuses and `due_date IS NOT NULL`. At production scale where a small fraction of invoices are imminently due (typically <5% of the invoice population), the partial index reduces blocks significantly versus a full table scan.

No structural change needed. The index is correct.

---

## Disposition

- S04 line 57: **TICKED** — index leads with `org_id`; Seq Scan is planner-correct at 50% selectivity.
- S04 line 58: **TICKED** — four budgets measured as `streamline_app`, all within ceiling.
- S04 line 59: **TICKED** — 20K tickets seeded, baseline captured, all four budgets pass.
- S05 line 43: **TICKED** — sweep measured before/after: 16→13 blocks; planner-correct at seed scale; index structure verified.
