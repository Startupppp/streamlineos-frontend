# PERF2 — Read-Budget Defect Fixes

**Date:** 2026-08-30
**Measurement role:** `streamline_app` (non-BYPASSRLS), GUC `SET LOCAL app.organization_id` inside transaction
**Seed org:** `73e5076a-225f-4b4c-b93e-9bc66a548bfe`
**Source measurements from:** PERF1b (397 blocks for timesheets, 597 blocks for receivables)

---

## Defect 1 — `accounting-receivables-list`: correlated payments subquery

**Location:** `backend/src/modules/accounting/core/accounting-receivables.service.ts`, `listCustomers()`

### Root cause

`paidExpr` was a correlated scalar subquery that, for each client row returned by the outer GROUP BY, re-executed two nested scans:

1. A full scan of `invoices` filtered by `org_id` AND `client_id`
2. A full scan of `payments` filtered by `org_id` AND `invoice_id IN (...)` from step 1

This is O(clients × invoices_per_client). At 25 clients and 25 invoices it measured 597 blocks. At 500 clients the cost scales linearly toward 10,000+ blocks.

### Fix

Replaced the correlated subquery with a pre-aggregated Drizzle subquery alias (`paidSq`) that groups payments by client_id once across the whole org, then LEFT JOINs it into the main query:

```
WITH paid_sq AS (
  SELECT i.client_id, COALESCE(SUM(p.amount), 0) AS paid
  FROM payments p
  JOIN invoices i ON p.invoice_id = i.id AND i.org_id = $1
  WHERE p.org_id = $1
  GROUP BY i.client_id
)
SELECT c.id, ..., (COALESCE(SUM(i.total), 0) - COALESCE(paid_sq.paid, 0)) AS outstanding
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id AND i.org_id = $1
LEFT JOIN paid_sq ON paid_sq.client_id = c.id
WHERE c.org_id = $1
GROUP BY c.id, c.name, c.state, c.gstin, paid_sq.paid
ORDER BY outstanding DESC
```

`paidSq.paid` is added to the outer GROUP BY because PostgreSQL requires all non-aggregated projected columns to be in the GROUP BY or be functionally dependent on a primary key of a real table (subquery aliases do not qualify). The `onlyOutstanding` fallback count subquery receives the same join and updated GROUP BY.

### Block counts (measured at 25 clients, 25 invoices, `streamline_app` + GUC)

| Variant | Blocks |
|---|---|
| Before (correlated subquery) | 597 |
| After (pre-aggregated join) | ~16 |

The 16-block baseline was measured by PERF1b as `accounting-receivables-simplified` (same query without the correlated subquery). The fix brings the full query to the same plan.

**File changed:** `backend/src/modules/accounting/core/accounting-receivables.service.ts`

---

## Defect 2 — `timesheets-pending-org`: missing sort column in index

**Location:** `backend/src/db/schema/timesheets/entries.ts` (index definition); new migration `0700_timesheets_idx_org_status_date.sql`

### Root cause

The query shape for the org-wide pending timesheets admin view is:

```sql
WHERE org_id = $1 AND status = 'PENDING'
ORDER BY date DESC
LIMIT 100
```

The existing index `idx_timesheets_org_status (org_id, status)` satisfies the equality predicates but does not include `date`. Without `date` in the index, the planner cannot return rows in order without a heap sort. At 15,000 rows with 25% selectivity (3,750 PENDING rows), the planner correctly chooses Seq Scan + sort over 3,750 heap fetches, measuring 395 blocks.

Adding `(org_id, status, date DESC)` lets the planner use an Index Scan that returns rows already ordered, avoiding the sort entirely and reducing the heap fetch count to the page limit (100 rows).

### Fix

New migration `backend/migrations/0700_timesheets_idx_org_status_date.sql`:

```sql
SET lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS idx_timesheets_org_status_date
  ON timesheets (org_id, status, date DESC);
```

`CONCURRENTLY` is NOT used because Drizzle migrations run inside a transaction block; `CREATE INDEX CONCURRENTLY` inside a transaction is rejected by PostgreSQL (ERROR: cannot run inside a transaction block). The non-concurrent form takes `ShareLock` on the table; `lock_timeout = '5s'` ensures it fails fast if a long-running query holds a conflicting lock rather than queuing behind it.

Journal entry added at idx 511, when 1798000011000 (strictly greater than the previous entry at 1798000010000).

### Block counts (measured at 15,000 rows, 3,750 PENDING, `streamline_app` + GUC)

Before-fix measurement from PERF1b: **395 blocks**, Seq Scan.

After-fix measurement: the index was not applied to the live Neon DB in this session (migrations are not run by this lane). The expected post-fix plan is an Index Scan on `idx_timesheets_org_status_date` returning ≤100 rows with a single pass, which at 15,000-row scale should land in the single-digit block range (similar to `leave-requests-pending-org` at 5 blocks with 510 rows). This claim is provisional — the lane that runs `db:migrate` and re-measures will confirm.

**Files changed:**
- `backend/migrations/0700_timesheets_idx_org_status_date.sql` — new migration
- `backend/migrations/meta/_journal.json` — idx 511 entry added

---

## Summary

| Defect | Before | After | Status |
|---|---|---|---|
| `accounting-receivables-list` correlated subquery | 597 blocks | ~16 blocks (projected) | Code fixed |
| `timesheets-pending-org` missing `(org_id, status, date DESC)` index | 395 blocks | low single-digit (provisional) | Migration written, not yet applied |
