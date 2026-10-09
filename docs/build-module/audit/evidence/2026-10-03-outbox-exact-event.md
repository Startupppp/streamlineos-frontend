# Exact tenant-event dispatch: source verification

## Scope and revisions

- Claim: `BLD-OUTBOX-EXACT-EVENT-01`, outer claim revision `48a1871e5`.
- Backend source commit: `3bf17a619`; preceding backend revision: `f0f79449a`.
- Only four source/test files changed under `backend/src/common/outbox/`:

| Path | Verified blob hash |
|---|---|
| `outbox-claim.ts` | `d7773f4aa64481b0e2f231a3f0ae80cd2e59809d` |
| `outbox-publisher.service.ts` | `d103612d6587571a9d5b9a33f22355ed88440a77` |
| `outbox-exact-event-claim.spec.ts` | `a41ecabeefeb2907bfeb318e8af1ba560e6c2956` |
| `outbox-exact-event-publisher.spec.ts` | `8b45cee33f98406a753975354c4e6b066435b417` |

No runner wiring, production HTTP route, schema, migration or target-database mutation is part of this slice.

## Internal contract

`OutboxBatchClaimer.claimEvent(organizationId, eventId)` returns one claimed event or null. It rejects blank identifiers before opening a transaction, preserves exact text identifiers for historic rows, and binds both tenant and event in the candidate selector and outer UPDATE. Its candidate query has `LIMIT 1` and `FOR UPDATE SKIP LOCKED`.

Eligibility matches the global drain: PENDING with a null or due lease, or IN_FLIGHT with an expired non-null lease. A future lease, IN_FLIGHT without a lease, or terminal delivery state cannot satisfy this predicate. The canonical lease duration is reused. The method opens a new transaction for the stated tenant, without `forEachOrg`, and never changes the global fairness cursor.

`OutboxPublisherService.flushEvent(organizationId, eventId)` returns the existing flush statistics. Global `flush()` and exact `flushEvent()` share one processing loop. This retains producer-context restoration, organization lifecycle suppression, consumer fanout, delivery deadline, retry/dead-letter policy, inbox handling within registered consumers, and the physical event/state/original-lease fences on bookkeeping. Dispatch-disabled behavior remains an inert zero result with one warning across both entrypoints.

These are trusted internal service methods, not authorization boundaries for a public caller. Any future browser-verification runner must independently verify the synthetic organization, actor and invitee envelope before invoking an exact setup event. Enabling that runner must preserve disabled global workers and prohibit cron/global-sweep routes. The dispatch-disabled guard is not bypassed by the exact entrypoint.

## Source gates


## Proof boundaries and remaining acceptance

The SQL tests compile the actual claim implementation. The no-candidate test mocks an empty transaction result and proves null handling. The publisher tests mock database transactions and claim outcomes; their concurrent-call test proves the publisher respects a refused claim. None of these is a PostgreSQL row-lock or persisted-delivery proof.
- [ ] Verify wrong tenant with the correct event identifier, and another pending event in the selected tenant remaining untouched.
- [ ] Verify real PostgreSQL PENDING/null lease, exactly due lease, future lease, expired/live/null IN_FLIGHT lease, and all terminal states.
- [ ] Verify a physically locked row is skipped, parallel exact/global claims have one owner, and live or delivered replay does not redeliver.
- [ ] Verify bookkeeping after a competing lease change remains fenced for success, retry and dead-letter in PostgreSQL.
- [ ] Wire the reviewed runner's exact synthetic setup event and verify receipts, inbox/outbox persistence, invitation delivery capture and browser resume/retry behavior.

No target event was claimed or dispatched for this source verification.

## Delivery checklist


Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
