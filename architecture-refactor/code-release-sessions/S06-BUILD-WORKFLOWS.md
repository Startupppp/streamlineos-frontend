# S06 — Build and Workflows

Status: active

Independent scope: backend Build and Workflows modules/workers and matching frontend `/build`, workflow features, routes and hooks. Schema and migration edits belong to S02.

Master coverage: sections 10.8 and 10.9 plus owned parts of sections 2–8, 11 and 12.

## Acceptance criteria

- [ ] Preserve distinct project and product entities; verify workspace/project/product/ticket/board/sprint/roadmap/OKR/feedback/QA relations and record scope.
- [ ] Verify canonical `/build` APIs, strict bounded contracts, stable ordering/cursors, activity/event idempotency and indexed board/backlog/search plans.
- [ ] Replace per-row custom-state reorder with one bounded transactional version-checked command and complete optimistic rollback; remove local Build query-key factories.
- [ ] Verify private-resource membership, watchers/assignees, module roles, DataScope, cross-tenant denial and revoked/suspended membership behavior.
- [ ] Verify Workflow immutable versions, state transitions, secret references, triggers/schedules, leases, cancellation, retry/DLQ, approval authority and bounded histories.
- [ ] Inventory owned files and remove dependency-proven duplicates/deferred hooks while keeping deep module boundaries.
- [ ] Run focused Build/Workflow concurrency, authorization, query and recovery tests and targeted gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S06 is complete; commit/evidence: _pending_.
