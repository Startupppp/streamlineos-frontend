# P3 — Chat Normalization: Read-path cutover, reaction state, full auth sweep

**Session:** 2026-08-30/31 · Lane P3

---

## PART 1 — Read-path cutover (users → person-seam)

### Migrated

`chat-channels.service.ts` · `listMemberChannels`: removed `leftJoin(users, eq(users.id, chatMessages.senderId))` from the `selectDistinctOn` query. Sender display names now resolved via `resolvePeopleIdentities(db, orgId, subjects)` from `modules/directory/person-seam.ts`. The function short-circuits immediately when `subjects.length === 0`, so no DB call is made when there are no last-message rows. `chat-channels.spec.ts` mock chain updated (removed the `leftJoin` level).

`chat-message-timeline.service.ts`: already used `resolvePeopleIdentities` for sender resolution — no change needed. Added defence-in-depth `eq(chatMessages.orgId, actor.orgId)` to three query conditions (details in PART 3).

### Deferred — with reasons

| Site | Reason for deferral |
|---|---|
| `chat-channels.service.ts` · `createChannel` DM naming | Write-time enrichment; `users` lookup is at creation, not display. Changing requires moving to person-seam at write path — separate PR. |
| `chat-messages.service.ts` · `send` / `sendSystemMessage` | Write-path queries inside a transaction to build realtime event payloads; `userId` comes from JWT (trusted actor). Changing requires significant spec restructuring. |
| `chat-search.service.ts` · `searchMessages` | Uses Drizzle `with: { sender: { columns: {...} } }` relation; fixing requires switching the Drizzle relation definition or a post-query identity resolve; deferred as a standalone PR. |
| `chat-reply-reminders.service.ts` · `processReminder` | Needs `users.email` and `users.isActive` for email delivery — no equivalent in person-seam. Deferred until person-seam exposes contact/email. |

### Column drop — deferred

Legacy `senderId`/`userId`/`createdBy` columns are still nullable (NOT NULL migration not yet applied). The expand/backfill/contract pattern requires: (1) verify all rows have a `membershipId`, (2) `ADD CONSTRAINT … NOT VALID` → `VALIDATE CONSTRAINT`, (3) `SET NOT NULL` on `membershipId`, (4) `DROP COLUMN` legacy col. Steps 1–3 are covered by migrations 0712/0713. Step 4 is deferred until all read-path references above are resolved.

---

## PART 2 — Reaction normalization

**Already correct.** `chatMessageReactions` is a normalized table with:
- `id` (generated always as identity PK)
- `org_id` FK + index
- `membership_id` NOT NULL FK
- `emoji` text
- `created_at` timestamp

No JSONB column on `chatMessages`. The `nextReactions` function in `chat-reactions.ts` was dead code (only referenced in its own spec file, never imported elsewhere). Both the function file and its spec were deleted:

- **Deleted:** `backend/src/modules/chat/chat-reactions.ts`
- **Deleted:** `backend/src/modules/chat/chat-reactions.spec.ts`

---

## PART 3 — Full authorization sweep

### Cross-tenant holes found and fixed: 12

**Pattern:** `findFirst` with only `eq(table.id, id)` — no `eq(table.orgId, orgId)`. Cross-tenant probe gets `NotFoundException` (404), not `ForbiddenException` (403). All 12 now return 404 on cross-tenant probe.

#### `chat-messages.service.ts` — 2 holes

| Method | Fix |
|---|---|
| `edit` | Added `eq(chatMessages.orgId, orgId)` to `findFirst` where |
| `remove` | Added `eq(chatMessages.orgId, orgId)` to `findFirst` where |

Both now: `where: and(eq(chatMessages.id, messageId), eq(chatMessages.orgId, orgId), eq(chatMessages.isDeleted, false))`

#### `chat-huddles.service.ts` — 10 holes

