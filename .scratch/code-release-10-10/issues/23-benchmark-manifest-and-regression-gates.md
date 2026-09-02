# 23 — Publish the benchmark manifest and add performance-regression gates

**What to build:** A per-module benchmark manifest and automated regression gates for declared critical paths, so a latency, query-count, buffer, payload or memory regression fails rather than being noticed later.

**Blocked by:** 22.

**Status:** ready-for-agent

- [ ] The manifest records, per module: dataset size, concurrency, warm/cold state, machine and container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
- [ ] Ordinary authenticated reads and mutations meet their p95 ceiling and approved complex aggregates meet theirs, excluding provider time.
- [ ] Ordinary database statements meet their p95 ceiling on the production-shaped seed; plans are retained for every approved exception.
- [ ] Cache-hit paths meet their ceiling while preserving authorization correctness; a miss or a cache outage degrades safely without a request storm.
- [ ] Home loads sections concurrently and independently, renders available sections without waiting for the slowest, and never starts an unbounded fanout.
- [ ] Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet budget without table scans, N+1 or per-item calls.
- [ ] Connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure rather than exhausting memory, sockets or connections.
- [ ] Regression gates fail on statistically meaningful movement, not on noise.
