# S12 — Shared adapters, security, privacy and repository quality

Status: active

Independent scope: generic storage/integration adapters, GDPR/privacy runtime orchestration, repository architecture gates and shared test harnesses. Realtime belongs to S08; feature search/vector/AI belongs to S10; global schema/migrations belong to S02. S12 does not own domain business implementation.

Master coverage: sections 1, 2, 9, 10.17 and 11 plus shared portions of sections 3, 7 and 12.1.

## Acceptance criteria

- [ ] Keep shared modules domain-neutral with narrow authorization-bearing interfaces; verify provider secrets/object keys remain server-side and tenant-bound.
- [ ] Prove upload/download/search/token/callback validation, quarantine/scan/transform lifecycle, SSRF/malicious-file/replay/cross-tenant denial, cleanup and every emitted event's consumer/sink.
- [ ] Implement exhaustive resumable correction/export/erasure across database, objects, search/vector, projections, caches and supported adapters with immutable/legal-hold behavior.
- [ ] Restore repository size ratchets without raising baselines; remove only graph-proven dead/duplicate/deferred endpoints, schema, types, validators, hooks, components and scripts.
- [ ] Keep module ownership/import direction/kebab-case/cycle/registration rules enforceable and add known-bad self-tests for gates that parse source conventions.
- [ ] Repair the seeded disposable E2E harness and record focused cross-module security/privacy failure artifacts; leave full combined E2E and one-commit integration to the orchestrator.
- [ ] Run focused adapter/security/privacy tests and targeted file-size, graph, dead-code, event-consumer, vulnerability/license/SBOM or harness gates within the session resource budget; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S12 is complete; commit/evidence: _pending_.
