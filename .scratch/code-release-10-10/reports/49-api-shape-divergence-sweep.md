# 49 — The `apiClient.get<T>` cast: finishing the huddle fix and sweeping the class

**Status:** huddle fix finished and verified · 5 further instances found, 5 fixed · gate recommendation made, not built.

`apiClient.get<T>(...)` is a cast, not a validation. When the backend emits a shape other than the
frontend's declared `T`, both repos typecheck clean and the app renders wrong. No test catches it:
backend specs assert the backend's own shape, frontend tests mock the declared shape, and nothing
compares the two.

Two instances were already confirmed and fixed before this pass (chat channel members; chat
huddles). This report covers finishing the second one and sweeping for more.

---

## 1. The huddle fix is finished — the realtime surface was already clean

Commit `755b45e3` routed `getActiveHuddle` and `startHuddle` through `loadHuddleWire`. I audited
**every** other huddle emission point.

| Emission point | What it returns | Verdict |
|---|---|---|
| `GET /chat/channels/:id/huddle` | `loadHuddleWire` | fixed by 755b45e3 |
| `POST /chat/channels/:id/huddle/start` | `loadHuddleWire` | fixed by 755b45e3 |
| `POST /chat/huddles/:id/join` | `{ ok: true }` | no huddle on the wire |
| `POST /chat/huddles/:id/leave` | `{ ok: true }` | no huddle on the wire |
| `POST /chat/huddles/:id/kick` | `{ ok: true }` | no huddle on the wire |
| `POST /chat/huddles/:id/invite` | `{ ok: true }` | no huddle on the wire |
| `PATCH .../mute · hand · deafen · screenshare · heartbeat`, `POST .../signal` | `{ ok: true }` | no huddle on the wire |

**No huddle route other than the two returns a huddle or a participant.** There is no second
emission path to re-break the panel.

Realtime (`AblyService.publishHuddleEvent`) — every payload audited:

- `huddle:started` → `{ huddleId, channelId, startedBy: userId }` — flat **user** id. Correct.
- `huddle:ended` → `{ huddleId, channelId }`.
- `huddle:user_joined` / `huddle:user_left` → `{ huddleId, userId, channelId }` — flat user id.
  `use-huddle-events.ts:45,51` reads exactly `data.userId`. Correct.
- `huddle:state_updated` → five variants (`isMuted`, `isDeafened`, `handRaised`,
  `isScreenSharing`, `kicked`), all carrying a flat `userId`.
- `huddle:kicked` (user channel) → `{ huddleId, channelId }`; the handler ignores the payload.

One payload does carry a membership id: the host-transfer variant of `huddle:state_updated`
(`chat-huddles.service.ts:489`, `newHostMembershipId`). **No frontend code reads it** —
`huddle-realtime.ts:51` discards every huddle payload and merely invalidates the query, and
`grep` for `newHostMembershipId` / `hostTransferred` across the frontend returns one hit, the
event-name list. Host transfer therefore resolves correctly via the refetch, which now returns a
flat `startedBy`. **Recorded, not fixed** — a cosmetic key on a field nobody renders.

**Frontend consumers verified, not assumed.** All eight read the flat shape and needed no change:
`huddle-participant-card.tsx:54,56,81` (`participant.user?.*`), `huddle-screenshare-view.tsx:53`
(`p.userId`), `huddle-panel.tsx:66,68,244–250` (`p.userId`, `huddle.startedBy`),
`huddle-mini-bar.tsx:31–34`, `webrtc-huddle.ts:326–328`, `use-message-panel-data.ts:92`,
`huddle-invite-section.tsx:42`, `use-huddle-events.ts:40`. `types/chat.ts` `Huddle` (9 keys) and
`HuddleParticipant` (9 keys) match `HUDDLE_WIRE_KEYS` and `HUDDLE_PARTICIPANT_WIRE_KEYS` exactly.

One defect *introduced* by `755b45e3` was found and fixed: its spec failed
`pnpm check:spec-typecheck` (TS2559, weak-type check on the `isHost` predicate). Fixed in
`15f36ff9`.

---

## 2. How I enumerated candidates — and what this sweep MISSES

