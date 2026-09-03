# Ticket 12 — Chat — current-head audit (PRD-C127)

**Date:** 2026-09-03
**Backend HEAD:** `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`)
**Frontend HEAD:** `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`)
**Prior report:** none. Evidence reconstructed from scratch.
**Verdict:** **partially-met.** Schema and tenant-composite integrity are genuinely solid.
Authorization is mostly solid with three real holes. Ordering/fanout/unread/bounded-history are
NOT met and are measured below. Realtime delivery is **broken end-to-end** at head. Representative
E2E for chat does not exist.

---

## 1. What I read, with numbers

### Backend (`/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`)

| Corpus | Count |
|---|---|
| Files under `src/modules/chat/` (`*.ts`) | **110** |
| — production files (non-spec) | **62** (7,458 LOC) |
| — spec files | **48** (8,582 LOC, **408** `it()` cases) |
| Controllers | **15** |
| HTTP route handlers | **74** (enumerated one by one, §3.3) |
| Drizzle tables in `src/db/schema/chat/` | **13** (across 4 files, 578 LOC) |
| Chat schema files read in full | 4/4 |
| Services read in full or near-full | `chat-messages`, `chat-message-timeline`, `chat-channel-list`, `chat-channel-members-implementation`, `chat-channel-member-preview`, `chat-channel-member-shape`, `chat-channels`, `chat-presence`, `chat-search`, `chat-reactions`, `chat-message-moderation`, `chat-attachments`, `chat-typing`, `chat-summarize`, `chat-invite-links`, `chat-reply-reminders`, `chat-mentions`, `chat-message-fanout`, `chat-fanout-outbox.consumer`, `message-fanout.interface`, `chat-huddle-capacity`, `chat-huddle-lifecycle`, `chat-message-conflict-target` — **23 files** |
| Adjacent files read | `modules/realtime/ably.service.ts`, `modules/realtime/web-push.service.ts`, `modules/chat/chat-notifications.service.ts`, `common/cell-transport/cell-channel-namespace.ts`, `modules/rbac/permissions/chat.ts`, `migrations/0713_chat_presence_membership_backfill.sql` |
| Chat DTO schema files | 6 (`chat.schemas`, `chat-search.schemas`, `chat-attachment.schemas`, `chat-link-preview.schemas`, `chat-poll.schemas`, `huddle.schemas`) |

### Frontend (`/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/frontend`)

| Corpus | Count |
|---|---|
| Files in `features/chat/` | **93** (13,171 LOC) |
| `hooks/api/chat*.ts` | **16** (2,435 LOC) |
| Chat hooks exported (`use…`) | **67** across 10 hook files |
| App routes under `app/(authenticated)/chat/` | **5** pages + error/loading boundaries |
| Chat test files | **14** |
| Query-key entries under `queryKeys.chat` | **19** (`lib/query-keys/collaboration.ts`) |
| Files read in full | `chat-realtime.ts`, `chat-core-read.ts`, `chat-core-mutations-a.ts`, `chat-core-mutations-b.ts` (scanned), `chat-personal-b.ts` (partial), `chat-entities.ts` (scanned), `ably-provider.tsx`, `lib/ably.ts`, `lib/ably-safe-subscribe.ts`, `use-chat-presence.ts`, `use-network-quality.ts`, `use-message-panel-data.ts` (partial), `message-list.tsx` (partial), `types/chat.ts` (partial), `hooks/api/access.ts` (partial) |

### Databases probed

- `scratch_head_1010` (owner URL) — catalog reads only: 13 chat tables, **62 indexes**, **13 RLS
  policies**, **13 single-column FKs** (all `org_id → organizations`), all child FKs composite.
- **`scratch_chat_audit_t12`** — an isolated database I created for this audit, seeded with a
  faithful replica of `chat_channels` / `chat_channel_members` / `chat_messages` and their real
  index definitions taken from the live catalog: **320,000 messages** (300k in `org-A` across 60
  channels, 20k in a second tenant), **30,000** thread replies, **12,000** channel-member rows
  (200 members × 60 channels). Every `EXPLAIN (ANALYZE, BUFFERS)` in §4 was run against it.
  **The database was dropped at the end of this audit.** No other scratch DB was written to.

