# Functional streaming implementation verification — 2026-09-05

Scope: Executive Brief, Payroll explanations, five Timesheets AI actions, authenticated KB answers, shared AI transport and request-cost instrumentation. CRM, Inventory and landing-page visuals were not changed by this work.

Verified source: frontend/root `1960cf991496e6453369172ca16bcf37a921038e`, backend `32360d354` (both working trees clean when verification began). This is focused implementation evidence, not a signed whole-product release.

Final contract repair: backend `f74780c58`; backend source typecheck was rerun successfully after this repair. Frontend differences after its source typecheck are vendored OpenAPI and documentation only.

## Implemented

- Executive Brief streams visible text, persists only completed snapshots, preserves citations/usage, and supports cancellation.
- Payroll and five Timesheets actions have additive streaming APIs and frontend consumers. Authorization and evidence reads precede provider dispatch; bounded read transactions do not span provider streaming. Existing buffered APIs remain compatible.
- Shared NDJSON transport validates terminal results and preserves metadata. The client rejects malformed, oversized, missing, duplicate or trailing terminal frames. Failed partial streams are not successful answers.
- Shared raw-text transport uses backpressure, cancels readers, disables transformation buffering and tears down failed sockets. The SDK stream getter is read once, avoiding an extra unconsumed branch.
- KB completion persists conversation history and the replay result atomically. A durable pre-dispatch command fence prevents concurrent or interrupted same-key attempts from dispatching another paid request. Completed replay rechecks ownership and citation access. Explicit regeneration uses a new key; transport retries do not.
- Explicit fast/standard model policies are retained across buffered and streaming paths. Structured project outputs remain atomically Zod-validated; streaming arbitrary partial objects is not required.
- Route-cost instrumentation separates request work from detached after-commit work. Eight AI routes have declared, **unmeasured** budgets. Old mixed-window measurements cannot silently satisfy the new accounting contract.

## Reproducible focused checks

Commands run serially from the indicated repository to avoid concurrent compiler pressure:

1. Backend: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json` — PASS.
2. Frontend: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` — PASS.
3. Backend: `node ./node_modules/jest/bin/jest.js --runInBand --testPathPattern='ai-stream-command.spec|kb-ask-stream-parity.spec|ai-stream-model.spec|raw-ai-text-stream.spec|ai-result-stream.spec|payroll-ai-explain.spec|timesheets-ai-stream.spec' --silent` — 7 suites, 40 tests PASS.
4. Frontend: `node ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath hooks/api/ai-result-stream.test.ts hooks/api/ai-mutation-signal-threading.test.tsx hooks/api/kb/ask-idempotency.test.tsx features/ai/executive-brief-streaming.test.tsx --silent` — 4 suites, 38 tests PASS.
5. Backend: `node src/scripts/check-api-contract-registry.mjs` — PASS, 3,679 classified entries, including 14 retained removed-operation records.
6. Backend: `node test/perf/merge-http-route-budgets.mjs --self-test` — 27/27 PASS.
7. Regenerate backend OpenAPI with `node --max-old-space-size=8192 --env-file-if-exists=.env -r ts-node/register/transpile-only src/scripts/generate-openapi.ts`, then run `node src/scripts/check-openapi-coverage.mjs` — PASS after repairing four raw-stream response declarations. All 3,665 operations have exposure and 4xx contracts; all 1,396 mutating operations have request schemas. Only **54/3,665** operations declare concrete response body schemas: **3,611 remain uncovered** within the existing ratchet. A green ratchet is not comprehensive response-contract coverage.
8. After mechanically copying backend OpenAPI to the frontend, `node scripts/check-contract-vendor.mjs` — PASS, SHA-256 prefix `78a6669056035497`.
9. Frontend: `node scripts/check-prd-traceability.mjs` — PASS, 195 criteria / 36 owners, 145 checked and 50 unchecked, matching exactly. This count is document state, not a fresh verification of every checked item.

Earlier focused runs additionally covered real-socket failures, Executive Brief persistence, shared stream responses and deferred downstream accounting. Those are not a complete E2E or live-provider run. Protocol fixtures override authentication dependencies; they are not evidence of live cross-tenant authorization execution.

## Remaining acceptance boundaries

- PRD-C085 remains OPEN: capture current production-shaped per-route database/downstream counts, bytes, memory and p50/p95/p99. Mocked provider/socket checks do not prove real-provider latency or production headroom.
- PRD-C152 implementation coverage is extended by these changes; prior Chat timing evidence must not be extrapolated to every new route.
- Disposable cross-domain E2E, whole-repository one-commit release verification and deployed operational/compliance criteria retain their existing PRD states. No production credentials, infrastructure, load tests or database migration runs were used in this focused pass.
- OpenAPI coverage initially failed at 3,615 uncovered responses against the unchanged 3,613 ceiling. Four recently added raw streaming routes in HR and Build lacked their actual text/plain response declarations; these are repaired, and the rerun passes at 3,611 uncovered. The remaining response-schema debt is real, pre-existing acceptance work, not erased by passing this ratchet. KB streaming also now documents its required Idempotency-Key header.

No claim of bug-free operation or production-proven million-user scale follows from these focused checks.
