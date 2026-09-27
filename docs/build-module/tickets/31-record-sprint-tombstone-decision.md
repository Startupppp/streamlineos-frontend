# 31 — Record why the sprint tombstone stays

**What to build:** A written record that the frozen sprint routes are kept deliberately, so the next architecture review does not propose deleting them again. This review classified roughly 377 lines — the frozen service, its controller, five schemas and a spec — as dead, because every method throws and no first-party client calls them; the framework config redirects those paths before routing.

The decision is to keep them, and the reason is load-bearing enough to write down: the routes return **410 with a migration hint** naming the replacement. Deleting them turns an informative 410 into a silent 404 for any third-party or agent-tool consumer still holding an old path. On that reading the tombstone is an adapter earning its keep, not residue.

Record the decision, not just the outcome — an unexplained "keep" invites the same proposal next quarter.

**Blocked by:** None — can start immediately.

**Status:** done

**Verified 2026-09-27:** Decision/exception records match the surviving 410 adapter, and
`backend/src/modules/build/execution/sprint-create-frozen.spec.ts` passed in the focused backend
run recorded in `ARCHITECTURE-VERIFICATION-2026-09-27.md`. Migration/grant statements below are
historical records, not a fresh production query. This ticket closes a documentation decision;
it does not certify migration application or deployment.

- [x] The decision and its reason are recorded where retirement decisions already live — `docs/build-module/99-kill-list.md` Sprint row (annotated 2026-09-27): states the frozen service, controller, schemas and spec are kept because every method throws `GoneException(FROZEN)` with the replacement path, and deleting them converts an informative 410 into a silent 404.
- [x] The record names what would be lost by deleting: the 410 status and its migration hint (`"Sprints are frozen. Use /build/:projectId/cycles — Cycles are the only iteration identity."`) — `docs/build-module/99-kill-list.md` Sprint row annotation 2026-09-27.
- [x] The kill-list acceptance criterion at line 117 (`No removed surface retains a parallel schema, permission, cache key, or endpoint family`) is annotated with this deliberate exception — `docs/build-module/99-kill-list.md` acceptance criteria section 2026-09-27: the box is left unticked and the exception is explained (no DB schema, no permission key, no cache key; only the HTTP 410 adapter survives).
- [x] No code is deleted — no source file was modified; this ticket records a decision in documentation only.
- [x] The still-open question of the surviving sprint-named permission key is cross-referenced — the kill-list annotation notes that migration `1197_build_cycle_permissions.sql` renamed `build:sprints:view/manage` to `build:cycles:view/manage` and rewrote all existing grants; OQ11 was simultaneously retired as answered by ticket 68.
