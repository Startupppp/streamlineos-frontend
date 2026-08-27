# 05 — Retention detaches rather than deletes

**What to build:** Old notification and chat data ages out on a stated policy, removed by detaching a partition rather than a long-running delete. Today retention covers two tables and not the three that matter.

**Blocked by:** 04 — Three growing tables are partitioned

**Status:** ready-for-agent

## Acceptance criteria

- [x] A retention window is stated per table, recorded rather than implied. — `backend/src/modules/notifications/notification-retention-policy.ts:20-24`: 180 days (notifications), 365 days (chat_messages), 90 days (notification_outbox), each with an explanatory rationale comment.
- [ ] Ageing out detaches a partition; no bulk delete is issued. — **BLOCKED:** on c21-04 (partitions must exist before a DETACH is a real operation). The mechanism is written at `notification-retention.service.ts:99-133` (`DETACH PARTITION CONCURRENTLY` + `DROP TABLE IF EXISTS`; no DELETE issued). Additional blocker: `NotificationRetentionService` is not registered in any NestJS module — it cannot be instantiated at runtime. The injected `CronLeaseService` is in `CronModule` without an `exports` array, so the service must be registered there (not in `NotificationsModule`).
- [ ] The sweep is covered by the job lease so it cannot run twice. — **BLOCKED:** same as above; code is correct at `notification-retention.service.ts:49` (`this.lease.withLease(LEASE_KEY, LEASE_WINDOW_SECONDS, ...)`) but service is unwired.
- [ ] Detaching is reported, so data removal is visible. — **BLOCKED:** same; log call at `notification-retention.service.ts:78-83` and `125` is written but unreachable until wired.

## Todo

- [x] Write the policy down first — `notification-retention-policy.ts:20-24` with written rationale per window.
- [ ] Assert no long-running delete is issued — no spec file exists for `NotificationRetentionService`; the absence of a DELETE call is only verifiable by reading the source, not by a test.
- [ ] Coordinate with c22-01 for the lease — `CronLeaseService.withLease` is used in the source (`notification-retention.service.ts:49`) but the service is not wired. Once wired into `CronModule` (where `CronLeaseService` is available), this todo is met.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** The retention policy and mechanism are fully written. Two blockers prevent the remaining criteria from being ticked: (1) `NotificationRetentionService` is not registered in any `@Module`; it must be added to `CronModule.providers` (where `CronLeaseService` lives) and exposed from there via a cron endpoint, not the notifications module. (2) No partitions exist yet (c21-04 is open), so every DETACH is a no-op even when wired. Fix (1) is a ~10-line code change; fix (2) requires completing c21-04.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
