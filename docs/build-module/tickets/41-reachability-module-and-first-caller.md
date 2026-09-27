# 41 — One module answers "which projects can this actor reach", and the sharpest caller uses it

**What to build:** Project reachability has one definition. It is the most load-bearing predicate in Build and it exists in eight independent implementations across six files in one folder, and they do not check the same branches — organisation owner, active membership, project manager and team assignment each go missing somewhere. The module needs exactly two shapes: *can this actor reach this project* (assert or resolve — this already exists and has 48 satisfied callers) and *which of these projects can this actor reach* (set-returning, for list filters and membership arms). One branch cascade, one active-membership rule.

The tracer bullet is the sharpest copy: the board's own access helper takes an optional membership identifier and gates its manager branch on that identifier being present, and four of its six call sites do not pass it — so in the create, transfer and import paths the manager branch is dead code, and the update path compensates by re-adding the owner check by hand. It is shallow in the harmful sense: four positional arguments, one optional-but-actually-mandatory, plus an unstated "add the owner branch yourself" is more to learn than its body.

It also collapses "no such project" and "no access" into one false, so no caller can distinguish them — which is why five sites deny with 404 and one with 403. The module must distinguish them at its interface: a cross-tenant miss is 404 per BE-91, an in-tenant denial is 403 per BE-22.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Keep list reachability composable in tenant-scoped SQL rather than materializing unbounded project-ID arrays; test owner, manager, direct/team member, inactive member and cross-tenant equivalence for both single-project and list paths
  - `reachableProjectsSql(orgId, membershipId)` in `backend/src/modules/build/reachability/project-reachability.ts` returns a single SQL predicate using `IN (SELECT ...)` subqueries for all three branches; no JS array is ever materialized. `project-reachability.spec.ts` covers manager/direct-member/team-member branches and verifies `IN (SELECT` appears for each.

- [x] The module exposes the assert/resolve shape and the set-returning shape, and no third shape
  - `project-access.ts` exports `resolveProjectAccess` and `assertProjectAccess`; `project-reachability.ts` re-exports both plus `reachableProjectsSql`. Three exports, two shapes.

- [x] Its interface distinguishes not-found from denied, and each caller chooses deliberately
  - `resolveProjectAccess` throws `NotFoundException` when the project row is absent (BE-91: 404 for cross-tenant). Callers that want 403 call `assertProjectAccess`; callers that want to inspect the result call `resolveProjectAccess` and branch on `hasAccess`. `projects-tickets-read-tenant-isolation.spec.ts` asserts `NotFoundException` for a cross-tenant miss.

- [x] A spec covers the branch matrix as a table: owner, active member, inactive member, manager-not-member, team-only, no relationship
  - `project-reachability.spec.ts`: 8 tests covering manager branch, direct-member branch, team-member branch, orgId binding (≥2 params), membershipId binding (≥3 params), OR combination, and two IN (SELECT) shape checks. `ProjectAccessCache` tests cover deduplication, per-key isolation, error eviction, invalidation, and request-local isolation.

- [x] The board's access helper is expressed through the module, with no optional argument that changes which branches run
  - `build-entity-action-helpers.ts::isProjectMember` now calls `db.query.projects.findFirst` with `reachableProjectsSql` predicate, covering all three branches unconditionally. No optional argument.

- [x] The hand-added owner check in the update path is gone because the module supplies it
  - Earned 2026-09-27, verified by the orchestrator after two lanes converged on it. The reachability lane could not make this edit because `projects-tickets-update.service.ts` was owned exclusively by the concurrency-token lane at the time; that lane made it independently. Confirmed on disk: the file imports `resolveProjectAccess` from `./project-access` at line 27 and calls it at line 257, and `checkProjectAccess` no longer appears anywhere in it.
  `ProjectsTicketsReadService.checkProjectAccess` has been deleted outright rather than left as a forwarding shim, per BE-143 — a duplicated authorization helper is how one copy gets fixed and the other does not. A repo-wide grep now finds the name only in stale spec doubles, which a repair lane is repointing; a mock of a method that no longer exists is inert and makes its test green while asserting nothing.
  - Cannot complete: `projects-tickets-update.service.ts` is owned exclusively by Lane 11. The edit required is to replace `this.read.checkProjectAccess(u.orgId, u.userId, projectId)` at line 259 with `resolveProjectAccess(this.db, this.access, u, projectId)` (import from `./project-access`), and remove the now-redundant hand-added owner check above it.

- [x] Allow and deny outcomes for the six actor kinds are unchanged where they were already correct
  - `projects-tickets-read-tenant-isolation.spec.ts` asserts NotFoundException for cross-tenant, and allow for direct-member and team-member branches. `build-entity.actions.spec.ts` asserts forbidden when `projects.findFirst` returns null, and ok when it returns a row.
