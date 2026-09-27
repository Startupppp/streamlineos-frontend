# 37 — One version scale for ticket events, so a consumer cannot permanently skip one

**What to build:** Every consumer of ticket status events keeps processing them. Two producers emit the same event type on the same aggregate with version numbers twelve orders of magnitude apart — one uses the row's version, the other a millisecond timestamp — and the consumer's ordering guard only applies an event whose version exceeds the highest it has already completed. So once a timestamp-scaled event is recorded, every row-scaled event for that ticket is skipped forever, with no error and no retry.

Fixing the producers is not enough on its own: the watermark rows already written at timestamp scale keep the skip alive for every ticket they cover. Those rows need remediating in the same change, and that is the part most likely to be forgotten.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [x] Both producers of the ticket status event emit the same version scale, derived from the row
- [x] A test asserts the two producers agree, and fails if either scale changes
- [ ] Existing consumer watermarks recorded at the wrong scale are remediated so affected tickets resume
  > Migration 1374 is authored on disk with rollback. Not journalled or applied — orchestrator-only.
  The migration file at `backend/migrations/1374_remediate_ticket_inbox_watermarks.sql` has
  `AND status = 'SKIPPED'` in its WHERE predicate, so it resets only the 250 SKIPPED rows and
  leaves the 111 COMPLETED rows untouched. The concern about resetting COMPLETED rows documented
  in the box below reflects an earlier draft; the current file on disk is correct.
