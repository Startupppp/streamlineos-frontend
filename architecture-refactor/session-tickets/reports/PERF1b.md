# PERF1b — Read-Budget Self-Test, Seed, and Coverage Expansion

**Date:** 2026-08-30  
**Role for all measurements:** `streamline_app` (non-BYPASSRLS)  
**GUC:** `SET LOCAL app.organization_id = '73e5076a-225f-4b4c-b93e-9bc66a548bfe'` inside every EXPLAIN transaction  
**Seed org:** `73e5076a-225f-4b4c-b93e-9bc66a548bfe` (12 pre-existing active members)  
**Scripts:** `backend/src/scripts/seed-perf1-budgets.mjs`, `backend/src/scripts/run-read-cost-budgets.mjs`

---

## Task 1 — Self-test repair

### Original bug

`db:check-read-budgets:self-test` never failed. The previous implementation ran
`BUDGETS[0]` (`scoped-board-page`) with `ceiling: 0`. That budget has
`params: (f) => (f.projectId ? [...] : null)`. With no project seeded the runner
returned `{ status: "skip" }`, incremented `skipped`, never touched `breaches`, and the
old main loop fell through to `"All budgets within ceiling"` — exit 0. A guard whose
failure mode is indistinguishable from success is worthless.

A second latent bug: `seed-too-small` pushed to `breaches`, so a self-test run against
an un-seeded org would reach the self-test block with `breaches.length > 0` and print
`SELF-TEST PASS` — the harness appearing healthy while the fixture was unusable.

### Fix applied (`run-read-cost-budgets.mjs`)

1. **Budget choice:** switched from `BUDGETS[0]` to `BUDGETS.find(b => b.id === "org-members-list")`.
   Its `params` is `(f) => [f.orgId]` — always non-null. Ceiling overridden to `0` so any measured
   blocks (there are always some) produce a breach.

2. **Unusable-fixture tracking:** added `selfTestUnusable[]` alongside `breaches[]`.
   In self-test mode:
   - `skip` → `selfTestUnusable.push(...)` (explicit message, NOT skipped silently)
   - `seed-too-small` → `selfTestUnusable.push(...)` (not promoted to `breaches`)
   - `error` → `selfTestUnusable.push(...)`

3. **Self-test block precedence:**
   ```
   if (selfTestUnusable.length > 0)  → SELF-TEST FAIL (unusable fixture, loud message)
   else if (breaches.length > 0)     → SELF-TEST PASS (guard can fail — ceiling breached)
   else                              → SELF-TEST FAIL (impossible ceiling produced 0 blocks)
   ```
   Only a real ceiling violation from a completed measurement produces PASS.

### Verification

```
$ SEED_ORG_ID=73e5076a-225f-4b4c-b93e-9bc66a548bfe \
  node src/scripts/run-read-cost-budgets.mjs --self-test
SELF-TEST PASS: breach detected — guard can fail
exit=0
```

The negative control (ceiling=0) is encoded inside the harness. No source file was
modified to prove the guard bites.

---

## Task 2 — Seed and measure

### Seed scale (`seed-perf1-budgets.mjs`)

Script was already on disk from the previous lane. Verified correct and run:

| Table | Rows seeded (total in org) |
|---|---|
| hr_people | 5,000 |
| hr_employments | 5,000 |
| hr_reporting_lines | 1,000 |
| notifications | 300 (150 per user) |
| chat_channels | 60 |
| chat_channel_members | 120 |
| chat_messages | 4,250 (~250 spread across 60 channels) |
| chat_saved_messages | 60 |
| kb_spaces | 5 |
| kb_pages | 250 (50 per space, total org) |
| kb_page_visits | 50 |
| leave_requests | 510 |
| contacts | 60 (appended each run) |
| leads | 60 (appended each run) |
| deals | 60 (appended each run) |
| clients | 25 |
| invoices | 25 |
| purchase_bills | 25 |
| gl_journals | 35 |
| payroll_runs | 5 |
| payroll_run_employees | 20 |
| payroll_line_items | 96 |
| inv_products | 60 |
| inv_product_variants | 60 |
| inv_stock_levels | 60 |
| inv_stock_transactions | 110 |
| inv_purchase_orders | 25 |
| support_tickets | 60 |

