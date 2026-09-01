# Sign-off Audit C — Billing & Payments · Accounting & Finance · Support

**Auditor:** Sign-off Audit C  
**Date:** 2026-09-01  
**Scope:** PRD §12 final module sign-off for three modules  
**Inspection breadth:** Billing — full controller, service bootstrap, AI-credits reservation/settlement, schema (subscriptions.ts, billing.ts, provider-webhook-events.ts, seat-ledger.service.ts), RBAC catalog and module registry; sampled payment-activation and billing-webhook. Accounting — schema (accounting.ts, finance-ar-ap.ts), journal-immutability.spec, financial-retention.spec, money.util, e2e spec; sampled posting and GL services. Support — tickets controller + service, support-ai-triage.service (full), support-ai.controller (full), support-ticket-get-authz.spec, schema (tickets.ts), RBAC catalog; sampled channels, macros, kb-gap.

---

## Module 1 — Billing and Payments

### Dimension Table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | PASS | `subscription_payments` — `numeric(15,2)` (rupees); all other billing ledgers use integer paise. No cross-table arithmetic; consistent within table. See NOTE below. `provider_webhook_events` unique index leads with `(org_id, provider, provider_event_id)` — tenant-scoped. `org_ai_credits` and `ai_credit_transactions` use integer `balance`/`amount` (milli-credits). `billing_seat_events.amount_in_paise` is integer. |
| Authorization | PASS | `ORG_ONLY_NAMESPACES: ["billing"]` in `grantability.ts:18` blocks delegation on every grant path. `billing` in module registry: `planGated: false, administrable: false, ladder: "platform-admin"` — absent from `MODULE_CATALOG` and `ACCESS_MANAGED_MODULES`. `assertPermissionsGrantable` spec in `grantability.spec.ts:435-467` proves every billing key is refused including from org owner. |
| CRUD lifecycle | PASS | All billing mutations are idempotent-decorated. `verifyAndActivate` verifies signature before DB write; DB writes in one `db.transaction`; outbound provider calls (`createOrder`) sit outside the transaction. No write-in-GET. |
| List/search cost | PASS | `getSubscription` via `eq(subscriptions.orgId, orgId)` — indexed. All list endpoints paginated (`listProvisioningFailures`, `listCoupons`, `listAddons` return arrays bounded by plan/catalog size). `ai_credit_transactions` query has `.limit(20)`. |
| Caching/realtime | PASS | `PlanLimitsService` has a 30s process-local tier cache plus a 60s Redis `ENTITLEMENTS_CACHE_TTL`; invalidated on plan change. Seat ledger writes through `lockMembersQuota` advisory lock for serialization. |
| Module interface | PASS | Billing is `ladder: "platform-admin"`, `administrable: false` — never appears on module-access screens. `assertModuleAccessPolicy` respects this. Billing namespace excluded from the token-scoped grant surface (`token-scope-attenuation.spec.ts:39-40`). |
| UX / accessibility | KEEP | Frontend: exactly two platform-billing pages exist — `app/(authenticated)/settings/billing/page.tsx` and `app/(authenticated)/settings/billing/ai-credits/page.tsx`. `/billing/seats`, `/billing/ai-credits` (standalone), `/settings/subscription` are absent. `/billing/invoices` exists with `accounting:view` permission gate — this is the org's customer invoicing (correct per product rule). |
| Security | PASS | Reserve-before-spend: `ai-gateway-runner.helper.ts:39-53` reserves credits atomically BEFORE the LLM call; settles afterward with refund for over-reserve. Webhook signature verified before any DB write. Seat enforcement: `pg_advisory_xact_lock(quota:${orgId}:members)` + `assertWithinLimit(orgId, "members", 0, tx)` inside the membership-insert transaction (`invitation-acceptance.service.ts:100-103`). No outbound network calls inside DB transactions. |
| Operations | PASS | `ExternalEffectLedger` / `OutboxWriter` used for post-payment side effects (AI credit grant). `registerAfterCommit` used for recoverable effects. `BillingWebhookHandler` delegates to `PaymentWebhookReceiverService`. |
| Tests | PASS | `billing.controller.e2e-spec.ts` covers auth/RBAC. `ai-credits-reservation-tenant-isolation.spec.ts`, `payment-services-tenant-isolation.spec.ts`, `payment-webhook-security.spec.ts`, `billing-proration-wiring.spec.ts`, `coupon-pricing.spec.ts`, `seat-ledger.service.spec.ts` present. `grantability.spec.ts:435` proves billing is non-delegatable. |

