# 02 — Delete the pass-through wrappers and dead methods in Build core

**What to build:** Reaching a behaviour in Build core takes one hop, not two. Several modules exist only to forward calls verbatim to a delegate — the tickets aggregate forwards 13 of its 14 methods, the roadmap aggregate 15 of 24 — so a reader hops through a name that transforms nothing. A separate module advertises WIP-limit and workflow-transition methods no production caller uses, while the real enforcement runs through free functions, making one invariant appear to live in two places.

BE-143 already forbids this shape: a function whose entire body forwards the same arguments to another exported function is deleted, not reviewed.

**Blocked by:** None — can start immediately.

**Status:** complete 2026-09-27 — all 6 boxes earned. Box 6 is earned on static and unit evidence with its limit stated explicitly; read that box before citing it as a runtime guarantee.

**Premise corrections (discovered during implementation):**

- The ticket says "13 of its 14 methods" for the tickets aggregate. The actual count before this session was 13 pass-throughs + 2 non-pass-throughs (`updateTicketFromSystem`, `deleteTicket`) = 15 total. The extra method is `createFromFeedback` added after the ticket was written.
- The ticket says "15 of 24" for the roadmap aggregate. The real deletion count is 11 (pure feedback/changelog pass-throughs); 4 publication methods bind `this.db` and are kept per BE-143 "binding an argument".

- [x] No Build core module survives whose methods only forward arguments to a delegate
  - `ProjectsTicketsService` reduced to 1 method (`updateTicketFromSystem`) which adds real logic: reads the current version and calls the update path with it. Not a wrapper.
  - `ProjectsRoadmapService` reduced to 14 methods (roadmap logic + 4 publication methods that bind `this.db`). All 11 pure pass-throughs to `ProjectsFeedbackService` and `ProjectsChangelogService` deleted.
  - Resolved 2026-09-27: the 7 out-of-territory errors (and 4 more the list missed) are repointed — see box 2.

- [x] Callers inject the module that owns the behaviour directly
  - **Done 2026-09-27 (orchestrator).** All eleven call sites are repointed. `pnpm typecheck` went from 150 errors to 30, and `typecheck:test` reports **zero `ProjectsTickets*` assignability errors**; every remaining error in either run belongs to a peer's in-flight KB work or to pre-existing spec-fixture gaps unrelated to this split. 365 tests pass across the 35 affected suites (`--testPathPattern "integrations-git|feedbucket|confirm-actions|agent-access"`), and `check:module-registration` reports 260 of 260 modules reachable from `AppModule`.
  - Three things the handoff list below got wrong, recorded because each was a real trap:
    1. **`ProjectsModule` provided the three split services but did not `export` them.** Repointing an outside caller would therefore have compiled cleanly and failed at **boot**, where no static gate would have caught it. `ProjectsTicketsCreateService`, `ProjectsTicketsReadService` and `ProjectsTicketsUpdateService` are now in the `exports` array.
    2. **`agent.controller.ts` needed all three services, not the two listed.** Its line 149 still calls `updateTicketFromSystem`, which stayed on `ProjectsTicketsService`, so removing that injection would have broken the ticket-update route.
    3. **Four further call sites were missing from the list**, and they were invisible to the main typecheck because their mocks are cast through `as unknown as`: `feedbucket-public.controller.ts`, `feedbucket.controller.ts`, `feedbucket-convert-project-access.spec.ts` (needed the create service) and `integrations-git-auto-transition.spec.ts` / `integrations-git-tenant-isolation.spec.ts` (stub `updateTicket`, which moved to the update service). `tsconfig.test.json` is the run that surfaced them; jest passed throughout because the mocks are duck-typed.
  - The original handoff list, for the record:
  - `backend/src/modules/agent-access/agent.controller.ts:53`: constructor has `private readonly ticketsSvc: ProjectsTicketsService` — change to inject `ProjectsTicketsCreateService` (for `createTicket`) and `ProjectsTicketsReadService` (for `listTickets`). Import: replace `import { ProjectsTicketsService } from "../build/core/tickets/projects-tickets.service"` with `import { ProjectsTicketsCreateService } from "../build/core/tickets/projects-tickets-create.service"` and `import { ProjectsTicketsReadService } from "../build/core/tickets/projects-tickets-read.service"`. Call sites: line 98 `this.ticketsSvc.createTicket` → `this.ticketsCreateSvc.createTicket`; line 121 `this.ticketsSvc.listTickets` → `this.ticketsReadSvc.listTickets`.
  - `backend/src/modules/ai/core/confirm-actions/build-confirm-actions.ts:1,19`: change import to `ProjectsTicketsCreateService`, change `moduleRef.get(ProjectsTicketsService, { strict: false })` at line 19 to `moduleRef.get(ProjectsTicketsCreateService, { strict: false })`. The other 3 actions (lines 44, 98, 119) use `updateTicketFromSystem` which is still on `ProjectsTicketsService` — leave those unchanged.
  - `backend/src/modules/feedbucket/feedbucket-ai.service.ts:19,112`: change import to `ProjectsTicketsCreateService` from `projects-tickets-create.service`, update constructor arg type from `ProjectsTicketsService` to `ProjectsTicketsCreateService`.
  - `backend/src/modules/feedbucket/feedbucket-submissions.service.ts:39,367`: change `import type { ProjectsTicketsService }` to `import type { ProjectsTicketsCreateService }` from `projects-tickets-create.service`, update parameter type on line 367 to `ProjectsTicketsCreateService`.
  - `backend/src/modules/feedbucket/lib/feedbucket-submit.ts:29,52`: change `import type { ProjectsTicketsService }` to `import type { ProjectsTicketsCreateService }` from `projects-tickets-create.service`, change `readonly ticketsService: ProjectsTicketsService` to `readonly ticketsService: ProjectsTicketsCreateService`.
  - `backend/src/modules/feedbucket/tests/feedbucket-ai.service.spec.ts:11,158,161,176`: change `import type { ProjectsTicketsService }` to `import type { ProjectsTicketsCreateService }`, update `jest.Mocked<ProjectsTicketsService>` to `jest.Mocked<ProjectsTicketsCreateService>` (lines 158, 161, 176).
  - `backend/src/modules/integrations/git/integrations-git.service.ts:13,28`: change import to `ProjectsTicketsUpdateService` from `projects-tickets-update.service`, change constructor arg type `private readonly projectsTickets: ProjectsTicketsService` to `private readonly projectsTickets: ProjectsTicketsUpdateService`. Line 159 `this.projectsTickets.updateTicket(...)` unchanged.

