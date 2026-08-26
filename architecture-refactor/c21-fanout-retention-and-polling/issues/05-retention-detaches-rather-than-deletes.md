# 05 — Retention detaches rather than deletes

**What to build:** Old notification and chat data ages out on a stated policy, removed by detaching a partition rather than a long-running delete. Today retention covers two tables and not the three that matter.

**Blocked by:** 04 — Three growing tables are partitioned

**Status:** ready-for-agent

## Acceptance criteria

- [x] A retention window is stated per table, recorded rather than implied. — `backend/src/modules/notifications/notification-retention-policy.ts:20-24`: 180 days (notifications), 365 days (chat_messages), 90 days (notification_outbox), each with an explanatory rationale comment.
- [ ] Ageing out detaches a partition; no bulk delete is issued. — **BLOCKED on c21-04 only.** The unwired blocker is gone: `NotificationRetentionService` is now registered in `CronModule` (`cron.module.ts:121`) and reachable at `/cron/notifications-retention-detach` (`cron-platform.controller.ts:119-128`). It was never a duplicate of `CronNotificationRetentionService` — that one issues row-level DELETEs per org, this one detaches and drops. `notification-retention.spec.ts` now asserts every statement it issues is free of DELETE. What remains is that no partitions exist yet, so a detach has nothing to act on.
- [x] The sweep is covered by the job lease so it cannot run twice. — `notification-retention.service.ts:49` wraps the run in `lease.withLease(LEASE_KEY, LEASE_WINDOW_SECONDS)`, and `notification-retention.spec.ts` asserts a held lease produces no statements at all and returns null.
- [x] Detaching is reported, so data removal is visible. — `notification-retention.service.ts:76-84` emits `RETENTION_DETACH: <n> detached, <n> dropped` with a per-table breakdown, and only when something actually moved. Reachable now that the service is registered.

## Todo

- [x] Write the policy down first — `notification-retention-policy.ts:20-24` with written rationale per window.
- [x] Assert no long-running delete is issued — `notification-retention.spec.ts` captures every statement passed to `db.execute` and asserts none contains DELETE. Previously this was only verifiable by reading the source.
- [x] Coordinate with c22-01 for the lease — met by registering in `CronModule`, where `CronLeaseService` is a provider. Registering in `NotificationsModule` was not an option: `CronModule` already imports it, so the dependency would have been a cycle.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** The retention policy and mechanism are fully written. Two blockers prevent the remaining criteria from being ticked: (1) `NotificationRetentionService` is not registered in any `@Module`; it must be added to `CronModule.providers` (where `CronLeaseService` lives) and exposed from there via a cron endpoint, not the notifications module. (2) No partitions exist yet (c21-04 is open), so every DETACH is a no-op even when wired. Fix (1) is a ~10-line code change; fix (2) requires completing c21-04.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
