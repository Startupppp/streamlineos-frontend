# TASKS — Notifications & Realtime Delivery

Updated: 2026-08-11 · **Done: 13/38**

> Concurrent programmes keep separate trackers. Inventory owns `TASKS.md`.
> Audit `docs/refactor/notifications-phase0-audit.md` · Plan
> `docs/refactor/notifications-phase1-schema-plan.md` · Decisions `DECISIONS-NOTIFICATIONS.md` ·
> State `REFACTOR-STATE-NOTIFICATIONS.md`

Evidence rule: `[x]` requires a command and its output seen in-session. Nothing is checked
from memory. `[!]` = blocked. `[~]` = implemented, not verifiable in this environment.

---

## P0 — all closed

- [x] **REG-001** All 19 `accounting.*` events undeliverable — `category: "ACCOUNTING"` absent from the pgEnum
      Evidence: migration `0408` applied; probe `INSERT … 'ACCOUNTING'::notification_category` went from
      `22P02 invalid input value for enum` to `id=12 category=ACCOUNTING`; registry events with an
      invalid category 19 → 0; backend typecheck exit 0, 0 errors.
- [x] **PIPE-003** No permission re-check at delivery — zero `AccessService` refs in notifications/push/realtime
      Evidence: migrations `0410`/`0411` applied; `visibility_resource_kind` column and `NO_ACCESS`
      enum label confirmed present in the live DB; a `SUPPRESSED`/`NO_ACCESS` delivery row persists
      (probe, rolled back); typecheck exit 0.
- [x] **SEC-002/SEC-003** No bounce/complaint webhook; suppression not enforced on the direct-email path
      Evidence: migration `0412` applied; `email_suppressions` + `uniq_email_suppressions_global` +
      `uniq_email_suppressions_org` + `idx_email_suppressions_lookup` confirmed in `pg_indexes`; probe
      showed a duplicate platform-wide row rejected `23505` and a per-org row coexisting; typecheck exit 0.
- [x] **SEND-BYPASS (enforcement half)** — suppression gates all 75 direct-send sites via one method
      Evidence: gate added in `EmailOutboxService.enqueueAndTry`, which every named sender reaches
      through the `email.service.ts:46` override; typecheck exit 0.

## Also shipped

- [x] **SEC-009** No retention sweep — rendered bodies kept forever
      Evidence: migration `0413` applied; 3 indexes confirmed in `pg_indexes`;
      `/cron/notifications-retention-sweep` wired; probe on seeded rows — 200-day-old payslip keeps
      subject/recipient/status with `html` = `""`, 500-day-old row deleted; typecheck exit 0.
- [x] **RT-001** Push payloads carried record content
      Evidence: `pushPayloadSchema` is `{category?, url?, notificationId?}` with no free-text field;
      4 call sites converted; `push-payload.spec.ts` asserts a smuggled `body` is stripped by the
      parse; typecheck exit 0.
- [x] **RT-002** Three open tabs produced three OS notifications
      Evidence: `frontend/public/sw.js` sets `tag: notif-${notificationId}`; the service worker is
      shared across tabs.
- [x] **REG-004** Emitted keys undeclared — `build:ticket:assigned` vs catalog `project.task.assigned`
      Evidence: 9 catalog keys renamed to `build.*`; 3 call sites moved from `notifications.create()`
      to `dispatch.emit()`; `build.ticket` visibility resolver registered; migration `0414` applied —
      `notification_events` 126 → 117, exactly 9 deleted, 0 `project.*` rows remain; preconditions
      verified first (`notification_preferences` 0 rows, org overrides 0); typecheck exit 0.

---

## Open — correctness

- [ ] **PIPE-001** Delivery intent not durable — `registerAfterCommit` is an in-memory hook
- [ ] **PIPE-006** Fan-out is one transaction per recipient
- [ ] **PIPE-015** Deactivation does not cancel queued deliveries
- [x] **PIPE-011** No self-notification exclusion — actor stored but never filtered
      Evidence: `notification-dispatch.service.ts` filters `actorUserId` out of `targetUserIds`
      before `filterOrgMemberIds`, with an explicit `notifySelf?: boolean` opt-out on
      `DispatchEventInput`; typecheck exit 0.
