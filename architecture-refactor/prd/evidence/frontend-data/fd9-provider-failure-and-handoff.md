# FD9 — Provider Failure and Maintenance Handoff

**Source revision:** frontend `a61e8f6a6` / backend `d3bf57982` (2026-09-12).
**Evidence class:** source inspection + unit test with passing exit code.
No database, server, browser or production credential was accessed.

---

## 1. Provider-call inventory

Every outbound network call that could interact with an open database transaction:

| Path | Provider | Inside a DB transaction? | Timeout | Verdict |
|---|---|---|---|---|
| `modules/email/email.provider.ts` — `sendViaResend` | Resend API | No — called from service layer after `runInTenantTransaction` commits | 30,000 ms (`withTimeout`) | PASS |
| `modules/email/email.provider.ts` — `sendViaZeptomail` | ZeptoMail API | No — same call path | 30,000 ms (`withTimeout`) | PASS |
| `modules/organization/core/lib/invitation-mail-ops.ts:118` — `resendInvitation` | EmailService | No — `runInTenantTransaction` commits at line 105; email fires at line 118 | 30,000 ms via provider | PASS; regression test confirms txDepth = 0 |
| `modules/organization/core/lib/invitation-mail-ops.ts:208` — `cancelInvitation` | EmailService | No — fired `void` after the transaction block | 30,000 ms via provider | PASS |
| `modules/organization/core/invitation-create.service.ts:361` — `deliverInvitation` | EmailService | No — called after `runInTenantTransaction` returns; falls back via `registerAfterCommit` | 30,000 ms via provider | PASS |
| `modules/billing/payments/adapters/razorpay.adapter.ts` — `callProvider` | Razorpay | No — `billing-payment-activation.ts` calls `provider.createOrder()` outside its transaction block | 10,000 ms (`_orderTimeoutMs`) | PASS |
| `modules/billing/core/billing-payment-activation.ts:212` — `adapter.fetchPayment` | Razorpay | No — called before `runActivationTransaction`; that function contains only DB reads/writes | 10,000 ms | PASS |
| `modules/billing/core/stripe.service.ts` — `createOrder`, `fetchOrder` | Stripe API | N/A — only `byProviderKey()` is called in production (signature verification, no network) | None | DORMANT in active path |
| `modules/billing/core/razorpay.service.ts` — `createOrder`, `fetchOrder` | Razorpay API | N/A — `PlatformPaymentRegistry` is used only from `stripe-webhook.service.ts` | None | DORMANT in active path |
| `common/outbox/outbox-publisher.service.ts` — consumer `handle()` | Various (webhooks, LLM) | YES — each consumer runs inside `runInNewTenantTransaction` | Bounded by `withDeliveryDeadline` | MITIGATED; see §2 |

---

## 2. Findings (most severe first)

### FINDING A — Outbox consumers run INSIDE a tenant transaction (mitigated)

**File:line:** `backend/src/common/outbox/outbox-publisher.service.ts:172–184`

**Pattern:** Every outbox consumer's `handle()` runs inside `runInNewTenantTransaction`. Two live consumer chains call a provider from inside it:
- `ProjectsWebhooksDispatchService` — 5 attempts × 10 s + 15 s backoff ≈ 65 s worst case
- `ExpenseSubmittedConsumer` — reaches an LLM through `AutomationService → aiNodeExecutor`

Both exceed `idle_in_transaction_session_timeout` (60 s per `withTenant`). Without mitigation, Postgres kills the connection; `retryCount` never advances and the event replays indefinitely, stalling all other tenants' events in serial-batch order.

**Mitigation in place:** `withDeliveryDeadline` (`outbox-delivery-deadline.ts:82`)
- Deadline = `idle_in_transaction_session_timeout − 15_000 ms` (typically 45,000 ms)
- Uses `Promise.race([work, deadline])` to abandon a stuck consumer before Postgres does
- On abandonment: transaction rolls back, connection is released, retry is recorded, `retryCount` advances, dead-letter fires eventually
- Abandoned promise's rejection is forwarded to `onAbandoned` (never silently swallowed)
- Existing test: `outbox-delivery-deadline.spec.ts` — "gives up on a consumer that never answers, and records a retry instead of hanging" and "leaves room for the longest bounded consumer chain in the repo"

**Blast radius without mitigation:** one customer webhook endpoint that never answers stalls every other tenant's outbox events until the idle guard kills the connection — then the event replays from the start.
**Blast radius with mitigation:** a stuck consumer is abandoned at 45 s, transaction rolls back cleanly, batch continues.

**Residual risk:** The mocked `outbox-delivery-deadline.spec.ts` mocks `runInNewTenantTransaction`, so it does not prove real transaction tracking. Accepted: `withDeliveryDeadline` is a `Promise.race` over the real work; correctness is not dependent on the transaction mock.

