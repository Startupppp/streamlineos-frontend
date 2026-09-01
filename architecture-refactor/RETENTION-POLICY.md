# Retention Policy — StreamlineOS

Measured: 2026-09-01. Source: `pg_class + pg_stat_user_tables` on the live Neon instance via `src/scripts/report-table-growth.mjs`.

`pg_stat_statements` is NOT installed on this Neon instance (confirmed). Slow-query identification uses application-layer span telemetry: `alert-seam-latency.mjs` (seam budgets), `alert-p95.mjs` (endpoint p95), `alert-queue-age.mjs` (outbox pressure).

---

## Measured Table Inventory (top tables, 2026-09-01)

| Table | Total MB | Heap MB | Live Rows | Dead Rows | Last Analyze |
|---|---|---|---|---|---|
| kb_article_chunks | 497 | 10 | 30,000 | 0 | 2026-08-31 |
| timesheets | 10 | 1 | 5,000 | 204 | 2026-08-31 |
| chat_messages | 7 | 1 | 4,250 | 0 | 2026-08-30 |
| permissions | 3 | 2 | 731 | 32 | — |
| hr_employments | 3 | 0 | 5,000 | 9 | 2026-08-30 |
| role_permission_grants | 2 | 0 | 5,635 | 444 | — |
| hr_people | 2 | 0 | 5,000 | 9 | 2026-08-30 |
| email_outbox | 1 | 0 | 188 | 31 | 2026-08-29 |
| notification_events | 1 | 0 | 154 | 0 | 2026-08-29 |
| ai_usage_logs | <1 (264 KB) | — | 401 | 0 | — |
| outbox_events | <1 (288 KB) | — | 18 | 54 | — |
| audit_logs | <1 (208 KB) | — | 11 | 0 | — |
| payroll_runs | <1 (272 KB) | — | 5 | 51 | 2026-08-30 |
| hr_legal_holds | <1 | — | 3 | 0 | — |
| notification_deliveries | <1 (168 KB) | — | 2 | 0 | — |
| hr_retention_policies | <1 | — | 0 | 0 | — |
| hr_audit_logs | <1 | — | 0 | 0 | — |

Note on low current row counts: this is a dev/staging instance. `timesheets`, `hr_people`, `hr_employments` at 5,000 rows each are seeded test data. `ai_usage_logs` at 401 rows will grow proportionally to AI feature usage — at enterprise scale (100 orgs × 10 users × 50 AI calls/day = 50,000 rows/day, or 18M rows/year).

---

## Per-Table Decisions

### kb_article_chunks — RETAIN-BOUNDED
- Measured: 30,000 rows, 497 MB total (indexes dominate: HNSW vector index).
- Write path: one chunk per 512-token segment on every article/page publish. A 100-page KB at 5 chunks/page = 500 chunks per org per publish cycle.
- Decision: prune orphaned chunks — those whose parent article/page is deleted, unpublished, or archived. This is not time-based; chunks stay as long as their parent is live.
- Worker: `CronKbChunkRetentionService` (`cron-kb-chunk-retention.service.ts`). Batch 500, `forEachOrg`, loop until empty.
- Partitioning: NOT warranted. The 497 MB is 96% index overhead. The heap is only 10 MB. Partitioning the HNSW index by time is not supported. The correct strategy is orphan pruning, which the worker already does.

### chat_messages — PARTITION+ARCHIVE
- Measured: 4,250 rows, 7.5 MB.
- Write path: every chat message in any org channel or DM. At enterprise scale (1,000 users × 20 messages/day = 20,000 rows/day, or 7.3M rows/year).
- Decision: monthly partitioning + DETACH PARTITION CONCURRENTLY + DROP TABLE. 365-day retention window.
- Partitioning constraint: PK must include `created_at` for the partition key. Bare `id` is not globally unique across partitions. The `(org_id, id)` tenant key is preserved as a UNIQUE INDEX on each partition. FKs from other tables (e.g. `chat_channel_members`) target the parent table, which routes to the correct partition — this is supported in Postgres 14+.
- Worker: `NotificationRetentionService` (`notification-retention.service.ts`). Uses `expiredPartitions()` from `notification-retention-policy.ts`. DETACH CONCURRENTLY cannot run inside a transaction block — the service correctly uses raw DDL outside a tenant tx.
- Status: Partitioning of `chat_messages` is gated on c21-04. The retention mechanism is live and will activate once monthly partitions exist.

