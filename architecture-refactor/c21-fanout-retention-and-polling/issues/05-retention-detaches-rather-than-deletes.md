# 05 — Retention detaches rather than deletes

**What to build:** Old notification and chat data ages out on a stated policy, removed by detaching a partition rather than a long-running delete. Today retention covers two tables and not the three that matter.

**Blocked by:** 04 — Three growing tables are partitioned

**Status:** done — policy recorded, detach path live against real partitions, lease-guarded, reported, and the invalid-syntax bug that would have silenced it fixed

## Acceptance criteria

- [x] A retention window is stated per table, recorded rather than implied. — `backend/src/modules/notifications/notification-retention-policy.ts:20-24`: 180 days (notifications), 365 days (chat_messages), 90 days (notification_outbox), each with an explanatory rationale comment.
- [x] Ageing out detaches a partition; no bulk delete is issued. — `notifications` is partitioned by `0582`, so there are partitions to detach. `NotificationRetentionService` is registered in `CronModule` (`cron.module.ts:121`), reachable at `/cron/notifications-retention-detach` (`cron-platform.controller.ts:119-128`), and `notification-retention.spec.ts` asserts every statement it issues is free of `DELETE`. It was never a duplicate of `CronNotificationRetentionService`, which issues row-level DELETEs per org.

  **Wiring it up exposed a bug that was invisible while no partitions existed.** The sweep emitted `DETACH PARTITION IF EXISTS`, which is not valid Postgres — `IF EXISTS` binds the table in `ALTER TABLE`, not the partition. Every expired partition would have raised a syntax error, been logged as a warning by the non-benign branch, and detached nothing; the counter also read `detached = 1` on the strength of the statement not throwing. Fixed in backend `c1fbb6e0`: it probes `to_regclass` first and returns early when the partition is absent, which is the normal case for `chat_messages` and `notification_outbox`.

  **Those two are deliberately unpartitioned** (see c21-04) and remain in the retention policy, so the sweep is a clean no-op for them rather than an error.
- [x] The sweep is covered by the job lease so it cannot run twice. — `notification-retention.service.ts:49` wraps the run in `lease.withLease(LEASE_KEY, LEASE_WINDOW_SECONDS)`, and `notification-retention.spec.ts` asserts a held lease produces no statements at all and returns null.
- [x] Detaching is reported, so data removal is visible. — `notification-retention.service.ts:76-84` emits `RETENTION_DETACH: <n> detached, <n> dropped` with a per-table breakdown, and only when something actually moved. Reachable now that the service is registered.

## Todo

- [x] Write the policy down first — `notification-retention-policy.ts:20-24` with written rationale per window.
- [x] Assert no long-running delete is issued — `notification-retention.spec.ts` captures every statement passed to `db.execute` and asserts none contains DELETE. Previously this was only verifiable by reading the source.
- [x] Coordinate with c22-01 for the lease — met by registering in `CronModule`, where `CronLeaseService` is a provider. Registering in `NotificationsModule` was not an option: `CronModule` already imports it, so the dependency would have been a cycle.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-27):** All four criteria met. The one that took the longest to become true was the first, and not because the mechanism was missing — it was written and tested well before there was anything to detach. What closed it was `0582` creating partitions, and what nearly kept it closed-in-name-only was `DETACH PARTITION IF EXISTS`: valid-looking, accepted by no Postgres, and completely hidden while every detach was a no-op against a table with no partitions.

**Superseded audit note (2026-08-26):** The retention policy and mechanism are fully written. Two blockers prevent the remaining criteria from being ticked: (1) `NotificationRetentionService` is not registered in any `@Module`; it must be added to `CronModule.providers` (where `CronLeaseService` lives) and exposed from there via a cron endpoint, not the notifications module. (2) No partitions exist yet (c21-04 is open), so every DETACH is a no-op even when wired. Fix (1) is a ~10-line code change; fix (2) requires completing c21-04.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
