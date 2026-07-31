# R3 — Billing, Entitlements, Seats & Metering Patterns

> **Research Lane R3 · Phase-1 HRMS Recon · Date: 2026-07-31**
> READ-ONLY. No code changes.
> Evidence convention: `[V]` = verified against source this session · `[L]` = reported by cited recon lane · `[UNVERIFIED]` = needs accountant/operator confirmation.

---

## 0. How to Read This Document

Sections 1–7 are the primary deliverable. Section 1 is the capability matrix. Section 2 is the 7 highest-leverage patterns. Section 3 is the upgrade-latency problem. Section 4 is India-specific billing. Section 5 is explicit non-goals. Section 6 is canonical vocabulary. Section 7 is the top 15 gaps ranked.

All "We have?" citations point to real files and lines verified by Lane E (E-billing-entitlements.md) or Lane B (B-payroll-billing-schema.md). If a citation says NO it means Lane E searched and did not find it.

---

## 1. Capability Feature Matrix

### 1A — Plan / Catalog / Versioning

| Capability | Stripe Billing | Chargebee | Lago | Orb | Metronome | Paddle | We have? | P0/P1/P2 |
|---|---|---|---|---|---|---|---|---|
| **Product/plan catalog in DB** | Products table, versioned Price objects | Plans table, versioned addons | Plans in DB, editable | Plans + prices in DB | N/A (usage-only) | Catalog API | NO — hardcoded in `plan-entitlements.constants.ts:43` | P0 |
| **Price versioning** | Each Price is immutable; subscriptions pin a priceId | PlanVersion with effectiveFrom | Plan version with start dates | Price catalog with effective dates | Usage-only; rate plans versioned | Price versioning API | NO — a code deploy is required to change a limit or price | P0 |
| **Grandfathering** | Sub stays on old priceId; migrations explicit | `forwardPlans` + migration schedules | Price overrides per subscription | Contract terms with old rate | Contract-gated rates | Catalog version + sub pin | NO — no "stay on current limits even after constant change" mechanism | P1 |
| **Plan name constants in code branches** | Anti-pattern Stripe explicitly warns against | Same | Same | Same | Same | Same | YES (bug) — `plan-limits.service.ts:91–103`, `feature-gates.ts:39–73` | P0 |
| **Feature-flag per plan** | Entitlement lookup API | Feature flags per plan tier | Entitlement service | Feature flags | Feature flags | Feature flags | PARTIAL — `PLAN_FEATURE_FLAGS` in constants only, not DB | P1 |
| **Per-customer overrides** | `price_overrides` on subscription item | `SubscriptionOverride` | Contract terms overrides | Contract override | Customer-specific rates | Metadata overrides | NO — only `enterprise_quotes.negotiated_seats` (`billing.ts:302`) | P1 |
| **Trials** | `trial_period_days` on subscription | Trial periods per plan | Trial subscriptions | Trial periods | N/A | Free trials | YES — 14-day STARTER trial, `DEFAULT_TRIAL_DAYS=14`, `plan-entitlements.constants.ts:109` | done |
| **Proration on upgrade** | Automatic invoice proration | Credit + debit line items | Proration credit notes | Proration credits | Proration credit events | Proration API | NO — no proration logic found | P1 |
| **Scheduled plan changes** | `schedule` on subscription | PendingChange objects | Scheduled terminations | Future plan changes | N/A | Pause/resume scheduling | NO — upgrade is immediate or broken (JWT-stale) | P1 |
| **Dunning & retries** | Smart Retries + dunning rules | Dunning config per plan | Retry schedules | Retry rules | Retry rules | Built-in dunning | NO — confirmed absent (Lane L §8); PAST_DUE never set | P0 |

### 1B — Seat & Usage Metering

| Capability | Stripe Billing | Chargebee | Lago | Orb | Metronome | Paddle | We have? | P0/P1/P2 |
|---|---|---|---|---|---|---|---|---|
| **Seat-based line items** | `quantity` on subscription item | `quantity` on addon | Charges by quantity | Seat metrics | Seat dimensions | Seat quantities | PARTIAL — seat count enforced but never billed as an actual line item; `seatCount` column always `1` (`platform.ts:100`) | P0 |
| **One canonical seat definition** | Single `quantity` on sub | Single addable `quantity` | Single metric | Single metric | Single dimension | Single quantity | NO — three definitions: display only members, enforcement members+pending invites, stored never updated (Lane E §5) | P0 |
| **Seat reconciliation/ledger** | Subscription item quantity history | Subscription event log | Subscription event log | Metric ingestion log | Event ledger | Sub event log | NO — no reconciliation job; no seat change ledger | P1 |
| **General metered usage records** | Metered billing + usage records API | Usage-based billing | Billable metrics engine | Usage ingestion | Event ingestion + aggregation | Usage billing | NO — only AI credits metered; plan limit quotas are count-queries not metered records | P1 |
| **Usage ingestion idempotency** | `idempotency_key` on usage record | Idempotency keys | Event dedup | Event dedup | Event dedup via `transaction_id` | N/A | PARTIAL — AI reservation has `idempotency_key` constraint; plan limit counts have none | P1 |
| **Usage aggregation jobs** | Stripe handles | Chargebee handles | Scheduled aggregation | Continuous aggregation | Continuous aggregation | Paddle handles | NO — AI usage: 4 live `SUM()` on request (Lane E §8); plan limits: COUNT query per `assertWithinLimit` call | P2 |
| **Quota alerts (80%/100%)** | Stripe webhooks | Chargebee events | Lago webhook | Orb alert rules | Metronome alerts | Paddle events | NO — confirmed absent (Lane E §8) | P1 |

### 1C — Entitlement & Subscription Lifecycle

