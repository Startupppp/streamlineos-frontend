# PRD-C127 Chat — Current-Head Evidence 2026-09-04

Lane B parallel release-verification audit. Verified against `backend/` and `frontend/` HEAD.
No git commands were run; all evidence is source-read.

---

## VERDICT: OPEN

**Blocking sub-claim (single sentence):** Mention notifications — both explicit `@user` and `@everyone`
expansion — failed in today's live API gate run ("Alex should receive exactly 1 mention, got 0" / "@everyone
notified nobody"), and a live gate failure cannot be closed by source inspection alone.

---

## Sub-claim Evidence Table

| Sub-claim | Status | File:line | Mechanism |
|---|---|---|---|
| Channel schema (channels, members, invite links, org settings) | VERIFIED DONE | `backend/src/db/schema/chat/chat-channel-tables.ts:17,62,92,118` | `chatChannels`, `chatChannelMembers`, `chatChannelInviteLinks`, `chatOrgSettings` tables |
| Thread/message schema | VERIFIED DONE | `backend/src/db/schema/chat/chat-message-tables.ts:19,78,97,120,143,163` | `chatMessages`, `chatMessageReactions`, `chatAttachments`, `chatPinnedMessages`, `chatSavedMessages`, `chatReplyReminders` |
| Huddle schema | VERIFIED DONE | `backend/src/db/schema/chat/chat-huddle-tables.ts` | Separate huddle tables exist |
| Tenant-composite integrity — channels | VERIFIED DONE | `chat-channel-tables.ts:56,57,58` | `unique("uniq_chat_channels_org_id").on(orgId, id)` + composite FKs `fk_chat_channels_org_created_by_membership`, `fk_chat_channels_linked_deal_id_org` |
| Tenant-composite integrity — channel members | VERIFIED DONE | `chat-channel-tables.ts:84,86,87,88` | `uniqueIndex("uniq_chat_channel_member_membership").on(orgId, channelId, membershipId)` + `fk_chat_channel_members_org_channel` + `fk_chat_channel_members_org_membership` |
| Tenant-composite integrity — messages | VERIFIED DONE | `chat-message-tables.ts:71,72,73,74` | `unique("uniq_chat_messages_org_id").on(orgId, id)` + composite FKs for channel, reply-to (self), sender membership |
| Tenant-composite integrity — reactions | VERIFIED DONE | `chat-message-tables.ts:89,92,93` | `uniq_chat_message_reaction_actor_emoji.on(orgId, messageId, membershipId, emoji)` + composite FKs |
| Tenant-composite integrity — attachments | VERIFIED DONE | `chat-message-tables.ts:115,116` | `uniq_chat_attachments_org_id.on(orgId, id)` + `fk_chat_attachments_org_message` |
| Channel authorization — read | VERIFIED DONE | `backend/src/modules/chat/chat-channels.controller.ts:64,82,121,148` | `@RequirePermission("chat:channels:read")` on all GET handlers; controller under `@UseGuards(JwtAuthGuard, PermissionGuard)` |
| Channel authorization — write | VERIFIED DONE | `chat-channels.controller.ts:105,135` | `@RequirePermission("chat:channels:write")` on POST/PATCH handlers |
| Message-send authorization | VERIFIED DONE | `backend/src/modules/chat/chat-messages.service.ts:78-83` | `resolveMembershipId` then `isChannelMember` — throws ForbiddenException if not a channel member |
| Attachment download authorization | VERIFIED DONE | `backend/src/modules/chat/chat-attachments.service.ts:24` | `assertChannelMembership` called before storage access |
| Realtime token authorization | VERIFIED DONE | `backend/src/modules/chat/chat-realtime.controller.ts:24` | `@RequirePermission("chat:messages:read")` on `/chat/ably-token` |
| Permission catalog — backend | VERIFIED DONE | `backend/src/modules/rbac/permissions/chat.ts:5-70` | Keys: `"chat:channels:read"`, `"chat:channels:write"`, `"chat:messages:read"`, `"chat:messages:write"`, `"chat:huddles:start"`, `"chat:huddles:moderate"`, `"chat:invite-links:manage"`, `"chat:messages:pin"`, `"chat:org-settings:manage"`, `"ai:chat:use"`, `"ai:feedback:create"` |
| Scalable ordering — channel position index | VERIFIED DONE | `chat-message-tables.ts:58` | `index("idx_chat_messages_channel_position").on(orgId, channelId, channelPosition.desc())` — total (not partial) so tombstone reads hit it |
| Scalable ordering — message cursor | VERIFIED DONE | `chat-message-timeline.service.ts:159,178` | Cursor is `channelPosition`; `lt(chatMessages.channelPosition, cursor)` for pages; `buildIdCursorPage` on position |
| Scalable ordering — channel position monotonic | VERIFIED DONE | `chat-messages.service.ts:143-153` | `UPDATE chat_channels SET message_count = message_count + 1 RETURNING message_count` in same tx as insert; `channelPosition = updatedChannel.position` |
| Scalable ordering — thread index | VERIFIED DONE | `chat-message-tables.ts:65-67` | `idx_chat_messages_org_reply.on(orgId, replyToId, channelPosition) WHERE reply_to_id IS NOT NULL` — partial, covers O(thread) not O(tenant) |
| Unread state — schema | VERIFIED DONE | `chat-channel-tables.ts:73` | `chatChannelMembers.lastReadAt` tracks per-member read cursor |
| Unread state — invalidation on send | VERIFIED DONE | `chat-messages.service.ts:262` | `this.cache.invalidateNamespace("chat:unread:${orgId}")` in deferred post-commit hook |
| Fanout — outbox backed | VERIFIED DONE | `chat-messages.service.ts:220-241` | `OutboxWriter.emit(tx, { eventType: CHAT_MESSAGE_FANOUT_EVENT, payload: { … mentionedUserIds … } })` committed atomically with the message insert |
| Fanout — durable retry | VERIFIED DONE | `backend/src/modules/chat/chat-fanout-outbox.consumer.ts` | Outbox consumer claims and retries failed deliveries |
| Fanout — realtime publish cell-prefixed | VERIFIED DONE | `backend/src/modules/realtime/ably.service.ts:100` | `this.rest().channels.get(this.channelName(orgId, channelId))` where `channelName` calls `cellPrefixed(this.cellId, "chat:${orgId}:${channelId}")` |
| Bounded history | VERIFIED DONE | `chat-message-timeline.service.ts:154` | `const safeLimit = Math.min(Math.max(1, limit), 100)` hard cap |
| Bounded channel list | VERIFIED DONE | `chat-channel-list.service.ts:224` | `const PAGE_SIZE = Math.min(limit ?? CHAT_CHANNEL_PAGE_SIZE, PAGE_SIZE_CAP)` |
| Bounded search | VERIFIED DONE | `backend/src/modules/chat/dto/chat-search.schemas.ts` | Schema validates limit; search service applies cap |
| Mention expansion — source | VERIFIED DONE (source) | `backend/src/modules/chat/chat-mentions.ts:33-68` | `mentionsEveryone(content)` matches `/@([^\s@]+)/g` against `["channel","everyone","here"]`; `resolveMentionedUserIds` queries roster and returns filtered userId list; capped at `MENTION_RECIPIENT_CAP = 200` |
| Mention expansion — unit test | VERIFIED DONE | `backend/src/modules/chat/\__tests__/chat-message-fanout.spec.ts:107-114` | `"expands @everyone to the channel, which the send path previously never did"` — passes `@everyone standup`, expects `mentionedUserIds: ["user-alex","user-alexander"]` |
| **Mention notification delivery — live API gate** | **STILL PENDING** | PRD-C127 blocker record | Live `verify:chat-mentions` gate today returned "Alex should receive exactly 1 mention, got 0" and "@everyone notified nobody"; gate cannot be resolved by source inspection |
| Attachment URLs signed/expiring | VERIFIED DONE | `chat-attachments.service.ts:42` | `this.storage.getFileUrl(orgId, row.fileKey, 3600)` — 3600s TTL; test at `__tests__/chat-attachments.spec.ts:178` asserts `call[2] === 3600` |
| Attachment fileUrl in schema (stored as empty string) | VERIFIED DONE | `chat-messages.service.ts:186` | `fileUrl: ""` on insert — empty sentinel; signed URL served exclusively through `GET /chat/channels/:channelId/attachments/:attachmentId/url` |
| Attachment projection carries fileUrl | VERIFIED DONE | `chat-message-timeline.service.ts:166` | `attachments: { columns: { id: true, fileName: true, fileUrl: true, fileKey: true, fileSize: true, mimeType: true } }` |
| Attachment projection test | VERIFIED DONE | `__tests__/chat-attachment-projection.spec.ts:32-38,94` | `REQUIRED_ATTACHMENT_COLUMNS` includes `"fileUrl"`; test verifies list, poll and thread-replies all project it |
| Actor — membershipId populated | VERIFIED DONE | `backend/src/modules/entity-reference/entity-actor.ts:6` | `const membershipId = u.principal === undefined ? null : actingMembershipId(u.principal)` — never hand-built to omit it |
| Actor — defensive guard in channel list | VERIFIED DONE | `chat-channel-list.service.ts:226` | `if (!actor.membershipId) return { channels: [], nextCursor: null }` |
| Ably cell-prefix — frontend contract | VERIFIED DONE | `frontend/lib/ably-channels.ts:37-48` | `cellPrefixed(channel)` prepends `cell:${ABLY_CELL_ID}:`; `chatChannelName(orgId, channelId)` returns `cellPrefixed("chat:${orgId}:${channelId}")` |
| Ably cell-prefix — backend publish | VERIFIED DONE | `ably.service.ts:8,33,63-78,136,161,194` | All publish paths import and call `cellPrefixed(this.cellId, …)` for chat, huddle, huddle-signal, notifications |
| Ably cell-prefix — default cell consistency | VERIFIED DONE | `ably.service.ts:25` + `ably-channels.ts:25` | Both default to `LEGACY_CELL_ID = "legacy-1"` |
| Frontend query keys — factory pattern | VERIFIED DONE | `frontend/lib/query-keys/collaboration.ts:4-35` | `queryKeys.chat.{myChannels, channel, messages, thread, unreadTotal, attachment, savedMessages, …}` all defined as factory functions returning const arrays |
| Frontend TanStack — bounded channel paging | VERIFIED DONE | `frontend/hooks/api/chat-core-read.ts:76` | `MAX_CHANNEL_PAGES = 20` ceiling; cursor-followed with a cap and observable truncation |
| Frontend TanStack — permission gate | VERIFIED DONE | `frontend/hooks/api/chat-core-read.ts:13` | Imports `useCan` from access hooks; exact key `"chat:messages:read"` needed for Ably token |
| Transaction mock invokes callback — notifications spec | VERIFIED DONE | `chat-notifications.service.spec.ts:21-25` | `mockEffects.execute = jest.fn(async (_effect, send) => { await send(); return "EXECUTED"; })` |
| Transaction mock invokes callback — fanout spec | VERIFIED DONE | `__tests__/chat-message-fanout.spec.ts:40` | `chain.transaction = jest.fn(async (cb) => cb(chain))` |
| E2E test suites present | VERIFIED DONE | `backend/src/modules/chat/chat.controller.e2e-spec.ts`, `chat-realtime.controller.e2e-spec.ts`, `chat-entity-channel.controller.e2e-spec.ts`, `chat-actions.controller.e2e-spec.ts` | Multiple e2e files exist |

