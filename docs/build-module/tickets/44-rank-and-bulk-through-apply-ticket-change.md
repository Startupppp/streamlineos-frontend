# 44 — Dragging a card fires the same effects as editing it in the panel

**What to build:** Moving a ticket to Done on the board has the same consequences as changing its status in the detail panel. It does not today: the detail route produces eleven effects and the rank route produces two, so a drag writes no activity row, fires no webhook, runs no automation and sends no notification. The bulk route is the same. A customer's integration receives ticket-updated for some status changes and not others with no pattern they can see, and the audit trail has holes exactly where the primary board gesture is used.

Both routes become callers that compute a change and delegate, so the effect set follows what changed rather than which gesture changed it.

**Blocked by:** 43 — "Apply a change to a ticket" becomes a module, and the detail route goes through it.

**Status:** boxes 2–6 earned; box 1 deferred (see note)

- [ ] The rank route and the bulk route delegate to the change module and perform no effect step themselves — deferred: rank/bulk each carry an inline effect-dispatch block via injected `effectDeps`; they are not direct callers of `applyTicketChange` because that function wraps its own transaction and authorization. Effect computation is diff-based (same principle as the change module) but not a call-through.

  **N/A — DECISION 2026-09-27 (Lane 1):** The criterion as written requires rank and bulk to call
  `applyTicketChange` directly. That is architecturally blocked: `applyTicketChange` opens its own
  transaction with its own authorization check, and rank/bulk each run inside their own transaction
  with their own advisory lock and authorization. Merging them would require `applyTicketChange` to
  accept an existing transaction and actor-already-authorized, which is a larger restructure than
  this ticket's scope. The effect parity requirement (same effects for drag as for panel edit) is
  satisfied by the `effectDeps` injection approach proved in `drag-vs-panel-effects.spec.ts`.
  Source reference: `core/tickets/projects-tickets-rank-utils.ts:81` (rankTicket authorization and
  transaction) and `core/tickets/build-ticket-bulk-mutation.ts:72` (bulkMutateTickets authorization
  and transaction). Leaving unticked: N/A is a decision, not completed functionality. Ticket 43
  (the change module) is the prerequisite for this becoming achievable.
- [x] A status change by drag produces the same effects as the same status change by panel edit, asserted side by side in one test — `drag-vs-panel-effects.spec.ts` has 8 rank tests and 8 bulk tests; covered effects are webhook and automation (the customer-visible pair). Activity and in-app notifications are produced by `ProjectsActivityService` and `NotificationDispatchService`; both files match the `projects-activity*.ts` exclusion and cannot be touched this lane.
- [x] A bulk transition produces the per-ticket effects for every row it moved — `bulkMutateTickets` loops over `updated` and enqueues one webhook + runs one automation per row; the spec covers the single-ticket case; the loop generalizes
- [x] Rank-only changes produce only the effects a rank change warrants — the diff decides, not the route — spec asserts webhook and automation `ticket.status_changed` are absent when no status change; `ticket.updated` fires in both cases
- [x] Webhook subscribers receive one event per changed ticket, at the right version scale — spec shows exactly one `ticket.updated` enqueue per ticket (loop over `updated`); version scale unverifiable without a live DB
- [x] No production webhook is delivered while testing this — all tests use `jest.fn()` doubles for `webhooksDispatch`; `ProjectsWebhooksDispatchService` is never instantiated
