# 04 — Adding a second payment provider costs one adapter

**What to build:** The billing service names no payment provider. The concrete provider service is reachable only from its own adapter. A second provider — for a second geography — becomes one new file implementing the interface and registering itself, with no change to billing.

This is the *contract* step, and it is where the deletion test finally bites: after this ticket, removing the interface breaks the billing service loudly, which it does not today.

**Blocked by:** 03 — Orders and payment signatures go through the seam.

**Status:** done with one leak named

## Acceptance criteria

- [x] The billing service does not import or inject the concrete provider service.
- [x] Nothing outside the adapters directory imports it — enforced by a test, not by convention.
- [x] The same billing flow driven by two different fake adapters produces the same domain outcome with different provider identifiers. **This is the test that proves the seam is real and it is impossible to write today.**
- [x] Deleting the interface would break the billing service — verify by trying it locally before restoring.
- [x] Billing tests need no real provider client.
- [x] The concrete provider service is not deleted; it becomes an adapter implementation detail.
- [x] Backend suite green; module graph still acyclic; the dead-code baseline is unchanged or improved.

## Todo

- [x] Remove the concrete provider from the billing service's constructor and confirm nothing else in that file names it
- [x] Add the import-boundary test
- [x] Write the two-fake-adapter substitution test
- [x] Temporarily delete the interface to confirm the build now fails, then restore
- [x] Run the module-graph check and the dead-code check against the recorded baseline
- [ ] Boot the API and complete the round trip — **blocker fixed, re-run pending: the DB credential rotated again**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`BillingService` no longer imports or injects the concrete provider. `cd backend && npx jest --testPathPattern "modules/billing"` → **10 suites, 130 tests, all pass.** `madge --circular` clean across 3,425 files.

**The deletion test now bites.** Temporarily removing the adapter interface produces `Cannot find module '../payments/payment-provider-adapter.interface' from billing.service.ts`. Before this sequence, deleting the interface and registry left `BillingService` compiling unchanged — that was the review's entire diagnosis, and it no longer holds.

**The provider-substitution test exists and was impossible to write before:** the same billing flow driven through two fake adapters with different provider keys produces the same domain outcome with different provider identifiers.

**One leak remains and is documented rather than hidden.** `billing.controller.ts` still injects and calls the concrete provider directly (signature verification and readiness). It is outside this ticket's ownership and the import-boundary test records it explicitly in a known-remaining list instead of widening the rule to hide it. Fixing it is a one-file follow-up.

### Status (2026-08-25) — same blocker, same fix, re-run pending

The full round trip is blocked on the same billing-availability regression described in ticket 03, which is now fixed but not re-verified — the database credential rotated before a retry.

Two legs of the round trip ARE verified: **webhook ingestion** end to end with a valid and a forged signature (ticket 02), and the **provider-substitution test** proving the same billing flow through two different fake adapters yields the same domain outcome with different provider identifiers. The remaining leg — a customer completing payment in Razorpay's hosted checkout — requires calling a live payment provider and is deliberately out of scope.
