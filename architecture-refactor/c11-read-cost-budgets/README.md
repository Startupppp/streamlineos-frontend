# c11 — Make "this query is fast" a thing CI proves

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 3 tickets, 0 retired.

`check-build-read-cost.mjs` is the best performance engineering in either repo — it connects as the non-BYPASSRLS app role, sets the tenant GUC, runs `EXPLAIN (ANALYZE, BUFFERS)`, and asserts both a block ceiling and an Index Only Scan. It guards two queries out of 3,385 routes. These three tickets make it general.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A read budget is data, not a script](issues/01-a-read-budget-is-data-not-a-script.md) | — | done |
| 02 | [Budgets cover the paths users wait on](issues/02-budgets-cover-the-paths-users-wait-on.md) | 01 | done |
| 03 | [A breach fails the build](issues/03-a-breach-fails-the-build.md) | 01 | done |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
