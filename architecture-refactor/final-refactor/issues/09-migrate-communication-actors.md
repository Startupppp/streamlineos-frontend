# 09: Migrate Chat, Calendar, Mail and Notification actors

**What to build:** Participants, attendees, senders and recipients use organization membership/person identity across communication domains.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** ready-for-agent

- [ ] New communication actor relationships use the canonical organization actor.
- [ ] Historical/inactive participants remain renderable without receiving current authority.
- [ ] Backfill is resumable and reports unmappable rows.
- [ ] Cross-org participant, attendee and recipient tests pass.
