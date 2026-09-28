# 37 — One version scale for ticket events, so a consumer cannot permanently skip one

**What to build:** Every consumer of ticket status events keeps processing them. Two producers emit the same event type on the same aggregate with version numbers twelve orders of magnitude apart — one uses the row's version, the other a millisecond timestamp — and the consumer's ordering guard only applies an event whose version exceeds the highest it has already completed. So once a timestamp-scaled event is recorded, every row-scaled event for that ticket is skipped forever, with no error and no retry.

Fixing the producers is not enough on its own: the watermark rows already written at timestamp scale keep the skip alive for every ticket they cover. Those rows need remediating in the same change, and that is the part most likely to be forgotten.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row.

**Status:** complete — all boxes earned and re-verified 2026-09-28. The status line previously read "partial — full acceptance remains unverified (audit 2026-09-27)" while every box below carried dated EARNED evidence; the line was stale, not the boxes. Re-verification: both producers emit the row-derived scale, the paired scale test passes 9 of 9, and the watermark remediation shipped as `1398_remediate_completed_ticket_inbox_watermarks`, applied on production.

- [x] Both producers of the ticket status event emit the same version scale, derived from the row
- [x] A test asserts the two producers agree, and fails if either scale changes
- [x] Existing consumer watermarks recorded at the wrong scale are remediated so affected tickets resume
  **EARNED 2026-09-27 by the orchestrator. Lane 1's diagnosis below was right, and the gap it named is now closed on production by migration `1398_remediate_completed_ticket_inbox_watermarks`.**

  **What 1374 left behind, measured rather than assumed.** Read-only against production: `inbox_records` for `aggregate_type='ticket'` held **0 SKIPPED rows at epoch scale** (1374 worked — the 256 SKIPPED rows sit at versions 0-4) and **111 COMPLETED rows at epoch scale**, `max(aggregate_version) = 1789813359241`, covering **55 distinct tickets**, all under one consumer, `build:ticket-status-changed`. Zero of those 55 aggregates had a row-scale record as well, so epoch scale was their only watermark.

  **Why that still broke them.** `backend/src/common/outbox/inbox-consumer.ts:89` `isOlderThanApplied` takes `max(aggregate_version)` from **COMPLETED** rows for the (org, consumer, aggregate_type, aggregate_id) tuple and skips anything not greater. A row-scale version is a small integer, so for those 55 tickets every future status event would have been skipped for ever. 1374 reset the SKIPPED rows, which are not the watermark; the COMPLETED rows are.

  **Why lowering a COMPLETED watermark cannot resend anything** — this is the objection the next box raises, and it is answered by the code rather than by assertion. `claim` inserts with `onConflictDoNothing` on `(producer_event_id, consumer_name)` (`inbox-consumer.ts:37-52`); a replay of an already-processed event takes the conflict path, `readExisting` returns `COMPLETED`, and `claim` returns `false` before the watermark is ever consulted. Deduplication is by `producer_event_id`, not by version. The watermark only orders *different* events on the same aggregate. So `1398` sets `aggregate_version = 0` and leaves `producer_event_id`, `consumer_name` and `status = 'COMPLETED'` untouched: old events stay deduplicated, new row-scale events (version >= 1) are greater than 0 and resume.

  **Rehearsed both directions against production inside a single rolled-back transaction before applying:**
  ```
  BEFORE:          [{"status":"COMPLETED","n":111}]
  AFTER FORWARD:   []                                   (0 epoch-scale rows)
                   111 COMPLETED rows at aggregate_version = 0
  AFTER ROLLBACK:  [{"status":"COMPLETED","n":111,"mx":"1789813359241"}]
  transaction rolled back, production unchanged
  ```
  The rollback is exact rather than approximate: all 111 rows join `outbox_events` on `producer_event_id = event_id`, so the original epoch-scale version is recoverable from the producer row, and the forward migration refuses to run if any row cannot be joined that way.

  **Applied to production 2026-09-27.** `run-pending-migrations.mjs --tag=1398_… --dry-run` → `would apply (4 stmts)`; then the real run → `+ 1398_remediate_completed_ticket_inbox_watermarks applied`. Journalled at **idx 1141**, `when 1803093629725`, strictly increasing and unique. Verified after the fact **by hash**, not by tag: the file's sha256 is present in `drizzle.__drizzle_migrations` at `created_at 1803093629725`. Post-state re-queried: **0 epoch-scale ticket rows**, 111 COMPLETED at `min_v = max_v = 0`, 256 SKIPPED unchanged at 0-4. Rollback authored at `backend/migrations/rollback/1398_remediate_completed_ticket_inbox_watermarks.down.sql`, lock_timeout 5s, no `CREATE INDEX CONCURRENTLY`, no comments.
  **Update 2026-09-27 (Lane 1):** Migration 1374 IS journalled (idx 1129) and IS applied on
  production. The `AND status = 'SKIPPED'` predicate resets only the 250 SKIPPED rows.
  The 111 COMPLETED epoch-scale rows are untouched — those tickets' MAX(aggregate_version WHERE
  status='COMPLETED') remains at epoch scale, so new row-scale events for those 111 tickets will
  still be SKIPPED by `isOlderThanApplied`.
  Box remains unticked pending orchestrator confirmation of production state. Query to run:
  ```sql
  SELECT status, count(*), max(aggregate_version) FROM public.inbox_records
  WHERE aggregate_type = 'ticket' AND aggregate_version > 1000000000
  GROUP BY status ORDER BY status;
  ```
  Expected post-1374: SKIPPED rows show `aggregate_version = 0` (i.e., zero rows at epoch scale
  with status SKIPPED). COMPLETED rows unchanged.
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
- [x] Before watermark repair, inventory affected outbox/inbox rows and document replay/deduplication behavior; do not blindly reset completed watermarks and resend customer notifications
  **EARNED 2026-09-27 by the orchestrator, and the caution this box asks for is what shaped the migration.** The inventory was taken from production read-only *before* anything was written, and the reset was deliberately not blind.

  **Inbox inventory** (`aggregate_type='ticket'`): 111 COMPLETED at epoch scale over 55 distinct tickets, one consumer (`build:ticket-status-changed`), `max = 1789813359241`; 256 SKIPPED already at row scale (0-4) from 1374; 0 aggregates carrying both scales.

  **Outbox inventory** — this is the re-poisoning question Lane 1 left open, and the answer is that there is no risk: `outbox_events` for `aggregate_type='ticket'` holds **361 epoch-scale rows and 6 row-scale rows, and every single one is `delivery_state = 'DELIVERED'` with `lifecycle_state = 'ACTIVE'`. Zero PENDING, zero IN_FLIGHT.** Nothing is waiting to be delivered, so no undelivered epoch-scale event can re-raise a watermark after the repair. (The table has no `status` column — the state lives in `delivery_state` and `lifecycle_state`; a query against `status` fails 42703, which is how the earlier draft of this probe was caught.)

  **Replay and deduplication behaviour, from the code.** At-least-once delivery with idempotent application, keyed on the unique `(producer_event_id, consumer_name)` index. A redelivered event hits `onConflictDoNothing`, `readExisting` reports `COMPLETED` or `SKIPPED`, and `claim` returns `false` — the version is never consulted on that path. `FAILED` and `IN_FLIGHT` rows are reclaimable and retried. External side effects are explicitly out of that guarantee and need their own idempotency keys (`inbox-consumer.ts:28-32`), which is why the repair was designed to avoid touching delivery identity at all.

  **So no customer notification is resent**, and that is a property of the chosen mechanism rather than a hope: `1398` changes only `aggregate_version`, on rows that are already `COMPLETED`, whose `producer_event_id` still deduplicates every prior event. A reset of `status` or a delete of those rows would have resent; neither was done.
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

  **Update 2026-09-27 (Lane 1): 1374 IS journalled at idx 1129 and IS applied on production.**
  The "authored, unjournalled and unapplied" note above was incorrect. The SKIPPED predicate was
  already in the file on disk. The 111 COMPLETED epoch-scale rows remain — see the 37(a) box above.
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
Structural tests for update-service path added. Migration 1374 authored, journalled (idx 1129),
and applied on production — confirmed 2026-09-27.

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
  **Update 2026-09-27 (Lane 1):** 1374 IS applied. The pre-application survey found 361 epoch-scale
  `outbox_events` rows. Whether those have since delivered (creating new COMPLETED epoch-scale
  `inbox_records`) is the remaining unknown. Production query for the orchestrator:
  ```sql
  SELECT status, count(*) FROM public.outbox_events
  WHERE aggregate_type = 'ticket' AND aggregate_version > 1000000000
  GROUP BY status ORDER BY status;
  ```
  If any PENDING or IN_FLIGHT rows remain, they will re-poison the watermark for the tickets
  those rows cover when they deliver (creating new COMPLETED epoch-scale `inbox_records`).