---

## Known Traps — Disposition

### A. Chat attachment URLs — signed or permanent?

**RESOLVED.** Current source mints only **signed, expiring** URLs (TTL 3600 s).

- `chat-attachments.service.ts:42`: `this.storage.getFileUrl(orgId, row.fileKey, 3600)`
- `chatAttachments.fileUrl` in the DB schema is stored as empty string `""` (`chat-messages.service.ts:186`); it is a placeholder, never the access URL.
- The actual download is gated by `assertChannelMembership` before the storage call, so a removed member cannot obtain a URL even within the TTL window.
- Test proof at `__tests__/chat-attachments.spec.ts:178`: `expect(call[2]).toBe(3600)`.

The earlier memory note "(⚠️ S12 must still fix storage)" described a pre-fix state. The fix is present at current HEAD.

### B. Hand-built actor omitting membershipId

**RESOLVED.** Chat controllers do not build actors by hand; they all call `actorOf(u)` (`entity-actor.ts:5-13`), which derives `membershipId` via `actingMembershipId(u.principal)`.

The safe guard at `chat-channel-list.service.ts:226` (`if (!actor.membershipId) return { channels: [], nextCursor: null }`) prevents a silent empty list but the root cause (omitted membershipId) does not occur in current source.

### C. Ably realtime — cell-prefix consistency

