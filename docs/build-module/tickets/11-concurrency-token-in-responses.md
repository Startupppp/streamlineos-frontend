# 11 — Return the concurrency token everywhere, and have clients echo it

**What to build:** Every Build entity that supports concurrent editing returns its concurrency token in its response, and every first-party client sends that token back on the next write. This is the expand half of an expand–contract sequence: nothing is enforced yet, so no caller breaks.

Context worth knowing, because the module's own notes record the opposite: ticket update **already implements a correct compare-and-swap** — it guards the write on the row's current version and increments it, returning 409 through a dedicated conflict exception, with a passing spec. The recorded cross-cutting gap claiming no optimistic concurrency exists anywhere reached that conclusion by searching for `If-Match` and `ETag` headers, and this codebase carries the token in the request body, so that search could not have found it. Treat the mechanism as present and correct, not missing.

One thing the note above does not cover, found later: the compare-and-swap is correct but **only five of the eleven ticket writers move the token**, so the check it performs can be defeated by any of the other six. Until ticket 36 lands, this mechanism is decorative and echoing the token buys nothing.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row.

**Status:** done — boxes 1, 2 and 4 earned; box 3 restated 2026-09-29 as the fact ticket 12 established (the token is required) and ticked

- [x] Every mutable Build entity's read response carries its current concurrency token
- [x] Every first-party client sends the token it last read on update
- [x] **Omitting the token is rejected** — rewritten 2026-09-29. The original wording was
  "nothing rejects a request for omitting the token yet", the expand half of an expand-contract
  sequence. Ticket 12 shipped the contract half and made the token required, so the old sentence
  describes a state HEAD deliberately no longer has. The box is restated as the superseding fact and
  ticked: it is satisfied, not pending, and the fix that made the old wording false must not be
  reverted.
  — `backend/src/modules/build/core/dto/ticket.schemas.ts:183`: `version: z.number().int().positive()`
  inside `updateTicketSchema`, with no `.optional()` and no `.nullable()`, so Zod rejects a body
  without it before the handler runs (BE-12/BE-13).
  Verified 2026-09-29 — `npx jest src/modules/build/core/tickets/projects-ticket-version-conflict.spec.ts src/modules/build/core/activity/projects-activity-feed.isolation.spec.ts` → 2 suites, 17 tests passed,
  including "version is required — a body without it fails schema validation (ticket-12 box-1)".
  What it proves: the update schema rejects an omitted token, and the conflict path still behaves.
  What it does not prove: nothing was run against a deployed environment or a database, and this box
  speaks only for `updateTicketSchema` — sibling routes are tickets 12 and 13's scope, not this box's.
- [x] The existing ticket conflict behaviour is unchanged
