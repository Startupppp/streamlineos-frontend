# Retention Policy — StreamlineOS

Reference policy/evidence. Current work: [completion-plan.md](prd/completion-plan.md), OPS-003 and OPS-PRIVACY. Dated measurements and proposed retention periods below are not new production approval; reconcile the approved decision register and enforce legal holds before destructive actions.

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
- Historical proposal: monthly partitioning and 365-day retention. This is not an approved current DDL task; verify measured need, actual table ownership, FK compatibility and legal-hold/recovery requirements through OPS-PRIVACY before implementing.
- Partitioning constraint: PK must include `created_at` for the partition key. Bare `id` is not globally unique across partitions. The `(org_id, id)` tenant key is preserved as a UNIQUE INDEX on each partition. FKs from other tables (e.g. `chat_channel_members`) target the parent table, which routes to the correct partition — this is supported in Postgres 14+.
- Worker ownership is not certified for chat by the notification service's existence. Trace current NotificationRetentionService / notification-retention-policy.ts table allowlist before claiming chat retention is wired.
- Status: conditional design and runtime verification only; no instruction to create partitions merely to activate a historically described mechanism.

### timesheets — KEEP-FOREVER
- Measured: 5,000 rows (seeded), 10.7 MB.
- Write path: one row per employee per pay period. At 500 employees × 26 pay periods/year = 13,000 rows/year per org.
- Decision: KEEP-FOREVER. Timesheets feed payroll calculations and are referenced by `payroll_runs`. They are statutory payroll evidence and may not be deleted by a scheduled sweep.
- No worker. Any deletion is operator-triggered following legal advice.

### ai_usage_logs — RETAIN-BOUNDED
- Measured: 401 rows, 264 KB (seeded/small). Write path: every AI API call. At enterprise scale: 18M rows/year.

- Decision: 730-day retention (2 years). Billing analytics must cover at least one full fiscal year; 2 years covers year-on-year comparisons and typical audit lookback periods.
- Worker: `CronAiUsageRetentionService` (`cron-ai-usage-retention.service.ts`). **Dry-run is the default** — pass `{ dryRun: false }` to actually delete. Resumable Redis cursor (key: `cursor:ai-usage-retention:{orgId}`, TTL 7 days) — a crash mid-sweep resumes from the last committed batch ID rather than restarting. Batch size 500. `forEachOrg` iteration.
- Legal hold/privacy: usage records can reference organization and user identities. Billing/telemetry classification alone does not waive subject or organization holds. OPS-PRIVACY must reconcile the approved policy and actual enforcing sweep; ai_credit_transactions remains the distinct immutable financial ledger.
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
- Worker: `NotificationRetentionService`. Chat ownership is separately unverified; do not infer it from notification partition maintenance.

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

### documents — RETAIN-BOUNDED
- Decision: policy-driven deletion or anonymization through `CronHrRetentionService` using `hr_retention_policies` with bounded batches and legal-hold exclusion.
- Worker: `CronHrRetentionService` (`recordType=document`).

### attendance — RETAIN-BOUNDED
- Decision: policy-driven physical deletion through `CronHrRetentionService` using `hr_retention_policies` with bounded batches and subject legal-hold exclusion.
- Worker: `CronHrRetentionService` (`recordType=attendance`).
- The worker scopes selection and deletion to the organization and excludes subjects covered by active HR legal holds.

### helpdesk_tickets — RETAIN-BOUNDED
- Decision: 730-day (2-year) retention after `resolved_at`. Only resolved or closed tickets are eligible; open and in-progress tickets are never swept.
- Rationale: Employee-support cases may be referenced in escalation investigations or HR disputes for up to 2 years post-resolution. Beyond that, the statutory and business justification lapses.
- Worker: `CronHelpdeskRetentionService` (`cron-helpdesk-retention.service.ts`). Uses `forEachOrg`, batch 200, legal-hold exclusion (subjects under `hr_legal_holds` where `status = 'active'`). Comments cascade-delete via FK (`onDelete: cascade`). Writes audit record to `hr_audit_logs`.
- Route: `GET`/`POST /cron/helpdesk-retention-sweep`, `CRON_SECRET` + `CronLeaseService` lease `helpdesk-retention-sweep` (1800 seconds).
- Immutable obligation: ticket comments and assignee history that are referenced by an active HR legal hold are excluded from deletion.