### timesheets — KEEP-FOREVER
- Measured: 5,000 rows (seeded), 10.7 MB.
- Write path: one row per employee per pay period. At 500 employees × 26 pay periods/year = 13,000 rows/year per org.
- Decision: KEEP-FOREVER. Timesheets feed payroll calculations and are referenced by `payroll_runs`. They are statutory payroll evidence and may not be deleted by a scheduled sweep.
- No worker. Any deletion is operator-triggered following legal advice.

### ai_usage_logs — RETAIN-BOUNDED
- Measured: 401 rows, 264 KB (seeded/small). Write path: every AI API call. At enterprise scale: 18M rows/year.

- Decision: 730-day retention (2 years). Billing analytics must cover at least one full fiscal year; 2 years covers year-on-year comparisons and typical audit lookback periods.
- Worker: `CronAiUsageRetentionService` (`cron-ai-usage-retention.service.ts`). **Dry-run is the default** — pass `{ dryRun: false }` to actually delete. Resumable Redis cursor (key: `cursor:ai-usage-retention:{orgId}`, TTL 7 days) — a crash mid-sweep resumes from the last committed batch ID rather than restarting. Batch size 500. `forEachOrg` iteration.
- Legal hold: `ai_usage_logs` records token usage against `org_id` and optionally `user_id`. They are not personal data under HR retention law (they are billing records). No legal hold check is needed; `ai_credit_transactions` (the financial ledger) carries the immutable billing obligation and is KEEP-FOREVER.
- Financial proof: `ai_usage_logs` are analytics/telemetry rows. The authoritative billing record is `ai_credit_transactions`. Deleting old `ai_usage_logs` after 2 years does not affect the billing ledger.

### kb_chat_conversations - RETAIN-BOUNDED
- Decision: retain conversation history for the organization-configured `chat_history_retention_days`, defaulting to 90 days.
- Worker: `CronKbChatRetentionService` (`cron-kb-chat-retention.service.ts`). It iterates organizations, deletes in batches of 200, and is exposed through the leased `kb-chat-history-purge` route.
- Legal hold: organization and subject legal-hold handling remains part of the deployed purge drill before this policy is approved for production use.

### webhook_deliveries - RETAIN-BOUNDED
- Decision: retain completed delivery attempts for 90 days; pending attempts are never removed by this worker.
- Worker: `CronBuildRetentionService` (`cron-build-retention.service.ts`). It iterates organizations, deletes in batches of 500, and is exposed through the leased `build-retention-prune` route.
- Provider behavior: endpoint mirrors and downstream provider state require separate deployed evidence.

### notifications (partitioned parent) — PARTITION+ARCHIVE
- Measured: `notifications_y2026_m08` has 355 rows. Other monthly partitions are empty (dev/staging).
- Write path: one row per in-app notification delivery. At enterprise scale: millions of rows/month.
- Decision: 180-day retention. Monthly partitions are detached and dropped when the month's last day is more than 180 days ago.
- Worker: `NotificationRetentionService`. Same mechanism as `chat_messages`.

### notification_events — RETAIN-BOUNDED
- Measured: 154 rows, 1.2 MB.
- Write path: one event row per notification dispatch. Lower volume than `notification_deliveries`.
- Decision: 90-day body purge, 13-month record deletion.
- Worker: `CronNotificationRetentionService` (`cron-notification-retention.service.ts`).

