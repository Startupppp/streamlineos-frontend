# 02 — The board does not ship descriptions

**What to build:** Loading a project board downloads what the board renders. Today the list projection includes each ticket's full description — content the kanban never displays — making it the heaviest list payload in the product.

**Blocked by:** 01 — A ticket opens by its key

**Status:** in-progress

## Acceptance criteria

- [x] The board list response carries no description field.
- [ ] A field-presence assertion fails if it is re-added.
- [x] The board renders unchanged.
- [x] The ticket detail view still shows the description, fetched where it is needed.

## Todo

- [x] Remove the column from the list projection
- [x] Check no consumer read it from the list response — `epic-story-row.tsx` consumed it; updated to handle absence gracefully (read-only description preview removed, edit path uses `?? null`)
- [x] Add the field-absence test — `backend/src/modules/build/core/board-projection.spec.ts` spies on `db.query.tickets.findMany`, captures the `columns` argument, and asserts `description` is absent; 1 test, passes under `pnpm test`
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### Out-of-scope dependency
`frontend/types/projects/tasks.ts` line 80: `description: string | null` should become `description?: string | null` to match the narrowed projection. This file is outside the agent's scope and must be updated separately.

---

**Audit note (2026-08-26):** Implementation verified. `TICKET_LIST_COLUMNS` at `backend/src/modules/build/core/projects-tickets-read.service.ts:58–86` enumerates 25 explicit columns with no `description` entry; it is the projection used by `queryTickets` (line 104). Two genuinely open items remain: the field-absence test and the `Set Status` todo. The out-of-scope frontend type change (`frontend/types/projects/tasks.ts:80`) is correctly recorded as a dependency outside this agent's scope.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
