# Chat

The current work closes test and evidence drift. The entity-action dialog accessibility defect
found during verification is also repaired. Real-PostgreSQL proof and final revision binding
remain outstanding; historical passes are not current execution evidence.

Completed source and focused checks (2026-09-10):

- CHAT-001: entity-channel harness repaired and 12/12 passing. The existing-channel case now
  requires HTTP 200 and cannot pass on a malformed-fixture 500. Final release revision binding
  remains in CHAT-003.
- CHAT-004: both provider documents describe retired TURN/ICE and the current Composio →
  Google Calendar → browser Google Meet boundary; the replacement's approval stays unsigned.
- Additional acceptance repairs: message/idempotency mocks supply the real transaction surface,
  XSS coverage requires a successful sanitized write, and the entity-action dialog includes an
  accessible description. Timeline sender selections now consume the existing canonical
  identity-only projection; five focused suites / 47 tests pass.

Evidence: [current Chat checks](../final-refactor/evidence/42-production-ops/release-authority/CHAT-EVIDENCE-2026-09-09.md).

## CHAT-002 — Make the read-path index assertion fixture-safe
Status: BLOCKED-EXTERNAL
Maps to: PRD-C128, PRD-C129
Parallel group: 1
Depends on: none
Owner: chat agent

Scope: The exact-index test fixture in `chat-read-path-hardening.db.spec.ts` now clones the live
index portfolio into a transaction-local temporary table, seeds a four-tenant pending/sent/cancelled
mix, analyzes it, checks 20 due rows and asserts the intended index. The production index is unchanged.
The suite was attempted and refused before running any tests because no approved disposable
PostgreSQL database is configured in this environment.

Completion: The database-backed assertion proves the intended index-served path without relying on an unrealistic all-identical fixture, and the focused DB suite passes.

## CHAT-003 — Reconcile current Chat evidence
Status: FINAL-INTEGRATION
Maps to: PRD-C127, PRD-C128, PRD-C129, PRD-C156
Parallel group: 2
Depends on: CHAT-002
Owner: chat agent

Scope: Current focused totals and the F2/governance reconciliation are recorded in
`CHAT-EVIDENCE-2026-09-09.md`. Complete the database proof and bind the final root/backend/frontend
revisions plus shared type/cycle/contract gates after lane integration.

Completion: Every claimed command is reproducible at the recorded root/backend revisions and no resolved finding remains described as open.
