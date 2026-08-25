# 02 — A forged payment webhook is rejected, and we can prove it

**What to build:** Webhook signature verification resolves the organisation's configured provider through the registry instead of calling a hard-coded provider service. That is what makes it testable: a fake adapter can be substituted, so a forged body can be sent and its rejection asserted.

This is the highest-value operation in billing and currently the least covered — it is what stands between the webhook endpoint and a fabricated payment confirmation, and it cannot be exercised today with a deliberately wrong secret without touching the real provider.

This ticket ships the fake adapter that tickets 03 and 04 also depend on.

**Blocked by:** 01 — Everything billing asks a payment provider is on the seam.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A webhook with a valid signature is processed exactly as it is today.
- [ ] A webhook with a forged body or a wrong signature is rejected **with no state change** — assert the absence of the side effect, not that a verification function was called.
- [ ] Verification happens before the payload is trusted for anything.
- [ ] The raw request body still reaches verification unparsed — confirm no body parser has consumed it on that route.
- [ ] An organisation with no configured provider fails with an error that names neither the key nor the secret.
- [ ] A fake adapter with deterministic signatures ships in the test tree, implementing the interface — not a per-test mock.
- [ ] A replayed webhook does not double-apply; pin the existing idempotency behaviour before changing the path it runs on.
- [ ] Backend suite green. Route-level specs run only under the e2e command.

## Todo

- [ ] Write the fake adapter first
- [ ] Pin today's webhook behaviour — accepted, rejected, replayed — before changing anything
- [ ] Switch verification to resolve through the registry
- [ ] Confirm raw-body handling survives the change
- [ ] Add the forged-body test and assert no state changed
- [ ] Check any transaction mock in these specs actually invokes its callback, or every assertion inside it is void
- [ ] Boot the API and send a real webhook plus a forged one
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
