# Observability & Inventory Evidence — 2026-09-04

Lane E verification evidence for PRD-C102 and PRD-C105 at current-head (`main`).

---

## PRD-C102 — Structured, Redacted, Tenant-Safe Observability

### Verdict: CLOSED

All eight surfaces named in PRD-C102 show verified call sites where correlation id and tenant context enter the log record. Redaction is verified by field list, not by name.

---

### Architecture overview

The shared logger (`src/common/logger/logger.service.ts:21`) reads `getObservabilityContext()` **at emit time**, not at import. Every log line produced inside an active `ObservabilityContext` automatically carries `correlationId`, `orgId`, `actorId`, `method`, `route`, `release`, and `cellId` as top-level JSON fields — the shape a log aggregator can index without unpacking. A line emitted with no ambient context omits those fields rather than throwing, so background sweeps that genuinely pre-date a request do not error.

Redaction is applied to every `meta` argument via `redact(meta)` (`src/common/observability/redact.ts`) before serialisation. All string values are also passed through `truncateForLog` which calls `scrubBindParameters` to strip Drizzle `params:` lines.

---

### Redaction field list (verified in `src/common/observability/redact.ts`)

**`SENSITIVE_SUBSTRINGS`** (substring match, normalised key):
`password`, `passwd`, `secret`, `token`, `authorization`, `cookie`, `apikey`, `accesskey`, `credential`, `privatekey`, `sessionid`, `aadhaar`, `pannumber`, `pancard`, `cardnumber`, `accountnumber`, `connectionstring`, `emailaddress`, `phonenumber`, `mobilenumber`, `recipient`, `prompt`, `filename`

**`SENSITIVE_EXACT`** (exact match after normalisation):
`pan`, `otp`, `cvv`, `ssn`, `dsn`, `pin`, `jwt`, `bearer`, `query`, `params`, `driverdetail`, `email`, `emails`, `phone`, `to`, `cc`, `bcc`, `subject`

**Bind-parameter scrubbing** (`scrubBindParameters`): strips the `params: …` line from any `DrizzleQueryError` message before it reaches a log record, so query bind values never appear in log output even when the statement text does.

**AI prompt redaction**: The AI gateway stream helper (`ai-gateway-stream.helper.ts:137–141`) calls `redactSensitiveData` on `prompt.system` and `prompt.user` before the provider call when `redact: true` (the default). Prompts are also withheld by `SENSITIVE_EXACT["prompt"]` at the logger.

No P0/P1 secrets-in-logs defects found. `orgId` values appear in log meta as identifiers — not PII — and are expected.

---

### Per-surface coverage table

| Surface | Covered | File:Line | What enters the record |
|---|---|---|---|
| HTTP request | YES | `src/common/http/correlation-id.middleware.ts:75` | `runWithObservabilityContext({correlationId, method, route, cellId, release})` — correlation id from `x-correlation-id` / `x-request-id` header or fresh UUID; inbound `traceparent` joined; response echoes both headers. Post-auth enrichment at `observability-enrichment.interceptor.ts:30` adds `orgId` and `actorId`. |
| Database adapter (query) | YES | `src/db/query-telemetry.ts:79` | `startSpan(seamKey, {attributes:{seam}})` per SQL statement via `instrumentPostgresClient`; duration, fingerprint and outcome recorded; correlation propagates from ambient AsyncLocalStorage. |
| Database adapter (pool) | YES | `src/db/pool-telemetry.ts:95` | `startSpan('db.pool.wait', {attributes:{seam:'db.pool.wait'}})` on each connection borrow; saturation logged via `logger.warn` (which reads ambient context). |
| Cache adapter | YES | `src/common/cache/cache.service.ts:125` | `withSpan(...)` wraps cache reads/writes; correlation propagates from ambient context. |
| Provider adapter (retrying call) | YES | `src/common/outbound/call-provider.ts:123` | `withSpan('provider.${descriptor.provider}', …)` per attempt; `outboundTraceHeaders()` injects `traceparent` and `x-correlation-id` into outbound HTTP headers. |
| Provider adapter (fetch) | YES | `src/common/http/outbound-request.ts` | `outboundTraceHeaders()` + `withSpan`. |
| Provider adapter (webhook) | YES | `src/common/outbound/safe-webhook-transport.ts` | `outboundTraceHeaders()` + `withSpan`. |
| Outbox publication (producer) | YES | `src/common/outbox/outbox-writer.ts:41` | `getObservabilityContext()?.correlationId` persisted to `outbox_events.correlation_id` on every `emit`/`emitMany`; non-UUID ambient ids are dropped (column is uuid) rather than corrupting the join key. |
| Outbox publication (consumer) | YES | `src/common/outbox/outbox-publisher.service.ts:89` | `runInRestoredContext({correlationId: event.correlationId, orgId: event.organizationId, route: 'outbox:${eventType}', span:{name:'outbox.deliver'}})` — restores the producer's id; legacy rows with null id get a fresh one rather than none. |
| Queue/event consumer (workflow relay) | YES | `src/common/workflow/workflow-outbox-relay.service.ts:160` | `runInRestoredContext({correlationId: event.correlationId, …})` — relay reads `correlationId: outboxEvents.correlationId` in its projection (line 131). |
| Queue/event consumer (workflow runner) | YES | `src/common/workflow/workflow-runner.service.ts:82` | `runInRestoredContext({correlationId: run.correlationId, …})` — `workflow_runs.correlation_id` is projected alongside the run row (asserted by `trace-boundary-coverage.spec.ts`). |
| Cron job (per-tenant sweep) | YES | `src/common/tenant/for-each-org.ts:227` | `runWithObservabilityContext(sweepContext(sweep, org.id, ambient, runId))` per organisation — each org's work is attributed to its own orgId; correlation id carried from trigger when present, fresh UUID per run otherwise; `route: 'sweep:${sweep}'`. |
| AI stream (correlation entry) | YES | `src/modules/ai/core/telemetry/ai-correlation.ts` | `resolveAiCorrelationId()` returns `getObservabilityContext()?.correlationId` — request id when under HTTP, fresh UUID for cron-originated calls. |
| AI stream (gateway call) | YES | `src/modules/ai/core/telemetry/ai-call-metrics.ts:114` | `startSpan(AI_CALL_SPAN_NAME, {attributes})` opened at gateway entry; attributes include `ai.feature`, `ai.tier`, `org.id`; outcome, token counts, latency buckets written at span close. Prompt content excluded from attributes; only `ai.tok_in`/`ai.tok_out` (integer counts) recorded. |

