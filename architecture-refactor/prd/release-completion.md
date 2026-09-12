# Combined remaining release checks

Status: OPEN. Updated 2026-09-12. This replaces `architecture.md` and
`documents.md`: neither was wholly complete. Stable ARCH-* and DOC-* IDs,
owners, mapped criteria and unique historical evidence are preserved below.

Read root `CLAUDE.md`, `architecture-refactor/AGENTS.md` and the
[full-stack contract](README.md#mandatory-full-stack-completion-contract).
Implement only the selected task; reserve shared edits with the coordinator.
Historical completed sections are reference, not instructions to redo repairs.

## Remaining work at a glance

- [ ] ARCH-002: current authenticated mobile INP at or below 200 ms, accepted provenance.
- [ ] ARCH-003: repair current growth/type/dependency/dead-code gates without relaxing ceilings.
- [ ] DOC-002: complete actual document/editor/search browser and accessibility matrix.
- [ ] DOC-004: current disposable DB/PDF/concurrency prerequisites, then authorized deployed storage/retention proof and privacy approval.

These are one canonical checklist; sections below define each item’s acceptance,
not additional tasks. Documents/product/privacy choices remain with their named owners.
No live operation is authorized merely by this file.

## Current recheck evidence

Root `85dc726e9` / backend `d3bf57982` plus existing working changes,
2026-09-12. Main independently ran frontend `node scripts/check-over-300.mjs`: exit 1,
526/513. `node scripts/check-file-sizes.mjs`: exit 1, 508-line
`features/org-setup/hooks/use-setup-provisioning.test.ts`; Inventory’s 513-line
page is reported informational by that gate, not a new scope expansion.
Query-scope exit 0; request-params exit 1 (undeclared hierarchy `mode`).
Bundle gate exit 1 for stale build provenance; see [frontend data](recovery-frontend-data.md).
These are targeted checks, not a rerun of historical Architecture/Documents suites.

# Architecture and performance — retained evidence and remaining gates

## Completed: ARCH-001 — HR keyset pagination contraction

Verified 2026-09-10 against backend `75ec87be3fcefd0490b2b93634ca6eaebc051e93`:

- `node src/scripts/check-hr-pagination-gate.mjs`: 195 HR services, zero violations, baseline zero, exit 0.
- `node src/scripts/check-unbounded-reads.mjs`: 3,309 files across modules/common/database, zero actionable offset or unbounded reads, exit 0. Reported exclusions and false-positive classifications remain explicit.
- `node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/common/pagination/keyset.spec.ts`: 32 tests passed.
- `node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --runInBand --testPathPattern='src/modules/hr/.*(cursor|pagination).*spec.ts'`: seven suites, 25 tests passed.

The 2026-09-10 verification recorded all previously listed 35 findings resolved. No HR pagination implementation was changed by this verification.

## ARCH-002 — Bring authenticated mobile INP within budget
Status: READY
Maps to: PRD-C149, PRD-C190
Parallel group: 1
Depends on: none
Owner: performance agent

Safe environment/build preflight and measurement; external only if a specific
resource is unavailable.

Scope: Diagnose and remove the interaction latency that produced 728 ms and 1,152 ms mobile INP readings.

Completion: A quiet-host authenticated capture is accepted by the measurement driver and reports mobile INP at or below 200 ms, with the raw artifact linked here.

Current reconciliation (2026-09-12): the old missing-browser diagnosis is superseded.
The shared Windows launcher exists and [Build](build.md) records actual disposable
browser captures. ARCH-002 still needs authenticated Web Vitals on the intended
local/test API build and a quiet host. Earlier 728/1,152 ms readings are historical,
not a current verdict; confirm artifact provenance before optimizing against them.

## ARCH-003 — Restore the unchanged file-growth budgets
Status: FINAL-INTEGRATION
Maps to: PRD-C018, PRD-C190, PRD-C191
Parallel group: 1
Depends on: none
Owner: release coordinator and architecture agents

Scope: Restore the unchanged growth budgets. The current frontend gate reports
526 files over 300 lines against 513 (exit 1); backend count requires a fresh gate. Extract cohesive internal
implementations behind small interfaces, preserve behavior and public contracts,
and keep every existing ceiling/exclusion unchanged. No whitespace compression,
deleted capabilities or added debt allowance may satisfy the gate.

Completion: Both over-300 gates, their self-tests, source/test typechecks, focused
behavior tests, dependency-cycle and dead-code gates pass after the extractions.

Historical local extraction evidence (2026-09-11), not current budget closure: ten backend and four frontend files
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

Historical completed repair evidence; not a new implementation assignment.

Verified 2026-09-11, commit `b5278a1d9`: the shared outcome owns both the displayed
verdict and exit code. The wall-only failure (CPU 50, wall 200, target 100) reproduced
the old false-success exit, then a child-process regression exited 1 after the fix.
Missing, non-finite, negative or over-budget samples fail closed. The statistics
suite passes 31/31, the benchmark's three cold-path safety probes pass, and the
runner is 287 lines. No real performance capture or report file was produced;
ARCH-002 still requires current authenticated measurements.

# Documents, knowledge base and e-sign

Local automated acceptance is consolidated below. Browser, current-database and deployed proof remain outstanding.

## Completed local consolidation

| Task | Completion evidence | Explicit limits |
| --- | --- | --- |
| DOC-001 — Consolidate KB and wiki current-head acceptance | [KB/Documents certification, current-source section](../final-refactor/evidence/42-production-ops/release-authority/KB-DOCUMENTS-CERTIFICATION-2026-09-09.md#8-current-source-local-consolidation--2026-09-10): backend/security 143 suites / 1,107 tests, frontend 17 suites / 139 tests; all passed 2026-09-10 | Backend totals include e-sign. Current DB, browser and deployed checks are explicitly excluded and retained below. |
| DOC-003 — Produce a dedicated e-sign certification | [Dedicated e-sign certification](../final-refactor/evidence/42-production-ops/release-authority/E-SIGN-CERTIFICATION-2026-09-10.md), including reproduced and repaired authentication-counter/audit rollback and concurrent lockout bypass | Local automated proof only; current real-PDF/signing integration, real PostgreSQL concurrency, and provider/retention proof remain below. |

## DOC-002 — Complete documents browser and accessibility acceptance
Status: READY
Maps to: PRD-C135, PRD-C149
Parallel group: 1
Depends on: none
Owner: documents frontend agent

Use the existing browser harness after safe target/build preflight; runtime
acceptance not yet passed.

Scope: Verify editor and search states, citation navigation, permission denial, offline/retry behavior, responsive layouts, and keyboard/screen-reader operation.

Completion: The acceptance matrix and visual evidence cover each state at the current frontend revision.

Historical proof (2026-09-10): [state acceptance matrix](../final-refactor/evidence/42-production-ops/release-authority/KB-DOCUMENTS-CERTIFICATION-2026-09-09.md#doc-002-state-acceptance-matrix) records passing component editor/ACL/citation/ingestion/offline checks, comment retry, named fields and axe coverage. That historical discovery failure is superseded by Build’s Windows launcher/capture evidence; documents acceptance itself was not rerun. Responsive screenshots, real editor/search navigation, keyboard/screen-reader flow and production-build Web Vitals remain required.

## DOC-004 — Prove deployed storage, search, purge and legal-hold behavior
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162, PRD-C185
Parallel group: 3
Depends on: none
Owner: documents operator

Scope: Verify deployed object storage, indexing/vector retrieval, cache purge, erasure, and legal-hold behavior.

Completion: Timestamped deployed artifacts prove retention and deletion boundaries and receive privacy approval.

Current-database prerequisites retained from DOC-001/DOC-003: rerun KB `.db.spec.ts` and seeded acceptance, live RLS/tenant-FK/append-only checks, vector recall/latency, real PostgreSQL signing-authentication concurrency, and `e-sign-signing-flow.e2e-spec.ts` for real PDF/certificate creation, finalization replay, expiry, revocation, decline and watermarking on a fully migrated disposable database with provider delivery mocked. An earlier run found the local stack absent and remote scratch preflight at 573/708 migrations. Later recovery/Build records describe a rebuilt disposable stack; neither that historical failure nor schema restoration certifies current Documents fixtures and migrations. Historical DB results and passing mocks do not satisfy these prerequisites.
