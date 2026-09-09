# Retention scheduling audit

Audited: 2026-09-01.

This repository audit supports the [active module backlog](prd/README.md), [RETENTION-POLICY.md](RETENTION-POLICY.md), the cron controllers, and the retention modules. It records implementation evidence only. It does not establish deployment cadence, successful execution, alert delivery, provider behavior, or policy approval.

## Scheduled repository routes

| Operation | Route | Repository controls | Evidence boundary |
|---|---|---|---|
| HR policy retention | `GET`/`POST /cron/hr-policy-retention-sweep` | `CRON_SECRET`, `CronLeaseService`, 1,800-second lease, `CronHrRetentionService` | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| Notification row retention | `GET`/`POST /cron/notifications-retention-sweep` | `CRON_SECRET`, `CronLeaseService`, 300-second lease, `CronNotificationRetentionService` | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| Notification partition maintenance | `GET`/`POST /cron/notifications-retention-detach` | `CRON_SECRET`, service-level distributed lease, `NotificationRetentionService` | Route and dependency wiring are source-tested; partition deployment and execution are unverified |
| AI usage retention | `GET`/`POST /cron/ai-usage-retention-sweep` | `CRON_SECRET`, `CronLeaseService`, 1,800-second lease, explicit non-dry-run invocation | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| KB chat history retention | `GET`/`POST /cron/kb-chat-history-purge` | `CRON_SECRET`, `CronLeaseService`, 600-second lease, bounded purge batches | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| KB chunk retention | `GET`/`POST /cron/kb-chunk-retention-sweep` | `CRON_SECRET`, `CronLeaseService`, 600-second lease, bounded prune batches | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| Build webhook retention | `GET`/`POST /cron/build-retention-prune` | `CRON_SECRET`, `CronLeaseService`, 120-second lease, bounded prune batches | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| Outbox events retention | `GET`/`POST /cron/outbox-events-retention-sweep` | `CRON_SECRET`, `CronLeaseService`, 1,800-second lease, `CronOutboxRetentionService`, terminal rows (DELIVERED/DEAD/SUPPRESSED) older than 30 days, batch 1,000 | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |
| Notification outbox retention | `GET`/`POST /cron/notification-outbox-retention-sweep` | `CRON_SECRET`, `CronLeaseService`, 1,800-second lease, `CronNotificationOutboxRetentionService`, terminal rows (PROCESSED/DEAD) older than 30 days, batch 500, `forEachOrg` | Route and dependency wiring are source-tested; deployment cadence and execution are unverified |

The repository test is [s05-retention-scheduling-contract.spec.ts](../backend/src/modules/cron/__tests__/s05-retention-scheduling-contract.spec.ts). It checks route authentication, leases, service calls, and `CronModule` registration.

## S05 assessment

Repository coverage is present for the nine retention routes above, including authentication, distributed leases, bounded or resumable worker contracts where implemented, and selected audit outcomes.

**Additions since 2026-09-01 audit:**
- `outbox_events` and `notification_outbox` decisions closed from PENDING-DECISION to RETAIN-BOUNDED; sweeps implemented and contract-tested.
- `CronLeaseService.withLease` now writes `cron:heartbeat:<jobKey>` (ISO timestamp, 7-day TTL) to Redis after every successful sweep and `cron:last-error:<jobKey>` (JSON, 7-day TTL) on failure. Dead-man signal contract is asserted by `cron-dead-man-signal.spec.ts`.

**Still open (S05 checklist and release gates must remain open):**
- Scheduler is external (HTTP routes, not in-process `@Cron`). The dead-man signal is in Redis; the alert script that reads it (`src/scripts/alert-retention-dead-man.mjs`) has not yet been created — it must read `REDIS_URL`, accept `--sweep=<key>` and `--max-age-hours=N`, fire if the heartbeat is missing or stale, and be registered in `alert-dispatch.mjs` and `check-alert-system.mjs`.
- Deployment cadence and successful execution are not represented by repository tests.
- Deployed retry, alerting, object/search/vector/cache/analytics downstream deletion, and PITR aging remain unverified.
- Immutable payroll, financial, and audit retention remains an exclusion/retention decision, not deletion evidence.
