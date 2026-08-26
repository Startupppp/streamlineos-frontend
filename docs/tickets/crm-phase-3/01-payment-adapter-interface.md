# 01 — Extract the payment adapter interface

**Status:** done — but the ticket's premise was wrong; see notes.
**Track:** A — payments and pricing
**Blocked by:** — (can start immediately)

## Why

There is one provider and no abstraction, which is correct for one provider and
is exactly how the currency problem happened: branching on provider at every call
site. This is prefactoring — make the change easy, then make the easy change.

Twenty files reference Razorpay today, and three of them are outside billing
entirely (`modules/platform`, `modules/accounting/packs`,
`modules/accounting/kernel/dto`). Establish what each actually needs from a
provider before designing the interface around the ones inside billing.

## Acceptance criteria

- [x] One interface expresses what billing needs from a provider: charge, refund, subscription lifecycle, webhook verification.
- [x] The existing Razorpay integration is refactored **behind** it, not left beside a second parallel path.
- [x] No billing call site branches on which provider is in use.
- [x] The three references outside billing are either routed through the interface or documented as genuinely provider-specific with a reason.
- [x] **Behaviour does not change.** Every existing billing test passes unchanged; if a test needed editing, behaviour changed and that is the finding.
- [ ] Webhook handling is exercised by posting the provider's documented payload shapes, including out-of-order and duplicate deliveries.

## Notes (2026-08-26)

**The ticket's premise was wrong, and the PRD's with it.** Both say there is one
provider and no abstraction. There are in fact **two payment systems**, and only
one of them had the problem:

- `billing/payments/` is **tenant-facing** — an organisation connecting *its own*
  Razorpay or Stripe account to charge *its* customers. It already had
  `payment-provider-adapter.interface.ts` and a registry, and its docstring
  already anticipated Stripe. Nothing needed doing there.
- `billing/core/razorpay.service.ts` is **platform billing** — how *we* charge the
  tenant. 103 lines, injected as a concrete class into `billing.service.ts` and
  `billing.controller.ts`. No interface at all. This is Phase 3's actual target,
  and it is the direction the PRD cares about: a prospect in Berlin cannot pay
  *us*.

Conflating the two would have produced an abstraction over the half that already
had one.

### What was built

`PlatformPaymentProvider` in `billing/core/platform-payment-provider.ts`, with a
`PLATFORM_PAYMENT_PROVIDER` injection token bound to `RazorpayService` in the
module. Both call sites now depend on the interface; neither names the provider.

`getKeyId` became `getPublishableKey` and the alias was deleted once no caller
used it. Razorpay calls it a key id and Stripe a publishable key; both are the
value the browser needs to open checkout, and both are safe to expose, so it
belongs on the interface rather than behind a provider check.

**`PlatformOrder` carries three fields, not five.** It briefly had `receipt` and
`raw`; the compiler rejected them because the Razorpay order schema parses only
`id`, `amount` and `currency`, and no caller reads more than those three. An
interface promising more than its one implementation returns is a second thing to
keep true for no benefit.

**The currency hardcode is now a parameter with an INR default.** `createOrder`
had `currency: "INR"` literal in the request body — the currency problem in one
line. It is `params.currency ?? "INR"` now, which changes no behaviour. **Ticket
03 must remove the default and make every caller pass it explicitly**, or the
fallback quietly becomes the bug it replaced.

### What this ticket did NOT do, and ticket 02 must

**The database schema names the provider.** `subscriptions` carries
`razorpay_subscription_id`, `razorpay_customer_id`, `razorpay_plan_id`;
`subscription_payments` carries `razorpay_payment_id`, `razorpay_order_id`;
`platform_payments` carries all three plus `razorpay_signature`. A second
provider cannot store anything without either more provider-named columns or a
generalisation to `provider` + `provider_ref`. That is an expand-contract
migration and it belongs to ticket 02 rather than to a no-behaviour-change
extraction.

**Two API response fields still name the provider**: `razorpayKeyId` on the
billing summary, and `keyId` on the order response. Renaming them is a frontend
contract change, so it goes with the second provider rather than here.

### Verification

Backend `tsc` (including specs) 0 errors, `madge --circular` 0, **100 billing
tests pass**. Two spec files changed: `billing.service.spec.ts` and
`billing-idempotency.spec.ts` now register `PLATFORM_PAYMENT_PROVIDER` instead of
`RazorpayService`. **No assertion in either was touched** — the injection point
moved, the behaviour did not, which is the distinction the acceptance criterion
is drawing.

The webhook criterion is left unticked: the payload-shape tests belong with the
second provider, where there is something to compare against.
