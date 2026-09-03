# 48 — The chat channel-member contract lie

**Status:** FIXED and proved on both sides. Two cross-territory findings reported, not fixed.

## The defect

Every chat read path shipped a member's identity two levels down as
`members[].membership.user`, because that is how the
`chat_channel_members -> organization_members -> users` join comes back from Drizzle. The client's
`ChannelMember` has always declared `user` and `userId` at the **top level**.

Nothing could catch it. `hooks/api/chat-core-read.ts:105` reads the detail route through
`apiClient.get<Channel>(...)` — a cast, not a parse — so the compiler vouched for the declaration and
never saw the response. Both repos typechecked green with the two shapes in open disagreement.

At runtime `member.user` was `undefined` on every member, so
`members.find((m) => m.user?.id !== currentUserId)` compared `undefined` to the caller's id, matched
the **first** member, then read `.user` off it and got `undefined`.

### Verified chain (re-checked in source, not taken on report)

| Link | Location |
|---|---|
| emits `membership.user` | `streamlineos-backend/src/modules/chat/chat-channel-members-implementation.ts:88` `getChannel` |
| returns it raw, no transform | `streamlineos-backend/src/modules/chat/chat-channels.controller.ts:120` `getOne` |
| declares `user` flat | `streamlineos-frontend/frontend/types/chat.ts:51` `ChannelMember` |
| casts, does not parse | `streamlineos-frontend/frontend/hooks/api/chat-core-read.ts:105` |
| reads `m.user?.id` | `streamlineos-frontend/frontend/features/chat/use-message-panel-data.ts:323` |

The earlier claim that the message panel is capped at 8 members is **still wrong** and I did not act on
it: `use-message-panel-data.ts` reads `useChatChannel` (the DETAIL route), which returns members
unbounded. The bound of 8 lives only in `chat-channel-list.service.ts`.

### User-visible consequences

Ten files in `features/chat/**` read `m.user`. All were broken:

- **Every DIRECT channel header rendered "Unknown"** — `use-message-panel-data.ts:323`,
  `channel-item.tsx:41`, `channel-info-panel-profile.tsx:46`.
- **The sidebar Favourites section was always empty** — `channel-sidebar.tsx:150` filters on
  `members.find(m => m.user?.id === currentUserId)?.isFavorite`, which never matched.
- **Channel-admin controls never appeared** — `channel-info-panel.tsx:131` `isAdmin` was always false,
  and `:96` `isArchivedForMe` always false.
- Also affected: `channel-item-menu.tsx:77,86`, `channel-members-section.tsx:71,72,90`,
  `channel-member-row.tsx:50,57,59,75,84,97`, `message-panel-view.tsx:227-232`,
  `use-chat-mentions.ts:20` (DM @-mention candidates resolved to the wrong person).

The report of "six files" was an undercount; it is ten.

## Which side moved, and why

**The API moved.** The frontend declaration was already the more honest of the two.

1. `membership` is the `organization_members` join table — a tenancy implementation detail. Putting it
   in the wire shape leaks the persistence model into the chat client, which has no concept of it.
   Every other chat DTO is already user-shaped (`Message.sender`, `PinnedMessage.pinnedByUser`).
2. One change point fixes ten consumers at once. Moving the frontend instead meant editing ten files
   plus the type plus two test mocks, and the result would still be a cast — the same class of bug
   could recur the next time a route changed.
3. **There were five emission sites, not two, and they already disagreed with each other.** Flattening
   was the only way to make them consistent:

| Route | Handler | shape before |
|---|---|---|
| `GET /chat/channels` (+ `/archived`) | `loadChannelMemberPreview` | `membership:{id,userId,user{id,name,image}}`, bounded 8 |
| `GET /chat/channels/:id` | `getChannel` | `membership:{id,userId,user{…,email}}`, all table columns |
| `GET /chat/channels/:id/members` | `listMembers` | same as detail, paginated |
| `GET /chat/channels/entity/:t/:id` | `getOrCreateEntityChannel` | nested on the read branch; **no members at all** on the create branch |
| `POST /chat/channels` | `createChannel` | `members:[{membershipId}]` only, or no members |

4. **No consumer depended on the nesting.** `chat-mentions.ts`, `chat-reactions.service.ts` and
   `chat-reply-reminders.service.ts` each run their own query with their own `with: { membership }` —
   none reads these four routes' responses. The only test asserting the nesting was the unit test of
   the function being changed.

### What the wire shape is now

`src/modules/chat/chat-channel-member-shape.ts` holds it, and all four read routes go through it:

```
id · channelId · userId · role · lastReadAt · joinedAt · mutedUntil · archivedAt
isFavorite · notificationPreference · user{ id, name, image, email? }
```

`orgId` and `membershipId` left the wire with it — the caller's tenant is the only one it can read and
the membership id is an internal join key, so both were payload no client read.

