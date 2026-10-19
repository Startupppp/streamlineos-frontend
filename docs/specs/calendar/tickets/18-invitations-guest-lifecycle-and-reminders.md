# 18: Complete invitations, guest lifecycle, RSVP, and reminders

**What to build:** Keep organizers and internal or external attendees aligned through invitation, RSVP, update, reschedule, cancellation, attendance, and reminder flows.

**Blocked by:** 16: Commit bookings idempotently; 17: Publish versioned Calendar lifecycle events.

**Status:** in-progress

- [ ] Required and optional attendees receive one current invitation and can RSVP through an authorized identity or expiring signed link.
- [ ] Removed guests and cancelled occurrences cannot use obsolete links or join information.
- [ ] Rescheduling and cancellation update every current attendee while suppressing obsolete reminders.
- [ ] Reminder defaults, channels, quiet hours, snooze, missed-delivery recovery, and per-occurrence deduplication are enforced.
- [x] Tests cover organizer departure, email change, late RSVP, duplicate delivery, cancellation during send, and no-show marking.

