# 31: Decompose the Calendar frontend architecture

**What to build:** Calendar recurrence forms, event details, view state, attendee state and mutations become cohesive independently testable components.

**Blocked by:** 13 — Normalize Calendar attendees.

**Status:** ready-for-agent

- [ ] Oversized Calendar files are split by form, state, data and presentation ownership.
- [ ] Recurrence, exceptions, attendee responses, timezone and source visibility remain correct.
- [ ] Permission and universal-calendar behavior remain consistent.
- [ ] File-size, typecheck and focused Calendar tests pass.