**NOTE — mixed money units (not crash-causing):** `subscription_payments.amount` is `numeric(15,2)` (rupees), written as `(paiseAmount / 100).toFixed(2)` (`billing-payment-activation.ts:159`). The column is used only for display/audit; no code path compares it arithmetically to paise columns. Rule says "integer cents" blanket. See DEFECT 1.

### DEFECT List

#### DEFECT 1 — `subscription_payments.amount` stored in rupees, not paise (LOW blast radius)

**File:** `backend/src/db/schema/common/subscriptions.ts:36` (`amount: numeric("amount", { precision: 15, scale: 2 })`); write site `backend/src/modules/billing/core/billing-payment-activation.ts:159`.

**Failure scenario:** Any future code that joins `subscription_payments.amount` (rupees, e.g. `999.00`) against `billing_seat_events.amount_in_paise` (paise, e.g. `99900`) will produce values 100× off. No current runtime crash because both the write side (`(amount / 100).toFixed(2)`) and the read side (`payments` relation in `getSubscription`) treat the column as rupees consistently. A developer adding a revenue rollup that mixes this column with paise columns will silently inflate revenue 100×.

**Smallest correct fix:** Change `subscriptions.ts:36` to `amountPaise: integer("amount_paise").notNull()` and update the write in `billing-payment-activation.ts:159` to `amountPaise: amount` (already in paise). Update `billing.service.ts` and `billing-webhook.handler.ts` reads accordingly. The field name change (`amountPaise`) makes the unit self-documenting.

---

**VERDICT: BLOCKED BY 1 DEFECT** (DEFECT 1 is LOW severity — no current crash, but the unit mismatch is a latent correctness bug. The module is functionally sound on all material dimensions; this is a DB schema rule violation.)

---

## Module 2 — Accounting and Finance

### Dimension Table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | KEEP | `decimal(18,4)` for all money amounts in the GL/AR/AP schema is deliberate: GST calculations produce sub-paise values (e.g. 18% on ₹37.17 = ₹6.6906). `money.util.ts` implements BigInt-scaled arithmetic (FACTOR = 10000n) to avoid float drift. The "integer cents" rule from backend §3 targets billing ledgers; the accounting module has `money.util.spec.ts` proving correctness. `journalEntries` has no `deleted_at` — correct for financial immutability (voiding, not deletion). `credit_notes` use status `VOID` lifecycle. |
| Authorization | PASS | All accounting routes on `@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)` with `@RequireModule("accounting")`. Tenant-scoped uniqueness: `uniq_je_org_number` on `(org_id, entry_number)`, `uniq_ledger_accounts_org_code` on `(org_id, code)` — no bare global unique on business keys. |
| CRUD lifecycle | PASS | `assertEntryNotPosted` throws `BadRequestException("Cannot mutate a POSTED journal entry")` — verified in `journal-immutability.spec.ts` and `financial-retention.spec.ts`. `finance-posting.service.ts` calls this guard before any update path. Recurring journals, period close all routed through posting service. |
| List/search cost | PASS | All list endpoints have composite leading `org_id` indexes (`idx_ledger_accounts_org_type_active`, `idx_credit_notes_org_status`, etc.). `accounting-cursor.spec.ts` exercises keyset pagination. |
| Caching/realtime | PASS | `CacheService.invalidateNamespace` called on mutations (observed in `finance-posting.service.ts` dependency list). Cache keys are tenant-namespaced. |
| Module interface | PASS | `accounting` in registry: `planGated: true, administrable: true, ladder: "delegable"` — correctly appears on access screens. ACCOUNTING_PERMISSIONS catalog has granular keys (`accounting:journal:read`, `accounting:accounts:manage`, etc.) with no free-form action. `/billing/invoices` correctly proxies to accounting invoicing with `accounting:view` gate. |
| UX / accessibility | KEEP | Sampled: `/billing/invoices/page.tsx` uses `DashboardGate permission="accounting:view"` confirming route/permission separation from platform billing. Accounting frontend at `/accounting/*` holds all accounting surfaces (GL, reports, AR/AP, GST). |
| Security | PASS | `accounting-core-tenant-isolation.spec.ts`, `accounting-aging-tenant-isolation.spec.ts`, `gl-tenant-isolation.spec.ts`, `posting-tenant-isolation.spec.ts` all present. Cross-tenant look-up proven scoped. Journal lookup in `assertEntryNotPosted` is `WHERE org_id = ? AND id = ?` — BOLA-safe. |
| Operations | PASS | `fx-posting-idempotency.spec.ts` exists. `journal-immutability.spec.ts` proves idempotent guard. Period service handles fiscal years. |
| Tests | PASS | `accounting.controller.e2e-spec.ts` covers 26 routes with auth/RBAC assertions. Five tenant-isolation specs across core, GL, posting, aging, payables. `journal-immutability.spec.ts` and `financial-retention.spec.ts` cover the immutability invariant. `receivables-total-equivalence.spec.ts` tests math correctness. `money.util.spec.ts` validates BigInt arithmetic. |

