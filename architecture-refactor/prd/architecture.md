# Architecture and performance

## Completed: ARCH-001 — HR keyset pagination contraction

Verified 2026-09-10 against backend `75ec87be3fcefd0490b2b93634ca6eaebc051e93`:

- `node src/scripts/check-hr-pagination-gate.mjs`: 195 HR services, zero violations, baseline zero, exit 0.
- `node src/scripts/check-unbounded-reads.mjs`: 3,309 files across modules/common/database, zero actionable offset or unbounded reads, exit 0. Reported exclusions and false-positive classifications remain explicit.
- `node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/common/pagination/keyset.spec.ts`: 32 tests passed.
- `node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --runInBand --testPathPattern='src/modules/hr/.*(cursor|pagination).*spec.ts'`: seven suites, 25 tests passed.

The previously listed 35 findings are resolved in current source. No HR pagination implementation was changed by this verification.

## ARCH-002 — Bring authenticated mobile INP within budget
Status: BLOCKED-EXTERNAL
Maps to: PRD-C149, PRD-C190
Parallel group: 1
Depends on: none
Owner: performance agent

Scope: Diagnose and remove the interaction latency that produced 728 ms and 1,152 ms mobile INP readings.

Completion: A quiet-host authenticated capture is accepted by the measurement driver and reports mobile INP at or below 200 ms, with the raw artifact linked here.

Current prerequisite check (2026-09-10): the connected browser runtime reports no
available browser. The existing Web Vitals artifact is 161 commits stale and its
production-build provenance is rejected by `check-web-vitals-budget.mjs` (exit 1).
Source changes and component tests cannot certify the mobile INP budget. Connect an
authenticated browser and capture the final production build on a quiet host.
