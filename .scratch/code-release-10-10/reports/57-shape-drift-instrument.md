# 57 — The instrument for the shape-drift class: a static gate, and contracts on the routes that bit

**Status:** gate shipped and bite-proved · contracts on 11 routes (the nine defect routes plus two
siblings) · one blind spot closed · one over-exposure fixed · **two new live defects found**, both
fixed · the adoption fraction is stated honestly and it is small.

Follows report 49 (the sweep) and 28d (the ratchet). Neither of those built the gate; this does.

---

## 1. What was wrong with the instrumentation, in one line

`apiClient.get<T>` is a cast, and Drizzle's `with:` is not type-checked on this schema. So the
backend does not infer the shape it emits, the frontend does not validate the shape it receives, and
nothing in between arbitrates. Nine defects have now shipped through that hole in this release.

---

## 2. Scan A shipped as a gate: `pnpm check:relation-keys`

`streamlineos-backend/src/scripts/check-relation-key-reach.mjs`. Two rules, ~1 second, no database,
no build.

| Rule | What it stops |
|---|---|
| **A — relation reach** | a `with:` key the frontend corpus has never mentioned. Three of the nine were exactly this. |
| **B — empty projection** | `columns: {}`, which selects NOTHING and emits `{}`. It is how the huddle roster lost `userId`. |

**Measured at head (two-repo layout):** 3,581 backend files, 4,992 frontend files, **111 distinct
`with:` keys over 539 sites, 15 unknown to the frontend and all 15 triaged**, 1 `columns: {}` site,
triaged. Exit 0.

The baseline is not an allowlist. Each of the 15 entries carries a **written verdict** and the
**files** it may appear in, so the same key in a new service fails (`a triaged relation key in an
untriaged place`), and a verdict that no longer describes the tree fails as stale. Three floors —
backend files, frontend files, distinct keys — make a broken scan read as broken rather than green.

**Blind spots are printed on every run**, not just recorded here: same-name/different-sub-shape,
`db.select({…})` projections, value-level divergence (a membership id where the client compares a
user id — the original huddle bug), and a name that clears because it appears in the frontend for an
unrelated reason (96 of 111 clear that way).

### The gate bit its own author, twice, and both were real

1. **A frontend TEST fixture cleared a key.** The BITE fixtures I wrote name `senderMembership` and
   `startedByMembership` in their "the payload that actually shipped" objects. With tests in the
   corpus, a fixture whose entire purpose is to assert the name is WRONG cleared it as known.
2. **A COMMENT cleared a key.** The doc comment on `hooks/api/chat-schema.ts` names
   `senderMembership` while explaining the defect. Same effect.

Both fixed: tests are excluded from the corpus and the corpus is masked with `maskNonCode` before it
is searched. The cost is that a name read only through a string literal would flag — a triageable
false positive, and the right side of the trade, because a false positive is read once and a false
clear is never read at all. Both are pinned by self-test assertions.

### Bite-proved in both directions, hermetically

`git archive HEAD src` into `scratchpad/bite-relkeys`, **never the shared working tree**. Clean
archived tree: exit 0. Three planted defects, each reverted after:

| Planted | Result |
|---|---|
| `with: { assigneeSupervisorMembership: … }` — a name no frontend file knows | **exit 1**, names key and `file:line` |
| `columns: {}` in a file not on the list | **exit 1** |
| a triaged key (`startedByMembership`) in a file its verdict did not cover | **exit 1** |
| restored tree | exit 0 |

**Self-test: 17/17.** Two of the seventeen are the BITE cases; two more are the false-clear cases
above; three are the scan floors. Wired into `ci.yml` in the `gates` job: the self-test **blocking**
(hermetic), the cross-repo half `continue-on-error` with the measured reason (a backend-only CI
checkout exits 2 INCONCLUSIVE), matching the house pattern for `check:permission-keys`.

**Precision.** The sweep that motivated this flagged 17, of which 5 were real user-visible bugs
(~29%), and the 12 misses were triaged in one sitting. That is a hit rate worth a gate.

---

## 3. Response contracts: the selection rule, and the honest fraction

### The rule I applied

> A currently-unvalidated seam READ whose payload carries a PERSON **and** whose identity field is
> the subject of a demonstrated defect — i.e. the read paths behind the nine confirmed instances,
> plus any sibling read emitting the same person-bearing payload through the same backend shape
> helper.

I first measured the wider rule the ticket suggests — *any* unvalidated read whose declared type
transitively mentions a person-bearing field (`user`, `member`, `sender`, `assignee`, `watcher`,
`participant`, `owner`, `actor`, `isOwn`, `isFollowing`, …). **That selects 304 call sites across 184
files and 291 distinct routes.** Writing a TRUE contract for one route costs a read of the
controller, the service, the shape helper and the Drizzle column nullability. 291 of those is not
this session's work, and claiming otherwise is how a box gets falsified. So the narrower rule above
is what I executed, and the 304 is stated as the population it is a subset of.

