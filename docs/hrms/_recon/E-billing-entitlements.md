# Lane E — Billing, Entitlements, Seats & AI Credits Recon

> READ-ONLY Phase-1 audit. No fixes applied.
> Date: 2026-07-31

---

## 1. Entitlement Engine

**Primary service:** `PlanLimitsService`
**File:** `backend/src/modules/billing/core/plan-limits.service.ts`

### Public methods

| Method | Signature | Purpose |
|--------|-----------|---------|
| `resolveTier` | `(orgId: string) → {tier: PlanTier, plan: EffectivePlan}` | Reads `subscriptions` table, resolves TRIAL expiry; 30s in-memory cache per orgId |
| `getEntitlements` | `(orgId: string) → EntitlementsDto` | Returns tier + all limit counts vs caps; Redis 60s cache |
| `assertWithinLimit` | `(orgId, key: LimitKey, increment=1) → void` | Throws `ForbiddenException` (403) when `used + increment > limit`; no cache |
| `bust` | `(orgId) → void` | Evicts in-memory tier cache only (does NOT bust Redis entitlements cache) |

### Second, parallel entitlement system

`backend/src/modules/ai/core/billing/feature-gates.ts` — a completely separate feature-flag catalog with its own `PLAN_FEATURES` map and `requireFeature()` function. Used by 20+ AI controller endpoints (crm-ai, hr-ai, projects-ai). It reads `u.plan` from the JWT claim (`jwt-auth.guard.ts:184`), NOT from the database. JWT is issued at sign-in and is stale by design. This is a second entitlement engine with a different data source.

### Plan-name direct branches (outside PlanLimitsService)

All branches below use constants from `plan-entitlements.constants.ts` (correct single-source behaviour):

| Location | Line | Branch |
|----------|------|--------|
| `billing/core/plan-limits.service.ts` | 91–103 | `queryTier`: `if (plan === "ENTERPRISE")`, `if (plan === "STARTER")`, `if (plan === "PROFESSIONAL")` |
| `billing/core/plan-limits.service.ts` | 117, 195 | `tier === "ENTERPRISE"` for negotiated seats |
| `billing/core/plan-limits.service.ts` | 135 | `PLAN_LOCKED_MODULES[tier]` lookup |
| `access/entitlements.service.ts` | 148 | `PLAN_LOCKED_MODULES[tier].includes(moduleKey)` |
| `ai/core/billing/feature-gates.ts` | 39–73 | `PLAN_FEATURES[plan].has(feature)` — reads **stale JWT** |
| `ai/core/providers/llm.service.ts` | 100, 187–188 | `tier === "standard"` (AI model tier, not plan tier) — unrelated |

---

## 2. Plan/Limit Catalog

**File:** `backend/src/modules/billing/core/plan-entitlements.constants.ts`

### Plan tiers
- `PlanTier`: `"FREE" | "PAID" | "ENTERPRISE"` (line 15)
- `EffectivePlan`: `"FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"` (line 16)
- `PaidPlan`: `"STARTER" | "PROFESSIONAL" | "ENTERPRISE"` (line 17)
- Default subscription status: `TRIAL` on `STARTER` for 14 days (`DEFAULT_TRIAL_DAYS = 14`, line 109)

### LimitKeys and per-plan caps (hardcoded, NOT in DB)

| LimitKey | FREE | STARTER | PROFESSIONAL | ENTERPRISE |
|----------|------|---------|--------------|------------|
| members | 5 | 10 | 50 | 500 |
| projects | 2 | 25 | null | null |
| kbPages | 10 | 500 | null | null |
| chatChannels | 1 | 50 | 200 | null |
| crmLeads | 100 | 5000 | 50000 | null |
| crmContacts | 100 | 5000 | 50000 | null |
| crmDeals | 50 | 2500 | 25000 | null |
| supportTickets | 50 | 2000 | null | null |
| automations | 1 | 20 | 100 | null |
| signEnvelopes | 3 | 50 | 250 | null |
| surveys | 3 | 25 | null | null |
| acctInvoices | 10 | null | null | null |
| hrCandidates | 50 | 2000 | 50000 | null |
| hrJobPostings | 3 | 25 | 200 | null |

