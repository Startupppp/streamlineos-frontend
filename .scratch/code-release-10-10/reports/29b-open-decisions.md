# 29b — The two decisions ticket 29 cannot close on its own

Ticket 29's Calendar and Inbox boxes are not blocked on code, on territory or on infrastructure.
They are blocked on two product decisions that nobody has made. This report states each one as a
decision — options, what each costs, what it forecloses, and a recommendation — so it can be
answered rather than re-audited. **No semantics were invented; nothing here was built.**

Everything below was verified against current source on 2026-09-03, not quoted from the ticket.

---

## Decision 1 — Calendar "this and following"

### Where the surface stands today

The frontend vocabulary is exactly two values: `event-series-scope-dialog.tsx:15` offers
`"occurrence" | "series"`. The backend has `upsertOccurrenceException` and `cancelOccurrence`
(`calendar-recurrence.service.ts:32,80`) plus whole-series update. **A series split exists nowhere
in either repository** — no `series_parent_id`, no `UNTIL` rewrite, no split endpoint. This is an
unbuilt feature, not a regression.

### The five questions, and why each blocks the one after it

**Q1 — Does a split mint a second `calendar_events` row?**
- **1a. Second row + `UNTIL` on the original RRULE + `series_parent_id`.** The industry shape
  (Google, Outlook, CalDAV all do this). Costs a migration (`series_parent_id integer`, a composite
  `(org_id, series_parent_id)` FK to match the tenant-composite convention this repo enforces, and
  an index) plus every list/query path learning that two rows can be one logical series.
- **1b. One row, a per-occurrence override table keyed by a "from this date" marker.** No migration
  on `calendar_events`, but the override table becomes a second recurrence engine and every read has
  to merge it. Expansion is already non-trivial (`calendar-occurrence.service.ts:65-85`).
- **Recommendation: 1a.** 1b puts a second source of truth beside the RRULE, and the provider sweep
  (Q4) has to produce a provider-native split anyway, which is shaped like 1a.

**Q2 — Do exceptions and cancellations after the split point re-parent to the new row?**
This is the question with a wrong answer rather than a trade-off. `calendar_event_exceptions` rows
are keyed to the event they were authored against. If they stay behind, **an occurrence the user
cancelled before the split silently comes back** after it, because the new row carries no
cancellation. Re-parenting must be part of the same transaction as the split. State it explicitly:
the split moves every exception whose occurrence date is `>= splitDate` to the new event id.
There is no defensible variant where they are left behind.

**Q3 — Do attendees and RSVPs carry or reset?**
- **3a. Copy attendees, reset RSVP to `needsAction`.** Truthful: the second half is a different
  meeting and nobody has accepted it. Costs every attendee a fresh invite.
- **3b. Copy attendees and RSVP verbatim.** No new notifications, but records an acceptance for a
  meeting whose time may have changed — the RSVP now asserts something the attendee never said.
- **3c. Copy neither; the new half starts empty.** Loses the invitee list, which is never what the
  editor meant by "this and following".
- **Recommendation: 3a**, with 3b permitted only when the split changes nothing about the time.

**Q4 — Provider sweep: truncate-and-create, or a provider-native edit?**
One local event maps to one `externalEventId` (`calendar-provider-sync-sweep.service.ts`), so a
split needs two.
- **4a. Truncate the existing provider event to the split date and create a second.** Two provider
  calls, and the second is a create — which is the operation that already minted duplicates once
  (fixed in S8 by skipping a push when the row already carries an external id). The new row has no
  external id by construction, so that guard does not protect it; it needs its own idempotency key.
- **4b. Provider-native "this and following"** where the provider offers one. Gmail/Outlook both do,
  but the wrappers do not expose it, and CalDAV/ICS accounts would still need 4a.
- **Recommendation: 4a everywhere**, so there is one code path, with an idempotency key on the
  create derived from `(localEventId, splitDate)`.

**Q5 — Reminders across the boundary.**
`calendar-reminder-sweep.service.ts` keyset-drains candidates per window. After a split the same
wall-clock occurrence can be reachable from both rows for the length of one sweep window, so an
already-sent reminder can fire twice. The sweep must dedupe on `(occurrenceStart, attendee)` rather
than `(eventId, occurrenceStart, attendee)`, or the split must stamp the new row's reminder
watermark from the old row's. Pick one; either is a small change, but skipping it ships a
double-notify.

### What is needed to unblock

Answers to **Q1 and Q2 only**. Q3–Q5 are implementation detail once the row shape is fixed; Q1 and Q2
determine the migration and the transaction boundary, and nothing can be built against a guess.

---

## Decision 2 — Inbox/mail: what is in this release

Two NEW REQUIREMENTs, not four remainders. Re-verified 2026-09-03.

### (A) Unread count and incremental sync are one requirement

The count query is trivial — `mail_message_metadata.is_read` exists and the keyset index already
covers the predicate. It is not built because **the answer would be a wrong number presented as
authoritative**: the mirror holds only what a user has already scrolled past, so a fresh account
would report "3 unread" for a 400-message mailbox.

The checkpoint machinery is not a delta sync and cannot be promoted into one by wiring it up:
`loadPosition` has **zero production callers**, `clearPositions` has none anywhere, and
`mail.service.ts:284` upserts a row on every provider page fetch **that nothing ever reads**. What it
stores is the `nextPageToken` of the last page scrolled to — a scroll position, not a delta position.
Wiring `loadPosition` to it would resume mid-scroll and silently skip everything above.

Cost to build: delta-token semantics on `mail_sync_checkpoints`, a `listChanges` on both providers
(Gmail `historyId`, Outlook `deltaLink` — neither wrapper requests one), a background sync worker
(there is none; the mirror is populated only as a side effect of a user scrolling), and only then an
unread endpoint.

### (B) Idempotent receive and bounce/retry/DLQ are one requirement

There is **no inbound mail path at all** — zero `webhook`, inbound, bounce or DLQ references under
`src/modules/mail/`. A bounce arrives as an inbound DSN, so bounce handling cannot precede receiving,
and "idempotent receive" has nothing to be idempotent about until something receives.

Cost to build: a provider trigger or webhook receiver (`CalendarProviderWebhookController` is the
pattern in this repo, including `@Public()` + shared secret and a `.strict()` body schema — and note
that controller was itself dead and unauthenticated until S8, so copy the fixed version), a dedupe
key that includes `account_id` **and** `org_id` (`mail_message_metadata`'s unique omits `org_id`),
and a DSN classifier feeding the existing `notification-delivery-worker` retry/dead-letter machinery,
which has never been applied to mail.

### The scope decision, stated

**Neither (A) nor (B) is in this release.** Both are provider-integration designs with a worker and a
schema change apiece; neither is a defect in shipped behaviour. What was in reach — conversation
ordering (a hard dead end: `nextCursor: null` unconditionally on the cached path) and database
search (a leading-wildcard `ilike` the planner refuses under RLS) — was found, fixed and measured
in S10, and idempotent send turned out to be already done. That is the whole of the honest delta.

**One live consequence to accept with the decision:** `mail.service.ts:284`'s write-only checkpoint
upsert stays. Deleting it is what "leave less code than you found" asks for, and it is the wrong call
here — it is the row shape requirement (A) will migrate, and `mail-sync-checkpoint-isolation.spec.ts`
supplies 4 of `check:tenant-isolation`'s 926 declarations. It is recorded as dead-on-arrival rather
than removed, and this paragraph is the record.
