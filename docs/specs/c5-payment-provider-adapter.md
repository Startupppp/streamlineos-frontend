# c5 · Route the money through the adapter that already exists

**Status: implemented with strict boundary follow-up.** Re-audited at source 2026-08-27. Billing resolves an organisation-configured provider through `PaymentProviderResolver`; concrete adapters own credential handling, and the legacy Razorpay compatibility route delegates through the provider-neutral webhook seam. Focused adapter, substitution, forged-signature, and replay tests pass. Live provider delivery/replay and provider-side duplicate-suppression evidence remain operational gates.

**Current audit (2026-08-27):** Billing resolves an organisation-configured provider through `PaymentProviderResolver`, keeps provider credentials out of `BillingService`, routes the legacy Razorpay compatibility boundary through provider-neutral handling, and has provider substitution/webhook failure coverage. The remaining strict evidence is live provider delivery, replay, and downstream acknowledgement behavior; repository tests cannot prove provider-side duplicate suppression.

## Problem Statement

**As a developer, the seam is decorative on the only path that matters.** The interface declares exactly three money operations — `createOrder`, `verifyPaymentSignature`, `verifyWebhookSignature` — and all three are called on the concrete `RazorpayService` from `BillingService`:

| Operation | Adapter interface | `BillingService` calls |
|---|---|---|
| `createOrder` | declared | `:107`, `:434` |
| `verifyPaymentSignature` | declared | `:129` |
| `verifyWebhookSignature` | declared | `:272` |
| provider readiness | `validateCredentialFormat` | `isConfigured()` at `:82`, `:125`, `:644`; `getKeyId()` at `:76`, `:117`, `:447` |

The review's deletion test is the diagnosis and it still holds: delete the interface and the registry and `BillingService` compiles unchanged. A seam with zero enforcement on the path it was built for is not an abstraction — it is a comment that happens to type-check.

**As a developer writing a billing test, I have to mock Razorpay.** `BillingService`'s dependency is a provider-typed class, so there is no fake to inject. Every test of order creation, signature verification or webhook handling either mocks a concrete third-party client or does not exist.

**As the business entering a second geography, adding a provider is a rewrite of `BillingService`, not an adapter.** The registry exists so a second provider costs one file. It cannot, because the file that spends money does not read the registry.

**As a security reviewer, signature verification is the highest-value code in the system and it is reached by a hard-coded path.** `verifyWebhookSignature` at `:272` is what stands between the webhook endpoint and a forged payment confirmation. It is not behind an interface, cannot be substituted in a test, and cannot be exercised with a deliberately wrong secret without touching the real service.

## Solution

`BillingService` injects `PaymentProviderAdapterRegistry` instead of `RazorpayService` and resolves the org's configured provider through it. The three money operations become adapter calls. `RazorpayService` keeps existing as the adapter's implementation detail; nothing outside `payments/adapters/` names it.

Provider readiness (`isConfigured`, `getKeyId`) is the fourth thing `BillingService` asks Razorpay for, and it is not on the interface. It needs to be, or it needs to move behind `PaymentReadinessService` — which already resolves adapters from the registry and already answers this question.

## User Stories

1. As a developer, I want `BillingService` to name no payment provider, so that the provider is a configuration fact rather than a compile-time one.
2. As a developer, I want to test order creation against a fake adapter, so that a billing test does not require a Razorpay client.
3. As a developer, I want to test signature verification with a deliberately wrong signature, so that the rejection path has coverage.
4. As a developer, I want to test webhook verification with a forged body, so that the most security-critical branch in billing is exercised.
5. As a developer adding a second provider, I want to write one adapter, so that the second geography is additive rather than a rewrite.
6. As a developer, I want the deletion test to bite: removing the interface should break `BillingService` loudly.
7. As a security reviewer, I want every signature check to go through one interface, so that there is one place to audit and one place to harden.
8. As a security reviewer, I want a webhook whose signature does not verify to be rejected before any state changes, so that verification order is testable rather than assumed.
9. As a security reviewer, I want provider secrets to stay inside the adapter, so that `BillingService` never holds a key it could log.
10. As an operator, I want an organisation whose provider is unconfigured to fail with a clear, non-leaking error, so that a missing credential is diagnosable without exposing which credential.
11. As an operator, I want a provider key that is malformed to be caught by `validateCredentialFormat` at setup, so that the failure happens before a customer is mid-checkout.
12. As a customer paying an invoice, I want the payment to be created and verified by the provider my organisation actually configured, so that resolution is per-organisation rather than global.
13. As a customer, I want a failed verification to leave no partial record, so that a rejected payment cannot be replayed as a successful one.
14. As the business, I want to add a provider without a migration, so that geography is a registry entry.