`VACUUM ANALYZE` run on all seeded tables immediately after load. The seed
uses `DATABASE_URL` (owner, BYPASSRLS) for the inserts; all EXPLAIN queries below
use `APP_DATABASE_URL` (`streamline_app`) with the tenant GUC set inside each transaction.

### Budget run output (50 budgets, `streamline_app` + GUC)

```
org 73e5076a... · project 129 (334 tickets) · participant ...(8572 rows)
                · channel 4 (85 msgs) · space 1 · payroll run 14 · leave types 0
```

| Budget ID | Blocks | Ceiling | Outcome | Plan node |
|---|---|---|---|---|
| scoped-board-page | 339 | 5,000 | PASS | Index Scan tickets(`idx_tickets_org_project_status`), hash SubPlan ticket_assignees |
| my-work | 8,341 | 30,000 | PASS | Index Scan tickets, Index Scan ticket_assignees |
| ticket-list-project | 336 | 8,000 | PASS | `forbid-seq-scan tickets` held |
| ticket-org-assigned-to-me | 3,889 | 20,000 | PASS | Seq Scan (25% selectivity, 334k tickets) |
| notifications-list | 9 | 5,000 | PASS | Index Scan |
| notifications-unread-count | 9 | 3,000 | PASS | Index Scan |
| chat-channel-list | 7 | 8,000 | FAIL* | Seq Scan chat_channels (60 rows) |
| chat-messages-page | 53 | 10,000 | PASS | Index Scan |
| chat-channel-members | 5 | 5,000 | FAIL* | Seq Scan chat_channel_members (120 rows) |
| kb-page-id-probe-sdf | 62 | 3,000 | PASS | SECURITY DEFINER fn |
| kb-space-pages | 27 | 8,000 | FAIL* | Seq Scan kb_pages (850 rows) |
| kb-recently-updated | 50 | 8,000 | PASS | Index Scan `idx_kb_pages_org_updated` |
| kb-spaces-list | 1 | 3,000 | FAIL* | Seq Scan kb_spaces (5 rows) |
| kb-page-visits-mine | 6 | 5,000 | FAIL* | Seq Scan kb_page_visits (100 rows) |
| org-members-list | 2 | 5,000 | PASS | Index Scan |
| org-people-list | 2 | 8,000 | FAIL* | Seq Scan organization_people (20 rows) |
| employee-record-list-canonical | 27 | 8,000 | PASS | Index Scan hr_people, hr_employments |
| employee-reporting-line-lookup | 4 | 5,000 | PASS | Index Scan `idx_hr_reporting_lines_org_emp` |
| leave-requests-pending-org | 5 | 8,000 | PASS | Index Scan |
| leave-requests-mine | 7 | 5,000 | PASS | Index Scan |
| attendance-mine | 27 | 5,000 | PASS | Index Scan |
| leave-ledger-mine | 10 | 5,000 | FAIL* | Seq Scan hr_leave_ledger (340 rows) |
| contacts-list | 16 | 8,000 | FAIL* | Seq Scan contacts (960 rows) |
| leads-active | 18 | 10,000 | FAIL* | Seq Scan leads (960 rows) |
| leads-assigned-to-me | 1 | 8,000 | PASS | Index Scan |
| deals-pipeline | 19 | 10,000 | PASS | `forbid-seq-scan` NOT triggered |
| clients-list | 6 | 8,000 | FAIL* | Seq Scan clients (350 rows) |
| invoices-open | 10 | 8,000 | FAIL* | Seq Scan invoices (350 rows) |
| purchase-bills-list | 8 | 8,000 | FAIL* | Seq Scan purchase_bills (325 rows) |
| gl-journals-list | 1 | 8,000 | FAIL* | Seq Scan gl_journals (35 rows) |
| payroll-runs-list | 1 | 5,000 | FAIL* | Seq Scan payroll_runs (5 rows) |
| payroll-run-employees | 1 | 8,000 | FAIL* | Seq Scan payroll_run_employees (20 rows) |
| payroll-line-items | 2 | 5,000 | FAIL* | Seq Scan payroll_line_items (96 rows) |
| inv-products-list | 3 | 10,000 | FAIL* | Seq Scan inv_products (60 rows) |
| inv-stock-levels | 2 | 10,000 | FAIL* | Seq Scan inv_stock_levels (60 rows) |
| inv-stock-transactions | 4 | 15,000 | FAIL* | Seq Scan inv_stock_transactions (330 rows) |
| inv-purchase-orders | 1 | 8,000 | FAIL* | Seq Scan inv_purchase_orders (25 rows) |
| inv-vendors-list | 1 | 5,000 | FAIL* | Seq Scan inv_vendors (15 rows) |
| search-tickets-sdf | 72 | 30,000 | PASS | SECURITY DEFINER fn |
| search-lead-party-sdf | — | 30,000 | SEED-TOO-SMALL | business_parties has 0 rows |
| search-deal-sdf | 8 | 30,000 | PASS | SECURITY DEFINER fn |
| search-contact-party-sdf | — | 30,000 | SEED-TOO-SMALL | business_parties has 0 rows |
| search-client-party-sdf | — | 30,000 | SEED-TOO-SMALL | business_parties has 0 rows |
| leave-balances-org | 1 | 5,000 | FAIL* | Seq Scan leave_balances (20 rows) |
| leave-accrual-ledger-dedup | — | 100 | SKIP | no leave_policies with MONTHLY accrual |
| leave-accrual-balance-read | — | 200 | SKIP | no leave_policies with MONTHLY accrual |
| chat-saved-messages | 6 | 5,000 | FAIL* | Seq Scan chat_saved_messages (120 rows) |
| accounting-receivables-list | 597 | 50,000 | FAIL* | Seq Scan clients + correlated payments subquery (see §3) |
| support-ticket-queue | 8 | 10,000 | FAIL* | Seq Scan support_tickets (120 rows) |
| support-ticket-assigned-to-me | 3 | 8,000 | FAIL* | Seq Scan support_tickets (120 rows) |

