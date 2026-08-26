# 05 — Scrolled lists page by cursor

**What to build:** Scrolling chat, notifications, activity feeds, ticket lists and the inbox shows every row exactly once, even while new rows arrive above the reader. This is not only an offset-pagination risk: chat currently pops the `limit + 1` sentinel and returns that removed row as an exclusive cursor, permanently skipping it, while multi-account mail advances every provider cursor after returning only a globally sliced subset.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [ ] The named scrolled, concurrently-written surfaces use the existing keyset helper.
- [ ] Paging a list while inserting rows above the cursor yields every original row exactly once — no duplicates, no gaps.
- [x] Chat messages, thread replies and saved messages sort and cursor on the same stable tuple; the sentinel row is the first row of the next page, not a skipped row.
- [x] A two-account inbox page never advances past provider rows that were fetched but not returned; its server-authenticated composite cursor preserves each account's partially consumed page.
- [ ] Boundary tests include tied timestamps, a full `limit + 1` page, concurrent inserts, and alternating messages from two providers.
- [ ] The same test against the offset implementation fails, demonstrating what the change fixes.
- [ ] A malformed or stale cursor returns the first page rather than an error.
- [x] Cursors encode position only — no tenant, no permission, no filter state.
- [ ] The remaining offset endpoints are untouched and keep their page cap.

## Todo

- [x] Repair the chat/thread sentinel algorithm before broad migration; it loses one row per full page today — FIXED in `chat-messages.service.ts` `listMessages` and `listThreadReplies`, and `chat-saved.service.ts`
- [x] Fix multi-account inbox cursor — `mail.service.ts` now computes per-account consumed counts; Gmail partial pages use `{ token, skip }` cursor shape; Outlook uses `prevSkip + consumed`; `PartialGmailCursor` type exported from `mail-normalizers.ts`
- [ ] Keep provider cursors opaque and integrity-protected; clients must not be able to substitute another account cursor
- [ ] Write the concurrent-insert test first
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
