# Read-cost lane — per-request database work

**Opened:** 2026-09-20 · **Owner:** backend · **Follows:** `2026-09-19-tenant-connection-hold-prd.md`

Every authenticated request holds one of `DB_POOL_MAX` pooled connections for its whole life, so each avoidable statement is process-wide throughput, not just one caller's latency. This lane removes the N+1s, unbounded reads and duplicated counts the audit found in the most-changed modules.

Each task is executed by its own agent with **exclusive file ownership** — no two agents touch the same file. The coordinator verifies every finding against source, runs the checks, and only then ticks the box.

## Rules for this lane

- A projection may only drop a column proven unused by the response schema **and** every consumer. `applyContract` throws on a missing required field, so a wrong projection is a broken screen, not a slow one.
- No change to a list's page size, cursor shape or response shape. That is a frontend contract and belongs in its own lane.
- Every claim needs `file:line` evidence. An agent report is a lead until the coordinator confirms it.

---

## Todo

- [x] **T1 — e-sign summary report issues 9 serial reads**
  `sign-reports.service.ts:127-203` awaits nine independent queries one after another; the sibling `getDashboard` at `:41-115` already uses `Promise.all`.
  *Files touched:* `src/modules/e-sign/sign-reports.service.ts` (`getSummary`, :127-217)
  *Result:* **9 round trips → 2.** `getOrCreate` stays a separate first await because `expiringBefore` derives from it; the other eight reads are independent of each other and now run in one `Promise.all`.
  *Not done, with reason:* `byStatusRows` / `expiringSoonRow` / `avgTimeRow` each scan `sign_envelopes` for the same tenant and could in principle be one conditional-aggregate pass — left as three parallel reads because the three filter shapes (grouped, filtered count with a date bound, filtered avg over a computed expression) have no clean Drizzle surface, and a raw `sql` rewrite would change the shapes the return statement unpacks.
  *Verified:* coordinator read the diff — dependency order correct, no comment added, no cast, no `any`. `jest src/modules/e-sign` → **288 passed / 288**, 38 suites.

- [x] **T2 — e-sign list pays a second scan for its count**
  `sign-envelope-queries.service.ts:73-81` runs `findMany` and a separate `count()` over the same predicate.
  *Files touched:* `src/modules/e-sign/sign-envelope-queries.service.ts` (`list`, :73-126) · `src/modules/e-sign/__tests__/sign-envelope-queries-list.spec.ts` (new, 4 tests)
  *Result:* **2 round trips per page → 1**, via `count(*) OVER ()` matching `overdue.service.ts:176`. `windowTotal` is stripped before the response so the contract shape is unchanged; an empty page reports `total: 0` without a second query.
  *Not done, with reason:* `sign-envelope-lookup.ts` projection **skipped and the file left untouched** — every caller (`send`, `resend`, `reinviteCorrectedRecipient`, `reviveExpiredRecipients`, `applyRecipientOutcome`, `sendManualReminder`) passes the whole envelope into `deliverInvitations` / `emitEnvelopeEvent`, so no column could be proven unused. Correct call: guessing here would throw a contract error, not slow a page.
  *Verified:* coordinator confirmed no comment, no cast. `jest src/modules/e-sign` → **292 passed / 292**, 39 suites.

- [x] **T3 — chat channel search reads every membership row**
  `chat-search.service.ts:90-101` selects all of the caller's channel memberships with no limit, then inlines the whole id set into the next query. The sibling `chat-channel-list.service.ts:112` documents the exact fix: *"a member of 50,000 channels paid for 50,000 rows."*
  *Files touched:* `src/modules/chat/chat-search.service.ts` · `src/modules/chat/chat-channel-list.service.ts` (`listMemberChannelIds` gains an `includeArchived` option) · `src/modules/chat/chat-search.service.spec.ts` (new) · `src/modules/chat/__tests__/chat-read-path-hardening.spec.ts` (mock updated)
  *Result:* unbounded membership scan → the existing bounded read, capped at `MAX_CAPABILITY_CHANNELS + 1` (501). Reused rather than duplicated: `ChatSearchService` now injects `ChatChannelListService`; both are already providers of `ChatModule`, so no wiring change.
  *Coordinator correction:* the agent's first cut silently **narrowed** search — `listMemberChannelIds` filters `isArchived = false` but `searchChannels` never did, so an archived private channel the caller belongs to stopped being findable. Search is precisely how a person finds an archived channel. Fixed by adding `includeArchived` (default `false`, so the Ably token route is unchanged) and passing `true` from search. Pinned by *"still reaches an archived channel the caller belongs to, because search is how a person finds one"*.
  *Reported, not fixed:* `searchUsers:153-167` uses two leading-wildcard `ILIKE`s — needs a `pg_trgm` index and a migration.
  *Verified:* no comment, no cast. `jest src/modules/chat` → **633 passed / 633**, 60 suites.

