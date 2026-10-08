# ADR 0007: Companion uses the Ask OS Toolset as its capability seam

**Status:** accepted as the first-release architecture decision; implementation and release evidence remain pending.  
**Date:** 2026-10-08.  
**Scope:** signed-in organization members using StreamlineOS and approved connected tools. Arbitrary web or computer control is outside this decision.

## Context

The companion accepts natural-language questions and work requests across modules. Ask OS already owns the Actor, per-turn Toolset, conversation, credit ledger, typed Tool outcomes, and confirmable-action path. Individual modules own their facts and writes. Creating a pet-specific router or generic write engine would duplicate authorization and business rules while making the same request behave differently by entry point.

The source review also found gaps that the architecture must expose rather than hide: Documents content answers are separate from Ask OS title search; Build has no exact scoped `BUG` aggregate Tool; `clockIn`, `clockOut`, `toggleBreak`, and CRM `createTask` write immediately; and partial-name lead status lookup can choose the first visible match. Source presence does not prove any pet journey works end to end.

## Decision

1. The pet is an interaction module over the existing Ask OS turn, Toolset, confirmation, and history interfaces. Each turn derives available Tools from the current Actor's effective permission and module snapshot. Page context helps resolve a request but never grants reach or silently selects an ambiguous target.
2. Every request follows the same visible path: answer from authorized owner evidence; ask for the minimum missing scope, entity, or connection; propose an available action; or explain why the requested action is unavailable. Preserve the seven existing `ToolOutcome` kinds, including `ambiguous`, `denied`, `needs-connection`, and `failed`. A model-written success claim is not an action receipt.
3. Owner modules perform reads and writes. A new capability enters through an owner-approved Tool provider; a pet-initiated write uses an owner-specific confirmable action, visible preview, explicit user confirmation, and committed receipt. Before companion rollout, classify and gate every immediate-write Tool: convert each Tool the pet will expose to that path and omit unadapted writes from its Toolset. This must be enforced in the Toolset, not only by hiding a button. Ambiguous target resolution must not select an arbitrary first match.
4. A supported multi-module request may combine bounded independent reads. Dependent writes run sequentially, each with its own confirmation and receipt. Stop and show partial completion when a step fails or is declined. Do not imply a cross-module transaction or automatic rollback.
5. Documents supplies a bounded, citable context read to the Ask OS turn. Ask OS performs the single generation and owns the visible transcript and credit charge. Extract the existing Documents retrieval, passage, degradation, and citation rules behind a substantive owner interface shared with Documents Ask; keep citation access checks at open/replay. Do not invoke the paid `KbAskService.ask` inside an Ask OS Tool transaction. Build supplies exact ticket aggregates; Calendar, HR, and Notifications supply reminder facts, eligibility, and delivery. The pet does not copy owner access predicates or maintain a second notification clock.
6. Keep the idle character light and load the conversation panel on demand. Bound tool calls, returned rows, context bytes, model steps, provider time, and credit spend. Establish numeric performance budgets from a named pilot environment before claiming speed. Add a shared capability-metadata seam only if real consumers demonstrate leverage without duplicating the Toolset or permission rules.

## Alternatives considered

| Alternative | Reason declined |
| --- | --- |
| Pet-specific router with separate module branches | Duplicates Toolset availability, typed outcomes, confirmation, and tests; poor locality when a grant or owner rule changes. |
| New generic agent framework or universal database/write Tool | Enlarges the interface and bypasses owner-specific scope, validation, and side effects. It would be difficult to prove through one authorization seam. |
| Build-first architecture expanded later | The product accepts requests across enabled modules from launch. Build counts are one owner-specific gap, not the architectural center. |
| Invoke the paid Documents Ask path as a nested Tool | It already generates and meters an answer, while Ask OS owns the companion turn. Nesting it risks double generation/credits and holding a tenant connection during provider latency; its separate chat history would complicate replay. |

## Consequences and proof gates

- The existing Toolset is the external seam and test surface. The deletion test favors using it: removing a second pet action router should not scatter policy back across callers. Owner adapters keep business logic local; the companion gains leverage from one authorization and result path.
- The first delivery item is a reviewed inventory of registered Tools and confirmable actions, including owner, grant, module, connection, data class, read/write behavior, cost, confirmation, receipt, and launch readiness. An entry that cannot meet the pet write contract stays unavailable through the pet and offers the normal owner workflow.
- Documents integration needs a source-preserving extraction from its current private context-gathering implementation. Prove one metered generation, one transcript, access-checked citations, degradation, and no tenant DB transaction held across provider latency; the exact internal type and method layout is an implementation choice.
- Release sign-off requires actual role/project/tenant isolation, target-database queries, cross-module answers, ambiguous-target choices, confirmed writes and partial multi-step receipts, history and preference persistence, browser/accessibility journeys, and notification delivery. Source inspection, the architecture report, and focused tests alone do not close those gates.

See the [Companion program](../../pet/README.md), [architecture PRD](../../pet/03-implementation-architecture-prd.md), and [verification ledger](../../pet/verification-and-competition.md).
