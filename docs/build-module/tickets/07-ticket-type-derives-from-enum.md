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

- [ ] The phantom type value is no longer accepted or offered anywhere
- [ ] An invalid ticket type on create or update returns 400, never 500
- [x] Both schemas derive from the canonical database enum rather than restating its values
- [x] Adding a value to the enum makes it valid on both paths with no schema edit
