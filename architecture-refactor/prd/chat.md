# Chat

No confirmed product-code defect remains in the audited Chat scope. The current work closes test and evidence drift.

## CHAT-001 — Finalize entity-channel E2E repair
Status: READY
Maps to: PRD-C127
Parallel group: 1
Depends on: none
Owner: chat agent

Scope: Review and preserve the current entity-channel E2E repair in `backend/src/modules/chat/chat-entity-channel.controller.e2e-spec.ts`.

Completion: All 12 entity-channel E2E cases pass at the final backend revision and the diff contains no unrelated changes.

## CHAT-002 — Make the read-path index assertion fixture-safe
Status: READY
Maps to: PRD-C128, PRD-C129
Parallel group: 1
Depends on: none
Owner: chat agent

Scope: Correct the exact-index test fixture in `chat-read-path-hardening.db.spec.ts`; the production index already exists.

Completion: The database-backed assertion proves the intended index-served path without relying on an unrealistic all-identical fixture, and the focused DB suite passes.

## CHAT-003 — Reconcile current Chat evidence
Status: READY
Maps to: PRD-C127, PRD-C128, PRD-C129, PRD-C156
Parallel group: 2
Depends on: CHAT-001, CHAT-002
Owner: chat agent

Scope: Update `CHAT-EVIDENCE-2026-09-09.md` to remove the stale F2 failure and stale KB contract-registry statement, then record current totals and revision.

Completion: Every claimed command is reproducible at the recorded root/backend revisions and no resolved finding remains described as open.

## CHAT-004 — Reconcile retired TURN and ICE documentation
Status: READY
Maps to: PRD-C156, PRD-C185
Parallel group: 1
Depends on: none
Owner: chat documentation agent

Scope: Update `DATA-CATALOGUE.md` and `decisions/privacy-C185-provider-approvals.md` so retired TURN/ICE language agrees with the Google Meet migration.

Completion: Current provider boundaries and required approvals agree across both documents and contain no retired implementation claim.
