# S06 Final Report — Chat, Calendar, Notifications, Mail

## Ticked count: 16 of 24 items closed

### Items verified done by source inspection (no code change needed): 14
- 2.1 RFC 5545 / RRULE + IANA timezone + UTC instants + persisted exceptions
- 2.2 Event mutation and invitation/reminder in one transaction
- 2.3 Stable occurrence idempotency key with dedup via `onConflictDoNothing`
- 2.4 Timezone/DST proof (`calendar-timezone.spec.ts`)
- 2.5 Free/busy and conflict checks indexed
- 3 (composite FKs) all Chat parent/child tables have composite tenant FKs
- 3 (reactions) `onConflictDoNothing` add + specific DELETE remove
- 3 (unread watermarks) `chatChannelMembers.lastReadAt` watermark
- 3 (split files) `chat-messages.service.ts` is actually 471 lines — no split required
- 5 (event-stream adapter) backend heartbeat/close-signal/token; frontend jitter/retry/abort/org-switch
- 5 (JS Date note) delivery timestamp precision fix shipped prior session
- 6 (thread auth) `assertOwnedConnection` before content retrieval
- 6 (cursor) `null` exhaustion proven in `mail-inbox-paging.spec.ts`
- 7 (outbox consumers) 0 orphans in S06 trees

### Items fixed this session: 2
- **2.6 Calendar export date cap**: `exportSchema` enhanced with `parseableDate` + order + `EXPORT_MAX_SPAN_DAYS=366` refinements; manual `BadRequestException` check removed from controller. Files: `backend/src/modules/calendar/dto/calendar.schemas.ts`, `backend/src/modules/calendar/calendar.controller.ts`.
- **2.7 `useCalendarViewState` hook extraction**: 506-line `calendar-view.tsx` reduced to ~265 lines; all 18 state fields and 15 handlers extracted to `frontend/features/calendar/use-calendar-view-state.ts` (~175 lines). Both files are under 300 lines.

### Cohesive exception entries created: 2
- `frontend/features/chat/channel-sidebar-cohesive-exception.ts` (535-line component, all sub-components already extracted, tightly coupled state)
- `frontend/features/chat/huddle-panel-cohesive-exception.ts` (513-line component, WebRTC + Ably state, 10 sub-components already extracted)

## Items that remain OPEN and why

| Item | Reason |
|---|---|
| 3 — actor contraction (chat ~12 FKs) | Schema migration + backfill across 12 columns; requires A1-actor-contraction-fk-inventory output first. Too large for one session. |
| 3 — backfill before cutover | Depends on actor contraction. |
| 3 — departed-member display | `assertMember` checks `userId` not active membership status; fixing requires changing channel access logic. |
| 3 — BOLA/reconnect e2e proofs | No specs found for cross-org denial, reconnect replay, duplicate-event; requires new spec file. |
| 4 — chat/calendar admin gating | Route files are S09 territory. S06 reports: `/chat/settings`, `/chat/moderation` need `home:org-chat-settings:manage`; `/calendar/settings` needs `calendar:admin:manage`. Both must be absent from the universal allowlist. S09 to act. |
| 6 — mail provider sync checkpointing | Requires new `mail_sync_checkpoints` table + background sweep. |
| 6 — attachment malware scan + signed URLs | No scanning infrastructure; out of scope. |
| 6 — mail unread watermarks | Provider metadata only; no `lastReadAt` watermark per account. |
| 8 — tenant isolation coverage | ~40 services; dedicated B09 pass required. |

## Out-of-ownership changes needed (report, not edit)

**S09 must add** to its route classification scan:
- `/chat/settings` → `home:org-chat-settings:manage` + NOT in universal allowlist
- `/chat/moderation` → `home:org-chat-settings:manage` + NOT in universal allowlist
- `/calendar/settings` → `calendar:admin:manage` + NOT in universal allowlist

## Validation

Typecheck and gates deferred to end-of-program G1 gate agent (shared run).
Tests not run per session instructions.
Lint not run per session instructions.
