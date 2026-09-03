# 18: Shared database, query and cache contracts

**What to build:** Every growing read is bounded and indexed, every cache is tenant/permission scoped, and invalidation remains correct without request storms.

**Blocked by:** 05–17 — all domain slices

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C065** — Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
- [ ] **PRD-C066** — Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
- [ ] **PRD-C067** — Verify cache keys include tenant, subject, permission and resource dimensions where applicable.
- [ ] **PRD-C068** — Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked access.
- [ ] **PRD-C069** — Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls.
- [ ] **PRD-C070** — Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or borrow a committed request transaction.
- [ ] **PRD-C071** — Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for list/count/existence paths.
- [ ] **PRD-C072** — Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid database/cache calls inside growing loops.
- [ ] **PRD-C073** — Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence is required.
- [ ] **PRD-C074** — Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request.
- [ ] **PRD-C075** — Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below documented lock/payload limits.
- [ ] **PRD-C076** — Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write races.
- [ ] **PRD-C077** — Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable jobs.
- [ ] **PRD-C078** — Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long CPU work.
- [ ] **PRD-C079** — Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates.
- [ ] **PRD-C080** — Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
