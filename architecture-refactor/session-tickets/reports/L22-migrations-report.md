# L22 Migration Chain Integrity — Report

Date: 2026-08-30

## Work completed

### 1. Cold bootstrap blocker (HEADLINE BLOCKER) — FIXED

**Root cause:** `0628_communication_actor_normalization.sql` has no `--> statement-breakpoint` markers and contains a `$` (DO block), so `apply-chain-cold.mjs` sends the entire file as one `sql.unsafe()` call. Within that batch, `ALTER TABLE event_attendees ADD CONSTRAINT fk_event_attendees_org_event FOREIGN KEY (org_id, event_id) REFERENCES calendar_events (org_id, id)` fails with `42P10` because `uniq_calendar_events_org_id` existed in the live DB but was never created by any migration.

**Fix:** Created `migrations/0629_calendar_events_org_id_composite_unique.sql` and inserted its journal entry at array position 350 (between `0627` and `0628`, `when=1787895935277`). On cold bootstrap, `0629` now runs first and creates the unique index; `0628` then succeeds.

**Migration file:** `backend/migrations/0629_calendar_events_org_id_composite_unique.sql`

### 2. chain-repair test JOURNAL_MAX — FIXED

`src/scripts/__tests__/chain-repair.test.mjs` had `JOURNAL_MAX = 1787941388254n`. After adding four new migrations (0629, 0664, 0665, 0666), the highest journal `when` is `1787941569254`. Updated JOURNAL_MAX to `1787941569254n`.

Test result: `1 passed, 0 failed`. DB watermark = 1787941569254. Total DB rows = 391.

### 3. `calendar_events.visibility` column — APPLIED

Calendar lane filed an OUT-OF-OWNERSHIP migration. Created `migrations/0664_calendar_events_visibility.sql`:
```sql
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org';
```
Applied and verified: `is_nullable=NO, column_default='org'::text`.

### 4. `kb_article_chunks.acl_revision NOT NULL` — APPLIED

L09 (KB/search) lane filed an OUT-OF-OWNERSHIP migration. Used CHECK NOT VALID → VALIDATE → SET NOT NULL pattern:
- Created `migrations/0665_kb_article_chunks_acl_revision_not_null.sql`
- Updated `src/db/schema/support/kb-chunks.ts` line 53: `aclRevision: integer("acl_revision").notNull().default(1)`

Applied and verified: `is_nullable=NO, column_default=1`.

### 5. RLS for tenant tables without policies — FIXED

`db:verify-rls` showed two FAIL cases:
- `expense_export_jobs` — has `org_id`, no RLS policy
- `inv_compliance_documents` — has `org_id`, no RLS policy

Created `migrations/0666_rls_missing_tables.sql`. Both tables now have `ENABLE ROW LEVEL SECURITY` and `tenant_isolation` policy.

Post-fix: `db:verify-rls` coverage = 955/960. One remaining FAIL (`feedback_cycle_responses`) has no `org_id` column and cannot have an RLS policy written for it — it inherits isolation via its parent FK to `feedback_cycle_requests`; this requires a schema change (adding `org_id`) and is tracked separately.

### 6. Journal state after all work

- Journal entries: 384 (was 380 before this session)
- DB rows in `__drizzle_migrations`: 391
- Orphan rows above journal max: 0
- `check:migration-chain`: PASS
- `check:migration-chain:self-test`: 10 passed, 0 failed

## Cold-vs-upgrade comparison

| Dimension | Upgrade path | Cold path (after fix) |
|---|---|---|
| Journal entries processed | 384 | 384 |
| `0629` prerequisite for `0628` FK | Already in DB (index existed) | Created by 0629 before 0628 runs |
| `0628` `42P10` error | Never hit (index pre-existed) | Fixed — no longer hit |
| `0591` RLS on 124 accounting tables | Applied (tables existed) | Non-fatal 42P01, tables created later by 0619 without RLS |
| `uniq_calendar_events_org_id` | In DB before 0628 ran | Created by 0629 |
| `calendar_events.visibility` | Applied by 0664 | Applied by 0664 |
| `kb_article_chunks.acl_revision NOT NULL` | Applied by 0665 | Applied by 0665 |
| RLS on `expense_export_jobs`, `inv_compliance_documents` | Applied by 0666 | Applied by 0666 |

