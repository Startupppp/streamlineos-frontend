# Architecture review 2026-08-23 — nine candidate PRDs

**Implementation status re-audited at source on 2026-08-26.** The scoped c1–c9 seams are implemented and focused tests pass, but the PRDs remain because not every acceptance criterion has 100% production evidence yet. CRM, Inventory, and HRMS ticket work is excluded by direction.

Live c6/c9 report summaries are recorded in [`runtime-evidence-2026-08-26.md`](runtime-evidence-2026-08-26.md).

| # | Candidate | Closed by |
|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam | Implemented: lifecycle-only indexing, bounded resumable backfill with explicit apply guard, seeded direct/keyword/vector parity coverage, and denial-of-wallet tests; one text-bearing page still needs the guarded backfill and live seeded artifact remains unavailable |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | Implemented: granular source adapters, production registration coverage, preference-isolation coverage, and a tenant-scoped read-only 38-organization integrity sweep; live HTTP/controller proof remains |
| [c3](c3-one-representation-of-capability.md) | One representation of capability | Implemented: scope-map seam, hydration contract, and non-excluded capability callers migrated; full production proof remains |
| [c4](c4-module-availability-interface.md) | One interface for module availability | Implemented: canonical entitlement resolver, parity tests, and production wiring regression coverage; live database proof remains |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | Implemented: configured-provider resolver, billing isolation, provider-neutral webhook normalization, neutral headers, and legacy Razorpay delegation through the provider seam; provider delivery/replay evidence remains operational |
| [c6](c6-split-kb-help-centre-and-wiki.md) | Split the two products inside `kb/` | Implemented: split, namespace, permanent conversion-tool policy, failure-safe report, and live 38-tenant report; one published article remains migratable |
| [c7](c7-chat-message-fanout.md) | Chat send path as a fan-out module | Implemented: transactional outbox fan-out, injectable provider seam, durable retry, lease-fenced external-effect ledger, and per-recipient/subscription effect keys; provider-enforced exactly-once remains unproven |
| [c8](c8-frontend-server-data-seam.md) | Frontend server-data seam | Implemented: duplicate adapter removed, failed-prefetch proof, first-server-HTML contracts, route verifier, and production-build manifest coverage added; live authenticated browser proof remains |
| [c9](c9-transactional-outbox-decision.md) | Decide what the outbox is for | Decision, leased worker, retry/fencing, complete report, stable effect keys, and durable external-effect ledger implemented; migration deployment, provider-side dedupe, and fault-injection evidence remain |

## The successor program

The four-pass review of **2026-08-25** produced fifteen further candidates (c10–c24) and 72 tickets. They live together in **[`architecture-refactor/`](../../architecture-refactor/README.md)** at the repository root — PRD and tickets side by side per candidate — so that program stays separate from the rest of `docs/`.

## Reading these

- **No file path or line number is load-bearing.** They were accurate when written and cited as evidence, not instruction.
- Candidates the review deliberately did not raise — downgrade not revoking a paid module, the frontend permission subset, two-segment keys, `PermissionGuard` not being global, per-request transaction count, jsonb reactions, plaintext invite tokens, serial primary keys, unpartitioned chat — are recorded decisions or already-disproved claims. Do not re-raise them.