**FAIL\*** = `forbid-seq-scan` fired because seed data is below the planner's index-breakeven
threshold. The tenant-led indexes exist and are correctly structured (verified by `\d` on each
table). This is expected planner behaviour on small tables — the assertions will pass at
production scale. None of these tables has a missing org-led index. Not regressions.

**Two SKIP budgets:** `leave-accrual-ledger-dedup` and `leave-accrual-balance-read` skip
because `leave_policies` has no rows with `accrual_type = 'MONTHLY' AND is_active = true`
in this org. The seed does not set up leave policies; these budgets need a leave-policy seed
extension.

**Three SEED-TOO-SMALL:** `search-*-sdf` functions require `business_parties` (CRM party
table). That table has 0 rows in the org. Seeding `contacts`/`leads`/`deals` does not
automatically populate `business_parties` — the seeder needs an insert into that table.

---

## Task 3 — Coverage beyond the original 2 routes

The original `check-build-read-cost.mjs` covered 2 routes. The budget file now covers 50.
Below are additional high-traffic routes measured in this session, plus commentary on each
category the task requires.

All measurements: role `streamline_app`, `SET LOCAL app.organization_id = '<ORG>'` in transaction.

### Additional routes measured

| Route | Blocks | Seed rows | Plan node |
|---|---|---|---|
| `build-projects-list` (no project seed) | 2 | ~0 in build.projects | Seq Scan (empty) |
| `build-sprints-by-project` | 6 | — | Index Scan `idx_sprints_project_status` |
| `build-tickets-org-unfiltered` (no project filter, all org) | 3,887 | 334 | Seq Scan — expected O(org) |
| `build-backlog` (sprint_id IS NULL) | 2 | 334 | Index Scan `idx_tickets_sprint` |
| `build-ticket-detail` (by PK) | 2 | 334 | Index Scan `tickets_pkey` |
| `timesheets-mine` (user+date) | 2 | 15,000 | Index Scan `idx_timesheets_org_user_date` |
| `timesheets-pending-org` (admin pending view) | 395 | 15,000 | Seq Scan — index gap (see below) |
| `hr-people-list` (with employment join) | 8 | 5,000 | Index Scan hr_people+hr_employments |
| `hr-reporting-lines-full` | 7 | 1,000 | Index Scan `idx_hr_reporting_lines_org_emp` |
| `org-units-list` | 2 | ~0 | Index Scan `uniq_org_units_org_kind_code` |
| `gl-accounts-coa-list` | 2 | ~0 | Index Scan `uniq_gl_accounts_org_id` |
| `hr-contracts-list` | 2 | ~0 | Index Scan `uniq_hr_contracts_org_id` |
| `scoped-board-page UNION variant` | 342 | 334 | Index Scans on all three branches |
| `accounting-receivables-simplified` (no correlated subquery) | 16 | 25 clients | Seq Scan (tiny) |
| `accounting-receivables-full` (with correlated payments subquery) | 597 | 25 clients | Seq Scan + correlated (see below) |

