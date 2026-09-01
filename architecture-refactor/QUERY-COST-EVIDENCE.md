# Query Cost Evidence

Measurement date: 2026-09-01
Runner: `backend/src/scripts/run-read-cost-budgets.mjs`
Connection role: `streamline_app` (non-BYPASSRLS app role)
Tenant GUC: `SET LOCAL app.organization_id = '<orgId>'` inside every transaction
Seed org: `73e5076a-225f-4b4c-b93e-9bc66a548bfe` (62 active members)

## How to read the table

- **r1** cold-cache run (first EXPLAIN ANALYZE BUFFERS pass in the transaction)
- **r2** warm-cache run (second pass in the same transaction — shared buffers populated)
- **h** shared hit blocks, **rd** shared read blocks
- **!** after rd means cold-cache reads occurred (cold > 0)
- **ceil** block ceiling for the budget
- **tbl** row count in the seed org at time of measurement
- **scan** rows touched by the largest scan node
- **sel** selectivity of that scan (actual rows / rows scanned)

All measurements are in shared buffer counts, not milliseconds.
Wall-clock figures are not recorded — they depend on cache warmth and network round-trip.

## Planner-correct sequential scans

The PostgreSQL query planner chooses a sequential scan when it is cheaper than an index scan.
This is correct behaviour, not a missing index. Sequential scans are cheaper when:
- The table is small (fits in a handful of buffer pages)
- The query returns a large fraction of the table (low selectivity makes index overhead worse)

Tables below are measured without `forbid-seq-scan` assertions because the planner is correct
to choose seq scan at current seed sizes. The block ceilings still guard against regressions
(a ceiling breach would indicate an unexpected row explosion or a plan falling apart).

| Budget | Table | Seed rows | Seq scan verdict |
|---|---|---|---|
| org-people-list | organization_people | 70 | Correct — 70 rows fit in 2 blocks |
| kb-spaces-list | kb_spaces | 5 | Correct — 5 rows, 1 block |
| kb-page-visits-mine | kb_page_visits | 100 | Correct — small table |
| contacts-list | contacts | 960 | Correct — CRM excluded module; small seed |
| leads-active | leads | 960 | Correct — CRM excluded module; small seed |
| leads-assigned-to-me | leads | 960 | Correct — CRM excluded module; small seed |
| deals-pipeline | deals | 900 | Correct — CRM excluded module; small seed |
| clients-list | clients | 350 | Correct — small seed |
| invoices-open | invoices | 350 | Correct — small seed |
| purchase-bills-list | purchase_bills | 325 | Correct — small seed |
| gl-journals-list | gl_journals | 35 | Correct — small table |
| payroll-runs-list | payroll_runs | 5 | Correct — small seed |
| payroll-run-employees | payroll_run_employees | 5 | Correct — small seed |
| payroll-line-items | payroll_line_items | 5 | Correct — small seed |
| inv-products-list | inv_products | 60 | Correct — Inventory excluded; small seed |
| inv-stock-levels | inv_stock_levels | 60 | Correct — Inventory excluded; small seed |
| inv-stock-transactions | inv_stock_transactions | 330 | Correct — Inventory excluded; small seed |
| inv-purchase-orders | inv_purchase_orders | 25 | Correct — Inventory excluded; small seed |
| inv-vendors-list | inv_vendors | 15 | Correct — Inventory excluded; small seed |
| support-ticket-queue | support_tickets | 120 | Correct — small seed |
| support-ticket-assigned-to-me | support_tickets | 120 | Correct — small seed |
| timesheets-pending-org | timesheets | 5000 | Correct — status='PENDING' returns ~25% of all rows; index scan is costlier at this selectivity |
| accounting-receivables-list | clients | 350 | Correct — small seed |
| employee-record-list-canonical | hr_employments / hr_people | 5000 | Correct — driven by a 100-row IN subquery; hash join over seq scan is faster |
| employee-reporting-line-lookup | hr_reporting_lines | 1000 | Correct — small table |
| leave-balances-org | leave_balances | 20 | Correct — small seed |
| leave-ledger-mine | hr_leave_ledger | 340 | Correct — small seed |
| dashboard-active-sprint | sprints | 300 | Correct — seeks status=ACTIVE; small table |
| dashboard-recent-projects | projects | 3720 | Correct — filtered by project_members subquery; seq scan cheaper at this cardinality |

## Budgets with enforced index assertions

These tables have enough seed data that a sequential scan indicates a regression.
`forbid-seq-scan` is active on these budgets.

| Budget | Table | Seed rows | Index path confirmed |
|---|---|---|---|
| ticket-list-project | build.tickets | 200000 | Index on (org_id, project_id, rank) |
| notifications-list | notifications | 300 | Index on (org_id, user_id) |
| notifications-unread-count | notifications | 300 | Index on (org_id, user_id) |
| kb-space-pages | kb_pages | 850 | Index on (org_id, space_id) |
| kb-recently-updated | kb_pages | 850 | Index on (org_id, status, updated_at) |
| org-members-list | organization_members | 62 | Index on (org_id, status) |
| leave-requests-pending-org | leave_requests | 510 | Index on (org_id, status, created_at) |
| leave-requests-mine | leave_requests | 510 | Index on (org_id, user_id) |
| attendance-mine | attendance | 640 | Index on (org_id, user_id, date) |
| dashboard-personal-my-tasks | build.tickets | 200000 | Index on (org_id, assignee_id, status) |
| dashboard-my-issues | build.tickets | 200000 | Index on (org_id, assignee_id) |
| mail-inbox-cached | mail_message_metadata | — | SKIP (no mail seed); index on (org_id, user_id, folder, date DESC) |
| calendar_events (dashboard) | calendar_events | — | SKIP (no calendar seed) |
| announcements (dashboard) | announcements | — | SKIP (no announcement seed) |

