# c9 · Decide what the transactional outbox is for

**Status: decision and relay mechanics implemented; notification-intent ledger intentionally retained as a distinct semantic ledger.** Verified at source 2026-08-26. The generic `outbox_events` relay is enabled by default, tenant-scoped, retrying, dead-lettering, observable, fenced by `InboxConsumer`, and callable through the leased platform worker endpoint. The decision and role split are recorded in [`c9-outbox-decision.md`](c9-outbox-decision.md); partitioning is an explicit threshold-triggered follow-up.

The review marked this "worth exploring" rather than "strong", and that grading is right. This PRD exists to force the choice, not to pre-empt it.

## Problem Statement

**As a developer emitting a domain event, I have to choose between two durable paths and nothing tells me which.** Both take a transaction. Both promise atomicity with the aggregate write. One delivers; one does not.

| | Path A — `notification_outbox` | Path B — `outbox_events` |
|---|---|---|
| Entry point | `NotificationDispatchService` | `OutboxWriter.emit(tx, …)` |
| Producers | 51 files | 23 modules |
| Relay | wired | `flush()` is a no-op by design |
| Downstream | routing, preferences, visibility, delivery | nothing |
| Consumers | the notification pipeline | one |
| Terminal state | delivered | `PENDING`, forever |

**As an operator, `outbox_events` accumulates rows that will never be delivered.** They are not lost — that is the point of the design — but they are also not a queue anyone drains. A cron endpoint exists (`POST /cron/outbox-events-flush`, secret-gated) and calling it does nothing. Row growth is unbounded and the table is not partitioned.

**As a developer, 23 modules already write against a guarantee that is not being kept.** Each of those call sites reads as "this event is durably recorded and will be delivered". Half of that is true. The half that is not is documented only in the publisher's own warning string, which nobody reads at the call site.

**As an architect, the honest thing was done and then left.** The publisher's comment is explicit: flush is a Phase-1 no-op so events stay `PENDING` rather than being falsely marked delivered, and `deliver()` throws rather than silently marking anything delivered if someone flips the flag without implementing routing. That is a careful, defensible position. It is also two years of accumulating producers away from being a temporary one.

## Solution

Make the choice. Both options are defensible; the current state is neither.

**Option A — wire the bus.** Implement `deliver()` with real routing, flip `isDispatchConfigured()`, and let notifications become one consumer of a domain-event bus rather than a parallel path. The schema is already good enough for this: `buildOutboxEvent` produces a typed envelope, `InboxConsumer` provides an exactly-once fence with monotonic per-aggregate versioning (`shouldProcessVersion`), and a secret-gated flush endpoint already exists. This is the larger change and the one that pays off if cross-module events are going to be a real pattern.

**Option B — retire Path B.** Delete `OutboxWriter`, `OutboxPublisherService`, the flush controller and the `outbox_events` table; fold the 23 producers into Path A or into direct calls. This is the smaller change and the right one if, in practice, every event that matters is a notification.

**What is not an option** is a third path, or leaving 23 producers writing into a table with no drain while a 51-file path delivers.

## User Stories

1. As a developer emitting a domain event, I want one answer to "how do I emit", so that I am not choosing between two durable paths on vibes.
2. As a developer, I want the guarantee at the call site to be the guarantee I get, so that `emit(tx, …)` does not read as delivery when it is storage.
3. As a developer, I want the trade-off named where I make the choice, so that reading the publisher's source is not a prerequisite for using it.
4. As a developer consuming a domain event, I want exactly-once application, so that a redelivery does not double-apply.
5. As a developer consuming a domain event, I want out-of-order redeliveries skipped, so that an older version cannot overwrite a newer one.
6. As a developer, I want a new cross-module event to need no new infrastructure, so that the second consumer is cheaper than the first.
7. As an operator, I want `PENDING` rows to stop accumulating, so that a table with no drain does not grow without bound.
8. As an operator, I want to see how many events are pending, how old the oldest is, and how many are dead, so that the bus is observable.
9. As an operator, I want a permanently failing event to reach a terminal dead state rather than retry forever, so that one poison event does not consume the batch.
10. As an operator, I want the flush endpoint to remain secret-gated, so that a public cron route cannot be triggered by anyone.
11. As an operator, if Path B is retired, I want the accumulated rows dealt with explicitly, so that retirement is not silent data loss.
12. As a security reviewer, I want events to stay tenant-scoped through relay and consumption, so that a cross-module bus does not become a cross-tenant one.
13. As a security reviewer, I want a consumer to run with its own tenant context, so that relay work does not borrow a committed request transaction.
14. As an architect, I want the decision recorded with its reasoning, so that it is not re-litigated every time someone reads `isDispatchConfigured`.
15. As an architect, I want whichever path survives to be the only one, so that a third does not appear next year.

## Implementation Decisions

**Decide first; these are the constraints either way**

- **The decision is the deliverable.** Record it — with the reasoning and the date — before any code moves. Story 14 is the point of this PRD.
- **Count before deciding.** How many rows are in `outbox_events`, how old is the oldest, and how many distinct `eventType`s are represented across the 23 producers? If the answer is "three event types and one consumer", Option B is obvious. If it is "forty event types across every module", Option A is. Do not decide this from the file listing.
- **Whichever survives, the other goes entirely** — code, schema, cron route, docs. Root §10: dead code is removed with its files, proved by knip and a real `nest build`, not by grep. A bare `import "./x";` is invisible to a from-based scan.

