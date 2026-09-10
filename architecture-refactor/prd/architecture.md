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

## ARCH-003 — Restore the unchanged file-growth budgets
Status: FINAL-INTEGRATION
Maps to: PRD-C018, PRD-C190, PRD-C191
Parallel group: 1
Depends on: none
Owner: release coordinator and architecture agents

Scope: Current blocking gates report 400 backend files over 300 lines against a
390 ceiling and 517 frontend files against a 513 ceiling. Extract cohesive internal
implementations behind small interfaces, preserve behavior and public contracts,
and keep every existing ceiling/exclusion unchanged. No whitespace compression,
deleted capabilities or added debt allowance may satisfy the gate.

Completion: Both over-300 gates, their self-tests, source/test typechecks, focused
behavior tests, dependency-cycle and dead-code gates pass after the extractions.

Local source work is complete (2026-09-11): ten backend and four frontend files
were split at cohesive internal boundaries. Every extracted file is also below
300 lines. The final shared gates measured backend 389/390 and frontend 513/513;
15 backend detector self-tests passed. Existing assertion/read classifications
followed the moved statements without increasing their aggregate allowances.
Focused verification passed 50 KB suites / 419 tests, 63 Chat/automation/workflow
suites / 630 tests, four payroll suites / 22 tests, and six frontend suites /
38 tests. These are separate selections, not an unduplicated total.

Backend extraction seams: article indexing, ask-context composition, vector-query
strategy, purge-ledger bookkeeping, payroll input paging, benchmark statistics,
automation action execution, channel personal state, sidebar activity and timeline
hydration. Frontend seams: comment threads, ticket action toolbar, saved-view rows
and estimate/actual charts. Existing caller interfaces and UI capabilities remain;
the independently verified payee-filter and benchmark fixes are recorded in
RBAC-005 and ARCH-004. Commits: `e815466c8`, `b5278a1d9`, `17b5aff30` (backend),
`28e7b0b3f` (root/frontend). Final strict checks and any concurrent-worktree gate
failures belong to [the integration record](overall-release.md#current-integration-evidence--2026-09-10).

## Completed: ARCH-004 — Make the authorization benchmark fail on every budget breach

Scope: The benchmark declares `BREACHED` when wall p99 exceeds its target, but its
exit guard only checks CPU p99. Bind the process exit to the same complete verdict
so CI cannot accept a wall-only failure.

Completion: A focused regression proves a wall-only breach exits nonzero while an
in-budget run succeeds; benchmark cold-path integrity self-tests still pass, and
no source or test budget is increased.

Verified 2026-09-11, commit `b5278a1d9`: the shared outcome owns both the displayed
verdict and exit code. The wall-only failure (CPU 50, wall 200, target 100) reproduced
the old false-success exit, then a child-process regression exited 1 after the fix.
Missing, non-finite, negative or over-budget samples fail closed. The statistics
suite passes 31/31, the benchmark's three cold-path safety probes pass, and the
runner is 287 lines. No real performance capture or report file was produced;
ARCH-002 still requires current authenticated measurements.
