# S09 — Calendar, Inbox and Mail

Status: active

Independent scope: backend Calendar, Inbox and Mail modules/workers and matching frontend Calendar, Inbox and Mail features/routes/hooks. It consumes current notification, realtime and integration interfaces without editing their implementations. Schema and migration edits belong to S02.

Master coverage: sections 10.13 and 10.14 plus owned parts of sections 3–8, 11 and 12.

## Acceptance criteria

- [ ] Verify Calendar source/event/attendee/recurrence/exception/reminder/sync models, RRULE use, timezone/DST, bounded expansion, privacy and tenant-safe relations.
- [ ] Prove free/busy/conflict/reminder/export range bounds, indexed plans, replacement/deduplication and provider-sync retry/order/tombstone/drift guarantees.
- [ ] Consolidate member list/search behind `directory:people:view` and test missing, granted and revoked access.
- [ ] Verify one provider-neutral bounded Inbox/Mail contract for accounts, conversations, messages, participants, labels, sync cursors, attachments, send/reply/read/search/archive and unread counts.
- [ ] Prove ownership/delegation, sanitization, unsafe-link/content handling, idempotent delivery/sync, bounce/retry/DLQ and exact list/thread/count invalidation.
- [ ] Verify accessible responsive infinite/range UI, optimistic rollback, offline/reconnect and revocation states; remove legacy Inbox hooks only after caller proof.
- [ ] Run focused Calendar/Inbox/Mail recurrence, authorization, query and recovery tests plus targeted gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S09 is complete; commit/evidence: _pending_.
