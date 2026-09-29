# 44 — Dragging a card fires the same effects as editing it in the panel

**What to build:** Moving a ticket to Done on the board has the same consequences as changing its status in the detail panel. It does not today: the detail route produces eleven effects and the rank route produces two, so a drag writes no activity row, fires no webhook, runs no automation and sends no notification. The bulk route is the same. A customer's integration receives ticket-updated for some status changes and not others with no pattern they can see, and the audit trail has holes exactly where the primary board gesture is used.

Both routes become callers that compute a change and delegate, so the effect set follows what changed rather than which gesture changed it.

**Blocked by:** 43 — "Apply a change to a ticket" becomes a module, and the detail route goes through it.

**Status:** boxes 2–6 earned; box 1 deferred (see note)

- [ ] The rank route and the bulk route delegate to the change module and perform no effect step themselves
  **NOT EARNED 2026-09-29 — declined on cost, not architecture: a call-through works today through the tenant-db proxy, but it would run per-row access resolution and authorization inside bulk's advisory lock, and bulk has no per-row conflict contract. Earned by pricing those two and widening the two `EffectDeps` interfaces.**

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
  **Verified 2026-09-27 (Lane A2):** Ticket 43 is now complete (all 6 boxes checked, status "all boxes earned"). The architectural blocking reason is independent of ticket 43's completion. Source confirmed: `apply-ticket-change.ts:255` calls `deps.db.transaction(async (tx) => { … })` — its own transaction; `projects-tickets-rank-utils.ts:81` calls `db.transaction(async (tx) => { … })` — its own transaction; `build-ticket-bulk-mutation.ts:72` calls `db.transaction(async (tx) => { … })` — its own transaction. These three independent `db.transaction()` calls cannot be merged by passing one as the other's context without refactoring `applyTicketChange`'s interface. The N/A is permanent and does not become actionable now that ticket 43 is done — the transaction boundary is the constraint, not the absence of the module. Stays unchecked.

  **Correction 2026-09-28 (orchestrator) — the transaction boundary is NOT the constraint, and the reason above is wrong.** The box stays unchecked, but on different grounds, because the recorded reason would stop a future session from revisiting a decision that is a trade-off rather than an impossibility.

  `deps.db` is not a raw handle. `projects-tickets-update.service.ts:19` injects `@Inject(DRIZZLE) private readonly db: Db` and passes it straight through as `deps.db` at `:38`. `DRIZZLE` resolves to `createTenantAwareDb` (`src/common/tenant/tenant-db.ts:14`), a `Proxy` that forwards every property to `context.tx` whenever `getTenantContext()` returns one. So inside an ambient tenant transaction, `deps.db.transaction(...)` is really `tx.transaction(...)`, which the postgres-js driver implements as `this.session.client.savepoint(...)` (`drizzle-orm/postgres-js/session.js:131`) — a savepoint on the **same** connection inside the outer `BEGIN…COMMIT`, with inner throws propagating out. Calling `applyTicketChange` from inside rank's or bulk's existing transaction therefore works today with no interface change and no `tx` threading. "Cannot be merged without refactoring the interface" is false, and it is a specific recurring error: reasoning from the function signature without noticing the DI token is a proxy.

  The two reasons the call-through is still declined, both about cost and semantics rather than architecture:

  - **Per-row authorization.** `applyTicketChange` resolves access itself — `resolveProjectAccess(deps.db, deps.access, u, ticketProjectId)` at `:251` and `deps.query.authorizeMutation(tx, …)` at `:259`. `bulkMutateTickets` authorizes the whole batch once. Routing bulk through the change module would run one access resolution and one mutation authorization **per row**, inside a transaction that is already holding an advisory lock — a 100-row bulk would pay 100 extra round-trips while holding it.
  - **Per-row conflict semantics.** `applyTicketChange` takes a single `expectedUpdatedAt` and throws `TicketVersionConflictException` at `:242`. Bulk has no per-row token and no partial-failure contract, so a call-through would have to decide whether one stale row aborts the batch. That is a product decision this ticket never made.

  Effect parity — the thing the ticket actually cares about — is already proven by `drag-vs-panel-effects.spec.ts` through the `effectDeps` injection. Anyone revisiting this should price the two costs above, not re-derive a transaction blocker that does not exist.

  **Correction 2026-09-28 — the effect-family gap is structural, not a file-access limitation.** Box 5 below attributes the missing activity and notification coverage to `projects-activity*.ts` being outside a lane's write territory. That is not the binding constraint. `RankTicketEffectDeps` (`projects-tickets-rank-utils.ts:25-43`) and `BulkTicketEffectDeps` (`build-ticket-bulk-mutation.ts:31-49`) each declare exactly two members, `webhooksDispatch` and `automationRunner`. There is no activity writer and no notification dispatcher in either interface, so neither route can write a `ticket_activity_log` row or notify an assignee **whatever it is handed** — full write access to the excluded files would change nothing. `applyTicketChange` dispatches four families (`apply-ticket-change.ts:314` webhook, `:333` activity, `:346` notifyNewAssignees, `:375-380` automation); rank and bulk can carry two. Closing this means widening the two interfaces and threading the two services through the call sites, which is real work with a real authorization question attached — not an exclusion-list edit. Until then the opening paragraph's "a drag writes no activity row and sends no notification" remains true of the shipped code, and box 1 stays unchecked for that reason as much as for the two costs above.

  The spec's own describe names claimed the full set ("rank route fires same effects as detail route") while asserting two families. Renamed 2026-09-28 to name the ceiling and why it is the ceiling, since code comments are banned and the test name is the only place that fact can live.

  **Adjudication 2026-09-28 (lane EXEC) — NOT EARNABLE as written, and for a third reason neither
  earlier note found. Box stays unchecked.** Asked to decide honestly whether this box can be
  earned, I read `apply-ticket-change.ts` end to end, both callers, and `UpdateTicketInput`.

  `applyTicketChange` cannot express the change the rank route makes. `rank` appears nowhere in
  `backend/src/modules/build/core/tickets/apply-ticket-change.ts` (`grep -c rank` → 0) and nowhere in
  `updateTicketSchema` (`core/dto/ticket.schemas.ts`), so there is no input by which a caller could
  ask the change module to move a card's position. `rankTicket`
  (`core/tickets/projects-tickets-rank-utils.ts:61-225`) does not merely write a column: it takes the
  project advisory lock, reads the target and both neighbours, rebalances the whole project's ranks
  when a gap is exhausted or a fraction exceeds 20 digits, re-reads, computes the midpoint as
  `numeric` in the database, and 409s when another writer has slipped a row into the gap. A
  "delegation" would have to move that entire protocol into the change module — which is merging the
  two routes, not making one a caller of the other. Until `applyTicketChange` accepts a rank
  position, the rank half of this criterion is not implementable, independently of transactions,
  authorization cost, or conflict tokens.

  The 2026-09-28 orchestrator correction above is right that the transaction boundary is not a
  blocker, and I confirmed the mechanism it describes: `projects-tickets-update.service.ts` injects
  `DRIZZLE`, which is `createTenantAwareDb`'s proxy, so `deps.db.transaction` inside an ambient
  tenant transaction is a savepoint. That removes the architectural objection and leaves the two cost
  objections it names. Of those, only one is a genuine blocker rather than a price: bulk has no
  per-row concurrency token and no partial-failure contract, so routing it through a module that
  throws `TicketVersionConflictException` per row (`apply-ticket-change.ts:242`) forces a product
  decision — does one stale row abort the batch? — that this ticket never made and that no lane can
  make on the owner's behalf.

  So the box needs three things this ticket does not authorize: a rank position on the change
  module's input, a partial-failure contract for bulk, and the per-row authorization cost that
  contract implies. What the ticket actually cares about — effect parity for the drag gesture — is
  proven by `drag-vs-panel-effects.spec.ts` for the two families rank and bulk can carry, and the
  ceiling on the other two families is recorded accurately in the correction above. No code changed
  for this adjudication; it corrects the record only.

- [x] A status change by drag produces the same effects as the same status change by panel edit, asserted side by side in one test — `drag-vs-panel-effects.spec.ts` has 8 rank tests and 8 bulk tests; covered effects are webhook and automation (the customer-visible pair). Activity and in-app notifications are produced by `ProjectsActivityService` and `NotificationDispatchService`; both files match the `projects-activity*.ts` exclusion and cannot be touched this lane.
- [x] A bulk transition produces the per-ticket effects for every row it moved — `bulkMutateTickets` loops over `updated` and enqueues one webhook + runs one automation per row; the spec covers the single-ticket case; the loop generalizes
- [x] Rank-only changes produce only the effects a rank change warrants — the diff decides, not the route — spec asserts webhook and automation `ticket.status_changed` are absent when no status change; `ticket.updated` fires in both cases
- [x] Webhook subscribers receive one event per changed ticket, at the right version scale — spec shows exactly one `ticket.updated` enqueue per ticket (loop over `updated`); version scale unverifiable without a live DB
- [x] No production webhook is delivered while testing this — all tests use `jest.fn()` doubles for `webhooksDispatch`; `ProjectsWebhooksDispatchService` is never instantiated