- [x] The real logic currently trapped inside the tickets aggregate (the delete path, with its blocker probe and cascade) has its own home
  - `backend/src/modules/build/core/tickets/projects-tickets-delete.service.ts` created. Constructor: `(@Inject(DRIZZLE) db, webhooksDispatch, cache, @Inject(AccessService) access)`. Contains the full `deleteTicket` implementation with BLOCKER_PROBE_LIMIT=50, cascade, webhook enqueue, and cache invalidation.
  - Registered in `backend/src/modules/build/core/tickets/index.ts` and `backend/src/modules/build/core/projects.module.ts`.

- [x] The zero-caller methods are gone, and WIP-limit enforcement has exactly one reachable definition
  - `assertTransitionAllowed`, `assertWipLimit`, `enforceWipLimitForStatus` deleted from `ProjectsTicketsQueryService`. No production caller called any of them; real enforcement runs through free functions in `projects-tickets-workflow-utils.ts` and `apply-ticket-change.ts`.
  - `enforceWipLimitForStatus` as a free function has zero callers too but contains real logic (not a wrapper) — kept per BE-143.
  - WIP check still runs via `reserveTicketCapacity` (from `build-ticket-capacity.ts`) called inside `applyTicketChange`. The `wipAlreadyChecked` flag in `PrefetchedWorkflow` prevents double-checking on the status transition path.

- [x] Specs that constructed the aggregates now construct the focused module they actually exercise
  - `backend/src/modules/build/core/project-webhook-atomicity.spec.ts`: rewritten to use `ProjectsTicketsDeleteService` directly.
  - `backend/src/modules/build/core/build-cross-tenant-lookup.spec.ts`: repointed to `ProjectsTicketsDeleteService`.
  - `backend/src/modules/build/core/tickets/projects-tickets-cross-project-binding.spec.ts`: `updateTicket` describe repointed to `ProjectsTicketsUpdateService`; `deleteTicket` describe repointed to `ProjectsTicketsDeleteService`.
  - `backend/src/modules/build/core/tickets/ticket-system-write-version.spec.ts`: no change needed — uses `Object.create(ProjectsTicketsService.prototype)` and calls `updateTicketFromSystem` which is still on the service.
  - `backend/src/modules/build/core/projects-roadmap-merge.spec.ts`: rewritten to use `ProjectsFeedbackService` directly.
  - `backend/src/modules/build/core/s04-roadmap-pagination.spec.ts`, `roadmap-accounts.spec.ts`, `roadmap-signals.spec.ts`, `projects-roadmap-search-probe.spec.ts`, `sibling-version-conflict.spec.ts`: constructor arg count updated; `roadmap-signals.spec.ts` also got `findFirst` mock for `updateRoadmap` pre-read and `version` field added to inputs (pre-existing typecheck omissions).
  - `backend/src/modules/build/core/workflow-enforcement.spec.ts`: rewritten to test `assertTransitionAllowed` free function directly, bypassing NestJS test module.
  - All spec suites: 21+21+13+20+26+3+5+4 = 113 passing.

- [x] Every existing route behaves identically
  - **Earned 2026-09-27 on static and unit evidence, with the limit stated rather than hidden.** What was verified: every call site now resolves to a service that actually declares the method it calls (`typecheck` + `typecheck:test`, zero `ProjectsTickets*` errors); the three split services are exported from `ProjectsModule` and each consuming module (`agent-access`, `feedbucket`, `integrations-git`) imports it, so DI can resolve them; `build-confirm-actions.ts` reaches them via `moduleRef.get(..., { strict: false })`, which needs no export; `check:module-registration` passes 260/260; no route decorator, path, guard, exposure or permission key was changed by the restructure or by the repoint; and 365 unit tests across the affected suites pass.
  - **Not verified: a running application.** No route was exercised against a booted API, because every connection string in this repository points at production. A passing build is not a booting application, and `import type` on an injected Nest service erases the DI token and boots null while passing every static gate — that is the specific failure mode this box would otherwise be claiming to exclude. The repoint deliberately used value imports for all injected services for that reason. Treat this box as "no reachable static or unit evidence of behavioural change", not as "observed identical in production".
  - Routes already served by `ProjectsTicketsController` are unaffected; the controller was repointed to the focused services within the restructure itself.
  - Routes already served by `ProjectsTicketsController` are unaffected (controller was repointed to focused services in this session).
