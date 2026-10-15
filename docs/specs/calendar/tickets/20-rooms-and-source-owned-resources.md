# 20: Reserve rooms and source-owned resources

**What to build:** Include rooms, equipment, capacity, location, maintenance, accessibility, and approval constraints in availability and booking.

**Blocked by:** 15: Create durable slot holds and reservation constraints; 16: Commit bookings idempotently.

**Status:** in-progress

- [ ] Calendar-managed rooms and source-owned equipment expose safe availability and capacity.
- [ ] Maintenance, location, accessibility, divisible capacity, and approval rules affect offered slots.
- [ ] Resource owners revalidate eligibility and return committed, rejected, or pending receipts.
- [x] A failed allocation cannot be presented as a fully confirmed booking.
- [ ] Race tests cover last resource unit, simultaneous room booking, maintenance change, approval delay, and partial multi-resource failure.