| Capability | Stripe Billing | Chargebee | Lago | Orb | Metronome | Paddle | We have? | P0/P1/P2 |
|---|---|---|---|---|---|---|---|---|
| **Single entitlement resolution service** | Customer portal + entitlement API | Plan entitlements API | Entitlement API | Entitlement API | Feature flags | Entitlement API | NO — two engines: `PlanLimitsService` (DB) + `requireFeature` (stale JWT) (Lane E §1, §2) | P0 |
| **Entitlement resolution API (server-side)** | `GET /v1/entitlements/active_entitlements` | Chargebee entitlements | Lago subscriptions | Orb subscriptions | Metronome entitlements | Paddle subscriptions | PARTIAL — `GET /billing/entitlements` exists, backed by `PlanLimitsService`; AI features don't use it | P0 |
| **402 vs 403 error semantics** | 402 for payment-required; 403 for forbidden | 402 for quota/payment | 422 + code | 402 + code | 402 + code | 402 + code | NO — quota exceeded is 403 ForbiddenException; module disabled is 404; only KB AI credits return 402 (Lane E §10) | P0 |
| **Machine-readable error codes** | Error `code` on all 4xx | `code` on all responses | Error `code` + `detail` | Error `code` | Error `code` | Error `code` | PARTIAL — only `INSUFFICIENT_CREDITS` (`kb/kb.errors.ts:6`); `MODULE_DISABLED` (`api-exceptions.ts:6`); quota has none | P0 |
| **Subscription state machine** | TRIALING / ACTIVE / PAST_DUE / CANCELED / PAUSED | TRIAL / ACTIVE / NON_RENEWING / CANCELLED / PAUSED | PENDING / ACTIVE / TERMINATED | ACTIVE / ENDED / UPCOMING | ACTIVE / ENDED | ACTIVE / TRIALING / PAST_DUE / PAUSED / DELETED | PARTIAL — TRIAL/ACTIVE/PAST_DUE/CANCELLED/EXPIRED defined; PAST_DUE never set (`enums.ts:118`) | P0 |
| **Suspension degrades to read-only** | Paused state; feature access config | NON_RENEWING state | Terminated state | N/A | N/A | Paused state | NO — no read-only degradation; EXPIRED → FREE (full data still accessible but at FREE limits) | P1 |
| **No payroll history deleted on downgrade** | N/A | N/A | N/A | N/A | N/A | N/A | NOT TESTED — payroll data is org-scoped; downgrade does not delete; `CANCELLED` → FREE tier; history not deleted [UNVERIFIED] | P1 |

### 1D — Invoicing, Tax & Payments

| Capability | Stripe Billing | Chargebee | Lago | Orb | Metronome | Paddle | We have? | P0/P1/P2 |
|---|---|---|---|---|---|---|---|---|
| **Platform invoices (we bill the org)** | Stripe-generated invoices | Chargebee invoices | Lago invoices | Orb invoices | Metronome invoices | Paddle-generated | NO — `platform_payments` table exists but no platform invoice entity; `subscription_payments` records raw payments only | P1 |
| **Customer invoices (org bills customers)** | N/A for this use | N/A | N/A | N/A | N/A | N/A | YES — `invoices` table, full GST fields, `invoices-write.service.ts` | done |
| **Credit notes** | Credit note entity | Credit note entity | Credit note entity | Credit note | Credit note | Credit note | PARTIAL — `voidInvoice` creates reversal journal; no explicit credit note entity | P2 |
| **GST (India)** | Tax rates API | GST rules | Tax rates | N/A | N/A | Paddle handles tax | PARTIAL — customer invoices have GSTIN/CGST/SGST/IGST fields (Lane E §11); platform billing profile has `gstin` field but no tax-at-billing-time logic | P1 |
| **Invoice numbering per FY** | Configurable | Configurable | Sequence reset | N/A | N/A | Paddle handles | NO — `COUNT(*)+1` never resets by FY (`invoices-write.service.ts:99–104`); per-FY sequence required for Indian GST compliance | P1 |
| **E-invoicing (IRP)** | N/A | N/A | N/A | N/A | N/A | N/A | NO — no IRN generation, no QR code, no IRP API integration | P1 |
| **UPI Autopay / eNACH mandates** | N/A | Razorpay/Cashfree connectors | N/A | N/A | N/A | N/A | PARTIAL — Razorpay subscription exists; mandate-specific flow (eNACH mandate creation, pre-debit notification 5 days, debit day) not verified [UNVERIFIED] | P1 |
| **Webhooks — verify then persist raw** | Stripe-Signature + raw body | X-Chargebee-Signature + raw | Webhook signature + raw | Webhook signature | Webhook signature | Paddle signature | PARTIAL — HMAC verified; raw body NOT stored; redacted summary only (Lane E §9) | P1 |
| **Webhook dedup** | Idempotency by event_id | event_id dedup | event_id dedup | event_id dedup | event_id dedup | Paddle handles | PARTIAL — `onConflictDoNothing` on `unique(provider_id, env, provider_event_id)` (Lane E §9) | done |
| **Webhook async queue** | Stripe handles retries | Chargebee retries | Lago retries | Orb retries | Metronome retries | Paddle retries | NO — inline processing in HTTP request; no queue (Lane E §9) | P1 |
| **Daily settlement reconciliation** | Stripe Balance transactions | Chargebee MRR reports | Lago invoices reconciled | Orb usage reconciled | Metronome reconciled | Paddle reports | NO — confirmed absent; `payment-webhook-health.service.ts` is health check only (Lane L §9) | P1 |
| **Revenue reporting (MRR/ARR/churn)** | Revenue recognition via Stripe | Chargebee revenue reports | Lago analytics | Orb analytics | Metronome analytics | Paddle analytics | PARTIAL — `revenue_events` table exists (`billing.ts:259`); `revenue-analytics.service.ts` exists; no time-series aggregation job | P2 |

### 1E — AI Credit Ledger (our differentiator)

