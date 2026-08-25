# c9 transactional outbox decision

Verified 2026-08-26 against the current backend implementation.

## Decision

The generic `outbox_events` ledger is the canonical path for cross-module domain
events. Producers use `OutboxWriter.emit(tx, event)` inside the aggregate
transaction; consumers register with `OutboxConsumerRegistry`; the relay runs
per organisation and applies the `InboxConsumer` exactly-once and monotonic
aggregate-version fence.

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

## Runtime guarantees

- `OUTBOX_DISPATCH_ENABLED` is enabled unless explicitly set to `false`.
- Unregistered event types fail and enter bounded retry/dead-letter handling.
- `InboxConsumer` rejects duplicate and out-of-order aggregate versions.
- Relay work runs inside a fresh tenant transaction; it never borrows a request
  transaction.
- `GET /cron/outbox-events-metrics` reports pending, in-flight, dead, and oldest
  pending age; the flush endpoint remains secret-gated.
- Notification relay rows have their own lease, retry, dead-letter, and dedupe
  guarantees.

## Migration rule

Existing `notification_outbox` rows are drained by its existing relay. Existing
`outbox_events` rows are drained by `OutboxPublisherService`. No rows are
silently discarded, and no new third ledger may be introduced. The two metrics
surfaces are the operator evidence for backlog and retirement decisions.