`null` = unlimited. All hardcoded in constants file, not stored in DB.

### Locked modules per plan tier

| Tier | Locked modules |
|------|---------------|
| FREE | `["payroll", "inventory"]` |
| PAID | `[]` |
| ENTERPRISE | `[]` |

Source: `plan-entitlements.constants.ts:74–78`

### Pricing
Monthly prices in paise (INR × 100): STARTER ₹999, PROFESSIONAL ₹2,499, ENTERPRISE ₹4,999. Annual: 20% off monthly × 12. Enterprise seats: negotiated via `enterprise_quotes` table (`negotiated_seats` column).

---

## 3. Enforcement Census

### assertWithinLimit call sites (production code, excluding tests)

| LimitKey | Call sites |
|----------|-----------|
| `members` | `organization/core/invitations.service.ts:160` (invite), `:355, :420` (accept; increment=0) |
| `projects` | `build/core/projects-provision.service.ts:44, :144`, `build/core/projects-templates.service.ts:102` |
| `kbPages` | `kb/kb-pages.service.ts:43`, `kb/kb-page-tree.service.ts:360`, `kb/kb-import-export.service.ts:97` |
| `chatChannels` | `chat/chat-channels.service.ts:257` |
| `crmLeads` | `leads/leads.service.ts:210, :467`, `leads/leads-ops.service.ts:239` |
| `crmContacts` | `contacts/contacts.service.ts:103, :151` |
| `crmDeals` | `deals/deals-crud.service.ts:56, :151`, `deals/deals-import-export.service.ts:20`, `leads/lead-status.service.ts:101` |
| `supportTickets` | `support/core/support-tickets.service.ts:183` |
| `automations` | `automation/automation.service.ts:435`, `settings/settings.service.ts:164`, `build/core/projects-automations.service.ts:38`, `crm/core/crm-automations.service.ts:32` |
| `signEnvelopes` | `e-sign/sign-envelopes.service.ts:64`, `e-sign/sign-templates.service.ts:303` |
| `surveys` | `surveys/survey-forms.service.ts:46, :153` |
| `acctInvoices` | `invoices/invoices-write.service.ts:46`, `inventory/sales-orders/so-lifecycle.service.ts:144`, `quotes/quotes-lifecycle.service.ts:138` |
| `hrCandidates` | `hr/recruitment/recruitment-candidates.service.ts:188` |
| `hrJobPostings` | `hr/recruitment/recruitment-jobs.service.ts:80` |

### Missing enforcement gaps

- **HR employee creation**: The `members` limit is only checked at invitation time. Direct employee record creation (HR onboarding flow via `hr/lifecycle/` and `users/user-ops.service.ts`) does NOT call `assertWithinLimit("members")`. An HR admin can onboard employees beyond seat limit if they bypass the invitation flow.
- **acctInvoices count includes voided invoices**: `fetchCount("acctInvoices")` uses bare `COUNT(*) FROM invoices WHERE org_id = ${orgId}` with no soft-delete filter. Voiding an invoice does not free quota.
- **crmDeals count**: `fetchCount("crmDeals")` is bare `COUNT(*) FROM deals WHERE org_id = ${orgId}` — no `deleted_at IS NULL`. Inconsistent with crmLeads/crmContacts which DO filter `deleted_at IS NULL`.
- **chatChannels count**: `fetchCount("chatChannels")` is bare `COUNT(*) FROM chat_channels WHERE org_id = ${orgId}` — does not filter deleted/archived channels.

---

## 4. Module Gating

### Vocabulary fix status: VERIFIED FIXED

`backend/src/common/rbac/module-vocabulary.ts` exists and exports `MODULE_CATALOG` with lowercase keys:
```ts
["hr","crm","build","accounting","inventory","kb","chat","support","surveys","payroll","sign","timesheets"]
```

`EntitlementsService` imports from `module-vocabulary.ts:17` and uses it for `getEffectiveModuleMap`/`listModules`. `ModuleGuard` (`common/rbac/module.guard.ts:27`) calls `required.toLowerCase()` before `isModuleEnabled()`. No bare `enabledModules.includes(...)` found in any non-test file.

**Prior two-vocabulary bug is FIXED.**

### ModuleGuard registration

