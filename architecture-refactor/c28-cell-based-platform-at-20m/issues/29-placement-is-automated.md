# 29 — Placement is automated and a noisy neighbour is relocated

**What to build:** Capacity grows by adding cells rather than by anyone deciding where each organization goes. Placement chooses a cell from region, compliance, capacity and tenant class; an organization consuming disproportionate resource is detected and moved; and a release rolls cell by cell with automatic rollback when a cell's SLOs regress.

**Blocked by:** [27 — A cell has a measured capacity budget and an admission threshold](27-a-cell-has-a-capacity-budget.md) · [28 — An organization moves between cells](28-an-organization-moves-between-cells.md)

**Status:** partially done — placement is automated and live; the deploy and relocation halves are written but have never rolled or moved anything

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this is the ticket that turns the previous nine into an operating model, and the PRD constrains it in two directions. Large tenants get *"quotas and workload isolation, not globally larger unbounded queries"* — a noisy neighbour is relocated or throttled, never given a wider query budget. And anomalous tenant cost *"triggers throttling review or placement change, never silent cross-subsidy through unbounded work."* Cell deploys use canary cells and traffic, compatibility checks against the oldest supported schema and event version, and **no all-cell simultaneous release**.

**Verification for the pure logic:** `node ./node_modules/jest/bin/jest.js src/common/placement src/common/region/cell-admission` — **6 suites, 76 tests, all pass**.

## Acceptance criteria

- [x] Placement for a new organization is chosen automatically from region, compliance requirement, cell capacity and tenant class, with the decision recorded and explainable.

  **This is wired, not inert.** All three organization-creation paths — `org-profile.service.ts` (the saga), `org-setup.service.ts` and `auth.service.ts` — previously called `regionForNewOrg()`, which returned `topology.primary` unconditionally. That function is now deleted and each path calls `chooseRegionForNewOrg`, which reads the latest `cell_capacity_measurements` row per cell, runs `selectCell` over region, compliance zone, tenant class and capacity, and writes an explainable row into `placement_decisions`.

  Proved end to end against the live database, not against a mock:

  ```
  $ pnpm -C backend cell:admission
  PASS  a decision row is written for every placement attempt    admitted=true cell=legacy-1
  PASS  the decision is explainable                              rejections=[]
  PASS  an admitted placement names the cell it chose            region=primary cell=legacy-1
  RESULT: ADMISSION IS LIVE checks=3 failed=0
  ```

  The selection logic itself:

  ```
  √ admits a matching cell and returns its id
  √ prefers the cell with the lowest utilisation ratio
  √ rejects cells in the wrong region
  √ rejects cells missing a required compliance zone
  √ rejects cells that are full
  √ carries rejected cells in the result alongside an admitted cell
  √ returns not admitted when all cells are rejected
  √ records why each cell it passed over was rejected, so the decision is explainable
  ```

  One deliberate safety property: a cell with **no** recent capacity measurement is not a candidate — admitting to an unmeasured cell would be the guess this seam exists to prevent. When no cell has been measured the primary is used and the decision is recorded as `unmeasured-fallback` with the reason, rather than silently absorbed.

- [x] The largest tenants can be given a dedicated shard or a dedicated cell without any domain code change.

  `acceptedTenantClasses` and `complianceZones` became **region configuration** in this session (`REGION_<KEY>_TENANT_CLASSES`, `REGION_<KEY>_COMPLIANCE_ZONES`), so pinning a tenant to its own cell is an environment change plus a `dedicatedCellId` on the placement request. No domain code participates.

  ```
  √ rejects a SHARED cell for a DEDICATED tenant
  √ a DEDICATED tenant with a pin never lands on a SHARED cell
  √ rejects a dedicated cell that does not match the pin
  √ never places a dedicated tenant on a shared cell
  ```