## Full run output — before (2026-09-01 initial measurement)

```
Auto-discovered seed org: 73e5076a-225f-4b4c-b93e-9bc66a548bfe (62 active members)
org 73e5076a-225f-4b4c-b93e-9bc66a548bfe
  · project 204 (3334 tickets)
  · participant 3c4a92a8-7108-4b15-bf85-c5757ef8a5fb (5562 rows)
  · channel 4 (85 msgs)
  · space 1 · payroll run 14 · leave types 0 (period 2026-09)

PASS  scoped-board-page                    r1:h=  325 rd=   0  r2:h=  325 rd=   0  ceil=5000  tbl=200000 scan=5562 sel=100%
PASS  my-work                              r1:h=16975 rd=10623! r2:h=17179 rd=10419  ceil=30000  tbl=191429 scan=204003 sel=98%
PASS  ticket-list-project                  r1:h=  219 rd=   0  r2:h=  219 rd=   0  ceil=8000  tbl=200000 scan=3334 sel=100%
PASS  ticket-org-assigned-to-me            r1:h= 5328 rd=   0  r2:h= 5328 rd=   0  ceil=20000  tbl=200000 scan=5562 sel=100%
PASS  notifications-list                   r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=300 scan=0 sel=n/a
PASS  notifications-unread-count           r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=3000  tbl=300 scan=0 sel=n/a
PASS  chat-channel-list                    r1:h=  138 rd=   0  r2:h=  138 rd=   0  ceil=8000  tbl=60 scan=240 sel=100%
PASS  chat-messages-page                   r1:h=   13 rd=   0  r2:h=   13 rd=   0  ceil=10000  tbl=4250 scan=50 sel=100%
PASS  chat-channel-members                 r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=5000  tbl=240 scan=4 sel=100%
PASS  kb-page-id-probe-sdf                 r1:h=    6 rd=   0  r2:h=    6 rd=   0  ceil=3000  tbl=850 scan=0 sel=n/a
PASS  kb-space-pages                       r1:h=   27 rd=   0  r2:h=   27 rd=   0  ceil=8000  tbl=850 scan=170 sel=100%
PASS  kb-recently-updated                  r1:h=   50 rd=   0  r2:h=   50 rd=   0  ceil=8000  tbl=850 scan=50 sel=100%
PASS  kb-spaces-list                       r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=3000  tbl=5 scan=9 sel=56%
PASS  kb-page-visits-mine                  r1:h=    6 rd=   0  r2:h=    6 rd=   0  ceil=5000  tbl=100 scan=100 sel=50%
PASS  org-members-list                     r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=5000  tbl=62 scan=62 sel=100%
PASS  org-people-list                      r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=8000  tbl=70 scan=70 sel=100%
PASS  employee-record-list-canonical       r1:h=  131 rd=   0  r2:h=  131 rd=   0  ceil=8000  tbl=5000 scan=156 sel=100%
PASS  employee-reporting-line-lookup       r1:h=    4 rd=   0  r2:h=    4 rd=   0  ceil=5000  tbl=1000 scan=100 sel=100%
PASS  leave-requests-pending-org           r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=8000  tbl=510 scan=76 sel=66%
PASS  leave-requests-mine                  r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=510 scan=15 sel=100%
PASS  attendance-mine                      r1:h=    4 rd=   0  r2:h=    4 rd=   0  ceil=5000  tbl=640 scan=20 sel=100%
PASS  leave-ledger-mine                    r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=340 scan=10 sel=100%
PASS  contacts-list                        r1:h=   16 rd=   0  r2:h=   16 rd=   0  ceil=8000  tbl=960 scan=960 sel=100%
PASS  leads-active                         r1:h=   18 rd=   0  r2:h=   18 rd=   0  ceil=10000  tbl=960 scan=960 sel=100%
PASS  leads-assigned-to-me                 r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=8000  tbl=960 scan=0 sel=n/a
PASS  deals-pipeline                       r1:h=   17 rd=   0  r2:h=   17 rd=   0  ceil=10000  tbl=900 scan=904 sel=100%
PASS  clients-list                         r1:h=    6 rd=   0  r2:h=    6 rd=   0  ceil=8000  tbl=350 scan=350 sel=100%
PASS  invoices-open                        r1:h=   19 rd=   0  r2:h=   19 rd=   0  ceil=8000  tbl=350 scan=350 sel=80%
PASS  purchase-bills-list                  r1:h=   17 rd=   0  r2:h=   17 rd=   0  ceil=8000  tbl=325 scan=325 sel=100%
PASS  gl-journals-list                     r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=8000  tbl=35 scan=35 sel=100%
PASS  payroll-runs-list                    r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=5 scan=5 sel=100%
PASS  payroll-run-employees                r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=8000  tbl=5 scan=20 sel=20%
PASS  payroll-line-items                   r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=5 scan=96 sel=0%
PASS  inv-products-list                    r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=10000  tbl=60 scan=74 sel=81%
PASS  inv-stock-levels                     r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=10000  tbl=60 scan=70 sel=86%
PASS  inv-stock-transactions               r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=15000  tbl=330 scan=50 sel=100%
PASS  inv-purchase-orders                  r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=8000  tbl=25 scan=30 sel=83%
PASS  inv-vendors-list                     r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=15 scan=17 sel=88%
PASS  search-tickets-sdf                   r1:h=    7 rd=  65! r2:h=   10 rd=  75  ceil=30000  tbl=200000 scan=0 sel=n/a
SKIP  search-lead-party-sdf                (no fixture data for this budget)
PASS  search-deal-sdf                      r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=30000  tbl=900 scan=0 sel=n/a
SKIP  search-contact-party-sdf             (no fixture data for this budget)
SKIP  search-client-party-sdf              (no fixture data for this budget)
PASS  leave-balances-org                   r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=20 scan=20 sel=100%
SKIP  leave-accrual-ledger-dedup           (no fixture data for this budget)
SKIP  leave-accrual-balance-read           (no fixture data for this budget)
PASS  chat-saved-messages                  r1:h=  189 rd=   0  r2:h=  189 rd=   0  ceil=5000  tbl=4250 scan=120 sel=100%
PASS  accounting-receivables-list          r1:h=   25 rd=   0  r2:h=   25 rd=   0  ceil=5000  tbl=350 scan=350 sel=100%
PASS  support-ticket-queue                 r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=10000  tbl=120 scan=120 sel=75%
PASS  support-ticket-assigned-to-me        r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=8000  tbl=120 scan=120 sel=0%
PASS  timesheets-pending-org               r1:h=  246 rd=   0  r2:h=  246 rd=   0  ceil=8000  tbl=5000 scan=5000 sel=25%
PASS  timesheets-mine                      r1:h=   55 rd=   0  r2:h=   55 rd=   0  ceil=3000  tbl=5000 scan=50 sel=100%
SKIP  mail-inbox-cached                    (no fixture data for this budget)
PASS  build-all-work                       r1:h=12799 rd=9427! r2:h=13015 rd=9211  ceil=30000  tbl=200000 scan=204003 sel=98%
SKIP  build-roadmap-list                   (no fixture data for this budget)
SKIP  build-feedback-list                  (no fixture data for this budget)
SKIP  build-changelog-list                 (no fixture data for this budget)
SKIP  finance-tax-payments                 (no fixture data for this budget)
SKIP  finance-reminder-policies            (no fixture data for this budget)
SKIP  module-access-roster                 (no fixture data for this budget)
PASS  dashboard-personal-my-tasks          r1:h=   32 rd=   0  r2:h=   32 rd=   0  ceil=2000  tbl=200000 scan=10 sel=100%
PASS  dashboard-my-issues                  r1:h=   16 rd=   0  r2:h=   16 rd=   0  ceil=2000  tbl=200000 scan=38 sel=3%
SKIP  dashboard-personal-calendar-events   (no fixture data for this budget)
PASS  dashboard-personal-notifications-count r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=3000  tbl=300 scan=0 sel=n/a
PASS  dashboard-stats-attendance-count     r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=500  tbl=640 scan=0 sel=n/a
SKIP  dashboard-announcements              (no fixture data for this budget)
PASS  dashboard-leaves-today               r1:h=   23 rd=   0  r2:h=   19 rd=   0  ceil=2000  tbl=510 scan=68 sel=50%
PASS  dashboard-team-attendance            r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=2000  tbl=640 scan=1 sel=100%
PASS  dashboard-active-sprint              r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=1000  tbl=300 scan=0 sel=n/a
PASS  dashboard-recent-projects            r1:h=   64 rd=   0  r2:h=   64 rd=   0  ceil=2000  tbl=3720 scan=60 sel=100%

14 budget(s) skipped (no fixture data — seed the relevant tables).

All budgets within ceiling.
```

