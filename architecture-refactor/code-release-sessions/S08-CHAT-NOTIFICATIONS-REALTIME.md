# S08 — Chat, Notifications and realtime delivery

Status: active

Independent scope: backend Chat, Notifications, push/email dispatch and realtime delivery modules/workers; matching frontend Chat and Notifications features/routes/hooks. S08 exclusively owns the shared realtime implementation. Schema and migration edits belong to S02.

Master coverage: sections 10.12 and 10.15 plus fanout/realtime portions of sections 5, 7, 8, 11 and 12.

## Acceptance criteria

- [ ] Verify normalized tenant/channel Chat relations, membership and thread inheritance, server-derived actors, mutation-hook authorization, attachment access and 404 denial for inaccessible private resources.
- [ ] Prove stable message/history/reaction/unread cursors, atomic read state, no unread scan, idempotent optimistic send/reaction and reconnect/offline dedupe.
- [ ] Replace per-tab heartbeats with authoritative Ably presence and one bounded leader-elected fallback; prove multitab, visibility, jitter, backoff and reconnect load behavior.
- [ ] Verify notification recipient/read/preference/template/delivery/provider-event state, indexed unread counts and recipient-only authorization.
- [ ] Preserve cursor-resumable bounded fanout with checkpoints, tenant concurrency, at-least-once idempotency, retry/DLQ, suppression and provider failure behavior.
- [ ] Verify typed infinite-cache optimistic read/read-all/bulk rollback under concurrent realtime delivery and accessible responsive frontend states.
- [ ] Run focused Chat/Notification/realtime concurrency, authorization and recovery tests plus targeted gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S08 is complete; commit/evidence: _pending_.
