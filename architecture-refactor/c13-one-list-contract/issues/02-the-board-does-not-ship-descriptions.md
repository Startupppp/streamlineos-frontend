# 02 — The board does not ship descriptions

**What to build:** Loading a project board downloads what the board renders. Today the list projection includes each ticket's full description — content the kanban never displays — making it the heaviest list payload in the product.

**Blocked by:** 01 — A ticket opens by its key

**Status:** done

## Acceptance criteria

- [x] The board list response carries no description field.
- [x] A field-presence assertion fails if it is re-added. — `backend/src/modules/build/core/board-projection.spec.ts:22`. It spies on `db.query.tickets.findMany`, captures the `columns` argument `listTickets` actually passes, and asserts `columns["description"]` is `undefined`; adding `description: true` back to `TICKET_LIST_COLUMNS` fails it. 1 test, passes under `pnpm test` (verified this run alongside `ticket-by-key.spec.ts` — 5 suites, 29 tests, all pass).
- [x] The board renders unchanged.
- [x] The ticket detail view still shows the description, fetched where it is needed.

## Todo

- [x] Remove the column from the list projection
- [x] Check no consumer read it from the list response — `epic-story-row.tsx` consumed it; updated to handle absence gracefully (read-only description preview removed, edit path uses `?? null`)
- [x] Add the field-absence test — `backend/src/modules/build/core/board-projection.spec.ts` spies on `db.query.tickets.findMany`, captures the `columns` argument, and asserts `description` is absent; 1 test, passes under `pnpm test`
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### Out-of-scope dependency
`frontend/types/projects/tasks.ts` line 80: `description: string | null` should become `description?: string | null` to match the narrowed projection. This file is outside the agent's scope and must be updated separately.

**Lane 3 (2026-08-26):** still open, still out of territory — the frontend lane owns that file. Recorded for the orchestrator in `architecture-refactor/lane-requests/lane-3.md` §5. It is a type-level drift, not a runtime break: the field is absent from the list response either way, and the type merely fails to say so. Kept out of the acceptance criteria rather than blocking them.

---

**Audit note (2026-08-26):** Implementation verified. `TICKET_LIST_COLUMNS` at `backend/src/modules/build/core/projects-tickets-read.service.ts:58–86` enumerates 25 explicit columns with no `description` entry; it is the projection used by `queryTickets` (line 104). Two genuinely open items remain: the field-absence test and the `Set Status` todo. The out-of-scope frontend type change (`frontend/types/projects/tasks.ts:80`) is correctly recorded as a dependency outside this agent's scope.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
