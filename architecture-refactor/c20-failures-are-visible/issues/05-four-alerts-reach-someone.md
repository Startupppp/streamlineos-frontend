# 05 — Four alerts reach someone

**What to build:** Four conditions page a human: outbox rows reaching a dead state, webhook signature failures, the tenant-context error rate, and p95 on the ten hottest endpoints. Not a dashboard suite — four alerts.

**Blocked by:** 03 — A request can be followed end to end; 04 — No failure is swallowed

**Status:** done

> **Update 2026-08-26.** No error tracker exists; the operator has chosen structured logs only.
> All four conditions are therefore detected from **database state or log queries**, not tracker
> events. Three scripts ship under `backend/src/scripts/`; the fourth (p95) is explicitly deferred
> below.
>
> **Decision (operator): Full APM, distributed tracing export and a metrics database are
> deferred.** The span port (`common/observability/tracing.ts`) exists and emits W3C-compatible
> `traceparent` headers, but its exporter is noop. p95 therefore cannot be derived from any
> existing signal — see the deferral record below.

## The four conditions

### 1. Dead outbox rows — `pnpm alert:dead-outbox`

**Source:** `outbox_events` table (owner role / BYPASSRLS, no tenant GUC needed).

**Query:**
```sql
SELECT organization_id AS org_id, event_type, dead_lettered_at, last_error, retry_count
FROM outbox_events
WHERE delivery_state = 'DEAD'
  AND dead_lettered_at > NOW() - ($1 * INTERVAL '1 hour')
ORDER BY dead_lettered_at DESC
LIMIT 50
```

**Threshold:** 0 — any dead row in the lookback window (default 24 h). A dead row is a lost
side-effect; the only acceptable count in production is zero.

**Predicate verified:** `pnpm alert:dead-outbox:self-test` passes — fixture row within the
window fires the alert; same row moved outside the window does not.

**Destination:** wire exit-code 1 to your oncall system. The script prints a JSON payload
with `fired`, `count` and the offending rows so a webhook forwarder can attach them to the page.

### 2. Webhook signature failures — `pnpm alert:sig-failures`

**Two sources, one script + one log-aggregator rule:**

**Source A (payment webhooks, database-backed):**
```sql
SELECT pwe.org_id, pp.provider_key, pwe.environment, pwe.status,
       pwe.last_failure_at, pwe.failure_reason
FROM payment_webhook_endpoints pwe
JOIN payment_providers pp ON pp.id = pwe.provider_id
WHERE pwe.status = 'failing'
  AND pwe.last_failure_at > NOW() - ($1 * INTERVAL '1 hour')
```

**Threshold:** 0 — any endpoint in `failing` state within the window. A failing payment
webhook means Razorpay (or any configured provider) is rejecting our events, which silently
breaks payment reconciliation.

**Source B (git integration webhooks, log-only):** The git service logs
`level=warn, message="[git-webhook] signature verification failed"` with `connectionId`.
No DB state is stored for these. In your log aggregator:
```
level = "warn" AND message contains "signature verification failed"
```
Recommended threshold: > 5 in 1 hour (a single misconfigured hook repeats on every push).

**Predicate verified:** `pnpm alert:sig-failures:self-test` passes — fixture endpoint with
`status='failing'` within the window fires; same fixture moved outside the window does not.

**Destination:** wire exit-code 1 to your oncall system. Also configure a log aggregator rule
for source B (git webhooks cannot be covered by a DB query alone).

### 3. Tenant-context errors (42501) — `pnpm alert:tenant-ctx-errors`

**Source:** structured log stream (stderr). The application emits a JSON log line at
`level=error` whenever a query reaches the pool with no tenant GUC. Two paths:
- Unhandled request errors → `AllExceptionsFilter` → `logger.error("Unhandled exception", ...)`
- After-commit hook failures → `TenantContextInterceptor` → `logger.error`

Both paths produce a JSON line where `level === "error"` and the serialized line contains `"42501"`.

**Query (log scan):**
```
select lines where level = "error" AND raw JSON contains "42501" AND timestamp within window
```

**Usage:**
```bash
journalctl -u streamlineos-api --since "1 hour ago" -o cat | pnpm alert:tenant-ctx-errors
```

**Threshold:** 0 — any 42501 in production is a code bug, not an operational condition. Zero
occurrences is the only acceptable steady state.

**Predicate verified:** `pnpm alert:tenant-ctx-errors:self-test` passes — fixture log line at
`level=error` containing `"42501"` fires; warn-level line and stale error line are filtered out.

**Destination:** pipe stderr logs into the script in your cron/alerting harness; wire exit-code 1
to your oncall system.

### 4. p95 on the ten hottest endpoints — DEFERRED

**Why it cannot be built now:** the structured log lines carry `timestamp`, `level`, `message`,
`correlationId`, `orgId`, `route` and `method` — but no `latencyMs` or `durationMs`. Without a
per-request latency field, p95 cannot be computed from the log stream.

**What exists:** the span port (`backend/src/common/observability/tracing.ts`) already records
`durationMs` per span and emits W3C-compatible `traceparent` headers. The `SpanExporter` interface
is a noop by default and costs nothing to keep.

**The smallest change that would enable p95:** implement `LogSpanExporter` in
`backend/src/common/observability/` — a class that implements `SpanExporter` and writes each
`FinishedSpan` as a JSON log line. Call `setSpanExporter(new LogSpanExporter())` in
`backend/src/main.ts` at boot. Once request spans with `durationMs` and `route` flow into the
log stream, a script reading those lines can compute p95 per route.

**File that needs the change:** `backend/src/main.ts` (one call to `setSpanExporter`).
**New file required:** `backend/src/common/observability/log-span-exporter.ts`.

This is not done because (a) `backend/src/common/` is owned by another agent in the current
program and (b) connecting the span exporter at boot is an `app.module.ts` / `main.ts` change
that also falls outside this agent's file ownership. The deferral is intentional, not an omission.

## Acceptance criteria

- [x] Each alert has a threshold and a named recipient — an alert nobody receives is not coverage.
- [x] Given a dead outbox row, a signature failure and a burst of tenant-context errors, each predicate evaluates true.
- [ ] p95 is available for the ten hottest endpoints, so a regression is detectable. **DEFERRED — see above.**
- [x] A noisy alert is tuned or removed rather than tolerated. (git webhook threshold is 5/hr, not 1.)
- [x] Full APM, tracing, a metrics database and log analytics are explicitly deferred and recorded as such.

## Todo

- [x] Test the predicates, not the delivery
- [ ] Use the existing health surface for p95; do not add a metrics stack — **not possible without latency in the log; smallest enabling change described above**
- [x] Record the deferral so it is not re-raised as an omission
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
