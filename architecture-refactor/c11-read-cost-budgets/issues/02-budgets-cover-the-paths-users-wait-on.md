# 02 — Budgets cover the paths users wait on

**What to build:** The forty or so reads that carry the product — the ones a user waits for, over tables that grow with the tenant — each have a declared ceiling. Slowness on any of them becomes a build failure rather than a support ticket.

**Blocked by:** 01 — A read budget is data, not a script

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every budgeted query is a read on a path a user waits for, over a tenant-growing table.
- [ ] The budgeted set is named explicitly rather than described as a category.
- [ ] Seed adequacy is asserted — below a stated row count the run fails with 'seed too small' rather than reporting success.
- [ ] Global search, the ticket board, notifications, chat history and the busiest finance lists are all covered.
- [ ] Ceilings are set to catch a plan falling off an index, not ordinary variance.

## Todo

- [ ] List the candidate reads and cut to the ones with a waiting user
- [ ] Seed to scale before measuring
- [ ] VACUUM ANALYZE after seeding — a rewrite empties the visibility map and an Index Only Scan silently degrades
- [ ] Record what was left unbudgeted and why
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c11 — Make "this query is fast" a thing CI proves`](../prd.md) · Candidate index: [`../README.md`](../README.md)