Three mechanical scans, all over `streamlineos-backend/src`, excluding `*.spec.ts` / `*e2e-spec.ts`:

**Scan A — relation keys shipped in a `with: { ... }` block, cross-referenced against the whole
frontend corpus.** A brace-matching extractor pulls the top-level keys of every `with:` block
(a ~70-line Node script; the algorithm is stated here rather than vendored, see §5), then tests each key name against the concatenated text of
every `.ts`/`.tsx` under `frontend/`. Result: **113 distinct relation keys across 143 files; 17 are
not mentioned anywhere in the frontend.** Those 17 are the candidate set — a name the backend ships
that no frontend file has ever heard of.

**Scan B — `columns: {}`.** An empty selection selects *nothing* and silently emits `{}`. Exactly
**4 sites** repo-wide, all in chat: `chat-pins.service.ts:62,71`, `chat-search.service.ts:66`,
`chat-reply-reminders.service.ts:212`.

**Scan C — targeted follow-through.** For every candidate: read the service method, find the
controller route, find the `apiClient.*<T>` call site in `frontend/hooks/api/**`, read the declared
`T`, then read the `.tsx` that renders it and state what a user sees.

### What this sweep does not cover — stated plainly

- **Same key name, different sub-shape.** Scan A only asks whether the *name* appears in the
  frontend. `sender` appears everywhere, so a `sender` whose inner fields disagree is invisible to
  it. Finding #1 below was caught by Scan B and by reading the timeline by hand, not by Scan A.
- **`db.select({...})` paths.** Scans A and B see only the relational query builder. A hand-built
  projection that names a column differently from the frontend is not enumerated at all.
- **False "used" verdicts.** A key like `user`, `message`, `ticket`, `project` or `attachments`
  appears somewhere in the frontend for unrelated reasons, so Scan A clears it. Of the 113 keys, 96
  were cleared this way and only spot-checked.
- **Value-level divergence.** A field present on both sides but carrying a membership id where the
  client compares a user id passes every scan here. That was the *huddle* `startedBy` bug, and it
  would not have been found by these scans.
- **CRM and Inventory are out of release scope** and were excluded from triage. Scan A did surface
  two keys there (`csm` in `crm-ce-dashboard.service.ts`, `poster` and `currentLocation` in
  inventory) — **untriaged, handed on.**
- **Non-`with` HR/finance/payroll surfaces** were not swept exhaustively; only the seven candidates
  Scan A produced outside chat/support were followed through.

---

## 3. Findings, ranked by user-visible impact

### FIXED — real, user-visible

**#1 · `Message.senderId` is emitted by no read path at all.** HIGH.
`chat_messages` has no `sender_id` column; the identity arrives through
`sender_membership_id → organization_members → users`. Every read path shipped that join verbatim as
`senderMembership`.
- **Backend sent:** `{ …columns, senderMembershipId, senderMembership: { userId }, sender: {…} }`
- **Frontend declares:** `Message.senderId: string` (`types/chat.ts:141`)
- **User saw:** `message-list.tsx:273` computes `isOwn = msg.senderId === currentUserId`, so
  **every message a user sent rendered as somebody else's** — left-aligned, other-person styling —
  and the **Edit and Delete controls never appeared**, both being `{isOwn && …}` at
  `chat-message-actions.tsx:77,78`. `:276` groups by `prevMsg?.senderId === msg.senderId`, and
  `undefined === undefined` is `true`, so **consecutive messages from different people collapsed
  under one sender header**. The Ably broadcast (`chat-message-fanout.service.ts:56`) and the
  optimistic insert (`chat-core-mutations-a.ts:32`) both *do* carry `senderId` — which is why a
  message looked right as it was sent and flipped the instant `onSuccess` invalidated and refetched.
- **Fix:** new `chat-message-sender-shape.ts` (`liftSenderId` / `flattenMessageSender`), applied in
  the timeline (list + poll + thread, including `replyTo`), saved, pins and search.

**#2 · Saved messages never flattened `sender`.** HIGH.
- **Backend sent:** `items[].message.senderMembership.user`, no `sender` key.
- **Frontend declares:** `SavedMessage.message: Message & {…}` → `sender`.
- **User saw:** `saved-messages-panel.tsx:50,56` — **every card in the Saved panel read "Unknown"
  with a blank avatar**, because both `senderId` and `sender` were absent and
  `resolveChatUserName(undefined, undefined, map)` returns `"Unknown"`.

