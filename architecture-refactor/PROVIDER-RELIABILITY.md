# Provider Reliability — StreamlineOS Backend

> Lane 12 delivery — 2026-09-01.
> Covers: shared outbound seam, per-provider failure classification, at-least-once semantics,
> DLQ/replay runbooks, job cancellation inventory.

---

## 1. Already-Done Audit (verified against source)

| Item | File:line | Status |
|---|---|---|
| Shared HTTP timeout + SSRF guard | `common/http/outbound-request.ts:24` | DONE |
| Email backoff + dead-letter (8 attempts, exponential, capped 60 min) | `modules/email/email-outbox.service.ts:211` | DONE |
| Email transient classification | `modules/email/email.provider.ts:85` | DONE |
| Email provider timeout (30 s each) | `modules/email/email.provider.ts:17-18` | DONE |
| Email bounce/complaint webhook + signed verification (Svix + constant-time) | `modules/email/email-webhook.service.ts` | DONE |
| Email suppression at send time | `modules/email/email-suppression.service.ts:37` | DONE |
| Email outbox suppressed-row evidence | `modules/email/email-outbox.service.ts:57` | DONE |
| LLM timeout (30 s fast / 60 s standard) | `modules/ai/core/providers/llm.service.ts:86-87` | DONE |
| LLM retry + jitter + model-chain fallback | `modules/ai/core/providers/llm.service.ts:150` | DONE |
| LLM error classification (rate\_limit / overloaded / transient / fatal) | `modules/ai/core/providers/llm-retry.ts:80` | DONE |
| LLM honours provider Retry-After header | `modules/ai/core/providers/llm-retry.ts:104` | DONE |
| AI gateway credit reserve-before-call, in-flight dedup | `modules/ai/core/gateway/ai-gateway.service.ts:34` | DONE |
| Notification jittered backoff | `modules/notifications/notification-delivery-worker.service.ts:28` | DONE |
| Notification circuit breaker (per org+channel, in-process) | `modules/notifications/notification-circuit-breaker.ts` | DONE |
| Notification recipient re-auth at delivery | `modules/notifications/notification-delivery-worker.service.ts:227` | DONE |
| Outbox publisher: bounded retry, dead-letter, lifecycle suppression, lease fence | `common/outbox/outbox-publisher.service.ts:66` | DONE |
| InboxConsumer 4-state idempotency via (producerEventId, consumerName) unique index | `common/outbox/inbox-consumer.ts:37` | DONE |
| InboxConsumer aggregate-version monotonic guard | `common/outbox/inbox-consumer.ts:10` | DONE |
| ExternalEffectLedger: durable lease + token fence for external side effects | `common/outbox/external-effect-ledger.ts:59` | DONE |
| Workflow exponential backoff + full jitter | `common/workflow/retry-policy.ts:33` | DONE |
| Webhook dispatch: 10 s timeout, SSRF guard, signed delivery, manual retry route | `modules/webhooks/webhooks-dispatch.service.ts` | DONE |
| DLQ alerting scripts | `src/scripts/alert-dead-outbox.mjs`, `alert-dead-delivery.mjs` | DONE |
| Failure drill | `src/scripts/failure-drill.mjs` | DONE |
| Transient DB error detection (walks cause chain, avoids instanceof) | `common/db/transient-error.ts` | DONE |
| AI job cancel (QUEUED only) | `modules/ai/jobs/ai-jobs.service.ts:144` | DONE |
| Finance report export cancel | `modules/finance/reports/finance-report-export.service.ts:128` | DONE |
| Payroll export cancel | `modules/payroll/runs/payroll-export.controller.ts:69` | DONE |
| E-sign bulk job cancel (pending/in-progress only) | `modules/e-sign/sign-bulk-send.service.ts:199` | DONE |

### Consolidation vs Greenfield verdict per adapter

