# L06 Billing Report

## Lane: S05 billing/invoices/quotes

---

## Work Done

### 1. Split `payment-webhook-health.service.ts` (580 → 230 lines)

**Root cause:** the file mixed endpoint management (CRUD on webhook endpoints) with receiver/processing logic.

**Solution:** extracted `PaymentWebhookReceiverService` into `payment-webhook-receiver.service.ts` (352 lines, within the 500-line cap). All dependents updated:

- `payment-webhooks-public.controller.ts` — injects `PaymentWebhookReceiverService`
- `core/billing-webhook.handler.ts` — `BillingWebhookDeps.paymentWebhooks` type updated
- `core/billing.service.ts` — injects `PaymentWebhookReceiverService`
- `payments/payments.module.ts` — registers and exports `PaymentWebhookReceiverService`
- Four spec files that provided `PaymentWebhookHealthService` updated to `PaymentWebhookReceiverService`:
  - `billing-webhook.spec.ts`
  - `billing-idempotency.spec.ts`
  - `billing-proration-wiring.spec.ts`
  - `billing.service.spec.ts`

Pure functions `validateNormalizedPaymentWebhook` and `resolveProviderEventId` moved to `payment-webhook-receiver.service.ts`; `payment-webhook-contract.spec.ts` import updated.

### 2. New isolation tests

`backend/src/modules/billing/core/__tests__/billing-tenant-isolation.spec.ts` (10 tests, all green):

| Service | DENY case | CONTROL case |
|---|---|---|
| `AiCreditsPacksService.listTransactions` | WHERE predicate scoped to attacker org, returns empty | returns items for owner org |
| `ReferralService.listReferrals` | WHERE predicate scoped to attacker org | returns referrals |
| `MarketplaceService.listApps` | installations WHERE scoped to attacker org | returns apps with installation |
| `EnterpriseQuotesService.findOne` | throws `NotFoundException` (404, not 403) | returns quote |
| `InvoiceSnapshotService.getSnapshot` | throws `NotFoundException` | returns snapshot with lines |

### 3. Fixed `resolveSystemAccount` public interface (accounting/posting)

`FinancePostingAccountsService` was extracted by the L07 accounting lane, moving `resolveSystemAccount` off `FinancePostingService`. Eight call sites in `finance/tax/*.service.ts` depend on `this.posting.resolveSystemAccount(...)`.

Fix: added a forwarding method on `FinancePostingService`:
```typescript
async resolveSystemAccount(orgId: string, purpose: SystemAccountPurpose): Promise<number> {
  return this.accounts.resolveSystemAccount(orgId, purpose);
}
```
Import: `SystemAccountPurpose` sourced from `../core/finance-posting.types`. No callers had to change.

---

## Validation Results

- Billing suite: **439/439 pass**
- finance-posting + billing combined: **463/463 pass**
- `pnpm check:route-classification`: **0 undeclared — PASS**
- `pnpm check:idempotent-commands`: **PASS**
- `pnpm check:tenant-isolation`: 327 services missing isolation tests (60% covered — pre-existing state, not caused by this lane)
- `tsc --noEmit`: not run (other lanes editing concurrently; targeted jest confirms correct types in owned files)
- Lint/tests beyond targeted jest: not run (not requested)

---

## KNOWN-DONE (verified, not re-raised)

- Three-state `ProviderEventLedger.claim()` — VERIFIED DONE in source
- `billing.revenue-event` outbox consumer — VERIFIED DONE (`RevenueAnalyticsService` self-registers in `onModuleInit`)
- Guard audit billing/invoices/quotes — 0 violations found

## Outbox consumers — no-consumer decision

Three events emitted by `BillingService` have no registered consumer:
- `accounting.invoice.paid`
- `accounting.payment.received`
- `accounting.invoice.issued`

Decision: these are accounting-domain events owned by the L07 accounting lane. No consumer in the billing tree is appropriate. L07 is responsible for registering consumers if accounting needs to react to them.

---

## Files Changed

- `backend/src/modules/billing/payments/payment-webhook-receiver.service.ts` — NEW (352 lines)
- `backend/src/modules/billing/payments/payment-webhook-health.service.ts` — trimmed to 230 lines (endpoint management only)
- `backend/src/modules/billing/payments/payment-webhooks-public.controller.ts`
- `backend/src/modules/billing/payments/payments.module.ts`
- `backend/src/modules/billing/core/billing-webhook.handler.ts`
- `backend/src/modules/billing/core/billing.service.ts`
- `backend/src/modules/billing/core/billing.service.spec.ts`
- `backend/src/modules/billing/core/billing-webhook.spec.ts`
- `backend/src/modules/billing/core/billing-proration-wiring.spec.ts`
- `backend/src/modules/billing/core/__tests__/billing-idempotency.spec.ts`
- `backend/src/modules/billing/core/__tests__/billing-tenant-isolation.spec.ts` — NEW (10 isolation tests)
- `backend/src/modules/billing/payments/payment-webhook-contract.spec.ts`
- `backend/src/modules/accounting/posting/finance-posting.service.ts` — forwarding `resolveSystemAccount`
