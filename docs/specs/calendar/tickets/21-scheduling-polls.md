# 21: Run scheduling polls with expiring holds

**What to build:** Let organizers propose multiple times, collect internal or external votes, optionally hold capacity, and finalize one current slot.

**Blocked by:** 15: Create durable slot holds and reservation constraints; 18: Complete invitations, guest lifecycle, RSVP, and reminders.

**Status:** in-progress

- [x] Polls support required and optional voters, expiry, early close, duplicate-vote prevention, and organizer finalization.
- [x] Option holds expire and release capacity without turning votes into permanent reservations.
- [ ] Finalization rechecks availability and sends exactly one committed invitation.
- [ ] If the chosen option became unavailable, votes remain visible and fresh alternatives are offered.
- [x] Tests cover anonymous signed voting, changed guest identity, expired poll, busy option, simultaneous finalization, and cancelled poll.