| Adapter | Verdict | Notes |
|---|---|---|
| Payment (Razorpay) | CONSOLIDATED — replaced inline retry loop | Inline loop had no jitter; now uses `callProvider` with full-jitter backoff and circuit breaker |
| Email | ALREADY DONE — not wrapped by seam | Email outbox already owns retry + dead-letter at the outbox level. The provider layer adds timeout (30 s) and `isTransientError`. Wrapping again would duplicate the control surface. |
| AI / LLM | ALREADY DONE — not wrapped by seam | LLmService owns timeout + jitter + model-chain fallback + error classification. AiGatewayService owns credit reserve/settle + dedup. Adding the seam on top would be a pass-through wrapper (banned). |
| Search | NOT APPLICABLE | Pure Postgres queries through SECURITY DEFINER function; no outbound HTTP. |
| Webhooks dispatch | STILL PENDING — see §5 | Raw `fetch` with AbortSignal.timeout; no retry, no circuit breaker. Webhooks are fire-and-forget with manual replay only. Adding `callProvider` here is the main open item. |
| Notifications | ALREADY DONE at delivery layer | `NotificationDeliveryWorker` owns its own per-(org,channel) circuit breaker, jittered backoff, and DEAD state after max attempts. The in-process scope is correct (see circuit breaker §2). |

---

## 2. Shared Outbound-Provider Seam

### Contract

```
callProvider<T>(
  descriptor: ProviderDescriptor,
  fn: () => Promise<T>,
  breaker?: ProviderCircuitBreaker,
  random?: () => number,        // injected for deterministic testing
): Promise<ProviderCallResult<T>>
```

`ProviderCallResult<T>` is a discriminated union — never throws on provider failure:
- `{ ok: true; value: T; attempts: number }`
- `{ ok: false; kind: "terminal"; error: Error; attempts: number }`
- `{ ok: false; kind: "dead-lettered"; error: Error; attempts: number }`
- `{ ok: false; kind: "circuit-open"; retryAfterMs: number; attempts: number }`

`ProviderDescriptor` fields:
- `provider` — stable string key; also the circuit breaker key
- `timeoutMs` — races the fn; fires `ProviderTimeoutError` at expiry
- `maxAttempts` — total calls including the first; bounded retry
- `baseDelayMs` / `maxDelayMs` — full-jitter exponential backoff window
- `classify(error) → "retryable" | "terminal"` — caller declares what the SDK actually throws

Files: `common/outbound/call-provider.ts`, `common/outbound/provider-circuit-breaker.ts`

### Circuit Breaker Design Choice

**Process-local, not Redis.** Sharing breaker state through Redis would add a network round trip to the hot path of every outbound call. A circuit breaker is a protection heuristic: the delivery row / outbox record is the correctness source of truth, so a duplicate probe from a second node during the cooldown window is bounded and acceptable. Revisit at multi-region scale when per-node probes demonstrably degrade a provider during recovery.

The `NotificationCircuitBreaker` (in-process, per org+channel) uses the same reasoning. The `ProviderCircuitBreaker` in `common/outbound/` is per provider key (provider-wide scope), not per tenant, because a provider outage is provider-wide.

### Backoff formula

Full-jitter (not a small wobble around the peak):
```
delay = round( min(base * 2^(attempt-1), max) * U(0.5, 1) )
```
`U(0.5, 1)` means uniform random in [50%, 100%] of the capped window. This spreads concurrent retry traffic uniformly across the entire backoff window, eliminating the thundering-herd on recovery.

---

## 3. Per-Provider Failure Classification

**Important trap — cross-realm postgres-js errors**: `postgres-js` errors are cross-realm in Node.js; `instanceof Error` is `false` for them (confirmed in MEMORY.md). `isTransientDbError` in `common/db/transient-error.ts` walks the cause chain and matches on `.code` / `.errno` / `.message` — never via `instanceof`.