## Implementation Decisions

- **`BillingService` injects `PaymentProviderAdapterRegistry`.** `RazorpayService` leaves its constructor. This is the whole candidate; everything else follows.
- **Provider resolution is per-organisation, not global.** `PaymentProviderSetupService` already stores which provider an org configured and `PaymentReadinessService` already resolves an adapter from a `providerKey`. `BillingService` uses the same path rather than assuming one provider exists.
- **`isConfigured` and `getKeyId` are decided, not left ambient.** They are the fourth and fifth things `BillingService` asks the provider and they are not on the interface. Either add them (`readiness()` returning a small value object; `publicKeyId()` for the client-side handoff), or route those six call sites through `PaymentReadinessService`, which already owns readiness. Adding them to the interface is the recommendation: `getKeyId` returns a value the browser needs, which makes it a genuine provider capability rather than an internal detail.
- **Webhook verification resolves the adapter before parsing the body.** The current call at `:272` verifies against `RazorpayService` using the raw body; the adapter takes `{ rawBody, signature, webhookSecret }`, so the raw body must still reach it unparsed. Confirm no body parser has already consumed it on that route.
- **The adapter interface is unchanged.** It is correct. `createOrder`, `verifyPaymentSignature` and `verifyWebhookSignature` already carry the exact parameters `BillingService` passes today.
- **`RazorpayService` is not deleted.** It becomes reachable only from `RazorpayAdapter`. Enforce that by import, not by convention — nothing outside `payments/adapters/` should import it after this change.
- **A fake adapter ships with the change.** Not a mock configured per test — one `FakeProviderAdapter` in the test tree implementing the interface with deterministic signatures. That is the artefact that makes stories 2–4 possible, and its absence is why they are stories rather than existing tests.

## Testing Decisions

**What makes a good test here.** Test `BillingService` against the fake adapter, asserting the observable outcome of a billing operation — an order recorded, a payment marked verified, a webhook accepted or rejected. Do not assert that a particular adapter method was called; that is the implementation the seam exists to hide. The one exception is story 8, where *ordering* is the behaviour: assert that no state changed, not that verification ran first.

- **Order creation** — a configured org creates an order and records it; an org with no configured provider fails with an error that names neither the key nor the secret.
- **Payment signature** — a correct signature marks the payment verified; a wrong signature does not, and leaves no partial record. This is story 13 and it is the case most likely to be missing today.
- **Webhook** — a valid signature is processed; a forged body is rejected with no state change. Assert the absence of the side effect, not the presence of a call.
- **Provider substitution** — the same billing flow driven by two different fake adapters produces the same domain outcome with different provider identifiers. This is the test that proves the seam is real, and it is impossible to write today.
- **Registry resolution** — an unknown `providerKey` returns `undefined` and is handled, rather than throwing an unhandled 500.
- **Trap:** any spec touching `db.transaction` must have a mock that invokes its callback. A bare `jest.fn()` silently voids every assertion inside the transaction — and billing writes are transactional, so this trap applies directly here.
- **Idempotency** is adjacent and worth asserting while in this code: a replayed webhook must not double-credit. Existing behaviour; pin it before changing the path it runs on.

## Out of Scope

- **Actually adding a second provider.** This candidate makes it a one-file change; it does not make the change.
- **The AI credit ledger and token metering.** Different money, different path — `AiCreditsService` is not a payment provider concern.
- **The org's own customer invoicing** under accounting. That is the org billing its customers, unrelated to the platform billing its orgs.
- **The two-page Settings billing surface.** No route changes.
- **Migrating away from Razorpay.** It stays the first and only registered adapter.

## Further Notes

- **This is the only one of the nine that has not moved at all**, and the only one where the gap is on a money path. Five of the nine shipped between the review and now; this one did not.
- **The work is small and the risk is concentrated.** Eleven call sites in one file, against an interface that already declares exactly the right operations with exactly the right parameters. The risk is entirely in webhook signature verification: get the raw-body handling wrong and forged payments are accepted. Write that test first.
- **The three services that already use the registry are the pattern to copy.** `payment-readiness.service.ts:68` shows the resolve-then-use shape, including the `undefined` case. `BillingService` needs the same shape, eleven times.
- **`validateCredentialFormat` is optional on the interface** and Razorpay implements it. That is the right design — a cheap synchronous prefix check, explicitly not a live API call — and it is worth keeping in mind for story 11: the setup path already catches malformed keys, so `BillingService` should be able to assume a resolved adapter has usable credentials.
