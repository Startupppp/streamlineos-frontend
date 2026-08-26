# c13 — One contract for every list

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 6 tickets, 1 done.

The shared keyset helper is sound, but adoption and several call-site algorithms are not. A direct ticket-by-key route and client query have now landed, though the ticket's authorization/beyond-100/not-found regression evidence remains open. Chat currently skips its popped sentinel row, and multi-account inbox advances provider cursors past fetched-but-unreturned messages. The remaining list work also includes broad offsets, sequential totals and oversized board projections.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A ticket opens by its key](issues/01-a-ticket-opens-by-its-key.md) | — | **done** |
| 02 | [The board does not ship descriptions](issues/02-the-board-does-not-ship-descriptions.md) | 01 | ready-for-agent |
| 03 | [A list total costs no extra round trip](issues/03-a-list-total-costs-no-extra-round-trip.md) | — | ready-for-agent |
| 04 | [The receivables total is computed once](issues/04-the-receivables-total-is-computed-once.md) | 03 | ready-for-agent |
| 05 | [Scrolled lists page by cursor](issues/05-scrolled-lists-page-by-cursor.md) | — | **done** |
| 06 | [Every list speaks one filter and sort vocabulary](issues/06-every-list-speaks-one-filter-vocabulary.md) | 05 | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