- [x] **T4 — chat DM creation and thread open do avoidable work**
  `chat-channels.service.ts:101-116` reads every membership then loads each DIRECT channel with all its member rows to find one match. `chat-message-timeline.service.ts:188-208` awaits two independent reads in sequence.
  *Files touched:* `src/modules/chat/chat-channels.service.ts` (:101-136) · `src/modules/chat/chat-message-timeline.service.ts` (:203-212) · `src/modules/chat/__tests__/chat-channel-create-and-refresh-gates.spec.ts` · `src/modules/chat/chat-cursor-paging.spec.ts`
  *Result:* DM lookup goes from **O(creator's channels × their members) rows across 2 queries → at most 1 row from 1 query**, via a self-join on `chat_channel_members` with `limit(1)`. Thread open saves one sequential round trip.
  *Verified:* coordinator read the SQL. Self-DM semantics preserved — the old JS check (`members.length === 1 && members[0] === creator`) is now `NOT EXISTS (… membership_id != creator)`, so a two-member DM cannot be mistaken for a self-DM. `orgId` is asserted on the channel, on both member joins **and** inside the subquery. No comment, no cast. `jest src/modules/chat` → 632 passed at agent time; 633 after the T3 correction.

- [x] **T5 — timesheets counts and projections**
  `timesheets-audit.service.ts:191-215` issues a full-table count before a wide read. `approvals.service.ts:197-206` and `approvals-bulk.service.ts:51-60` use bare `select()` where the sibling `bulkApprove:136-152` projects correctly.
  *Files touched:* `src/modules/timesheets/core/timesheets-audit.service.ts` (:191-212) · `src/modules/timesheets/core/approvals.service.ts` (:197-206) · `src/modules/timesheets/core/approvals-bulk.service.ts` (:51-60) · `src/modules/timesheets/core/__tests__/audit-verify-truncation.spec.ts`
  *Result:* `verifyChain` **2 round trips → 1** via `count(*) OVER ()`; the `limit = 10_000` contract left alone deliberately. Projections derived from a full usage trace — `approveSinglePeriod` needs 6 columns, `rejectPeriod` needs 5 (`totalHours` is absent from the rejection notification, confirmed against `notifyPeriodRejected`).
  *Pre-existing failure, independently confirmed:* `timesheets-analytics-tenant-isolation.spec.ts › rejectPeriod` fails because that spec's mock returns `from()` without `leftJoin` while `readApprovedPeriod` calls it. **Coordinator reverted both service files to HEAD and re-ran — it still failed**, so it is not this task's regression.
  *Verified:* no comment, no cast. `jest src/modules/timesheets` → 490 passed / 491, the one failure being the pre-existing case above.

- [x] **T6 — billing marketplace reads every column**
  `marketplace.service.ts:19-38, 41-47, 80-90, 101-107` uses bare `select()`, and its single-row reads take element 0 of an unbounded result set.
  *Files touched:* `src/modules/billing/core/marketplace.service.ts` · `src/modules/billing/core/marketplace.service.spec.ts` (new, 3 tests)
  *Result:* **5 single-row reads gained `.limit(1)`** — previously the driver materialised the whole result set to take element 0. Single-row lookups now project only what they test (1-2 columns instead of 17 or 8).
  *Correctly kept whole:* the two list reads keep all 17 / all 8 columns — `marketplaceAppSchema` and `appInstallationSchema` require every one, so nothing was droppable. Reporting that is the right outcome; guessing would have thrown a contract error on a billing screen.
  *Verified:* no comment, no cast, 5 × `limit(1)` present. `jest src/modules/billing/core` → **928 passed / 928**, 68 suites.

---

## Not in this lane

| Item | Why |
|---|---|
| `projects-work-query.service.ts` unbounded count, `work-scope-union.ts` | Both files are being edited by a concurrent session (`streamlineos-a5` / `f9`). Reserved, not abandoned. |
| `projects-members.service.ts` `limit(500)`, `projects-labels.service.ts` `limit(300)` | Capping these changes a list's contract; needs a cursor and frontend work. |
| `org-membership-read.service.ts` keyset on `coalesce(name, email)`, leading-wildcard `ILIKE` | Needs an expression index and a migration measured against a real database. |
| `calendar-event-source.loader.ts` indexed `OR` + semi-join | Measured and annotated by its author; buffer counts recorded in the file. |

## Verification log

**Integration, after all six lanes merged:**

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.test.json` | **0 errors in any lane file.** 66 pre-existing errors remain in 11 files owned by concurrent sessions. |
| `jest` across `e-sign`, `chat`, `timesheets`, `billing/core` | **2,343 passed / 2,344**, 226 suites |
| Only failure | `timesheets-analytics-tenant-isolation.spec.ts › rejectPeriod` — pre-existing, proven by reverting both service files to HEAD and re-running |
| Comments added across all six diffs | **zero** |
| Casts / `any` / `@ts-ignore` added | **zero** |

**Two defects the coordinator caught in agent output — neither would have been visible from the agents' own green test runs:**

1. **A silent behaviour narrowing (T3).** Reusing `listMemberChannelIds` also inherited its `isArchived = false` filter, which `searchChannels` never had. An archived private channel the caller belongs to stopped being findable — and search is exactly how a person finds one. Fixed by adding an `includeArchived` option defaulting to `false`, so the Ably token route keeps its old behaviour.

2. **A constructor arity break (T3).** Adding `ChatChannelListService` as a third constructor parameter broke four `new ChatSearchService(...)` call sites in two **unmodified** specs. Every chat jest run stayed green because ts-jest does not fail on type errors — only the typecheck sees arity. Fixed in `chat-entity-access-revocation.spec.ts` and `chat-services-tenant-isolation.spec.ts`.

**Aggregate round-trip reduction on the paths touched:** e-sign summary 9 → 2, e-sign list 2 → 1 per page, timesheets `verifyChain` 2 → 1, chat DM lookup 2 queries over O(channels × members) rows → 1 query returning at most 1 row, chat thread open one round trip saved, chat channel search unbounded → capped at 501, marketplace 5 single-row reads no longer materialise a full result set.

**Not certified:** none of this was exercised against a live database. No disposable environment was available and production credentials were not loaded to make a check pass. Every change is verified by typecheck, unit test and source review only.
