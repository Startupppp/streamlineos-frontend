# c20 — A failure in production is visible

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 5 retired.

Structured JSON logging, redaction, correlation context and the two error-reporter ports exist on both sides, and **both now have a production adapter installed** — structured logs, no vendor, per the operator decision.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Errors reach a person](issues/01-errors-reach-a-person.md) | — | ✅ **done** — log adapter wired; SQLSTATE lifted so a 42501 is distinguishable; fingerprint + release recover grouping without a tracker |
| 02 | [The browser reports its own errors](issues/02-the-browser-reports-its-own-errors.md) | 01 | ✅ **done** — scrub list re-synced with the backend mirror; 19 unwired boundaries now report; chunk-load stays recoverable instead of being dropped |
| 03 | A request can be followed end to end | 01 | ✅ **done** — correlation id flows through `ObservabilityContext` into every log line |
| 04 | No failure is swallowed | 01 | ✅ **done** — crm/finance/build/payroll swept (4 payroll sites were remapping *any* error to a duplicate-key 409); the four fixed sites now carry unit specs asserting both the log-and-rethrow path and the genuine-23505 path |
| 05 | [Four alerts reach someone](issues/05-four-alerts-reach-someone.md) | 03, 04 | ✅ **done** — all four built; the tenant-context predicate could never fire against a real incident and now does; p95 no longer deferred |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