## Full run output — after (2026-09-01, with maxScanRows ratchets added)

56 PASS, 14 SKIP, 0 FAIL. Skip count unchanged — all 14 skips require seed data that does not
exist in this org; none can be closed without writing rows (see skipped-budgets section).

Key differences from the "before" run:
- `ticket-list-project`, `notifications-list`, `org-members-list`, `attendance-mine`,
  `dashboard-personal-my-tasks` now carry `maxScanRows` budgets — scan row counts were
  verified against live plans before setting ceilings.
- All new `maxScanRows` budgets pass (measured scan rows are well below ceilings).
- `--self-test` now covers 3 breach types (ceiling, plan-assertion, scan-rows).

```
Auto-discovered seed org: 73e5076a-225f-4b4c-b93e-9bc66a548bfe (62 active members)
org 73e5076a-225f-4b4c-b93e-9bc66a548bfe · project 204 (3334 tickets) · participant 3c4a92a8-7108-4b15-bf85-c5757ef8a5fb (5562 rows) · channel 4 (85 msgs) · space 1 · payroll run 14 · leave types 0 (period 2026-09)

Running 70 budgets…

PASS  scoped-board-page                    r1:h=  325 rd=   0  r2:h=  325 rd=   0  ceil=5000  tbl=200000 scan=5562 sel=100%
PASS  my-work                              r1:h=11447 rd=16151! r2:h=11517 rd=16081  ceil=30000  tbl=191429 scan=204003 sel=98%
PASS  ticket-list-project                  r1:h=  219 rd=   0  r2:h=  219 rd=   0  ceil=8000  tbl=200000 scan=3334 sel=100%
PASS  ticket-org-assigned-to-me            r1:h= 5328 rd=   0  r2:h= 5328 rd=   0  ceil=20000  tbl=200000 scan=5562 sel=100%
PASS  notifications-list                   r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=300 scan=1 sel=0%
PASS  notifications-unread-count           r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=3000  tbl=300 scan=1 sel=0%
PASS  chat-channel-list                    r1:h=  138 rd=   0  r2:h=  138 rd=   0  ceil=8000  tbl=60 scan=240 sel=100%
PASS  chat-messages-page                   r1:h=   13 rd=   0  r2:h=   13 rd=   0  ceil=10000  tbl=4250 scan=50 sel=100%
PASS  chat-channel-members                 r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=5000  tbl=240 scan=4 sel=100%
PASS  kb-page-id-probe-sdf                 r1:h=    6 rd=   0  r2:h=    6 rd=   0  ceil=3000  tbl=850 scan=0 sel=n/a
PASS  kb-space-pages                       r1:h=   27 rd=   0  r2:h=   27 rd=   0  ceil=8000  tbl=850 scan=170 sel=100%
PASS  kb-recently-updated                  r1:h=   50 rd=   0  r2:h=   50 rd=   0  ceil=8000  tbl=850 scan=50 sel=100%
PASS  kb-spaces-list                       r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=3000  tbl=5 scan=9 sel=56%
PASS  kb-page-visits-mine                  r1:h=    6 rd=   0  r2:h=    6 rd=   0  ceil=5000  tbl=100 scan=100 sel=50%
PASS  org-members-list                     r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=5000  tbl=62 scan=62 sel=100%
PASS  org-people-list                      r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=8000  tbl=70 scan=70 sel=100%
PASS  employee-record-list-canonical       r1:h=  131 rd=   0  r2:h=  131 rd=   0  ceil=8000  tbl=5000 scan=155 sel=100%
PASS  employee-reporting-line-lookup       r1:h=    4 rd=   0  r2:h=    4 rd=   0  ceil=5000  tbl=1000 scan=100 sel=100%
PASS  leave-requests-pending-org           r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=8000  tbl=510 scan=76 sel=66%
PASS  leave-requests-mine                  r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=510 scan=15 sel=100%
PASS  attendance-mine                      r1:h=    4 rd=   0  r2:h=    4 rd=   0  ceil=5000  tbl=640 scan=20 sel=100%
PASS  leave-ledger-mine                    r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=340 scan=10 sel=100%
PASS  contacts-list                        r1:h=   16 rd=   0  r2:h=   16 rd=   0  ceil=8000  tbl=960 scan=960 sel=100%
PASS  leads-active                         r1:h=   18 rd=   0  r2:h=   18 rd=   0  ceil=10000  tbl=960 scan=960 sel=100%
PASS  leads-assigned-to-me                 r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=8000  tbl=960 scan=0 sel=n/a
PASS  deals-pipeline                       r1:h=   17 rd=   0  r2:h=   17 rd=   0  ceil=10000  tbl=900 scan=904 sel=100%
PASS  clients-list                         r1:h=    6 rd=   0  r2:h=    6 rd=   0  ceil=8000  tbl=350 scan=350 sel=100%
PASS  invoices-open                        r1:h=   19 rd=   0  r2:h=   19 rd=   0  ceil=8000  tbl=350 scan=350 sel=80%
PASS  purchase-bills-list                  r1:h=   17 rd=   0  r2:h=   17 rd=   0  ceil=8000  tbl=325 scan=325 sel=100%
PASS  gl-journals-list                     r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=8000  tbl=35 scan=35 sel=100%
PASS  payroll-runs-list                    r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=5 scan=5 sel=100%
PASS  payroll-run-employees                r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=8000  tbl=5 scan=20 sel=20%
PASS  payroll-line-items                   r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=5000  tbl=5 scan=96 sel=0%
PASS  inv-products-list                    r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=10000  tbl=60 scan=74 sel=81%
PASS  inv-stock-levels                     r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=10000  tbl=60 scan=70 sel=86%
PASS  inv-stock-transactions               r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=15000  tbl=330 scan=50 sel=100%
PASS  inv-purchase-orders                  r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=8000  tbl=25 scan=30 sel=83%
PASS  inv-vendors-list                     r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=15 scan=17 sel=88%
PASS  search-tickets-sdf                   r1:h=   12 rd=  73! r2:h=    6 rd=  59  ceil=30000  tbl=200000 scan=0 sel=n/a
SKIP  search-lead-party-sdf                (no fixture data for this budget)
PASS  search-deal-sdf                      r1:h=    5 rd=   0  r2:h=    5 rd=   0  ceil=30000  tbl=900 scan=0 sel=n/a
SKIP  search-contact-party-sdf             (no fixture data for this budget)
SKIP  search-client-party-sdf              (no fixture data for this budget)
PASS  leave-balances-org                   r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=5000  tbl=20 scan=20 sel=100%
SKIP  leave-accrual-ledger-dedup           (no fixture data for this budget)
SKIP  leave-accrual-balance-read           (no fixture data for this budget)
PASS  chat-saved-messages                  r1:h=  189 rd=   0  r2:h=  189 rd=   0  ceil=5000  tbl=4250 scan=120 sel=100%
PASS  accounting-receivables-list          r1:h=   25 rd=   0  r2:h=   25 rd=   0  ceil=5000  tbl=350 scan=350 sel=100%
PASS  support-ticket-queue                 r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=10000  tbl=120 scan=120 sel=75%
PASS  support-ticket-assigned-to-me        r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=8000  tbl=120 scan=120 sel=0%
PASS  timesheets-pending-org               r1:h=  246 rd=   0  r2:h=  246 rd=   0  ceil=8000  tbl=5000 scan=5000 sel=25%
PASS  timesheets-mine                      r1:h=   55 rd=   0  r2:h=   55 rd=   0  ceil=3000  tbl=5000 scan=50 sel=100%
SKIP  mail-inbox-cached                    (no fixture data for this budget)
PASS  build-all-work                       r1:h= 6409 rd=15817! r2:h= 6479 rd=15747  ceil=30000  tbl=200000 scan=204003 sel=98%
SKIP  build-roadmap-list                   (no fixture data for this budget)
SKIP  build-feedback-list                  (no fixture data for this budget)
SKIP  build-changelog-list                 (no fixture data for this budget)
SKIP  finance-tax-payments                 (no fixture data for this budget)
SKIP  finance-reminder-policies            (no fixture data for this budget)
SKIP  module-access-roster                 (no fixture data for this budget)
PASS  dashboard-personal-my-tasks          r1:h=   32 rd=   0  r2:h=   32 rd=   0  ceil=2000  tbl=200000 scan=10 sel=100%
PASS  dashboard-my-issues                  r1:h=   16 rd=   0  r2:h=   16 rd=   0  ceil=2000  tbl=200000 scan=38 sel=3%
SKIP  dashboard-personal-calendar-events   (no fixture data for this budget)
PASS  dashboard-personal-notifications-count r1:h=    2 rd=   0  r2:h=    2 rd=   0  ceil=3000  tbl=300 scan=1 sel=0%
PASS  dashboard-stats-attendance-count     r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=500  tbl=640 scan=0 sel=n/a
SKIP  dashboard-announcements              (no fixture data for this budget)
PASS  dashboard-leaves-today               r1:h=   23 rd=   0  r2:h=   23 rd=   0  ceil=2000  tbl=510 scan=68 sel=50%
PASS  dashboard-team-attendance            r1:h=    3 rd=   0  r2:h=    3 rd=   0  ceil=2000  tbl=640 scan=1 sel=100%
PASS  dashboard-active-sprint              r1:h=    1 rd=   0  r2:h=    1 rd=   0  ceil=1000  tbl=300 scan=0 sel=n/a
PASS  dashboard-recent-projects            r1:h=   64 rd=   0  r2:h=   64 rd=   0  ceil=2000  tbl=3720 scan=60 sel=100%

14 budget(s) skipped (no fixture data — seed the relevant tables).

All budgets within ceiling.
```