| Provider | Retryable | Terminal | Dead-lettered |
|---|---|---|---|
| **Razorpay** | `OutboundRequestError` (timeout/network); 5xx HTTP | 4xx HTTP (bad credentials, invalid params); `RazorpayClientError` | After 3 attempts via `callProvider` |
| **Resend** | 429, 5xx; timeout | 400 (invalid recipient, attachment limit); invalid API key | After 8 attempts in email outbox |
| **ZeptoMail** | Connection timeout; 5xx | 4xx (invalid address, quota exhausted permanently) | After 8 attempts in email outbox |
| **OpenRouter / AI** | `rate_limit` (429); `overloaded` (503); `transient` (5xx, network) | `fatal`: 400 invalid request, 401/403 auth/permission, context length exceeded | After `maxRetriesPerModel` × model chain length; `ServiceUnavailableException` |
| **Outbox consumers (generic)** | Any error from consumer `handle()` | No explicit terminal class — all failures retry up to the retry ceiling | `DEAD` state in `outbox_events` after ceiling; `alert-dead-outbox.mjs` alerts within 24 h |
| **Webhook endpoints** | Network error; timeout; 5xx response | SSRF-blocked URL; none (all HTTP failures are logged and retried only via manual replay) | Manual replay via `POST /webhooks/:id/logs/:logId/retry` |
| **Notification delivery** | Provider call failure; transient DB error | `NO_PROVIDER` (no driver registered for channel) | `DEAD` status in `notification_deliveries` after max attempts |

### Error shape notes

- `OutboundRequestError` carries `outcome: "timeout" | "network-error" | "ssrf-blocked"` — classify by property, not `instanceof`.
- `EmailSendError` carries `permanent: boolean` — use `isTransientError(err)` which reads `.permanent`, never `instanceof`.
- LLM errors: `classifyLlmError(error)` in `llm-retry.ts` walks the cause chain for status codes and message fragments — never `instanceof Error` at the top level.

---

## 4. At-Least-Once Semantics

### Email

Email is at-least-once with suppression evidence. Every outgoing email passes through `EmailOutboxService.enqueueAndTry`:
1. Suppression check (platform-wide or tenant-scoped) — suppressed addresses write a `SUPPRESSED` row; no content is stored.
2. Row inserted as `PENDING`.
3. First delivery attempt immediately; on transient failure, row stays `PENDING` with `nextAttemptAt` scheduled via cron.
4. Up to 8 attempts with exponential backoff (capped 60 min); beyond that: `DEAD`.
5. `alert-dead-delivery.mjs` alerts on `DEAD` rows within a configurable window.

Bounce/complaint webhooks from Resend (Svix HMAC-SHA256) and ZeptoMail (shared secret, constant-time) write `email_suppressions` rows. A replay-window check (±5 min) prevents replay attacks on Svix webhooks.

### Notifications

Notifications are at-least-once per channel. `NotificationDeliveryWorker` re-checks recipient membership (`filterOrgMemberIds`) immediately before handing to a provider — a revoked membership cancels the delivery with `CANCELLED` status (not `DEAD`), since no failure occurred.

### Outbox (generic domain events)

The transactional outbox pattern (commit event row with aggregate) provides at-least-once delivery. Lease fencing (`IN_FLIGHT` + `leaseExpiresAt`) prevents duplicate execution across workers. `InboxConsumer.claim` provides idempotent application at the consumer side via `(producerEventId, consumerName)` unique index — 4 states: `IN_FLIGHT → COMPLETED | FAILED | SKIPPED`. Aggregate-version monotonic guard additionally suppresses out-of-order redeliveries.

`ExternalEffectLedger` covers effects that leave the process (email, webhook, etc.) where atomic commit is impossible. It records `uncertainRetryCount` for the crash window between provider acceptance and `SUCCEEDED` recording.

### Exports and long-running jobs

Export/import jobs are idempotent by `idempotencyKey` at enqueue time. The job row is the source of truth; if a worker dies mid-execution, the lease expires and another worker reclaims it. The at-least-once guarantee means a job may run twice if a worker crashes between completion and lease release — export jobs must write to idempotent storage (R2 pre-keyed path) to tolerate this.

---

## 5. Delivery-Time Recipient Re-Authorization

**Implemented** for notification deliveries: `NotificationDeliveryWorker` line 227 calls `filterOrgMemberIds` immediately before handing the payload to a provider. A revoked, suspended or removed membership cancels the delivery row.

**Spec**: `modules/notifications/notification-recipient-send-auth.spec.ts` — covers non-member targets returning `notified=0`, member+non-member mix returning only the member, and the gate-bites proof (neutering `filterOrgMemberIds` to return both shows both rows, proving the gate is load-bearing).

