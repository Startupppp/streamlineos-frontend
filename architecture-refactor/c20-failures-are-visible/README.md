# c20 — A failure in production is visible

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 0 retired; implementation is partial.

Structured JSON logging, redaction, correlation context and backend/frontend error-reporter ports now exist. The production adapter is still a no-op, `setErrorReporter` is called only by tests, and no operator alert destination is wired. Keep the new seam; finish delivery so a signal reaches a human.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Errors reach a person](issues/01-errors-reach-a-person.md) | — | **closed — logs only** |
| 02 | [The browser reports its own errors](issues/02-the-browser-reports-its-own-errors.md) | 01 | ready-for-agent |
| 03 | [A request can be followed end to end](issues/03-a-request-can-be-followed-end-to-end.md) | 01 | ready-for-agent |
| 04 | [No failure is swallowed](issues/04-no-failure-is-swallowed.md) | 01 | ready-for-agent |
| 05 | [Four alerts reach someone](issues/05-four-alerts-reach-someone.md) | 03, 04 | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