- [x] Invoke both real producer paths in regression tests against a real DB to close the acceptance boxes
  **EARNED 2026-09-27 (Lane 1).** 3 of 3 tests pass.
  Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay2`, migration 1373 live (idx 1123).

  Failure root cause was **(A) spec bug** — not a defect in `OutboxWriter.emitMany`. postgres-js
  returns raw SQL column names in snake_case (`event_id`, `aggregate_version`); the spec's
  TypeScript interfaces declared camelCase (`eventId`, `aggregateVersion`). The `find` and `Map`
  lookups accessed `r.eventId` which was `undefined` at runtime. Fix: change interfaces to
  `{ event_id: string; aggregate_version: string }` in all three raw SQL query sites.

  Spec: `backend/src/modules/build/core/tickets/ticket-37-producer-version-scale.db.spec.ts`
  Command:
  ```
  cd backend
  ALLOW_DESTRUCTIVE_DB_TESTS=1 \
  DATABASE_URL=postgresql://neondb_owner:<pw>@127.0.0.1:5432/replay2?sslmode=disable \
  node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js \
    --config ./jest-db.json --runInBand --forceExit --no-cache \
    --cacheDirectory D:/agent-work/jest-lane1 \
    --runTestsByPath src/modules/build/core/tickets/ticket-37-producer-version-scale.db.spec.ts
  ```
  Output: `Tests: 3 passed, 3 total` (15.6 s)

## Other aggregate types — out-of-scope disposition (Lane 1, 2026-09-27)

The two-producer/mixed-scale bug requires two DIFFERENT producers of the same `aggregateType` emitting at different scales. Survey of all `aggregateVersion: Date.now()` usages across the codebase:

- `build/core/projects-releases.service.ts` — aggregateType `release`, single producer, consistently timestamp-scale. No mismatch. Out of scope.
- `inventory/sync/sync-batch.service.ts`, `inventory/stock-engine/*`, `inventory/sales-orders/so-ship.ts`, `inventory/barcode/*`, `inventory/purchase-orders/*`, `inventory/shipments/*` — single producer per aggregateType, consistently timestamp-scale. Out of scope.
- `hr/helpdesk/hr-helpdesk.service.ts` — aggregateType `helpdesk_ticket`, single producer, consistently timestamp-scale. Out of scope.
- `accounting/kernel/lib/journal-events.ts` — aggregateType `gl_journal`, single producer. Out of scope.
- `surveys/survey-response.service.ts` — single producer. Out of scope.
- `kb/*` — not in Build workstream scope.

No aggregate type other than `ticket` has the two-producer mixed-scale pattern. The `ticket` fix (using RETURNING version for both producers) closes the only instance of this bug.
