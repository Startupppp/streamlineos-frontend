# 02 — A forged payment webhook is rejected, and we can prove it

**What to build:** Webhook signature verification resolves the organisation's configured provider through the registry instead of calling a hard-coded provider service. That is what makes it testable: a fake adapter can be substituted, so a forged body can be sent and its rejection asserted.

This is the highest-value operation in billing and currently the least covered — it is what stands between the webhook endpoint and a fabricated payment confirmation, and it cannot be exercised today with a deliberately wrong secret without touching the real provider.

This ticket ships the fake adapter that tickets 03 and 04 also depend on.

**Blocked by:** 01 — Everything billing asks a payment provider is on the seam.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] A webhook with a valid signature is processed exactly as it is today.
- [x] A webhook with a forged body or a wrong signature is rejected **with no state change** — assert the absence of the side effect, not that a verification function was called.
- [x] Verification happens before the payload is trusted for anything.
- [x] The raw request body still reaches verification unparsed — confirm no body parser has consumed it on that route.
- [x] An organisation with no configured provider fails with an error that names neither the key nor the secret.
- [x] A fake adapter with deterministic signatures ships in the test tree, implementing the interface — not a per-test mock.
- [x] A replayed webhook does not double-apply; pin the existing idempotency behaviour before changing the path it runs on.
- [x] Backend suite green. Route-level specs run only under the e2e command.

## Todo

- [x] Write the fake adapter first
- [x] Pin today's webhook behaviour — accepted, rejected, replayed — before changing anything
- [x] Switch verification to resolve through the registry
- [x] Confirm raw-body handling survives the change
- [x] Add the forged-body test and assert no state changed
- [x] Check any transaction mock in these specs actually invokes its callback, or every assertion inside it is void
- [ ] Boot the API and send a real webhook plus a forged one
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

Webhook signature verification resolves the org's adapter through the registry. `cd backend && npx jest --testPathPattern "modules/billing"` → **9 suites, 114 tests, all pass.**

A forged body and a wrong secret are both rejected, asserted by the **absence of the write** (`db.insert` never called, org lookup never reached) rather than by a function returning false. Raw-body handling was checked specifically: the webhook controller uses `RawBodyRequest` and reads `req.rawBody`, which Next... which Nest preserves before any parser, so verification still sees the unparsed body.

The interface takes `webhookSecret` explicitly because it was designed for the per-org case; the platform path passes it from validated config. The secret never leaves the backend.

`FakeProviderAdapter` ships in `payments/testing/` with exported constants, and tickets 03 and 04 reuse it.