### Coverage, before and after — the real fraction

| | before | after |
|---|---|---|
| seam calls scanned | 2,662 | **2,665** |
| carrying a contract | 59 (2.2%) | **69 (2.6%)** |
| unparsed | 2,603 | **2,596** |
| distinct routes parsed somewhere | 49 | **58** |
| risk-list routes held | 49 | **58** |

**2.6%. Not "complete coverage" and not close to it.** What changed is *which* 2.6%: every route
behind the nine confirmed defects is now parsed, and none of them was before. The baseline was
ratcheted down twice (2603 → 2598 → 2596), so the debt cannot silently grow back.

### Routes contracted

`/chat/channels`, `/chat/channels/archived`, `/chat/channels/public`, `/chat/channels/:id/huddle`
(+ `/start`), `/chat/channels/:id/messages`, `/chat/channels/:id/messages/poll`,
`/support/:id/watchers`, `/build/:id/tickets/:id/watchers`. All eight added to `CONTRACTED_ROUTES`,
so the gate now also fails if one *loses* its contract or is read uncontracted through another seam.

### Making the contracts TRUE rather than merely satisfiable

Report 28d's caveat was exact: *the gate certifies that a call site passes a contract, not that the
contract is true.* A contract copied from the frontend's declared type would have passed happily on
all nine. So every field was read off the backend — the controller decorator, the service method,
the shape helper, the `columns:` constant and the Drizzle column's `.notNull()` — never off
`types/chat.ts`. Three consequences worth recording:

- **Three different person sub-objects ship from chat alone** and they are not interchangeable: the
  channel-list preview builds `{id,name,image}`, the members route selects `{id,name,image,email}`,
  the huddle host only `{id,name}`. A shared "user" schema loose enough to accept all of them
  catches nothing, so there are three.
- **`sender` is required-and-non-nullable while `sender.id` is nullable** — the inverse of every
  other person object in the file, because `senderFromIdentity` always returns the three-key object.
- **Enums rest on two measurements, not on the declared union**: every write goes through a Zod
  literal/enum DTO, and `scratch_perf_seed` (local, at head 665/665) holds only the declared values
  (`chat_channels.type` PUBLIC/GROUP, `role` MEMBER, `notification_preference` DEFAULT).

### `.strict()` — where, and where deliberately not

Rule 9 of the brief and the ticket both ask for `.strict()`. The default in `lib/api-envelope.ts` is
the opposite, for a stated reason, so this is not a blanket switch:

- **`.strict()` where the backend pins the key set** with an explicit `columns:` constant that its
  own spec asserts — channel members, channels, public channels, huddles, huddle participants, both
  watcher rows, message attachments. On a closed set an unexpected key is not a compatible addition,
  it *is* the drift: every defect put an EXTRA key on the wire (`membership`, `senderMembership`)
  beside the missing one. Required-and-nullable already rejects the missing half; `.strict()` names
  the extra half in the error.
- **NOT `.strict()` on the message row.** The timeline selects no `columns:` on `chat_messages`, so
  the row is "every column of the table" — a set that grows with a migration, not a projection
  somebody chose. Failing closed there would turn the next column addition into an outage on the
  busiest screen in the product. The identity fields are required, which is what bites.

### Proof: 38 frontend assertions, half of them BITE

`hooks/api/response-contracts-chat.test.ts` and `response-contracts-watchers.test.ts`. The ACCEPTS
half is the payload the services build; the BITE half is the payload that **actually shipped** —
the nested `membership.user`, the `columns: {}` huddle participant, the message with the identity
under `senderMembership`, the support row with `userMembershipId`, the build row whose `user` is an
`organization_members` row. A contract copied from the frontend type passes every test in the first
half and none in the second.

---

## 4. Two NEW live defects, found by writing the contracts

### #8 · `Channel.createdBy` is emitted by nothing — LATENT

`chat_channels` has **no `created_by` column**; only `created_by_membership_id`, which
`CHANNEL_LIST_COLUMNS` deliberately omits. `types/chat.ts` declared `createdBy: string` regardless.
No component reads it, so nothing showed. Removed rather than declared — declaring it would make the
contract satisfiable and false at the same time.

### #9 · Forwarding an attachment came back 400 — REAL, and it fails HARD

