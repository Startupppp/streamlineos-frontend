# 01 — A ticket opens by its key

**What to build:** Following a link to any ticket opens that ticket — including one that is not in the project's first hundred. Today the page resolves a ticket key to an id by downloading the board's first hundred tickets and searching the array, so deep links, notification links and shared URLs to older tickets fail silently.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] A ticket key resolves server-side to its ticket, whatever its position in the project.
- [x] A ticket beyond the first hundred opens — `backend/src/modules/build/core/ticket-by-key.spec.ts` asserts `findFirst` is called exactly once and `findMany` is never called for ticketNumbers 101 and 250; `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts` inserts 101 tickets and asserts ticket #101 returns 200 (runs under `pnpm test:e2e`)
- [x] An unknown key returns not-found.
- [x] A ticket in another organisation returns not-found, never a status that confirms it exists.
- [x] The by-key read allows and denies exactly as the by-id read does, across the same actor matrix.
- [x] The detail page no longer fetches the board to resolve an id.

## Todo

- [x] Add the by-key read authorized identically to the existing ticket read
- [x] Remove the board-array resolution from the detail page
- [x] Controller e2e for the allow/deny matrix — `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts`: owner→200, member without permission→403, unknown key→404, unauthenticated→401; runs under `pnpm test:e2e` only
- [ ] Verify a deep link to an old ticket in a booted app — **BLOCKED:** requires a booted app against real data
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

**Audit note (2026-08-26):** The backend implementation is confirmed complete. `GET :projectId/tickets/key/:ticketNumber` exists at `backend/src/modules/build/core/projects-tickets.controller.ts:151`; the service method at `projects-tickets-read.service.ts:384` queries directly by `(orgId, projectId, ticketNumber)` — no board-array resolution, any position works. Cross-tenant requests return not-found because `orgId` is in the `WHERE` clause and `ProjectsTicketNotFoundException` fires on null. Authorization path is identical to `getTicket` (same `resolveTicketsScope` check). Two genuinely open items remain: the regression test (`A ticket beyond the first hundred opens`) and the controller e2e matrix — neither exists in any spec under `build/core/`. The `Verify deep link` todo is BLOCKED on a booted app.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
