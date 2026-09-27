# 41 — One module answers "which projects can this actor reach", and the sharpest caller uses it

**What to build:** Project reachability has one definition. It is the most load-bearing predicate in Build and it exists in eight independent implementations across six files in one folder, and they do not check the same branches — organisation owner, active membership, project manager and team assignment each go missing somewhere. The module needs exactly two shapes: *can this actor reach this project* (assert or resolve — this already exists and has 48 satisfied callers) and *which of these projects can this actor reach* (set-returning, for list filters and membership arms). One branch cascade, one active-membership rule.

The tracer bullet is the sharpest copy: the board's own access helper takes an optional membership identifier and gates its manager branch on that identifier being present, and four of its six call sites do not pass it — so in the create, transfer and import paths the manager branch is dead code, and the update path compensates by re-adding the owner check by hand. It is shallow in the harmful sense: four positional arguments, one optional-but-actually-mandatory, plus an unstated "add the owner branch yourself" is more to learn than its body.

It also collapses "no such project" and "no access" into one false, so no caller can distinguish them — which is why five sites deny with 404 and one with 403. The module must distinguish them at its interface: a cross-tenant miss is 404 per BE-91, an in-tenant denial is 403 per BE-22.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Keep list reachability composable in tenant-scoped SQL rather than materializing unbounded project-ID arrays; test owner, manager, direct/team member, inactive member and cross-tenant equivalence for both single-project and list paths

- [ ] The module exposes the assert/resolve shape and the set-returning shape, and no third shape
- [ ] Its interface distinguishes not-found from denied, and each caller chooses deliberately
- [ ] A spec covers the branch matrix as a table: owner, active member, inactive member, manager-not-member, team-only, no relationship
- [ ] The board's access helper is expressed through the module, with no optional argument that changes which branches run
- [ ] The hand-added owner check in the update path is gone because the module supplies it
- [ ] Allow and deny outcomes for the six actor kinds are unchanged where they were already correct
