# c7 — Turn the chat send path into a fan-out module

Spec: [`docs/specs/c7-chat-message-fanout.md`](../../docs/specs/c7-chat-message-fanout.md)

**Candidate status:** shipped. The fan-out service is the seam the review asked for: realtime publishes first, then push and the two notification publishes run concurrently, each with its own error handling. The bidirectional substring mention scan is gone — the composer sends the identities it resolved and the server intersects them with the actual channel membership, so a forged id gains nothing. The write inside the channel-list read is gone too.

What remains is that the seam has not yet been used for its purpose. Push is still in-process, and the fan-out still re-reads the sender on every message.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 02 | [A chat delivery outage is detected, not discovered](issues/02-failed-side-effects-leave-a-durable-trace.md) | — | **done** |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Ticket 01 is the cheapest remaining win in the review** — one field added to an input object, one query deleted, on the hottest write path in the product.

**Do not undo the trust direction on mentions.** The server does not take the client's word; it loads the authoritative member list and uses the client's claim only to narrow it. And do not remove the outer swallow-and-log — it is what stops a push outage from failing sends. A previous outage here produced zero notification rows platform-wide while every request returned 200, which is exactly what ticket 02 exists to make impossible to repeat.