### notification_deliveries — RETAIN-BOUNDED
- Measured: 2 rows, 168 KB.
- Write path: one row per delivery attempt (push, email, in-app) per notification event.
- Decision: 90-day metadata purge (null out rendered body), 13-month record deletion. Metadata (rendered message body) may contain PII or sensitive values (e.g. payslip amounts from email templates).
- Worker: `CronNotificationRetentionService`. Uses `forEachOrg` because `notification_deliveries` has RLS — a bare sweep dies 42501 without the tenant GUC.

### email_outbox — RETAIN-BOUNDED
- Measured: 188 rows, 1.4 MB (high dead-row ratio 14.2% — autovacuum is running).
- Write path: one row per sent email. Rendered HTML/text body may contain sensitive values.
- Decision: 90-day body purge (set `html = ''`, `text = null`), 13-month record deletion.
- Worker: `CronNotificationRetentionService`. Sweeps globally (no RLS on `email_outbox`) and reports capped runs as truncated for explicit retry.

### outbox_events — PARTITION+ARCHIVE
- Measured: 18 rows live, 54 dead, 288 KB.
- Write path: every mutation that needs reliable side-effect delivery emits an outbox event. At scale this grows proportionally to mutation rate.
- Decision: 90-day retention. The outbox relay processes rows to completion; a 90-day-old pending row indicates a stuck relay, not legitimate backlog.
- Partitioning: gated on c21-04 (same as `notifications`, `chat_messages`). `notification_outbox` partition naming convention. Worker: `NotificationRetentionService`.

### audit_logs — KEEP-FOREVER
- Measured: 11 rows, 208 KB.
- Write path: every privileged action logged. Grows with admin operations.
- Decision: KEEP-FOREVER. `audit_logs` carries no `deleted_at` column (verified by `financial-retention.spec.ts`). Migration `0930_audit_logs_append_only_trigger` adds the database-level mutation trigger; the deployed environment must apply and verify it before this control is considered active. No retention worker may select from or delete this table.
- Proof that no worker touches `audit_logs`: `CronAiUsageRetentionService` spec test (E) asserts the source file does not contain `"auditLogs"` or `"audit_logs"`. `CronHrRetentionService` writes TO `hr_audit_logs` (audit trail of what was purged) but never reads from or deletes `audit_logs`.

### hr_audit_logs — KEEP-FOREVER
- Measured: 0 rows, 64 KB (written only by `CronHrRetentionService` as a record of each purge batch).
- Decision: KEEP-FOREVER. These are the audit trail of retention sweeps — deleting them would erase the evidence of compliance.

### payroll_runs — KEEP-FOREVER
- Measured: 5 rows, 272 KB.
- Write path: one row per payroll run. Volume: monthly per org.
- Decision: KEEP-FOREVER. Financial obligation. Immutable after posting (enforced by `assertEntryNotPosted` gate and migration 0793 DB trigger). Referenced by `payroll_pay_items`, `timesheets`, `hr_employments`.
- Proof: `financial-retention.spec.ts` asserts posting blocks mutation and legal holds block org purge.

### hr_people, hr_employments — HR governance
- `hr_people`: 5,000 rows, 2.3 MB. RETAIN-BOUNDED via `hr_retention_policies` (policy-driven, per-org). Soft-delete only. Legal-hold exclusion enforced via subquery before any deletion. Worker: `CronHrRetentionService`.
- `hr_employments`: 5,000 rows, 3.2 MB. KEEP-FOREVER (payroll statutory obligation).

### hr_reporting_lines — KEEP-FOREVER
- Effective-dated reporting history supports employment and payroll auditability. It has no independent deletion worker and must not be removed by a generic HR sweep without an approved statutory-retention rule.
- The coverage verifier classifies `hr_reporting_lines` as KEEP-FOREVER so this high-growth source cannot remain unclassified.

### permissions, role_permission_grants — KEEP-FOREVER (configuration)
- `permissions`: 731 rows, 3 MB. RBAC catalog. Grows as features ship, shrinks when keys are retired. Configuration state. No sweep.
- `role_permission_grants`: 5,635 rows, 2.5 MB. Per-org role grants. Rows are deleted when grants are revoked or roles removed (FK cascade or explicit revocation). Not append-only. Size is bounded by org count × role count. No sweep.