| Method | Fix |
|---|---|
| `joinHuddle` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `leaveHuddle` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `setMute` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `setDeafen` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `raiseHand` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `sendSignal` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `setScreenShare` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `kickParticipant` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `inviteToHuddle` | Added `eq(chatHuddles.orgId, orgId)` to huddle `findFirst` |
| `heartbeat` | Had NO `orgId` parameter at all. Added `orgId: string` param; added `eq(chatHuddleParticipants.orgId, orgId)` to UPDATE WHERE. Controller updated to pass `u.orgId`. |

#### `chat-huddles.controller.ts`

`heartbeat` call updated: `return this.huddles.heartbeat(huddleId, u.userId, u.orgId)`.

### Defence-in-depth: 3 conditions added

`chat-message-timeline.service.ts`: added `eq(chatMessages.orgId, actor.orgId)` to conditions in `list`, `poll`, and `listThreadReplies`. `channelId` is a globally-unique integer PK so a cross-tenant probe would find no rows anyway, but explicit org binding is consistent with coding standards.

### Not a hole — confirmed clean

- `chat-channel-members.service.ts`: all methods include `orgId` ✓
- `chat-invite-links.service.ts`: `assertAdmin` takes `orgId` and runs before any link lookup ✓
- `chat-reply-reminders.service.ts`: `scheduleForMessage` includes `orgId` ✓; `cancelPendingForRecipientInChannel` is internal-only and `channelId` is globally unique ✓
- `chat-search.service.ts`: `searchUsers` joins with explicit org scoping ✓
- `chat-huddles.service.ts` · `assertMember`: checks `organizationMembers.status = ACTIVE` ✓; channel `orgId` included ✓
- Ably capability grants: remain explicit per channel (`chat:${orgId}:${channelId}`) — not regressed ✓

---

## Tests added

File: `backend/src/modules/chat/chat-mutation-tenant-isolation.spec.ts`

New `describe` blocks:

1. **`ChatMessagesService — cross-tenant isolation on edit and remove`**
   - DENY: `edit` with cross-org returns `NotFoundException`; orgId bound in predicate, not OWNER_ORG
   - CONTROL: `edit` with matching orgId succeeds and returns `{ ok: true }`
   - DENY: `remove` with cross-org returns `NotFoundException`; orgId bound in predicate

2. **`ChatHuddlesService — cross-tenant isolation on huddle operations`**
   - DENY: `joinHuddle` with cross-org returns `NotFoundException`; orgId bound in huddle lookup predicate

3. **Heartbeat isolation**
   - DENY: `heartbeat` UPDATE WHERE includes ATTACKER_ORG, not OWNER_ORG
   - CONTROL: `heartbeat` with matching orgId returns `{ ok: true }`

All tests use `sqlValues(predicate)` (custom AST walker, never `JSON.stringify`) to verify orgId binding. Each test creates a fresh NestJS test module; no `clearAllMocks`/`resetAllMocks` conflicts with top-level mock implementations.

---

## Files changed

| File | Change |
|---|---|
| `backend/src/modules/chat/chat-channels.service.ts` | Replace `leftJoin(users)` with person-seam in `listMemberChannels` |
| `backend/src/modules/chat/chat-channels.spec.ts` | Remove `leftJoin` from `selectDistinctOn` mock chain |
| `backend/src/modules/chat/chat-messages.service.ts` | Add `orgId` to `findFirst` in `edit` and `remove` |
| `backend/src/modules/chat/chat-message-timeline.service.ts` | Add `orgId` conditions to `list`, `poll`, `listThreadReplies` |
| `backend/src/modules/chat/chat-huddles.service.ts` | Add `orgId` to 9 huddle `findFirst` calls; add `orgId` param to `heartbeat` |
| `backend/src/modules/chat/chat-huddles.controller.ts` | Pass `u.orgId` to `heartbeat` |
| `backend/src/modules/chat/chat-mutation-tenant-isolation.spec.ts` | Add 6 new isolation tests across 3 describe blocks |
| `backend/src/modules/chat/chat-reactions.ts` | **Deleted** (dead code) |
| `backend/src/modules/chat/chat-reactions.spec.ts` | **Deleted** (only tested deleted dead code) |