### FINDING B — Old payment services have no timeout (dormant path)

**Files:** `modules/billing/core/stripe.service.ts:88,151` and `modules/billing/core/razorpay.service.ts:46,86`

Both wrap bare `fetch()` calls with no `signal: AbortSignal.timeout(...)` or timeout wrapper. In the active billing path, the new `RazorpayAdapter` (10 s, circuit-breaker-backed) is used via `PlatformMerchantService`. The old services are only reached from `PlatformPaymentRegistry`, which is only called by `stripe-webhook.service.ts` for `byProviderKey()` — that performs signature verification with no outbound network call. `forCurrency()` is unused in production paths.

**Blast radius:** None today. If `PlatformPaymentRegistry.forCurrency()` is ever called from a tenant transaction, the unbounded `fetch()` will hold that connection until the OS TCP timeout or `idle_in_transaction_session_timeout` kills it.
**Recommendation for OPS-001 scope:** add `signal: AbortSignal.timeout(10_000)` to both services when they are activated, before any production use.

### FINDING C — Email calls outside transactions already carry 30 s timeouts (PASS)

`email.provider.ts` wraps both Resend and ZeptoMail in `withTimeout(promise, 30_000, label)`. Every invitation path calls email after `runInTenantTransaction` has returned, so a slow provider blocks only the HTTP request, not a pooled connection.

---

## 3. Regression test

**File:** `backend/src/modules/organization/core/__tests__/fd9-provider-failure-connection-release.spec.ts`

**Subject:** `resendInvitation` (`invitation-mail-ops.ts`) — the primary invitation path that calls a real network provider.

**Test run:**

```
pnpm jest --testPathPattern="fd9-provider-failure-connection-release" --no-coverage
PASS src/modules/organization/core/__tests__/fd9-provider-failure-connection-release.spec.ts
  resendInvitation: provider call happens OUTSIDE the transaction
    √ txDepth is 0 when the email provider is called (happy path) (10 ms)
    √ txDepth is 0 when the email provider rejects (4 ms)
    √ txDepth is 0 when the email provider never resolves (hangs) (1 ms)
  anti-vacuous: the db.transaction() mock invokes its callback
    √ transaction() is NOT a bare jest.fn() — it calls its callback (1 ms)
    √ moving the send INSIDE the transaction would set txDepth to 1 at call time
Tests: 5 passed, 5 total
Exit: 0
```

**Bite proof:** The last case ("moving the send INSIDE the transaction") records `txDepth = 1` at provider call time. This confirms the mock is not vacuous and the assertion distinguishes the defect from the correct pattern.

**trackingDb pattern:** Follows `kb-doc-ai-buffered-connection-release.spec.ts` — `db.transaction()` increments `state.txDepth` before invoking its callback and decrements on exit; `txDepth` is captured at the moment the email mock fires, confirming the transaction has committed before the provider is reached.

---

## 4. Handoff links — ops concerns to owning task IDs

| Ops concern | Owning task | Evidence gap carried there? |
|---|---|---|
| Pooling limits (Neon pool size, `idle_in_transaction_session_timeout`, connection starvation) | OPS-001 — provider failure drills | Yes — the deadline mitigation exists; live pool-exhaustion drill under outbox load is part of OPS-001 scope ("payments, Ably/realtime, mail, … queues") |
| Migration rollback (1087 cold-build blocker, forward/back safety) | OPS-003 — recovery, rollback and data-protection drills | Yes — OPS-003 scope includes "rollback, restore/PITR, retention" and the 1087 finding is recorded in recovery-frontend-data.md §Migrations |
| Backup restore (Neon PITR, recovery point objectives) | OPS-003 | Yes — "restore/PITR, retention" are explicit in OPS-003 scope |
| Readiness checks (`/health/ready`, `/health/db`) | OPS-001 | Yes — OPS-001 scope includes "recovery, reconciliation" for each provider |
| Worker heartbeat (outbox relay worker liveness) | OPS-001 | Yes — delivery retries and dead-letter behavior are the observable signals for OPS-001 |
| Dead-letter recovery (outbox events exceeding retry limit) | OPS-001 | Yes — "retry/recovery, reconciliation" per provider in OPS-001 scope |
| Monitoring and alerts (signals, delivery, escalation) | OPS-002 — prove alert delivery and incident routing | Yes — OPS-002 explicitly covers "release-critical alerts, delivery, escalation, runbook linkage, acknowledgement" |
| Security, privacy and provider approvals | OPS-004 — depends on OPS-001/002/003 | Yes — OPS-004 collects completed evidence from the three preceding tasks |

No new operations task is created. The gaps above are exactly the BLOCKED-EXTERNAL items in OPS-001 through OPS-004 (`production-and-approvals.md`), which cannot be closed without a named staging environment, test resource identities and explicit operator authority.
