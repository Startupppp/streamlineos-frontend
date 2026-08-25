# 03 — Proration is stored, not recomputed

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Upgrade, downgrade and seat-quantity changes produce immutable proration line items.
- [ ] Each line names old/new price version, effective interval, quantity, currency and rounding.
- [ ] Provider-calculated proration is stored and reconciled; it is not blindly trusted.
- [ ] Retry with the same idempotency key returns the same result.
- [ ] Negative adjustments become credits, never mutation of an issued invoice.
