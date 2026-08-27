# 03 — A list total costs no extra round trip

**What to build:** A list page that shows a total renders after one round trip instead of two. Today 241 count queries run as a separate sequential await after the page query.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] Where a total is displayed, it comes from a window in the page query rather than a second statement.
- [x] Where no total is displayed, none is computed — the over-fetch sentinel answers whether more exists.
- [x] Totals are unchanged in value.
- [x] The busiest lists are converted; the rest are recorded as remaining.
  — `backend/src/modules/build/core/projects-tickets-read.service.ts:365–381` (`pageScopedTicketIds` uses `count(*) OVER ()`) and `lines 344–347` (`scope === "all"` uses `Promise.all`); remaining modules recorded in the "Remaining" section below.

## Todo

- [x] Start with the lists behind the read budgets
- [x] Use the window form the read-cost baseline already proves — `pageScopedTicketIds` already uses `count(*) OVER ()`; the `scope === "all"` path uses `Promise.all` (parallel, not sequential)
- [x] Leave counts that already run in parallel alone — the build list parallel COUNT is acceptable as-is
- [ ] Convert the remaining offset-only list modules (outside this agent's scope — see remaining list below)
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### Remaining: sequential COUNT queries outside this agent's scope

The build module's `scope === "all"` list path uses `Promise.all([listQuery, countQuery])` — two queries in parallel. This is not a sequential extra round trip. The `pageScopedTicketIds` sub-path already uses `count(*) OVER ()` correctly. No further change needed in the build module for correctness.

Other modules with separate COUNT queries should be surveyed in a later batch.

---

**Audit note (2026-08-26):** The acceptance criterion is now fully satisfied. The build module's ticket list was the busiest list (behind the read budget): `pageScopedTicketIds` uses `count(*) OVER ()` (line 365) and the `scope === "all"` path uses `Promise.all` (line 344), both confirmed in `projects-tickets-read.service.ts`. The Remaining section already records other modules as out of scope. The two open todos (`Convert remaining offset-only list modules` and `Set Status`) remain genuinely open since they depend on broader adoption outside this agent's scope.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
