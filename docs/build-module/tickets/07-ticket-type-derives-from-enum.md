# 07 — Derive ticket type and priority from the database enum

**What to build:** Invalid ticket types are rejected with a validation error, and the create form never offers a type the database cannot store. Two defects today: the create schema enumerates a value absent from the database enum, so choosing it passes validation and then fails in Postgres as a 500; and the update schema accepts any string, so a bad type also reaches the database and 500s instead of returning 400.

Both should derive from the canonical enum, following the pattern the approvals module already uses.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** Schema tests pass, but `SUBTASK` remains offered in
`frontend/features/build/automations/automation-value-input.tsx:23`,
`frontend/components/list-view/filter-types.ts:53`, and
`backend/src/modules/ai/core/tools/projects-copilot-tools.ts:119`. Remove/derive these consumers
without confusing a subtask relationship with a ticket enum. SafeParse rejection does not itself
prove the controller returns HTTP 400; add an isolated controller-level positive/negative test.

**Phantom value:** `SUBTASK` — present in `createTicketSchema` and `csvToTicketTypeArray` but absent from `ticketTypeEnum` (`["EPIC", "STORY", "TASK", "BUG"]`).

- [x] The phantom type value is no longer accepted or offered anywhere
  — `automation-value-input.tsx` TICKET_TYPE_OPTIONS now derives from `DB_ENUMS.ticket_type` (SUBTASK gone); `filter-types.ts` TYPES now equals `DB_ENUMS.ticket_type` (SUBTASK gone); `projects-copilot-tools.ts:119` now uses `z.enum(DB_ENUMS.ticket_type)` (SUBTASK gone). Verified by `projects-copilot-tools.spec.ts` (2/2 pass, SUBTASK rejected). Other SUBTASK occurrences in `features/build/shared/types.ts`, `ticket-type-icon.tsx`, `filter-flat-search.tsx`, `use-ticket-filter-params.ts`, `use-build-list-url-state.ts` and `workload-filter-types.ts` represent the parent-child display concept (not the ticket_type enum) and are owned by Lane 6 — reported to orchestrator.
- [x] An invalid ticket type on create or update returns 400, never 500
  Earned 2026-09-27 by connecting the two halves the earlier note left unconnected. The gap was never
  the schema; it was that nothing proved the schema's rejection becomes a 400 rather than an unhandled
  throw. `src/modules/build/core/ticket-type-invalid-returns-400.spec.ts` (7 tests, all pass) does that
  without a server, a database or an e2e run:
  
  - The schema under test is **read off the real handler's metadata** with `Reflector`, from
    `ProjectsTicketsController.prototype.createTicket` and `.updateTicket`, rather than imported by name.
    A route that stopped declaring `@Validate` would fail the spec instead of silently passing it.
  - The real `ZodValidationInterceptor` runs against that metadata and throws a `ZodError` for
    `type: "SUBTASK"` on both routes.
  - The real `AllExceptionsFilter` then catches that error and is asserted to write **400** with
    `code: "VALIDATION_FAILED"` and a `details` entry naming `type` -- and explicitly not 500.
  - The enum boundary is swept both ways: all four values the database enum declares (`EPIC`, `STORY`,
    `TASK`, `BUG`) are admitted, and `SUBTASK`, lower-case `task`, `CHORE` and the empty string are each
    rejected. The lower-case case matters because a case-insensitive enum would have accepted it.
  
  **The paired positives (BE-141) caught two defects in the spec itself, which is the reason to write
  them.** The first version asserted only the rejections and passed -- but its request double had no
  `params`, so the route's params schema threw before the body was ever parsed. Every negative was
  passing for the wrong reason. The second version then failed on `createTicket` only, because
  `projectIdParams` is `.strict()` (BE-13) and rejected the `ticketId` that `updateTicket` needs: each
  route now supplies its own params. A negative-only spec would have shipped both mistakes invisibly.
  — Schema-level proof exists: `ticket-schema-bounds.spec.ts` already asserts createTicketSchema and updateTicketSchema reject "SUBTASK" (exit 0, verified source). `ZodValidationInterceptor` calls `schema.parse(req.body)` without a catch — ZodError propagates to `AllExceptionsFilter` → 400 (proven by `all-exceptions.filter.spec.ts`). A controller-level HTTP integration test connecting these two was not run because `projects-tickets.controller.ts` is owned by Lane 11. Box stays unchecked; gate needed is a controller HTTP test for Lane 11's scope.
- [x] Both schemas derive from the canonical database enum rather than restating its values
- [x] Adding a value to the enum makes it valid on both paths with no schema edit
