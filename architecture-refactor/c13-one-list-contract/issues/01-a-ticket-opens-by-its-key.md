# 01 — A ticket opens by its key

**What to build:** Following a link to any ticket opens that ticket — including one that is not in the project's first hundred. Today the page resolves a ticket key to an id by downloading the board's first hundred tickets and searching the array, so deep links, notification links and shared URLs to older tickets fail silently.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] A ticket key resolves server-side to its ticket, whatever its position in the project.
- [x] A ticket beyond the first hundred opens — `backend/src/modules/build/core/ticket-by-key.spec.ts` asserts `findFirst` is called exactly once and `findMany` is never called for ticketNumbers 101 and 250; `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts` inserts 101 tickets and asserts ticket #101 returns 200 (runs under `pnpm test:e2e`)
- [x] An unknown key returns not-found.
- [x] A ticket in another organisation returns not-found, never a status that confirms it exists.
- [x] The by-key read allows and denies exactly as the by-id read does, across the same actor matrix. — the route carries the same `@RequirePermission("build:tickets:view")` under the same class-level `@UseGuards(JwtAuthGuard, PermissionGuard)` and `@RequireModule("build")` (`projects-tickets.controller.ts:45-47`, `:152-153` vs `:161-162`), and it is declared **before** `:projectId/tickets/:ticketId` so the by-id route does not shadow it. **The spec that asserts this end to end does not execute** — see the executed-coverage note below; the tick rests on the source, and the gap is recorded rather than papered over.
- [x] The detail page no longer fetches the board to resolve an id.

## Todo

- [x] Add the by-key read authorized identically to the existing ticket read
- [x] Remove the board-array resolution from the detail page
- [x] Controller e2e for the allow/deny matrix — `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts`: owner→200, member without permission→403, unknown key→404, unauthenticated→401. **It exists; it does not run** — see below. `backend/src/modules/build/core/projects-tickets-key-authz.e2e-spec.ts` was added by S4 to cover the guard half without rows, and is blocked by the same boot failure.
- [ ] Verify a deep link to an old ticket in a booted app — **BLOCKED, and the blocker is now named.** The API cannot boot in this checkout: it connects as `APP_DATABASE_URL`, which fails `28P01 password authentication failed for user 'streamline_app'` (probed 2026-08-27), and `DrizzleModule.assertRlsIsEnforced` throws from `onApplicationBootstrap` rather than degrading. Fix the password in the Neon console — `ALTER ROLE` does not survive a branch suspend — and this box becomes ordinary work. It is the kind that has caught real defects here before ("typecheck + build + 165 mocked tests green while nothing worked"), so it is not waved through.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — held open by the box above, per the rule that Status only moves at zero open boxes.

### What executes, and what does not (S4, 2026-08-27 — tests were authorised for this session)

**Runs and passes:** `backend/src/modules/build/core/ticket-by-key.spec.ts` — **3 tests, 3 pass.** Asserts `findFirst` is called exactly once and `findMany` never, for ticket numbers 101 and 250, and that an unknown key throws.

**Does not run, two independent reasons:**

1. `projects-tickets-key.e2e-spec.ts` is `describe.skip` unless `RBAC_E2E_DATABASE_URL` is set, which no checkout sets. Executed under `pnpm test:e2e` it reports **1 suite skipped, 5 tests skipped** — measured, not assumed. The same gate hides `projects-access.e2e-spec.ts` and `projects-scope.e2e-spec.ts`.
2. Even without that gate, no e2e suite can boot here. `DrizzleModule.assertRlsIsEnforced` (`backend/src/db/drizzle.module.ts:81`) queries Postgres from `onApplicationBootstrap`, so `createE2eApp` needs a reachable database — despite `test/helpers/e2e-app.ts` opening with "none of them needs a database" and stubbing membership, entitlements and access for exactly that reason. `APP_DATABASE_URL` fails `28P01` for `streamline_app`. Control: the **unmodified** `projects.controller.e2e-spec.ts` reports **65 failed, 0 passed** in this checkout, all from `app.init()`; against an unreachable host it fails identically with `ECONNREFUSED`, so it is the assertion and not only the credential.

Both are written up in `architecture-refactor/lane-requests/s4.md` §2 and §3. Nothing here is reported as passing that was not run.

---

**Lane 3 note (2026-08-26):** the audit note below is out of date on its main point. It says the regression test and the controller e2e matrix do not exist in any spec under `build/core/`. Both exist and both are on disk now:

- `backend/src/modules/build/core/ticket-by-key.spec.ts` — 3 tests, all pass (verified this run). Asserts `findFirst` is called exactly once and `findMany` never for ticket numbers 101 and 250, and that an unknown key throws.
- `backend/src/modules/build/core/projects-tickets-key.e2e-spec.ts` — the allow/deny matrix. Runs only under `pnpm test:e2e`; **not run in this lane** and reported as not run, never as passing. **S4 correction 2026-08-27:** it was run, and it skips — see the section above. "Exists on disk" and "is executed coverage" are different claims and this note conflated them.

Every acceptance criterion is satisfied in source. The only thing keeping this ticket open is the booted-app check.

---

**Audit note (2026-08-26):** The backend implementation is confirmed complete. `GET :projectId/tickets/key/:ticketNumber` exists at `backend/src/modules/build/core/projects-tickets.controller.ts:151`; the service method at `projects-tickets-read.service.ts:384` queries directly by `(orgId, projectId, ticketNumber)` — no board-array resolution, any position works. Cross-tenant requests return not-found because `orgId` is in the `WHERE` clause and `ProjectsTicketNotFoundException` fires on null. Authorization path is identical to `getTicket` (same `resolveTicketsScope` check). Two genuinely open items remain: the regression test (`A ticket beyond the first hundred opens`) and the controller e2e matrix — neither exists in any spec under `build/core/`. The `Verify deep link` todo is BLOCKED on a booted app.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
