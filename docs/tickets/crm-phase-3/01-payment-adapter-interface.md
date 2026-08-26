# 01 — Extract the payment adapter interface

**Status:** not started
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

- [ ] One interface expresses what billing needs from a provider: charge, refund, subscription lifecycle, webhook verification.
- [ ] The existing Razorpay integration is refactored **behind** it, not left beside a second parallel path.
- [ ] No billing call site branches on which provider is in use.
- [ ] The three references outside billing are either routed through the interface or documented as genuinely provider-specific with a reason.
- [ ] **Behaviour does not change.** Every existing billing test passes unchanged; if a test needed editing, behaviour changed and that is the finding.
- [ ] Webhook handling is exercised by posting the provider's documented payload shapes, including out-of-order and duplicate deliveries.
