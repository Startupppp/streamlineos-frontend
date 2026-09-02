# 21 — Implement the efficient database-call contract across critical routes and workers

**What to build:** The §5.1 contract: bounded call counts, correct transaction scope, batched lookups, indexed existence probes, opt-in totals, bulk writes, atomic counters, timeouts and measured connection behaviour.

**Blocked by:** 20.

**Status:** ready-for-agent

- [ ] Tenant-owned request work runs inside the minimum correct tenant transaction, reusing one handle. No nested or per-row transactions; no borrowing a committed request transaction.
- [ ] Relationship, permission, unread, attachment, assignee and metadata lookups are batched with joins, CTEs or bounded multi-key queries. No database or cache call inside a growing loop.
- [ ] Existence and authorization probes use tenant-correlated indexed predicates with `LIMIT 1` — never a fetch or a count when only existence is needed.
- [ ] Exact totals are opt-in and independently budgeted; a cursor page does not run a `COUNT(*)` on every request.
- [ ] Bulk insert/update/upsert is used instead of one write per row, with conflict-safe unique keys and batches under documented lock and payload limits.
- [ ] Counters, unread state, seats, balances, ordering and idempotency use atomic SQL, upsert or locking semantics with no read-then-write race.
- [ ] Statement timeouts and cancellation propagation apply to interactive work; reports, exports, reindexing and wide aggregates move to resumable jobs.
- [ ] Connections are released before external provider calls and long CPU work; acquisition, transaction duration and idle-in-transaction behaviour are measured.
- [ ] Slow-query fingerprints, call counts, rows read/returned, buffers and lock waits are captured without logging sensitive bind values.
