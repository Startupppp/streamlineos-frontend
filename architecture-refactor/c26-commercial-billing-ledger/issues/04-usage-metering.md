# 04 — Usage metering is idempotent and aggregatable

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each usage event has tenant, meter key, subject, quantity, occurred time and unique source key.
- [ ] Duplicate and out-of-order events do not double-count.
- [ ] Raw events are append-only; hourly/daily rollups are rebuildable projections.
- [ ] Quota enforcement uses an atomic reservation where the action spends money.
- [ ] Late events and corrections are represented as new facts.
- [ ] Retention preserves invoice evidence after raw operational detail expires.