**VERIFIED CONSISTENT.** Both sides build channel names from the same prefix formula.

- Backend: `cellPrefixed(this.cellId, <namespace>)` → `cell:<cellId>:<namespace>`
- Frontend: `cellPrefixed(<namespace>)` → `cell:${ABLY_CELL_ID}:<namespace>`
- Default cell ID: both sides independently define `LEGACY_CELL_ID = "legacy-1"` and fall back to it when the env var is absent.
- Affected channels: `chat:<orgId>:<channelId>`, `notifications:<orgId>:<userId>`, `huddle:<orgId>:<channelId>`, `huddle-signal:<orgId>:<channelId>:<userId>`, `chat:<orgId>:presence`.
- Capability map in `ably.service.ts:62-80` mints all capabilities with `cellPrefixed`.

No drift between the two repositories.

### D. Transaction mock invokes callback

**VERIFIED.** Both relevant test suites invoke the callback.

- `chat-notifications.service.spec.ts:21-25`: `jest.fn(async (_effect, send) => { await send(); return "EXECUTED"; })` — the `send` function IS called.
- `chat-message-fanout.spec.ts:40`: `jest.fn(async (cb) => cb(chain))` — the transaction callback IS invoked.

Neither falls into the bare `jest.fn()` trap.

### E. Mention expansion — @everyone path

