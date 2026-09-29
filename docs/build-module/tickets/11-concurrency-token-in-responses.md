# 11 — Return the concurrency token everywhere, and have clients echo it

**What to build:** Every Build entity that supports concurrent editing returns its concurrency token in its response, and every first-party client sends that token back on the next write. This is the expand half of an expand–contract sequence: nothing is enforced yet, so no caller breaks.

Context worth knowing, because the module's own notes record the opposite: ticket update **already implements a correct compare-and-swap** — it guards the write on the row's current version and increments it, returning 409 through a dedicated conflict exception, with a passing spec. The recorded cross-cutting gap claiming no optimistic concurrency exists anywhere reached that conclusion by searching for `If-Match` and `ETag` headers, and this codebase carries the token in the request body, so that search could not have found it. Treat the mechanism as present and correct, not missing.

One thing the note above does not cover, found later: the compare-and-swap is correct but **only five of the eleven ticket writers move the token**, so the check it performs can be defeated by any of the other six. Until ticket 36 lands, this mechanism is decorative and echoing the token buys nothing.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row.

**Status:** partial — boxes 1, 2 and 4 earned; box 3 is superseded by ticket 12 (token is now required)

- [x] Every mutable Build entity's read response carries its current concurrency token
- [x] Every first-party client sends the token it last read on update
- [ ] Nothing rejects a request for omitting the token yet
  **NOT EARNED 2026-09-29 — permanently N/A by design: ticket 12 made the token required, so "nothing rejects omission yet" is now the deliberately wrong state. Nothing would earn it short of reverting ticket 12.**

  **N/A — DECISION 2026-09-27 (Lane 1):** This criterion required that no endpoint reject a
  missing token ("expand half of expand–contract"). Ticket 12 completed the contract half and
  made the token required. The criterion is void because the intended state it described
  ("nothing rejects omission yet") is now permanently the wrong state. Proof: `dto/ticket.schemas.ts`
  at the `version` field (enforced by the `updateTicketSchema`) requires the token; the
  `projects-ticket-version-conflict.spec.ts` test "version is required — a body without it fails
  schema validation (ticket-12 box-1)" at line 158 proves rejection is live. Leaving unticked per
  programme rule: an N/A is a decision, not completed functionality.
  **Verified 2026-09-27 (Lane A2):** Ticket 12 confirmed complete (0 unchecked boxes, status "done"). `backend/src/modules/build/core/dto/ticket.schemas.ts:174`: `version: z.number().int().positive()` — required field with no `.optional()` or `.nullable()` modifier. Omission of `version` is rejected by Zod schema validation before any handler logic runs. N/A decision confirmed: the "expand half" criterion is permanently void because the contract half is applied and cannot be undone without breaking ticket 12. Stays unchecked.
- [x] The existing ticket conflict behaviour is unchanged
