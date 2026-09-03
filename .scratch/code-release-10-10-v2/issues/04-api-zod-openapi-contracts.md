# 04: API, Zod and OpenAPI contracts

**What to build:** Users and integrations receive one validated, versioned API contract whose backend, frontend, and OpenAPI representations agree.

**Blocked by:** 02 — Schema and executable-key minimization

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C047** — Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [ ] **PRD-C048** — Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [ ] **PRD-C049** — Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [ ] **PRD-C085** — Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- [ ] **PRD-C086** — Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- [ ] **PRD-C087** — Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- [ ] **PRD-C088** — Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- [ ] **PRD-C089** — Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
- [ ] **PRD-C090** — Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
- [ ] **PRD-C091** — Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
- [ ] **PRD-C092** — Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
- [ ] **PRD-C093** — Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
- [ ] **PRD-C094** — Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
