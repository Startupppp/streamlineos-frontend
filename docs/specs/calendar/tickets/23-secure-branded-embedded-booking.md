# 23: Ship secure branded and embedded booking

**What to build:** Distribute booking through branded pages, approved embeds, localized intake, and secure expiring or single-use links.

**Blocked by:** 16: Commit bookings idempotently; 22: Route team bookings deterministically.

**Status:** in-progress

- [ ] Pages support approved branding, localization, accessibility, and minimal configurable intake.
- [ ] Embeds validate allowed origins and signed state; callbacks expose only permitted booking facts.
- [ ] Single-use and expiring links are enforced server side and cannot be enumerated or replayed.
- [ ] Rate limits, spam controls, revocation, and operational visibility protect public availability.
- [ ] Conversion attribution counts one completed outcome across refresh, retry, embed, and reschedule flows.

