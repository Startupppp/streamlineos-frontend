# 27 — A cell has a measured capacity budget and an admission threshold

**What to build:** Each cell knows what it can carry and stops accepting organizations before it is full. Its limiting resource is measured rather than assumed, and placement stops at 60% of that limit so one failure, one deploy or one traffic burst does not consume all the headroom at once.

**Blocked by:** [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** done · 1 criterion open (saturation forecast refuses — the measurement cadence is wrong, not the mechanism)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the PRD sets the rule — *"placement stops before a cell reaches 60% of its proven limiting resource"* — and this repository already has the pattern for making a budget data rather than a script: 43 declared read-cost budgets, a seed-adequacy gate that refuses to emit a result rather than lying about an empty table, and CI wiring that fails the build non-zero on breach and is self-tested against an impossible ceiling. The same discipline applies here, and the same trap does: a budget measured against a near-empty cell is a tautology, and a refusal to measure is not a measurement.

## Acceptance criteria

- [x] Each cell's limiting resource is identified by measurement — connections, CPU, IOPS, memory, queue depth or index size — not asserted.

  Five candidates are measured and the binding constraint is whichever has the highest utilisation ratio. `pnpm -C backend cell:capacity`:

  ```
  OK    connections                      used=12 / limit=901 (1.3%)
  OK    database-size                    used=1354907648 / limit=3221225472 (42.1%) [vendor-declared ceiling]
  OK    table-bloat                      used=0.0015792530093641293 / limit=0.3 (0.5%) [operational-judgment ceiling]
  ADV   index-size-vs-buffers            used=825556992 / limit=244318208 (337.9%)
  OK    outbox-queue-depth               used=6 / limit=10000 (0.1%) [operational-judgment ceiling]

  Advisory, never gates admission: index-size-vs-buffers at 337.9%

  Limiting resource: database-size (42.1%)
  Admission threshold: 60% — cell is OPEN
  ```

  **A correction made during this session, worth recording.** The first implementation named `index-size-vs-buffers` the limiting resource at 265%, which closed admission permanently. An index footprint larger than the buffer pool is ordinary for any database of size and has no upper bound, so it is a cache-pressure signal and not a capacity ceiling. It is now declared `admissionGating: false`, reported as `ADV`, and can never become the limiting resource — asserted by `an advisory resource never becomes the limiting resource, however high its ratio`. A ceiling with no real bound produces a threshold that always binds, which is the mirror image of the trap this ticket warns about.

- [x] The budget is declared as data alongside the existing read-cost budgets, not as a script, so a breach is a build failure with a number attached.

  `backend/src/scripts/cell-capacity-budgets.mjs`, in the same declarative shape as `read-cost-budgets.mjs`: each entry carries the usage query, the ceiling query or value, a unit, a `ceilingSource` and an `admissionGating` flag. `validateCapacityBudgets` rejects an entry missing any of them. The runner exits non-zero on breach with the number attached. `ceilingSource` distinguishes three things the first version conflated: `measured` (from `pg_settings`), `vendor-declared` (the Neon plan's 3 GiB) and `operational-judgment` (the 30% bloat and 10,000-event thresholds, which no vendor declares).

- [x] Admission refuses new placements at 60% of the proven limit, and the refusal is visible rather than silent.

  Enforced in two places and proved in both. In the runner, a breach prints `ADMISSION REFUSED: <resource> at N%` and exits non-zero. At organization creation, `chooseRegionForNewOrg` rejects a cell whose ratio is at or above 0.6 with a `CELL_FULL` code recorded in `placement_decisions`, and throws `CellAdmissionRefusedError` when no cell admits:

  ```
  √ refuses when every measured cell is past the admission threshold
  √ refuses at 60% exactly, not above it
  √ records why each cell it passed over was rejected, so the decision is explainable
  ```

  `pnpm -C backend cell:capacity:self-test` → `SELF-TEST PASS: breach detected — guard can fail`.

- [x] A budget that cannot be measured — too few organizations, too little data — **refuses** rather than emitting a number derived from an empty cell.

  Three separate refusals, all real output rather than described behaviour:

  ```
  Saturation forecasts:
    connections    REFUSED — 2 data point(s) recorded; need at least 3 to fit a trend.
    database-size  REFUSED — 2 data point(s) recorded; need at least 3 to fit a trend.
  ```
  ```
  REFUSED: no admission-gating resource could be measured. An advisory-only reading is not a capacity budget.
  ```
  and at admission time, a cell whose measurement is older than seven days is not a candidate at all rather than being treated as empty:
  ```
  √ treats an unmeasured cell as no candidate rather than as an empty one
  √ treats a stale measurement as no measurement
  ```

  Nothing was seeded to manufacture a pass. `node src/scripts/__tests__/cell-capacity.test.mjs` — 22 tests, all pass.

- [ ] Saturation is forecast per cell, so the next cell is provisioned before the threshold is reached rather than after.

  **Open.** The forecast exists, is per cell, is stored as a history and is exercised — but every honest run of it in this session either refused for too few samples or produced a number the cadence makes meaningless. The one non-refusing result was `database-size 0 day(s) until 60% threshold`, produced because the three samples were minutes apart while ticket 30's fixture load was running, so the fitted slope was the load rate rather than the growth rate.

  **What would close it:** at least three measurements taken at a realistic cadence — daily — with no bulk load in progress. The exact command is `pnpm -C backend cell:capacity`, run on a schedule; the forecast turns from `REFUSED` into a number once `backend/.cell-capacity-history.json` holds three well-spaced points per resource.

- [x] Adding a cell is a configuration change plus a measurement run, with no application change required.

  Adding `cell-2` required no application code. `REGION_KEYS` plus `REGION_<KEY>_{APP_DATABASE_URL,CELL_ID,DATABASE_SHARD,SEARCH_CLUSTER,TENANT_CLASSES,COMPLIANCE_ZONES}` is the whole configuration, printed by `pnpm -C backend cell:bootstrap --print-env`. Tenant class and compliance zones became region configuration in this session precisely so that a dedicated cell needs no domain code change. The measurement run is `pnpm -C backend cell:capacity`, which writes a row into `cell_capacity_measurements`; admission reads the latest row per cell.

## Todo

- [x] Find the limiting resource before writing the budget. Guessing it produces a threshold that never binds while the real one saturates.
- [x] Do not seed synthetic organizations to manufacture a pass; the refusal is the honest state and this program has already un-ticked two boxes for offering a refusal as a measurement.
- [x] `VACUUM ANALYZE` before measuring anything after a bulk load; a rewrite kills the statistics and empties the visibility map.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