### Commands actually run

```
psql scratch_head_1010  -- catalog: pg_tables, pg_indexes, pg_policies, pg_constraint, pg_index
psql scratch_head_1010  -- EXPLAIN INSERT … ON CONFLICT (org_id, membership_id) DO UPDATE  → ERROR 42P10
node (drizzle 0.45.2, offline) -- compiled the presence upsert to SQL
createdb scratch_chat_audit_t12; 6 × EXPLAIN (ANALYZE, BUFFERS); dropdb
npx jest --runInBand --testPathPattern="chat-hook-gates"                    → 16 passed
npx jest --runInBand --testPathPattern="src/modules/chat/__tests__/(chat-ordering-gap|chat-message-fanout|chat-send-idempotency|chat-read-cursor-monotonic)"  → 4 suites, 26 passed
```

Not run (laptop budget, per brief): `npm run build`, `typecheck`, bare `jest`, `test:e2e:seeded`.

---

## 2. Per-criterion assessment

### PRD-C127 — status: **partially-met**

The criterion names ten dimensions. Taken in order:

| # | Dimension | Verdict | Evidence |
|---|---|---|---|
| 1 | channel/thread/member/message/reaction/attachment **schema** | **met** | 13 tables enumerated; §3.1 |
| 2 | **tenant-composite integrity** | **met** | 13/13 RLS policies, all child FKs composite; §3.2 |
| 3 | **channel and mutation authorization** | **partially-met** | 74/74 routes authenticated; 72/74 permission-gated; 3 real defects (F3, F16, F18); §3.3 |
| 4 | scalable **ordering** | **met** | gapless `channel_position` via `RETURNING` on `message_count`; keyset cursors everywhere; `chat-ordering-gap.spec.ts` green |
| 5 | scalable **fanout** | **not-met** | F4, F13, F14 — three O(members) paths per message, one with unbounded concurrency; §4.5 |
| 6 | scalable **unread state** | **not-met** | F8 measured 246,239 rows / 185.8 ms for one integer; §4.4 |
| 7 | **bounded history/search** | **not-met** | F5, F6, F7, F10, F15 — four measured unbounded reads and a second unhardened search route; §4 |
| 8 | **cache/realtime invalidation** | **not-met** | F2 — the FE and BE do not agree on a single Ably channel name; §5 |
| 9 | **offline UI** | **partially-met** | offline banner exists (`message-panel-view.tsx:335`); no error branch (F12); poll fallback double-gated shut (F17) |
| 10 | representative **E2E** | **not-met** | §6 |

---

## 3. The surface, walked

### 3.1 Schema — 13 tables

`chat_channels`, `chat_channel_members`, `chat_channel_invite_links`, `chat_org_settings`,
`chat_messages`, `chat_message_reactions`, `chat_attachments`, `chat_pinned_messages`,
`chat_saved_messages`, `chat_reply_reminders`, `chat_user_presence`, `chat_huddles`,
`chat_huddle_participants`.

Every one of the six entities the criterion names is present and normalised. `chat_messages`
carries `channel_position bigint NOT NULL` for gapless ordering, `client_key text` for idempotent
sends, and `is_deleted` for tombstones. Attachments are a separate table keyed on `(org_id,
message_id)`, never denormalised into the message. Reactions are one row per `(org, message,
membership, emoji)`.

### 3.2 Tenant-composite integrity — clean

```
pg_constraint: 13 single-column FKs, all of the form  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
Every other FK on every chat_* table is composite: FOREIGN KEY (org_id, x) REFERENCES parent(org_id, id)
```

12 of 13 tables carry `UNIQUE (org_id, id)` so a child can name them compositely. RLS:

```
chat_attachments|tenant_isolation|ALL|(org_id = app.current_org_id())
… 13 rows, one policy per table, every one the same predicate
```

`relforcerowsecurity = f` on all 13, which is the house default (only `external_effect_ledger`
forces). The app role is `bypassrls=false`, so RLS is the real backstop for the handful of reads
in §4 that omit an explicit `org_id`.