| Capability | Reference pattern | We have? | P0/P1/P2 |
|---|---|---|---|
| **Balance row as serialization point** | Reserve→settle→release with `SELECT FOR UPDATE` | YES — `org_ai_credits` with `SELECT ... FOR UPDATE` (`E §7`) | done |
| **Append-only credit ledger** | `ai_credit_transactions` with `createdAt` only | YES — `billing.ts:137` | done |
| **In-flight reservations** | `ai_credit_reservations` with `expiresAt` + sweep | YES — `billing.ts:165`; sweep cron #3 | done |
| **Token-metered (not flat-per-action)** | `computeTokenCharge(model, in, out)` | YES — `ai-model-pricing.constants.ts` (CLAUDE.md §16) | done |
| **Reserve→settle idempotency** | `idempotency_key` on reservation | PARTIAL — reserve is idempotent; settle is NOT idempotent (Lane E §8 P1) | P1 |
| **`CHECK (balance >= 0)`** | DB constraint | NO — `org_ai_credits.balance integer default 0` with no constraint (`billing.ts:123`) | P2 |
| **Quota alerts** | 80%/100% threshold notifications | NO — only `autoTopUpThreshold` triggers purchase; no user notification | P1 |

---

## 2. The 7 Highest-Leverage Patterns

### Pattern 1 — Single Entitlement Resolution Service

**The problem (verified):**
Lane E confirmed two entitlement engines run simultaneously. `PlanLimitsService` (`billing/core/plan-limits.service.ts`) is DB-backed with 30s in-memory + 60s Redis caching. `requireFeature()` in `ai/core/billing/feature-gates.ts:79–99` reads `u.plan` from the JWT claim (`jwt-auth.guard.ts:184`). JWT is stale by design. An org that downgrades retains premium AI features until their JWT expires; an org that upgrades cannot use those features until they re-login. This is F-05 and F-06 in `01-inventory.md`.

