# c13 — One contract for every list

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 6 tickets, 0 retired.

The keyset helper is correct and six files use it; 143 call `.offset()` directly. 241 count queries run as a second sequential round trip and none uses a window. And opening a ticket by its key downloads a hundred other tickets with their full descriptions — so a ticket past the hundredth cannot be opened at all. That last one is the only correctness bug in the review.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A ticket opens by its key](issues/01-a-ticket-opens-by-its-key.md) | — | ready-for-agent |
| 02 | [The board does not ship descriptions](issues/02-the-board-does-not-ship-descriptions.md) | 01 | ready-for-agent |
| 03 | [A list total costs no extra round trip](issues/03-a-list-total-costs-no-extra-round-trip.md) | — | ready-for-agent |
| 04 | [The receivables total is computed once](issues/04-the-receivables-total-is-computed-once.md) | 03 | ready-for-agent |
| 05 | [Scrolled lists page by cursor](issues/05-scrolled-lists-page-by-cursor.md) | — | ready-for-agent |
| 06 | [Every list speaks one filter and sort vocabulary](issues/06-every-list-speaks-one-filter-vocabulary.md) | 05 | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
