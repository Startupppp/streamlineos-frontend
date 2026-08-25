# c22 — Scheduled work runs once, and a deploy sheds no requests

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, 0 done.

Every item here is a **missing guarantee on a sound design**. Crons as secret-guarded HTTP endpoints is better than in-process timers; it just never got exclusivity. Startup validation is stricter than most production applications; shutdown simply does its two steps in the wrong order. Three write paths are already correctly serialized — two more are unverified and both touch money or stock.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A scheduled job runs once](issues/01-a-scheduled-job-runs-once.md) | — | **done** |
| 02 | [A deploy sheds no requests](issues/02-a-deploy-sheds-no-requests.md) | — | **done** |
| 03 | [Invoice numbering is race-free](issues/03-invoice-numbering-is-race-free.md) | — | ready-for-agent |
| 04 | [Stock adjustments serialize](issues/04-stock-adjustments-serialize.md) | — | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
