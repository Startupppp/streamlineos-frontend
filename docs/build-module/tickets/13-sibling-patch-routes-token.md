# 13 — Give the sibling update routes a concurrency token

**What to build:** Releases, cycles, milestones, epics, modules and roadmap items behave like tickets under concurrent editing: the second writer gets a conflict instead of silently discarding the first writer's work. None of these carries a concurrency token at all today, so every one of them is last-write-wins.

Reuse the shape ticket 12 establishes rather than inventing a second mechanism.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row. 11 — Return the concurrency token everywhere, and have clients echo it. 12 — Require the concurrency token on ticket update.

**Status:** done

- [x] Each of the six update paths requires a concurrency token — migration 1395 adds `version INTEGER NOT NULL DEFAULT 1` to cycles, project_milestones, modules, roadmap_items, and `row_version INTEGER NOT NULL DEFAULT 1` to project_releases (which already had `version TEXT`); Drizzle schema and DTO update schemas updated accordingly
- [x] A stale token returns 409 with the current value, matching the ticket path's shape — `TicketVersionConflictException` is thrown in all six services on pre-check mismatch and on CAS failure
- [x] All six use one shared mechanism, not per-entity variants — `TicketVersionConflictException` from `ticket-version-conflict.exception.ts` is the sole mechanism
- [x] Each has a test pairing the conflict case with a success case — `backend/src/modules/build/execution/sibling-version-conflict.spec.ts` covers cycles, modules, epics; `backend/src/modules/build/core/sibling-version-conflict.spec.ts` covers milestones, releases, roadmap; 12 tests pass