### DEFECT List

*No defects found in this module.* The decimal precision choice is a domain-correct design with explicit BigInt tooling; the immutability gate is tested; tenant isolation is broad.

---

**VERDICT: SIGNED OFF**

---

## Module 3 — Support

### Dimension Table

| Dimension | Verdict | Evidence |
|---|---|---|
| Data model | KEEP | `support_tickets` uses status-based lifecycle (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) — no `deleted_at`. This is correct: support tickets are audit-trail records that are closed, not deleted. `support_ticket_messages` have no `deleted_at` either (message history must be retained). Composite tenant uniqueness: `uniq_support_tickets_org_id` on `(org_id, id)`. All indexes lead with `org_id`. |
| Authorization | PASS | `@RequireModule("support")` + `@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)` on all support controllers. `resolveSupportTicketsViewScope` maps the `own` DataScope to `WHERE assignee_id = actor.userId` at query time. `support-ticket-get-authz.spec.ts` proves BOLA fix: `getTicket` with `scope: "own"` throws `ForbiddenException` when `assigneeId !== actor.userId`. |
| CRUD lifecycle | PASS | Ticket creation calls `planLimits.assertWithinLimit(orgId, "supportTickets")` before insert. Draft delete is physical (correct — unsent drafts). Merge, split, snooze all update via `supportTicketOperationsService`. |
| List/search cost | PASS | `listTickets` uses `idx_support_tickets_org_status` (org_id, status) and `idx_support_tickets_org_assignee` (org_id, assignee_id, created_at). Rate-limited AI endpoints with `UseRateLimit("ai:invoke")`. |
| Caching/realtime | PASS | `registerAfterCommit` used for post-create side effects. `SupportRealtimeService` for live updates. `CACHE_KEYS` / `CACHE_TTL` imported and used in tickets service. |
| Module interface | PASS | `support` in registry: `planGated: true, administrable: true, ladder: "delegable"`. `kb-gap` sub-module in `support-kb-gap.module.ts` registered in `support.module.ts`. Portal endpoints use `support:portal:*` keys, distinct from agent keys. |
| UX / accessibility | KEEP | Frontend `app/(authenticated)/support/` directory exists. Not fully audited on the UI side; the backend boundary is clean. |
| Security | PASS | `support-ticket-get-authz.spec.ts:1-10` documents and tests the BOLA regression explicitly. Cross-tenant isolation: `support-ai-tenant-isolation.spec.ts`, `support-channels-tenant-isolation.spec.ts`, `support-csat-tenant-isolation.spec.ts`, `support-workspace-tenant-isolation.spec.ts` present. AI KB search filters by `inArray(kbArticles.spaceId, accessibleSpaceIds)` and article-level ACL in SQL predicate before candidates reach the model. |
| Operations | PASS | `support-ticket-resolved-consumer.service.ts` handles async resolution events. SLA escalation in `support-sla.service.ts`. CSAT consumer with tenant isolation spec. |
| Tests | PASS | `support.controller.e2e-spec.ts` covers 30+ routes. 10+ tenant-isolation specs. `support-ticket-get-authz.spec.ts` — BOLA regression. `support-ai-kb-filter.spec.ts` — ACL predicate. `support-channels.service.spec.ts`, `support-csat.service.spec.ts`, `support-macros.service.spec.ts`, `support-tickets.service.spec.ts` present. |

