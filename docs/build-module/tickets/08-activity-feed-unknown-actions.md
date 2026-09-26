# 08 — Let the activity feed tolerate an unknown action type

**What to build:** Shipping a new activity action type on the backend does not break the ticket activity tab. Today the consumer's validation is a closed set of fourteen values while the producer emits an open string, so the tighter side of the seam is the client. The first unrecognised action makes the whole page's response fail validation, and the activity tab renders an error state for every ticket that has received one — with no compile-time warning that it was coming.

Parse the action as an open value; keep the closed set only where it drives display, falling back to the raw value when unrecognised.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An activity entry with an unrecognised action renders instead of failing the page
- [ ] Known actions still get their specific label and icon
- [ ] An unrecognised action displays a sensible fallback rather than blank
- [ ] A test feeds an action type absent from the display set and asserts the feed still renders