**One gap:** `chat_message_reactions` is the only chat table with no `UNIQUE (org_id, id)`
(finding F19).

### 3.3 Routes — 74 handlers across 15 controllers

| Controller | Routes | Guards |
|---|---|---|
| `chat-channels.controller.ts` | 24 | `JwtAuthGuard, PermissionGuard` + `@RequirePermission` on all 24 |
| `chat-huddles.controller.ts` | 12 | same, all 12 |
| `chat-messages.controller.ts` | 10 | same, all 10 |
| `chat-presence.controller.ts` | 6 | same, all 6 |
| `chat-search.controller.ts` | 3 | same, all 3 |
| `chat-saved.controller.ts` | 3 | same, all 3 |
| `chat-pins.controller.ts` | 3 | same, all 3 |
| `chat-invite-links.controller.ts` | 3 | same, all 3 |
| `chat-entity-actions.controller.ts` | 3 | `JwtAuthGuard` **only** — `@AuthorizedInService` |
| `chat-org-settings.controller.ts` | 2 | same, all 2 |
| `chat-attachments.controller.ts` | 1 | same |
| `chat-link-preview.controller.ts` | 1 | same |
| `chat-realtime.controller.ts` | 1 | same |
| `chat-summarize.controller.ts` | 1 | same + `RateLimitGuard` |
| `chat-actions.controller.ts` | 1 | `JwtAuthGuard` **only** — `@AuthorizedInService` |

**72/74 carry `@RequirePermission`.** The 4 that do not (`chat/actions/create-task-from-message`
and the 3 `chat/entity-actions/*`) declare `@AuthorizedInService` and each begins with
`assertChannelMembership` plus an `EntityReferenceService` resolve. I read all four bodies; the
in-service checks are real, so the gates are **not inert** — but see F16 (missing `@Idempotent` on
`create-task-from-message`, while its sibling `submit` has one).

The permission catalog (`src/modules/rbac/permissions/chat.ts`) declares 9 chat permissions +
2 AI-chat permissions.

**Private-channel existence discipline is right and consistent.** Four independent guards
(`ChatChannelMembersImplementation.assertMember`, `ChatReactionsService.assertChannelMember`,
`ChatTypingService.assertChannelMember`, `ChatSummarizeService.summarize`) all answer 404 for a
cross-tenant channel, 404 for a private same-tenant channel, and 403 only for a genuine same-org
non-member of a non-private channel. That is a real invariant, held in four places.

### 3.4 Frontend permission gating — proven live

`hooks/api/__tests__/chat-hook-gates.test.tsx` — **16/16 pass** (I ran it). It asserts
`fetchStatus === "idle"` on denial for the read hooks and that the mutation hooks throw. The gates
are `useCan(...)` from `hooks/api/access.ts:81`, which resolves to `usePermissionGate(...).allowed`.
Not inert.

---

## 4. Measured performance evidence

All plans below are `EXPLAIN (ANALYZE, BUFFERS)` on `scratch_chat_audit_t12`: 320,000 messages,
60 channels, 200 members/channel — a small tenant by the standard this criterion sets.

### 4.1 Channel history read — `ChatMessageTimelineService.list()`

`list()` builds its predicate at `chat-message-timeline.service.ts:145-149` **without
`is_deleted = false`**. Both indexes that could serve this ordering are PARTIAL on that predicate
(`idx_chat_messages_channel_position … WHERE is_deleted = false`), so the planner cannot use either.

```
-- as list() emits it (no is_deleted predicate)
Limit (actual time=361.816..361.820 rows=51)
  Buffers: shared hit=6 read=5019 dirtied=2668 written=2537
  -> Sort  Sort Key: channel_position DESC   Sort Method: top-N heapsort
     -> Bitmap Heap Scan on chat_messages (actual time=3.473..360.946 rows=5000)
          Recheck Cond: (channel_id = 2)   Heap Blocks: exact=5000
Execution Time: 361.874 ms

-- the same query WITH is_deleted = false
Limit (actual time=0.248..0.275 rows=51)
  Buffers: shared hit=51 read=3 written=3
  -> Index Scan using idx_chat_messages_channel_position
Execution Time: 0.282 ms
```

