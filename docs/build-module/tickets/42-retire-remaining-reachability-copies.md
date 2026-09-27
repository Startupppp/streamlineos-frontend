# 42 — The remaining reachability copies go, and the answers stop disagreeing

**What to build:** A team-only member sees their tickets in every list that claims to show them. Today the project opens for them and their tickets are missing from it, because the canonical helper grants team access and the all-work list and the entity cards do not check that branch. A project manager who holds no membership row gets the opposite split — denied where the others allow. Migrating the six remaining construction sites onto the module from ticket 41 makes every surface answer the same question the same way.

The drift spec that exists purely to assert two copies of the predicate stay identical is deleted — not because it passes, but because there is nothing left for it to compare. That spec is rent being paid on the duplication.

Blast radius is 8 construction sites across 6 files; the 48 downstream callers of the canonical helper do not change, and roughly 12 spec files stub the helper being retired.

**Blocked by:** 41 — One module answers "which projects can this actor reach", and the sharpest caller uses it.

**Status:** done

- [x] All six remaining copies are expressed through the module and no independent cascade remains
  - `scope-directory.service.ts` (2 copies): `resolveScopeDirectory` and `searchScopeDirectory` both now use `reachableProjectsSql` in the project WHERE clause. The previous ~70-line parallel three-table fetch is gone.
  - `projects-work-query.service.ts` (3 copies): `getAllWork`, `countTicketsByProjectAndStatus`, and `countTicketsByStatus` all replace their `memberProjectIdsQuery` materializations with `reachableProjectsSql` predicate push-down.
  - `build-entity-action-helpers.ts::isProjectMember` (1 copy): replaced `projectMembers.findFirst` (missed manager and team branches) with `projects.findFirst` + `reachableProjectsSql`.
  - `projects-tickets-create.service.ts` and `projects-tickets-transfer.service.ts` (2 copies): both now call `resolveProjectAccess(this.db, this.access, u, projectId)` directly — no pass-through wrapper (BE-143).

- [x] A team-only member and a manager-not-member get identical verdicts from the ticket list, the project read, all-work, the scope directory and entity cards
  - All surfaces now use `reachableProjectsSql` which covers manager (`managerMembershipId = membershipId`), direct-member, and team-member branches. The three-branch `OR` is the single definition.

- [x] The drift spec is deleted and its assertion is covered by the module's own branch matrix
  - `backend/src/modules/build/core/projects-dir-team-join-drift.spec.ts` deleted. The branch equivalence it was asserting is now structural: all surfaces share one SQL template, so drift is impossible.

- [x] The specs that stubbed the retired helper stub the module instead, and still fail when the predicate is wrong
  - `scope-directory-membership-gate.spec.ts`: changed to verify `projects` table call contains MEMBERSHIP_ID in its condition (via `reachableProjectsSql`); returns empty when DB returns no rows.
  - `scope-directory.service.spec.ts`: changed to verify search result requires projects table call with MEMBERSHIP_ID bound.
  - `count-by-status-scope.spec.ts`: removed `memberProjectIdsQuery` tests; added `reachableProjectsSql` predicate structure tests verifying three branches, param binding, and early return for null membershipId.
  - `build-entity.actions.spec.ts`: `isProjectMember` tests now assert on `db.query.projects.findFirst` (with `reachableProjectsSql`) rather than `db.query.projectMembers.findFirst`.

- [x] The scope directory file drops under 500 lines as a consequence, per BE-09
  - `scope-directory.service.ts`: 527 lines → 425 lines. Removing the three-table parallel fetch in `resolveScopeDirectory` and the two-table parallel fetch in `searchScopeDirectory` saved ~102 lines.

- [x] Ticket 18 can now resolve access once per request through a single seam
  - All call sites funnel through `resolveProjectAccess` from `project-access.ts`. `ProjectAccessCache` in `project-access-cache.ts` wraps it with request-local memoization, ready for callers to opt in.