### kb_page_versions — KEEP-FOREVER
- Decision: KEEP-FOREVER, taken 2026-09-02 during S10. Page revision history is the audit trail for wiki content: who changed what and when, and the only way to restore a page after a bad edit or a vandalised paste. `kb_article_versions` has always been insert-only, so a rolling window on the page side made the two halves of Knowledge disagree about whether history is trustworthy, and PRD §10.16 requires immutable revisions.
- **Corrected an undocumented silent deletion.** `kb-page-edit.util.ts` previously hard-deleted the oldest `kb_page_versions` row once a page reached `MAX_VERSIONS = 100`, so the 101st edit destroyed revision 1 with no audit entry and no operator visibility. This table had no entry in this document at all, so the behaviour was policy by accident. The delete is removed; the table is now insert-only.
- No worker. Growth is bounded by design, not by deletion: `snapshotIfNeeded` already throttles on `VERSION_WINDOW_MS`, so a page accrues at most one version per window regardless of edit frequency — continuous typing produces one row, not one per keystroke. That throttle is now load-bearing and must not be removed without revisiting this decision.
- Because history is unbounded, `listVersions` is keyset-paged rather than capped; a bare `LIMIT` here would silently truncate growing work.
- Immutable obligation: `kb_page_versions` carries no `deleted_at`. Physical deletion is operator-triggered only, and org-level erasure removes them through the page's own cascade under the GDPR path, not through a retention sweep.

### performance_reviews — KEEP-FOREVER
- Decision: KEEP-FOREVER. Performance reviews are employment records used in succession planning, compensation decisions, and dispute resolution. They are referenced by `review_cycles`, feed into `goals` and `key_results`, and constitute evidence of HR decision-making under employment law in most jurisdictions (typically 7 years). Scheduling automated deletion without a per-org statutory-retention rule risks destroying legally required evidence.
- No worker. Any deletion is operator-triggered following legal advice and is restricted to orgs with an approved statutory-retention policy.
- Immutable obligation: `performance_reviews` carries no `deleted_at` column. Physical deletion requires an approved per-org policy and a migration that adds the lifecycle column first.

### mail_message_metadata — RETAIN-BOUNDED
- Decision: 365-day (1-year) retention from `synced_at`. Mail metadata is synced from provider mailboxes as a cache for the platform's mail UI. The authoritative record remains at the provider; this table is a re-syncable projection, not the system of record.
- Worker: `CronMailRetentionService` (`cron-mail-retention.service.ts`). Uses `forEachOrg`, batch 500. Physical DELETE (no `deleted_at` — records are a re-syncable projection). Provider authority alone does not prove local metadata is exempt from legal holds; verify the approved local/provider policy before destructive sweeps. Writes audit record to `hr_audit_logs` when rows are deleted.
- Route: `GET`/`POST /cron/mail-metadata-retention-sweep`, `CRON_SECRET` + lease `mail-metadata-retention-sweep` (1800 seconds).
- No child FK dependents: `pg_constraint` query against the live catalog returns 0 rows for `mail_message_metadata` as parent — DELETE is safe with no cascade required.

### announcements — RETAIN-BOUNDED
- Decision: Two sweep phases.
  1. Expired announcements: delete where `expires_at IS NOT NULL AND expires_at < NOW() - 90 days`. A 90-day grace period allows analytics and read-receipt data to be captured before physical deletion.
  2. Aged announcements: delete where `created_at < NOW() - 730 days`. Any announcement older than 2 years — expired or not — is no longer relevant to the organization's communication record.