**1,285× slower, 93× the buffers**, and the bad plan reads the *entire channel* — so the gap widens
linearly with channel history. `poll()` (line 207-212) *does* carry the predicate, so the two reads
of the same timeline disagree about deleted messages (see F11).

### 4.2 Thread replies — `ChatMessageTimelineService.listThreadReplies()`

Predicate is `org_id = ? AND reply_to_id = ?` (`chat-message-timeline.service.ts:291-294`).
**There is no index on `reply_to_id`** — the 8 indexes on `chat_messages` are pkey, `(channel_id,
created_at)`, `(org_id, channel_id, channel_position DESC) partial`, `gin(content)`,
`(org_id, sender_membership_id)`, `(org_id, channel_id, is_deleted, created_at) partial`,
`(org_id, channel_id, client_key) partial unique`, `(org_id, id)`.

```
-> Gather (Workers Launched: 2)  Buffers: shared hit=208 read=6109
   -> Parallel Seq Scan on chat_messages
        Filter: ((org_id = 'org-A') AND (reply_to_id = 61))
        Rows Removed by Filter: 106667   (× 3 workers = 320,000 rows)
Execution Time: 10.283 ms
```

Every thread-panel open scans the tenant's whole message table. Cost is O(total messages), not
O(thread size).

### 4.3 Channel-list last-message preview — `ChatChannelListService.listMemberChannels()`

`selectDistinctOn([chatMessages.channelId], …)` at `chat-channel-list.service.ts:280-299`,
50 channel ids per page. Postgres has no btree skip scan here; `Unique` consumes the whole index
scan.

```
Unique (actual time=24.924..199.607 rows=47)
  Buffers: shared hit=220130 read=7192
  -> Incremental Sort (rows=235000)
     -> Index Scan using idx_chat_messages_unread (rows=235000)
Execution Time: 199.655 ms
```

**235,000 rows and 227,322 buffers (≈1.8 GB of buffer traffic) to produce 47 rows** — on every
`GET /chat/channels`. And `useChatChannels` (`hooks/api/chat-core-read.ts:105-118`) *drains up to
20 pages* per mount with `refetchOnWindowFocus: true`, so a sidebar load is up to 20× this.

### 4.4 Unread — `ChatPresenceService.getUnreadTotal()` (`chat-presence.service.ts:79-102`)

```
Aggregate (actual time=185.756..185.756 rows=1)
  Buffers: shared hit=59431 read=1198 written=333
  -> Nested Loop (rows=246239)
     -> Index Only Scan using idx_chat_messages_unread (Heap Fetches: 58282)
Execution Time: 185.756 ms
```

**246,239 rows counted, 60,629 buffers, to return one integer.** No cap, no `99+` short-circuit.
`GET /chat/unread` is fetched with `refetchOnWindowFocus: true`. The per-channel variant
(`chat-channel-list.service.ts:256-275`) has the same unbounded `count()`.

The query also carries **no `org_id` predicate at all** on either side of the join. It is not a
cross-tenant leak — `organization_members.id` and `chat_channels.id` are globally unique identity
columns, and RLS adds the predicate for the app role — but it costs the planner the leading column
of `idx_chat_messages_unread`.

### 4.5 Search — two implementations, one hardened, one not

- `ChatSearchService.searchMessages` (`/chat/search/messages`) is **correct**: it routes ≥3-char
  terms through `app.search_chat_message_ids(term, 1001)`, caps the id set at 1,000, and only falls
  back to raw `ILIKE` above the cap.
- `ChatPresenceService.searchMessages` (`/chat/search`, `chat-presence.service.ts:106-131`) is a
  **second, unhardened path**: raw `ILIKE '%term%'`, controller minimum of 2 characters
  (`chat-presence.controller.ts:80`). pg_trgm needs 3 characters, so a 2-char term is a guaranteed
  full scan:

```
-- content ILIKE '%zq%'
-> Parallel Seq Scan on chat_messages
     Filter: ((NOT is_deleted) AND (content ~~* '%zq%') AND (org_id = 'org-A'))
```

`searchMessagesQuerySchema` on the *other* route allows `q` down to `min(1)`.

---

## 5. Realtime — broken end to end at head

This is the most consequential finding and it is a **cross-repo contract gap that both sides test
green in isolation.**

**Backend** publishes and grants capability on a cell-prefixed name:

- `AblyService.channelName()` — `ably.service.ts:33` → `cellPrefixed(this.cellId, 'chat:${orgId}:${channelId}')`
- `cellPrefixed(id, ch)` — `common/cell-transport/cell-channel-namespace.ts:5` → `` `cell:${cellId}:${channel}` ``
- `this.cellId = CELL_ID?.trim() ?? LEGACY_CELL_ID`, and `LEGACY_CELL_ID = "legacy-1"`
  (`common/region/placement.ts:12`). **There is no configuration under which the prefix is absent.**
- The backend's own spec pins it: `ably.service.spec.ts:41` asserts
  `capability["cell:legacy-1:chat:org-1:7"]`.

**Frontend** subscribes to unprefixed names in **11 places**, and knows nothing about cells
(`grep -rn "cellId\|CELL_ID\|cellPrefix"` over the whole frontend returns **zero** matches):

```
hooks/api/chat-realtime.ts:140     `chat:${orgId}:${channelId}`
hooks/api/chat-realtime.ts:325     `chat:${orgId}:${channelId}`
hooks/api/chat-notifications.ts:58 `chat:${orgId}:${channel.id}`
hooks/api/chat-notifications.ts:118 `notifications:${orgId}:${currentUserId}`
features/chat/use-chat-presence.ts:8  `chat:${orgId}:presence`
features/chat/huddle-realtime.ts:47   `huddle:${orgId}:${channelId}`
features/chat/huddle-chat-panel.tsx:55, :107, huddle-panel.tsx:182,
features/chat/use-huddle-events.ts:33, :34
```

Consequences, in order:

1. Every `channel.subscribe` attaches to a name the token grants nothing on → Ably refuses (403).
2. `safeSubscribe` (`lib/ably-safe-subscribe.ts:16-35`) catches, re-authorizes once, retries the
   same wrong name, and **returns `false` silently**.
3. `useChatRealtime` reports `isConnected` from **`ably.connection.state`**, not channel attach
   state (`hooks/api/chat-realtime.ts:97-131`). The *connection* succeeds — the token is valid —
   so `isConnected === true`.
4. `use-message-panel-data.ts:212` gates the polling fallback on `!ablyConnected`. Because
   `ablyConnected` is `true`, **the fallback never runs.**

Net: no inbound message, edit, deletion, reaction update or typing indicator ever reaches an open
chat window. Only a manual navigation/refetch shows new messages.

Separately, `chat:${orgId}:presence` is not granted by `createChatTokenRequest` under **any**
prefix — the capability set is `notifications:{org}:{client}`, `huddle-signal:{org}:*:{client}`,
and per-channel `chat:`/`huddle:` keys. So Ably presence would fail even if the prefix matched.

---

## 6. Representative E2E — not met

Chat has **five** `*e2e-spec.ts` files:

| File | `it()` cases | What it proves |
|---|---|---|
| `chat.controller.e2e-spec.ts` | 1 `it.each` × 20 routes | **401 without a token.** Nothing else. |
| `chat-entity-channel.controller.e2e-spec.ts` | 13 | entity-channel behaviour |
| `chat-entity-actions.controller.e2e-spec.ts` | 9 | entity-action behaviour |
| `chat-actions.controller.e2e-spec.ts` | 6 | create-task-from-message |
| `chat-realtime.controller.e2e-spec.ts` | 1 | ably-token route |

There are **11** `*.seeded-e2e-spec.ts` files in the repo (the ones that run against a real
Postgres). **None of them is chat.** `test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts`
contains **zero** occurrences of the string `chat`.