**If Option A — wire the bus**

- **`deliver()` routes by `eventType` or `aggregateType` prefix.** The existing comment already specifies this and already throws for an unrouted type. Keep that: an unroutable event must fail loudly rather than be marked delivered.
- **`isDispatchConfigured()` reads configuration**, so the no-op remains reachable in environments without a broker. Flipping it to a hardcoded `true` recreates the same problem in the opposite direction.
- **Consumers use `InboxConsumer`.** `shouldProcessVersion(lastApplied, incoming)` is the fence and it is already written and already tested. Every consumer claims through it.
- **Each consumer opens its own tenant transaction.** Relay runs from a cron request with no ambient tenant context, and a consumer that reads or writes on a dead handle dies `42501`. Iterate with `forEachOrg` for anything org-scoped; never borrow.
- **Never swallow a relay failure.** The retry, dead-letter and suppression counters `flush()` already returns are the observability contract for stories 8 and 9 — surface them.
- **`outbox_events` gets partitioned by `created_at`** before it is a real queue. It is an append-only event stream and root §3 names exactly this class of table. Decide the partition key before partitioning: it must be in every PK/UNIQUE, so the PK becomes `(id, created_at)`. Record the triggering row count in the migration.
- **Notifications become a consumer, not a peer.** That is what makes it one path rather than two. It is also the largest single piece of this option and should be a separate, later step — wire the bus and prove one new consumer first.

**If Option B — retire Path B**

- **Migrate the 23 producers deliberately, one at a time.** Each is currently emitting inside a transaction; the replacement must preserve that atomicity or the producer is worse off than before.
- **The one real consumer moves first.** `deal-closed-consumer.service.ts` is the only thing reading these events; it needs a home before its source is deleted.
- **Deal with accumulated rows explicitly** — archived or dropped, stated in the migration. Story 11.
- **Deleting the schema file needs more than knip.** Zero symbol references, zero raw table-name references, no dependent FK, and a path grep for specs asserting the file's existence. `hrms-phase1-sql-managed.ts` is the standing example of a deliberately unimported schema file that a knip-driven cleanup would wrongly delete.

## Testing Decisions

**What makes a good test here.** For a decision, the test is the recorded decision. For the code that follows, test the fence and the failure modes — those are what distinguish a durable bus from a table.

- **`InboxConsumer` / `shouldProcessVersion`** already has `inbox-consumer.spec.ts`. It is the exactly-once fence and it covers stories 4 and 5: a never-seen aggregate applies, a newer version applies, a same or older version is skipped. If Option A proceeds, this is the most important existing test in the area.
- **`outbox-envelope.spec.ts`** covers the envelope shape. Keep it aligned with whatever `deliver()` routes on.
- **Under Option A:** an unroutable `eventType` throws rather than marking delivered; a failing event retries up to its limit then goes dead; `flush()` with no dispatch configured returns all zeros and warns once; a consumer runs in its own tenant transaction and does not inherit the caller's.
- **Under Option B:** each migrated producer still writes its event atomically with its aggregate — a rolled-back transaction leaves neither. The `db.transaction` mock must invoke its callback, or every assertion inside it is void.
- **Tenant isolation** either way: an event emitted by org A is never delivered to a consumer acting for org B.
- **Verify by running, not by typecheck.** This area is notifications, background sweeps and post-commit hooks — the exact combination where a swallowed `42501` passes every static check and mocked test while nothing works. Boot the API and exercise the real flow.

## Out of Scope

- **Choosing a broker product.** If Option A wins, `deliver()` is an interface; which transport sits behind it is a later decision.
- **Refactoring `NotificationDispatchService`.** Path A is fully wired and correct. Making it a consumer of Path B is the *last* step of Option A, not part of the decision.
- **Chat's fan-out queue** (candidate 7). Related in that both want a queue, but chat's seam is internal to chat and does not require this decision to land first.
- **The `notification_outbox` schema.** Untouched either way.

## Further Notes

- **This is the only candidate of the nine that is a question rather than a task**, and the review graded it accordingly. Resist the pull to "just wire it" — 23 producers is a real constituency, and one consumer is a real signal that the demand may not be there.
- **The current state is honest and was deliberately chosen.** The publisher's comment says flush is a Phase-1 no-op so events stay `PENDING` rather than being falsely marked delivered, and `deliver()` throws for an unrouted type specifically to stop someone flipping the flag without implementing routing. Both are good defensive choices. Neither is an argument for staying here indefinitely.
- **The schema quality is the strongest argument for Option A.** Event dedupe, monotonic per-aggregate versioning, an inbox fence, a typed envelope, a secret-gated flush endpoint — this is more infrastructure than most teams build before they have a broker. Throwing it away has a real cost, which is exactly why the decision deserves the row-count evidence rather than an aesthetic judgement.
- **The review's deletion test is the sharpest framing available:** delete `OutboxWriter` today and notifications are unaffected, because they do not share a seam. That independence is why the choice is still open, and it is also why either answer is cheap to execute once made.
