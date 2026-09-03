# PRD-C173 — production logs, traces and release metadata with redaction

**Captured 2026-09-03** on `release/code-10-10-v2`.
Backend SHA `45f8a2e99494483526e357e27f18c76961ebf266`, frontend SHA `7469d27895add587f9427e7c50c457f56e0048bf`.
Raw output in `raw/`. Every command below was actually run; exit codes are appended to each file.

## Verdict

| Element of PRD-C173 | State |
|---|---|
| Structured production logs | **Met** — installed process-wide, verified at runtime |
| Redaction | **Met** — proven applied on the hot path, not merely defined |
| Traces | **Met in code** — W3C `traceparent` emitted, joined and echoed; no collector attached (a deployment decision) |
| Release metadata plumbing | **Met** — `release` stamped on every log line, error report and async hop |
| Release metadata *value* | **NOT met** — nothing ever sets `APP_RELEASE`, so the field is the literal `"unknown"` in every environment |

## Redaction is on the hot path

The criterion is only satisfied if redaction actually runs, so the call chain was traced to its
installation point and then exercised at runtime.

```
backend/src/main.ts:75   app.useLogger(structuredNestLogger)
  -> nest-logger.adapter.ts:71   logger[level](text, meta)
       -> logger/logger.service.ts:36   ...(meta !== undefined ? { meta: redact(meta) } : {})
```

`main.ts:75` converts every one of the ~70 modules that construct a Nest `Logger`, plus the
framework's own startup and error output, in one place. Also installed at boot:

```
backend/src/main.ts:81   setErrorReporter(new LogErrorReporter())
backend/src/main.ts:82   setSpanExporter(new LogSpanExporter())
backend/src/main.ts:106  app.use(correlationIdMiddleware)
```

**Runtime proof** (`raw/04-hot-path-runtime-probe.txt`, exit 0). A log call carrying a password and
an API key was pushed through the *installed adapter*, and the actual bytes written to stdout were
captured:

```json
{"timestamp":"2026-09-03T16:29:31.621Z","level":"info","message":"user signed in",
 "correlationId":"corr-1","release":"deadbeef1234567","cellId":"cell-x","orgId":"org-1",
 "meta":{"context":"AuthService","params":"[redacted]"}}
```

Neither secret appears. The probe source is `raw/09-hot-path-probe.spec.ts.txt`; it asserts the
absence of both literals rather than eyeballing the line.

Supporting suites (`raw/05-observability-specs.txt`, exit 0): **55 tests across 5 suites** —
`redact.spec.ts`, `pii-redaction.spec.ts`, `nest-logger.adapter.spec.ts`, `logger.service.spec.ts`,
`log-context-completeness.spec.ts`.

## The gate

`pnpm -C backend check:log-secrets` — **exit 0** (`raw/01`):

```
Scanned    3650 source files
TIERS map  101 entries
Redactor   23 substrings + 18 exact names
OK — no plaintext secret logging found, all @UseRateLimit keys are in TIERS,
and every name this gate guards is withheld by the runtime redactor.
```

`check:log-secrets:self-test` — **exit 0**, 15 checks (`raw/02`). It is non-vacuous: it proves the
gate catches a secret in a log line *and* a template-literal leak, misses an already-redacted line,
and — the part that matters — cross-checks that every name the gate guards is actually withheld by
`redact.ts`. A name in one list but not the other is reported as a gap, so the gate and the runtime
redactor cannot drift apart silently.

## Traces

`backend/src/common/observability/tracing.ts` implements W3C trace context directly rather than
pulling in the OpenTelemetry SDK. `correlation-id.middleware.ts` starts a span per request, joins an
inbound `traceparent` instead of replacing it, and echoes the header back with this span's id. Spans
are exported through a `SpanExporter` port; `LogSpanExporter` is wired at boot.

The file states the trade-off plainly: the SDK is "a dependency, a collector endpoint and a
deployment decision, none of which exist yet", and emitting real `traceparent` now means attaching a
collector later is an exporter implementation rather than a re-instrumentation. **Pointing a
collector at this is a deployed-environment task**, not a repository one.

## Finding: `APP_RELEASE` is never set

`currentRelease()` (`observability/release.ts:13`) reads `process.env["APP_RELEASE"]` and returns
the literal string `"unknown"` when it is unset or blank. That value is stamped on:

- every log line with a request context — `logger.service.ts:28`
- every error report — `log-error-reporter.ts:55`
- every async hop — `async-hop.ts:74`
- the request context itself — `correlation-id.middleware.ts:76`

Searched the whole backend outside `node_modules` and `.claude/worktrees`. `APP_RELEASE` appears
only in `.env.example:10` (blank), `env.validation.ts:38` (optional), the reader, the consumers and
tests. **Nothing sets it.** The `Dockerfile` declares only `NODE_ENV` and `TZ` — no `ARG`/`ENV` for
it — and no workflow in `.github/workflows/` exports it.

So the release-metadata half of PRD-C173 is fully plumbed and entirely unpopulated: today every
production log line would read `"release":"unknown"`, and "which deploy caused this spike?" cannot
be answered from the logs. `release.ts:10` even says *"Set it in CI to the commit sha"* — that step
was never taken.

**Remediation** (small, but outside this ticket's write scope): a build arg in the `Dockerfile`
plumbed to `ENV APP_RELEASE`, set from the commit SHA at build time, plus the same in whatever
deploys the image.

The `failure-drill` `bad-release` drill exists for exactly this and refuses to fake a result: in
execute mode it returns `blocked`, and its self-test asserts `badReleaseNotFakePass`
(`raw/06`, exit 0). It names `log-context-completeness.spec.ts` as the deterministic assertion,
which passes here.

## Classification

- **(A) Runnable, and run:** the two `check:log-secrets` gates, the five observability suites, the
  runtime hot-path probe, `failure-drill:self-test`, `ops:evidence:self-test`.
- **(B) Needs a deployed environment:** a trace collector endpoint; `APP_RELEASE` supplied by a real
  build pipeline; log shipping to an aggregator.
- **(C) Needs a named human:** none for C173.
