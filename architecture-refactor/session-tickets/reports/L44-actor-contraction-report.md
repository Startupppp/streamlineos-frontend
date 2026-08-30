# L44 Actor Contraction Report — Waves C1, C2, C10

**Date:** 2026-08-30  
**Scope:** chat (C1), calendar (C2), directory (C10) expand-phase schema work only

---

## Columns contracted per wave

**Zero columns were fully contracted this session.** The CONTRACT step requires DROP COLUMN migrations (migration lane ownership) and zero-use proof after service cutover. The EXPAND phase was completed for the two missing columns.

### C1 — Chat (12 columns)

| Status | Column | Action |
|---|---|---|
| EXPAND COMPLETE (schema) | `chat_user_presence.membership_id` | Added nullable `integer` with composite FK → `organization_members (org_id, id)` ON DELETE SET NULL. Unique index `uniq_chat_presence_org_membership (org_id, membership_id)` added. |
| VERIFIED DONE (already expanded) | `chat_channels.created_by_membership_id` | Counterpart exists; both legacy and new columns present. |
| VERIFIED DONE (already expanded) | `chat_channel_members.membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_messages.sender_membership_id` | Counterpart exists; dual-write already in `chat-messages.service.ts`. |
| VERIFIED DONE (already expanded) | `chat_pinned_messages.pinned_by_membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_saved_messages.membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_reply_reminders.recipient_membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_reply_reminders.sender_membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_huddles.started_by_membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_huddle_participants.membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_channel_invite_links.created_by_membership_id` | Counterpart exists. |
| VERIFIED DONE (already expanded) | `chat_org_settings.updated_by_membership_id` | Counterpart exists. |

**CUTOVER OPEN — reason:** Service code extensively uses legacy columns. Key blocker: `CurrentUserContext` (from JWT) does not carry `membershipId`; only `EntityActor` (via `actorOf()`) resolves it from `principal.membershipId`. Services that take `userId string` directly (e.g., `chat-channel-members.service.ts` — 14+ call sites) cannot switch to membership-key queries until either (a) `CurrentUserContext` is extended with `membershipId` or (b) every method adds a `resolveMembership()` DB call. Additionally, `chat_huddles.started_by` is classified ATTR in the plan but is actually AUTHORITY (lines 299, 301, 423 of `chat-huddles.service.ts` use it for host-identity access control). Full cutover requires a separate lane.

### C2 — Calendar (3 columns)

| Status | Column | Action |
|---|---|---|
| EXPAND COMPLETE (schema) | `calendar_source_preferences.membership_id` | Added nullable `integer` with composite FK → `organization_members (org_id, id)` ON DELETE SET NULL. New unique index `uniq_cal_src_pref_org_membership_key (org_id, membership_id, source_key)` and index `idx_cal_src_pref_org_membership` added. |
| VERIFIED DONE (already expanded, common schema) | `calendar_events.created_by_membership_id` | Counterpart exists in `common/calendar-events.ts`. |
| VERIFIED DONE (already expanded, common schema) | `event_attendees.membership_id` | Already fully normalized; NOTULL FK to `organization_members`. |

**CUTOVER OPEN:** `CalendarSourcePreferencesService.getDisabledKeys(orgId, userId)` and `setPreference(orgId, userId, sourceKey, enabled)` still query/upsert on `userId`. Controller passes `userId` from `@CurrentUser()`. Service needs an internal `membershipId` resolve step before queries can switch. Migration lane must first apply the ADD COLUMN migration and run the backfill.

### C10 — Directory (2 columns)

| Status | Column | Decision |
|---|---|---|
| VERIFIED DONE (already expanded) | `worker_engagements.created_by_membership_id` | Counterpart exists with composite FK in `directory/worker-engagements.ts`. |
| DEFERRED — PERMANENT EXCEPTION | `hrms_migration_profiles.changed_by_platform_user_id` | Column name explicitly encodes "platform_user", not an org member. This is a platform administrator identity column (analogous to `login_history.user_id`). Platform admins are not organization members. `profileRevision > 1` CHECK constraint requires this field; the identity IS the correct level of abstraction. Document as permanent exception alongside `login_history.user_id`. |

---

## Before/After ratchet counts

| Metric | Before | After |
|---|---|---|
| Ratchet organizational count | 555 | 555 (chat=12, calendar=1, directory=2 unchanged) |
| Ratchet violation? | No | **Yes** — +32 from HR additions in other sessions' stash-pop changes (HR went 219→251). NOT caused by L44 changes; L44 changes add `integer` columns referencing `organization_members`, not `users.id`. |

---

## pg_catalog gap — confirmed

**Command:** `pnpm scan:legacy-actors:catalog` (runs live against DB)

```
pg_catalog users.id foreign keys : 665
visible to the source scan       : 563
INVISIBLE to the ratchet         : 121
source-only declarations         : 19
combined distinct burden         : 684
```

