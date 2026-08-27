# c9 transactional outbox decision

Verified 2026-08-26 against the current backend implementation.

## Decision

The generic `outbox_events` ledger is the canonical path for cross-module domain
events. Producers use `OutboxWriter.emit(tx, event)` inside the aggregate
transaction; consumers register with `OutboxConsumerRegistry`; the relay runs
per organisation and applies the `InboxConsumer` duplicate-suppression and
monotonic aggregate-version fence. Delivery remains at-least-once; external
side effects must provide their own idempotency key where replay matters.

`notification_outbox` is retained as an internal notification-intent ledger,
not as a second generic domain-event bus. Its only public entry point is
`NotificationDispatchService`; `NotificationOutboxRelayService` owns its
delivery retries and dedupe. Domain producers must not add new direct durable
ledgers. This preserves the notification-specific recipient, preference,
template, and delivery semantics without pretending that a notification intent
has the same envelope as a cross-module domain event.

This is a deliberate two-ledger implementation with one canonical path per
semantic class, rather than an accidental choice between two generic event
paths. A new cross-module event goes through `outbox_events`; a notification
intent goes through `NotificationDispatchService`.

Chat external effects additionally use the tenant-scoped
`external_effect_ledger` for lease ownership, stale-attempt fencing,
per-recipient keys, and durable uncertainty accounting. This ledger cannot
atomically commit a remote provider call with its database finalization, so it
records at-least-once recovery rather than claiming universal exactly-once.

The original single-ledger wording is amended by this decision: the two
ledgers are accepted only because they carry different envelopes and delivery
semantics. No third durable event ledger is permitted, and notification
intents must not be emitted directly to `outbox_events`.

## Runtime guarantees

- `OUTBOX_DISPATCH_ENABLED` is enabled unless explicitly set to `false`.
- Unregistered event types fail and enter bounded retry/dead-letter handling.
- `InboxConsumer` suppresses duplicate and out-of-order aggregate versions;
  this is not a universal exactly-once guarantee for external side effects.
- Chat external effects are suppressed after durable success and reclaimed
  through fenced leases after worker loss. Provider-enforced idempotency is
  still required to close the crash-after-remote-acceptance window.
- Relay work runs inside a fresh tenant transaction; it never borrows a request
  transaction.
- `GET /cron/outbox-events-metrics` reports pending, in-flight, dead, and oldest
  pending age; the flush endpoint remains secret-gated.
- `pnpm report:outbox-events` captures those measures per organisation together
  with distinct event-type counts before a ledger migration decision.
- Partitioning is deferred until the report shows 100,000 `outbox_events` rows
  in any organisation or an oldest pending age above 24 hours; the report and
  metrics endpoint are the operational trigger, not an implicit omission.
- Notification relay rows have their own lease, retry, dead-letter, and dedupe
  guarantees.
- Migration `0474_external_effect_ledger.sql` is deployed in the audited runtime;
  the current read-only report shows zero ledger rows, so live effect execution
  and crash-window measurements remain unexercised.

## Migration rule

Existing `notification_outbox` rows are drained by its existing relay. Existing
`outbox_events` rows are drained by `OutboxPublisherService`. No rows are
silently discarded, and no new third ledger may be introduced. The two metrics
surfaces are the operator evidence for backlog and retirement decisions.