So there is no end-to-end test against a real database that sends a message and reads it back,
that checks ordering across a page boundary, that checks unread transitions, or that checks a
cross-tenant denial on a live row. The 408 in-module `it()` cases are all mock-driven — including
`chat-bola-proof.spec.ts` and `chat-cross-tenant-404.spec.ts`, which build their assertions by
walking Drizzle's `where` object graph rather than executing anything.

The `chat-send-conflict-target.db.spec.ts` file is the one exception and deserves credit: it has a
hermetic half that runs everywhere plus a catalog half behind `CHAT_DB_TESTS=1`. **The finding F1
below is the exact bug that spec was written to catch — in a second place the spec does not look at.**

---

## 7. Findings

| # | Sev | Location | Summary |
|---|---|---|---|
| F1 | **P0** | `backend/src/modules/chat/chat-presence.service.ts:39`, `:71` | `ON CONFLICT` cannot infer a PARTIAL unique index → 42P10 at plan time; heartbeat and status **always 500** |
| F2 | **P0** | `frontend/hooks/api/chat-realtime.ts:140` (+10 sites) | FE Ably channel names lack the `cell:legacy-1:` prefix the token grants; realtime dead and the poll fallback is gated shut |
| F3 | **P1** | `backend/src/modules/chat/chat-search.service.ts:103` | `searchChannels` has no privacy filter — leaks private and DIRECT channel names org-wide |
| F4 | **P1** | `backend/src/modules/realtime/web-push.service.ts:149` | Per-message push fanout: unbounded parallelism, and mute/notification-preference are ignored |
| F5 | **P1** | `backend/src/modules/chat/chat-message-timeline.service.ts:145` | History read omits `is_deleted = false`, defeating both partial indexes — 361 ms vs 0.28 ms measured |
| F6 | **P1** | `backend/src/modules/chat/chat-message-timeline.service.ts:293` | Thread replies filter `reply_to_id` with no index — parallel seq scan of the whole table |
| F7 | **P1** | `backend/src/modules/chat/chat-channel-list.service.ts:280` | `DISTINCT ON` last-message preview reads 235,000 rows / 227,322 buffers for 47 rows |
| F8 | **P1** | `backend/src/modules/chat/chat-presence.service.ts:84` | `getUnreadTotal` counts every unread message with no cap and no `org_id` predicate |
| F9 | **P1** | `backend/src/modules/chat/chat-messages.controller.ts:62` | Reactions are never returned by the history read, so they vanish on reload/refetch |
| F10 | **P1** | `backend/src/modules/chat/chat-channel-members-implementation.ts:98` | `GET /chat/channels/:id` embeds the entire member roster, unbounded |
| F11 | **P1** | `backend/src/modules/chat/chat-message-timeline.service.ts:209` | `poll()` filters out deleted messages, so a polling client never learns a message was deleted |
| F12 | **P1** | `frontend/features/chat/message-list.tsx:222` | No error branch: a failed history load renders as an empty channel |
| F13 | **P1** | `backend/src/modules/chat/chat-messages.service.ts:200` | Every send updates **every** member row of the channel unconditionally |
| F14 | **P1** | `backend/src/modules/chat/chat-reply-reminders.service.ts:60` | Every send inserts one reminder row per channel member |
| F15 | **P1** | `backend/src/modules/chat/chat-presence.service.ts:106` | A second, unhardened `/chat/search` bypassing the trigram-capped implementation |
| F16 | **P1** | `frontend/types/chat.ts:248` | No caller ever sends `clientKey`; the hardened idempotent-send path is dead code |
| F17 | **P1** | `backend/src/modules/chat/chat-channels.service.ts:212` | No unique index on the entity-channel key; a `useQuery` GET creates → duplicate channels |
| F18 | **P2** | `backend/src/modules/chat/chat-mentions.ts:29` | `@channel` bypasses the 200-mention cap and expands to the whole roster |
| F19 | **P2** | `frontend/features/chat/use-message-panel-data.ts:212` | Poll fallback is additionally gated on `messages.length > 0` |
| F20 | **P2** | `backend/src/modules/chat/chat-actions.controller.ts:33` | No `@Idempotent`; a retried create-task-from-message duplicates the ticket |
| F21 | **P2** | `backend/src/modules/realtime/ably.service.ts:58` | Token grants clients `publish` on the chat channel; the FE trusts `senderId`/`senderName` |
| F22 | **P2** | `backend/src/modules/chat/chat-link-preview.controller.ts:44` | `res.text()` buffers the entire body before the 512 KB slice |
| F23 | **P2** | `backend/src/db/schema/chat/chat-message-tables.ts:61` | `chat_message_reactions` is the only chat table with no `UNIQUE (org_id, id)` |
| F24 | **P2** | `backend/src/db/schema/chat/chat-huddle-tables.ts:27` | Three declared indexes drift from the live catalog (partial predicates + DESC) |
| F25 | **P2** | `backend/src/modules/chat/chat-messages.controller.ts:125` | `DELETE`/`PATCH` ignore the `:channelId` path segment |
| F26 | **P2** | `backend/src/modules/realtime/ably.service.ts:41` | Capability truncation at 500 channels is logged server-side and invisible to the user |
| F27 | **P2** | `backend/src/modules/chat/chat-message-fanout.service.ts:39` | Comment says the consumer does not repeat realtime; the consumer does |