**The list route stays bounded.** `CHANNEL_LIST_MEMBER_PREVIEW = 8`, the single-statement
`row_number()` ranking and the `count(*) over (partition by …)` are untouched. The preview still
withholds `user.email` (eight addresses per channel across a 50-channel page is the payload it exists
to cut), which is why `email` is optional on the wire. The change **removes** bytes: one nesting level
and the `member_membership_id` column are gone.

## Proof

A typecheck proves nothing here — that is exactly what failed. Every assertion below runs against what
the read paths **return**, with a database double answering in the nested shape the driver actually
produces.

| Command | Exit | Result |
|---|---|---|
| `jest --runInBand --testPathPattern="chat-channel-member"` (backend) | 0 | 3 suites, 39 tests |
| `jest --runInBand --testPathPattern="modules/chat"` (backend) | 0 | 38 suites, **329 tests** |
| `jest --runInBand --testPathPattern="features/chat\|hooks/api/chat"` (frontend) | 0 | 20 suites, **154 tests** |
| `pnpm -C streamlineos-backend typecheck` | **0** | clean |
| `pnpm -C streamlineos-frontend/frontend type-check` | **0** | clean |
| `pnpm -C streamlineos-backend check:spec-typecheck` | **0** | spec-inclusive typecheck passed |

New specs:

- `src/modules/chat/__tests__/chat-channel-member-wire-shape.spec.ts` (10 tests) — drives the real
  `getChannel`, `listMembers` and `loadChannelMemberPreview`, asserts all three emit the identical
  sorted key set, that `membership` is absent, and that `orgId`/`membershipId` never reach the wire.
- `frontend/features/chat/__tests__/channel-member-shape.test.tsx` (12 tests) — the same key sets as
  data, the consumer predicate run against them, and a real `ChannelMemberRow` render showing the
  member's name and address.

**Bite-proved.** Reverting only the `getChannel` flatten (`return channel;` in place of
`return { ...channel, members: channel.members.map(flattenChannelMember) }`) turned **4 of 10** backend
tests red, including the header case. Restored; `git diff --stat` clean. Both suites also carry
explicit `BITE:` cases feeding the pre-fix nested payload and asserting it yields `"Unknown"` and no
own-member row — without those, the files would pass just as happily against the broken payload.

**Against the real seeded database.** `psql -d scratch_perf_seed` as the non-owner `streamline_app`
role with RLS live and `app.organization_id` set, running the preview's projection: 8 rows returned for
a channel whose `member_count` is **500** (bound holds, true count reported, not the array length), and
`member_user_id` / `user_row_name` populated with real identities — the columns the flattener consumes.

**A pre-existing fixture was already written in the flat shape nothing sent.**
`chat-services-tenant-isolation.spec.ts:264` asserted `members[0].userId === "u1"` against a hand-built
flat row, so it passed while `userId` was `undefined` on every real response. It now answers nested and
asserts the flattening — which is itself evidence of how invisible this was.

## Residual defect fixed alongside

Four surfaces each carried their own copy of
`members.find((m) => m.user?.id !== currentUserId)?.user`. That predicate has two failure modes the
flattening does **not** fix: a member whose user row is gone arrives as `user: null` and wins the `!==`
race ahead of the real partner, and a self-DM has exactly one member — the caller — so "the one that is
not me" is nobody, and the header reads "Unknown" for a conversation with yourself. It is now one
function, `features/chat/channel-member-lookup.ts`, with both cases handled and covered.

## Cross-territory findings — reported, NOT fixed

### 1. Huddle participants carry the identical lie, and it is live

`src/modules/chat/chat-huddles.service.ts:125-142` returns `participants[].membership.user` and
`startedByMembership.user`, while `types/chat.ts:262` declares `HuddleParticipant.user` and
`.userId` flat and `Huddle.startedByUser` — a **rename**, not just a nesting difference. Worse, the
participants query uses `membership: { columns: {} }`, so `userId` is not selected at all.

Live consequences:

- `features/chat/huddle-participant-card.tsx:81` — every huddle tile shows **"Unknown"**.
- `features/chat/huddle-screenshare-view.tsx:54` — the screenshare label shows **"Unknown"**.
- `features/chat/huddle-mini-bar.tsx:32,34` — no avatar, no initials.
- `features/chat/huddle-panel.tsx:66` and `huddle-invite-section.tsx:42` read `p.userId`, which is
  never sent, so `myParticipant` is always `undefined` and the invite dedupe never matches.

I did not fix it: the consumers are `features/chat/huddle-*`, outside my grant, and the
`startedByMembership` → `startedByUser` rename needs its own proof pass. The flattener it needs is
already committed at `chat-channel-member-shape.ts`; adding `userId: true` to the membership columns
and mapping both relations is a one-sitting change.

### 2. The detail route hydrates the full roster through a parent-detail endpoint

`getChannel` loads **all** members with nested user objects and no limit, which
`frontend/CLAUDE.md` §2 forbids ("Never hydrate a collection through a parent-detail endpoint"). A
paginated `GET /chat/channels/:channelId/members` already exists and **has no frontend consumer at
all** — `channel-info-panel.tsx` renders the roster from `useChatChannel`, which is why nobody noticed.
On the seeded tenant that is 500 members with nested user objects in one response.