`ModuleGuard` is **NOT** a global `APP_GUARD`. It is only exported from `access.module.ts:15` and injected per-controller via `@UseGuards(JwtAuthGuard, ModuleGuard)`. Only `JwtAuthGuard` is registered globally (`app.module.ts:165`).

**Implication:** Every controller using `@RequireModule` MUST explicitly add `ModuleGuard` to its `@UseGuards`. If omitted, the decorator is inert. Verified: accounting controllers do correctly add `ModuleGuard` in `@UseGuards`.

### Module enablement check path

`setModuleEnabled` checks `PLAN_LOCKED_MODULES[tier].includes(moduleKey)` at toggle time (entitlements.service.ts:148). Existing enablements are not retroactively revoked when plan downgrades — consistent with CLAUDE.md §16.

---

## 5. Seat Model

Three definitions exist simultaneously:

| Definition | Source | Used for |
|-----------|--------|---------|
| Active org members | `organization_members` COUNT | `billing.service.ts:getSeatInfo()` (display in `/billing/seats`) |
| Active members + pending invites | `organization_members` + `invitations WHERE status='PENDING' AND accepted_at IS NULL AND expires_at > NOW()` | `plan-limits.service.ts:fetchCount("members")` (enforcement) |
| Stored `seatCount` | `platform_subscriptions.seatCount` integer column, default 1 | Never updated; never used in enforcement |

**Enterprise seats**: Fetched from `enterprise_quotes WHERE status = 'ACCEPTED'` via `fetchNegotiatedSeats()`. Only used for ENTERPRISE tier.

**Reconciliation**: None. No cron job or trigger keeps `platform_subscriptions.seatCount` in sync. No ledger row per seat change.

**Seat count is derived by query on every `assertWithinLimit` call** — not stored/cached.

---

## 6. Subscription State Machine

### Status values (enum: `subscription_status`)
`db/schema/common/enums.ts:118`: `TRIAL | ACTIVE | PAST_DUE | CANCELLED | EXPIRED`

### Transition sites

| Transition | Code location |
|-----------|--------------|
| (new) → TRIAL | Auth/org creation (subscription row inserted with `status: "TRIAL"`) |
| TRIAL → EXPIRED | `cron/cron-billing.service.ts:33–40` (cron job, processTrialExpiry) |
| ANY → ACTIVE | `billing/core/billing.service.ts:153, 166` (verifyAndActivate, payment verified) |

### Dead status: PAST_DUE

`PAST_DUE` is defined in the enum but **never set** anywhere in the production codebase. There is no payment failure handler, no Razorpay subscription webhook that transitions a subscription to PAST_DUE. If a recurring payment fails, the subscription remains ACTIVE until manually cancelled. No grace period path exists.

### Effect of status on access

`plan-limits.service.ts:queryTier()`:
- `EXPIRED | CANCELLED` → tier=FREE, plan=FREE (access degrades to FREE limits)
- `TRIAL` with `trial_ends_at < now` → tier=FREE, plan=FREE
- `ACTIVE` with plan=ENTERPRISE/STARTER/PROFESSIONAL → normal access
- `PAST_DUE` → falls through to the final `return { tier: "FREE", plan: "FREE" }` — same degradation as EXPIRED. Correct behaviour **if PAST_DUE were ever set**.

**No suspension path.** No read-only degradation. Downgrade is immediate access restriction on next `resolveTier()` call.

---

## 7. AI Credit Ledger

### Tables

| Table | Role |
|-------|------|
| `org_ai_credits` | **Single balance row per org**: `balance` (milli-credits), `lifetimeGranted`, `lifetimeConsumed`, `autoTopUpEnabled`, `autoTopUpPackId`, `autoTopUpThreshold` |
| `ai_credit_transactions` | Append-only audit log: type ∈ {PLAN_GRANT, PURCHASE, USAGE, REFUND, ADJUSTMENT, RESERVATION_RELEASED}, `amount` (milli-credits, negative for USAGE) |
| `ai_credit_reservations` | In-flight reservations: `credits` (milli-credits deducted upfront), `status` ∈ {RESERVED, SETTLED, RELEASED}, `expiresAt` (15min), `idempotencyKey` |
| `ai_usage_logs` | Per-call token/cost log for the `/billing/ai-credits/usage` dashboard |

