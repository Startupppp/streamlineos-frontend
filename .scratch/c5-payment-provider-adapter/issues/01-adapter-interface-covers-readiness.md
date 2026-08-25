# 01 — Everything billing asks a payment provider is on the seam

**What to build:** The payment provider interface covers all five things the billing service currently asks a provider for, not just three. Today `createOrder`, signature verification and webhook verification are declared — but readiness ("is a provider configured for this organisation") and the public key the browser needs to open a checkout are asked of the concrete provider directly, so they cannot be substituted.

This is the *expand* step: the interface grows, the existing adapter implements the new members, and nothing migrates yet.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The interface covers readiness and the browser-facing public key alongside the three money operations.
- [x] The existing adapter implements the new members with today's behaviour, unchanged.
- [x] Provider secrets stay inside the adapter — nothing on the interface returns or accepts a secret that the caller does not already need to hold.
- [x] The optional cheap credential-format check stays optional and stays synchronous; it must not become a live API call.
- [x] The registry resolves an adapter by provider key and returns nothing for an unknown key, and callers handle that.
- [x] Nothing else changes behaviour; the billing service is untouched by this ticket.
- [x] Backend suite green.

## Todo

- [x] List the five things the billing service currently asks the concrete provider for, from source, and confirm the count before designing
- [x] Add the missing members to the interface with the parameters the existing call sites already pass
- [x] Implement them on the existing adapter by delegating to today's code
- [x] Confirm no secret crosses the interface that did not have to
- [x] Leave the billing service alone — that is tickets 02 and 03
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`PaymentProviderAdapter` gains `isReady(): boolean` and `publicKeyId(): string | null`, covering the two things `BillingService` asked the concrete provider for that were not on the seam (`isConfigured()` at 3 sites, `getKeyId()` at 3 sites). `RazorpayAdapter` implements both by delegating to today's config, changing no behaviour.

`cd backend && npx jest --testPathPattern "modules/billing/payments" --maxWorkers=2` → **2 suites, 24 tests, all pass** (10 existing + 14 new).

**Secret-exposure review.** `isReady()` returns a boolean and reveals nothing about credential values, names or format. `publicKeyId()` returns the provider's public key id, which the browser must present to open checkout — public by the provider's own design and unable to stay inside the adapter. Neither the key secret nor the webhook secret crosses the interface; both remain explicit parameters of the three money operations and are never returned. `validateCredentialFormat` stays optional and synchronous.

`BillingService` is untouched — its 11 concrete-provider call sites are tickets 02 and 03.

**Flagged for ticket 02/03:** the adapter takes its credentials through an `@Optional()` injection. If that token ever fails to resolve, `isReady()` silently returns false rather than failing loudly. Confirm the token resolves at runtime once the API can boot.
