# S04 — Home, Directory and HRMS

Status: active

Independent scope: backend Dashboard/Home, Directory/Me and HR modules/workers; matching frontend Home, directory, self-service and HR features/routes/hooks. Chat, Calendar, Inbox and Notifications remain external Home sources. Schema and migration edits belong to S02.

Master coverage: sections 10.3, 10.5 and 10.6 plus owned parts of sections 2–8, 11 and 12.

## Acceptance criteria

- [ ] Keep Home composition-only; verify bounded parallel section contracts, per-section failure/privacy/cache behavior, one access/membership resolution and no domain-table ownership.
- [ ] Verify person/membership/worker/employment identity seams, `/me/*` subject derivation, minimal directory projections and universal self-service independent of paid-module enablement.
- [ ] Audit HR people, employment, leave, attendance, recruitment, onboarding, performance, benefits, documents and approvals across API, DataScope, cache, jobs and UI.
- [ ] Classify every HR mutation as self/universal or exact-permission authorized; prove revocation during mutation and cross-person/cross-org denial.
- [ ] Verify bounded filters/cursors/exports, no N+1, responsive and accessible Home/Directory/HR states and production-shaped focused query evidence.
- [ ] Inventory owned files and remove dependency-proven duplicate/deferred code without changing public landing visuals/animations.
- [ ] Run focused Home/Directory/HR tests and targeted route/query/isolation gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S04 is complete; commit/evidence: _pending_.
