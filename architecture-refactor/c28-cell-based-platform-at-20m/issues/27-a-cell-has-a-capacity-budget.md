# 27 — A cell has a measured capacity budget and an admission threshold

**What to build:** Each cell knows what it can carry and stops accepting organizations before it is full. Its limiting resource is measured rather than assumed, and placement stops at 60% of that limit so one failure, one deploy or one traffic burst does not consume all the headroom at once.

**Blocked by:** [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** ready-for-agent — **depends on a running second cell**

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the PRD sets the rule — *"placement stops before a cell reaches 60% of its proven limiting resource"* — and this repository already has the pattern for making a budget data rather than a script: 43 declared read-cost budgets, a seed-adequacy gate that refuses to emit a result rather than lying about an empty table, and CI wiring that fails the build non-zero on breach and is self-tested against an impossible ceiling. The same discipline applies here, and the same trap does: a budget measured against a near-empty cell is a tautology, and a refusal to measure is not a measurement.

## Acceptance criteria

- [ ] Each cell's limiting resource is identified by measurement — connections, CPU, IOPS, memory, queue depth or index size — not asserted.
- [ ] The budget is declared as data alongside the existing read-cost budgets, not as a script, so a breach is a build failure with a number attached.
- [ ] Admission refuses new placements at 60% of the proven limit, and the refusal is visible rather than silent.
- [ ] A budget that cannot be measured — too few organizations, too little data — **refuses** rather than emitting a number derived from an empty cell.
- [ ] Saturation is forecast per cell, so the next cell is provisioned before the threshold is reached rather than after.
- [ ] Adding a cell is a configuration change plus a measurement run, with no application change required.

## Todo

- [ ] Find the limiting resource before writing the budget. Guessing it produces a threshold that never binds while the real one saturates.
- [ ] Do not seed synthetic organizations to manufacture a pass; the refusal is the honest state and this program has already un-ticked two boxes for offering a refusal as a measurement.
- [ ] `VACUUM ANALYZE` before measuring anything after a bulk load; a rewrite kills the statistics and empties the visibility map.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
