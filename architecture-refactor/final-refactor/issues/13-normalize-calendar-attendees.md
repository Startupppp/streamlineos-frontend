# 13: Normalize Calendar attendees

**What to build:** Calendar attendees are same-organization membership rows with response state, enabling safe updates, free/busy queries and referential integrity without relationship JSONB.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** ready-for-agent

- [ ] Additive attendee storage has organization/event/membership integrity and uniqueness.
- [ ] Existing attendee data is backfilled and verified before API cutover.
- [ ] Recurrence, invitations, responses and free/busy use normalized attendees.
- [ ] Legacy attendee JSONB is removed only after zero-use proof and migration tests.
