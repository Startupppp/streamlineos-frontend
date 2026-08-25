# c9 — Decide what the transactional outbox is for

Spec: [`docs/specs/c9-transactional-outbox-decision.md`](../../docs/specs/c9-transactional-outbox-decision.md)

**Candidate status:** unchanged since the review, and unchanged because it is a question rather than a defect. The review graded it "worth exploring" rather than "strong", and that grading is right.

Two durable write paths with different guarantees, and nothing at the call site naming the trade-off. One is wired and widely used. The other has twenty-three producers, one consumer, and a flush that does nothing by design.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 02 | Events that matter get a consumer | — | **done and retired** — 6 consumers; 1 held on a business decision |
| 04 | [Notifications becomes a consumer, not a peer](issues/04-notifications-becomes-a-consumer-not-a-peer.md) | 02 | **gate answered** — may proceed; held on its timing condition |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**The bus was proven live on 2026-08-25.** A real flush returned `{"claimed":18,"delivered":0,"suppressed":18}` and left the table at 25 SUPPRESSED, **zero PENDING, zero RETRY, zero DEAD** — every suppressed type one carrying a fire-and-forget verdict. That closes the suppressed-count criterion on evidence rather than on the table's own say-so.

**Read `claimed:0` carefully.** The first flush returned all zeros against 18 PENDING rows, which looks exactly like a broken claim query. It is not: `OUTBOX_DISPATCH_ENABLED` is unset by default, so `flush()` is a deliberate no-op. The flag was enabled only for the verification and restored afterwards.

**Ticket 02 closed 2026-08-25 with six consumers on the bus:** `deal.closed`, `survey.response.submitted`, `inventory.stock.low`, `build.sprint.completed`, `build.release.published`, `accounting.bill.approved`. Fourteen types stay deliberately fire-and-forget — ten of them because a synchronous reaction already covers the same ground, so a consumer would double it. One is held: `accounting.invoice.issued`, where "send the invoice to the customer" is an outbound business action, not a notification.

**The near-miss worth remembering.** `accounting.bill.approved` looked trivially wireable, because its payload carries `actor_user_id`. That is the **approver**, not the submitter. Wiring it would have told the person who just clicked approve that their own action succeeded — and read as correct in review. The submitter is `finApprovalRequests.requestedBy`; where no approval request exists, the consumer marks SKIPPED rather than substituting an audience.

**Inventory left scope on 2026-08-25.** Four `inventory.*` types were removed from ticket 02 as work items; their analysis rows stay as a record. That retires the ticket's largest blocker — `inventory.sales_order.fulfilled` was the one money-moving item, creating an AR invoice on consumer execution and needing finance sign-off regardless of catalog state. `inventory.stock.low` shipped before the change and stays: removing an analysis item from a ticket is not a reason to delete live, tested code.

**The rule for wiring a consumer was refined, and that matters more than the scope change.** The first rule was "implement only where a notification catalog entry already specifies the reaction". That is the wrong test: a missing catalog entry is cheap, since the nearest sibling's channels and priority can be mirrored. What actually decides it is **whether the recipients are derivable from the data**. `build.sprint.ending` already derives its recipients from the assignees of open tickets in the sprint — deliberately, with the reasoning written into a comment: *"derived from the tickets themselves rather than from project membership, so nobody is told a sprint is closing on work they do not own."* A sibling event can mirror a derivation like that without inventing anything.

What stays genuinely undecidable is `accounting.invoice.issued`, where "send the invoice to the customer" is an outbound business action rather than a notification.

**Ticket 01 produces the rest of this directory.** Execution tickets are written once the answer is known; writing both branches now would mean deleting half of them unread.

**Resist the pull to "just wire it".** Twenty-three producers is a real constituency, and one consumer is a real signal that the demand may not be there. Decide on the row-count evidence, not on an aesthetic judgement.

**The sharpest framing available** is the review's own deletion test: delete the writer today and notifications are unaffected, because they do not share a seam. That independence is why the choice is still open — and also why either answer is cheap to execute once made.
