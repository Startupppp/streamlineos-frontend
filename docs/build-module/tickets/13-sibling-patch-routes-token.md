# 13 — Give the sibling update routes a concurrency token

**What to build:** Releases, cycles, milestones, epics, modules and roadmap items behave like tickets under concurrent editing: the second writer gets a conflict instead of silently discarding the first writer's work. None of these carries a concurrency token at all today, so every one of them is last-write-wins.

Reuse the shape ticket 12 establishes rather than inventing a second mechanism.

**Blocked by:** 11 — Return the concurrency token everywhere, and have clients echo it. 12 — Require the concurrency token on ticket update.

**Status:** ready-for-agent

- [ ] Each of the six update paths requires a concurrency token
- [ ] A stale token returns 409 with the current value, matching the ticket path's shape
- [ ] All six use one shared mechanism, not per-entity variants
- [ ] Each has a test pairing the conflict case with a success case
