# c5 — Route the money through the adapter that already exists

Spec: [`docs/specs/c5-payment-provider-adapter.md`](../../docs/specs/c5-payment-provider-adapter.md)

**Candidate status: not started — the only one of the nine that has not moved, and the only remaining gap on a money path.** A correct adapter interface and registry exist and three services use them. The billing service — the one that moves real money — injects the concrete provider directly and calls it at eleven sites, including all three operations the interface was written for. The review's deletion test still holds: delete the interface and the registry, and the billing service compiles unchanged.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 03 | [Orders and payment signatures go through the seam](issues/03-order-creation-and-signature-verification-go-through-the-registry.md) | 02 | **done** |
| 04 | [Adding a second payment provider costs one adapter](issues/04-billing-names-no-provider.md) | 03 | **done** — one leak named |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Webhook verification is deliberately first among the migrations.** It is the highest-risk operation and the one with no coverage today, and it is where the raw-body handling can go wrong in a way that accepts forged payments. It also ships the fake adapter that 03 and 04 depend on. Write its test before its change.

**The work is small and the risk is concentrated.** Eleven call sites in one file, against an interface that already declares the right operations with the right parameters. Almost all of the danger is in one of them.