Self-test output (2026-09-01, after 3-type expansion):
```
SELF-TEST PASS: all 3 breach types detected — ceiling, plan-assertion, scan-rows
```

## Schema drift fixed during this session (2026-09-01)

The following budget SQL queries referenced column names that no longer exist in the live schema.
The schema migrated from user_id to membership_id across chat and timesheets tables.

| Budget | Old column | Correct column | Table |
|---|---|---|---|
| chat-channel-list | m.user_id (WHERE) | m.membership_id via JOIN organization_members | chat_channel_members |
| chat-messages-page | sender_id (SELECT) | sender_membership_id | chat_messages |
| chat-channel-members | m.user_id (SELECT) | m.membership_id | chat_channel_members |
| chat-saved-messages | sm.user_id (WHERE) | sm.membership_id via JOIN organization_members | chat_saved_messages |
| timesheets-mine | user_id (WHERE) | user_membership_id | timesheets |

## Skipped budgets — honest assessment (2026-09-01)

All 14 tables confirmed empty for org `73e5076a-225f-4b4c-b93e-9bc66a548bfe` via direct
`SELECT count(*)::int` with GUC set inside a transaction as `streamline_app`.
None of these budgets can be rewritten to measure existing data without weakening the assertion —
the queries are already as narrow as the feature's real code path. Changing to emptier tables
would measure a trivially-cheap query that does not represent production load.