**#3 · Support ticket watchers: unfollow was unreachable.** HIGH.
- **Backend sent:** `{ id, orgId, ticketId, userMembershipId, createdAt, membership: { id, userId } }`
  — and no `user` columns were selected at all.
- **Frontend declares:** `SupportTicketWatcher { userId: string; user: {…} | null }`.
- **User saw:** `ticket-detail-header.tsx:65` computes `isFollowing` from `w.userId`, permanently
  `undefined`. The star never filled, `aria-label` was permanently "Follow ticket", and
  `handleToggleFollow:101` could only ever take the follow branch — **`DELETE /support/:id/follow`
  was unreachable from the UI, so a user who followed a ticket could never stop, and kept receiving
  watcher notifications.** `follow` uses `onConflictDoNothing`, so repeat clicks returned success
  and changed nothing.

**#4 · Build ticket watchers: same, plus every avatar unnamed.** HIGH.
- **Backend sent:** the `ticket_watchers.user` relation points at `organization_members`, so
  `w.user` was a **membership row** (no name/email/image), and the row carries `membershipId`, not
  `userId`.
- **Frontend declares:** `TicketWatcher { userId: string; user?: TicketUser }`.
- **User saw:** `watcher-list.tsx:106` — **every watcher avatar fell back to "?" with the tooltip
  "Unknown"**, `key={w.userId}` was `undefined` on every row (duplicate React keys), and
  `isWatching:36` was permanently false so un-watching was unreachable exactly as in #3.

**#5 · HR internal openings: the department badge never rendered.** MEDIUM.
- **Backend sent:** `orgDepartment` / `orgDepartmentId`.
- **Frontend declares:** `department` / `departmentId` — and declared `id: number` where
  `org_units.id` is a uuid `text`.
- **User saw:** `internal-jobs-client.tsx:109` renders the badge under `{job.department && …}`, so
  **no internal opening ever showed its department chip.** No crash, no "Unknown" — a silently
  missing chip, which is the failure mode that survives review.

### RECORDED, NOT FIXED — cosmetic or unreachable

