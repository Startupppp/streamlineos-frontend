# 29 — Placement is automated and a noisy neighbour is relocated

**What to build:** Capacity grows by adding cells rather than by anyone deciding where each organization goes. Placement chooses a cell from region, compliance, capacity and tenant class; an organization consuming disproportionate resource is detected and moved; and a release rolls cell by cell with automatic rollback when a cell's SLOs regress.

**Blocked by:** [27 — A cell has a measured capacity budget and an admission threshold](27-a-cell-has-a-capacity-budget.md) · [28 — An organization moves between cells](28-an-organization-moves-between-cells.md)

**Status:** ready-for-agent — **depends on at least two running cells**

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this is the ticket that turns the previous nine into an operating model, and the PRD constrains it in two directions. Large tenants get *"quotas and workload isolation, not globally larger unbounded queries"* — a noisy neighbour is relocated or throttled, never given a wider query budget. And anomalous tenant cost *"triggers throttling review or placement change, never silent cross-subsidy through unbounded work."* Cell deploys use canary cells and traffic, compatibility checks against the oldest supported schema and event version, and **no all-cell simultaneous release**.

## Acceptance criteria

- [ ] Placement for a new organization is chosen automatically from region, compliance requirement, cell capacity and tenant class, with the decision recorded and explainable.
- [ ] The largest tenants can be given a dedicated shard or a dedicated cell without any domain code change.
- [ ] Noisy-neighbour detection identifies an organization consuming disproportionate resource, and routes to throttling review or relocation rather than to a raised query ceiling.
- [ ] Deploys roll cell by cell, starting from a canary, with compatibility checked against the oldest supported schema and event version.
- [ ] A cell whose SLOs regress during a rollout is rolled back automatically, and the rollback is exercised rather than configured.
- [ ] Platform SLO rollups cannot hide one unhealthy cell — per-cell measurement is the reported unit.

## Todo

- [ ] Automate the decision only after several placements have been made by hand; the manual ones are the specification of the rule.
- [ ] Relocation is expensive — make the throttling review the default response and relocation the escalation, or every busy Monday moves an organization.
- [ ] Prove the automatic rollback fires by regressing a canary deliberately.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