---

## Worker Design

### Retention workers: shared constraints

The following contracts apply to workers that are explicitly wired into a cron route. A
service's presence and unit tests must not be read as proof of operational execution.

1. **Tenant context for row sweeps** — background row-level sweeps have no ambient tenant context; a write without the tenant GUC (`app.current_org_id()`) dies 42501. Those sweeps iterate organizations using `forEachOrg`, which sets the GUC inside each org's transaction. Global partition maintenance and outbox operations follow their own explicitly scoped execution paths.

2. **Bounded batch size** — no single transaction deletes more than 200–1,000 rows. This keeps lock duration short, avoids autovacuum blocking, and makes progress observable.

3. **Legal-hold exclusion checked BEFORE deletion** — `CronHrRetentionService` includes a subquery `NOT IN (SELECT subject_user_id FROM hr_legal_holds WHERE status = 'active' ...)` inside the DELETE/UPDATE `WHERE` clause. The exclusion is atomic with the deletion — it is not a separate pre-check that could be raced.

4. **Dry-run default** — `CronAiUsageRetentionService` defaults to `dryRun: true`. Callers must explicitly pass `{ dryRun: false }` to delete. The cron endpoint should be wired with `dryRun: false` only after a dry-run confirms the expected row count.

5. **Resumable cursor** — `CronAiUsageRetentionService` stores the last processed `id` per org in Redis (`cursor:ai-usage-retention:{orgId}`, TTL 7 days). A crash between batches resumes from the stored position on the next run. When a sweep completes (empty final batch), the cursor is deleted so the next run starts fresh.

6. **Immutable obligation exclusion** — financial tables (`journal_entries`, `journal_lines`, `payroll_runs`), audit tables (`audit_logs`, `hr_audit_logs`), and employment records (`hr_employments`, `timesheets`) are explicitly absent from every worker's SELECT statement. The spec test (E) in `cron-ai-usage-retention.spec.ts` asserts at the source level that these table names do not appear in the AI usage retention worker.

### Scheduling contract inventory

| Worker / operation | Repository route | Authentication and concurrency contract | Current repository status |
|---|---|---|---|
| HR policy retention | `GET`/`POST /cron/hr-policy-retention-sweep` | `CRON_SECRET` plus `CronLeaseService` lease `hr-policy-retention-sweep` (1,800 seconds) | Route and lease are covered by source-contract tests; deployment cadence and successful execution remain unverified |
| Notification row retention | `GET`/`POST /cron/notifications-retention-sweep` | `CRON_SECRET` plus lease `notifications-retention-sweep` (300 seconds) | Route and lease are present; deployment cadence and successful execution remain unverified |
| Notification partition detach/drop | `GET`/`POST /cron/notifications-retention-detach` | `CRON_SECRET`; `NotificationRetentionService` takes its own distributed lease | Route and lease are present; partition creation and deployment remain gated |
| AI usage retention | `GET`/`POST /cron/ai-usage-retention-sweep` | `CRON_SECRET` plus lease `ai-usage-retention-sweep` (1,800 seconds); route invokes `sweep({ dryRun: false })` | Route is present and contract-tested; deployed cadence, alerting, and successful execution remain unverified |
| KB chat history retention | `GET`/`POST /cron/kb-chat-history-purge` | `CRON_SECRET` plus lease `kb-chat-history-purge` (600 seconds); bounded purge batches | Route is present and contract-tested; deployed cadence and successful execution remain unverified |
| KB chunk retention | `GET`/`POST /cron/kb-chunk-retention-sweep` | `CRON_SECRET` plus lease `kb-chunk-retention-sweep` (600 seconds); bounded prune batches | Route is present and contract-tested; deployed cadence and successful execution remain unverified |
| Build webhook retention | `GET`/`POST /cron/build-retention-prune` | `CRON_SECRET` plus lease `build-retention-prune` (120 seconds); bounded prune batches | Route is present and contract-tested; deployed cadence and successful execution remain unverified |