| Finding | Why it is not worth fixing |
|---|---|
| `huddle:state_updated` carries `newHostMembershipId` | no frontend reader; refetch already resolves host correctly |
| `GET /chat/presence/search` emits nested `senderMembership.user` | **no frontend caller** — the client calls `/chat/search/messages`, a different service that does flatten. Unreached duplicate route. |
| `POST /chat/channels/:id/messages` returns the raw row, typed `Message` | `useSendMessage.onSuccess` discards the body and refetches |
| `PinnedMessage.pinnedBy`, `SavedMessage.userId` declared but never emitted | no component reads either (`pinnedBy` now emitted anyway, as a free by-product of #1) |
| `chat-reply-reminders.service.ts:212` `columns: {}` | internal email composition, never on the wire |
| Support ticket list/detail ship `assigneeMembership` / `creatorMembership` while the client declares `assignee` / `creator` / `assigneeId` / `createdBy` | **none of the four is read by any component** — no assignee picker or avatar exists in the ticket UI. Latent: the first component to trust the type breaks. Separate concern: the membership sub-select has no `columns`, so the whole `organization_members` row is serialized on every ticket list. |
| `Branch.branchManagerId` / `branchHrId` declared, never emitted | never read; `branchManager` itself is flattened correctly |
| `userMember` (build timesheets `GET /build/time-entries/team`), `organizer` (`GET /hr/team-events`), `redemptions` (`GET /billing/coupons`) ship joins verbatim | **no frontend call site for any of the three.** Dead read paths — each is one hook away from becoming instance #6. |
| CRM `csm`, inventory `poster` / `currentLocation` | **out of release scope, untriaged** |

### VERIFIED CLEAN

`headMember` (branches — flattened to `branchManager`), `workItem` / `relatedWorkItem` (build ticket
relations — collapsed to `relatedTicket`), `panelMembers` (HR interviews — mapped to
`panelInterviewerIds`), `startedByMembership` (huddles — fixed in 755b45e3).

---

## 4. Proof

Not a typecheck — a typecheck is what failed here twice. Each fix is proved by a spec that asserts
on what the read path **returns**, driving the real service with a database double answering in the
nested shape Drizzle actually produces, and asserting the exact key set.

Bite-proved in both directions. Pre-fix trees built with `git archive HEAD src` into
`scratchpad/bite-msg` and `scratchpad/bite2` — **never in the shared working tree** — with only the
new spec dropped in:

| Spec | Against the fix | Against pre-fix HEAD |
|---|---|---|
| `chat-message-wire-shape.spec.ts` | 12/12 pass | **9 of 12 fail** |
| `support-watchers` + `ticket-watchers` + `internal-jobs` wire-shape | 17/17 pass | **13 of 17 fail** |

(The tests that pass in both directions are the `BITE:` cases themselves, which assert that the
*broken* payload produces the broken render — they are supposed to hold on both trees.)

All six wire-shape specs together: **52 tests, 52 pass.**

---

## 5. Can a gate catch this class? — measured, and the answer is uncomfortable

**`openapi:check` could never have caught any of these.** `check-openapi-fresh.ts` regenerates the
OpenAPI document from the backend source and diffs it against the committed artifact. It compares
**the backend to itself**. No frontend type is an input. Structurally the wrong instrument.

**`check:contract-drift` (frontend, ticket 34) is the right *shape*** — it extracts frontend
`apiClient` call sites, resolves the declared TS interface, and compares field-by-field against the
vendored `contracts/openapi.json`. Two reasons it missed all five:

1. **It is scoped to timesheets.** `HOOK_DIRS` is hard-coded to `hooks/api/timesheets` and
   `hooks/api/timesheets-core`; it scanned 49 calls this run. Nothing in chat, support, build or hr
   is in its scan set.
2. **Widening it would not help.** I measured the vendored artifact: **3,613 operations, and
   exactly 1 carries a 2xx response schema (0.03%).** Every route in these five findings resolves to
   `NO CONTENT/SCHEMA`. The gate compares **request bodies** (this run: "body resolved: 24, body
   unresolved: 25") because response bodies are not in the artifact to compare against. This defect
   class is entirely a *response*-shape defect. **Do not widen `HOOK_DIRS` and expect it to bite.**

**The mechanism that would actually catch it already exists and is 2.5% adopted.** `apiClient`
accepts a `contract` (`lib/api-envelope.ts:169`, `safeParse` → `rejectContractViolation`, which
throws), and `scripts/check-response-contracts.mjs` already measures coverage with a baseline.
Measured now: **2,662 seam calls scanned, 59 validated, 2,603 unvalidated; 1,963 distinct routes,
49 validated.** Every route in all five findings is unvalidated. A Zod parse on the response would
have turned each of these from a silent wrong render into a loud failure on the first request.

### Recommendation

1. **Add response contracts to the identity-bearing reads, not a new gate.** The gate exists; the
   work is adoption. Highest value per line: the routes that carry a person — messages, members,
   watchers, assignees. Adoption must follow correctness, because a contract on a route that is
   still wrong throws in the user's face.
2. **Cheap and genuinely biting, if a static gate is wanted: ship Scan A as a check.**
   It is ~70 lines — walk `src`, brace-match every `with: {` block, collect its top-level keys,
   test each name against the concatenated frontend corpus — runs in about a second with no
   database and no build, and its output is auditable: 113 relation keys, 17 unknown to the frontend, of which **5 were real
   user-visible bugs**. Precision ~29% with a baseline file for the known-benign 12. It would have
   flagged #3, #4 and #5 on the commit that introduced them. It would *not* have flagged #1 or #2
   (same-name/different-shape) — Scan B (`columns: {}`, 4 sites repo-wide) is what surfaced those,
   and is even cheaper.
3. **Do not build a generic backend-return-type vs frontend-interface comparator.** It is not cheap
   and it would not be sound here — see the next section.

### A contributing cause worth recording: Drizzle's `with:` is not type-checked on this schema

While fixing #5 I measured this directly. For `jobPostings`,
`db.query.jobPostings.findMany({ with: { orgDepartment: {…}, postedByUser: {…} }, columns: { id: true } })`
compiles and infers `Promise<{ id: number }[]>` — the `with:` clause contributes **nothing** to the
result type, and an unknown relation key would be accepted silently. The relation *is* registered at
runtime (verified: `jobPostingsRelations` is present in the schema barrel). So on the backend side
the compiler cannot see these nested keys either, which is the second half of why this class is
invisible to a typecheck: **the frontend casts, and the backend does not infer.** That is why #5 was
fixed with an explicit `leftJoin` rather than by destructuring the relation.

---

## 6. Gates

Backend, from `streamlineos-backend`; frontend from `streamlineos-frontend/frontend`. All heavy
commands through `heavy.sh 2`. Exit codes captured with `$?` / `$pipestatus[1]` (note
`${PIPESTATUS[0]}` does not work in this zsh).

| Command | Exit | Number |
|---|---|---|
| `pnpm typecheck` (backend, `tsc --noEmit -p tsconfig.build.json`, 8 GB heap) | **0** | 0 errors |
| `pnpm -C frontend type-check` | **0** | 0 errors |
| `pnpm exec jest --runInBand --testPathPattern="wire-shape"` | **0** | 6 suites, 52 tests, 52 pass |
| `pnpm exec jest --runInBand --testPathPattern="(modules/support\|modules/build/core\|modules/hr/recruitment\|modules/chat)"` | **0** | 144 suites, 1034 tests, 1034 pass |
| frontend `jest --runInBand --testPathPattern="(features/chat\|features/support\|features/build\|hooks/api)"` | **0** | 87 suites, 882 tests, 882 pass |
| `node scripts/check-contract-drift.mjs` (frontend) | **0** | 49 timesheets calls, 0 new drift |
| `pnpm check:spec-typecheck` | **0** (green on the re-run) | spec-inclusive typecheck passed |

**`check:spec-typecheck` was red mid-session and is green now.** Three separate owners were
involved and it is worth separating them. At the start of this work the gate failed on three files:
`chat-huddle-wire-shape.spec.ts` (TS2559 — introduced by `755b45e3`, **mine**, fixed in
`15f36ff9`) and two in `src/modules/e-sign/__tests__/`. Later in the session it failed instead on
`src/modules/ai/core/streaming/__tests__/ai-cancellation-stops-the-spend.spec.ts` and
`src/modules/ownership/ownership-transfer-expiry.service.ts` — another agent's concurrent
uncommitted work in the shared tree. Both the e-sign and the ai/ownership errors were fixed by their
owners mid-run (`0c559448`). Final re-run: **exit 0, "spec-inclusive typecheck passed."** None of
the six wire-shape specs ever appeared in a failing set.

**Not run:** lint (either repo), `next build`, e2e, any database-backed verification. The shared
working tree carried ~20 other files modified by concurrent agents throughout, so the typechecks
above describe the tree as it stood, not this work in isolation.

---

## 7. Commits

| Repo | SHA | Contents |
|---|---|---|
| backend | `15f36ff9` | `chat-message-sender-shape.ts` + timeline/saved/search/pins + spec + the 755b45e3 spec-typecheck fix (7 files) |
| backend | `1a87c21b` | support watchers, build watchers, HR internal jobs + 3 specs (6 files) |
| frontend | `f8a1a0523` | `SupportTicketWatcher.userId`, `TicketWatcher.userId`/`user`, `InternalJob.departmentId`/`department.id` (3 files) |

## 8. Handed on

- **CRM / Inventory** (out of scope): `csm` in `crm-ce-dashboard.service.ts`; `poster` in
  `inv-stock-adjustments.service.ts`; `currentLocation` in `inv-traceability.service.ts` — all ship
  a `with:` join verbatim, all untriaged.
- **Support ticket over-exposure**: `assigneeMembership` / `creatorMembership` in
  `support-tickets.service.ts` (`listTickets:118`, `getTicket:256`) have no `columns` restriction,
  so the full `organization_members` row is serialized on every ticket list response. Not a shape
  lie today (nothing reads it) but a payload and exposure concern.
- **`GET /chat/presence/search`** duplicates `/chat/search/messages` with the pre-fix nested shape
  and has no caller. A deletion candidate, not a fix candidate.
