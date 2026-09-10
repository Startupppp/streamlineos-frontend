# Documents, knowledge base and e-sign

Local automated acceptance is consolidated below. Browser, current-database and deployed proof remain outstanding.

## Completed local consolidation

| Task | Completion evidence | Explicit limits |
| --- | --- | --- |
| DOC-001 — Consolidate KB and wiki current-head acceptance | [KB/Documents certification, current-source section](../final-refactor/evidence/42-production-ops/release-authority/KB-DOCUMENTS-CERTIFICATION-2026-09-09.md#8-current-source-local-consolidation--2026-09-10): backend/security 143 suites / 1,107 tests, frontend 17 suites / 139 tests; all passed 2026-09-10 | Backend totals include e-sign. Current DB, browser and deployed checks are explicitly excluded and retained below. |
| DOC-003 — Produce a dedicated e-sign certification | [Dedicated e-sign certification](../final-refactor/evidence/42-production-ops/release-authority/E-SIGN-CERTIFICATION-2026-09-10.md), including reproduced and repaired authentication-counter/audit rollback and concurrent lockout bypass | Local automated proof only; current real-PDF/signing integration, real PostgreSQL concurrency, and provider/retention proof remain below. |

## DOC-002 — Complete documents browser and accessibility acceptance
Status: BLOCKED-EXTERNAL
Maps to: PRD-C135, PRD-C149
Parallel group: 1
Depends on: none
Owner: documents frontend agent

Scope: Verify editor and search states, citation navigation, permission denial, offline/retry behavior, responsive layouts, and keyboard/screen-reader operation.

Completion: The acceptance matrix and visual evidence cover each state at the current frontend revision.

Current proof (2026-09-10): [state acceptance matrix](../final-refactor/evidence/42-production-ops/release-authority/KB-DOCUMENTS-CERTIFICATION-2026-09-09.md#doc-002-state-acceptance-matrix) records passing component editor/ACL/citation/ingestion/offline checks, comment retry, named fields and axe coverage. Browser discovery found no connection. Responsive screenshots, real editor/search navigation, keyboard/screen-reader flow and production-build Web Vitals remain required.

## DOC-004 — Prove deployed storage, search, purge and legal-hold behavior
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162, PRD-C185
Parallel group: 3
Depends on: none
Owner: documents operator

Scope: Verify deployed object storage, indexing/vector retrieval, cache purge, erasure, and legal-hold behavior.

Completion: Timestamped deployed artifacts prove retention and deletion boundaries and receive privacy approval.

Current-database prerequisites retained from DOC-001/DOC-003: rerun KB `.db.spec.ts` and seeded acceptance, live RLS/tenant-FK/append-only checks, vector recall/latency, real PostgreSQL signing-authentication concurrency, and `e-sign-signing-flow.e2e-spec.ts` for real PDF/certificate creation, finalization replay, expiry, revocation, decline and watermarking on a fully migrated disposable database with provider delivery mocked. The historical local stack is absent; the configured remote scratch database failed current-head preflight at 573/708 migrations. Historical DB results and passing mocks do not satisfy these prerequisites.
