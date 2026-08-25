# 03 — A list total costs no extra round trip

**What to build:** A list page that shows a total renders after one round trip instead of two. Today 241 count queries run as a separate sequential await after the page query.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Where a total is displayed, it comes from a window in the page query rather than a second statement.
- [ ] Where no total is displayed, none is computed — the over-fetch sentinel answers whether more exists.
- [ ] Totals are unchanged in value.
- [ ] The busiest lists are converted; the rest are recorded as remaining.

## Todo

- [ ] Start with the lists behind the read budgets
- [ ] Use the window form the read-cost baseline already proves
- [ ] Leave counts that already run in parallel alone unless a total is unused
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
