# L12 Chat/Realtime Report

**Status:** COMPLETE

## Actor columns contracted
Expansion done (membershipId present on all tables). Contraction (dropping legacy userId/senderId/createdBy columns) requires schema migrations — OUT-OF-OWNERSHIP; 12 legacy user FKs documented.

## Realtime capability verdict
VERIFIED DONE — Ably already uses `chat:${orgId}:${channelId}` per-channel scope (not `chat:${orgId}:*`). P0 was fixed before this session.

## Files split (chat-messages.service.ts 613 → 3 files)
- `chat-messages.service.ts`: ~210 lines (send, edit, remove, sendThreadReply, sendSystemMessage)
- `chat-message-timeline.service.ts`: ~168 lines (list, poll, listThreadReplies — new)
- `chat-reactions.service.ts`: ~140 lines (addReaction ON CONFLICT DO NOTHING, removeReaction DELETE — new)

## Test summary
26 suites, 191 passed, 1 skipped (pre-existing), 0 failed.

Fixes applied this session:
- `chat-cursor-paging.spec.ts`: corrected `=== undefined` → `== null` (buildIdCursorPage returns `null`, not `undefined`, for exhausted cursor)
- `chat-channel-members.service.spec.ts`: added `organizationMembers` to mockDb.query — `addMember` calls `resolveMembership` (organizationMembers.findFirst) which crashed before asserting the conflict, leaking a queued mock value into every subsequent test (jest.clearAllMocks does not clear Once queues)
- Two new isolation specs: `chat-message-timeline-isolation.spec.ts`, `chat-reactions-isolation.spec.ts` — DENY + CONTROL cases for all read/react paths
