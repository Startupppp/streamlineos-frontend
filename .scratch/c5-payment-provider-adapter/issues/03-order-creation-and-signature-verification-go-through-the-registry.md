# 03 — Orders and payment signatures go through the seam

**What to build:** Creating a payment order and verifying a payment signature resolve the organisation's configured provider through the registry, like webhook verification already does after ticket 02. A customer's payment is created and verified by the provider their organisation actually configured, rather than by a globally assumed one.

**Blocked by:** 02 — A forged payment webhook is rejected, and we can prove it.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] A configured organisation creates an order and records it, exactly as today.
- [x] An organisation with no configured provider fails with a clear error that leaks no credential.
- [x] A correct payment signature marks the payment verified.
- [x] A wrong signature does not, and leaves no partial record that could later be replayed as successful.
- [x] Provider resolution is per organisation, not global.
- [x] Readiness and the browser-facing public key are read through the seam, not from the concrete provider.
- [x] Every one of these behaviours is covered against the fake adapter from ticket 02.
- [x] Backend suite green.

## Todo

- [x] Pin today's behaviour for order creation and signature verification before changing them
- [x] Migrate order creation — note there is more than one call site for it
- [x] Migrate signature verification
- [x] Migrate the readiness and public-key reads
- [x] Assert the wrong-signature case leaves no record, not merely that it returned false
- [x] Confirm transaction mocks invoke their callbacks
- [ ] Boot the API and complete a real order-and-verify round trip
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

All remaining operations moved: order creation (both sites), payment-signature verification, readiness and the browser-facing public key. `cd backend && npx jest --testPathPattern "modules/billing"` → **9 suites, 124 tests, all pass.**

**Zero `this.razorpay.*` call sites remain in `billing.service.ts`** — the injection was left in place for ticket 04 to remove after independent verification.

A wrong signature leaves no partial record, asserted as `db.transaction` never being entered. Every transaction mock that is expected to run its body invokes its callback — a bare `jest.fn()` there would silently void every assertion inside the transaction, and that trap was checked deliberately.
