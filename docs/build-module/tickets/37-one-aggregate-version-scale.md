# 37 — One version scale for ticket events, so a consumer cannot permanently skip one

**What to build:** Every consumer of ticket status events keeps processing them. Two producers emit the same event type on the same aggregate with version numbers twelve orders of magnitude apart — one uses the row's version, the other a millisecond timestamp — and the consumer's ordering guard only applies an event whose version exceeds the highest it has already completed. So once a timestamp-scaled event is recorded, every row-scaled event for that ticket is skipped forever, with no error and no retry.

Fixing the producers is not enough on its own: the watermark rows already written at timestamp scale keep the skip alive for every ticket they cover. Those rows need remediating in the same change, and that is the part most likely to be forgotten.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [ ] Both producers of the ticket status event emit the same version scale, derived from the row
- [ ] A test asserts the two producers agree, and fails if either scale changes
- [ ] Existing consumer watermarks recorded at the wrong scale are remediated so affected tickets resume
- [ ] The remediation is idempotent and safe to replay
- [ ] Any other aggregate type sharing this pattern is either fixed or recorded as out of scope with its reason
- [ ] Verify two concurrent writes and repeated delivery for the same ticket: event identity is unique, delivery is idempotent, and the ordering policy does not silently discard a required earlier event delivered late
- [ ] Before watermark repair, inventory affected outbox/inbox rows and document replay/deduplication behavior; do not blindly reset completed watermarks and resend customer notifications

**Architecture constraint (2026-09-27):** Keep ticket row concurrency versions and general outbox
allocation distinct. The review's alternative of moving `nextAggregateVersions` into every
`OutboxWriter.emit` is not an automatic fix: `backend/src/common/outbox/aggregate-version.ts`
uses `MAX(aggregate_version) + 1` and explicitly leaves races to the unique index. Do not impose
that cross-module change without serialization/retry semantics and consumer compatibility tests.
For Build, use the version returned by the actual row write, not a guessed pre-write `version + 1`.

**Current evidence:** The detail producer now emits its returned row version, while
`build-ticket-batch-workflow.ts:26` predicts the locked row's version plus one. Migration 1374 is
authored but unjournalled. `ticket-status-event-version-scale.spec.ts` passes but exercises only
the batch helper, despite claiming both producers. These do not close the acceptance boxes.

- [ ] Invoke both real producer paths in regression tests; account for pending timestamp-scaled events that could poison repaired watermarks again and explicitly decide the disposition of previously skipped events