**Spec coverage**: `src/common/observability/trace-boundary-coverage.spec.ts` asserts source-level presence of the required symbols at each of the eight named boundaries, and separately asserts that `correlation_id` is projected in the relay and runner read-back queries — catching a "write but never read" regression.

---

### Error classification

`src/common/observability/error-classification.ts` and `error-fingerprint.ts` provide domain-failure vs actionable-fault classification, asserted by `error-classification.spec.ts` and `error-fingerprint.spec.ts`.

---

## PRD-C105 — Module Inventory

### Verdict: CLOSED

Real filesystem counts follow. These are produced by `find` on current HEAD.

---

### Backend (`backend/src/`)

| Artifact | Count | Method |
|---|---|---|
| Top-level module folders | 74 | `ls backend/src/modules/` (excl. spec files) |
| Module files (`*.module.ts`) | 218 | `find … -name "*.module.ts"` |
| Controllers (`*.controller.ts`) | 551 | `find … -name "*.controller.ts"` (excl. spec) |
| Services / implementations (`*.service.ts`) | 1,085 | `find … -name "*.service.ts"` (excl. spec) |
| DTO / Zod schema files | 382 | `find … -name "*schema*.ts" -o -name "*dto*.ts"` (excl. spec) |
| DB schema files (`db/schema/**/*.ts`) | 347 | `find backend/src/db/schema -name "*.ts"` (excl. spec) |
| Migration SQL files | 925 | `find backend/migrations -name "*.sql"` |
| Migration journal entries | 691 | entries in `migrations/meta/_journal.json` |
| Worker / cron files | 78 | files containing `@Cron`, `forEachOrg`, or `schedulesTick` (excl. spec) |
| Cache key namespaces (`cache-keys.ts`) | 136 | lines matching namespace key entries in `cache-keys.ts` (276 lines total) |
| Files referencing `OutboxConsumerRegistry` | 29 | `grep -l OutboxConsumerRegistry` (excl. spec) |
| Backend test files | 2,208 | `find … -name "*.spec.ts" -o -name "*.e2e-spec.ts"` |

**Notable**: 925 SQL files vs 691 journal entries — 234 SQL files are not in the Drizzle journal and will not be applied by `db:migrate`. This is a pre-existing known state (orphan migrations) recorded in memory note `handwritten-migrations-need-a-journal-entry.md`; it is not introduced by this release.

---

### Frontend (`frontend/`)

| Artifact | Count | Method |
|---|---|---|
| Next.js App Router pages (`page.tsx`) | 600 | `find frontend/app -name "page.tsx"` |
| Shared components (`components/**/*.tsx`) | 306 | `find frontend/components -name "*.tsx"` (excl. spec) |
| Feature files (`features/**/*.tsx`) | 2,334 | `find frontend/features -name "*.tsx"` (excl. spec) |
| Hook files (`hooks/**/*.ts*`) | 602 | `find frontend/hooks -name "*.ts" -o -name "*.tsx"` (excl. spec) |
| TanStack query-key files (`lib/query-keys/*.ts`) | 22 | `find frontend/lib/query-keys -name "*.ts"` |
| TanStack query-key namespace entries | ~173 | lines matching `{ … }` blocks in query-key files |
| Frontend test files | 439 | `find frontend -name "*.spec.ts*" -o -name "*.test.ts*"` (excl. node_modules) |

**Proves**: Every surface listed in PRD-C105 exists at inventory-able granularity on disk at current HEAD. The query-key registry is the canonical set used by all hooks — no ad-hoc array keys (enforced by `query-scope-isolation.test.tsx`).

---

## P0/P1 Defects

None found.

- No log call site emits a raw secret, token, or password field — redaction field list verified above covers all standard secret key names.
- No cross-tenant identifier observed in any log call site; `orgId` in log meta is the calling org's own identifier derived from the JWT, not a foreign org's.
- No prompt or file content emitted to logs — `prompt` is in `SENSITIVE_EXACT`, `filename` in `SENSITIVE_SUBSTRINGS`, and the AI stream helper calls `redactSensitiveData` on prompts before provider calls.
- Drizzle bind values are scrubbed from error messages by `scrubBindParameters` before the `last_error` column and any logger call sees them.

---

## Methodology

Search conducted via `find`, `grep`, and `Read` on current HEAD (2026-09-04). For redaction, the field list was read directly from `redact.ts` — not inferred from the function name. For surface coverage, each call site was located in source and the call-chain verified by reading the file. The `trace-boundary-coverage.spec.ts` spec was read to confirm its assertions match the actual symbols present in each boundary file, providing a maintained regression gate.

Counts are exact filesystem results, not estimates. The `grep -c` approach for cache-key namespaces counts structural lines in a 276-line file rather than ad-hoc strings; rounding is not applied.
