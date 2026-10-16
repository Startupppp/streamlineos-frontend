# 27: Deliver booking analytics and administrative controls

**What to build:** Give authorized operators trustworthy booking, routing, utilization, no-show, churn, and source-coverage metrics with policy controls.

**Blocked by:** 17: Publish versioned Calendar lifecycle events; 18: Complete invitations, guest lifecycle, RSVP, and reminders; 22: Route team bookings deterministically.

**Status:** in-progress

- [ ] Metrics derive from authoritative lifecycle events rather than rendered projection counts.
- [ ] Definitions, denominator, timezone, deduplication, corrections, and partial-source coverage are visible.
- [ ] Small cohorts and restricted HR, Finance, or private event inputs cannot reveal individual activity.
- [ ] Admins can govern booking domains, link revocation, provider scope, retention, export, automation limits, and abuse controls.
- [ ] Tests cover late events, duplicates, source outage, changed routing, deleted records, and small-cohort suppression.