### Detail on the two P0s

**F1 — presence upsert cannot arbitrate its own index. Proved twice.**

Migration `migrations/0713_chat_presence_membership_backfill.sql:23-25`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_presence_org_membership
  ON chat_user_presence (org_id, membership_id)
  WHERE membership_id IS NOT NULL;
```

Drizzle emits (compiled offline against drizzle-orm 0.45.2 with the real column set):

```
insert into "chat_user_presence" (...) values (...)
  on conflict ("org_id","membership_id") do update set "status" = $5, "last_seen_at" = $6
```

Against the live catalog:

```
$ psql scratch_head_1010 -c "EXPLAIN INSERT INTO chat_user_presence (...) ON CONFLICT (org_id, membership_id) DO UPDATE SET status='ONLINE';"
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
```

`EXPLAIN` alone raises it, so the failure is at **plan time** — no colliding row, no concurrency,
no data required. `POST /chat/presence/heartbeat` and `PUT /chat/status` return 500 for every
caller, always. `membership_id` is `NOT NULL` in the live catalog, so the index predicate is
vacuously true and the fix is either `targetWhere: sql\`membership_id is not null\`` or dropping the
predicate from the index in a new migration.

This is the identical bug that `chat-send-conflict-target.db.spec.ts` was written for, in a second
place that spec does not inspect. Its hermetic half only knows about `uniq_chat_messages_client_key`.

**F2 — see §5.** Both repos test their own half and pass. `ably.service.spec.ts:41` pins
`cell:legacy-1:chat:org-1:7`; the frontend's `chat-realtime-dedup.test.ts` and
`chat-presence-budget.test.ts` mock `ably.channels.get` and assert against the unprefixed name.
Nothing tests them together.

---

## 8. What head already gets right

Not a small list. These were verified, not assumed.

1. **Tenant-composite integrity is complete.** 13/13 tables, every child FK composite on
   `(org_id, …)`, 13/13 RLS policies with `org_id = app.current_org_id()`, 12/13 tables carrying
   `UNIQUE (org_id, id)`.
2. **Gapless per-channel ordering.** `channel_position` is taken from
   `UPDATE chat_channels SET message_count = message_count + 1 … RETURNING` inside the send
   transaction (`chat-messages.service.ts:141-152`), which serialises correctly on the channel row.
   `chat-ordering-gap.spec.ts` green.
3. **Send idempotency is correctly built on the server.** The partial unique index, the
   `CHAT_MESSAGE_CLIENT_KEY_CONFLICT` arbiter with its predicate, the pre-check, the
   `DuplicateSendError` race path that replays the winner. It is only unreachable because no caller
   sends the key (F16).
4. **Private-channel existence discipline**, four independent implementations, all consistent
   (404 cross-tenant, 404 private-non-member, 403 only for a genuine same-org non-member).