### Unit
**milli-credits** (integer). 1 credit = 1000 milli-credits. Conversion: `creditsToMilli`, `milliToCredits` in `ai/core/billing/ai-model-pricing.constants.ts:51–57`. API boundaries emit fractional credits via `milliToCredits` conversion.

### Credit debit — concurrency mechanism

Reserve path (`ai-credits-reservation.service.ts:43–88`):
```sql
-- 1. Lock the wallet row
SELECT … FROM org_ai_credits WHERE org_id = $1 FOR UPDATE;
-- 2. Balance check
IF wallet.balance < credits THEN throw BadRequestException("Insufficient AI credits")
-- 3. Deduct balance upfront
UPDATE org_ai_credits SET balance = balance - $credits WHERE org_id = $1;
-- 4. Insert reservation
INSERT INTO ai_credit_reservations (credits, status='RESERVED', expires_at = now()+15min, idempotency_key);
```
`SELECT ... FOR UPDATE` is the serialization primitive. No optimistic concurrency.

Settle path (`ai-credits-reservation.service.ts:110–178`):
```
actualMilli = max(0, input.actualMilli ?? reservation.credits)
delta = reservation.credits - actualMilli   -- refund if underrun, additional debit if delta < 0
balance = currentBalance + delta
lifetimeConsumed += actualMilli
```

**Balance CAN go negative**: if `actualMilli > reservation.credits` (delta < 0), balance decreases below what the reserve left. This is intentional per CLAUDE.md §16. 

Release path: restores `balance += reservation.credits` (full refund on provider failure/expiry).

### Reserve idempotency

Reservations accept an optional `idempotencyKey`. The unique constraint on `(org_id, idempotency_key)` prevents duplicate reservations. 23505 conflict is caught and the existing reservation ID is returned.

### Expiry / sweep

`sweepExpiredReservations()` releases `RESERVED` rows where `expires_at <= now`. Called by `cron-billing.service.ts:sweepAiReservations()`.

### Can balance go negative?

Yes, intentionally, if `actualMilli > reservedMilli` at settle time (model returned more tokens than estimated). The refund is capped — delta is negative, so balance drops further.

---

## 8. Metering

### Usage recording
`ai_usage_logs` table. Ingestion: one row per AI call via the gateway. The table is queried by `ai-credits-usage.service.ts:getUsage()` which runs four live `SUM()` aggregations at request time — **no pre-aggregated job**.

### Idempotency
Usage logs do not have an explicit idempotency key. Reservation dedupe is the only idempotency mechanism (prevents double-reserve). Settlement and usage log insertion are not idempotent if the `settle()` call is retried.

### Quota alerts

**None exist for plan limits** (members, projects, kbPages, etc.). No 80%/100% threshold notifications.

**No quota alerts for AI credits** either. The only alert pathway is `autoTopUpThreshold` triggering an automatic purchase (cron), not a user notification.

---

## 9. Payment Providers & Webhooks

### Providers integrated

| Provider | File | Scope |
|---------|------|-------|
| Razorpay (platform) | `billing/core/razorpay.service.ts` | StreamlineOS SaaS subscription billing (org pays us) |
| Razorpay (per-tenant) | `billing/payments/adapters/razorpay.adapter.ts` | Org charges its own customers via connected Razorpay account |

No Stripe, Cashfree, or Paddle integration found.

### Webhook paths

**Old path** (`/webhooks/razorpay` → `billing/core/razorpay-webhook.controller.ts`):
- Signature verified: YES, HMAC-SHA256 with `timingSafeEqual` (`razorpay.service.ts:78–87`)
- Raw event persisted: NO raw body. Only `platformPayments` upsert by `razorpay_payment_id`
- Dedupe: `onConflictDoUpdate` by `razorpayPaymentId` — idempotent by payment ID
- Payload validated with Zod before processing (`webhookEventSchema.safeParse`)
- Processing: inline in HTTP handler
- No queuing