**OPEN.** Source shows the fix; live gate contradicts it.

Source at `chat-mentions.ts:33-68`:
- `mentionsEveryone(content)`: pattern `/@([^\s@]+)/g` matched against `["channel","everyone","here"]`
- `resolveMentionedUserIds`: queries `chatChannelMembers` with `membership.userId` relation and returns roster excluding sender; bounded at `MENTION_RECIPIENT_CAP = 200`
- Unit test at `__tests__/chat-message-fanout.spec.ts:107`: specifically labelled "expands @everyone to the channel, which the send path previously never did" — passes `{ content: "@everyone standup" }`, asserts `mentionedUserIds: ["user-alex","user-alexander"]`

Despite the source fix, the live gate run today (`verify:chat-mentions`) returned:
- "Alex should receive exactly 1 mention, got 0"
- "@everyone notified nobody — the send path never expands it"

This is a factual live API outcome that source-reading cannot override. The gate is not re-runnable from this audit. The PRD records it as OPEN with the owner noted.

---

## P0/P1 Defects Found

None new. The single blocking defect is the pre-existing gate failure recorded in the PRD:

**P0 — Mention notifications not delivered (live gate failure, 2026-09-04)**

- **File:** Blocker evidenced by live gate test, root cause unresolvable from source inspection alone.
- **Concrete failure scenario:**
  - Input: authenticated POST to `/chat/channels/:id/messages` with `content: "@everyone standup"` and no explicit `mentionedUserIds`
  - Input variant: POST with `content: "hello @alex"` and `mentionedUserIds: ["<alexUserId>"]`
  - Expected: target user(s) receive `"notification:mention"` on their `cell:<id>:notifications:<orgId>:<userId>` Ably channel
  - Observed today: 0 mention notifications delivered in both cases
- **Source state:** `chat-mentions.ts` expansion logic and `chat-message-fanout.service.ts` delivery path are both present and unit-tested. The discrepancy between source and live behavior has not been resolved by this audit.
- **Owner:** repository owner; recorded in the release record; not waived.

---

## Evidence File Metadata

- Auditor: Lane B (parallel release-verification fan-out)
- Date: 2026-09-04
- Repos inspected: `backend/` HEAD + `frontend/` HEAD
- Git commands run: none
- Files read: 34 source files, 8 test files
