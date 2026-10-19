# 13: Build privacy-safe availability and diagnostics

**What to build:** Evaluate candidate time slots using working hours, permitted busy time, approved leave, buffers, provider freshness, host eligibility, and coverage without disclosing private event details.

**Blocked by:** 05: Make native recurrence and export results complete and deterministic; 06: Make Build and Tasks projections bounded and deterministic; 07: Make attendance and HR coverage trustworthy; 08: Page connected Google and Outlook windows; 12: Complete projection-contract migration and core verification.

**Status:** in-progress

- [ ] Availability distinguishes free, busy, tentative, and unknown with an as-of time and source coverage.
- [ ] A stale, failed, disconnected, or truncated source cannot silently become free.
- [ ] Guest explanations are generic while authorized host/admin diagnostics identify safe policy or source reasons.
- [ ] Deadline-style commitments do not block time unless their type explicitly declares that behavior.
- [x] Tests cover timezones, DST, working hours, leave, buffers, optional attendees, disconnected providers, and permission-limited inputs.