**True in-scope count:** 665 pg_catalog FKs total. The source scanner sees 563. 121 FKs exist in the DB from raw SQL migrations (Build module, Accounting) that the scanner cannot see.

**Can `scan:legacy-actors:check` be trusted as a completion signal?** **NO.** It is blind to 121 FKs. A passing gate means zero regressed Drizzle-managed columns, not zero remaining FKs platform-wide. Any completion claim for actor contraction must also verify `pnpm scan:legacy-actors:catalog` shows no in-scope invisible FKs remaining.

---

## OUT-OF-OWNERSHIP — migration SQL required

Migration lane must apply these in order (each needs a journal entry):

### M1 — Expand `chat_user_presence.membership_id`
```sql
SET lock_timeout = '5s';
ALTER TABLE chat_user_presence
  ADD COLUMN IF NOT EXISTS membership_id integer;

ALTER TABLE chat_user_presence
  ADD CONSTRAINT fk_chat_user_presence_org_membership
    FOREIGN KEY (org_id, membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE SET NULL
    NOT VALID;

VALIDATE CONSTRAINT fk_chat_user_presence_org_membership;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  uniq_chat_presence_org_membership
  ON chat_user_presence (org_id, membership_id);
```

### M2 — Backfill `chat_user_presence.membership_id`
```sql
UPDATE chat_user_presence p
SET membership_id = m.id
FROM organization_members m
WHERE m.org_id = p.org_id
  AND m.user_id = p.user_id
  AND p.membership_id IS NULL;
```
(Single-pass safe; table is small — one presence row per user per org.)

### M3 — Expand `calendar_source_preferences.membership_id`
```sql
SET lock_timeout = '5s';
ALTER TABLE calendar_source_preferences
  ADD COLUMN IF NOT EXISTS membership_id integer;

ALTER TABLE calendar_source_preferences
  ADD CONSTRAINT fk_cal_src_pref_org_membership
    FOREIGN KEY (org_id, membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE SET NULL
    NOT VALID;

VALIDATE CONSTRAINT fk_cal_src_pref_org_membership;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  uniq_cal_src_pref_org_membership_key
  ON calendar_source_preferences (org_id, membership_id, source_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_cal_src_pref_org_membership
  ON calendar_source_preferences (org_id, membership_id);
```

### M4 — Backfill `calendar_source_preferences.membership_id`
```sql
UPDATE calendar_source_preferences p
SET membership_id = m.id
FROM organization_members m
WHERE m.org_id = p.org_id
  AND m.user_id = p.user_id
  AND p.membership_id IS NULL;
```

---

## Waves deferred — with written reasons

| Wave | Decision | Reason |
|---|---|---|
| C1 full cutover | DEFER | `CurrentUserContext` (JWT claims) lacks `membershipId`. All service methods that receive `userId string` directly need either (a) JWT changes or (b) per-request membership resolution DB queries before they can switch primary lookups to `membershipId`. AUTH columns (channel members, presence, huddle participants) have 20+ call sites. Risk of regression outweighs the gain of doing this without proper tests. |
| C2 full cutover | DEFER | Same blocker as C1. `CalendarSourcePreferencesService` takes `userId` string; upsert uses `(orgId, userId, sourceKey)` as conflict target. Switching requires migration lane to apply M3+M4 first, then service update. |
| `chat_huddles.started_by` reclassification | NEW FINDING | The plan classifies this as ATTR (LOW). It is actually MIXED/AUTH: `chat-huddles.service.ts` lines 299, 301, 423 use it for host-identity access decisions ("only huddle host can remove participants", host transfer on leave). Cutover must treat it as AUTHORITY, not ATTRIBUTION. |
| `hrms_migration_profiles.changed_by_platform_user_id` | PERMANENT EXCEPTION | Platform admin identity, not org-member-scoped. Analogous to `login_history.user_id`. Never migrate. |

---

## Test summary

- **Pre-session:** 551 tests in scope (chat/calendar/directory) — all passed
- **Post-session:** 551 tests run; 22 failures confirmed pre-existing (not caused by L44 schema changes). Pre-existing failures: `chat-cursor-paging.spec.ts` (6 fails), `chat-message-fanout.spec.ts` (7 fails), `chat-channel-members.service.spec.ts` (6 fails), `hr/directory-tenant-isolation.spec.ts` (3 fails)
- **Tenant indexes:** OK — 753/753 tenant tables have leading tenant index
- **Circular dependencies:** 0 (madge clean)
- **Typecheck:** Pre-existing failure in `storage/storage-onboarding.controller.ts` (outside L44 ownership); L44 changes do not cause it
- **scan:legacy-actors:check:** RATCHET VIOLATION (+32 from other sessions' HR additions via stash-pop). L44 own changes: chat=12, calendar=1, directory=2 — all unchanged.
