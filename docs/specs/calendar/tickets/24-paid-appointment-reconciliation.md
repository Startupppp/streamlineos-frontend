# 24: Reconcile paid appointments

**What to build:** Coordinate payment authorization, booking reservation, capture, cancellation, refund, and recovery through one durable idempotent lifecycle.

**Blocked by:** 16: Commit bookings idempotently; 23: Ship secure branded and embedded booking.

**Status:** in-progress

- [ ] Payment and booking states are linked by one idempotency identity and remain independently visible.
- [ ] A lost response or retry cannot create a duplicate charge or confirmed duplicate booking.
- [ ] Successful payment with failed booking enters a visible repair/refund path.
- [ ] Uncertain or failed payment cannot be displayed as a confirmed paid booking.
- [x] Tests cover timeout after remote success, booking race, duplicate submit, cancellation policy, partial refund, chargeback, and reconciliation retry.

