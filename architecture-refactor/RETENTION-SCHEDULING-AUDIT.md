# Retention scheduling audit

Audited: 2026-09-01.

This repository audit supports the [single completion PRD](PRD-10-10-TODO.md), [RETENTION-POLICY.md](RETENTION-POLICY.md), the cron controllers, and the retention modules. It records implementation evidence only. It does not establish deployment cadence, successful execution, alert delivery, provider behavior, or policy approval.

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

The repository test is [s05-retention-scheduling-contract.spec.ts](../backend/src/modules/cron/__tests__/s05-retention-scheduling-contract.spec.ts). It checks route authentication, leases, service calls, and `CronModule` registration.

## S05 assessment

Repository coverage is present for the seven retention routes above, including authentication, distributed leases, bounded or resumable worker contracts where implemented, and selected audit outcomes. The repository does not contain enough evidence to close the S05 retention item:

- deployment cadence and successful execution are not represented by repository tests;
- notification retention does not expose a durable per-run audit record in the worker result contract;
- deployed retry, alerting, object/search/vector/cache/analytics downstream deletion, and PITR aging remain unverified;
- immutable payroll, financial, and audit retention remains an exclusion/retention decision, not deletion evidence.

The S05 checklist and release gates must remain open for these items. This audit adds no deployment evidence, approval record, or operator/GDPR implementation.
