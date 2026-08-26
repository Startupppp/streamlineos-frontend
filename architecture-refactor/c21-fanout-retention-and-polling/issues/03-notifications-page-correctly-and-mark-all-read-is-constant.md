# 03 — Notifications page correctly, and mark-all-read is constant work

**What to build:** Marking everything read is instant however many notifications you have, and scrolling the list shows each item once. Today unread is a per-row boolean so a bulk action is a bulk write, and the list pages by id while ordering by creation time — two orderings that disagree at page boundaries.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] Unread uses a watermark, matching chat, using the existing monotonic id.
- [x] Mark-all-read does not scale its write count with notification count.
- [x] The unread count is correct without scanning every row.
- [x] Paging and ordering use the same column — with rows sharing a timestamp, no duplicates and no gaps across boundaries.
- [x] The chat unread index includes the tenant column, so the planner can use it under row-level security.

## Todo

- [x] Adopt the chat watermark model rather than inventing a second
- [x] Test at a page boundary with tied timestamps; a single-page test passes today
- [x] Add the tenant column to the index — without it the index exists and does nothing
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Implementation notes

All backend logic was already correct — migration 0476 applied the watermark table, O(1)
`markAllRead` (via `max(id)` + upsert), `id`-ordered pagination with `lt(id, cursor)`, and the
`org_id`-prefixed chat unread index. Added
`notifications-pagination-boundary.spec.ts` to prove id-cursor paging produces no duplicates
or gaps even when `created_at` timestamps are tied.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
