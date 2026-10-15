# 19: Reconcile Google and Outlook writes

**What to build:** Make provider create, update, occurrence change, cancellation, conference creation, and reconnect behavior honest and recoverable.

**Blocked by:** 17: Publish versioned Calendar lifecycle events; 18: Complete invitations, guest lifecycle, RSVP, and reminders.

**Status:** ready-for-agent

- [ ] Unsupported provider capabilities are refused visibly rather than represented incorrectly.
- [ ] A provider acceptance followed by timeout reconciles by stable external identity without duplicate events.
- [ ] Duplicate or out-of-order webhook notifications are version checked and safely replayable.
- [ ] OAuth expiry, invalid incremental token, divergence, and conference-link failure have clear repair paths.
- [ ] Real sandbox journeys cover create, update, occurrence change, cancellation, reconnect, timeout, and duplicate webhook behavior for both providers.

