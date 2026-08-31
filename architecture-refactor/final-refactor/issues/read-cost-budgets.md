# Read-cost budget guard — findings 2026-08-31

## Guard status: BLOCKED — streamline_app 28P01

`APP_DATABASE_URL` in `backend/.env` uses credentials for the `streamline_app` role that are
no longer valid. Every `node src/scripts/run-read-cost-budgets.mjs` invocation fails
immediately with:

```
RUNNER FAILED: password authentication failed for user 'streamline_app'
```

**Pre-run failing count: CANNOT MEASURE.**
**Post-fix failing count: UNKNOWN — measurements are OPEN.**

The owner connection (`DATABASE_URL`) MUST NOT be substituted.
The owner has `BYPASSRLS`, so its plans skip every RLS qual and hide every
index-size problem the guard exists to find. All three prior measurement attempts that used
the owner quietly reported 0 breaches while missing real issues.

### Runbook — restore streamline_app credentials

Per memory note `app-role-password-rotated.md`: the password is rotated in the Neon console,
not via `ALTER ROLE` (non-superuser has no permission). Steps:

1. Open the Neon console → project → Roles → `streamline_app`.
2. Click "Reset password", copy the new connection string.
3. Replace `APP_DATABASE_URL` in `backend/.env` (and the same secret in CI/CD).
4. Verify: `node -e "const pg = require('postgres'); pg('$APP_DATABASE_URL',{max:1,prepare:false,ssl:'require'}).query('SELECT 1').then(()=>console.log('OK')).catch(e=>console.error(e.message))"`
5. Re-run `pnpm db:check-read-budgets` — record the breach list here.

---

## Static analysis (no live connection)

The rest of this document captures what can be determined from schema source files and
migration SQL without running the guard. Categories follow the task classification:
(i) dev table too small → seq scan is planner-correct, fix is seeding
(ii) genuinely missing index
(iii) budget ceiling was never realistic
(iv) bug in the guard itself

### Category (ii) — genuinely missing indexes, confirmed by static analysis

These three tables have no index matching the query predicate. Even with a fully-seeded
dev database the planner would need to seq-scan them, and the assertion would fire in
production as the table grows. They require real migrations (SQL below — let the
orchestrator assign the number).

#### 1. `build.sprints` — `dashboard-active-sprint`

Budget query:
```sql
WHERE s.org_id = $1 AND s.status = 'ACTIVE' AND s.deleted_at IS NULL LIMIT 1
```

Existing indexes (from `src/db/schema/build/core.ts`):
- `idx_sprints_project_status` on `(project_id, status) WHERE deleted_at IS NULL` — leads with
  `project_id`, not `org_id`. Unusable for this query.
- `uniq_sprints_org_id` on `(org_id, id)` — doesn't include `status`.

No index can satisfy `org_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL` without a
seq scan. In an org with a large history of sprints this is O(org sprint count).

**Migration SQL needed:**
```sql
CREATE INDEX CONCURRENTLY idx_sprints_org_status
  ON build.sprints (org_id, status)
  WHERE deleted_at IS NULL;
```

#### 2. `chat_saved_messages` — `chat-saved-messages`

Budget query:
```sql
WHERE sm.org_id = $1 AND sm.user_id = $2
ORDER BY sm.saved_at DESC LIMIT 50
```

Existing indexes (from `src/db/schema/chat/chat.ts`, `migrations/0306_chat_org_id.sql`):
- `idx_saved_messages_user` on `(user_id)` — not tenant-scoped.
- `idx_chat_saved_messages_org` on `(org_id)` — single-column, no `user_id` or `saved_at`.
- `uniq_saved_message` on `(user_id, message_id)` — uniqueness only.

No index covers `(org_id, user_id)`. Every page load forces a full-org scan filtered to one
user. Under RLS the `org_id` predicate is already in the policy, but the planner still
requires a usable index to avoid a seq scan when the table has many rows.

**Migration SQL needed:**
```sql
CREATE INDEX CONCURRENTLY idx_chat_saved_messages_org_user_saved
  ON chat_saved_messages (org_id, user_id, saved_at DESC);
```

#### 3. `kb_pages` — `kb-space-pages`

Budget query:
```sql
WHERE org_id = $1 AND space_id = $2 AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC LIMIT 200
```

Existing indexes (from `src/db/schema/kb/pages.ts`):
- `idx_kb_pages_org_parent_sort` on `(org_id, parent_page_id, sort_order)` — no `space_id`.
- `idx_kb_pages_org_deleted` on `(org_id, deleted_at)` — no `space_id`.
- `idx_kb_pages_org_status` on `(org_id, status)` — no `space_id`.

No index starts with `(org_id, space_id)`. A space page list (common landing page for every
KB space) forces a full-org page scan filtered by `space_id`. Spaces with hundreds of pages
across the org make this O(org page count).

**Migration SQL needed:**
```sql
CREATE INDEX CONCURRENTLY idx_kb_pages_org_space_sort
  ON kb_pages (org_id, space_id, sort_order ASC, id ASC)
  WHERE deleted_at IS NULL;
```

