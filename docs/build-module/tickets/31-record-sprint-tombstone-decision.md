# 31 — Record why the sprint tombstone stays

**What to build:** A written record that the frozen sprint routes are kept deliberately, so the next architecture review does not propose deleting them again. This review classified roughly 377 lines — the frozen service, its controller, five schemas and a spec — as dead, because every method throws and no first-party client calls them; the framework config redirects those paths before routing.

The decision is to keep them, and the reason is load-bearing enough to write down: the routes return **410 with a migration hint** naming the replacement. Deleting them turns an informative 410 into a silent 404 for any third-party or agent-tool consumer still holding an old path. On that reading the tombstone is an adapter earning its keep, not residue.

Record the decision, not just the outcome — an unexplained "keep" invites the same proposal next quarter.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The decision and its reason are recorded where retirement decisions already live
- [ ] The record names what would be lost by deleting: the 410 status and its migration hint
- [ ] The kill-list acceptance criterion about removed surfaces retaining parallel schemas is annotated to reflect this deliberate exception
- [ ] No code is deleted
- [ ] The still-open question of the surviving sprint-named permission key gating the cycles surface is cross-referenced, since that is a separate decision