- `announcementTargets` and `announcementReads` cascade-delete via FK (`onDelete: cascade`).
- Worker: `CronAnnouncementsRetentionService` (`cron-announcements-retention.service.ts`). Uses `forEachOrg`, batch 200 per phase. Writes audit record to `hr_audit_logs`.
- Route: `GET`/`POST /cron/announcements-retention-sweep`, `CRON_SECRET` + lease `announcements-retention-sweep` (1800 seconds).

### notification_outbox — RETAIN-BOUNDED
- Decision: 30-day retention for terminal states (PROCESSED, DEAD). PENDING and IN_FLIGHT rows are never touched by this worker — they are actively being worked and must not be deleted.
- Replay safety: any PROCESSED or DEAD row older than 30 days has either been successfully delivered or has exhausted retries. The `alert-dead-outbox.mjs` fires within 24 hours on any new DEAD row, so operator intervention happens well before the 30-day window.
- Worker: `CronNotificationOutboxRetentionService` (`cron-notification-outbox-retention.service.ts`). Uses `forEachOrg` (RLS live on `notification_outbox`). Batch 500, `for(;;)` bounded per org up to 50 batches, reports `truncated: true` if cap is hit.
- Route: `GET`/`POST /cron/notification-outbox-retention-sweep`, `CRON_SECRET` + `CronLeaseService` lease `notification-outbox-retention-sweep` (1800 seconds).

### outbox_events — RETAIN-BOUNDED
- Decision: 30-day retention for terminal states (DELIVERED, DEAD, SUPPRESSED). PENDING and IN_FLIGHT rows are never touched — they are actively being relayed or pending relay.
- Replay safety: `alert-dead-outbox.mjs` fires within 24 hours on any DEAD row. 30 days is generous for post-mortem replay needs. The corresponding `inbox_records` rows (where `processed_at IS NOT NULL AND processed_at < cutoff`) are also swept in the same run.
- Worker: `CronOutboxRetentionService` (`cron-outbox-retention.service.ts`). Global sweep using the owner role (no tenant GUC needed — outbox operations follow their own execution path under the scheduling contract below). Batch 1000, batched loop up to 50 batches, reports `truncated: true` if cap is hit.
- Route: `GET`/`POST /cron/outbox-events-retention-sweep`, `CRON_SECRET` + `CronLeaseService` lease `outbox-events-retention-sweep` (1800 seconds).

### Dead-man heartbeat signal
- `CronLeaseService.withLease` writes `cron:heartbeat:<jobKey>` (ISO timestamp, 7-day TTL) to Redis after every successful sweep completion. On failure, writes `cron:last-error:<jobKey>` (JSON `{error, ts}`, 7-day TTL).
- **Observing staleness**: read `cron:heartbeat:<sweep-key>` from Redis. If the key is absent (TTL expired) or older than 2 × expected run interval, the sweep has not run recently. Alert on absence or age > threshold.
- **Implementation exists:** src/scripts/alert-retention-dead-man.mjs and alert-dispatch registration are present. OPS-002 owns remaining detector-gate/runbook coverage and actual missing/stale/healthy heartbeat delivery proof. Do not create a duplicate script.

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
| Helpdesk ticket retention | `GET`/`POST /cron/helpdesk-retention-sweep` | `CRON_SECRET` plus `CronLeaseService` lease `helpdesk-retention-sweep` (1,800 seconds); resolved tickets older than 2 years, batch 200, legal-hold exclusion | Route and lease are contract-tested; deployment cadence and successful execution remain unverified |
| Mail metadata retention | `GET`/`POST /cron/mail-metadata-retention-sweep` | `CRON_SECRET` plus lease `mail-metadata-retention-sweep` (1,800 seconds); synced mail metadata older than 1 year, batch 500 | Route and lease are contract-tested; deployment cadence and successful execution remain unverified |
| Announcements retention | `GET`/`POST /cron/announcements-retention-sweep` | `CRON_SECRET` plus lease `announcements-retention-sweep` (1,800 seconds); expired (grace 90 days) and aged (2 years) announcements, batch 200 per phase | Route and lease are contract-tested; deployment cadence and successful execution remain unverified |