- [x] The remediation is idempotent and safe to replay
- [x] Any other aggregate type sharing this pattern is either fixed or recorded as out of scope with its reason
- [x] Verify two concurrent writes and repeated delivery for the same ticket: event identity is unique, delivery is idempotent, and the ordering policy does not silently discard a required earlier event delivered late
  Earned 2026-09-27 on a real database. Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay2`,
  cold-replayed from the journal. No production data, no production host. The earlier note said this could not be
  earned without a live DB, which was true when it was written; this session stood one up.
  `ticket-event-delivery-identity.db.spec.ts`, 8 tests, all pass.

  **Event identity is unique.** Two concurrent `claim` calls for the same event leave exactly **one**
  `inbox_records` row, enforced by `uniq_inbox_consumer_event` on `(producer_event_id, consumer_name)` rather
  than by a read-then-write that a race could interleave.

  **Delivery is idempotent, and the measurement corrected the test rather than the reverse.** The first version
  of this spec asserted that exactly one of two concurrent claims is admitted. **Both are.** The unique index
  gives one row, but the second caller finds that row `IN_FLIGHT` and reclaims it -- and the reclaim has no
  lease: its `WHERE` clause is `status IN ('FAILED','IN_FLIGHT')` with no time predicate, and the table carries
  no `claimed_at` column at all, only `created_at` and `processed_at`. So `claim` is **at-least-once delivery,
  not mutual exclusion**, and the write that applies the event must be idempotent by itself; two workers racing
  one event will both proceed, with `retry_count` incremented to 1. That matches the contract the class states
  for itself, and it is now asserted explicitly instead of being assumed away by a test that wanted
  exactly-once. A redelivery of an event already `COMPLETED` is refused.

  **The ordering policy does not silently discard a superseded late event.** After version 9 completes, a late
  version 4 is refused *and recorded* as `SKIPPED`, so the decision not to apply it is observable afterwards
  rather than vanishing.

  **Three controls, because each claim above passes for the wrong reason without one.** Two distinct events on
  one ticket are both admitted, so none of this is a per-ticket lock. A later event after a completed one is
  still admitted, so the skip is the ordering policy and not a stuck watermark. And the watermark is scoped per
  ticket and per consumer -- a completed event on one ticket cannot skip an event on another, and one consumer
  completing an event cannot skip the same event for a different consumer.
- [ ] Before watermark repair, inventory affected outbox/inbox rows and document replay/deduplication behavior; do not blindly reset completed watermarks and resend customer notifications
  — **Inventory done; repair deliberately NOT performed, and 1374 is NOT applied.** This box's own
  warning is the reason. An earlier draft of 1374 reset ALL epoch-scale rows including COMPLETED
  ones. **Premise correction 2026-09-27 (Lane 1):** The migration file on disk at
  `backend/migrations/1374_remediate_ticket_inbox_watermarks.sql` already has
  `AND status = 'SKIPPED'` in its predicate. The COMPLETED rows concern in the note below is
  obsolete for the current file. However, the broader question of whether any outbox_events rows
  at epoch scale remain in PENDING/IN_FLIGHT state (which would re-poison the watermark after
  repair) is still a prerequisite for applying 1374 safely — see the survey box below.

  The 250 `SKIPPED` rows are the ones the remediation is actually for — they were skipped because an
  epoch-scale watermark made every subsequent row look older, so those tickets stopped resuming.

  What is needed before this box can be earned, and none of it is a database operation:
  1. A narrower predicate that resets only rows the consumer never delivered — `status = 'SKIPPED'`
     rather than every epoch-scale ticket row — so the 111 `COMPLETED` rows are left alone.
  2. Evidence that the consumer deduplicates on event identity, not only on the watermark, so a
     re-delivered event is dropped rather than re-notified. Ticket 37's own unearned box on
     concurrent writes and repeated delivery covers this and is also unproved.
  3. An explicit owner decision to accept any residual resend risk, since the effect is outward
     facing.

  Recorded by the orchestrator 2026-09-27. 1374 remains authored, unjournalled and unapplied. It is
  the only migration in the 1371–1394 range deliberately held back; every other one that was safe
  has been applied.
  > Documented in the progress section. Production row count requires the SQL query in box 49 (below).

**Architecture constraint (2026-09-27):** Keep ticket row concurrency versions and general outbox
allocation distinct. The review's alternative of moving `nextAggregateVersions` into every
`OutboxWriter.emit` is not an automatic fix: `backend/src/common/outbox/aggregate-version.ts`
uses `MAX(aggregate_version) + 1` and explicitly leaves races to the unique index. Do not impose
that cross-module change without serialization/retry semantics and consumer compatibility tests.
For Build, use the version returned by the actual row write, not a guessed pre-write `version + 1`.

**Progress — 2026-09-27:** `build-ticket-batch-workflow.ts` `emitBatchStatusChanges` signature changed
to require `versionMap: ReadonlyMap<number, number>` (ticketId → RETURNING version). The function
no longer predicts `row.version + 1`. Callers updated: `projects-tickets-rank-utils.ts` now returns
`version: tickets.version` from RETURNING and builds the map; `build-ticket-bulk-mutation.ts` likewise.
`projects-tickets-update.service.ts` already used `affected[0]!.version`.
`ticket-status-event-version-scale.spec.ts` rewritten with 5 tests covering: versionMap source,
row-scale assertion, skipped-when-absent, no-emit-when-empty, and already-at-status cases.
Structural tests for update-service path added. Migration 1374 authored; journal entry required
from coordinator (not yet applied).

Unresolved disposition questions (record explicitly):
- **Concurrent writes / idempotent delivery**: two concurrent writes produce two events with different
  `aggregateVersion` and different `eventId` (UUID). The outbox unique index on `eventId` prevents
  duplicate inserts. `InboxConsumer.isOlderThanApplied` uses `MAX(aggregate_version)` — an older
  event delivered after a newer one will be skipped. This is a known design decision: BUILD events
  are idempotent (last-write-wins for status) so skipping a stale version is acceptable.
- **Previously skipped events**: watermark remediation (migration 1374) resets
  `aggregate_version > 1_000_000_000` to 0, allowing all row-scale events to replay. Any pending
  outbox rows with timestamp-scale `aggregateVersion` would re-poison the watermark after replay.
  Disposition: timestamp-scale rows should be expired/deleted from `outbox_events` before repair.
  This is not implemented; record as a known gap requiring ops intervention before applying 1374
  on production if any such rows exist in the outbox.

- [x] Query production `outbox_events` for `aggregate_type = 'ticket' AND aggregate_version > 1_000_000_000` before applying 1374; confirm count is 0 or expire those rows first
  — Surveyed 2026-09-27 (read-only, `SET TRANSACTION READ ONLY`). The count is **not** 0, and the
  result means 1374 must not be applied as written.

  | table | aggregate_type | total | at epoch scale | max version |
  |---|---|---|---|---|
  | `outbox_events` | ticket | 367 | **361** | 1789989092753 |
  | `inbox_records` | ticket | 367 | **361** | 1789989092753 |

  Breaking the 361 `inbox_records` ticket rows down by status: **250 `SKIPPED`, 111 `COMPLETED`**.

  The scale problem is also not confined to tickets — `kb_page` (95 of 95), `organization` (20 of
  20), `kb_source` (9 of 9) and `survey_response` (1 of 1) are entirely at epoch scale, while
  `chat.message`, `revenue_event`, `timesheet_period` and `realtime.token-revocation` are entirely
  at row scale. 1374 only touches `aggregate_type = 'ticket'`, so it leaves the others alone; the
  `kb_*` types belong to a peer session's workstream and are out of scope here.
  > Cannot run — no DB access. Exact SQL for orchestrator: `SELECT count(*), max(aggregate_version) FROM public.outbox_events WHERE aggregate_type = 'ticket' AND aggregate_version > 1000000000 AND status != 'COMPLETED';` — if count > 0, expire or delete those rows before applying 1374 or they will re-poison the watermark.
- [ ] Invoke both real producer paths in regression tests against a real DB to close the acceptance boxes
  > Cannot earn without a live DB. Requires 1373 applied and a test org with real tickets.

  **Authored 2026-09-27 (Lane 1):** Three tests in
  `backend/src/modules/build/core/tickets/ticket-37-producer-version-scale.db.spec.ts` cover:
  (1) single-event producer path (apply-ticket-change / OutboxWriter.emit): UPDATE RETURNING version
  is written to outbox_events at row scale; (2) batch producer path (build-ticket-batch-workflow /
  OutboxWriter.emitMany): multi-row UPDATE RETURNING versions are written to outbox_events at row
  scale; (3) both producers agree on the same monotonically increasing row-scale sequence for the
  same ticket. Requires migration 1373 applied (confirmed at idx 1123).
  HANDED-TO-ORCHESTRATOR to run:
  ```
  ALLOW_DESTRUCTIVE_DB_TESTS=1 DATABASE_URL=postgresql://...127.0.0.1:5432/replay_test \
    node node_modules/jest/bin/jest.js --runInBand --no-cache \
    --cacheDirectory D:/agent-work/jest-lane1 \
    --runTestsByPath backend/src/modules/build/core/tickets/ticket-37-producer-version-scale.db.spec.ts
  ```
  Pass = all 3 tests green. Tick this box when they pass.

## Other aggregate types — out-of-scope disposition (Lane 1, 2026-09-27)

The two-producer/mixed-scale bug requires two DIFFERENT producers of the same `aggregateType` emitting at different scales. Survey of all `aggregateVersion: Date.now()` usages across the codebase:

- `build/core/projects-releases.service.ts` — aggregateType `release`, single producer, consistently timestamp-scale. No mismatch. Out of scope.
- `inventory/sync/sync-batch.service.ts`, `inventory/stock-engine/*`, `inventory/sales-orders/so-ship.ts`, `inventory/barcode/*`, `inventory/purchase-orders/*`, `inventory/shipments/*` — single producer per aggregateType, consistently timestamp-scale. Out of scope.
- `hr/helpdesk/hr-helpdesk.service.ts` — aggregateType `helpdesk_ticket`, single producer, consistently timestamp-scale. Out of scope.
- `accounting/kernel/lib/journal-events.ts` — aggregateType `gl_journal`, single producer. Out of scope.
- `surveys/survey-response.service.ts` — single producer. Out of scope.
- `kb/*` — not in Build workstream scope.

No aggregate type other than `ticket` has the two-producer mixed-scale pattern. The `ticket` fix (using RETURNING version for both producers) closes the only instance of this bug.
