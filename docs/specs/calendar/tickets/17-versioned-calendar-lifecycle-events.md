# 17: Publish versioned Calendar lifecycle events

**What to build:** Emit authoritative Calendar lifecycle events through a transactional outbox after local booking or event state changes.

**Blocked by:** 16: Commit bookings idempotently.

**Status:** ready-for-agent

- [ ] Confirmed, changed, rescheduled, cancelled, no-show, started, ended, failed, and repaired states emit stable versioned events.
- [ ] Event publication is atomic with the local state transition and carries a stable effect idempotency identity.
- [ ] Consumers can detect duplicates, gaps, and out-of-order versions and reconcile safely.
- [ ] Payloads are tenant scoped and minimized for downstream authorization.
- [ ] Tests cover transaction rollback, duplicate delivery, out-of-order delivery, replay, and deleted/restricted records.

