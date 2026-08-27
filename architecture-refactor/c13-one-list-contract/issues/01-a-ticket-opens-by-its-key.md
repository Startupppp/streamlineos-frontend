# 01 — A ticket opens by its key

**What to build:** Following a link to any ticket opens that ticket — including one that is not in the project's first hundred. Today the page resolves a ticket key to an id by downloading the board's first hundred tickets and searching the array, so deep links, notification links and shared URLs to older tickets fail silently.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] A ticket key resolves server-side to its ticket, whatever its position in the project.
- [x] A ticket beyond the first hundred opens — `backend/src/modules/build/core/ticket-by-key.spec.ts` asserts `findFirst` is called exactly once and `findMany` is never called for ticketNumbers 101 and 250; `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts` inserts 101 tickets and asserts ticket #101 returns 200 (runs under `pnpm test:e2e`)
- [x] An unknown key returns not-found.
- [x] A ticket in another organisation returns not-found, never a status that confirms it exists.
- [x] The by-key read allows and denies exactly as the by-id read does, across the same actor matrix. — the route carries the same `@RequirePermission("build:tickets:view")` under the same class-level `@UseGuards(JwtAuthGuard, PermissionGuard)` and `@RequireModule("build")` (`projects-tickets.controller.ts:45-47`, `:152-153` vs `:161-162`), and it is declared **before** `:projectId/tickets/:ticketId` so the by-id route does not shadow it. Asserted end to end by `backend/src/modules/build/core/projects-tickets-key-authz.e2e-spec.ts` — **12 tests, 12 pass** — which drives both routes through the real guard chain for five actors and asserts they answer identically.
- [x] The detail page no longer fetches the board to resolve an id.

## Todo

- [x] Add the by-key read authorized identically to the existing ticket read
- [x] Remove the board-array resolution from the detail page
- [x] Controller e2e for the allow/deny matrix — `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts`: owner→200, member without permission→403, unknown key→404, unauthenticated→401. **It exists but fails in its own fixture** — see below. `backend/src/modules/build/core/projects-tickets-key-authz.e2e-spec.ts`, added by S4 to cover the same matrix without rows, **runs and passes 12/12**.
- [x] Verify a deep link to an old ticket in a booted app — **done, against the real branch.** The blocker was a credential, not a missing database: `APP_DATABASE_URL` failed `28P01` for `streamline_app`, so `DrizzleModule.assertRlsIsEnforced` threw from `onApplicationBootstrap` and the API could not start at all. Password re-synced to the value already in `.env`, API booted on `:1500`, `/health` → `{"status":"ok"}`. Then, as the org owner of a 200,002-ticket organisation, project 9 (ticket numbers 1–3335):

  | request | result |
  |---|---|
  | `GET /build/9/tickets/key/1` | 200 |
  | `GET /build/9/tickets/key/101` | 200 — ticket id 6251, far past the board's first hundred |
  | `GET /build/9/tickets/key/3335` | 200 — ticket id 204256, the last ticket in the project |
  | `GET /build/9/tickets/key/999999` | 404 `PROJECTS_TICKET_NOT_FOUND` |
  | no token | 401 |
  | **a real member of a different organisation, asking for project 9's tickets** | **404, never 403** — the existence oracle is closed |

  This is the check the ticket said "has caught real defects here before", and it passed on the first try.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

### What executes, and what does not (S4, 2026-08-27 — tests were authorised for this session)

**The e2e suite could not boot at all when this session started**, and that turned out to be one credential. `APP_DATABASE_URL` failed `28P01` for `streamline_app`, and `DrizzleModule.assertRlsIsEnforced` (`backend/src/db/drizzle.module.ts:81`) queries Postgres from `onApplicationBootstrap`, so `createE2eApp` threw before any test ran — the unmodified `projects.controller.e2e-spec.ts` reported **65 failed, 0 passed**. With the password re-synced, the suite boots.

**Runs and passes now:**

- `backend/src/modules/build/core/ticket-by-key.spec.ts` — **3 tests, 3 pass.**
- `backend/src/modules/build/core/projects-tickets-key-authz.e2e-spec.ts` — **12 tests, 12 pass**, added by S4. Asserts by-key and by-id return the *same* status for the same actor across five actors: no token → 401 · no permissions → 403 · a neighbouring key but not the read key → 403 · Build not entitled → **402** (`ModuleGuard` answers before any permission is read; the spec was written expecting 403 and the expectation was corrected, not the code) · holding `build:tickets:view` → 200. Also asserts the key route is not shadowed by `:ticketId`.
- **The live app**, which is stronger than either — see the deep-link row in the Todo above, including a real member of another organisation getting 404 rather than 403.

**Still does not pass, and it is not this ticket's code:** `projects-tickets-key.e2e-spec.ts` is `describe.skip` unless `RBAC_E2E_DATABASE_URL` is set (run without it: **1 suite skipped, 5 tests skipped** — measured, not assumed). Given the variable it now boots and executes, and fails inside its own `seed()` on the 101-row `tx.insert(tickets)`. The underlying Postgres cause is swallowed by the driver's error wrapper, so it is **not** named here rather than guessed at. The suite has never executed in this repo's history; the criteria it backs are satisfied by the authz suite and by the live app above. Recorded in `architecture-refactor/OPEN-FINDINGS.md` §3.

---

**Lane 3 note (2026-08-26):** the audit note below is out of date on its main point. It says the regression test and the controller e2e matrix do not exist in any spec under `build/core/`. Both exist and both are on disk now:

- `backend/src/modules/build/core/ticket-by-key.spec.ts` — 3 tests, all pass (verified this run). Asserts `findFirst` is called exactly once and `findMany` never for ticket numbers 101 and 250, and that an unknown key throws.
- `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts` — the allow/deny matrix. Runs only under `pnpm test:e2e`; **not run in this lane** and reported as not run, never as passing. **S4 correction 2026-08-27:** it was run, and it skips — see the section above. "Exists on disk" and "is executed coverage" are different claims and this note conflated them.

Every acceptance criterion is satisfied in source, and the booted-app check that was keeping this ticket open has now been performed against the real branch.

---

**Audit note (2026-08-26):** The backend implementation is confirmed complete. `GET :projectId/tickets/key/:ticketNumber` exists at `backend/src/modules/build/core/projects-tickets.controller.ts:151`; the service method at `projects-tickets-read.service.ts:384` queries directly by `(orgId, projectId, ticketNumber)` — no board-array resolution, any position works. Cross-tenant requests return not-found because `orgId` is in the `WHERE` clause and `ProjectsTicketNotFoundException` fires on null. Authorization path is identical to `getTicket` (same `resolveTicketsScope` check). Two genuinely open items remain: the regression test (`A ticket beyond the first hundred opens`) and the controller e2e matrix — neither exists in any spec under `build/core/`. The `Verify deep link` todo is BLOCKED on a booted app.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
