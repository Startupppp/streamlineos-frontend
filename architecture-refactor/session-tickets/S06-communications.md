# S06 — Chat, Calendar, Notifications, Mail

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §28.12, §28.13, §28.14 and the Inbox/mail gates in §18.

## Mission

Make every communication relationship tenant-enforced and membership-keyed, keep the personal surfaces universal while gating administration exactly, and make delivery observably at-least-once.

## Exclusive file ownership

```
backend/src/modules/chat/**           backend/src/modules/calendar/**
backend/src/modules/notifications/**  backend/src/modules/mail/**
backend/src/modules/email/**          backend/src/modules/push/**
backend/src/modules/webhooks/**       backend/src/modules/realtime/**
backend/src/db/schema/calendar/**     backend/src/db/schema/common/calendar-events.ts
backend/src/db/schema/chat/**
frontend/features/chat/**             frontend/features/calendar/**
frontend/features/notifications/**    frontend/features/mail/**
frontend/hooks/api/chat*              frontend/hooks/api/calendar*
frontend/hooks/api/notifications*     frontend/hooks/api/mail*
```

NOT yours: `frontend/app/**` (S09) · permission catalogs (S01) · `backend/src/modules/dashboard/**` (S08) · `backend/src/common/**` (S08).

## Load-bearing product rules

- **One unified calendar.** `/calendar` serves everyone; module events (holidays, leaves, birthdays, review cycles, training, travel, interviews) are toggleable **sources** from backend aggregates. Never module-specific calendar pages.
- **Personal surfaces are platform core.** Every active member keeps chat, mail, notifications (personal inbox + read state) and the unified calendar, regardless of paid modules. Administration inside them stays permission-gated.

## Already done — confirm, do not redo

- **`event_attendees` already exists** as a normalised table: `unique(org_id, event_id, membership_id)`, composite tenant FKs `(org_id, event_id) → calendar_events` and `(org_id, membership_id) → organization_members`, plus `(org_id, user_id)`. The PRD's "replace attendee JSONB" item is **already satisfied at the schema level**.
- **`chat_message_reactions` already exists** as a normalised table. Same conclusion.
- Notifications: 0 handlers were missing `PermissionGuard`. `notification-dispatch.service.ts` 509 → 474 (+ new `notification-dispatch-keys.ts`); `broadcasts.service.ts` 527 → 413 (+ new `broadcasts-audience.queries.ts`); `notification-event.service.ts` gained a 15s heartbeat, a close-signal map and `onModuleDestroy`. `notification-events.catalog.ts` (1,054) was kept whole as a **recorded cohesive exception** (`notification-catalog-cohesive-exception.ts`) — a data catalog, deliberately not fragmented.
- All 10 `notifications:*` permission keys exist in both catalogs.
- 5 notification **administration** hooks are now gated (`notifications:providers:view`, `:events:view`, `:policy:view`, `:templates:view`, `:broadcasts:view`); the personal inbox, preferences and suppression hooks are deliberately left universal.
- `mail-compose-sheet.tsx` split 541 → 319 + a 267-line header-fields file.
- Notification delivery preserves database timestamp precision for its composite FK.
- `notifications/layout.tsx`, `knowledge/layout.tsx`, `knowledge/wiki/layout.tsx` and `mail/layout.tsx` gained server-side route enforcement.

## Work items

### 1. Calendar event visibility — an OPEN P0
- [ ] `calendar_events` has **no `visibility` / `is_private` column**. The calendar module's own loader returns every org event with no attendee filter, and the Home dashboard is consistent with it. The consequence: a 1:1 meeting between two people is visible to every member of the organization, titles included.
- [ ] Add a `visibility` column (org-visible vs private) with a product-sensible default, and filter **in SQL before any title/metadata projection**: an event is visible when it is org-visible, or the caller is the organizer, or the caller is an attendee (`event_attendees` already gives you the join).
- [ ] Apply the same predicate in the Home dashboard source. `backend/src/modules/dashboard/**` belongs to S08 — implement the calendar-side query and report the dashboard call site under `OUT-OF-OWNERSHIP`.
- [ ] Test: private event where the caller is not an attendee, declined attendee, departed membership, and a cross-organization event id.

### 2. Calendar correctness
- [ ] Use a standards-compliant RFC 5545 / RRULE library; store IANA timezone ids, UTC instants and recurrence **exceptions** persisted independently of the series definition.
- [ ] Event mutation and invitation/reminder intent commit in **one transaction** through the outbox.
- [ ] Scheduled work carries a stable occurrence + attendee idempotency key; a series, occurrence, attendee or timezone change **cancels or supersedes** stale reminder work.
- [ ] Prove timezone and DST behaviour for creation, edits, recurrence expansion, free/busy and notifications.
- [ ] Free/busy and conflict checks are indexed by organization, principal and time range.
- [ ] Cap calendar export date ranges, and cap each Home calendar source **before** merge/truncation rather than after.
- [ ] `features/calendar/calendar-view.tsx` (506) — a prior pass recorded it as a cohesive exception but suggested extracting a `useCalendarViewState` hook. Do that split.

