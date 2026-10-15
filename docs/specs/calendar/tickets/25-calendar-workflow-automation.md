# 25: Automate Calendar lifecycle workflows

**What to build:** Execute configured effects from committed Calendar lifecycle events with conditions, consent, idempotency, retries, and operator repair.

**Blocked by:** 17: Publish versioned Calendar lifecycle events; 18: Complete invitations, guest lifecycle, RSVP, and reminders.

**Status:** in-progress

- [ ] Triggers cover creation, reschedule, cancellation, no-show, start, end, and source-state changes.
- [ ] Conditions, recipients, channels, consent, quiet hours, dry run, limits, and tenant policy are enforced at execution time.
- [ ] Duplicate or out-of-order triggers produce each configured effect at most once for the applicable version.
- [ ] Failures use durable retry, dead-letter state, replay controls, and an operator-visible repair path.
- [ ] Withdrawing consent or changing policy before execution prevents the obsolete effect.