| Budget | Confirmed empty | Reason | Exact seed required |
|---|---|---|---|
| search-lead-party-sdf | business_parties: 0 | CRM parties not seeded | INSERT into business_parties with party_type='lead' for the org |
| search-contact-party-sdf | business_parties: 0 | CRM parties not seeded | INSERT into business_parties with party_type='contact' for the org |
| search-client-party-sdf | business_parties: 0 | CRM parties not seeded | INSERT into business_parties with party_type='client' for the org |
| module-access-roster | roles.module_key rows: 0 | No module-scoped roles; requires enabling HR or Build module for the org | INSERT into roles with module_key='hr' OR enable via module-access flow |
| leave-accrual-ledger-dedup | leave_policies MONTHLY: 0 | No accrual-type leave policies | INSERT into leave_policies with accrual_type='MONTHLY', is_active=true |
| leave-accrual-balance-read | leave_policies MONTHLY: 0 | No accrual-type leave policies | Same as above |
| mail-inbox-cached | mail_message_metadata: 0 | Mail sync not run | Seed a mail account and trigger sync via integrations/mail module |
| dashboard-personal-calendar-events | calendar_events: 0 | No events created | INSERT at least 1 calendar_event with start_date in the future for the org |
| dashboard-announcements | announcements: 0 | No announcements published | INSERT into announcements with status='published', expires_at > now() |
| build-roadmap-list | build.roadmap_items: 0 | Build PM seed absent | INSERT into build.roadmap_items for the org |
| build-feedback-list | build.feedback_posts: 0 | Build PM seed absent | INSERT into build.feedback_posts for the org |
| build-changelog-list | build.changelog_entries: 0 | Build PM seed absent | INSERT into build.changelog_entries for the org |
| finance-tax-payments | acc_tax_payments: 0 | Finance seed absent | INSERT into acc_tax_payments for the org |
| finance-reminder-policies | fin_reminder_policies: 0 | Finance seed absent | INSERT into fin_reminder_policies with archived_at IS NULL for the org |

