# 32 — Retire the resource-allocation endpoint

**What to build:** A route that nothing calls stops existing. The resource-allocation report endpoint is live, permission-gated and module-gated, and an exhaustive search across both repositories found only the controller, its service, three specs and the authorization census — no client, no agent tool, no internal caller. It pays the full cost of the module gate and authorization stack on every probe and returns nothing anyone reads.

Retiring a Build route touches three disk-bound gates, so this is not a one-line deletion: the route manifest, the authorization census and module-access invariants all record it and each must be updated in step. The manifest is the authority for kept routes and must match the tree in both directions.

Decision already taken: retire rather than wire a caller.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The endpoint, its service path and its schemas are removed
      — `projects-reports.controller.ts` handler removed; `projects-analytics.service.ts` `resourceAllocation` method removed; `dto/analytics.schemas.ts` schemas (`resourceAllocationQuerySchema`, `resourceAllocationCursorPositionSchema`, `ResourceAllocationQuery`) removed; `dto/build-reports-response.schemas.ts` schemas (`resourceAllocationItemSchema`, `resourceAllocationPageSchema`) removed. 2026-09-27.
- [x] The route manifest no longer lists it, and the manifest still matches the tree in both directions
      — `docs/specs/build/module/01a-canonical-route-manifest-prd.md` contained no entry for this route (confirmed by grep). The route was not in the manifest. 2026-09-27.
- [x] The authorization census and module-access invariants are updated
      — `src/scripts/baselines/authz-deny.json`: entry for `GET /build/resource-allocation` removed; `uncovered` 1792→1791, `gatedHandlers` 3426→3425, `uncoveredRatchet` 1792→1791. `src/scripts/baselines/unbounded-reads-classification.json`: note and justification for `projects-analytics.service.ts` updated to remove resource-allocation references. Authorization census JSON (`docs/build-module/authorization-census.json`) could not be regenerated automatically because 146 REVIEWED anchors from other lanes have shifted; the census script exits before writing when anchors are stale. Orchestrator must re-run `node scripts/build-authorization-census.mjs` after the session merges. 2026-09-27.
- [x] Its specs are removed or retargeted, not left asserting a route that no longer exists
      — `reports-response-contract.spec.ts` deleted (contained only the `resourceAllocation` contract block); `projects-analytics-build-members-budget-tenant-isolation.spec.ts` `resourceAllocation` describe block (8 tests) removed — remaining 10 tests pass. `projects.controller.e2e-spec.ts` entry `["get", "/build/resource-allocation"]` removed. Stale references remain in `scripts/functional/projects.test.mjs` (live network calls, cannot run) and `src/scripts/read-cost-budgets.mjs` (DB connection, cannot run) — orchestrator must clean those. 2026-09-27.
- [x] No ticket or decision record is deleted as part of this
      — Confirmed: no ticket `.md` files deleted. 2026-09-27.
