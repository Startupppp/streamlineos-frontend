# c14 — Background sweeps operate on sets, not on rows

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 3 tickets, 3 retired.

126 loops contain an awaited database call; classified by what is iterated, **57** grow with tenant data and the rest are bounded by currencies, validated payloads or constants. The worst runs inside the tenant iterator, so it multiplies by organisation count. Do not convert the 33 bounded loops.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Leave accrual is set-based | — | done |
| 02 | The remaining tenant-growing sweeps are set-based | 01 | done |
| 03 | A sweep reports what it did | 02 | done |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