The timeline projected five attachment columns and not `file_url`.
`features/chat/forward-message-dialog.tsx:81` re-posts each attachment as
`{fileName, fileUrl, fileKey, fileSize, mimeType}`, and `sendMessageSchema.attachments` requires
`fileUrl: z.string()` (`dto/chat.schemas.ts:53`). **So forwarding any message carrying an attachment
posted `fileUrl: undefined` and came back 400** — "Failed to forward" through `getErrorMessage`.
`MessageAttachment` declared `fileUrl: string` all along; the cast made both sides compile.

Fixed by adding `fileUrl` to all four projections (list, poll, thread parent, thread replies), proved
by `chat-attachment-projection.spec.ts` asserting on the **query the service issues** — a projection
is decided by the request, so only the request can prove it. **Bite-proved: 3/3 RED against
`git archive HEAD src`, 3/3 green after.**

### Four more declared-but-false types, corrected as a by-product

`Message.senderId` (nullable — `ON DELETE SET NULL`), `Message.sender` (always an object, nullable
`id`), `MessagesPage.nextCursor` (`number | null`, never absent), `HuddleParticipant.userId` and
`Huddle.startedBy` (nullable since the flattener landed), `MessageAttachment` (six keys; `messageId`
and `createdAt` were never emitted). Following that nullability through the compiler surfaced
**eleven** genuinely null-unsafe sites, including `audioLevels[participant.userId]` indexing by
`null`, a WebRTC mesh that would dial `null`, a `key={participant.userId}` that was `undefined` for
an orphaned row, and two resolver signatures that forced every caller to lie.

---

## 5. The `drainChannelPages` blind spot — CLOSED

`hooks/api/chat-core-read.ts:47` builds its path from a parameter, so `/chat/channels` — the exact
call site the first defect shipped through — was invisible to every route rule in
`check:response-contracts` and `check:gated-reads`, and was frozen by name in an unresolvable list.

**Fixed.** `drainChannelPages` is a seam *function*, not a caller of one: it wraps `apiClient.get` in
a cursor loop and takes the path and (now) a contract. It is registered in `SEAM_FUNCTIONS` with the
contract at argument 2, so all three call sites — where the path IS a literal — now resolve, and
`/chat/channels`, `/chat/channels/archived` and `/chat/channels/public` are visible to every route
rule and carry contracts. The wrapper's own inner `apiClient.get(path, …)` is still unresolvable and
still counted as such, so the `UNRESOLVED_ROUTE_FILES` entry stays at 1 and cannot go stale.

The general rule is now written on the list: a wrapper that takes a path and a contract belongs in
`SEAM_FUNCTIONS`; one that hides the path in a module-local constant belongs in
`UNRESOLVED_ROUTE_FILES`. The other 14 entries were not audited against it.

---

## 6. Support ticket over-exposure — FIXED, and it is worse than payload weight

`assigneeMembership` / `creatorMembership` had no `columns:`, and a Drizzle relational read with no
`columns:` selects **every** column of the joined table. So each ticket carried all eleven columns of
its assignee's and its creator's `organization_members` row, on every ticket of every list page, to
anyone holding `support:tickets:view`.

**Checked what is in that row before deciding severity.** No tokens, secrets, salary or invitation
codes — those live in `users.totpSecret`, `accounts.*_token`, `invitations.tokenHash`, none of which
are joined here. What *is* exposed, ranked:

1. **`suspendedAt`, `leftAt`, `status` (`SUSPENDED`/`LEFT`)** — that a colleague was suspended, and
   when. HR information, to every ticket viewer. The highest-signal item in the set.
2. `invitedAt`, `activatedAt`, `joinedAt` — tenure and onboarding timeline.
3. `role`, `isOwner` — an org privilege map handed to every ticket viewer.
4. `id` (membership id) — an internal join key both watcher routes explicitly strip.

None of it is read: the service uses `assigneeMembership.user.id` and nothing else, and no component
in the ticket UI reads the membership at all. **Restricted to `{ id: true }` at all ten sites** (list,
detail, update, messages, SLA, macros). Proved by `support-ticket-membership-projection.spec.ts`
asserting on the query — **bite-proved 3/3 RED against `git archive HEAD src`, 3/3 green after.**

---

## 7. Gates — exact commands and exit codes, captured with `$?`

Heavy commands through `heavy.sh 2`. `${PIPESTATUS[0]}` does not work in this zsh and was not used.