| Outbox terminal-event retention | GET/POST /cron/outbox-events-retention-sweep | CRON_SECRET plus CronLeaseService, 1,800 seconds; terminal DELIVERED/DEAD/SUPPRESSED rows older than the recorded 30-day policy, batches 1,000 | Source contract only; deployed cadence, holds and replay/restore proof remain open |
| Notification outbox retention | GET/POST /cron/notification-outbox-retention-sweep | CRON_SECRET plus CronLeaseService, 1,800 seconds; terminal PROCESSED/DEAD, recorded 30-day policy, batches 500 with forEachOrg | Source contract only; deployed cadence, holds and replay/restore proof remain open |

The scheduling contract test is [s05-retention-scheduling-contract.spec.ts](../backend/src/modules/cron/__tests__/s05-retention-scheduling-contract.spec.ts). It verifies route,
secret, lease, and service wiring for the operations above and deliberately asserts that the
AI-usage route is authenticated, leased, and explicitly non-dry-run rather than treating a
callable service alone as operational evidence.

### PARTITION+ARCHIVE (NotificationRetentionService)

- Identifies expired monthly partitions using `expiredPartitions(table, now)` from `notification-retention-policy.ts`.
- Executes `SET lock_timeout = '5s'` before each DDL to prevent blocking the parent table indefinitely.
- `ALTER TABLE ... DETACH PARTITION ... CONCURRENTLY` — no row locks, no exclusive lock on parent. Takes a ShareUpdateExclusiveLock on the parent and a ShareLock on the partition.
- Dropping a detached table requires actual dependency, held-data and recovery verification; detachment or IF EXISTS alone does not prove safe deletion.
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

A global partition may contain held subjects or organizations. DDL-level operation is not a legal-hold exemption. OPS-PRIVACY must prove an approved hold-aware retention/restore design before dropping shared partitions.

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

`pg_stat_statements` is NOT available on this Neon instance (verified: `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')` returns `false`). This is a dated observation of that named instance, not proof the extension is unavailable in every supported deployment. Inspect the explicitly authorized current target before selecting telemetry.

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

### Partition and index changes are conditional, not an open migration assignment

The earlier illustrative chat table rewrite and time-varying partial-index example were removed. Preserve current schema until measured workload, full PK/UNIQUE/FK compatibility, legal-hold behavior and recovery evidence justify a reviewed design. Never drop an integrity relationship merely to make partitioning possible. For AI-usage retention, measure the actual tenant/cursor/cutoff query and design a valid stable index only when its plan justifies one. OPS-PRIVACY owns contradictions between historical worker claims and current source; this document does not authorize destructive DDL.

---

## Script Names (Lane 6 — package.json)

These scripts already exist in backend/package.json; use the existing entries rather than recreate them:

```json
"report:table-growth": "node src/scripts/report-table-growth.mjs",
"check:retention-coverage": "node src/scripts/check-retention-coverage.mjs"
```

## Scheduling evidence boundaries

Consolidated from the redundant scheduling audit. The nine original route contracts, including the two outbox routes above, preserve authentication, leases, bounded/resumable work and selected audit outcomes. cron-dead-man-signal.spec.ts covers heartbeat/error signals; a source test is not proof of a deployed scheduler. Verify current external versus in-process scheduling configuration, cadence, successful run, retry, missing-heartbeat alarm and downstream deletion. Immutable payroll/financial/audit retention and legal holds remain explicit decisions, not deletion proof. Pending/in-flight events must survive retention; terminal retention must not silently erase unreconciled failures.
