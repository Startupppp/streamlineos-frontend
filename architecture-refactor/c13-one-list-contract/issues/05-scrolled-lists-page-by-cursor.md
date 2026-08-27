# 05 — Scrolled lists page by cursor

**What to build:** Scrolling chat, notifications, activity feeds, ticket lists and the inbox shows every row exactly once, even while new rows arrive above the reader. This is not only an offset-pagination risk: chat currently pops the `limit + 1` sentinel and returns that removed row as an exclusive cursor, permanently skipping it, while multi-account mail advances every provider cursor after returning only a globally sliced subset.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] The named scrolled, concurrently-written surfaces use the existing keyset helper. — **All five now do.** Chat's three: `chat-messages.service.ts:109` (`list`), `:401` (`listThreadReplies`) and `chat-saved.service.ts:39` all call `buildIdCursorPage` from `backend/src/common/pagination/cursor.ts:112`, which is the shared trim-the-sentinel/derive-the-cursor algorithm extracted out of `buildCursorPage` (`cursor.ts:79`), where the shared step is `trimSentinel` (`cursor.ts:73`) so both forms have one implementation. **The helper is `cursor.ts`, not `keyset.ts`** — see the design note below. The inbox: `mail.service.ts`. **The activity feed, verified 2026-08-27 and not previously recorded here:** `backend/src/modules/build/core/projects-ticket-subresources.service.ts:183` (`getActivity`) already returns `buildCursorPage`, and its query schema is `baseListQuerySchema.omit({ page, sortDir })` (`build/core/dto/ticket.schemas.ts:131`), so it is on both halves of the contract.
  **Both remaining surfaces are now converted, so all five named surfaces use the helper.**

  **Notifications** — `broadcasts.service.ts:68` now orders by `desc(broadcasts.id)` and returns `buildIdCursorPage`. It carried a defect worse than the duplication: the cursor bounded `id` while the `ORDER BY` was `created_at`, two different orders, so **any row whose id was lower than the page's last row was skipped permanently**. Pinned by `backend/src/modules/notifications/broadcasts-cursor-paging.spec.ts` (4 tests), whose first assertion reads the compiled `ORDER BY` back out and fails if it stops matching the cursor column.

  **The Build ticket list** — `projects-tickets-read.service.ts` `listTicketsByCursor()` pages a keyset on `(rank, id)` via `decodeCursor` + `keysetAfterValue` + `buildCursorPage`, opted into by `paging=cursor`. `frontend/hooks/api/build/ticket-queries.ts:37` sends it. Covered by `backend/src/modules/build/core/board-cursor-paging.spec.ts`, 6 tests, including the offset comparison on the same data.
- [x] Paging a list while inserting rows above the cursor yields every original row exactly once — no duplicates, no gaps. — `backend/src/modules/chat/chat-cursor-paging.spec.ts`, `shows every original row exactly once while rows arrive above the cursor`: pages a 30-row channel at limit 10 while inserting two rows above the reader on every read, and asserts zero duplicates and that every original id is present.
- [x] Chat messages, thread replies and saved messages sort and cursor on the same stable tuple; the sentinel row is the first row of the next page, not a skipped row. — now pinned rather than only implemented: `chat-cursor-paging.spec.ts` `returns the sentinel row on the next page rather than skipping it`, and the unit assertion `cursor.spec.ts` `derives the next cursor from the last row it keeps, not the sentinel`.
- [x] A two-account inbox page never advances past provider rows that were fetched but not returned; its server-authenticated composite cursor preserves each account's partially consumed page. — `backend/src/modules/mail/mail-inbox-paging.spec.ts` `never advances past rows it fetched but did not return` and `resumes inside a partially consumed Gmail page by over-fetching the skip`. **The composite cursor is now genuinely server-authenticated** — see the integrity item below; before this it was plain base64.
- [x] Boundary tests include tied timestamps, a full `limit + 1` page, concurrent inserts, and alternating messages from two providers. — `chat-cursor-paging.spec.ts`: `pages correctly when every row shares a timestamp` (25 rows, one `createdAt`), `returns the sentinel row on the next page rather than skipping it` (exactly `limit + 1`), `shows every original row exactly once while rows arrive above the cursor`. `mail-inbox-paging.spec.ts`: `returns every message from both providers exactly once`, over Gmail and Outlook mailboxes interleaved a minute apart so every page straddles both.
- [x] The same test against the offset implementation fails, demonstrating what the change fixes. — `chat-cursor-paging.spec.ts`, describe `what offset does on the same data`: the same 30 rows and the same two-inserts-per-read schedule, paged by `OFFSET`, produce both duplicates and skipped rows; the companion test shows offset is fine when nothing is written during the walk, so the failure is attributable to concurrency and not to the harness.
- [x] A malformed or stale cursor returns the first page rather than an error. — **Re-verified at source 2026-08-27, because the session brief still reported this as open at `chat.schemas.ts:98`: it is not.** `backend/src/modules/chat/dto/chat.schemas.ts:100` reads `cursor: idCursorSchema`; the `z.coerce.number().int().positive()` that returned 400 is gone. `backend/src/common/pagination/cursor.schema.ts` `idCursorSchema`. `backend/src/common/pagination/cursor.schema.spec.ts` covers twelve malformed forms (hand-edited string, empty, zero, negative, fraction, null, boolean, object, array, `Infinity`, `NaN`) and asserts none of them throws; `chat-cursor-paging.spec.ts` `treats a cursor past the newest row as the first page` covers the stale-but-well-formed case end to end.
- [x] Cursors encode position only — no tenant, no permission, no filter state.
- [x] The remaining offset endpoints are untouched and keep their page cap. — no offset endpoint was converted to cursor by this ticket. Stated plainly so the tick can be checked: twenty-three DTOs *were* edited, but by c13-06 and only to replace a duplicated inline page-size block with the shared field. Every one still carries a cap and **no ceiling widened** — `campaignListSchema` keeps 50 via `pageSizeField(20, 50)`, `searchTicketsQuerySchema` keeps 20, mail keeps 50, global search keeps 10, none rising to the platform 100. What changed is the answer to an over-large page: 400 became a clamped page, which is this contract's own rule.

