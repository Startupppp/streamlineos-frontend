# 16: Commit bookings idempotently

**What to build:** Confirm a booking only after atomically rechecking current rule, access, source versions, availability, holds, host eligibility, and constrained capacity.

**Blocked by:** 14: Configure booking rules and public availability; 15: Create durable slot holds and reservation constraints.

**Status:** in-progress

- [ ] A confirmation revalidates all mutable facts instead of trusting the displayed slot.
- [ ] At most one constrained booking commits under concurrent attempts.
- [ ] Repeated or timed-out submissions with the same idempotency key return one durable outcome.
- [ ] Local confirmation, provider synchronization, and external effects have distinct visible states.
- [ ] Receipts distinguish confirmed, rejected, expired, cancelled, pending, and uncertain outcomes with safe alternatives.

