# c9 — Decide what the transactional outbox is for

Spec: [`docs/specs/c9-transactional-outbox-decision.md`](../../docs/specs/c9-transactional-outbox-decision.md)

**Candidate status:** unchanged since the review, and unchanged because it is a question rather than a defect. The review graded it "worth exploring" rather than "strong", and that grading is right.

Two durable write paths with different guarantees, and nothing at the call site naming the trade-off. One is wired and widely used. The other has twenty-three producers, one consumer, and a flush that does nothing by design.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Decide what the transactional outbox is for](issues/01-decide-what-the-outbox-is-for.md) | — | evidence gathered — decision awaiting sign-off |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Ticket 01 produces the rest of this directory.** Execution tickets are written once the answer is known; writing both branches now would mean deleting half of them unread.

**Resist the pull to "just wire it".** Twenty-three producers is a real constituency, and one consumer is a real signal that the demand may not be there. Decide on the row-count evidence, not on an aesthetic judgement.

**The sharpest framing available** is the review's own deletion test: delete the writer today and notifications are unaffected, because they do not share a seam. That independence is why the choice is still open — and also why either answer is cheap to execute once made.