The scheduling contract test is `s05-retention-scheduling-contract.spec.ts`. It verifies route,
secret, lease, and service wiring for the operations above and deliberately asserts that the
AI-usage route is authenticated, leased, and explicitly non-dry-run rather than treating a
callable service alone as operational evidence.

### PARTITION+ARCHIVE (NotificationRetentionService)

- Identifies expired monthly partitions using `expiredPartitions(table, now)` from `notification-retention-policy.ts`.
- Executes `SET lock_timeout = '5s'` before each DDL to prevent blocking the parent table indefinitely.
- `ALTER TABLE ... DETACH PARTITION ... CONCURRENTLY` — no row locks, no exclusive lock on parent. Takes a ShareUpdateExclusiveLock on the parent and a ShareLock on the partition.
- `DROP TABLE IF EXISTS` on the detached (now standalone) table — no FK targets, safe to drop.
- **Cannot run inside a transaction block** — `DETACH PARTITION CONCURRENTLY` is disallowed in a transaction. The service calls `db.execute` directly (not through `runInTenantTransaction`) and uses the owner role (BYPASSRLS, no GUC needed) for DDL.
- Guarded by `CronLeaseService.withLease` to prevent duplicate concurrent runs across multiple instances.

### Partitioning design constraints

Before partitioning any new table:
1. The partition key must be included in every PK and UNIQUE index. For `(org_id, id)` uniqueness, add `created_at` to make `(org_id, id, created_at)` — or accept that the bare `id` PK is unique only within a partition, not globally.
2. FKs from other tables that target a bare `id` PK MUST be reviewed. A partition of `chat_messages` with PK `(id, created_at)` means a FK `message_id REFERENCES chat_messages(id)` is now invalid — it must reference the composite PK or be dropped.
3. Triggering threshold: do not partition a table whose total size is < 1 GB or whose write rate is < 10,000 rows/day. The current DB has no table meeting that threshold in production yet — partitioning is pre-positioned for scale. Measure before applying.

---

## Legal-Hold Interaction

`hr_legal_holds` (3 rows) and `organization_legal_holds` provide two levels of hold:

- **`hr_legal_holds`** (subject_user_id): HR-level hold on a specific employee. Blocks `CronHrRetentionService` from soft-deleting `hr_people`, `hr_cases`, and from physically deleting `attendance` rows for that employee. The exclusion is an atomic subquery in the WHERE clause.
- **`organization_legal_holds`** (org-level): Blocks the org purge worker (`CronOrgPurgeWorkerService`) from proceeding with full org data deletion. The legal hold check runs inside `runInNewTenantTransaction` and returns `{ outcome: "legal-hold" }` BEFORE reaching the adapter deletion loop (proven by `financial-retention.spec.ts`).

Neither hold type prevents PARTITION+ARCHIVE operations on global notification tables, because those tables are DDL-level objects shared across the platform — they are not per-org data rows.

---

## Immutable Financial/Payroll/Audit Obligation Exclusion List

The following tables must never be selected for deletion by any automated retention sweep:

| Table | Obligation | Enforcement |
|---|---|---|
| `audit_logs` | Platform audit trail | No `deleted_at` column; migration `0930` defines the append-only trigger; not referenced by any retention worker |
| `hr_audit_logs` | HR retention sweep audit trail | Only ever written to, never deleted by sweep |
| `journal_entries` | Accounting immutability | DB trigger (migration 0793) blocks UPDATE after POSTED; no `deleted_at` column |
| `journal_lines` | Accounting immutability | DB trigger blocks UPDATE on debit/credit/account_id |
| `payroll_runs` | Payroll statutory obligation | No `deleted_at`; FK children prevent cascade; referenced by timesheets |
| `payroll_pay_items` | Payroll statutory obligation | Same as above |
| `timesheets` | Payroll evidence | No sweep; referenced by payroll_runs |
| `hr_employments` | Employment statutory obligation | KEEP-FOREVER; no sweep |

