# Architecture review 2026-08-23 — nine candidate PRDs

**All nine are closed.** Re-verified at source on 2026-08-25; eight had moved further than their own status line claimed. These files are kept as history — each PRD's status line predates the work that closed it.

| # | Candidate | Closed by |
|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam | `isPageIndexable` is lifecycle-only now — no visibility rule at index time |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | `calendar_source_preferences` table + service; per-person toggles persist |
| [c3](c3-one-representation-of-capability.md) | One representation of capability | Flat array gone, `usePermissions` removed, `useScope` has a production consumer |
| [c4](c4-module-availability-interface.md) | One interface for module availability | One `isCoreModuleKey`; the four remaining stubs are all test fixtures |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | Adapter + `adapters/`, zero provider calls in `BillingService`, import-boundary spec |
| [c6](c6-split-kb-help-centre-and-wiki.md) | Split the two products inside `kb/` | `help-centre/` and `wiki/` split; no dual frontend directories |
| [c7](c7-chat-message-fanout.md) | Chat send path as a fan-out module | `ChatMessageFanoutService` behind `MessageFanout` |
| [c8](c8-frontend-server-data-seam.md) | Frontend server-data seam | 28 of 29 retired; 11 hydration boundaries, 5 prefetch modules |
| [c9](c9-transactional-outbox-decision.md) | Decide what the outbox is for | Wired — 6 consumers register via `InboxConsumer`, flush is cron-guarded |

## The successor program

The four-pass review of **2026-08-25** produced fifteen further candidates (c10–c24) and 72 tickets. They live together in **[`architecture-refactor/`](../../architecture-refactor/README.md)** at the repository root — PRD and tickets side by side per candidate — so that program stays separate from the rest of `docs/`.

## Reading these

- **No file path or line number is load-bearing.** They were accurate when written and cited as evidence, not instruction.
- Candidates the review deliberately did not raise — downgrade not revoking a paid module, the frontend permission subset, two-segment keys, `PermissionGuard` not being global, per-request transaction count, jsonb reactions, plaintext invite tokens, serial primary keys, unpartitioned chat — are recorded decisions or already-disproved claims. Do not re-raise them.
