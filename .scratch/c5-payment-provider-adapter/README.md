# c5 — Route the money through the adapter that already exists

Spec: [`docs/specs/c5-payment-provider-adapter.md`](../../docs/specs/c5-payment-provider-adapter.md)

**Candidate status: not started — the only one of the nine that has not moved, and the only remaining gap on a money path.** A correct adapter interface and registry exist and three services use them. The billing service — the one that moves real money — injects the concrete provider directly and calls it at eleven sites, including all three operations the interface was written for. The review's deletion test still holds: delete the interface and the registry, and the billing service compiles unchanged.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| — | all four tickets complete and retired | — | **candidate complete** |

**Candidate closed 2026-08-25.** All tickets are done and their files deleted; this README is the record.

**The round trip, run against a booted API and a live database:**

- `POST /billing/checkout` → `200` with a real provider order: `{"orderId":"order_TTySQXAx8rPp91","amount":249900,"currency":"INR","keyId":"rzp_test_…","plan":"PROFESSIONAL"}`. The order is created through the registry and the browser-facing public key is read through the seam, not from the concrete provider.
- `PATCH /billing/razorpay` with a forged signature → `400 "Payment verification failed: invalid signature"`. No credential in the message.
- The subscription was `STARTER`/`TRIAL` before the forged call and `STARTER`/`TRIAL` after it. **The proof is the absence of the write** — a rejected signature that still activated a plan would be the actual bug, and only reading the row afterwards can show it did not.

One thing the run taught: the verify route is `PATCH /billing/razorpay` and it is `@Idempotent`, so it rejects with `400 "An Idempotency-Key header is required"` before any signature check. A test that omits the header proves nothing about signatures.

**Webhook verification is deliberately first among the migrations.** It is the highest-risk operation and the one with no coverage today, and it is where the raw-body handling can go wrong in a way that accepts forged payments. It also ships the fake adapter that 03 and 04 depend on. Write its test before its change.

**The work is small and the risk is concentrated.** Eleven call sites in one file, against an interface that already declares the right operations with the right parameters. Almost all of the danger is in one of them.
