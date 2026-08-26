# c13 — One contract for every list

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 6 tickets, 2 done.

The shared helper is sound and now has one implementation of the sentinel step, shared by the opaque
and numeric cursor forms. Chat's three surfaces and the multi-account inbox are fixed and pinned by
property tests; the inbox cursor is HMAC-signed. What is left is adoption outside this lane's
territory and two things a database would answer.

Numbers that turned out to be wrong, verified 2026-08-26: **204** local pagination-schema copies
across 135 files, not 16 · **20** files already use `count(*) OVER ()`, not three · **1** confirmed
sequential list count on a normal path, not 241 · `.offset()` at 143 files is correct.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A ticket opens by its key](issues/01-a-ticket-opens-by-its-key.md) | — | in-progress — every criterion met; only the booted-app deep-link check remains |
| 02 | [The board does not ship descriptions](issues/02-the-board-does-not-ship-descriptions.md) | 01 | done |
| 03 | [A list total costs no extra round trip](issues/03-a-list-total-costs-no-extra-round-trip.md) | — | in-progress — inventory verified and recorded; conversions are outside this lane |
| 04 | [The receivables total is computed once](issues/04-the-receivables-total-is-computed-once.md) | 03 | in-progress — premise was already false; read-budget entry added but its ceiling is unmeasured |
| 05 | [Scrolled lists page by cursor](issues/05-scrolled-lists-page-by-cursor.md) | — | in-progress — 8 of 9 criteria met; notifications and the ticket list are outside this lane |
| 06 | [Every list speaks one filter and sort vocabulary](issues/06-every-list-speaks-one-filter-vocabulary.md) | 05 | in-progress — 16 of 135 files migrated; index composition needs a database |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
