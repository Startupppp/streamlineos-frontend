# c17 — Every billing write is provable

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 7 tickets, 5 retired.

The adapter shipped with c5 and the architecture is right. What is missing is proof that individual writes happened. Every defect here has the same shape: **a mechanism that looks like enforcement and is not** — and each fails permissively, in the direction of letting the request through, which on a billing path means revenue loss rather than an error someone notices.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | A provider event is recorded before it is acted on | — | needs re-verification |
| 02 | A webhook acknowledges only durable work | 01 | needs re-verification |
| 03 | A coupon can be used once | — | needs re-verification |
| 04 | A quota that cannot be computed refuses the write | — | needs re-verification |
| 05 | Revenue reporting reads what the system writes | 01 | needs re-verification |
| 06 | [Dunning history is queryable](issues/06-dunning-history-is-queryable.md) | — | needs re-verification |
| 07 | An issued invoice cannot change | — | done |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