I did not fix it: bounding the detail route requires `channel-members-section.tsx` to move onto a new
paginated hook, which widens the change past what I can prove in this pass. I did make it safe to do —
`use-message-panel-data.ts` now reads `channel.memberCount ?? members.length`, so the header count
stays correct if the route is later bounded.

### 3. `Channel` has further declared fields the API has never sent

`types/chat.ts` still declares `createdBy: string`; no route sends it (the column is
`created_by_membership_id`, and it is deliberately excluded from `CHANNEL_LIST_COLUMNS`).
`unreadCount` and `lastMessage` are declared non-optional but are list-only — the detail route sends
neither. I left these: they are outside the member-shape mandate and making them optional ripples into
consumers I do not own. Same root cause, same cast hiding them.

## Gates I ran that are RED, and whose they are

None of these are mine; each was checked, not assumed.

- **`check:query-projections` exit 1** — ratchet breach, unprojected reads 1441 -> 1449. My four
  changed files contain exactly **1** bare `.select()`, identical before and after
  (`git show 17eda10b:<file> | grep -c`). My net contribution is `findMany 295 -> 293`, an
  **improvement**; the `+10` is bare `.select()` from the six other agents' commits that landed since
  my baseline `17eda10b`.
- **`check:unbounded-reads` exit 1** — flags `/chat/chat-channel-member-preview.ts:114` as
  UNCLASSIFIED. **Pre-existing**: the identical bare `.select()` is at line 124 of that file at
  `17eda10b`, and the file has never had an entry in
  `src/scripts/baselines/unbounded-reads-classification.json` (keyed by path, added in `fd8d1c12`).
  The read **is** bounded — `lte(ranked.memberRank, CHANNEL_LIST_MEMBER_PREVIEW)` is the bound — so it
  wants a `BOUNDED` entry. I did not add it: that baseline is a shared gate file outside my territory,
  and the gate stays red regardless (2 other unclassified paths in crm/kb, 1 regression in
  `hr/performance/kpis.service.ts`, 1 stale entry).
- **`check:route-budgets` exit 1** — the 2 breaches are `GET /calendar/events` and
  `GET /cron/storage-sweep`. Neither is chat.
- Green: `check:bounded-contracts` (0 violations), `check:contract-breaking-change` (exit 0).

## Not run — stated plainly

- **No HTTP-level verification and no running app.** Port 3000 had a dev server another session
  started; **nothing was listening on 3001**, so no chat route was reachable. I did not start a backend:
  it would contend with concurrent agents' seeded e2e runs. The detail route's flat shape is therefore
  proved at the service-return boundary and against the real database's projection, **not over the
  wire**.
- **The DIRECT header was not verified against real data.** `scratch_perf_seed` contains **0** rows in
  `chat_channels` with `type='DIRECT'`, so the seeded proof exercises the same join through
  GROUP/PUBLIC channels only. The DIRECT path is proved by unit test plus its bite case.
- **The payload byte count was not re-measured.** The size agent's 436,371 -> 6,876 figure was measured
  over HTTP, which I could not reach. The change removes a nesting level and a selected column, so
  bytes strictly decrease, but I did not measure it.
- **Frontend tests are not typechecked by the repo gate.** `frontend/tsconfig.json` excludes
  `**/__tests__/**` and `*.test.tsx`. I typechecked my new test file under a spec-inclusive config
  separately: **0 errors in my files**. That config reports 838 errors repo-wide, 536 of them the same
  `toBeInTheDocument` matcher artifact across pre-existing tests — a missing-types artifact of the
  ad-hoc config, not a defect.
- Lint was not run on either repo.

## Files changed

**`streamlineos-backend`** — commit `6b9f4b8d`

```
src/modules/chat/chat-channel-member-shape.ts                     (new)
src/modules/chat/__tests__/chat-channel-member-wire-shape.spec.ts (new)
src/modules/chat/chat-channel-members-implementation.ts
src/modules/chat/chat-channels.service.ts
src/modules/chat/chat-channel-member-preview.ts
src/modules/chat/__tests__/chat-channel-member-preview.spec.ts
src/modules/chat/chat-services-tenant-isolation.spec.ts
```

**`streamlineos-frontend`** — commits `fb9e1ecdc`, `+1 test tweak`

```
frontend/features/chat/channel-member-lookup.ts                    (new)
frontend/features/chat/__tests__/channel-member-shape.test.tsx     (new)
frontend/types/chat.ts
frontend/features/chat/use-message-panel-data.ts
frontend/features/chat/channel-item.tsx
frontend/features/chat/channel-info-panel-profile.tsx
frontend/features/chat/use-chat-mentions.ts
```

Cross-tenant behaviour is unchanged: `assertMember` still answers 404 for a private channel the caller
cannot see and for a channel in another tenant, and `chat-bola-proof.spec.ts` /
`chat-services-tenant-isolation.spec.ts` / `chat-cross-tenant-404.spec.ts` all pass.