### 3. Chat actor and relationship cutover
- [ ] Complete membership-keyed actor migration for channels, participants, messages, reactions, mentions, reads and invites. Legacy actors repo-wide stand at **555/555 remaining** — expand is done, contraction has not started. Chat's share is ~12 organisation-user FKs.
- [ ] Backfill in resumable batches with duplicate/unmappable-row reporting **before** cutover; produce zero-use proof before dropping any legacy column.
- [ ] Validate composite tenant foreign keys on every Chat parent/child relationship (channels, messages, attachments, pins, huddles, participants).
- [ ] Reactions: confirm `(organization_id, message_id, membership_id, emoji)` uniqueness and make add/remove **idempotent**.
- [ ] Preserve historical departed-member display without granting current channel access.
- [ ] Unread counts use per-membership watermarks and indexed counters — never a full message scan. Per-channel ordering uses an explicit durable sequence.
- [ ] Prove channel/thread BOLA, private-channel membership, cross-org denial, reconnect replay and duplicate-event behaviour.
- [ ] Split `chat-messages.service.ts` (613), `features/chat/channel-sidebar.tsx` (535) and `features/chat/huddle-panel.tsx` (513) by data orchestration · message timeline · composer · thread · reactions · presence · administration. A prior pass judged the two frontend files to have no clean seam — re-examine; if you agree, record a proper cohesive-exception entry rather than leaving a silent violation.

### 4. Chat and calendar administration gating
- [ ] Protect administrative descendants of `/chat` and `/calendar` with exact permissions at both the route and hook level. The universal-route matcher is now fail-closed by allowlist, so confirm your admin descendants are **not** in the allowlist and do resolve to a permission. Route files belong to S09 — report needed route changes.

### 5. Notifications delivery proof
- [ ] Prove at-least-once delivery, idempotent materialization, read/unread counters, suppression, digest, retry and dead-letter behaviour. Deduplicate by event key **and** provider message id.
- [ ] One event-stream adapter with abort, jittered reconnect, retry ceiling, heartbeat, token expiry, logout cleanup and **organization-switch cleanup**. Reconnect must not duplicate state or cross organizations. Stream credentials stay short-lived and never enter logs.
- [ ] Verify each alert's predicate against a **real emission**, not a hand-written fixture: `alert:queue-age`, `alert:dead-outbox`, `alert:dead-delivery`. A known past defect had an alert grep for a log string no line contained, while its self-test hand-wrote the fixture so it passed anyway.
- [ ] **Never route a notification timestamp through a JavaScript `Date`** — `created_at` carries microseconds and truncation makes the composite FK never match, rolling back every delivery with 23503. Never put a JS `Date` inside a Drizzle `` sql`` `` template either.

### 6. Mail
- [ ] Provider sync is checkpointed, resumable and idempotent; provider adapters normalize external ids.
- [ ] Thread/message authorization happens **before** content retrieval.
- [ ] Attachments are malware-scanned and served through signed, expiring URLs.
- [ ] Unread counts use watermarks, never mailbox scans. Cursor APIs never load an entire mailbox — and a cursor must never serialize as `undefined`, or the inbox replays a whole mailbox every page.

### 7. Outbox consumers
- [ ] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees: register an idempotent consumer, or remove the emission with zero-consumer proof.

### 8. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (most of bucket B09, ~40 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row.

### 9. Guard audit
- [ ] Audit every handler in your trees for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)`. Report the count. Remember: making a route universal means **moving** the guard, not deleting the key.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:tenant-isolation` · `check:tenant-indexes` · `check:outbox-consumers` · `check:log-secrets` · `check:migration-chain` · `verify:chat-mentions` · jest `--testPathPattern="chat|calendar|notification|mail|email|push|webhook|realtime"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:empty-states` · `check:formatters` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

**Boot the API and exercise a real notification and a real chat message.** Typecheck and mocked tests do not prove these paths work — a swallowed `42501` passes every static check.

## Definition of done

Calendar attendee authority is membership-keyed and tenant-enforced, private events do not leak, recurrence/DST examples pass, and event writes cannot commit without reminder intent; Chat holds no authoritative JSONB reaction or participant state and every relationship is tenant-enforced; personal notifications stay universally reachable while administration is exactly gated; reconnect cannot cross organizations or duplicate state; every delivery failure is observable and replayable.

Report to `architecture-refactor/session-tickets/reports/S06-report.md`.
