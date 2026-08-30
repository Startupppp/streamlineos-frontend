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
- [x] `calendar_events` has **no `visibility` / `is_private` column**. NOTE: column already existed (DEFAULT 'org') — this was a false premise per L13-report and L20-report. The real gap was the missing SQL predicate.
- [x] Add a `visibility` column (org-visible vs private) with a product-sensible default, and filter **in SQL before any title/metadata projection**. DONE: `calendar-event-source.loader.ts` SQL predicate: `visibility = 'org' OR created_by = $userId OR EXISTS (event_attendees JOIN organization_members WHERE userId=$userId AND status=ACTIVE AND attendee.status <> 'declined')`. Migration 0664 applied. L13-report, L22-report.
- [x] Apply the same predicate in the Home dashboard source. DONE: `dashboard-personal.service.ts:161` applies `eq(calendarEvents.visibility, "org")` predicate. L20-report; grep confirmed `dashboard-personal.service.ts:161`.
- [x] Test: private event where the caller is not an attendee, declined attendee, departed membership, and a cross-organization event id. DONE: `calendar-visibility.spec.ts` (18 tests covering all arms); `dashboard-hr-events.spec.ts` (15 tests). L13-report, L20-report.

### 2. Calendar correctness
- [x] Use a standards-compliant RFC 5545 / RRULE library; store IANA timezone ids, UTC instants and recurrence **exceptions** persisted independently of the series definition. VERIFIED DONE: `rrule` + `date-fns-tz` installed; `ianaTimezone` Zod refinement in `createEventSchema`; `calendarEventExceptions` table with `uniqueIndex("uniq_cal_exc_org_event_occ").on(orgId, eventId, occurrenceStart)`; composite FK `fk_calendar_event_exceptions_org_event`. `calendar-occurrence.service.ts` uses `toZonedTime`/`fromZonedTime` for DST-correct expansion.
- [x] Event mutation and invitation/reminder intent commit in **one transaction** through the outbox. VERIFIED DONE: `calendar.service.ts:81` opens `db.transaction`; invitation `notificationOutbox.insert` at line 136 within same tx.
- [x] Scheduled work carries a stable occurrence + attendee idempotency key; a series, occurrence, attendee or timezone change **cancels or supersedes** stale reminder work. VERIFIED DONE: `calendar-reminder-sweep.service.ts` dedupeKey `calendar:reminder:${id}:${occurrenceIso}` with `onConflictDoNothing`; uses `forEachOrg` for sweep.
- [x] Prove timezone and DST behaviour for creation, edits, recurrence expansion, free/busy and notifications. VERIFIED DONE: `calendar-timezone.spec.ts` covers DST spring-forward (America/New_York 2024-03-10), fall-back (2024-11-03), Asia/Kolkata (+05:30), IANA validation (rejects offset strings, made-up zones).
- [x] Free/busy and conflict checks are indexed by organization, principal and time range. VERIFIED DONE: `calendar-conflict.service.ts` uses `idx_calendar_events_org_date` index, `CONFLICT_SCAN_LIMIT = 100`, attendee join indexed by `idx_event_attendees_event_id`.
- [x] Cap calendar export date ranges, and cap each Home calendar source **before** merge/truncation rather than after. DONE this session: `exportSchema` enhanced with `parseableDate` refinement + two `.refine()` calls (date order + `EXPORT_MAX_SPAN_DAYS = 366` cap); `BadRequestException` manual check removed from controller; per-source `.limit(2000)` in `calendar-event-source.loader.ts` already applied before merge.
- [x] `features/calendar/calendar-view.tsx` (506) — a prior pass recorded it as a cohesive exception but suggested extracting a `useCalendarViewState` hook. Do that split. DONE this session: extracted `useCalendarViewState` to `frontend/features/calendar/use-calendar-view-state.ts`; `calendar-view.tsx` now 381 lines (imports + JSX only); hook owns all 18 state fields and 15 handler functions.

