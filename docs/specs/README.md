# Architecture review 2026-08-23 — nine candidate PRDs

**None of the nine is proven 100% complete.** Re-audited at source on 2026-08-25 against every acceptance criterion and focused tests. The PRDs are retained because each still has at least one unverified or unmet criterion; no file is safe to delete yet.

| # | Candidate | Closed by |
|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam | Partial: indexing/backfill and end-to-end parity proof remain |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | Partial: runtime sources are bundled, so individual source toggles are not complete |
| [c3](c3-one-representation-of-capability.md) | One representation of capability | Partial: server/client representations and full proof remain |
| [c4](c4-module-availability-interface.md) | One interface for module availability | Partial: production callers still assemble inputs differently |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | Partial: billing still handles provider secrets and hard-codes provider resolution |
| [c6](c6-split-kb-help-centre-and-wiki.md) | Split the two products inside `kb/` | Partial: `report:kb-article-migration` now produces tenant-safe closure evidence; retirement still requires a zero backlog and intake decision |
| [c7](c7-chat-message-fanout.md) | Chat send path as a fan-out module | Partial: durable retry, queue swap, and sender-query removal remain |
| [c8](c8-frontend-server-data-seam.md) | Frontend server-data seam | Partial: duplicate server adapter and failed-prefetch proof remain |
| [c9](c9-transactional-outbox-decision.md) | Decide what the outbox is for | Decision recorded: generic domain events use `outbox_events`; notification intents use the dedicated notification ledger with explicit guarantees |

## The successor program

The four-pass review of **2026-08-25** produced fifteen further candidates (c10–c24) and 72 tickets. They live together in **[`architecture-refactor/`](../../architecture-refactor/README.md)** at the repository root — PRD and tickets side by side per candidate — so that program stays separate from the rest of `docs/`.

## Reading these

- **No file path or line number is load-bearing.** They were accurate when written and cited as evidence, not instruction.
- Candidates the review deliberately did not raise — downgrade not revoking a paid module, the frontend permission subset, two-segment keys, `PermissionGuard` not being global, per-request transaction count, jsonb reactions, plaintext invite tokens, serial primary keys, unpartitioned chat — are recorded decisions or already-disproved claims. Do not re-raise them.