**Email**: The suppression service (`findSuppressed`) runs at the point of `enqueueAndTry` (enqueue time), not at retry time. For permission-sensitive email (e.g., invitation emails sent to a specific role), the controller must not enqueue if the recipient's entitlement is revoked before send. The outbox retry does not re-check permissions — it re-sends if not suppressed. This is acceptable for transactional mail (a leave approval email to a recently-offboarded employee will bounce and be suppressed after the hard-bounce webhook). For future permissioned email types (e.g., payroll payslips), the delivery worker should re-check the recipient's employment status before retrying, matching the notification delivery pattern.

---

## 6. Email Templates

Email templates currently live in `modules/email/templates/` as hardcoded English strings. No locale or version field exists.

**Current state:** All 30+ template functions return a single hardcoded HTML string. The `base.ts` `getEmailTemplate` wraps with a shared branded layout. No i18n infrastructure.

**Pending design** (not yet implemented — scope is large, touches 30+ files):
1. Each template function accepts an optional `locale: string = "en"` parameter.
2. Template strings are extracted to a map keyed by `(templateKey, locale)`.
3. Fallback chain: `locale → locale's base language (en-GB → en) → "en"` — deterministic, never throws.
4. Template version is a constant per template function, included in the outbox row for audit.
5. Test: unknown locale falls back to "en" rather than throwing or returning an empty string.

This is marked **STILL PENDING** — Lane 12 cannot implement it without touching 30+ files across a large unrelated refactor. The runbook below describes the replay path for email failures in the interim.

---

## 7. DLQ / Replay Runbooks

### Outbox events (generic domain events)

**Detect:** `node src/scripts/alert-dead-outbox.mjs --hours=24` — exits 1 if any `DEAD` rows within the window.

**Inspect:** `node src/scripts/report-outbox-events.ts` — per-org breakdown of pending/in-flight/dead counts and oldest event age.

**Replay:** Reset `delivery_state = 'PENDING'`, clear `lease_expires_at` and `last_error`, bump `retry_count = 0` on the target row inside a tenant transaction. The next publisher flush picks it up.

```sql
-- Owner-role access, run in a migration or manual SQL session with the org GUC set.
UPDATE outbox_events
SET delivery_state = 'PENDING', lease_expires_at = NULL, last_error = NULL, retry_count = 0
WHERE outbox_event_id = '<id>'
  AND organization_id = '<org_id>'
  AND delivery_state = 'DEAD';
```

**Domain-specific notes:**
- **Billing** — outbox events for `subscription.updated`, `seat.reserved`. Replay is safe; the consumer checks current subscription state.
- **Payroll** — outbox events for payslip delivery. Replay re-sends the payslip email; suppression prevents double-delivery to suppressed addresses.
- **Build/PM** — outbox events for ticket assignment, sprint state changes. Replay re-dispatches notifications; InboxConsumer dedupes by `(producerEventId, consumerName)`.
- **Chat** — outbox events for message delivery. InboxConsumer + version guard prevents duplicate application.
- **Calendar** — outbox events for event invites. Safe to replay; calendar row is the source of truth.
- **Knowledge** — outbox events for page publish, space membership changes. Replay re-indexes/re-notifies; idempotent by design.
- **Workflows** — outbox events for workflow step completion. Workflow runner holds its own idempotency via job row + `leaseExpiresAt`.

### Email outbox (`email_outbox` table)

**Detect:** `node src/scripts/alert-dead-delivery.mjs` — exits 1 if `DEAD` rows exist.

**Inspect:** `SELECT id, to_email, subject, status, attempts, last_error FROM email_outbox WHERE status = 'DEAD' ORDER BY created_at DESC LIMIT 100;`

**Replay:** Reset the row to `PENDING`, clear `last_error`, reset `attempts` and `next_attempt_at`. The cron sweep retries on the next tick. Only viable if the underlying error is resolved (provider back up, address un-suppressed).

```sql
UPDATE email_outbox
SET status = 'PENDING', attempts = 0, last_error = NULL,
    next_attempt_at = NOW()
WHERE id = <id>
  AND status = 'DEAD';
```