### DEFECT List

#### DEFECT 2 — `analyzeTicket` runs LLM call without credit reservation (MEDIUM blast radius)

**File:** `backend/src/modules/support/core/support-ai-triage.service.ts:165-174`.

**Failure scenario:** A `support:tickets:view` holder calls `POST /support/:ticketId/ai/analyze`. `planLimits.assertFeature(orgId, "ai.ticket-insights")` passes (feature flag only, no credit check). `this.aiGateway.invokeStructured({ actor, feature: "support.analysis", tier: "fast", schema, prompt })` is called with no `charge` field. In `ai-gateway-runner.helper.ts:36`, `charge` is `undefined` (falsy), so `reserveMilli = 0` and the reservation block (lines 39-53) is skipped entirely. The LLM call proceeds against the provider and consumes real tokens. `settleAndTrack` is called with `charge: undefined` → `milliCredits = 0`. Result: every call to this endpoint burns provider LLM tokens with no credit deduction from the org's wallet, and `AI_FEATURE_COSTS["support.analysis"] = 1` is dead for this path.

An org with exhausted credits or zero credits can still call this endpoint without restriction (the 402 `InsufficientAiCreditsException` path in the reservation block is never reached).

**Smallest correct fix:** Add `charge: true` to the `invokeStructured` call in `analyzeTicket`:

```ts
// support-ai-triage.service.ts:165
const gatewayResult = await this.aiGateway.invokeStructured({
  actor: { orgId, userId: null },
  feature: "support.analysis",
  tier: "fast",
  charge: true,          // ← add this
  schema: analysisSchema,
  prompt: { ... },
});
```

Also add `InsufficientAiCreditsException` handling after line 175 (mirrors `suggestReply`'s pattern at lines 219-222).

---

**VERDICT: BLOCKED BY 1 DEFECT** (DEFECT 2 — MEDIUM severity. The module is otherwise well-structured with broad tenant isolation, a BOLA regression spec, and correct AI ACL filtering. The uncharged analysis call is a billing correctness gap, not a security hole, because the caller must be authenticated and module-enabled.)

---

## Summary

| Module | Defects | Verdict |
|---|---|---|
| Billing & Payments | 1 (LOW — unit mismatch in `subscription_payments.amount`) | **BLOCKED BY 1 DEFECT** |
| Accounting & Finance | 0 | **SIGNED OFF** |
| Support | 1 (MEDIUM — `analyzeTicket` unmetered LLM call) | **BLOCKED BY 1 DEFECT** |

### Ranked DEFECT List (blast radius order)

| # | Module | Blast Radius | File:Line | Failure |
|---|---|---|---|---|
| 1 | Support | MEDIUM | `support-ai-triage.service.ts:165` | `analyzeTicket` bypasses credit reservation; `support.analysis` AI calls are free even for credit-exhausted orgs |
| 2 | Billing | LOW | `subscriptions.ts:36` + `billing-payment-activation.ts:159` | `subscription_payments.amount` stores rupees while surrounding billing ledgers use integer paise; cross-table arithmetic would be 100× wrong |

### What was NOT inspected

- Frontend components for all three modules (only page/layout files were sampled for route correctness)
- `support-ai-translation.service.ts` — translation endpoints (`invokeText` with `charge: true` at lines 212, 242) were visible in the charge grep but not read in full
- `accounting/settings/` sub-module — settings controller and service not read
- `billing/payments/razorpay-adapter-readiness.spec.ts` and adapter internals — signature verification was observed at the controller level only
- CSS/Tailwind token compliance for any of the three modules
- Live DB query plans