**New path** (`/webhooks/payments/:providerKey/:environment/:orgId` → `billing/payments/payment-webhooks-public.controller.ts`):
- Signature verified: YES, via adapter (`verifyWebhookSignature`) before any DB write (`payment-webhook-health.service.ts:183–211`)
- Raw event persisted: Redacted summary only (`payloadRedacted` — id, status, amount, currency from entity). Raw body NOT stored.
- Dedupe: `onConflictDoNothing` on `unique(provider_id, environment, provider_event_id)` — idempotent by provider event ID. Event ID falls back to SHA-256 of raw body if header absent.
- Processing: inline (no queue). Finance bridge `recordProviderPayment` called in same request.
- No daily reconciliation job.

**Both paths**: No async queuing. Both process inline in the HTTP request.

---

## 10. Error Codes — 402 vs 403

### Current state

| Scenario | HTTP Status | Machine-readable code |
|---------|------------|----------------------|
| Plan quota exceeded (`assertWithinLimit`) | **403** `ForbiddenException` | **None** |
| AI credits exhausted (kb) | 402 | `INSUFFICIENT_CREDITS` (`kb/kb.errors.ts:6`) |
| AI credits exhausted (mail) | 402 | None (`mail/mail.controller.ts:164,182,200`) |
| AI credits exhausted (gateway) | 402 | None (`ai/core/services/gateway-result.util.ts:13`) |
| AI credits exhausted (feedbucket) | 402 | None (`feedbucket/feedbucket-public.controller.ts:399`) |
| Feature requires higher plan (`requireFeature`) | 402 | None (`feature-gates.ts:91–99`, body has `requiredPlan`) |
| Module disabled (`ModuleDisabledException`) | **404** | `MODULE_DISABLED` (`common/http/api-exceptions.ts:6`) |

**Problems:**
- Plan quota limits return 403 — front-end cannot reliably distinguish "you lack permission" from "upgrade to add more". The user sees a generic error rather than an upgrade prompt.
- `ModuleDisabledException` returns 404 — misleading. A user hitting a route for a disabled module gets "Not Found" semantics, which could be confused with a routing error.
- 402 responses outside AI credits have no machine-readable `code` field.
- `assertWithinLimit` has no `code` field at all; its error message is human-readable only.

---

## 11. Invoicing / Tax

This section covers the **org's customer-facing invoices** (`/invoices`, `invoices/` module) — the accounting feature — NOT platform billing.

### Platform boundary
- **Platform billing** (StreamlineOS bills the org): `/billing/**`, `subscriptions` table, `subscription_payments`, `platform_payments`.
- **Org accounting invoices** (org bills its customers): `/invoices/**`, `invoices` table, `invoice_items`, `invoices-write.service.ts`.
These are fully separate. The `billing/core/billing.service.ts:getSummary()` method queries the `invoices` table for invoice stats as a convenience summary — this is the only crossing point and it is read-only.

### GST handling
- GSTIN validation regex (`invoice-write.schemas.ts:3`): `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- Per-line `hsnSacCode` and `gstRate` fields
- CGST/SGST/IGST split computation (`invoice-helpers.ts`)
- `place_of_supply` state code
- `reverseCharge` boolean
- `customerGstin`, `supplierGstin` on invoice header
- Conclusion: GST compliance fields are present and validated.

### Invoice numbering
`invoices-write.service.ts:94–104`:
```ts
await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`);
const countRows = await tx.select({ count: sql<number>`count(*)::int` }).from(invoices).where(eq(invoices.orgId, orgId));
const nextNum = (countRows[0]?.count ?? 0) + 1;
const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
```
- Advisory lock ensures no concurrent duplicate within one DB session
- **Gap-prone**: If any invoice is hard-deleted, the count decreases and the number can be reused. Voiding does not hard-delete, so voiding is safe. But any admin deletion creates a gap/reuse risk.
- **Year reset**: Year prefix changes annually but count is total lifetime (not per-year sequence). `INV-2026-0010` and `INV-2027-0010` could coexist.
- **Not a DB sequence**: Advisory-lock + COUNT is not as robust as a DB `serial` or `nextval('invoice_seq')`.

### Credit notes
- `voidInvoice` exists (lifecycle.service.ts:83) — creates a reversal journal entry
- No explicit credit note entity or separate credit note type; voiding is the only reversal mechanism

---

## 12. Top Findings