### Category (i) — dev table too small, planner-correct seq scan

All budgets below have adequate tenant-leading indexes in the schema. Their `forbid-seq-scan`
assertions will fire on a dev database whose tables fall below the planner's index-vs-seq-scan
crossover point (typically 5–15 % of the table). The correct fix is seeding, not removing the
assertion or raising the ceiling.

The guard already enforces `minRows` and returns `seed-too-small` instead of a plan assertion
failure when the row count is too low. Where `minRows` is set correctly, those budgets will
emit `seed-too-small` before the assertion is even checked. The ones that can still trigger
a false assertion failure are budgets where `minRows` is low enough for seeding to succeed but
the dev table is still too small for the planner to choose the index.

| Budget id | Table | Index covering the query | minRows | Notes |
|---|---|---|---|---|
| `notifications-list` | `notifications` | `idx_notifications_list_cursor` on `(org_id, user_id, id DESC)` partial `deleted_at IS NULL AND archived_at IS NULL` | 100 | Purpose-built. |
| `notifications-unread-count` | `notifications` | `idx_notifications_unread_count` on `(org_id, user_id, id)` partial `is_read=false` | 100 | Purpose-built. |
| `chat-channel-list` | `chat_channels`, `chat_channel_members` | `idx_chat_channels_last_msg` on `(org_id, last_message_at)`, `idx_chat_channel_members_org` on `(org_id)` | 50 | |
| `chat-messages-page` | `chat_messages` | `idx_chat_messages_unread` on `(org_id, channel_id, is_deleted, created_at)` partial `is_deleted=false` | 200 | |
| `chat-channel-members` | `chat_channel_members` | `idx_chat_channel_members_org` on `(org_id)` | 50 | |
| `kb-space-pages` | (see category ii above) | — | — | Missing index. |
| `kb-recently-updated` | `kb_pages` | `idx_kb_pages_org_updated` on `(org_id, updated_at)` + `idx_kb_pages_org_status` | 30 | |
| `kb-spaces-list` | `kb_spaces` | `idx_kb_spaces_org` on `(org_id)` | 3 | |
| `kb-page-visits-mine` | `kb_page_visits` | `idx_kb_page_visits_org_user_visited` on `(org_id, user_id, visited_at)` | 30 | |
| `org-members-list` | `organization_members` | `idx_org_members_org_status` on `(org_id, status)`, `idx_org_members_org_joined` on `(org_id, joined_at DESC)` | 10 | |
| `org-people-list` | `organization_people` | `idx_org_people_org` on `(org_id)` + `uniq_org_people_org_person` | 10 | |
| `employee-record-list-canonical` | `hr_employments`, `hr_people` | indexes exist | **5 000** | Seed-too-small in every dev db. Should return `seed-too-small` before assertion fires. |
| `employee-reporting-line-lookup` | `hr_reporting_lines` | indexes exist | **1 000** | Same. |
| `leave-requests-pending-org` | `leave_requests` | `idx_leave_requests_org_status` on `(org_id, status)` | 20 | |
| `leave-requests-mine` | `leave_requests` | `idx_leave_requests_org_user_status` on `(org_id, user_id, status)` | 20 | |
| `attendance-mine` | `attendance` | `idx_attendance_org_user_date` on `(org_id, user_id, date)` | 30 | |
| `leave-ledger-mine` | `hr_leave_ledger` | `idx_hr_leave_ledger_org_user` on `(org_id, user_id)` | 10 | |
| `contacts-list` | `contacts` | `idx_contacts_org` on `(org_id)` | 50 | |
| `leads-active` | `leads` | `idx_leads_org_status_created` on `(org_id, status, created_at)` | 50 | |
| `leads-assigned-to-me` | `leads` | `idx_leads_org_assigned_status` on `(org_id, assigned_to_id, status)` | 50 | |
| `deals-pipeline` | `deals` | `idx_deals_org_live_stage` (partial WHERE `deleted_at IS NULL`) | 50 | |
| `clients-list` | `clients` | `idx_clients_org_status` on `(org_id, status)` | 20 | |
| `invoices-open` | `invoices` | `idx_invoices_org_status` on `(org_id, status)` | 20 | |
| `purchase-bills-list` | `purchase_bills` | `idx_purchase_bills_org_status` on `(org_id, status)` | 20 | |
| `gl-journals-list` | `gl_journals` | `idx_gl_journals_org_book_date` on `(org_id, book_id, journal_date)` | 30 | Org-led; planner can use leading col for WHERE org_id=$1 then filter book and sort journal_date. |
| `payroll-runs-list` | `payroll_runs` | `idx_payroll_runs_org_status` on `(org_id, status)` | 5 | |
| `payroll-run-employees` | `payroll_run_employees` | `idx_payroll_run_employees_org_run` on `(org_id, run_id)` | 5 | |
| `payroll-line-items` | `payroll_line_items` | `idx_payroll_line_items_org_run` on `(org_id, run_id)` | 5 | |
| `inv-products-list` | `inv_products` | `idx_inv_products_org_status` on `(org_id, status)` | 50 | |
| `inv-stock-levels` | `inv_stock_levels` | `idx_inv_stock_org` on `(org_id)` | 50 | |
| `inv-stock-transactions` | `inv_stock_transactions` | `idx_inv_txn_org_created` on `(org_id, created_at)` | 100 | |
| `inv-purchase-orders` | `inv_purchase_orders` | `idx_inv_po_org_status` on `(org_id, status)` | 20 | |
| `inv-vendors-list` | `inv_vendors` | `idx_inv_vendors_org` on `(org_id)` | 10 | |
| `leave-balances-org` | `leave_balances` | `idx_leave_balances_org_year` on `(org_id, year)` | 10 | |
| `leave-accrual-ledger-dedup` | `hr_leave_ledger` | `idx_hr_leave_ledger_org_user` on `(org_id, user_id)` | 10 | Fixtures skip if no monthly-accrual leave types exist. |
| `leave-accrual-balance-read` | `leave_balances` | `idx_leave_balances_org_year` on `(org_id, year)` | 10 | |
| `support-ticket-queue` | `support_tickets` | `idx_support_tickets_org_status` on `(org_id, status)` | 50 | |
| `support-ticket-assigned-to-me` | `support_tickets` | `idx_support_tickets_org_assignee` on `(org_id, assignee_id, created_at)` | 50 | |
| `timesheets-pending-org` | `timesheets` | `idx_timesheets_org_status` on `(org_id, status)` | 50 | |
| `timesheets-mine` | `timesheets` | `idx_timesheets_org_user_date` on `(org_id, user_id, date)` | 50 | |
| `mail-inbox-cached` | `mail_message_metadata` | `idx_mail_metadata_list` on `(org_id, user_id, folder, date DESC)` | 10 | Fixture skips if no mail data. |
| `dashboard-personal-my-tasks` | `tickets` | `idx_tickets_org_assignee_status` (org_id, assignee_id, status) | 50 | |
| `dashboard-my-issues` | `tickets` | same | 50 | |
| `dashboard-personal-calendar-events` | `calendar_events` | `idx_calendar_events_org_date` on `(org_id, start_date)` | 1 | Fixture skips if no events. |
| `dashboard-stats-attendance-count` | `attendance` | `idx_attendance_org_date_status` on `(org_id, date, status)` | 1 | |
| `dashboard-announcements` | `announcements` | `idx_announcements_org_status` on `(org_id, status)` | 1 | Fixture skips if none. |
| `dashboard-leaves-today` | `leave_requests` | `idx_leave_requests_org_status` on `(org_id, status)` | 5 | |
| `dashboard-team-attendance` | `attendance` | `idx_attendance_org_date_status` | 1 | |
| `dashboard-active-sprint` | (see category ii above) | — | — | Missing index. |
| `dashboard-recent-projects` | `projects` | `idx_projects_org_status` on `(org_id, status)` | 1 | |