### Design decision — a malformed chat cursor returns the first page, it does not 400

`chat.schemas.ts` used `z.coerce.number().int().positive().optional()`, so `?cursor=abc`, `?cursor=0` and `?cursor=-5` all returned 400. Resolved in favour of the first page, implemented in `common/pagination/cursor.schema.ts`. The reasoning, since the ticket asked for it:

- **Nothing unsafe can be expressed by corrupting it.** The cursor carries position and nothing else — no tenant, no permission, no filter — which is a criterion of this very ticket. Tenancy comes from the session on every request. The worst a junk cursor can produce is the newest page, so rejecting it buys no safety.
- **The repo had already decided this.** `common/pagination/cursor.ts:30` says it in as many words: "a stale or hand-edited cursor is a client problem, and the useful response is the first page, not a 500". Two cursor implementations answering identical malformed input differently *is* the per-endpoint pagination decision c13 exists to end.
- **The 400 punished the user for the client's mistake** — a shared chat deep link, or a cursor a client persisted across a deploy, hard-failed instead of showing the newest messages.
- **The cost is real and accepted:** a client bug that mints bad cursors now silently re-serves page one instead of erroring. That trade was already made for every opaque-cursor endpoint here, and the same argument applies unchanged.

### Design decision — the Build ticket list pages by cursor, and what it cost to be sure

Recorded because this was first declined and then done, and the reversal is the useful part.

**The surface is real.** `useProjectBoardTickets` (`frontend/hooks/api/build/ticket-queries.ts:37`) is a `useInfiniteQuery` that walked `GET /build/:projectId/tickets` by **page number**, auto-loading up to 500 rows into one flattened array. That is exactly the scrolled-and-concurrently-written shape this ticket exists for: a ticket created while the board loads shifts every row down, so the array gets a duplicate and a gap. It is also the only paging consumer of that endpoint — `useTickets` never sends a page.

**It was declined once, for reasons that turned out to be soft.** The first pass argued that no database was reachable to measure against, that four sessions shared the checkout, and that converting closed no box because `notifications` was in another lane. The first reason dissolved when the `streamline_app` credential was repaired and the branch turned out to hold 200,002 tickets; the third dissolved when `notifications` was converted too. Only the shared checkout was ever a real constraint, and it argues for a small additive change, not for none.

**What shipped is additive.** `paging=cursor` opts in; without it the response is byte-for-byte the old `{ data, total, page, limit, totalPages }`. Cursor mode keysets on `(rank, id)` — the order the board already renders in, and a total order because `id` is unique. `keyset.ts` could not serve it: that helper coerces its sort value to a `Date`, and `rank` is a lexorank string, so `keysetAfterValue` was added beside it for a sort column that is already text.

**The total rides the first page only.** A cursor page already knows whether more exists, so re-counting on every page would be paying for the thing the sentinel makes free. The board reads `pages[0].total`, which is what it did before.

**Verified against the real branch, not only in a double:** 20 pages × 25 rows = 500 tickets, **zero duplicates**; page 2 carries no total; a malformed cursor returns the first page rather than a 400; and the page-numbered path still answers `total: 3335` with its original keys.

### Design decision — the helper is `cursor.ts`, not `keyset.ts`

The audit note asked whether the keyset helper is actually required. It is not, and using it would be worse. `keyset.ts` exists for a `(timestamp, id)` tuple because "a timestamp alone is not a total order" (`keyset.ts:4-23`). `chat_messages.id` is a monotonic identity primary key and already a total order, so a tuple bound would add a column to the predicate and to any index it needs, for no ordering gain. What chat was actually duplicating was the *sentinel* step — over-fetch `limit + 1`, trim, take the cursor from the last row kept — which lived only inside `buildCursorPage`. That step is now `trimSentinel` in `cursor.ts`, shared by `buildCursorPage` and the new `buildIdCursorPage`, so the bug this ticket was raised for cannot return one call site at a time.