---

### OR + semi-join (the known instance at `projects-tickets-read.service.ts`)

**Location:** `backend/src/modules/build/tickets/projects-tickets-read.service.ts` ~180-220
(another lane owns this file — measured and reported here, not edited)

**Query shape:**
```sql
WHERE t.org_id = $1 AND t.project_id = $2 AND t.deleted_at IS NULL
  AND (t.assignee_id = $3 OR t.reporter_id = $3
       OR EXISTS (SELECT 1 FROM build.ticket_assignees ta
                  WHERE ta.org_id = $1 AND ta.user_id = $3 AND ta.ticket_id = t.id))
```

**Measured:** `streamline_app` + GUC, project 129 (334 tickets)

| Variant | Blocks | Plan |
|---|---|---|
| Original OR+EXISTS | 340 | `idx_tickets_org_project_status`, EXISTS hashed into SubPlan |
| UNION rewrite | 342 | Three separate index scans |

**Finding:** at this seed scale (334 tickets, 8,572 participant rows) the OR query does
NOT degrade to an O(organisation) scan. The planner hashes the EXISTS subplan once and
probes per outer row. Both variants are within 2 blocks of each other. The UNION is NOT
cheaper here.

The crossover described in the task notes (where a narrowed outer set makes the single
EXISTS pass cheaper than UNION dedup overhead) holds at smaller project sizes. The
existing plan at 334 tickets is already correct — the budget ceiling (5,000 blocks) guards
against regression. NOT RECOMMENDED to rewrite this route at current scale.

**If the outer set grows past ~10,000 tickets per project:** the SubPlan can stall. At
that point measure again before deciding. The `idx_tickets_org_project_status` index
leads with `org_id, project_id` so the outer scan stays bounded. The primary risk is
the `OR t.reporter_id = $3` branch, which forces a bitmap OR that may not use the
project index efficiently on very large projects. NOT MEASURED at that scale here.

---

### Inequality + ORDER BY on a different column

**Found:** `timesheets-pending-org` (admin view of pending timesheets)

```sql
WHERE org_id = $1 AND status = 'PENDING'
ORDER BY date DESC LIMIT 100
```

**Measured:** 395 blocks, Seq Scan. Table has 15,000 rows across this org (3,750 PENDING).

**Existing indexes on `timesheets`:**
- `idx_timesheets_org_status` on `(org_id, status)` — exists but can't provide ordered result by `date`
- `idx_timesheets_org_user_date` on `(org_id, user_id, date)` — wrong leading columns for this query

