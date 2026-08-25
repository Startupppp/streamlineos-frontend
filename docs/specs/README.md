# Architecture review 2026-08-23 — nine candidate PRDs

**Implementation status re-audited at source on 2026-08-26.** The scoped c1–c9 seams are implemented and focused tests pass, but the PRDs remain because not every acceptance criterion has 100% production evidence yet. CRM, Inventory, and HRMS ticket work is excluded by direction.

| # | Candidate | Closed by |
|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam | Implemented: bounded resumable backfill and parity tests; live end-to-end backfill proof remains |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | Implemented: registry preferences and granular HR source adapters; production source rollout proof remains |
| [c3](c3-one-representation-of-capability.md) | One representation of capability | Implemented: scope-map seam and hydration contract; full production proof remains |
| [c4](c4-module-availability-interface.md) | One interface for module availability | Implemented: canonical entitlement resolver and parity tests; full production proof remains |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | Implemented: resolver/adapter boundary and secret isolation; one legacy webhook expectation still needs closure |
| [c6](c6-split-kb-help-centre-and-wiki.md) | Split the two products inside `kb/` | Partial: `report:kb-article-migration` now produces tenant-safe closure evidence; retirement still requires a zero backlog and intake decision |
| [c7](c7-chat-message-fanout.md) | Chat send path as a fan-out module | Implemented: transactional outbox fan-out with durable retry tests; broker/queue integration remains environment-dependent |
| [c8](c8-frontend-server-data-seam.md) | Frontend server-data seam | Implemented: duplicate adapter removed and failed-prefetch proof added |
| [c9](c9-transactional-outbox-decision.md) | Decide what the outbox is for | Decision recorded: generic domain events use `outbox_events`; notification intents use the dedicated notification ledger with explicit guarantees |

## The successor program

The four-pass review of **2026-08-25** produced fifteen further candidates (c10–c24) and 72 tickets. They live together in **[`architecture-refactor/`](../../architecture-refactor/README.md)** at the repository root — PRD and tickets side by side per candidate — so that program stays separate from the rest of `docs/`.

## Reading these

- **No file path or line number is load-bearing.** They were accurate when written and cited as evidence, not instruction.
- Candidates the review deliberately did not raise — downgrade not revoking a paid module, the frontend permission subset, two-segment keys, `PermissionGuard` not being global, per-request transaction count, jsonb reactions, plaintext invite tokens, serial primary keys, unpartitioned chat — are recorded decisions or already-disproved claims. Do not re-raise them.