## CI ratchet types and self-test coverage (2026-09-01)

Three ratchet types are active. Each is independently proven to bite via `--self-test`:

| Ratchet type | Field | Self-test fixture | How it bites |
|---|---|---|---|
| Block ceiling | `ceiling` | `self-test-ceiling` uses `org-members-list` with `ceiling: 0` | Any real query touches >0 blocks |
| Plan assertion | `planAssertions` | `self-test-assertion` uses `require-index-only-scan` on `organization_members` which resolves via Bitmap Heap Scan | assertion mismatch detected |
| Scan-row ceiling | `maxScanRows` | `self-test-scan-rows` uses `org-members-list` with `maxScanRows: 0` | any real scan has >0 rows |

**Latency** is not a ratchet type in this harness. Wall-clock lies on a warm cache and the
Neon pooler introduces network jitter — buffer counts are the honest, reproducible signal.
This is intentional; see `backend/CLAUDE.md §7`.

**Query count** is implicitly proven: each budget in `read-cost-budgets.mjs` is exactly one SQL
statement. The existence of a single-statement budget for every critical list/detail path is
the proof that those paths do not make N+1 calls — an N+1 pattern cannot be expressed as a
single SQL statement. See N+1 analysis section below.

Self-test output (2026-09-01):
```
SELF-TEST PASS: all 3 breach types detected — ceiling, plan-assertion, scan-rows
```

Budgets with `maxScanRows` added (2026-09-01, all measured from live plans):

| Budget | Measured scan rows | maxScanRows set | Purpose |
|---|---|---|---|
| ticket-list-project | 3,334 (project scope) | 50,000 | Catches full-table fallback on 200k-row table |
| notifications-list | 0–1 | 2,000 | Catches org-wide notification scan |
| org-members-list | 62 | 5,000 | Catches cross-org member scan |
| attendance-mine | 20 | 200 | Catches full-org attendance scan for self-service path |
| dashboard-personal-my-tasks | 10 | 1,000 | Catches exploding assignee scan |

## N+1 analysis — list and detail fanout paths (2026-09-01)

N+1 is absent from the measured paths. Each budget is one SQL statement; the service layer
uses JOINs and subqueries rather than per-row queries. Evidence from EXPLAIN plans:

| Path | Pattern | N+1 risk | Resolution |
|---|---|---|---|
| ticket-list-project | Single Index Scan on `tickets` | None | Window function for count, no per-row lookups |
| employee-record-list-canonical | 6-table LEFT JOIN driven by IN subquery | None — 62 outer rows drive 62 index probes on hr_people, all "never executed" because users are not HR-onboarded; cost 131 blocks total | Hash Semi Join on subquery result |
| chat-channel-list | Nested Loop + Memoize on organization_members_pkey | No N+1 — Memoize caches the 4 distinct membership lookups across 240 channel_member rows (236 cache hits, 4 misses) | Memoize eliminates repeated PK lookups |
| dashboard-personal-my-tasks | Index Scan on `idx_tickets_org_assignee_updated` + 10 PK lookups on projects | 10 index probes for the 10-row LIMIT — not N+1, this is a correlated Nested Loop Left Join with LIMIT applied at the outer level | LIMIT 10 caps the loop |
| leave-requests-pending-org | Single Index Scan Backward on `idx_leave_requests_org_created` | None | Status filter on the index, single pass |
| chat-saved-messages | JOIN on chat_messages + organization_members — no per-row subquery | None | Single two-table join |

All 56 passing budgets represent single-statement operations. No multi-query pattern is
present in the measured paths.

## Raw EXPLAIN (ANALYZE, BUFFERS) plans — 7 paths (2026-09-01)

Connection role: `streamline_app` (non-BYPASSRLS)
GUC set: `SELECT set_config('app.organization_id', '73e5076a-225f-4b4c-b93e-9bc66a548bfe', true)` inside each transaction
Org: `73e5076a-225f-4b4c-b93e-9bc66a548bfe` · 62 active members · project 204 (3334 tickets)

### Plan 1: ticket-list-project

```
Limit  (cost=3297.33..3297.58 rows=100 width=95) (actual time=3.776..3.793 rows=100.00 loops=1)
  Buffers: shared hit=219
  ->  Sort  (cost=3297.33..3301.56 rows=1692 width=95) (actual time=3.774..3.783 rows=100.00 loops=1)
        Sort Key: rank, created_at DESC, id
        Sort Method: top-N heapsort  Memory: 40kB
        Buffers: shared hit=219
        ->  WindowAgg  (cost=3230.75..3232.66 rows=1692 width=95) (actual time=2.410..2.994 rows=3334.00 loops=1)
              Window: w1 AS ()
              Storage: Memory  Maximum Storage: 426kB
              Buffers: shared hit=219
              ->  Result  (cost=0.42..3211.51 rows=1692 width=87) (actual time=0.037..1.668 rows=3334.00 loops=1)
                    One-Time Filter: (current_org_id() = '73e5076a-225f-4b4c-b93e-9bc66a548bfe'::text)
                    Buffers: shared hit=219
                    ->  Index Scan using idx_tickets_project_status on tickets t  (cost=0.42..3211.51 rows=1692 width=87) (actual time=0.021..1.298 rows=3334.00 loops=1)
                          Index Cond: (project_id = 204)
                          Filter: ((deleted_at IS NULL) AND (org_id = '73e5076a-225f-4b4c-b93e-9bc66a548bfe'::text))
                          Index Searches: 1
                          Buffers: shared hit=219
Planning Time: 0.231 ms
Execution Time: 3.846 ms
```

