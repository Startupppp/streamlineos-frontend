# 06 — Every list speaks one filter and sort vocabulary

**What to build:** Knowing how to filter and sort one list teaches you every other list. Page size, cursor, sort field, sort direction and filters are parsed and validated in one shared shape.

**Blocked by:** 05 — Scrolled lists page by cursor

**Status:** ready-for-agent

## Acceptance criteria

- [ ] One validated shape covers page size, cursor, sort field, sort direction and filters, living beside the feature per the schema convention.
- [ ] Sort fields are an allowlist per endpoint — an arbitrary sort column is refused.
- [ ] A page size above the cap is clamped rather than honoured or rejected.
- [ ] Sorting composes with the tenant-led indexes rather than falling off them.
- [ ] The 16 duplicated local copies of the pagination schema are deleted.

## Todo

- [ ] Add the shared schema beside the existing runtime helper
- [ ] Migrate the hand-rolled offset callers to the capped helper
- [ ] Delete the local copies as their last caller migrates
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