| Sev | File:Line | Finding |
|-----|-----------|---------|
| **P0** | `billing/core/plan-limits.service.ts:205` | `assertWithinLimit` throws 403 `ForbiddenException`, not 402. Frontend cannot distinguish "access denied" from "quota exceeded—upgrade." No machine-readable error code emitted. |
| **P0** | `ai/core/billing/feature-gates.ts:79–99` + `jwt-auth.guard.ts:184` | `requireFeature(u.plan, …)` reads plan from stale JWT claim. Org that downgrades retains premium AI feature access until JWT expires. Paywall bypass via stale token. |
| **P0** | `db/schema/common/enums.ts:118` + all billing services | `PAST_DUE` subscription status is defined but never set. No payment failure transition path. A failed Razorpay charge leaves subscription ACTIVE indefinitely. Revenue leak. |
| **P0** | `common/http/api-exceptions.ts:6` | `ModuleDisabledException` returns HTTP **404**, not 402/403. "Module not on this plan" looks like a 404 routing error to clients. |
| **P1** | `billing/core/plan-limits.service.ts:225–237` (acctInvoices `fetchCount`) | Voided invoices still count against `acctInvoices` quota. `COUNT(*) FROM invoices` has no soft-delete filter. Cannot replace a voided invoice without hitting the limit. |
| **P1** | `billing/core/plan-limits.service.ts:270–280` (crmDeals `fetchCount`) | Deals count has no `deleted_at IS NULL` filter. Inconsistent with crmLeads/crmContacts which do filter soft-deletes. |
| **P1** | `billing/core/plan-limits.service.ts:63` + `billing/core/billing.service.ts:192` | `bust(orgId)` evicts in-memory tier cache only. Redis entitlements cache (`billing:entitlements:${orgId}`) TTL is 60s and is NOT invalidated on payment activation. Stale entitlements served for up to 60s after upgrade. |
| **P1** | `billing/core/ai-credits-reservation.service.ts:110–178` | `settle()` is not idempotent — if called twice, it inserts two USAGE transactions and double-debits `lifetimeConsumed`. |
| **P1** | `hr/` (no assertWithinLimit found) | HR direct employee onboarding (non-invitation path) does not call `assertWithinLimit("members")`. Only the invitation creation is gated. Seat limit can be bypassed via direct onboarding. |
| **P1** | `db/schema/common/platform.ts:100` | `platform_subscriptions.seatCount` column defaults to 1, is never updated, and is never read in limit enforcement. Dead field creating false audit trail. |
| **P1** | `billing/core/billing.service.ts:485–494` vs `plan-limits.service.ts:226–238` | Two different seat count definitions: display uses `organization_members` only; enforcement uses members + pending invites. User sees "4 used" but enforcement may see 5. Confusing UX. |
| **P2** | `billing/core/ai-credit-units.ts:1–12` | Monthly plan AI credit grants are hardcoded as flat amounts (STARTER=500, PROFESSIONAL=2000, ENTERPRISE=10000). No DB config, no env override, requires code deploy to change. |
| **P2** | `invoices/invoices-write.service.ts:99–104` | Invoice numbering uses `COUNT(*)+1` within advisory lock. Not a DB sequence. Gap-prone on hard-delete; year-boundary creates non-sequential series. Legal risk for customer invoices. |
| **P2** | No quota alert found | No 80%/100% threshold notifications for any plan limit. Users hit walls with no warning. |
| **P2** | `cron/cron-billing.service.ts:119–154` | Auto top-up same-day guard uses date string keyed to `YYYY-MM-DD` UTC. Wallets at threshold near UTC midnight can be topped up twice in one business day. |

---

## 13. Coverage Gaps

- `billing/payments/payment-readiness.service.ts` — skimmed for provider checks only; not fully audited
- `billing/core/revenue-analytics.service.ts` — not audited (out of scope)
- `billing/payments/payment-manual-methods.service.ts` — not audited
- `finance/` module (accounting AP/AR) — only boundary determination audited
- Webhook retry path (`payment-webhook-health.service.ts:276`) — retry idempotency not verified
- AI gateway `*WithUsage` variants — not audited for credit reserve/settle correctness per endpoint
- `platform/` module — not audited (out of scope)
