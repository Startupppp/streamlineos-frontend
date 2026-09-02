# S03 — API, query, pagination, caching and contracts

Status: active

Independent scope: backend common pagination/query/cache/transport/OpenAPI primitives and gates plus cross-layer contract manifests/scanners. Frontend shared API/Query implementation belongs to S11, and domain-specific callers remain owned by their domain session.

Master coverage: sections 3, 5, 5.1, 7, 7.1 and 8; cross-cutting evidence is scoped to shared primitives and aggregated later.

## Acceptance criteria

- [ ] Enforce explicit projections, bounded stable signed cursors, filter/sort contracts, bulk limits, atomic counters and no fetch-then-filter, N+1, per-row transaction or unbounded workflow patterns.
- [ ] Provide application-role production-shaped read-cost seeds, database-call budgets, cancellation/timeouts, EXPLAIN evidence and regression gates without relying on CRM/Inventory data.
- [ ] Verify tenant/subject/permission/resource cache dimensions, precise invalidation, negative-cache/TTL policy, stampede protection and safe Redis degradation.
- [ ] Reconcile Zod, OpenAPI and frontend contracts; classify published versus internal APIs fail closed and preserve only published contracts through versioned deprecation.
- [ ] Enforce one canonical operation, consistent DTO/error/pagination envelopes, idempotency/optimistic concurrency, compression eligibility and streaming/async jobs for growing payloads.
- [ ] Make cross-layer contract scanners detect query-key, cancellation, authorized-command and cache-shape drift; S11 owns the frontend primitives and domain sessions own caller repairs.
- [ ] Run targeted scanners, self-tests and focused primitive tests; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S03 is complete; commit/evidence: _pending_.
