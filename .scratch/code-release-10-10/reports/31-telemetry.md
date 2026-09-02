# Ticket 31 — structured, redacted, tenant-safe telemetry (session S8)

Backend = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`. No git commands were run.

## Audit result before writing anything

The seam is real and largely built, so most of this ticket was closing gaps rather than
standing anything up. Already present and verified, not changed:

- `common/observability/` — AsyncLocalStorage observability context, W3C `traceparent`
  parse/format, a span port with a log exporter, an error-reporter port with a log adapter,
  SQLSTATE lifting, error fingerprints, key-based redaction, seam budgets, a Nest logger adapter.
- `main.ts` wires all of it (`useLogger`, `setErrorReporter`, `setSpanExporter`, event-loop monitor).
- Spans already existed at the HTTP edge (`correlation-id.middleware.ts`), the database
  (`db/pool-telemetry.ts`, `db/query-telemetry.ts`) and the cache (`cache.service.ts`).
- After-commit hooks already carried explicit tenant context — `tenant-context.interceptor.ts`
  pairs `bindObservabilityContext` with `runInNewTenantTransaction`.
- `CronOutboxRetentionService` no longer does a global DELETE; it iterates `forEachOrg`.
- All 14 scripts under `check:alert-system` pass, and every log-string alert predicate I
  traced matches a real emitting line. No inert predicate found.

## Defects found and fixed

**P0 — bind values were being logged.** Drizzle raises `DrizzleQueryError` with the message
`Failed query: <sql>\nparams: <bind values>`, so the values a failing statement was about to
write live *in the message*, where no key-based redactor can reach them. Five generic handlers
re-emitted it verbatim: `AllExceptionsFilter.describeUnhandled`, `forEachOrg`'s per-organisation
catch (whose own comment names the format), the after-commit drain, `logSideEffectFailure`, and
`OutboxPublisherService.handleFailure` — which also *stored* it in `outbox_events.last_error`,
which `alert-dead-outbox.mjs` prints to an operator's terminal. Fixed once, in `truncateForLog`,
the single chokepoint every logged string passes through. `params` added to the redactor's
exact-key set. 11 specs.

**P1 — the log-secrets gate and the runtime redactor disagreed.** `check-log-secrets.mjs`
treats `accessKey`, `bearer` and `jwt` as dangerous; `redact.ts` withheld none of the three, so
a value under any of those keys was printed verbatim on every path the static scan cannot see.
The gate was asserting its own constants. Added CHECK 3 (redactor parity), which parses both
lists and compares them. Proof it bites: removing `"jwt"` and `"bearer"` from `redact.ts` and
re-running gives exit 1 with `FAIL bearer / FAIL jwt`; restored immediately.

**P1 — every outbox event committed with `correlation_id = null`.** The column has existed since
the outbox was introduced and **not one of the 38 `OutboxWriter.emit` call sites ever set it**
(`grep -A12 'OutboxWriter.emit' | grep -c correlationId` → 0), so nothing downstream — the
publisher, the workflow relay, a consumer's log lines — could be joined back to the request that
caused it. `correlation-id-stability.spec.ts` "proved" the join by passing the id in by hand,
which is a capability assertion, not a behaviour one. Now defaulted at the single write site from
the ambient context (dropped when it is not UUID-shaped, since the column is a uuid and the edge
accepts arbitrary caller-supplied ids).

**P1 — a deliberately raised 5xx produced total silence.** `AllExceptionsFilter` returned from
the `HttpException` branch with no log line and no error report at any status, so
`InternalServerErrorException` / `ServiceUnavailableException` / a `BadGatewayException` from an
adapter reached nobody. Split at 500: 4xx stays silent (a 404 must not page), 5xx logs and reports.

**P2 — tenant data on log lines.** (a) The exception filter logged `req.url` including the query
string — search terms, email filters — into both the log line and the error report; now reduced
to the path plus the parameter *names*. (b) `pii-redaction.spec.ts` carried two tests titled
"FINDING — DECISION REQUIRED" pinning that `email` and `phone` were *not* redacted. This ticket is
that decision: they are now, along with `to`/`cc`/`bcc`/`subject`/`recipient`/`emailAddress`/
`prompt`/`filename`. Blast radius checked first — only `modules/email/*` used `to:`/`subject:` as
log-meta keys. (c) Background sweeps emitted no `orgId` at the top level at all.

## Changes (all backend, absolute paths)

- `src/common/observability/redact.ts` — `scrubBindParameters`; scrub inside `truncateForLog`;
  `accesskey`/`emailaddress`/`phonenumber`/`mobilenumber`/`recipient`/`prompt`/`filename` substrings;
  `jwt`/`bearer`/`params`/`email`/`emails`/`phone`/`to`/`cc`/`bcc`/`subject` exact; `redactAttributes`
  now scrubs string values; both lists exported for the parity gate.
- `src/common/http/all-exceptions.filter.ts` — 5xx `HttpException` logged + reported; query string
  reduced to `queryKeys`.
- `src/common/http/outbound-request.ts` — `withSpan` + `traceparent`/`x-correlation-id` merged into
  outbound fetch headers, never overwriting a header the adapter set.
- `src/common/outbound/call-provider.ts` — `outboundTraceHeaders()`; one span per attempt.
- `src/common/outbox/outbox-writer.ts` — correlation id defaulted from ambient context.
- `src/common/outbox/outbox-publisher.service.ts` — delivery runs inside an explicit
  `runWithObservabilityContext` built from the row plus an `outbox.deliver` span; `last_error` scrubbed.
- `src/common/tenant/for-each-org.ts` — per-organisation observability context (`orgId`, `route`,
  `cellId`, `release`), correlation id carried from the trigger; the failure log now names the tenant
  at the top level.
- `src/common/workflow/workflow-outbox-relay.service.ts` — per-event explicit context.
- `src/scripts/check-log-secrets.mjs` — scope widened from `src/modules`+`src/common` to all of `src`
  (3008 → 3493 files); `prompt` added; CHECK 3 redactor parity; self-test 10 → 15 checks.
- New specs: `src/common/observability/bind-parameter-redaction.spec.ts` (11),
  `src/common/outbox/outbox-trace-context.spec.ts` (7),
  `src/common/outbound/provider-trace-propagation.spec.ts` (5),
  `src/common/http/failure-classification.spec.ts` (8),
  `src/scripts/alert-log-predicate-parity.spec.ts` (19).
- Extended specs: `src/common/observability/pii-redaction.spec.ts` (two FINDING tests flipped, one
  added), `src/common/tenant/__tests__/for-each-org.spec.ts` (+4),
  `src/common/http/outbound-request.spec.ts` (+3).

## Gates run (output read, not assumed)

| Gate | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` (8 GB heap) | **exit 0, 0 errors** |
| `pnpm -s check:log-secrets` | exit 0 — 3493 files, 97 TIERS, 23+18 redactor names |
| `pnpm -s check:log-secrets:self-test` | exit 0 — 15/15 |
| `pnpm -s check:alert-system` | `{"allPassed":true,"checkedScripts":14}` |
| jest across the whole seam | **48 suites, 440 tests, 0 failed** |
| `eslint` on every changed file | clean except one pre-existing `process.env.CELL_ID` error in `for-each-org.ts` (line 40, untouched code) |

The seam jest command: `npx jest src/common/observability src/common/logger src/common/outbox
src/common/outbound src/common/http src/common/tenant src/common/workflow
src/scripts/alert-log-predicate-parity.spec.ts src/scripts/alert-seam-parity.spec.ts
src/scripts/alert-delivery.spec.ts --maxWorkers=2`.

## Not closed

**Checkbox 1 is not ticked — the AI-stream boundary is outside my territory.**
`src/modules/ai/core/gateway/ai-gateway.service.ts` does `const correlationId = randomUUID()` at
**seven** entry points (`embedQueryWithCredit`, `invokeStructured`, `invokeStructuredWithUsage`,
`invokeStructuredWithImage`, `invokeText`, and three more) with no reference to the ambient
observability context. Every AI call and every `ai_usage_logs` row is therefore an orphan trace
that cannot be joined to the user intent that caused it — which also means
`alert-tenant-cost.mjs`'s per-tenant AI spend cannot be attributed to a request.
**One-line fix for session S3:** default it from `getObservabilityContext()?.correlationId`
(exported from `src/common/observability`), falling back to `randomUUID()`.

## For other agents / the orchestrator

- **S3 (tickets 09–13):** the AI correlation-id gap above. Everything else in the seam is ready
  for it — the context is already live on the request path.
- **Ticket 33 (uploads):** three files interpolate a tenant's **filename into the log message**,
  where the redactor cannot reach it — `src/common/security/virustotal-av-scanner.ts:43,98`,
  `src/common/security/clamd-av-scanner.ts:37,75,80`, `src/common/security/av-scan.ts:61`,
  `src/common/media/media-compression.service.ts:151,183`. Move the filename into the meta object
  (`{ filename }`) and it is withheld automatically. I did not edit these — they are yours.
- **Three jest suites are red across `src/common` and are not mine, and two are a machine-layout
  artefact, not a defect:**
  - `src/common/slo/slo-catalogue.spec.ts` — `REPO_ROOT = join(BACKEND_ROOT, "..")`, but the
    runbooks live at `streamlineos-frontend/architecture-refactor/final-refactor/evidence/
    40-observability/FAILURE-RUNBOOKS.md` on this machine. I temporarily repointed it and the suite
    passes **18/18** — so every SLO objective and every dispatchable alert *does* point at a runbook
    heading that exists. Restored the file; it needs the `backendPath`-style helper other cross-repo
    specs use.
  - `src/common/rbac/module-registry-fields.spec.ts` — same class (reads the frontend `ProductKey`
    union across repos).
  - `src/common/pagination/list-query.schema.spec.ts` — 20 failures in the paging schemas; belongs
    to whoever owns the pagination/query work.
- **Concurrent-agent noise:** during my runs `tsc` twice reported errors that were gone minutes
  later — `src/health/readiness.service.ts` (ticket 32) and `src/common/auth/jwt-keyring.service.ts`
  (S4). My own final typecheck is exit 0.
- **`alert-workflow-stranded.mjs` and `alert-retention-dead-man.mjs` are not in the 14 scripts
  `check:alert-system` verifies.** Both are DB/Redis-backed rather than log-string-backed, so no
  inert-predicate risk, but their self-tests are never run by the meta-gate. Worth adding.