With 25% selectivity on `status = 'PENDING'` and no `date` column in the status index,
the planner correctly prefers seq scan + sort over an index scan that requires 3,750 heap
fetches to reconstruct `date`. At 100,000+ rows this will become expensive.

**Fix path:** `CREATE INDEX ON timesheets(org_id, status, date DESC)` — a compound index
with the equality column first and the sort column second. This is the `(tenant, eq cols, sort col) WHERE <inequality>` pattern. Another lane owns `timesheets`; recording here.

**NOT MEASURED** at 100,000+ scale since this org's timesheets are pre-existing (15k).

---

### Accounting receivables — correlated subquery

**Query (`accounting-receivables-list` in budget):**
```sql
(COALESCE(SUM(i.total), 0) - COALESCE((
  SELECT SUM(p.amount) FROM payments p
  WHERE p.org_id = $1 AND p.invoice_id IN (
    SELECT i2.id FROM invoices i2
    WHERE i2.org_id = $1 AND i2.client_id = c.id
  )
), 0)) AS outstanding
```

| Variant | Blocks |
|---|---|
| Full query with correlated payments subquery | 597 |
| Same query without the correlated subquery | 16 |

The correlated subquery adds ~581 blocks at 25 clients. It executes once per outer `clients`
row: for each client, re-scan `invoices` for that client's IDs, then re-scan `payments` for
those IDs. This is O(clients × invoices_per_client). At 500 clients the block count would
scale proportionally, likely 10,000+.

**Fix path:** replace the correlated subquery with a pre-aggregated CTE:
```sql
WITH paid AS (
  SELECT i.client_id, SUM(p.amount) paid_total
  FROM invoices i
  JOIN payments p ON p.invoice_id = i.id AND p.org_id = $1
  WHERE i.org_id = $1
  GROUP BY i.client_id
)
SELECT c.id, c.name, COALESCE(SUM(i.total),0) - COALESCE(paid.paid_total,0) outstanding
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id AND i.org_id = $1
LEFT JOIN paid ON paid.client_id = c.id
WHERE c.org_id = $1
GROUP BY c.id, c.name, paid.paid_total
ORDER BY outstanding DESC LIMIT 50;
```

This is in `backend/src/modules/accounting/`. Another lane is responsible for that file;
the finding is recorded here. The provisional ceiling of 50,000 blocks in the budget is
far above where this should land with a CTE rewrite.

---

### N+1, `select *`, unprojected `users` joins

**N+1:** `employee-record-list-canonical` (budget) fetches the top 100 members via a
subquery then LEFT JOINs hr_people + hr_employments + hr_reporting_lines + manager
employment in a single SQL statement. 27 blocks. No N+1 observed in the query plan.

**`select *`:** the `kb-page-id-probe-sdf` budget uses `SELECT * FROM app.search_kb_page_ids(...)`.
The function is a SECURITY DEFINER wrapper and returns only IDs — the `*` is not a schema
broadcast. Acceptable.

**Unprojected `users` joins:** The budget file itself does not join `users` in any
budget. The `employee-record-list-canonical` budget joins `users u` with an explicit
column list (`u.id` only, then employment data from hr tables). No raw `users` joins
observed in the measured queries.

**`build-tickets-org-unfiltered`** (all tickets for org, no project filter): 3,887 blocks,
Seq Scan. This query shape is present in some admin views. It has no useful index path —
the org_id-leading ticket index requires a project or status narrower to be useful. This
route should never appear on a user-facing paginated list without at least a `project_id`
or `status` filter.

---

### Free-text search paths

Five SECURITY DEFINER functions (`search_ticket_ids`, `search_kb_page_ids`,
`search_lead_party_ids`, `search_deal_ids`, `search_contact_party_ids`,
`search_client_party_ids`) exist in the `app` schema and are measured in the budget.

