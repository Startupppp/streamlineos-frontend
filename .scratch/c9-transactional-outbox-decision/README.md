# c9 — Decide what the transactional outbox is for

Spec: [`docs/specs/c9-transactional-outbox-decision.md`](../../docs/specs/c9-transactional-outbox-decision.md)

**Candidate status:** unchanged since the review, and unchanged because it is a question rather than a defect. The review graded it "worth exploring" rather than "strong", and that grading is right.

Two durable write paths with different guarantees, and nothing at the call site naming the trade-off. One is wired and widely used. The other has twenty-three producers, one consumer, and a flush that does nothing by design.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 02 | [Events that matter get a consumer](issues/02-consumers-for-the-event-types-that-need-them.md) | — | **open** — 1 of 8 wired; 7 held on one named product decision each |
| 04 | [Notifications becomes a consumer, not a peer](issues/04-notifications-becomes-a-consumer-not-a-peer.md) | 02 | **held by design** — waits until the bus has run in production |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**The bus was proven live on 2026-08-25.** A real flush returned `{"claimed":18,"delivered":0,"suppressed":18}` and left the table at 25 SUPPRESSED, **zero PENDING, zero RETRY, zero DEAD** — every suppressed type one carrying a fire-and-forget verdict. That closes the suppressed-count criterion on evidence rather than on the table's own say-so.

**Read `claimed:0` carefully.** The first flush returned all zeros against 18 PENDING rows, which looks exactly like a broken claim query. It is not: `OUTBOX_DISPATCH_ENABLED` is unset by default, so `flush()` is a deliberate no-op. The flag was enabled only for the verification and restored afterwards.

**Why 02 stays open at 1 of 8.** The one consumer wired is `survey.response.submitted`, and it was wired because three notification catalog entries already specified the reaction and the recipients are FK-determined — nothing had to be invented. The other seven each need one specific product decision (audience, channel, wording), and `inventory.sales_order.fulfilled` creates an AR invoice and needs finance sign-off regardless. Writing seven notification behaviours to close a ticket is the c7-03 mistake.

**Ticket 01 produces the rest of this directory.** Execution tickets are written once the answer is known; writing both branches now would mean deleting half of them unread.

**Resist the pull to "just wire it".** Twenty-three producers is a real constituency, and one consumer is a real signal that the demand may not be there. Decide on the row-count evidence, not on an aesthetic judgement.

**The sharpest framing available** is the review's own deletion test: delete the writer today and notifications are unaffected, because they do not share a seam. That independence is why the choice is still open — and also why either answer is cheap to execute once made.
