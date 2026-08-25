# 02 — Seats have one auditable ledger

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Billable seat types and inclusion rules are explicit.
- [ ] Membership and billing consume the same seat definition.
- [ ] Seat changes serialize under the existing per-organisation quota lock.
- [ ] Every quantity change records actor, reason, effective time and idempotency key.
- [ ] Invitations, suspended members, external guests and deactivated accounts have documented treatment.
- [ ] A reconciliation query explains billed quantity from ledger facts.
