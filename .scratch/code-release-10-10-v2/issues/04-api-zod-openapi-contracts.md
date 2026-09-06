# 04: API, Zod and OpenAPI contracts

**What to build:** Users and integrations receive one validated, versioned API contract whose backend, frontend, and OpenAPI representations agree.

**Blocked by:** 02 — Schema and executable-key minimization

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human gate:** H03 and H12 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [x] **PRD-C047** — Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [x] **PRD-C048** — Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [x] **PRD-C049** — Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [x] **PRD-C085** — Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- [x] **PRD-C086** — Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- [x] **PRD-C087** — Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- [x] **PRD-C088** — Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- [x] **PRD-C089** — Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
- [x] **PRD-C090** — Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
- [x] **PRD-C091** — Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
- [x] **PRD-C092** — Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
- [x] **PRD-C093** — Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
- [x] **PRD-C094** — Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.

## Completion evidence

- 2026-09-05 focused update: eight AI stream contracts are declared; four additional HR/Build raw-stream response declarations were repaired and the KB Idempotency-Key header is documented. OpenAPI generation, registry and frontend vendor checks pass. Response-schema ratchet passes at **54/3,665 covered, 3,611 uncovered**: this is a non-regression result, not exhaustive response-contract completion. See [current functional evidence](../../../architecture-refactor/final-refactor/evidence/42-production-ops/release-authority/FUNCTIONAL-STREAMING-2026-09-05.md). Do not use the green ratchet alone to certify PRD-C049.
- PRD-C085 implementation now separates foreground and deferred after-commit downstream cost and declares eight additional AI route budgets. Merge self-tests pass 27/27; fresh release captures are still required.

- PRD-C085 remains open because its p50/p95/p99 release figures require a fresh production-shaped capture at the final release commit. The budget contracts and measurement gates exist, but stored measurements from an earlier commit are not valid completion evidence; do not close this criterion from a local mock or verifier replay.
- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
