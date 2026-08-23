# T01 — The money path goes through the adapter

**What to build:** `BillingService` injects `PaymentProviderAdapterRegistry` instead of `RazorpayService`.

The adapter interface is already right — `createOrder`, `verifyPaymentSignature`, `verifyWebhookSignature` — and `RazorpayAdapter` implements it. Four services use the registry, and all four are configuration concerns: setup, readiness, test transaction, webhook health.

The service that moves money does not. `billing.service.ts` imports `RazorpayService` at line 25, injects it at line 57, and calls it directly for order creation (`:107`), payment verification (`:129`) and webhook verification (`:272`). Two things are called "adapter" with different contracts: the interface returns `{ providerOrderId, raw }`, the service returns a Razorpay-typed order.

Delete the interface and the registry and `BillingService` compiles unchanged. That is the diagnosis: a seam with zero enforcement on the path it exists for.

**Owns (exclusive):**
- `backend/src/modules/billing/core/billing.service.ts`
- `backend/src/modules/billing/payments/**`

**Blocked by:** nothing
**Wave:** 1
**Status:** ready-for-agent

- [ ] `BillingService` injects the registry. It does not import `RazorpayService`.
- [ ] Order creation, payment verification and webhook verification all go through the interface.
- [ ] No Razorpay-typed shape crosses the seam. Anything `BillingService` needs from `raw` is named on the interface — **and if it needs a field no other provider could supply, stop and say so** rather than widening the interface to fit one provider.
- [ ] Webhook handling is provider-dispatched. The route may keep its path for compatibility; the handler must not assume the provider.
- [ ] An unknown or unconfigured provider is **refused**, never assumed.
- [ ] **No behaviour change.** Same orders, same signature outcomes, same webhook results. This is a routing change and the tests must show that.
- [ ] The proof this ticket exists for: **an in-memory adapter drives the whole checkout path in a test.** Today that is impossible.
- [ ] A test asserts an invalid signature is rejected through the registry.
- [ ] A test asserts billing tests run with no Razorpay credentials configured.
- [ ] Mutation check: point the registry at an adapter that rejects every signature — the verification tests must fail.
- [ ] `razorpay.adapter.spec.ts` passes unchanged.
- [ ] Money stays integer cents throughout. No float touches an amount.
- [ ] `tsc --noEmit` exit 0 and the billing specs pass by path.
- [ ] Billing is **not** added to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`, and `assertPermissionsGrantable` still refuses the whole `billing:` namespace on every grant path including the org owner's own. Platform billing is never delegated.
- [ ] **NOT verified unless stated:** no real payment was taken and no real webhook was received. Say so.

**Not in this ticket:** adding a second provider. This makes it cheap; it does not do it.