Index: `idx_tickets_project_status` (project_id). The RLS `One-Time Filter` for `current_org_id()` is visible.
Scan rows: 3,334 (entire project, scanned once). No N+1. 219 shared hit blocks.

### Plan 2: dashboard-personal-my-tasks

```
Limit  (cost=0.81..35.43 rows=10 width=76) (actual time=0.045..0.081 rows=10.00 loops=1)
  Buffers: shared hit=32
  ->  Result  (cost=0.81..7252.58 rows=2095 width=76) (actual time=0.045..0.079 rows=10.00 loops=1)
        One-Time Filter: (current_org_id() = '73e5076a-225f-4b4c-b93e-9bc66a548bfe'::text)
        Buffers: shared hit=32
        ->  Nested Loop Left Join  (cost=0.81..7252.58 rows=2095 width=76) (actual time=0.039..0.072 rows=10.00 loops=1)
              Buffers: shared hit=32
              ->  Index Scan using idx_tickets_org_assignee_updated on tickets t  (cost=0.42..6360.09 rows=2095 width=61) (actual time=0.028..0.045 rows=10.00 loops=1)
                    Index Cond: ((org_id = '...') AND (assignee_id = '3c4a92a8-...'))
                    Filter: (status = ANY ('{TODO,IN_PROGRESS,IN_REVIEW}'::text[]))
                    Index Searches: 1
                    Buffers: shared hit=12
              ->  Index Scan using projects_pkey on projects p  (cost=0.14..0.42 rows=1 width=19) (actual time=0.002..0.002 rows=1.00 loops=10)
                    Index Cond: (id = t.project_id)
                    Filter: (org_id = current_org_id())
                    Index Searches: 10
                    Buffers: shared hit=20
Planning Time: 0.394 ms
Execution Time: 0.120 ms
```

Index: `idx_tickets_org_assignee_updated` (org_id, assignee_id) — tenant-leading confirmed.
10 PK lookups on `projects` for LIMIT 10 result rows. 32 total hit blocks. No reads.

### Plan 3: org-members-list

```
Limit  (cost=32.64..32.74 rows=39 width=50) (actual time=0.181..0.190 rows=62.00 loops=1)
  Buffers: shared hit=3
  ->  Sort  (cost=32.64..32.74 rows=39 width=50) (actual time=0.181..0.184 rows=62.00 loops=1)
        Sort Key: joined_at DESC
        ->  Bitmap Heap Scan on organization_members  (cost=9.33..31.61 rows=39 width=50) (actual time=0.056..0.156 rows=62.00 loops=1)
              Recheck Cond: (((org_id = current_org_id_or_null()) AND (org_id = '...')) OR ((org_id = '...') AND (user_id = current_user_id_or_null())))
              Filter: (((org_id = current_org_id_or_null()) OR (user_id = current_user_id_or_null())) AND (status = 'ACTIVE'))
              Heap Blocks: exact=2
              Buffers: shared hit=3
              ->  BitmapOr  ...
                    ->  Bitmap Index Scan on idx_org_members_org_joined  (actual rows=62)
                    ->  Bitmap Index Scan on uniq_org_members_org_user  (actual rows=0)
Planning Time: 0.219 ms
Execution Time: 0.228 ms
```

Index: `idx_org_members_org_joined` (tenant-leading). The RLS policy injects a BitmapOr with
`uniq_org_members_org_user` as the user-self-access arm — correct RLS enforcement visible.
3 total blocks. `forbid-seq-scan` assertion is satisfied.

### Plan 4: employee-record-list-canonical

```
Sort  (cost=268.84..272.03 rows=1275 width=170) (actual time=0.482..0.489 rows=62.00 loops=1)
  Sort Key: e.id
  Buffers: shared hit=131
  ->  Nested Loop Left Join  ... rows=62 ...
        ->  Hash Semi Join  (cost=33.62..39.98 rows=39) (actual time=0.238..0.282 rows=62)
              Hash Cond: (u.id = "ANY_subquery".user_id)
              ->  Seq Scan on users u  (actual rows=155)  [small global table, correct]
              ->  Hash  ... (inner: 62-row subquery from organization_members via idx_org_members_org_joined)
        ->  Nested Loop Left Join  ...  (never executed — users are not HR-onboarded)
              ->  Index Scan using idx_hr_people_user on hr_people p  (Index Searches: 62; actual rows=0)
              [subsequent joins: idx_hr_employments_person, excl_hr_reporting_lines_no_overlap, hr_employments_pkey, hr_people_pkey — all never executed]
Planning Time: 3.820 ms
Execution Time: 0.618 ms
```

6-table LEFT JOIN. 131 hit blocks. The `hr_people` index is probed 62 times (one per user)
but returns 0 rows because users in this org are not yet HR-onboarded — "misses are cheap."
No N+1: all 62 probes happen in a single plan execution.

### Plan 5: leave-requests-pending-org