## Todo

- [x] Repair the chat/thread sentinel algorithm before broad migration; it loses one row per full page today — FIXED in `chat-messages.service.ts` `listMessages` and `listThreadReplies`, and `chat-saved.service.ts`; all three now delegate the step to `buildIdCursorPage` rather than repeating it
- [x] Fix multi-account inbox cursor — `mail.service.ts` now computes per-account consumed counts; Gmail partial pages use `{ token, skip }` cursor shape; Outlook uses `prevSkip + consumed`; `PartialGmailCursor` type exported from `mail-normalizers.ts`
- [x] Keep provider cursors opaque and integrity-protected; clients must not be able to substitute another account cursor — `mail-normalizers.ts:375-427`: the cursor is now `m1.<body>.<hmac>`, signed with a key namespaced off `ENCRYPTION_KEY` (`createHmac(...).update("mail:cursor")`), following the shape `modules/crm/consent/unsubscribe-token.util.ts` already uses. The reader's id is inside the signed body, so a cursor cannot be edited, and one minted for another user is refused. Verification failure returns `{}` — the first page — rather than throwing. Covered by `backend/src/modules/mail/providers/mail-normalizers.spec.ts` (`refuses a cursor whose account map was edited`, `refuses another reader's cursor`, `refuses an unsigned cursor, so the old wire format cannot be replayed`) and end to end by `mail-inbox-paging.spec.ts` (`ignores a cursor minted for another reader`).
- [x] Write the concurrent-insert test first — done for the work in this lane, and it paid: `mail-inbox-paging.spec.ts` was written before the mail fix below and is what found it. The chat sentinel repair predated this lane, so for chat the test is a regression pin rather than a driver; that is stated rather than glossed.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### Defect found by the new tests — an exhausted mail account replayed its whole mailbox

`returns every message from both providers exactly once` failed on first run with all twelve Outlook messages duplicated. Cause: an account that had run out was marked done by writing `undefined` into the cursor map, and `JSON.stringify` **drops an `undefined` value**, so the map went over the wire without that account. The next request read it back as "no position yet" and restarted that mailbox from row zero — every message it had already returned came back, on every subsequent page, for as long as any other account still had rows.

Fixed by giving exhausted its own value: `AccountCursorValue` now includes `null` (`mail-normalizers.ts:342-349`), `mail.service.ts:135-138` carries `null` forward unchanged, `:142` and `:148` write `null` rather than `undefined`, and `:182` short-circuits the provider call for an exhausted account, which also removes a round trip whose only possible answer was rows already returned. Pinned by `mail-inbox-paging.spec.ts` `keeps an exhausted account exhausted across the wire`.

This is a second, distinct defect from the partially-consumed-page one the ticket already recorded, and it was not visible by reading the code — the two-account walk had to run to the point where one mailbox ran dry.

### Every tick above was executed, not read (2026-08-27)

The standing "never run tests" rule was lifted for this session, so the specs behind each tick were run rather than inspected. All pass:

| Spec | Tests |
|---|---|
| `backend/src/modules/chat/chat-cursor-paging.spec.ts` | 9 |
| `backend/src/modules/mail/mail-inbox-paging.spec.ts` | 7 |
| `backend/src/modules/mail/providers/mail-normalizers.spec.ts` | 21 |
| `backend/src/common/pagination/cursor.spec.ts` | 20 |
| `backend/src/common/pagination/cursor.schema.spec.ts` | 16 |

73 tests, 73 pass, 0 fail.

---

**Audit note (2026-08-26):** Two ticked items are confirmed in source. Chat sentinel fix: `chat-messages.service.ts:110` pops the extra row from `messages` BEFORE setting `nextCursor = messages[messages.length - 1]?.id` (line 111), so the cursor points to the last row returned, not the discarded sentinel. Multi-account inbox: `PartialGmailCursor` is defined at `mail/providers/mail-normalizers.ts:336` and used in `mail.service.ts:133–150` with per-account consumed counts. Open code defect found (not fixed): `chat/dto/chat.schemas.ts:98` uses `.positive()` validation, so a malformed cursor string returns 400 instead of the first page — violates the "malformed cursor returns first page" criterion. The "named surfaces use the existing keyset helper" criterion is also genuinely open: `chat-messages.service.ts` and `notifications/broadcasts.service.ts` implement inline `lt(id, cursor)` logic rather than calling `common/pagination/keyset.ts`; however, the keyset helper is designed for `(timestamp, id)` composites and id-only cursors are a valid total order, so an agent implementing this should confirm whether the helper is actually required or whether the criterion should be narrowed. Provider cursor integrity protection (HMAC/signing) does not exist in the mail module.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
