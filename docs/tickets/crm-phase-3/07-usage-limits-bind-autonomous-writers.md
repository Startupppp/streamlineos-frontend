# 07 — Usage limits that also bind autonomous writers

**Status:** not started
**Track:** B — enforcement
**Blocked by:** 06

## Why

Phase 1 introduced writers that create records and spend AI credits with no
person initiating anything. **Every limit written before Phase 1 assumed a human
on the other end.** This is the kind of gap that is invisible until a tenant's
automation quietly runs up a bill.

## Acceptance criteria

- [ ] Usage enforcement applies at the write path for human, import **and autonomous** actors alike.
- [ ] An autonomous writer that would exceed the cap is stopped, and **the stop is recorded as a decision**, not swallowed.
- [ ] Overage is either refused or billed per the tenant's election, never silently absorbed.
- [ ] A tenant sees usage against cap during the period, so an overage bill is never a surprise.
- [ ] Credits are reserved atomically before the provider call and refunded only on provider failure, per the existing rule.