- [ ] **PIPE-012** No TTL — stale notifications deliver instead of expiring
- [ ] **PIPE-014** Locale hardcoded `"en"`
- [ ] **PIPE-010** Backoff without jitter; no circuit breaker
- [ ] **PIPE-008** `digestMode` stored, never scheduled
- [ ] **PIPE-004** Dedupe is first-write-wins, not aggregation
- [ ] **PIPE-013** `rate_limit_max = 0` on every event; no per-tenant cap
- [ ] **REG-003** 77 declared events still never emitted
- [ ] **REG-005** `eventKey` still a free-form `string`
- [ ] **REG-006** Catalog-integrity spec exists but no CI step runs it
- [ ] **REG-007** Unknown `{{var}}` renders as `""`
- [ ] **REG-008** No rendered-content snapshot on the delivery record
- [ ] **REG-002** Seeding inserts but never updates existing rows

## Open — schema

- [ ] **SCH-001** `serial` int4 PKs on the highest-fan-out tables
- [ ] **SCH-003** Preferences are 4 JSONB blobs
- [x] **SCH-011** `notification_preferences` UNIQUE on `user_id` alone — a two-org user shared one row
      Evidence: migration `0415` applied — `pg_constraint` no longer lists
      `notification_preferences_user_id_unique`; `uniq_notification_preferences_org_user` present in
      `pg_indexes`; row count 0 → 0. Needed `ALTER TABLE … DROP CONSTRAINT`, not `DROP INDEX`.
- [~] **SCH-012** `quiet_hours_timezone` defaulted `'UTC'` vs `user_preferences.timezone` `'Asia/Kolkata'`
      Read side done: `routeMany` batch-loads `user_preferences.timezone` and `resolvePrefs` uses it;
      typecheck exit 0. **Column deliberately NOT dropped** — expand-contract forbids dropping in the
      same step as the code that stops reading. Write path + DROP are the contract step.
- [x] **SCH-013** `uq_notification_events_org_key` enforces nothing (nullable `org_id`, all rows global)
      Evidence: migration `0415` applied; `uniq_notification_events_global_key` present in
      `pg_indexes`; 0 duplicate global keys verified before creating it.
- [ ] **SCH-002** Timestamps are `timestamp`, not `timestamptz`
- [ ] **SCH-005/006** `push_subscriptions` lacks `last_seen_at`; bare global UNIQUE on `endpoint`
- [ ] **SCH-007/008** Unread index not org-led; useless `priority` index
- [ ] **SCH-015/016/017/018** queue `delivery_id` not unique; two-statement claim; `broadcasts` JSONB; missing FK
- [!] **SCH-014** `email_outbox.organization_id` nullable — **BLOCKED by SEQ-001**, see `DECISIONS-NOTIFICATIONS.md`
- [ ] **SCH-004** Partitioning — **deferred by decision D-2**, trigger recorded

## Open — compliance

- [ ] **COMP-002** No unsubscribe endpoint, no `List-Unsubscribe`
- [ ] **COMP-003** No consent records
- [!] **COMP-004** India DLT registration — **hard external blocker**, human-only
- [ ] **COMP-005** WhatsApp template approval state not modelled
- [ ] **SEC-007** Net pay rendered into the payslip email body
- [x] **SEC-004** `hr-form:public-*` and `platform-visit` missing from `TIERS` — silently unlimited
      Evidence: repo sweep of every literal reaching a rate-limit call found exactly 3 undeclared
      (`hr-form:public-view`, `hr-form:public-submit`, `platform-visit`); all 3 added. **Root cause
      also fixed**: `check()` now denies + logs on an unknown tier instead of returning allowed;
      the existing spec that asserted the old fail-open behaviour was updated. Typecheck exit 0.
- [ ] **RT-007** Ably publishes content rather than an invalidation signal
- [ ] **RT-005/006** Support token wildcard; no Ably revocation on deactivation

## Open — frontend (deferred by decision)

- [ ] **RT-003/004** `requestPermission()` on mount; denied state has no UX
- [ ] **RT-008** Feed ignores the cursor the backend supports

## Infrastructure

- [!] **SNAP-001** Drizzle snapshot chain stale for `0408`, `0410`–`0414` — see `DECISIONS-NOTIFICATIONS.md`