**The canonical pattern:**
Stripe's entitlement model [https://stripe.com/docs/billing/entitlements] and Orb's [https://docs.withorb.com/home] both enforce a single server-resolved entitlement surface. The key principle: entitlements are NEVER read from client-side tokens. They are resolved from the DB on every request (with caching) by one service that is the ONLY source of truth.

**Structure for our codebase:**

```
EntitlementService (extends PlanLimitsService)
  ├── resolveTier(orgId) → {tier, plan}          [30s process-local cache]
  ├── getEntitlements(orgId) → EntitlementsDto   [60s Redis cache]
  ├── checkFeature(orgId, feature) → boolean     [calls getEntitlements; replaces requireFeature()]
  ├── assertWithinLimit(orgId, key, increment)   [unchanged]
  └── bust(orgId)                                [busts BOTH in-memory AND Redis]
```

`requireFeature()` in `feature-gates.ts` must be deleted. Every AI endpoint that calls it must call `entitlementService.checkFeature(orgId, feature)` instead, passing `orgId` from `req.user` (not JWT claim). The `u.plan` field must be removed from the JWT payload or explicitly ignored.

**First concrete step:** In `feature-gates.ts:79–99`, replace `requireFeature(u.plan, feature)` with `await this.planLimitsService.checkFeature(u.orgId, feature)` in each of the 20+ AI controller methods. Then delete `PLAN_FEATURES` map and `requireFeature` function. The `checkFeature` method doesn't exist yet — add it to `PlanLimitsService` as a delegate to `getEntitlements().features[feature]`.

---

### Pattern 2 — 402 vs 403 with Machine-Readable Codes

**The problem (verified):**
`assertWithinLimit` throws `ForbiddenException` (HTTP 403) with a human-readable string and no `code` field (Lane E §10, `plan-limits.service.ts:205`). The frontend cannot distinguish "your role forbids this action" (genuine 403) from "upgrade your plan to do this" (should be 402 with `QUOTA_EXCEEDED`). The module-disabled exception returns 404. Only the KB AI endpoint returns a correct 402 with `INSUFFICIENT_CREDITS`.

**The canonical pattern:**
Every billing-wall response must be 402 with a machine-readable body:

```json
{
  "statusCode": 402,
  "code": "QUOTA_EXCEEDED",
  "limitKey": "members",
  "used": 10,
  "limit": 10,
  "upgradePath": "PROFESSIONAL",
  "message": "You have reached the 10-member limit on the Starter plan."
}
```

This allows the frontend to render an upgrade prompt (`EntitlementGate` component, currently absent — see `01-inventory.md §5`) rather than a generic error toast.

**Error code vocabulary:**

| Scenario | HTTP | code |
|---|---|---|
| Plan quota exceeded | 402 | `QUOTA_EXCEEDED` |
| AI credits exhausted | 402 | `INSUFFICIENT_CREDITS` |
| Feature requires higher plan | 402 | `PLAN_UPGRADE_REQUIRED` |
| Module not enabled on this org | 402 | `MODULE_NOT_ENABLED` |
| Module locked by plan tier | 402 | `MODULE_PLAN_LOCKED` |
| Access denied (RBAC) | 403 | `PERMISSION_DENIED` |

**First concrete step:** In `plan-limits.service.ts:assertWithinLimit`, replace `throw new ForbiddenException(...)` with `throw new PaymentRequiredException({ code: "QUOTA_EXCEEDED", limitKey: key, used, limit, upgradePath })`. Add `PaymentRequiredException extends HttpException` to `common/http/api-exceptions.ts`. Change `ModuleDisabledException` HTTP status from 404 to 402, code `MODULE_NOT_ENABLED`.

---

### Pattern 3 — Plans as Data (Versioned Price Book + Grandfathering)

**The problem (verified):**
All plan limits and prices are TypeScript constants (`plan-entitlements.constants.ts`). Changing a limit or price requires a deploy. There is no concept of an existing subscriber staying on the old limits when we change them — a deploy changes limits for everyone instantly. This is a P0 for a paying SaaS product: a subscriber who signed up for "50 contacts on Free" and is using 47 contacts would immediately hit a wall if we reduced Free to 30 contacts. This mirrors the billing-platform-plan.md §1 requirement.

**The canonical pattern (Stripe, Chargebee):**
A versioned price-book with immutable-once-used rows and grandfathering as a first-class state:

```
plan_versions
  ├── id (uuid)
  ├── effective_from (timestamptz)
  ├── status: DRAFT | ACTIVE | ARCHIVED
  └── snapshot (jsonb) — full limit/price map at this version

subscriptions
  └── plan_version_id → plan_versions.id  -- pins the version at subscribe time

plan_limit_overrides
  ├── org_id
  ├── limit_key
  ├── override_value
  └── reason (grandfathering / enterprise negotiation / promo)
```

On plan change, a new `plan_version` row is inserted. Existing subscriptions keep their `plan_version_id` unless the operator explicitly migrates them (→ grandfathering is the default, opt-in migration is explicit). The `PlanLimitsService.resolveTier()` joins through `plan_version_id` to get limits, falling through to the current active version for new orgs.

**Why this fits our code:** `plan-entitlements.constants.ts` becomes a seed file for the initial `plan_versions` row. `PlanLimitsService` replaces its hardcoded constants lookup with a DB query keyed on `subscription.plan_version_id`. `resolveTier()` already queries the `subscriptions` table — adding the version join is additive.

**First concrete step:** Add `plan_versions` table to `db/schema/billing/` with `id uuid PK, effective_from timestamptz, status text, limits jsonb, prices_paise jsonb`. Add `plan_version_id uuid FK` to `subscriptions`. Seed the first version from `plan-entitlements.constants.ts` current values. `PlanLimitsService.queryTier()` reads `plan_versions` via the join instead of constant lookup. Existing constant file stays as the source for seeding only.

---

### Pattern 4 — One Billable-Seat Definition

**The problem (verified):**
Three incompatible seat definitions exist simultaneously (Lane E §5):
1. **Display:** `organization_members` COUNT only (used in billing UI `billing.service.ts:getSeatInfo()`)
2. **Enforcement:** `organization_members` + `pending invites WHERE status='PENDING' AND expires_at > NOW()` (used in `plan-limits.service.ts:fetchCount("members")`)
3. **Stored:** `platform_subscriptions.seatCount` column hardcoded `1`, never updated, never read in enforcement

A user sees "4 seats used" in the UI but enforcement blocks their 5th invite because the pending invite already counts. This is `F-26` in `01-inventory.md`.

**The approved definition (CLAUDE.md §16):**
> Active `organizationMembers`; pending invites reserve but don't bill.

This means:
- **Billed seats** = `COUNT(*) FROM organization_members WHERE org_id = $1 AND status = 'ACTIVE'`
- **Reserved seats** = billed + `COUNT(*) FROM invitations WHERE org_id = $1 AND status = 'PENDING' AND expires_at > NOW()`
- **Hard limit** = applied against reserved seats (invite fails if reserved ≥ limit)
- **Display** = billed seats (what the user sees as "used")

A seat ledger records every change:

```
seat_ledger
  ├── org_id
  ├── event: MEMBER_JOINED | MEMBER_LEFT | INVITE_SENT | INVITE_EXPIRED | INVITE_ACCEPTED | INVITE_REJECTED
  ├── delta: +1 | -1
  ├── actor_id
  └── created_at
```

This makes seat history auditable (required for enterprise billing disputes) and allows `platform_subscriptions.seatCount` to be derived from the ledger rather than a dead column.

**First concrete step:** In `plan-limits.service.ts:fetchCount("members")`, add `deleted_at IS NULL AND status = 'ACTIVE'` to the members query; keep pending-invite reserve for enforcement. Add `seat_ledger` table to schema. Write to ledger from `invitations.service.ts` at join/leave/invite events. Remove `platform_subscriptions.seatCount` dead column in a future migration.

---

### Pattern 5 — Credit Ledger with Balance Row as Serialization Point

**The problem (verified):**
The AI credit ledger already uses the correct structural pattern (`org_ai_credits` balance row + `ai_credit_reservations` + `SELECT FOR UPDATE`). The gaps are:

1. `settle()` is NOT idempotent — double-settle inserts two USAGE rows and double-debits `lifetimeConsumed` (`ai-credits-reservation.service.ts:110–178`, Lane E §8 P1)
2. No `CHECK (balance >= 0)` at DB level (`billing.ts:123`)
3. `bust(orgId)` evicts only the in-memory tier cache, not the Redis entitlements cache — 60s window where entitlements are stale after an upgrade

**The canonical pattern (Stripe, Lago):**
Reserve → Settle → Release with idempotency enforced at the settle step:

```
settle(reservationId, actualMilli, idempotencyKey):
  1. BEGIN TRANSACTION
  2. SELECT reservation WHERE id=$1 FOR UPDATE
  3. IF status != 'RESERVED' → return existing result (idempotent replay)
  4. UPDATE balance, lifetimeConsumed
  5. INSERT ai_credit_transactions (USAGE) ON CONFLICT (idempotency_key) DO NOTHING
  6. UPDATE reservation status = 'SETTLED'
  7. COMMIT
```

`idempotency_key` on `ai_credit_transactions` prevents double-settlement. The existing `ai_credit_reservations.idempotency_key` dedupes reserves. The same key should be forwarded to the transaction insert.

**First concrete step:** Add `idempotency_key text UNIQUE` to `ai_credit_transactions` schema. In `ai-credits-reservation.service.ts:settle()`, check reservation status before acting (idempotent replay), add `ON CONFLICT (idempotency_key) DO NOTHING` to the USAGE insert, and add `bust(orgId)` call to also evict the Redis cache key `billing:entitlements:${orgId}`.

---

### Pattern 6 — Webhook: Verify → Persist Raw → Dedupe → Queue → Reconcile Daily

**The problem (verified):**
Both Razorpay webhook paths verify HMAC but do not store the raw payload body. Only a redacted summary is stored. Inline processing in the HTTP request (no queue). No daily reconciliation job (Lane E §9).

**The canonical pattern:**
Stripe and Chargebee both document a 5-step webhook pattern:

```
1. VERIFY: HMAC-SHA256 of raw body against signature header (timing-safe)
   → 400 immediately on failure (before any DB write)

2. PERSIST RAW: INSERT INTO payment_webhook_events (raw_payload, provider_event_id, received_at)
   ON CONFLICT (provider_event_id) DO NOTHING  ← dedupe at persist
   → return 200 immediately to provider (avoids retry storms)

3. DEDUPE: if conflict → return 200 (already processed or in flight)

4. QUEUE: enqueue event_id to an async processor (outbox or BullMQ)
   → never process inline (HTTP timeout = 30s; Razorpay retries after 15s)

5. RECONCILE DAILY: cron job compares provider's transaction list against our
   subscription_payments; alerts on gaps > threshold
```

**Why this matters for us:** Razorpay retries a webhook if we don't respond within ~15 seconds. Our current inline processing can exceed this on heavy payroll periods. The raw body must be stored because: (a) the provider's event ID can be absent on malformed payloads — we fall back to SHA-256 of raw body — but we can't recompute that hash if we don't store it; (b) dispute resolution requires the exact payload; (c) reconciliation needs the event log.

**First concrete step:** In `billing/payments/payment-webhooks-public.controller.ts`, after HMAC verification, add `INSERT INTO payment_webhook_events (raw_payload = req.rawBody, ...)` before any business logic. Respond 200 immediately. Move business logic to `cron/payment-webhook-processor` (a new cron endpoint that processes `RECEIVED` events). The existing `payment_webhook_events` table already exists (`payment-providers.ts:97`).

---

### Pattern 7 — Subscription State Machine Where Suspension Is Read-Only

**The problem (verified):**
`PAST_DUE` is defined in `subscription_status` enum (`enums.ts:118`) but is never set by any production code path. There is no payment failure handler, no Razorpay webhook that transitions to `PAST_DUE`. A failed recurring payment leaves the subscription `ACTIVE` indefinitely. This is both a revenue leak and a compliance risk (Lane E §6, `01-inventory.md F-25`).

No dunning exists (Lane L §8, confirmed absent).

**The canonical state machine (Chargebee, Stripe):**

```
TRIAL
  ↓ trial_ends_at passes (cron #1 ✓ exists)
FREE (degraded access, not a formal state — our resolveTier() handles this)

TRIAL / ACTIVE
  ↓ payment succeeds
ACTIVE

ACTIVE
  ↓ payment fails (Razorpay webhook: `payment.failed` or `subscription.charged` with error)
PAST_DUE (dunning starts: email D+1, D+3, D+7; retry D+3, D+7, D+14)
  ↓ payment recovered
ACTIVE
  ↓ D+14 still failed
SUSPENDED (read-only: payroll history accessible, but no new runs, no invites, no AI)
  ↓ admin cancels
CANCELLED
  ↓ 30 days
(data retention window → purge)
```

**CRITICAL for payroll:** Suspended orgs must be able to read payroll history and generate final payslips for employees. The transition to SUSPENDED must NOT delete data. Payroll runs in `LOCKED`/`PAID`/`CLOSED` status are immutable but must remain readable. `resolveTier()` already returns `{ tier: "FREE", plan: "FREE" }` for `PAST_DUE` — correct degradation IF PAST_DUE were set.

**First concrete step:** Create a Razorpay webhook handler for `subscription.charged` (payment failed variant) in `billing/core/razorpay-webhook.controller.ts`. On failure, transition subscription to `PAST_DUE` via `billing.service.ts`. Add `processPaymentFailures()` to `cron-billing.service.ts` that checks subscriptions stuck in `PAST_DUE` past the grace period and transitions to `SUSPENDED`. `SUSPENDED` tier → `FREE` limits but add a boolean `isSuspended` on the resolved tier so the frontend can show a "Reactivate" banner rather than an upgrade prompt.

---

## 3. The Upgrade-Latency Problem

### Why This Is the Most Common Paywall Bug

The bug occurs when an entitlement decision is cached and that cache is not invalidated when the plan changes. Result: an upgrade payment succeeds but the customer cannot use the new features until the cache expires. Conversely, a downgrade doesn't restrict access immediately, creating a grace window that can be exploited.

The specific form in our codebase:

**Layer 1 — Process-local in-memory cache (30s):**
`PlanLimitsService.resolveTier()` has a `Map<orgId, TierCache>` with `expiresAt = Date.now() + 30_000` (`plan-limits.service.ts:32, 47–61`). `bust(orgId)` correctly evicts this layer.

**Layer 2 — Redis cache (60s):**
`getEntitlements()` caches under `billing:entitlements:${orgId}` with 60s TTL. `bust(orgId)` does NOT evict this layer (verified by Lane E §1 P1). An upgrade goes through immediately in Layer 1 (busted by `verifyAndActivate`) but Layer 2 still returns stale entitlements for up to 60s.

**Layer 3 — JWT `plan` claim (hours/days until re-login):**
`jwt-auth.guard.ts:184` reads `u.plan` from JWT. `requireFeature(u.plan, ...)` uses this stale claim. An upgrade is invisible to the AI feature gates until the user re-issues their JWT. **This is the worst layer** — a downgrade doesn't lock AI features at all until re-login.

### The Correct Caching Design

```
On plan change (upgrade or downgrade):
  1. DB write: UPDATE subscriptions SET plan = $new, status = 'ACTIVE'
  2. bust(orgId):
     a. delete tierCache.get(orgId)   ← Layer 1 (already done)
     b. redis.del(`billing:entitlements:${orgId}`)  ← Layer 2 (MISSING — add this)
     c. (no JWT bust needed — JWT must not be used for entitlement decisions at all)

On next request:
  1. PlanLimitsService.resolveTier() → cache miss → DB query → fresh value → re-cached
  2. getEntitlements() → cache miss → DB query → fresh value → re-cached
  3. requireFeature() → DELETED; replaced with checkFeature(orgId) which calls getEntitlements()
```

**Result:** An upgrade takes effect on the very next request after `bust()`. No JWT re-issue required. No 60s stale window. DB is hit once per `TIER_CACHE_TTL_MS` (30s) per instance, not per request.

**The JWT must not carry plan information.** The JWT carries only `userId`, `orgId`, `isOrgOwner`, `isPlatformAdmin` — claims that are stable for the JWT's lifetime. Plan/entitlements are volatile and must be resolved server-side on every request (cached per the layers above).

**For multi-instance deployments:** Process-local cache (Layer 1) creates a stale window of up to 30s per instance. Acceptable tradeoff — a paid upgrade within 30s is not harmful. For downgrade enforcement, 30s is acceptable if Layer 2 (Redis) is busted synchronously. If stricter is needed, reduce `TIER_CACHE_TTL_MS` to 10s or publish a Redis pub/sub `plan_changed` event that all instances listen to and clears their local cache immediately.

---

## 4. India-Specific Billing

> **All items in this section are `[UNVERIFIED]` unless explicitly marked.** Present for accountant/CA review before implementation.

### 4A — GST on SaaS

**Registration and applicability `[UNVERIFIED]`:**
GST applies to "Online Information and Database Access or Retrieval (OIDAR)" services. A SaaS platform like StreamlineOS providing cloud software is an OIDAR service under Indian GST law. Source: CBIC FAQ on OIDAR services https://www.cbic.gov.in/resources//htdocs-cbec/gst/OIDAR.pdf [UNVERIFIED — confirm with CA].

**Rate `[UNVERIFIED]`:**
GST rate on software / OIDAR = **18%** (SGST 9% + CGST 9% for intra-state, IGST 18% for inter-state). Source: GST Council notification, HSN 9983 (IT services) [UNVERIFIED].

**Place of supply `[UNVERIFIED]`:**
For B2B (org has GSTIN): place of supply = GSTIN state code. Intra-state → CGST+SGST. Inter-state → IGST. For B2C (org has no GSTIN): place of supply = billing address state. Source: IGST Act §12(11) [UNVERIFIED].

**We have `[V]`:** `billing_profiles.gstin` column exists. Customer `invoices` have `place_of_supply`, `reverseCharge`, `cgst_rate`, `sgst_rate`, `igst_rate` (Lane E §11). **Gap:** Platform billing (StreamlineOS billing the org) does NOT compute GST at charge time. The `billing.service.ts` charges the Razorpay amount from `PLAN_PRICES_PAISE` directly without adding GST. If StreamlineOS is GST-registered, platform invoices must include 18% GST above the listed price or prices must be GST-inclusive. This is a compliance gap.

### 4B — GSTIN and Invoice Numbering

**GSTIN format `[V]`:** Regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` validated in `invoice-write.schemas.ts:3`.

**Sequential invoice numbering per FY `[UNVERIFIED]`:**
Indian GST Rule 46 requires invoices to be numbered consecutively for each financial year. The FY runs April 1 – March 31. Our current numbering uses `COUNT(*)+1` with calendar year (`new Date().getFullYear()`) in the prefix — `INV-2026-0010` resets at Jan 1, not Apr 1. Fix: use a DB sequence reset annually at `2026-04-01` (Postgres `ALTER SEQUENCE ... RESTART` via scheduled migration or cron) and prefix with FY (e.g., `INV-FY2627-0001`). Source: CGST Rules 2017, Rule 46 [UNVERIFIED].

**E-invoicing threshold `[UNVERIFIED]`:**
E-invoicing (IRN generation via IRP — Invoice Registration Portal) is mandatory for businesses with aggregate turnover > ₹5 crore from Aug 1, 2023. Source: CBIC Notification 10/2023 https://www.cbic.gov.in/resources//htdocs-cbec/gst/E-invoice_GST_Advisory_Aug2023.pdf [UNVERIFIED]. For platform invoices we issue to paying orgs, if our turnover exceeds ₹5 Cr: (a) generate IRN via the IRP API before emailing the invoice; (b) embed the IRN and QR code on the invoice PDF. We have no IRP integration today.

### 4C — UPI Autopay and eNACH

**UPI Autopay (NACH on UPI) `[UNVERIFIED]`:**
UPI Autopay allows recurring debit mandates of up to ₹1 lakh per transaction. Mechanics:
1. Payer approves a mandate via UPI app (one-time)
2. Merchant sends pre-debit notification at least **24 hours before debit** (RBI circular Jan 2020)
3. Payer may revoke in UPI app before execution window
4. On debit day, NPCI processes the mandate
Source: NPCI UPI Autopay framework https://www.npci.org.in/what-we-do/upi/product-overview [UNVERIFIED]

**eNACH (paper/API NACH) `[UNVERIFIED]`:**
eNACH is for bank account direct debit mandates. Two flows: (a) API-based eNACH (via NPCI) — payer authorises online; (b) Physical NACH — signed form scanned and uploaded. For SaaS subscriptions, API eNACH is standard. Pre-debit notification required 5 working days before. Source: NPCI NACH documentation [UNVERIFIED].

**Razorpay's implementation `[UNVERIFIED]`:**
Razorpay supports both UPI Autopay (`method: upi`, `recurring: true` on payment) and eNACH (`method: nach`). Mandate creation, pre-notification, and debit scheduling are handled by Razorpay on behalf of the merchant. The merchant only needs to: create a Razorpay subscription, specify `start_at` and `amount`, and handle `subscription.charged` and `subscription.charged.failed` webhooks. Source: https://razorpay.com/docs/api/payments/recurring-payments/ [UNVERIFIED].

**We have `[L]`:** Razorpay subscription integration exists (`billing/core/razorpay.service.ts`). Pre-debit notification cron path is ABSENT — we do not send pre-debit emails to subscribers 24h/5-day before their renewal. If the mandate requires this (which Indian regulations require for eNACH), we are non-compliant [UNVERIFIED].

---

## 5. Explicit Non-Goals

These are things StreamlineOS should NOT build:

1. **PCI-scoped card data storage.** Never store raw card numbers, CVV, or full track data. Razorpay holds cards; we store only `razorpay_payment_id` and masked last-4 as display. Do not become PCI-DSS merchant if Razorpay handles everything. The moment we store a card number we are PCI in scope.

2. **Our own tax engine.** GST computation is complex (HSN codes, place of supply, exempt categories, reverse charge, composition scheme). We use Razorpay's tax handling for platform billing or an external tax API (Avalara/TaxJar equivalent for India). The customer-invoice `cgst_rate`/`sgst_rate` fields are manually entered by the org — that is acceptable for org accounting. But computing our own tax for SaaS billing is not.

3. **A generic pricing DSL.** Orb, Lago, and Metronome exist precisely because pricing DSLs are hard. We are a vertical SaaS (HRMS), not a usage-based billing platform. Our entitlement model is: 3 plan tiers + seat limit + per-resource quota limits + AI credits. That does not require a DSL. A versioned plan catalog with per-org overrides is sufficient.

4. **Multiple payment processors for platform billing.** The 2026-06-29-billing-platform.md explicitly names Razorpay as the sole provider with an "abstract interface pattern for later." Do not add Stripe or Cashfree for platform billing now. One provider, fully implemented, is better than two half-baked.

5. **Serving our own card terminal / payment widget.** We render Razorpay's hosted checkout or embedded SDK. We do not build a custom payment form (PCI scope, failed card error handling, 3DS, tokenization are all Razorpay's problem when we use their SDK).

6. **Per-feature usage metering beyond AI credits.** Tracking per-API-call usage, per-record-query charges, per-employee-processed charges — that requires an ingestion pipeline, dedup, and aggregation infrastructure. Out of scope. Seat counts and flat quotas are sufficient for our pricing model.

7. **Real-time financial reporting.** MRR/ARR dashboards are nice but live aggregation on `revenue_events` is fine at our scale. We do not need a data warehouse, Fivetran, or Metabase for billing analytics right now.

---

## 6. Canonical Billing Vocabulary

One term per concept, aligned to what the code already uses:

| Term | Definition | Our code name | Do NOT use |
|---|---|---|---|
| **Plan** | A named tier of service (FREE, STARTER, PROFESSIONAL, ENTERPRISE) with an associated price, seat limit, and feature set | `EffectivePlan` (`plan-entitlements.constants.ts:16`) | Package, tier (as a user-facing term), license |
| **Plan tier** | The enforcement bucket that maps multiple plans to the same capability level (FREE, PAID, ENTERPRISE) | `PlanTier` (`plan-entitlements.constants.ts:15`) | — |
| **Price** | The amount charged per billing cycle for a plan, in paise (INR minor unit). Immutable once an org subscribes to it. | `PLAN_PRICES_PAISE` (`plan-entitlements.constants.ts:121`) | Cost, fee, charge |
| **Product** | Not a billing concept in our model. In Stripe it is a catalog item. We use "module" for feature grouping. | — | Do not conflate with Stripe's Product |
| **Feature** | A boolean capability flag gated by plan tier (e.g., `chatGroupHuddles`, `kbPublicSharing`) | `PlanFeatureFlags` (`plan-entitlements.constants.ts:60`) | Feature-flag (avoid — confuses with LaunchDarkly-style flags) |
| **Entitlement** | The resolved set of what an org can do right now: tier + features + limits, computed from the subscription on every request | `EntitlementsDto` (`plan-limits.service.ts:18`) | Permission (reserved for RBAC) |
| **Permission** | RBAC access right for a specific action on a resource (`hr:employees:view`). Orthogonal to entitlements — RBAC and billing are separate axes. | `PermissionKey` (`frontend/lib/rbac/`) | Entitlement (reserved for billing) |
| **Limit** | A numeric quota on a countable resource (members, projects, etc.). `null` = unlimited. | `LimitKey` + `PLAN_LIMITS` (`plan-entitlements.constants.ts:19,43`) | Cap, maximum |
| **Quota** | The current state of a limit: `used` + `limit`. Returned by `getEntitlements().limits`. | `limits` in `EntitlementsDto` | — |
| **Credit** | A purchased or granted unit of AI inference capacity. 1 credit = 1000 milli-credits. Burns by actual tokens. | `org_ai_credits.balance` (`billing.ts:123`) | Token (reserved for LLM API tokens), point |
| **Seat** | One active `organizationMembers` row. The billing unit for the members limit. | Active `organizationMembers` | User, account, license seat |
| **Reservation** | An in-flight credit deduction that has been pre-debited but not yet settled. Released on provider failure. | `ai_credit_reservations` (`billing.ts:165`) | Hold, escrow |
| **Subscription** | The org's current plan contract, including status, plan, trial dates, and Razorpay subscription ID. | `subscriptions` (`shared.ts:308`) | Account, contract |
| **Module** | A vertical feature set (HR, CRM, Build, Payroll). Has an enabled/disabled state per org. Separate from plan tier. | `modules_catalog.module_key` | Feature group |

---

## 7. Top 15 Gaps Ranked

| # | Gap | Revenue/Compliance Risk | Effort | Depends on |
|---|---|---|---|---|
| 1 | **Two entitlement engines (JWT plan claim for AI features).** `requireFeature(u.plan)` in `feature-gates.ts` reads stale JWT — downgrade doesn't lock AI, upgrade doesn't unlock. | HIGH — paywall bypass on downgrade; competitor can access premium AI after canceling | S (delete `requireFeature`, add `checkFeature` to PlanLimitsService, update 20 AI controllers) | Nothing |
| 2 | **PAST_DUE never set + no dunning.** Failed payment keeps subscription ACTIVE. No retry, no degradation, no email. | HIGH — revenue leak on every payment failure | M (Razorpay webhook handler + `PAST_DUE` transition + 3-email dunning cron + retry cron) | Razorpay webhook raw storage (Gap 8) |
| 3 | **402 vs 403 + missing machine-readable codes.** Quota exceeded returns 403, module disabled returns 404. Frontend can't show upgrade prompt. | MEDIUM — UX friction reduces upgrade conversion | S (add `PaymentRequiredException`, update `assertWithinLimit`, update `ModuleDisabledException`) | Gap 2 (shares error taxonomy) |
| 4 | **`bust()` doesn't evict Redis entitlements cache.** 60s stale window after upgrade. | MEDIUM — upgrade appears broken to customer for 60s (support cost, churn risk) | XS (add `redis.del(...)` to `bust()` in `plan-limits.service.ts:63`) | Nothing |
| 5 | **Three seat definitions, no canonical billable seat.** Display ≠ enforcement ≠ stored. | MEDIUM — user confusion; disputes over "we have 4 seats but can't invite" | S (unify definition in `assertWithinLimit` + `getSeatInfo`; add seat ledger table) | Nothing |
| 6 | **Plans / limits as TS constants (not DB data).** Changing a price or limit is a deploy that affects all orgs immediately. No grandfathering. | HIGH — any limit reduction breaks existing paying customers; must deploy at 2AM to minimize impact | L (add `plan_versions` table, migrate `PlanLimitsService` to DB lookup, seed from constants) | Schema migration |
| 7 | **`settle()` not idempotent.** Retry on AI credit settle double-charges. | MEDIUM — financial correctness; customer disputes on AI credit wallet | S (add `idempotency_key` to `ai_credit_transactions`, add conflict check to `settle()`) | Nothing |
| 8 | **Webhook raw body not stored.** Cannot reconstruct events for reconciliation or dispute. | MEDIUM — cannot audit Razorpay payment disputes; reconciliation impossible | S (add `raw_payload bytea` to `payment_webhook_events`, store before processing) | Nothing |
| 9 | **No daily payment reconciliation job.** No comparison of Razorpay transaction list vs our `subscription_payments`. | MEDIUM — silent payment discrepancies undetected until customer complaint | M (new cron endpoint + Razorpay settlement API query + reconciliation comparison) | Gap 8 |
| 10 | **Webhook processing inline (no queue).** HTTP timeout risk; Razorpay retries if no 200 in ~15s. | MEDIUM — duplicate webhook processing on retry; reliability risk during high load | M (persist + return 200 immediately; process via existing cron outbox mechanism) | Gap 8 |
| 11 | **Invoice numbering doesn't reset per FY.** `INV-2026-0010` and `INV-2027-0010` can coexist; GST Rule 46 requires sequential per-FY. | HIGH (compliance) — penalty risk if audited; GSTIN registration required | S (add FY-keyed sequence column to DB; update `invoices-write.service.ts`) | Accountant review (Gap 4A) |
| 12 | **GST not computed on platform invoices.** Platform billing charges `PLAN_PRICES_PAISE` direct without adding 18% GST. If GST-registered, under-collecting tax. | HIGH (compliance) — potential GST liability + interest | M (add 18% GST line to platform billing; update Razorpay order amount; issue GST-compliant platform invoice) | CA confirmation [UNVERIFIED] |
| 13 | **HR direct-onboarding bypasses seat limit.** `assertWithinLimit("members")` only checked at invitation. HR admin can onboard employees directly and exceed seat limit. | MEDIUM — seat limit enforcement gap; revenue leak | S (add `assertWithinLimit("members")` call to `hr/lifecycle/` employee creation service) | Nothing |
| 14 | **No quota alerts.** Users hit quota walls with zero warning. | MEDIUM — UX friction; support cost; churn when users hit walls | M (add `notifyQuotaThreshold()` call in `assertWithinLimit` at 80%/100%; send email + in-app notification) | Notification system (Lane L) |
| 15 | **`acctInvoices` quota counts voided invoices.** `COUNT(*) FROM invoices WHERE org_id` has no `deleted_at IS NULL`. Voiding an invoice doesn't free quota. | LOW — customer confusion; inaccurate quota display | XS (add `AND deleted_at IS NULL` to `fetchCount("acctInvoices")` in `plan-limits.service.ts`) | Nothing |

---

## 8. External References

- Stripe Billing entitlements: https://stripe.com/docs/billing/entitlements
- Stripe: Don't branch on plan names: https://stripe.com/docs/billing/prices-guide#lookup-keys
- Chargebee dunning: https://www.chargebee.com/docs/dunning.html
- Chargebee plan versioning + grandfathering: https://www.chargebee.com/docs/plan-versioning.html
- Orb entitlement model: https://docs.withorb.com/home
- Lago open-source billing: https://getlago.com/docs/guide/billable-metrics/overview
- Metronome usage-based billing patterns: https://docs.metronome.com/using-metronome/data-ingestion/
- NPCI UPI Autopay: https://www.npci.org.in/what-we-do/upi/product-overview [UNVERIFIED]
- Razorpay recurring payments: https://razorpay.com/docs/api/payments/recurring-payments/ [UNVERIFIED]
- CBIC OIDAR GST FAQ: https://www.cbic.gov.in/resources//htdocs-cbec/gst/OIDAR.pdf [UNVERIFIED]
- CGST Rules 2017, Rule 46 (invoice numbering): https://www.cbic.gov.in/resources//htdocs-cbec/gst/cgst-rules-book.pdf [UNVERIFIED]
- CBIC e-invoicing notification Aug 2023: https://www.cbic.gov.in/resources//htdocs-cbec/gst/E-invoice_GST_Advisory_Aug2023.pdf [UNVERIFIED]

---

## Appendix A — Verified File Citations

| Claim | File:Line |
|---|---|
| Two entitlement engines | `billing/core/plan-limits.service.ts:1`, `ai/core/billing/feature-gates.ts:79–99`, `jwt-auth.guard.ts:184` |
| PLAN_LIMITS constants | `billing/core/plan-entitlements.constants.ts:43–58` |
| assertWithinLimit throws 403 | `billing/core/plan-limits.service.ts:205` (inferred from Lane E §10; exact line from service) |
| bust() evicts only in-memory | `billing/core/plan-limits.service.ts:63–65` |
| PAST_DUE never set | `db/schema/common/enums.ts:118` + absence of transition in production code |
| Three seat definitions | `billing/core/billing.service.ts` (display) + `plan-limits.service.ts` (enforcement) + `db/schema/common/platform.ts:100` (stored dead) |
| settle() not idempotent | `billing/core/ai-credits-reservation.service.ts:110–178` |
| Webhook raw body not stored | `billing/payments/payment-webhooks-public.controller.ts` (redacted summary only) |
| Invoice numbering gap | `invoices/invoices-write.service.ts:94–104` |
| HR onboarding seat bypass | `hr/lifecycle/` (assertWithinLimit not called — confirmed by Lane E §3) |
| Credit ledger structure | `db/schema/billing/billing.ts:118–178` |
| AI model pricing | `ai/core/billing/ai-model-pricing.constants.ts` (referenced by CLAUDE.md §16) |