---

## Slow-Query Telemetry

`pg_stat_statements` is NOT available on this Neon instance (verified: `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')` returns `false`). This is a Neon architectural constraint — the extension requires a superuser to install, and Neon does not expose a true superuser.

**Alternative: application-layer span telemetry**

All slow-query identification uses span logs emitted by `LogSpanExporter` in `main.ts`. Three alert scripts cover the named seam budgets:

| Script | What it measures | Budgets |
|---|---|---|
| `alert-seam-latency.mjs` | Named seam spans (db.pool.wait, db.query.execute, etc.) against SEAM_BUDGETS | db.query.execute: 9 ms; db.roundtrip.complex: 37 ms; route.write: 375 ms |
| `alert-p95.mjs` | p95 latency of the top-N hottest endpoints from SPAN log lines | No fixed budget — operator configures `--threshold-ms` from measured baseline |
| `alert-queue-age.mjs` | Outbox queue age and retry pressure (live DB query) | Default: 300 s age, 500 total retries |

To identify the real slowest queries: pipe the application log to `alert-p95.mjs` and `alert-seam-latency.mjs`. The p95 script normalises UUIDs and IDs to `:id` so per-entity paths collapse to per-endpoint groups. To name a budget for a specific endpoint, run:

```
journalctl -u streamlineos-api --since "7 days ago" -o cat | node src/scripts/alert-p95.mjs --top=20
```

Pick the p95 for each endpoint from the output and add it as `--threshold-ms=N` to the CI alert invocation. Do not invent budgets from guesses — derive them from a measured baseline.

---

## Handoffs (Lane 7 — Migrations)

### chat_messages partition DDL (c21-04 blocker)
The `NotificationRetentionService` is live but the DETACH calls are no-ops until monthly partitions exist. Pending DDL for Lane 7:

```sql
-- Convert chat_messages to a partitioned table (RANGE on created_at, monthly)
-- Pre-condition: backup + maintenance window (this is a table rewrite)
-- The existing PK (id serial) becomes (id, created_at) to include the partition key.
-- UNIQUE (org_id, id, created_at) replaces the bare (org_id, id) tenant key.
-- FKs from chat_reactions, chat_read_receipts etc. targeting chat_messages(id)
--   must be dropped and re-added targeting the composite PK or replaced with
--   (message_id, created_at) composite FKs.
-- Trigger row count check: do not proceed until chat_messages >= 500,000 rows or
--   write rate >= 10,000 rows/day (measure with pg_stat_user_tables.n_tup_ins delta).
ALTER TABLE chat_messages RENAME TO chat_messages_old;
CREATE TABLE chat_messages (
  id            bigint        NOT NULL,
  org_id        text          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  -- ... all other columns ...
  PRIMARY KEY   (id, created_at)
) PARTITION BY RANGE (created_at);
-- Then: CREATE TABLE chat_messages_y2026_m09 PARTITION OF chat_messages
--       FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
-- Pre-create 6 months ahead, drop when > 12 months old via NotificationRetentionService.
```

### ai_usage_logs — no migration needed now
The current table structure (serial `id`, `org_id`, `created_at`) supports the resumable-cursor retention worker without schema changes. If `ai_usage_logs` grows beyond 10M rows, add a partial index:

```sql
CREATE INDEX CONCURRENTLY idx_ai_usage_retention
  ON ai_usage_logs (org_id, id)
  WHERE created_at < NOW() - INTERVAL '730 days';
```

This index makes the retention worker's range scan (`WHERE org_id = $1 AND id > $cursor AND created_at < $cutoff`) cheap without a sequential scan.

---

## Script Names (Lane 6 — package.json)

Add these to `backend/package.json` `scripts`:

```json
"report:table-growth": "node src/scripts/report-table-growth.mjs",
"check:retention-coverage": "node src/scripts/check-retention-coverage.mjs"
```