- [x] Noisy-neighbour detection identifies an organization consuming disproportionate resource, and routes to throttling review or relocation rather than to a raised query ceiling.

  The verdict union has exactly two variants, `THROTTLING_REVIEW` and `RELOCATION`. There is no third, so a widened query budget is not merely discouraged — it is unrepresentable. Throttling review is the default and relocation the escalation, gated on sustained consumption rather than a single spike, so a busy Monday does not move an organization.

  ```
  √ identifies the organization consuming the largest share
  √ reports the share ratio of the flagged organization
  √ returns THROTTLING_REVIEW for a single spike (first occurrence)
  √ does NOT escalate to RELOCATION for a single spike
  √ returns THROTTLING_REVIEW when prior windows are below the escalation threshold
  √ escalates to RELOCATION when sustained over the required number of consecutive windows
  √ returns not detected when no org exceeds the disproportionate share threshold
  ```

  Reviews are recorded in `noisy_neighbour_reviews` (migration `0617`) with the share ratio, the consecutive-window count and the action.

- [x] Deploys roll cell by cell, starting from a canary, with compatibility checked against the oldest supported schema and event version.

  `nextRolloutAction` returns exactly one action — one `DEPLOY`, one `ROLLBACK`, or `COMPLETE` — driven by a single cursor rather than a set, so an all-cell simultaneous release is structurally impossible rather than discouraged.

  ```
  √ starts with the canary cell when nothing is deployed
  √ does not proceed before canary SLO passes
  √ proceeds to cell-2 after canary passes SLO
  √ proceeds to cell-3 after cell-2 passes SLO
  √ completes when all cells pass SLO
  √ passes when the release can serve all running schema and event versions
  √ passes when running versions match the release minimums exactly
  √ refuses when the oldest schema version is below the release minimum
  √ refuses when the oldest event version is below the release minimum
  ```

- [ ] A cell whose SLOs regress during a rollout is rolled back automatically, and the rollback is exercised rather than configured.

  **Open.** The decision function is written and its rollback is deliberately provoked in test — `√ deliberately regresses a canary and confirms rollback fires`, `√ rolls back the canary when SLO regresses — the canary, not the next cell`, `√ rolls back cell-2 if it regresses, not cell-3 or beyond`, `√ includes cells that were deployed in the rollback list`, `√ excludes cells that were not yet deployed` — but **nothing has ever been deployed**. There is one application process, no per-cell deployment and no per-cell SLO feed, so the rollout has never run and the rollback has never fired against a real cell.

  **What would close it:** a deployment per cell, a per-cell SLO feed, and a deliberately regressed canary. Ticket 26 reports both worker pools and monitoring as `UNPROVED` for the same reason, and the lane dispatched this session to close those two rows died on the account's weekly API limit. The SLO feed would have come from ticket 30's load driver, which was not built either — so this criterion is now blocked on two things that were both attempted and neither delivered.

- [x] Platform SLO rollups cannot hide one unhealthy cell — per-cell measurement is the reported unit.

  The rollup takes a non-empty tuple (an empty call is a type error), reports the per-cell breakdown alongside any aggregate, and always names a `worstCell`. Health is `every`, not an average, and that is pinned by the case the criterion describes:

  ```
  √ nine healthy cells plus one breaching cell reports as breaching, not as a healthy average
  √ reports unhealthy when any cell breaches a threshold
  √ always includes a worstCell in the rollup
  √ sets worstCell to the unhealthy cell when one exists among healthy cells
  √ includes per-cell status for every cell in the breakdown
  √ keeps per-cell measurement in the status for auditability
  ```

  The shape is correct and tested; it has no live feed, because per-cell monitoring does not exist yet.

## Todo

- [x] Automate the decision only after several placements have been made by hand; the manual ones are the specification of the rule.

  `place-cell-org.mjs` is the by-hand form and was used to place both organizations in `cell-2`; the rule it specifies — region, then tenant class, then compliance, then capacity, lowest utilisation first — is what `selectCell` implements.

- [x] Relocation is expensive — make the throttling review the default response and relocation the escalation, or every busy Monday moves an organization.
- [ ] Prove the automatic rollback fires by regressing a canary deliberately.

  Done in test, not in a rollout. See the open criterion above.

- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
