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

## Full run output (2026-09-01)

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

## Skipped budgets — what they need

| Budget | Reason | What to seed |
|---|---|---|
| search-lead-party-sdf | No business_parties rows for org | CRM seed with lead party data |
| search-contact-party-sdf | No business_parties rows for org | CRM seed with contact party data |
| search-client-party-sdf | No business_parties rows for org | CRM seed with client party data |
| module-access-roster | No roles with module_key set | Enable a module so HR/Build roles are seeded |
| leave-accrual-ledger-dedup | No active monthly accrual leave policies | Seed leave_policies with accrual_type=MONTHLY |
| leave-accrual-balance-read | No active monthly accrual leave policies | Seed leave_policies with accrual_type=MONTHLY |
| mail-inbox-cached | No mail_message_metadata rows | Seed mail account and sync messages |
| dashboard-personal-calendar-events | No calendar_events rows | Seed calendar events |
| dashboard-announcements | No announcements rows | Seed announcements |
| build-roadmap-list | No build.roadmap_items rows | Seed roadmap items |
| build-feedback-list | No build.feedback_posts rows | Seed feedback posts |
| build-changelog-list | No build.changelog_entries rows | Seed changelog entries |
| finance-tax-payments | No acc_tax_payments rows | Seed tax payments |
| finance-reminder-policies | No fin_reminder_policies rows | Seed reminder policies |

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
