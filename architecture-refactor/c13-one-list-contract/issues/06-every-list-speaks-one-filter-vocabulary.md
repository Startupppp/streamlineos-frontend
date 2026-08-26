# 06 — Every list speaks one filter and sort vocabulary

**What to build:** Knowing how to filter and sort one list teaches you every other list. Page size, cursor, sort field, sort direction and filters are parsed and validated in one shared shape.

**Blocked by:** 05 — Scrolled lists page by cursor

**Status:** in-progress

## Acceptance criteria

- [x] One validated shape covers page size, cursor, sort field, sort direction and filters, living beside the feature per the schema convention.
- [x] Sort fields are an allowlist per endpoint — an arbitrary sort column is refused.
- [x] A page size above the cap is clamped rather than honoured or rejected.
- [ ] Sorting composes with the tenant-led indexes rather than falling off them.
- [ ] The 16 duplicated local copies of the pagination schema are deleted.

## Todo

- [x] Add the shared schema beside the existing runtime helper — `backend/src/common/pagination/list-query.schema.ts` exports `baseListQuerySchema` and `withSortField(allowlist)` factory; page size is clamped, not rejected
- [ ] Migrate the hand-rolled offset callers to the capped helper — the build module's `ticketsListQuerySchema` is a priority; remaining 15 copies are in other modules outside this agent's scope
- [ ] Delete the local copies as their last caller migrates
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### Remaining local copies outside this agent's scope

The build module's `ticket.schemas.ts` still has its own `page` + `limit` block. The 15 other copies are in modules outside this agent's scope and should be migrated in a subsequent pass.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
