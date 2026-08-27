# 26 — A second cell exists and is proved from cold

**What to build:** A second, independent cell serves real organizations. It has its own database, Redis, worker pools, storage prefix, search index, monitoring and secrets, and it has been built from nothing, backed up, restored, and run with the control plane down — with internal and test organizations placed there first.

**Blocked by:** [20](20-placement-is-a-record.md) · [21](21-placement-survives-a-control-plane-outage.md) · [22](22-a-write-carries-its-placement-version.md) · [23](23-no-query-bypasses-placement.md) · [24](24-an-org-switch-is-revalidated-in-the-target-cell.md) · [25](25-creating-an-org-is-a-resumable-saga.md)

**Status:** ready-for-agent — **needs infrastructure that cannot be provisioned from this repository**

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the region topology already supports more than one binding — `region.module.ts` opens a `postgres` client per non-primary region from `definition.databaseUrl` and `RegionModule.onApplicationBootstrap` refuses to serve traffic without a registry — so the second cell is a configuration and operations task on an existing seam, not new application code. Two environment facts from this repository apply: CI already rebuilds the database from empty, which is the cold-bootstrap primitive; and `streamline_app`'s password must be set in the Neon console rather than with `ALTER ROLE`, because the control plane restores the previous one on suspend.

## Acceptance criteria

- [ ] The second cell has its own database, Redis, worker pools, object-storage prefix, search index, monitoring and secrets — nothing shared with `legacy-1` except the control plane.
- [ ] Cold bootstrap is exercised: the cell is built from an empty database through the migration chain, with no manual step that is not scripted.
- [ ] Backup and restore are exercised on it, and the restore is verified by reading data rather than by the job reporting success.
- [ ] The degraded-control-plane case is exercised against it: placed organizations keep working, unknown ones are refused.
- [ ] Cell isolation is proved — the second cell cannot read `legacy-1`'s database, cache, objects, search index or queues, tested as the application role rather than as the owner.
- [ ] Internal and test organizations are placed there and serve real traffic before any customer is.
- [ ] Broker namespaces, queues, quotas and dead letters are per-cell; only allow-listed control-plane events cross.

## Todo

- [ ] Measure as `streamline_app`, never as the owner. The owner bypasses row-level security and its plans are not the ones production gets.
- [ ] Script the bootstrap as you do it. A cell built by hand is a cell that cannot be built again, which is the whole point of Phase 4.
- [ ] Record what the second cell costs to run before placing anything on it; ticket 32 needs a real number, not an estimate.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