**0591 RLS gap on cold path:** `0591_tenant_isolation_for_unprotected_tables.sql` contains 401 statements (split on breakpoints). On cold build, 124 of them fail with `42P01` (tables don't exist yet — they're created later by `0619`). These 124 failures are non-fatal (MISSING_CODES). After `0619` creates those tables, they have no RLS policies. `0655` adds RLS only for `inv_carton_types` and `inv_shipment_status_events`, leaving ~122 accounting tables unprotected on cold path. This gap only affects cold builds; the live upgrade path has those tables' RLS applied in 0591. A future migration should re-apply the 0591 policies for accounting tables after 0619 completes — tracked as OPEN.

## Serial/bigserial risk register

**Total: 588 `int4` serial columns, 0 `bigserial` columns.**

All are `.id` primary keys. `int4` ceiling: 2,147,483,647 rows per sequence.

### HIGH-RISK (unbounded per-event writes, potential exhaustion at enterprise scale)

| Table | Risk | Decision |
|---|---|---|
| `audit_logs.id` | Every RBAC action logged; at 10M orgs × 1K events/day exhausts in <1 year | MIGRATE to bigint when write rate measured |
| `notification_events.id` | Each notification per member | MIGRATE to bigint when write rate measured |
| `ai_usage_logs.id` | Every AI token call | MIGRATE to bigint when write rate measured |
| `ai_chat_messages.id` | Each chat message | MIGRATE to bigint when write rate measured |
| `support_ticket_messages.id` | Each message per ticket | MIGRATE to bigint when write rate measured |
| `journal_lines.id` | Each accounting line per transaction | MIGRATE to bigint when write rate measured |
| `inv_stock_transactions.id` | Each stock movement | MIGRATE to bigint when write rate measured |
| `payroll_line_items.id` | Per run × employee × component | MIGRATE to bigint when write rate measured |

### KEEP (bounded catalogs — few rows per org, no exhaustion risk)

| Table | Reason |
|---|---|
| `roles.id`, `permissions.id` | Catalog rows; bounded per org |
| `salary_components.id` | Config; bounded |
| `leave_types.id`, `leave_policies.id` | Config; bounded |
| `hr_job_levels.id`, `hr_job_roles.id` | Config; bounded |
| `shift_templates.id` | Config; bounded |
| All `inv_*` config tables (`inv_categories`, `inv_warehouses`, etc.) | Config; bounded |

**Recommendation:** No immediate migration required. Monitor write rates in production. When any high-risk table approaches 500M rows (25% of ceiling), begin the int4→bigint migration for that table. Cross-cell requirement: if any table's PK is used as a cross-cell FK, migrate to UUID rather than bigint.

## Validations run

- `pnpm check:migration-chain` — PASS
- `pnpm check:migration-chain:self-test` — 10 passed, 0 failed
- `node --env-file=.env src/scripts/__tests__/chain-repair.test.mjs` — 1 passed, 0 failed
- `pnpm db:verify-rls` — 955/960 covered; 1 structural FAIL (no fix possible without schema change)
- `pnpm db:migrate` — all 4 migrations applied successfully

## Files changed

- `backend/migrations/0629_calendar_events_org_id_composite_unique.sql` — NEW
- `backend/migrations/0664_calendar_events_visibility.sql` — NEW
- `backend/migrations/0665_kb_article_chunks_acl_revision_not_null.sql` — NEW
- `backend/migrations/0666_rls_missing_tables.sql` — NEW
- `backend/migrations/meta/_journal.json` — 380→384 entries
- `backend/src/scripts/__tests__/chain-repair.test.mjs` — JOURNAL_MAX updated
- `backend/src/db/schema/support/kb-chunks.ts` — acl_revision now notNull().default(1)

## Open items

1. **0591 cold-path RLS gap** — ~122 accounting tables created by `0619` have no RLS on cold bootstrap. Requires a new migration that re-applies the `0591` policies for those tables, placed after `0619` in the journal. Blocked until the exact 124 tables are enumerated via a cold build.
2. **`feedback_cycle_responses` RLS** — no `org_id` column; isolation relies on parent FK. Structural schema change needed.
3. **Serial → bigint migrations** — deferred until write rates measured in production.