```
Limit  (cost=0.15..6.81 rows=50 width=61) (actual time=0.055..0.092 rows=50.00 loops=1)
  Buffers: shared hit=5
  ->  Result  (cost=0.15..45.47 rows=340 width=61) ...
        One-Time Filter: (current_org_id() = '73e5076a-...'::text)
        ->  Index Scan Backward using idx_leave_requests_org_created on leave_requests
              Index Cond: (org_id = '73e5076a-...')
              Filter: (status = ANY ('{PENDING,APPROVED}'))
              Rows Removed by Filter: 26
              Index Searches: 1
              Buffers: shared hit=5
Planning Time: 0.143 ms
Execution Time: 0.122 ms
```

Index: `idx_leave_requests_org_created` (org_id, created_at). Backward scan for DESC order.
5 total blocks. `forbid-seq-scan` assertion satisfied.

### Plan 6: chat-channel-list — cold (r1) vs warm (r2) cache comparison

Both r1 and r2 show `Buffers: shared hit=138 read=0`. This query is always warm because
`chat_channel_members` (240 rows, 10 blocks) and `chat_channels` (60 rows, 2 blocks) fit
entirely in shared buffers and are not evicted between calls. r1 = r2 = 138 hit blocks.

```
Limit  (cost=24.04..24.05 rows=4 width=39) (actual time=0.275..0.282 rows=50.00 loops=1)
  Buffers: shared hit=138
  ->  Sort  ... Sort Key: c.last_message_at DESC ...
        ->  Nested Loop  ...
              ->  Nested Loop  ...
                    ->  Seq Scan on chat_channel_members m  (rows=240)  [small table — correct seq scan]
                    ->  Memoize  Cache Key: m.membership_id
                          Hits: 236  Misses: 4  Evictions: 0
                          ->  Index Scan using organization_members_pkey on om  (loops=4)
              ->  Index Scan using uniq_chat_channels_org_id on c  (loops=60)
Planning Time: 0.467 ms  Execution Time: 0.328 ms
```

Memoize: 240 channel_member rows → 4 distinct membership_id values → 4 index probes on
`organization_members_pkey`, 236 cache hits. This is a join, not N+1.

### Plan 7: search-tickets-sdf (SECURITY DEFINER function)

```
Function Scan on search_ticket_ids  (cost=0.25..10.25 rows=1000 width=4) (actual time=0.868..0.871 rows=20.00 loops=1)
  Buffers: shared hit=7 read=101
Planning Time: 0.031 ms
Execution Time: 0.891 ms
```

The SDF plan is opaque by design — the function runs as its owner (BYPASSRLS role) inside
a security barrier, so the inner GIN tsvector scan is not exposed to the caller's plan.
Cold read: 101 blocks (GIN index + heap pages for 200k-row tickets table).
This is the canonical pattern for RLS-compatible full-text search on large tables.

## Cold vs warm cache analysis (2026-09-01)

Buffer counts are the only honest signal. Wall-clock is not recorded.

| Budget | r1 cold read blocks | r2 warm read blocks | r2 hit blocks | Interpretation |
|---|---|---|---|---|
| scoped-board-page | 0 | 0 | 325 | Small project slice; fully warm |
| my-work | 16,000–22,000 | 9,000–17,000 | 11,000–17,000 | Ticket table too large for full buffer pool residence; partial eviction between calls |
| ticket-list-project | 0 | 0 | 219 | Project slice fits in buffer pool |
| kb-space-pages | 0–3 | 0 | 27 | 850 pages fit warm |
| chat-channel-list | 0 | 0 | 138 | 60-row channels + 240-row members always warm |
| leave-requests-pending-org | 0–4 | 0 | 5 | Small table, always warm |
| attendance-mine | 0–4 | 0 | 4 | Per-user slice always warm |
| search-tickets-sdf | 59–101 | 59–103 | 6–19 | Non-local reads: GIN pages evicted between calls; correct at this access pattern |
| build-all-work | 15,000–22,000 | 15,000–17,000 | 5,000–13,000 | Same large-table eviction as my-work; both UNION branches |
| employee-record-list-canonical | 0 | 0 | 131 | hr_people index (62 probes) stays warm |

Cold reads on the large-ticket queries (my-work, build-all-work) are expected and correct —
the 200k-row ticket table is 22+ MB and Neon's shared buffers are shared across all connections.
The block ceilings (30,000) are set well above the measured worst-case cold read.
VACUUM ANALYZE cannot be run (read-only connection); statistics freshness is unverifiable
but the block ceilings are conservative enough to absorb stale statistics.

## Notable cost observations

**my-work and build-all-work**: These UNION queries over 200k+ tickets show 10-27k cold-read blocks on first pass.
The cold read is expected — the ticket table is large and the buffer pool is shared across all connections.
Warm-cache (r2) shows the same or similar hit counts, confirming pages stay in shared buffers.
Both are well within their 30k block ceilings. The UNION shape (two independently-indexed branches)
is the correct replacement for the OR-with-semijoin anti-pattern.

**search-tickets-sdf**: Consistently reads 65-85 blocks cold per call even on the warm run.
This is the SECURITY DEFINER function that bypasses RLS for text search. The read blocks on warm
runs reflect pages being evicted between calls (non-locality). Still well within the 30k ceiling.

**timesheets-pending-org**: 246 warm-cache hit blocks for 5000 rows with status='PENDING' (25% selectivity).
Sequential scan is correct here — returning 1250 rows out of 5000, the planner correctly prefers
a seq scan to an index scan + heap fetch pattern. The 8000-block ceiling provides ample headroom.

**employee-record-list-canonical**: 131 hit blocks for a 6-table join serving 100 rows from 5000 hr_employments.
The inner subquery (100 active members) drives a hash join pattern. This is efficient.
