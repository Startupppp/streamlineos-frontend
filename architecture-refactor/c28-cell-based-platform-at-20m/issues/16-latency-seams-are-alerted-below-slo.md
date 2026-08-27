# 16 — Every latency seam is instrumented and alerted below its SLO budget

**What to build:** When a seam starts costing more than its budget, a person finds out before a customer does. Each seam in a request — pool acquisition, query execution, cache round trip, route total — has a measured budget derived from the PRD's objectives, an alert set below it, an owner, a runbook, and a scheduled test event that proves the alert reaches someone.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the current slow-acquire threshold is 250 ms, which is above several of the PRD's own budgets and so cannot warn about them. The PRD's targets: p95 same-region Redis ≤ 2 ms including network; p95 simple tenant Postgres round trip ≤ 20 ms including pool wait, network, GUC setup and execution, bounded complex read ≤ 50 ms; p95 transactional write ≤ 500 ms excluding declared async work; p99 in-process hot authorization decision ≤ 100 µs CPU with no I/O. Delivery machinery already exists — `LogSpanExporter` wired at `main.ts:69` carries four alerts today — so this is extending a working channel, not building one.

## Acceptance criteria

- [ ] Pool wait, query execution, GUC setup, cache round trip and route total are each measured separately; one aggregate number cannot tell a slow query from a starved pool.
- [ ] Each alert threshold sits below its PRD budget, with the gap chosen deliberately and written down.
- [ ] Every alert has an owner, a runbook, a paging destination and deduplication — the PRD's own bar, and the one that separates an alert from a log line.
- [ ] A scheduled test event proves each destination receives it. An alert nobody has ever received is a hypothesis.
- [ ] The alert predicate matches what the code actually emits, verified against a real emission rather than a hand-written fixture — a previous alert in this program grepped for a string no log line contained.
- [ ] Organization and user ids are not used as metric labels; the PRD prohibits unbounded label cardinality, and correlation belongs in traces.

## Todo

- [ ] Measure the current p95 at each seam before choosing a threshold; an alert set from the PRD alone will either page constantly or never.
- [ ] The in-process authorization budget is CPU time without I/O — the route budget still has to account for event-loop delay separately, or the number is unfalsifiable.
- [ ] Test each alert against a defect you already know reproduces. Every CI check in this program under-reported on its first run.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
