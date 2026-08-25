# 03 — Orders and payment signatures go through the seam

**What to build:** Creating a payment order and verifying a payment signature resolve the organisation's configured provider through the registry, like webhook verification already does after ticket 02. A customer's payment is created and verified by the provider their organisation actually configured, rather than by a globally assumed one.

**Blocked by:** 02 — A forged payment webhook is rejected, and we can prove it.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A configured organisation creates an order and records it, exactly as today.
- [ ] An organisation with no configured provider fails with a clear error that leaks no credential.
- [ ] A correct payment signature marks the payment verified.
- [ ] A wrong signature does not, and leaves no partial record that could later be replayed as successful.
- [ ] Provider resolution is per organisation, not global.
- [ ] Readiness and the browser-facing public key are read through the seam, not from the concrete provider.
- [ ] Every one of these behaviours is covered against the fake adapter from ticket 02.
- [ ] Backend suite green.

## Todo

- [ ] Pin today's behaviour for order creation and signature verification before changing them
- [ ] Migrate order creation — note there is more than one call site for it
- [ ] Migrate signature verification
- [ ] Migrate the readiness and public-key reads
- [ ] Assert the wrong-signature case leaves no record, not merely that it returned false
- [ ] Confirm transaction mocks invoke their callbacks
- [ ] Boot the API and complete a real order-and-verify round trip
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
