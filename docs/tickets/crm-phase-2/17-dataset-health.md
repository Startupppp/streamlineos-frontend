# 17 — Dataset health is a number that moves

**Status:** done — dataset health on the scoreboard, and the RLS it shipped without (0252/0253).
**Track:** D — data quality
**Blocked by:** 16

## Acceptance criteria

- [ ] A composite of the open queue by class, weighted by severity, per tenant.
- [ ] Tracked over time, so the direction is visible — a single current figure
      cannot tell anyone whether working the queue helped.
- [ ] Rendered on Phase 1's scoreboard, not a new surface.
- [ ] It moves when the queue is worked, proven by a test rather than asserted.
