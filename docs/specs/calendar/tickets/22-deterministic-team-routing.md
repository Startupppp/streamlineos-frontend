# 22: Route team bookings deterministically

**What to build:** Select eligible hosts using collective availability, weighted or fair rotation, CRM ownership, territory, skill, language, resource needs, and documented fallback.

**Blocked by:** 13: Build privacy-safe availability and diagnostics; 16: Commit bookings idempotently; 20: Reserve rooms and source-owned resources.

**Status:** ready-for-agent

- [ ] Versioned routing rules explain the selected host to authorized users without exposing private reasons to guests.
- [ ] Inactive, offboarded, on-leave, over-limit, disconnected, or otherwise ineligible hosts are excluded.
- [ ] Fairness state updates transactionally with booking and duplicate retries retain the same assignment.
- [ ] CRM-owner continuity, territory, skill, language, collective/all-host, and safe no-match fallback are covered.
- [ ] Race tests prove concurrent bookings cannot corrupt fairness or double-assign constrained capacity.

