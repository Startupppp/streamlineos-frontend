# Architecture review — nine candidate PRDs

Derived from the architecture review of **2026-08-23** (scope: org- and module-level RBAC, billing, chat, calendar, notifications, inbox, knowledge base / wiki, chatbot).

**Every candidate was re-verified at source on 2026-08-25 before its PRD was written.** Five had shipped in the ~85 commits between the review and that date. Each PRD is headed with its verified status and specs only what actually remains — read the status line before planning work.

| # | Candidate | Verified status | What remains |
|---|---|---|---|
| [c1](c1-kb-visibility-seam.md) | KB visibility predicate as a seam both paths cross | **Shipped**, one residue | `isPageIndexable` still hand-writes a visibility rule at index time — no longer a leak, now a capability gap: authors and project members cannot find their own pages via search |
| [c2](c2-calendar-source-registry.md) | Calendar source seam | **Shipped** | Per-person source toggles are not stored, so the product's "toggleable sources" promise is half delivered |
| [c3](c3-one-representation-of-capability.md) | One representation of "what may this person do" | **Half shipped** | Server still builds the flat array; `usePermissions()` resurrected it on the client; gated controls still flash; `useScope` has no production consumer |
| [c4](c4-module-availability-interface.md) | One interface answers module availability | **Seam shipped, inputs did not** | Two of four callers stub `getPlanLockedModules`; three different definitions of `isCoreModule` feed the one seam |
| [c5](c5-payment-provider-adapter.md) | Route the money through the adapter | **Not started** | `BillingService` injects `RazorpayService` and calls it at 11 sites, including all three money operations the interface declares |
| [c6](c6-split-kb-help-centre-and-wiki.md) | Split the two products inside `kb/` | **Shipped on the backend** | Frontend still has `features/kb` vs `features/knowledge-base`; `migration/` has no end date; shared `kb:` namespace is undecided |
| [c7](c7-chat-message-fanout.md) | Chat send path as a fan-out module | **Shipped** | Seam built but unused for its purpose: push is still in-process, and the fan-out re-reads the sender on every message |
| [c8](c8-frontend-server-data-seam.md) | Frontend server-data seam | **Seam built, rollout at 1 route** | 590 pages, 343 `"use client"` — unchanged. One route prefetches. Access is the highest-leverage next one |
| [c9](c9-transactional-outbox-decision.md) | Decide what the transactional outbox is for | **Unchanged — a decision, not a defect** | 23 producers, 1 consumer, `flush()` a no-op by design. Wire it or retire it |

## Suggested order

1. **c8's access prefetch** — one edit to the authenticated layout. Ends the gated-control flash on every authenticated page and closes half of c3.
2. **c4's stubbed inputs** — two `async () => []` literals delete a branch of a state machine. Reconcile `isCoreModule` first, behind the snapshot/authorize parity test.
3. **c5** — the only remaining gap on a money path, and the only candidate that has not moved at all.
4. **c3's backend half** — five call sites, one `@Global()` service, and a test that cannot be written today.
5. **c6's frontend rename** — cheapest work in the review, highest legibility payoff.
6. **c9** — decide, with the row-count evidence, before any code moves.
7. **c1's index eligibility** and **c7's sender read** — small, safe, do them when in the file.
8. **c2's toggles** — a product feature, not an architecture fix; schedule as such.

## Reading these

- **No file paths with line numbers are load-bearing.** They were accurate on 2026-08-25 and cited as evidence, not as instructions. Re-read at source.
- **The review itself is one day stale in places** — c3 in particular. Anyone working from the review HTML rather than these PRDs will try to delete fields that no longer exist.
- Candidates the review deliberately did not raise (downgrade not revoking a paid module, the frontend permission subset, two-segment keys, `PermissionGuard` not being global, per-request transaction count, jsonb reactions / plaintext invite tokens / serial PKs / unpartitioned chat) are recorded decisions or already-disproved claims. Do not re-raise them.
