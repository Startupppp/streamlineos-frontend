# 05 — Scrolled lists page by cursor

**What to build:** Scrolling chat, notifications, activity feeds, ticket lists and the inbox shows every row exactly once, even while new rows arrive above the reader. Today offset pagination shifts everything down when a row is inserted, so the next page repeats or skips records — a correctness problem, not just a slow one.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The named scrolled, concurrently-written surfaces use the existing keyset helper.
- [ ] Paging a list while inserting rows above the cursor yields every original row exactly once — no duplicates, no gaps.
- [ ] The same test against the offset implementation fails, demonstrating what the change fixes.
- [ ] A malformed or stale cursor returns the first page rather than an error.
- [ ] Cursors encode position only — no tenant, no permission, no filter state.
- [ ] The remaining offset endpoints are untouched and keep their page cap.

## Todo

- [ ] Name the endpoints explicitly in the branch description — do not open-endedly migrate pagination
- [ ] Reuse the existing helper; do not re-derive the cursor format
- [ ] Write the concurrent-insert test first
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