**Do not replay suppressed rows.** `SUPPRESSED` status is a policy decision — replaying it re-sends to a hard-bounced or spam-complained address and degrades domain reputation.

### Notification deliveries

**Detect:** `alert-dead-delivery.mjs` covers notification_deliveries DEAD state.

**Replay:** Reset `notification_deliveries` row to `PENDING`, reset `attempt_count`. The delivery worker picks it up on the next tick.

**Re-auth on replay:** The delivery worker re-checks membership at pickup time (`filterOrgMemberIds`) — a revoked membership will immediately CANCEL the replayed row.

### Payments (Razorpay)

No outbox for payment events. Orders are created synchronously; if `callProvider` returns `dead-lettered`, the API call to the client fails and the client must retry. No server-side job to replay.

**Circuit breaker replay:** After a Razorpay outage, the `razorpayBreaker` (process-local) resets automatically after the cooldown window. No manual intervention required.

### Webhooks (customer-configured endpoints)

Manual replay only: `POST /webhooks/:endpointId/logs/:logId/retry`. No automatic retry or circuit breaker on the outgoing webhook path. To add automatic retry, wire the dispatch through `callProvider` (currently the webhook dispatcher uses raw `fetch`).

---

## 8. Job Cancellation Inventory

| Job type | Route | Cancellable | How | Terminal state |
|---|---|---|---|---|
| AI job | `POST /ai/jobs/:jobId/cancel` | Yes — QUEUED only | Sets `status = 'CANCELLED'` | CANCELLED |
| Finance report export | `POST /accounting/reports/export/jobs/:jobId/cancel` | Yes — PENDING/RUNNING | Sets `status = 'cancelled'`, clears lock | cancelled |
| Payroll export | `POST /payroll/runs/jobs/:jobId/cancel` | Yes — PENDING/RUNNING | Delegates to same service pattern | cancelled |
| E-sign bulk job | via `sign-bulk-send.service.cancel()` | Yes — pending/in-progress | Sets `status = 'cancelled'`, emits outbox event | cancelled |
| HR CSV export | `hr-export-jobs.service.ts` | Not cancellable | No cancel route exists; worker holds the lease until completion or timeout | N/A |
| HR CSV import | `hr-import.service.ts` | Not cancellable | Import is a multi-step workflow; cancellation is not modelled | N/A |
| CRM import | `crm-import.service.ts` | Not cancellable | Import stages are sequential; cancellation is not implemented | N/A |
| GDPR export | `gdpr-export.service.ts` | Not cancellable | Privacy-law-required job; cancellation would leave data subject without their export | Non-cancellable by design |
| Calendar export | `calendar-export.service.ts` | Not cancellable | Synchronous query + ICS generation; no async job | N/A |
| KB search indexing | background sweep | Not cancellable | No job record; runs as an in-process sweep per org | N/A |

**Non-cancellable by design:**
- **GDPR export** — a data subject access request must complete; cancelling it would violate the DPDP/GDPR obligation. If the job is stuck, the operator must debug and replay, not cancel.
- **HR/CRM import** — these are multi-step workflows where partial cancellation would leave data in an inconsistent state. The correct operator action is to let the job fail and rely on the revert service (`crm-import-revert.service.ts`, `hr-import-commit.service.ts` rollback path).

**Note:** `POST /accounting/reports/export/jobs/{jobId}/cancel` is bodyless — Lane 1 confirmed this in the same program batch.

---

## 9. What Is Still Pending

