# 05 — Retention detaches rather than deletes

**What to build:** Old notification and chat data ages out on a stated policy, removed by detaching a partition rather than a long-running delete. Today retention covers two tables and not the three that matter.

**Blocked by:** 04 — Three growing tables are partitioned

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A retention window is stated per table, recorded rather than implied.
- [ ] Ageing out detaches a partition; no bulk delete is issued.
- [ ] The sweep is covered by the job lease so it cannot run twice.
- [ ] Detaching is reported, so data removal is visible.

## Todo

- [ ] Write the policy down first
- [ ] Assert no long-running delete is issued
- [ ] Coordinate with c22-01 for the lease
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