### Category (iii) — unrealistic ceiling

None identified from static analysis. The ceilings are all set well above typical small-table
scan cost and were annotated as provisional where not yet measured.

### Category (iv) — guard bug

None found. The runner logic is correct: it enforces `minRows`, skips via `params() = null`,
and distinguishes `seed-too-small` from a plan assertion failure in its output.

---

## Migration SQL for orchestrator

The orchestrator should number and apply these three migrations in order. Each can run
concurrently (CONCURRENTLY keyword means no table lock).

```sql
-- Migration A: sprints org-status partial index (dashboard-active-sprint)
CREATE INDEX CONCURRENTLY idx_sprints_org_status
  ON build.sprints (org_id, status)
  WHERE deleted_at IS NULL;

-- Migration B: chat_saved_messages composite index (chat-saved-messages)
CREATE INDEX CONCURRENTLY idx_chat_saved_messages_org_user_saved
  ON chat_saved_messages (org_id, user_id, saved_at DESC);

-- Migration C: kb_pages space lookup index (kb-space-pages)
CREATE INDEX CONCURRENTLY idx_kb_pages_org_space_sort
  ON kb_pages (org_id, space_id, sort_order ASC, id ASC)
  WHERE deleted_at IS NULL;
```

After applying and running `VACUUM ANALYZE` on the affected tables, re-run
`pnpm db:check-read-budgets` as `streamline_app` (once the password is restored) to verify
the assertions pass.

---

## Summary

| Item | Count |
|---|---|
| Budgets in file | 70 |
| Guard runnable today | NO — 28P01 |
| Failures measured | 0 (blocked) |
| Category (i) — small table, adequate index | ~44 budgets with `forbid-seq-scan` |
| Category (ii) — genuinely missing index | 3 (`sprints`, `chat_saved_messages`, `kb_pages` space) |
| Category (iii) — unrealistic ceiling | 0 |
| Category (iv) — guard bug | 0 |
| Migration SQL provided | Yes — 3 statements, orchestrator to number |
| Measurement status | OPEN until `streamline_app` password restored |