| Item | Reason not completed | Recommended path |
|---|---|---|
| Webhook dispatcher `callProvider` wiring | The webhook dispatch path uses raw `fetch` + AbortSignal. Adding `callProvider` requires wrapping the deliver method and deciding retry semantics for customer webhooks (exponential backoff, max 5 attempts). No migration required. | Wrap `deliver()` in `callProvider` with a `classify` fn that maps `OutboundRequestError` → retryable and non-2xx from endpoint → retryable (customer servers may be briefly down). |
| Email template locale + version | 30+ template files require locale parameter; no i18n infrastructure exists. Large refactor — §6 documents the design. | Add `locale: string = "en"` parameter, extract strings to locale maps, fallback chain `locale → lang → "en"`. One template at a time. |
| Delivery-time re-auth for email retries | Email retry worker does not re-check recipient permissions/employment status. | Add `filterOrgMemberIds` call in `processRetries()` for employment-sensitive templates (payslips). |
| Redis-backed circuit breaker for multi-node | Process-local breakers diverge across nodes. | Add a Redis tier on top of `ProviderCircuitBreaker` using `INCR` + `EXPIRE` for failure count and `SET NX PX` for the open flag. Tier-1 (process-local) stays for latency; Redis is tier-2 for cross-node coordination. |
| Locale fallback test | Depends on locale infrastructure not yet built. | Write alongside the template locale refactor. |

---

## 10. Validation — Spec Output

### `common/outbound/call-provider.spec.ts` (11 tests, all green)

```
PASS src/common/outbound/call-provider.spec.ts
  callProvider — timeout fires
    ✓ returns dead-lettered when fn never resolves within timeoutMs (75 ms)
    ✓ bites: neutering the timeout by replacing wrapWithTimeout would make this test hang (91 ms)
  callProvider — retry budget is bounded
    ✓ calls fn exactly maxAttempts times when it always rejects as retryable (31 ms)
    ✓ stops on first success even if budget remains (16 ms)
  callProvider — backoff has jitter
    ✓ providerBackoffMs with random=0 gives the lower bound (50% of window) (1 ms)
    ✓ providerBackoffMs with random=1 gives the upper bound (100% of window)
    ✓ providerBackoffMs grows exponentially with attempt, capped by maxDelayMs (1 ms)
    ✓ two consecutive failing calls receive different backoff delays due to jitter (3 ms)
  callProvider — circuit breaker opens and half-opens
    ✓ opens after threshold failures and returns circuit-open without calling fn (1 ms)
    ✓ half-opens: the first attempt after the cooldown is passed through as a probe (120 ms)
  callProvider — terminal failure is NOT retried
    ✓ calls fn exactly once when it throws a terminal error (1 ms)

Tests: 11 passed — Time: 2.306 s
```

### `common/outbox/inbox-consumer-concurrent.spec.ts` (3 tests, all green)

```
PASS src/common/outbox/inbox-consumer-concurrent.spec.ts
  InboxConsumer — concurrent double-delivery
    ✓ exactly one of two concurrent claims returns true when the unique index fires (12 ms)
    ✓ second concurrent claim returns false without reading or updating status (1 ms)
    ✓ bites: if onConflictDoNothing always returns a row, both claims succeed (1 ms)

Tests: 3 passed — Time: 2.674 s
```

### `modules/notifications/notification-recipient-send-auth.spec.ts` (4 tests, all green)

```
PASS src/modules/notifications/notification-recipient-send-auth.spec.ts
  NotificationDispatchService — recipient authorization at send time
    ✓ creates no notification or delivery rows when all targets are non-members (26 ms)
    ✓ returns notified=0 when filterOrgMemberIds returns empty (5 ms)
    ✓ notifies only the subset of targets that are active org members (6 ms)
    ✓ bites: if filterOrgMemberIds is stubbed to include the stranger, the stranger row appears (7 ms)

Tests: 4 passed — Time: 4.65 s
```

### `modules/notifications/notification-retry-bounded.spec.ts` (2 tests, all green)

```
PASS src/modules/notifications/notification-retry-bounded.spec.ts
  NotificationDeliveryWorker — retry bounded and non-duplicating
    ✓ moves to DEAD when the maximum attempt count is reached (17 ms)
    ✓ requeues with backoff below the maximum attempt count (3 ms)

Tests: 2 passed — Time: 4.828 s
```

### `modules/billing/payments/adapters/razorpay.adapter.spec.ts` (16 tests, all green after callProvider refactor)

```
PASS src/modules/billing/payments/adapters/razorpay.adapter.spec.ts
  RazorpayAdapter
    [...16 tests, all ✓...]

Tests: 16 passed — Time: 2.352 s
```
