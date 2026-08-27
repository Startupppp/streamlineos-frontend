# c20 — A failure in production is visible

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 5 retired.

Structured JSON logging, redaction, correlation context and the two error-reporter ports exist on both sides, and **both now have a production adapter installed** — structured logs, no vendor, per the operator decision.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Errors reach a person | — | ✅ **done** — `backend/src/common/observability/` error-reporter port with `LogErrorReporter` wired at `main.ts:69`; SQLSTATE lifted from the postgres-js cause chain via `error-classification.ts`, emitted as `sqlstate` + `errorClass: "tenant-context"`; `error-fingerprint.ts` groups incidents without a tracker; `redact.ts` deny-lists 22 keys (passwords, PAN, CVV, OTP, connection strings, Postgres `detail`). Real gap closed: the unhandled-rejection handler was log-only and now calls `reportError`. Alert-on-new-error-type is the one genuine give-up. |
| 02 | The browser reports its own errors | 01 | ✅ **done** — `frontend/lib/observability/console-reporter.ts` mirrors the backend port shape; `redact.ts` deny-list re-synced to backend (8 missing keys added, size caps aligned); 19 of 197 `error.tsx` boundaries were reporting nothing and are now wired via `reporting-route-error-boundary.tsx`; chunk-load classifier extended to match `error.name` not just message; stale-deploy errors reported with `recoverable: true` instead of silently dropped. 6 suites / 40 tests. |
| 03 | A request can be followed end to end | 01 | ✅ **done** — hand-rolled console logger replaced with structured JSON; correlation id (set by `common/http/correlation-id.middleware.ts`) flows through `ObservabilityContext` into every log line including service and outbox layers; stdout/stderr output is aggregator-agnostic; correlation stability asserted by test. |
| 04 | No failure is swallowed | 01 | ✅ **done** — all six in-scope modules swept (inventory, payroll, support, quotes, sales, timesheets); four real bugs fixed in payroll: bare `catch {}` in `profiles.service.ts`, `entities.service.ts`, and `payroll-jobs.service.ts` remapped any DB error to a false-duplicate 409; `.catch(() => undefined)` on `markFinished` in `payroll-calendar-reminder.scheduler.ts:183` silenced secondary failures. Three spec files assert the log-and-rethrow path and verify a genuine 23505 still yields `ConflictException` without an error log (the inverse guard). |
| 05 | Four alerts reach someone | 03, 04 | ✅ **done** — three scripts under `backend/src/scripts/` (`alert-dead-outbox.mjs`, `alert-sig-failures.mjs`, `alert-tenant-ctx-errors.mjs`); p95 via `alert-p95.mjs` reading `message="SPAN"` lines from `LogSpanExporter` wired at `main.ts:69`; tenant-context predicate was matching a string no log line ever contained — fixed by ticket 01 lifting SQLSTATE from the cause chain; span names normalised (UUID/hex/digits → `:id`) for meaningful per-route percentiles; exit code 2 when no SPAN lines found flags an unwired exporter. |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