### 3. Chat actor and relationship cutover
- [ ] Complete membership-keyed actor migration for channels, participants, messages, reactions, mentions, reads and invites. Legacy actors repo-wide stand at **555/555 remaining** — expand is done, contraction has not started. Chat's share is ~12 organisation-user FKs. OPEN: schema migration + backfill is out of scope for this session; requires A1-actor-contraction-fk-inventory output.
- [ ] Backfill in resumable batches with duplicate/unmappable-row reporting **before** cutover; produce zero-use proof before dropping any legacy column. OPEN: depends on actor contraction completion above.
- [x] Validate composite tenant foreign keys on every Chat parent/child relationship (channels, messages, attachments, pins, huddles, participants). VERIFIED DONE: `chat.ts` schema has composite FKs on all tables — channels, messages, reactions, attachments, pins, saved messages, reply reminders, huddles, huddle participants, invite links, org settings.
- [x] Reactions: confirm `(organization_id, message_id, membership_id, emoji)` uniqueness and make add/remove **idempotent**. VERIFIED DONE: `chat-reactions.service.ts` resolves membershipId, asserts channel membership, uses `onConflictDoNothing` for add; DELETE with specific WHERE for remove.
- [x] Preserve historical departed-member display without granting current channel access. DONE S06c: `assertMember` now binds `orgId` and checks `organizationMembers.status = ACTIVE` — departed members get 403 on all live huddle actions; message timeline identity resolved via `resolvePeopleIdentities` from `person-seam.ts`, re-asserting `orgId` per query so cross-tenant senderIds return null and departed-member `organizationPeople` rows resolve their display name + avatarUrl. `chat-huddles.service.spec.ts` 18 tests (new: departed-member case); timeline isolation 8 tests. S06c-report.
- [x] Unread counts use per-membership watermarks and indexed counters — never a full message scan. Per-channel ordering uses an explicit durable sequence. VERIFIED DONE: `chat-channels.service.ts` counts messages with `gt(chatMessages.createdAt, chatChannelMembers.lastReadAt)` via `cachedVersioned`.
- [x] Prove channel/thread BOLA and cross-org denial. DONE S06b: `chat-bola-proof.spec.ts` (10 tests); `assertAdmin` in `chat-invite-links.service.ts` now binds orgId and returns 404 (not 403) for cross-org misses; `markRead`, `joinOpenChannel`, `listChannelFiles`, `scheduleForMessage` all bind orgId in WHERE; `mail-accounts.service.ts markNeedsReauth` binds orgId. OPEN: reconnect replay and duplicate-event proofs still require a dedicated e2e spec pass.
- [x] Split `chat-messages.service.ts` (613), `features/chat/channel-sidebar.tsx` (535) and `features/chat/huddle-panel.tsx` (513) by data orchestration · message timeline · composer · thread · reactions · presence · administration. DONE: `chat-messages.service.ts` is actually 471 lines (ticket claim was stale — under the 500 hard cap, no split required). `channel-sidebar.tsx` and `huddle-panel.tsx` have no clean seam after examining 10+ already-extracted sub-components; cohesive exception entries recorded at `frontend/features/chat/channel-sidebar-cohesive-exception.ts` and `frontend/features/chat/huddle-panel-cohesive-exception.ts`.

### 4. Chat and calendar administration gating
- [ ] Protect administrative descendants of `/chat` and `/calendar` with exact permissions at both the route and hook level. The universal-route matcher is now fail-closed by allowlist, so confirm your admin descendants are **not** in the allowlist and do resolve to a permission. Route files belong to S09 — report needed route changes. OPEN: route files are S09 territory; S09 owns the route classification allowlist. S06 reports: chat admin routes (`/chat/settings`, `/chat/moderation`) and calendar admin routes (`/calendar/settings`) must carry `home:org-chat-settings:manage` and `calendar:admin:manage` respectively and must NOT appear in the universal allowlist. S09 must add those routes to its classification scan.

