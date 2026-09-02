# Ticket 31 — structured, redacted, tenant-safe telemetry

Backend = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`.

Two sessions. **Session S8** built the seam and closed five of the six boxes; its findings are
kept below under *Prior round*. **This round** re-audited every claim against current source and
closed the one box that was left open — trace context across all eight PRD §9 boundaries.

---

## The open box: all eight boundaries, and what each one actually did

The prior round declared the AI stream the only remaining gap. That was true when it was
written and is no longer: session S3 closed it. It was also incomplete — two boundaries it
listed as closed were not.

| # | Boundary | State before this round | Seam |
|---|---|---|---|
| 1 | HTTP request | propagating | `common/http/correlation-id.middleware.ts` |
| 2 | Database adapter | propagating | `db/query-telemetry.ts`, `db/pool-telemetry.ts` |
| 3 | Cache adapter | propagating | `common/cache/cache.service.ts` |
| 4 | Provider adapter | **partly — the pinned webhook transport sent nothing** | `common/outbound/call-provider.ts`, `common/http/outbound-request.ts`, `common/outbound/safe-webhook-transport.ts` |
| 5 | Outbox publication | propagating (producer *and* consumer) | `common/outbox/outbox-writer.ts`, `outbox-publisher.service.ts` |
| 6 | Queue / event consumer | **partly — the workflow drain restored nothing** | `common/workflow/workflow-outbox-relay.service.ts`, `workflow-runner.service.ts` |
| 7 | Cron job | propagating | the middleware (every cron entry point is an HTTP controller) + `common/tenant/for-each-org.ts` |
| 8 | AI stream | propagating — closed by S3/ticket 12, not by me | `modules/ai/core/telemetry/ai-correlation.ts` |

### P1 — the workflow drain filed every run under the cron tick that picked it up

`workflow_runs.correlation_id` has existed since the runtime shipped. `startRun` wrote it. **No
projection that read a run back ever named it**: `claimDueRuns`' `RETURNING` list stopped at
`max_attempts`, `RunRecord` had no field to put it in, and `WorkflowRunnerService.drain`
therefore executed every run — every step, every error report, every span — inside whatever
context `/cron/workflow-tick` happened to be carrying.

This is precisely the failure mode the checkbox describes, and it is the expensive one because
nothing about it looks wrong: the id *is* persisted, every line *is* structured, and the join is
simply absent. The producer half was right and the consumer half was never wired.

`boundDrain()` is why it hid. Its doc comment says *"Used by the relay, so the run a request
caused is traceable back to that request even though it executes long after the response"* —
a precise description of the requirement, attached to a method with **zero callers**
(`grep -rn boundDrain src` → one hit, its own definition). `CronWorkflowService.tick()` calls
`runner.drain()` directly. Deleted.

Fixed by projecting the column, carrying it on `RunRecord`, and wrapping `runOne` in the restore
seam with a `workflow.run` span.

### P1 — the DNS-pinned webhook transport sent no trace context at all

`postSafeWebhook` (`common/outbound/safe-webhook-transport.ts`) is the one outbound path that
cannot go through `outboundRequest`: it pins DNS to the addresses the SSRF guard resolved, which
`fetch` cannot express, so it reimplements the transport on `node:https` — and reimplemented the
omission with it. No `traceparent`, no `x-correlation-id`, no span. Its two callers deliver
customer webhooks (`modules/webhooks/webhooks-dispatch.service.ts`,
`modules/build/core/projects-webhooks-dispatch.service.ts`), so a tenant's own delivery arrived
at the receiver with nothing to continue, and a failure at the far end could not be joined to the
change that triggered it.

Now merged in, with two constraints that matter:

- **A caller's header always wins**, matched case-insensitively. A webhook signature covers the
  header set the adapter chose; replacing one would fail verification at every receiver, which is
  a far more expensive failure than a missing trace.
- **The span name is a constant (`provider.webhook`), not the target host.** A customer's webhook
  hostname is that customer's data, and a span name is not somewhere the redactor can reach.

### One seam for both halves of a hop

The restore block existed twice already (outbox publisher, workflow relay) and was about to exist
a third time. It is now `common/observability/async-hop.ts`:

- `correlationIdToPersist(explicit?)` — the producer half. Returns `null` rather than a fresh id
  when there is no ambient context, because minting at write time stamps the row with an id that
  appears on no other line anywhere: it reads as a correlation and joins to nothing, which is
  strictly worse than a null.
- `runInRestoredContext(hop, fn)` — the consumer half. `runWithObservabilityContext`, never
  `bindObservabilityContext`, because inheriting the sweep is the bug. Mints only when the row
  genuinely carries nothing, and opens the span inside the restored context so the trace and the
  log lines agree.

Publisher, relay and drain all run through it. `randomUUID()` now appears **once** across the
three consumers — inside the helper — and a spec pins that.

---

## Changes this round (all backend, all under `src/common/`)

- `src/common/observability/async-hop.ts` — **new.** The producer/consumer seam above.
- `src/common/observability/index.ts` — exports `correlationIdToPersist`, `runInRestoredContext`, `AsyncHop`.
- `src/common/workflow/workflow-store.ts` — `correlation_id` added to `claimDueRuns`' `RETURNING`
  and mapped onto the record; `startRun` defaults the column through `correlationIdToPersist`.
- `src/common/workflow/workflow-runner.ts` — `RunRecord.correlationId`.
- `src/common/workflow/workflow-runner.service.ts` — `runOne` restores the run's context and opens
  a `workflow.run` span; dead `boundDrain` removed.
- `src/common/workflow/workflow-outbox-relay.service.ts` — refactored onto the shared seam.
- `src/common/outbox/outbox-publisher.service.ts` — refactored onto the shared seam.
- `src/common/outbound/safe-webhook-transport.ts` — trace headers merged without overwriting;
  `provider.webhook` span.
- New specs: `src/common/observability/async-hop.spec.ts` (9),
  `src/common/observability/trace-boundary-coverage.spec.ts` (22),
  `src/common/workflow/workflow-correlation-hop.spec.ts` (6),
  `src/common/outbound/webhook-trace-propagation.spec.ts` (6).

### The spec that actually tests the requirement

`workflow-correlation-hop.spec.ts` walks one intent across four process boundaries — request →
outbox row → relay → `workflow_runs` → claim → drain — and at each hop asserts two things: the
observed id **is** the request's, and it **is not** the tick's. Only the second assertion catches
the failure that happens in practice, which is a consumer quietly inheriting whatever ambient
context it is running inside. Everything is driven through the real `OutboxWriter`, the real
relay, the real `claimDueRuns` and the real `WorkflowRunnerService`, with the whole drain executed
inside a deliberately different ambient context standing in for the cron tick.

`trace-boundary-coverage.spec.ts` is the complement and is deliberately source-level. Behaviour
specs cannot catch a *ninth* entry point being added without propagation, or a `RETURNING` list
losing a column — the exact defect above, which no fake-driver test can see because the fake
returns what it is told to regardless of the SQL. It enumerates all eight boundaries, asserts the
primitive each one reaches for, asserts the join key survives each projection that reads a row
back, and asserts no consumer mints its own id.

---

## Gates (every one run and its output read)

| Gate | Result |
|---|---|
| `npx jest --runInBand` across the whole seam (12 path patterns) | **61 suites, 749 tests, 0 failed** |
| the four new specs | 43 tests, 0 failed |
| `pnpm -s check:log-secrets` | exit 0 — **3525** files, 97 TIERS, 23+18 redactor names |
| `pnpm -s check:log-secrets:self-test` | exit 0 — **15/15** |
| `pnpm -s check:alert-system` | `{"allPassed":true,"checkedScripts":14}` |
| `pnpm -s check:outbox-consumers` | exit 0 — 25 emitted types, 28 consumed, all covered |
| `pnpm -s check:fire-and-forget` | exit 0 — 1829 files, 0 violations |
| `madge@8 --circular --extensions ts src` | **no circular dependency** (5448 files) |
| `npx eslint` on all 12 changed/new files | exit 0, clean |
| `pnpm typecheck` (`tsconfig.build.json`, 8 GB heap) | **exit 2 — 3 errors, none mine** (below) |
| `pnpm -s check:spec-typecheck` | **exit 2 — 23 errors, none mine** (below) |

### Bite proofs (each revert applied, run, read, and reverted back)

- Remove `correlation_id` from `claimDueRuns`' `RETURNING` → `trace-boundary-coverage.spec.ts`
  **1 failed / 28**. Note the behaviour spec stays green here, which is the point of having both:
  its fake driver returns the column whatever the SQL says.
- Bypass `runInRestoredContext` in `runOne` → `workflow-correlation-hop.spec.ts` **2 failed / 6**,
  received id equal to the tick's.
- Drop the header merge in `postSafeWebhook` → `webhook-trace-propagation.spec.ts` **2 failed / 6**.

### The two red typechecks are not this ticket's

`pnpm typecheck`: `modules/feedbucket/feedbucket-public.controller.ts:352`,
`modules/storage/storage-onboarding.controller.ts:166`, `modules/storage/storage.controller.ts:199`
— all the same `AfterCommitHook` signature mismatch (`() => void` vs `() => Promise<unknown>`), all
in files another session has modified in the shared working tree right now.

`check:spec-typecheck`: 23 errors — 18 under `modules/storage/`, plus `degradation/object-storage.spec.ts`
(same `compressAndPreGenerateKey` refactor), `modules/feedbucket/tests/*` and
`modules/rbac/permission-catalog-sync.service.spec.ts`. **Zero errors under `src/common/observability/`,
`src/common/workflow/`, `src/common/outbound/`, `src/common/outbox/` or `src/db/`** — verified by
grepping the full error list, not by assumption.

---

## For other agents / the orchestrator

- **Ticket 33 (uploads) and whoever owns feedbucket** — you have three live `AfterCommitHook` type
  errors in the shared tree (paths above). They are the whole of the backend's red typecheck.
- **Three durable queues restore no context**, all outside this territory, all a one-line fix now
  that `runInRestoredContext` exists — wrap the per-row body in
  `runInRestoredContext({ correlationId: row.correlationId, orgId, route })`:
  - `modules/notifications/notification-outbox-relay.service.ts` (ticket 29's neighbourhood)
  - `modules/payroll/jobs/payroll-jobs-worker.service.ts` (ticket 24) — `payroll_jobs` already has a
    `correlation_id` column **and an index on it**, so somebody intended this join and it was never
    written or read.
  - `modules/email/email-outbox.service.ts` — `email_outbox` has no correlation column at all;
    adding one is a migration, so this one is a decision, not a one-liner.
- **S3 / ticket 12: nothing needed.** The AI-stream requirement the prior round routed to you is
  done — `resolveAiCorrelationId()` defaults from `getObservabilityContext()`. Verified in source
  and now pinned by `trace-boundary-coverage.spec.ts`, which will fail if either
  `ai-correlation.ts` or `ai-call-metrics.ts` stops reaching for it. If AI streaming grows a
  *new* entry point, it needs `resolveAiCorrelationId()`, not `randomUUID()`.
- **Ticket 33 (uploads), still open from the prior round** — three files interpolate a tenant's
  **filename into the log message**, where the redactor cannot reach it:
  `common/security/virustotal-av-scanner.ts:43,98`, `common/security/clamd-av-scanner.ts:37,75,80`,
  `common/security/av-scan.ts:61`, `common/media/media-compression.service.ts:151,183`. Move the
  filename into the meta object (`{ filename }`) and it is withheld automatically.
- **`alert-workflow-stranded.mjs` and `alert-retention-dead-man.mjs` are still not among the 14
  scripts `check:alert-system` verifies.** Both are DB/Redis-backed rather than log-string-backed,
  so no inert-predicate risk, but their self-tests are never run by the meta-gate.
- **Cross-repo spec paths** — `common/slo/slo-catalogue.spec.ts` and
  `common/rbac/module-registry-fields.spec.ts` still resolve the frontend repo by
  `join(BACKEND_ROOT, "..")` and fail on this machine's layout. Not a defect in either spec's
  subject; they need the `backendPath`-style helper the other cross-repo specs use.

---

## Prior round (session S8) — kept for the record

The seam was already largely built and verified unchanged: `common/observability/`
(AsyncLocalStorage context, W3C `traceparent` parse/format, span port with a log exporter,
error-reporter port, SQLSTATE lifting, error fingerprints, key-based redaction, seam budgets, a
Nest logger adapter), `main.ts` wiring all of it, spans at the HTTP edge, database and cache, and
after-commit hooks already pairing `bindObservabilityContext` with `runInNewTenantTransaction`.

Defects found and fixed then:

- **P0 — bind values were being logged.** Drizzle raises `DrizzleQueryError` with the message
  `Failed query: <sql>\nparams: <bind values>`, so the values a failing statement was about to write
  live *in the message*, where no key-based redactor can reach them. Five generic handlers re-emitted
  it verbatim, and `OutboxPublisherService.handleFailure` also **stored** it in
  `outbox_events.last_error`, which `alert-dead-outbox.mjs` prints to an operator's terminal. Fixed
  once, in `truncateForLog`.
- **P1 — the log-secrets gate and the runtime redactor disagreed.** The gate treated `accessKey`,
  `bearer` and `jwt` as dangerous; `redact.ts` withheld none of the three. CHECK 3 (redactor parity)
  added; it parses both lists and compares them.
- **P1 — every outbox event committed with `correlation_id = null`.** Not one of the 38
  `OutboxWriter.emit` call sites ever set it. Now defaulted at the single write site.
- **P1 — a deliberately raised 5xx produced total silence.** `AllExceptionsFilter` returned from the
  `HttpException` branch with no log line and no error report at any status. Split at 500.
- **P2 — tenant data on log lines.** Query strings (search terms, email filters) reduced to parameter
  names; `email`/`phone`/`to`/`cc`/`bcc`/`subject`/`recipient`/`prompt`/`filename` now withheld;
  background sweeps now emit `orgId` at the top level.