5. **The channel-list member preview was already fixed and is bounded to 8** with a true
   `count(*) over (partition by channel_id)` and an explicit `membersTruncated` flag
   (`chat-channel-member-preview.ts`). The documentation of the 436,371-byte regression it fixed is
   exemplary.
6. **`markRead` uses `GREATEST(last_read_at, ?)`**, so two in-flight marks cannot rewind the cursor.
   `chat-read-cursor-monotonic.spec.ts` green.
7. **No provider call is inside a database transaction.** Ably publish and push both go through
   `registerAfterCommit` / the outbox consumer, never `tx`.
8. **The outbox fanout is genuinely idempotent.** Send path and consumer compute the *same*
   `effectKey` (`outbox:${eventId}:chat-message:${orgId}:${messageId}`), and `ExternalEffectLedger`
   dedupes, so the consumer replaying `dispatchRealtime` cannot double-publish. The consumer also
   rejects a payload whose `orgId` disagrees with the outbox row's `organizationId`
   (`chat-fanout-outbox.consumer.ts:53-60`).
9. **The Ably *notification* fanout does it right** — mute honoured, per-channel preference
   honoured, org default resolved, `boundedMap(recipients, PUBLISH_CONCURRENCY, …)`. The contrast
   with the web-push sibling (F4) is what makes F4 unambiguous.
10. **Attachment reads are tenant-safe.** `getSignedUrl` asserts membership, joins
    `chat_attachments → chat_messages` with `org_id` on *both* sides plus the channel, and signs
    through `storage.getFileUrl(orgId, …)`. Send-time validation rejects any `fileKey` not prefixed
    `${orgId}/` and enforces the org's `maxAttachmentSizeMb`.
11. **Invite links are hashed and encrypted at rest**, plaintext only for pre-migration rows, and
    the join path looks up by `sha256(token)` scoped to the caller's org.
12. **Link preview is SSRF-guarded** (`checkWebhookUrl`, `redirect: "manual"`, 4 s timeout).
13. **Huddle capacity takes the minimum of three ceilings** (plan, org setting, mesh limit) and
    never refuses re-entry to someone already in the call.
14. **Summarize is bounded to 50 messages**, membership-gated, and carries an explicit
    prompt-injection instruction.
15. **Every keyset cursor is opaque, base64url-encoded and validated**, and message paging keys the
    cursor to the *same* column it orders by (with the reason written down).
16. **Frontend permission gates are live**, 16/16 proven by a test I ran.
17. **Org switching clears the whole query cache** (`hooks/common/auth-hooks.ts:170`), which is why
    the tenant-free `queryKeyBase = ["streamlineos"]` is not a cross-tenant cache leak here.
18. **Member removal emits a realtime token-revocation outbox event** in the same transaction as
    the delete (`chat-channel-members-implementation.ts:172-183`).

---

## 9. Blocked on infrastructure / NOT MEASURED

- **HTTP-level latency and payload size for chat routes.** Would need
  `pnpm test:e2e:seeded` (12 GB heap) against a seeded tenant, plus
  `test/perf/route-budget-http.seeded-e2e-spec.ts` extended to cover `/chat/*`. Not run — outside
  the laptop budget with 26 concurrent agents. My §4 numbers are query-level plans on a faithful
  index replica, not end-to-end route timings.
- **Live Ably behaviour for F2.** Confirming the 403 attach empirically needs a real
  `ABLY_API_KEY` and a browser session. The finding is proved by source and by the backend's own
  capability spec, not by a live socket.
- **`check:alert-ack`** still cannot run (needs `ALERT_WEBHOOK_URL` + a human ack) — noted in the
  shared context, unchanged, and not chat-specific.
- **Web-push fanout under load.** Demonstrating pool exhaustion for F4 needs a seeded 1,000-member
  channel and configured VAPID keys. The unboundedness is read from source
  (`Promise.allSettled(members.map(...))` with no chunking); the failure threshold is not measured.
- **Cold-replay parity for the chat tables specifically.** I read `scratch_head_1010` only; the
  shared context reports `scratch_cold_1010` at applied=677 failures=0, which I did not re-derive.