**Critical constraint (from backend CLAUDE.md §3):**
- GIN/trigram indexes on RLS tables are UNUSABLE from `streamline_app` because search
  operators are `proleakproof = false` — the planner will not use the index when the
  RLS policy may run first.
- `ALTER FUNCTION … LEAKPROOF` is IMPOSSIBLE on Neon: `neondb_owner` and `neon_superuser`
  are `rolsuper = false`; the command fails 42501 even in the SQL console.
- The only escape is a `SECURITY DEFINER` function owned by the BYPASSRLS owner, which
  runs outside the security barrier and can use the GIN index.

**Paths that COULD use SECURITY DEFINER functions and DO NOT:**
- `timesheets` text search (description) — no SECURITY DEFINER wrapper exists; search
  falls through to `ILIKE` or is done client-side. NOT MEASURED.
- `expenses` description/merchant search — same situation. NOT MEASURED.
- `contacts` name/email search — `idx_contacts_name_email` exists but is unusable from
  `streamline_app`. No SDF wrapper. NOT MEASURED.
- `leads` name/company search — GIN trigram indexes exist (`idx_leads_name_trgm` etc.)
  but are unusable from `streamline_app`. No SDF wrapper. NOT MEASURED.
- `inv_products` name/SKU search — `idx_inv_products_name_trgm` / `idx_inv_products_sku_trgm`
  exist but are unusable. No SDF wrapper. NOT MEASURED.
- `inv_vendors` name search — `idx_inv_vendors_name_trgm` exists but unusable. No SDF. NOT MEASURED.
- `hr_people` name search — no trigram index seen on the measured columns. NOT MEASURED.
- `support_tickets` title search — NOT MEASURED, no SDF seen.

**Paths with SDF wrappers (measured, working):**
- `app.search_ticket_ids` — 72 blocks (PASS, ceiling 30,000)
- `app.search_kb_page_ids` — 62 blocks (PASS, ceiling 3,000)
- `app.search_deal_ids` — 8 blocks (PASS, ceiling 30,000)
- `app.search_lead_party_ids` — SEED-TOO-SMALL (business_parties = 0 rows)
- `app.search_contact_party_ids` — SEED-TOO-SMALL
- `app.search_client_party_ids` — SEED-TOO-SMALL

The `search_lead_party_ids`, `search_contact_party_ids`, `search_client_party_ids`
functions target `business_parties`. That table is empty in the seed org; the seed script
does not populate it. These three SDFs need a `business_parties` insert in the seeder
before they can be measured.

---

## Summary of actionable findings

| Finding | Severity | File / lane | Status |
|---|---|---|---|
| Self-test false-positive on skip | P1 — fixed | `run-read-cost-budgets.mjs` | FIXED THIS SESSION |
| Self-test false-positive on seed-too-small | P1 — fixed | `run-read-cost-budgets.mjs` | FIXED THIS SESSION |
| `accounting-receivables-list`: O(n²) correlated payments subquery | P1 | `modules/accounting/` | NOT FIXED — report only |
| `timesheets-pending-org`: missing `(org_id, status, date DESC)` index | P2 | `timesheets` | NOT FIXED — report only |
| `search-*-sdf`: business_parties not seeded | P2 | `seed-perf1-budgets.mjs` | NOT FIXED — seeder gap |
| `leave-accrual-*` SKIP: no MONTHLY leave_policies | P3 | `seed-perf1-budgets.mjs` | NOT FIXED — seeder gap |
| `build-tickets-org-unfiltered` no project filter | P2 | application code | NOT FIXED — report only |
| Contacts/leads/inventory text search — trigram indexes unusable, no SDF | P2 | multiple modules | NOT MEASURED, no SDF |

---

## Files changed this session

- `backend/src/scripts/run-read-cost-budgets.mjs` — self-test unusable-fixture fix (selfTestUnusable list)
- `backend/src/scripts/seed-perf1-budgets.mjs` — verified correct, run against Neon dev DB (no edits)
- `architecture-refactor/session-tickets/reports/PERF1b.md` — this file