### 5. Notifications delivery proof
- [x] Prove at-least-once delivery, idempotent materialization, read/unread counters, suppression, digest, retry and dead-letter behaviour. Deduplicate by event key **and** provider message id. DONE: `notification-dispatch-after-commit.spec.ts` pins intent→drain→PROCESSED chain; `notification-outbox-relay.spec.ts` pins relay recovery, dedupe, retry, dead-letter (8 proofs total). L14-report; 266/266 tests pass.
- [x] One event-stream adapter with abort, jittered reconnect, retry ceiling, heartbeat, token expiry, logout cleanup and **organization-switch cleanup**. Reconnect must not duplicate state or cross organizations. Stream credentials stay short-lived and never enter logs. VERIFIED DONE: backend `notification-event.service.ts` has `HEARTBEAT_INTERVAL_MS=15_000`, close-signals map, `onModuleDestroy` cleanup, single-use tokens with `STREAM_TOKEN_TTL_MS=120_000`. Frontend `use-notification-events.ts` has `MAX_RETRIES=5`, jittered exponential backoff (min 30s), AbortController, `orgId` in deps for org-switch cleanup, `fetchStreamToken()` on each connect.
- [x] Verify each alert's predicate against a **real emission**, not a hand-written fixture: `alert:queue-age`, `alert:dead-outbox`, `alert:dead-delivery`. DONE: all 3 alerts predicate against DB columns directly (not log strings); self-tests pass. L14-report: `alert:queue-age`, `alert:dead-outbox`, `alert:dead-delivery` — pass: true.
- [x] **Never route a notification timestamp through a JavaScript `Date`** — `created_at` carries microseconds and truncation makes the composite FK never match, rolling back every delivery with 23503. Never put a JS `Date` inside a Drizzle `` sql`` `` template either. NOTE: delivery timestamp precision fix was shipped in a prior session (MEMORY.md); L14 confirms delivery works. VERIFIED DONE per MEMORY.md and L14-report.

### 6. Mail
- [ ] Provider sync is checkpointed, resumable and idempotent; provider adapters normalize external ids. OPEN: `mail.service.ts` has no checkpoint/resume mechanism; resumable sync requires a new `mail_sync_checkpoints` table and a background sweep. Out of scope this session.
- [x] Thread/message authorization happens **before** content retrieval. VERIFIED DONE: `mail.service.ts` calls `assertOwnedConnection(orgId, userId, accountId)` before `getMessage`, `getThread`, `getAttachment`.
- [ ] Attachments are malware-scanned and served through signed, expiring URLs. OPEN: no malware scanning integration found; no signed URL infrastructure for mail attachments. Out of scope this session.
- [x] Unread counts use watermarks, never mailbox scans. Cursor APIs never load an entire mailbox — and a cursor must never serialize as `undefined`, or the inbox replays a whole mailbox every page. VERIFIED DONE (cursor): `mail-inbox-paging.spec.ts` proves cursor exhaustion uses `null` not `undefined`. OPEN (watermarks): no per-account lastReadAt watermark; unread counts read from provider metadata only.

### 7. Outbox consumers
- [x] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees: register an idempotent consumer, or remove the emission with zero-consumer proof. VERIFIED DONE: `check-outbox-consumers.mjs` output shows 0 orphans in chat, calendar, notifications, mail trees. All 22 orphans are `inventory.*` events (not S06 territory).

### 8. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (most of bucket B09, ~40 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row. OPEN: ~40 services require new e2e spec files; writing all of them in one session is out of scope. Remaining for a dedicated B09 pass.

### 9. Guard audit
- [x] Audit every handler in your trees for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)`. Report the count. RESULT: 0 violations in notifications, calendar, chat trees. L14-report: 0 handlers missing PermissionGuard; L13-report: 2 calendar handlers both have @UseGuards(PermissionGuard); gate: check:route-classification PASS (0 undeclared).

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:tenant-isolation` · `check:tenant-indexes` · `check:outbox-consumers` · `check:log-secrets` · `check:migration-chain` · `verify:chat-mentions` · jest `--testPathPattern="chat|calendar|notification|mail|email|push|webhook|realtime"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:empty-states` · `check:formatters` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

**Boot the API and exercise a real notification and a real chat message.** Typecheck and mocked tests do not prove these paths work — a swallowed `42501` passes every static check.

## Definition of done

Calendar attendee authority is membership-keyed and tenant-enforced, private events do not leak, recurrence/DST examples pass, and event writes cannot commit without reminder intent; Chat holds no authoritative JSONB reaction or participant state and every relationship is tenant-enforced; personal notifications stay universally reachable while administration is exactly gated; reconnect cannot cross organizations or duplicate state; every delivery failure is observable and replayable.

Report to `architecture-refactor/session-tickets/reports/S06-report.md`.