| Command | Exit | Number |
|---|---|---|
| `pnpm -C streamlineos-backend typecheck` | **0** | 0 errors (trusting the exit code, not the output) |
| `pnpm -C streamlineos-backend check:spec-typecheck` | **0** | "spec-inclusive typecheck passed" |
| `pnpm -C frontend type-check` | **0** | 0 errors |
| `pnpm -s check:response-contracts` (frontend) | **0** | 69/2665 parsed, 2596 unparsed at baseline |
| `node scripts/check-response-contracts.mjs --self-test` | **0** | 12/12 |
| `pnpm -s check:relation-keys` (backend, NEW) | **0** | 111 keys / 539 sites, 15 unknown, 15 triaged |
| `pnpm -s check:relation-keys:self-test` (NEW) | **0** | **17/17** |
| `pnpm -s check:query-projections` | **0** | — |
| `pnpm -s check:db-call-count` | **0** | — |
| `pnpm -s check:type-assertions` | **0** | — |
| backend `jest --runInBand --testPathPattern="(modules/chat\|modules/support)"` | **0** | 83 suites, 718 tests, 718 pass |
| frontend `jest --maxWorkers=2 --testPathPattern="(features/chat\|features/support\|features/build\|hooks/api)"` | **0** | 89 suites, 919 tests, 919 pass |
| frontend `jest --runInBand --testPathPattern="response-contracts-(chat\|watchers)"` | **0** | 2 suites, **38 tests**, 38 pass |
| backend `jest --runInBand --testPathPattern="support-ticket-membership-projection"` | **0** | 3/3 |
| backend `jest --runInBand --testPathPattern="chat-attachment-projection"` | **0** | 3/3 |

**Red, and NOT mine — verified before moving on:**

- `pnpm -s check:over-300` — exit 1, "403 files exceed 300 lines, 9 above baseline of 394". Measured
  red **before** I edited any backend file. None of the listed files is mine; my new `.mjs` is not
  scanned by it and my new specs are 122 and 138 lines.
- `pnpm -s check:file-sizes` — exit 1, a stale registered line count on
  `chat-channel-members-implementation.ts` plus 5 unregistered files over 500. Also measured red
  before my edits; none is mine.
- `hooks/api/directory/workers.test.tsx` failed once mid-session on an `expectedVersion` assertion
  while another agent had `lib/api-client.ts` modified in the shared tree. It is **green** in the
  final run (89/89 suites). The file is unmodified by me and last touched in `3b8af64df`.

**NOT RUN, and not claimed:** lint (either repo), `next build`, e2e, any database-backed request. The
only database touched was `scratch_perf_seed` (local, at head), read-only, for two enum-distribution
queries and one attachment-column query.

---

## 8. Commits

| Repo | SHA | Contents |
|---|---|---|
| backend | `c192f74b` | `check-relation-key-reach.mjs` (new gate) + `package.json` + `ci.yml` (3 files) |
| backend | `1aad25c7` | support membership projection at 10 sites + projection spec + the two gate false-clear fixes (7 files) |
| backend | `3be5598f` | `file_url` in all four timeline projections + `chat-attachment-projection.spec.ts` (2 files) |
| frontend | `210d61f9` | chat/watcher contracts, `drainChannelPages` seam registration, `types/chat.ts` corrections, null-safety follow-through, 28 tests (12 files) |
| frontend | `9a9edf3c` | message-timeline contract, four type corrections, resolver-signature widening, 10 more tests (14 files) |

Every commit verified with `git show --stat`; each landed with exactly the files staged. HEAD moved
under me once (another agent's `0314ac4d`) with no interference.

---

## 9. Handed on — not fixed here

1. **291 identity-bearing routes remain uncontracted** (304 call sites, 184 files). The largest
   clusters are `hooks/api/hr` (91), `hooks/api/build` (36), `hooks/api/payroll` (22),
   `hooks/api/accounting` (13). Each needs the backend read path read before a contract is written;
   generating them from `contracts/openapi.json` is impossible — it carries 1–2 response schemas
   across 3,613 operations.
2. **The other 14 `UNRESOLVED_ROUTE_FILES` entries** were not audited against the new
   seam-function-vs-constant rule. Some are probably seam wrappers like `drainChannelPages` was.
3. **`GET /chat/presence/search`** still emits the pre-fix nested `senderMembership` and has no
   frontend caller. A deletion candidate; it is the one live exception recorded in the gate's
   baseline entry for that key.
4. **Three dead read paths** each one hook away from becoming instance #10 —
   `GET /hr/team-events` (`organizer`), `GET /build/time-entries/team` (`userMember`),
   `GET /billing/coupons` (`redemptions`). All carried in the gate's baseline with that reason.
5. **CRM (`csm`) and Inventory (`poster`, `currentLocation`)** — out of release scope, untriaged,
   carried in the baseline as such so they cannot be forgotten.
6. **`assigneeMembership` / `creatorMembership` are still declared as `assignee` / `creator` /
   `assigneeId` / `createdBy` on the client and read by nothing.** Latent: the first component to
   trust the type breaks. Flattening them is a support-module change nobody needs today.
