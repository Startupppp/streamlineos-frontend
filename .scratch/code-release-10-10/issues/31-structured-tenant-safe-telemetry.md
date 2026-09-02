# 31 — Structured, redacted, tenant-safe logs, metrics and traces

**What to build:** One user intent is traceable through HTTP, database, cache, provider adapters, outbox publication, queue and event consumers, cron jobs and AI streams — without any of it logging something that must not be logged.

**Blocked by:** None — can start immediately.

**Status:** done except the AI-stream boundary (session S3's territory)

- [ ] Trace context propagates across every named boundary, correlating asynchronous work back to the originating intent.
  - Closed for HTTP, database, cache, provider adapters, outbox publication, queue/event consumers and cron jobs: `npx jest src/common/observability src/common/logger src/common/outbox src/common/outbound src/common/http src/common/tenant src/common/workflow src/scripts/alert-log-predicate-parity.spec.ts src/scripts/alert-seam-parity.spec.ts src/scripts/alert-delivery.spec.ts --maxWorkers=2` → 48 suites, 440 tests, 0 failed.
  - BLOCKED — AI streams. `src/modules/ai/core/gateway/ai-gateway.service.ts` mints `const correlationId = randomUUID()` at 7 entry points with no reference to the ambient observability context, so every AI call and every `ai_usage_logs` row is an orphan trace. `src/modules/ai/**` is session S3's exclusive territory; the fix is to default that id from `getObservabilityContext()?.correlationId`.
- [x] No secret, token, prompt, file content or sensitive bind value is logged anywhere on these paths.
  - `pnpm -s check:log-secrets` → exit 0, **3493** source files scanned (was 3008 — it covered only `src/modules` + `src/common`, so `src/db`, `src/main.ts`, `src/health` and `src/degradation` were unscanned).
  - `pnpm -s check:log-secrets:self-test` → exit 0, **15/15** checks (was 10), including the new redactor-parity check.
  - Bind values: `npx jest src/common/observability/bind-parameter-redaction.spec.ts --maxWorkers=2` → 11/11. Drizzle's `DrizzleQueryError` message is `Failed query: <sql>\nparams: <bind values>`; it is now scrubbed in `truncateForLog`, the single chokepoint every logged string passes through.
- [x] Expected domain failures are classified separately from actionable faults, so a normal 404 does not page anyone.
  - `npx jest src/common/http/failure-classification.spec.ts --maxWorkers=2` → 8/8. A 4xx `HttpException` neither logs nor reports; a deliberately raised 5xx now does both (it previously did neither).
- [x] Every log line carries tenant context without carrying tenant data.
  - `npx jest src/common/observability/log-context-completeness.spec.ts src/common/tenant/__tests__/for-each-org.spec.ts --maxWorkers=2` → 4 + 15 tests, 0 failed. Background sweeps now emit `orgId` and `route` at the top level of every line.
  - Tenant data removed: query strings are reduced to their parameter names in the exception filter, and `email`/`phone`/`to`/`cc`/`bcc`/`subject`/`recipient`/`prompt`/`filename` are now withheld by the redactor. `npx jest src/common/observability/pii-redaction.spec.ts --maxWorkers=2` → 21/21, with the two "FINDING — DECISION REQUIRED" cases flipped to assert redaction.
- [x] Any alert predicate is verified against the exact string the emitting line produces — a predicate grepping for text no log line contains is silently inert.
  - `npx jest src/scripts/alert-log-predicate-parity.spec.ts --maxWorkers=2` → **19/19**. Every log-string predicate is parsed out of its alert script and matched against the parsed emitting source: `message === "SPAN"` vs `LogSpanExporter`, `"pool saturated"` vs `pool-telemetry.ts`, `"db.pool.wait"` vs the span it opens, `"42501"` vs `SQLSTATE_INSUFFICIENT_PRIVILEGE`, `"signature verification failed"` vs `integrations-git.service.ts`, and the three `cron:heartbeat:` job keys vs their `withLease(...)` call sites. All matched; no inert predicate found.
  - `pnpm -s check:alert-system` → `{"allPassed":true,"checkedScripts":14}`.
- [x] After-commit hooks and outbox consumers carry explicit tenant context; they do not inherit a request scope that no longer exists.
  - `npx jest src/common/outbox/outbox-trace-context.spec.ts --maxWorkers=2` → 7/7, including a case proving the publisher does **not** inherit an ambient context when one exists.
  - After-commit hooks already did this (`tenant-context.interceptor.ts` pairs `bindObservabilityContext` with `runInNewTenantTransaction`); verified, not changed.
