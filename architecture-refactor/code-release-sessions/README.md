# Independent code-release sessions

These tickets are parallel execution views of [PRD-10-10-CODE-RELEASE-TODO.md](../PRD-10-10-CODE-RELEASE-TODO.md). The PRD remains authoritative.

## Execution contract

1. Read the root `CLAUDE.md`, the side-specific `CLAUDE.md` for every owned path, this README, the assigned session and the current master PRD before editing.
2. Re-audit current source. KEEP sound architecture. Change code only for a named correctness, security, scale, performance, operability or maintainability failure.
3. Start from current source and contracts. Do not wait for, assume or require another session's uncommitted work. Re-read a shared file immediately before editing it and stay inside the ticket's ownership boundary.
4. Preserve CRM, Inventory and public landing-page visuals/animations. They are outside every session.
5. Use focused tests and targeted static/architecture gates. Session agents must not run a full backend/frontend typecheck, ESLint command or full build. The orchestrator owns those expensive final gates once after reconciliation.
6. Do not use Git in a session. The orchestrator reviews and commits coherent batches.

## Two-way completion protocol

A session is complete only when all of these are true:

- [ ] Every session acceptance criterion has current-source evidence or a linked focused test/gate artifact.
- [ ] Every fixed master criterion is checked in the master PRD with a short evidence suffix; no broad checkbox is checked from inference.
- [ ] Cross-cutting master criteria remain unchecked until every affected session is proven.
- [ ] The matching S01–S12 ledger checkbox in the master PRD is checked.
- [ ] The session `Status` is changed to `complete`, its completion checkbox is checked and commit/evidence paths are recorded.
- [ ] Any newly discovered issue is added once to the owning master section and once to the owning session before the session stops.

## Conflict boundaries

Domain sessions own their module implementations, matching frontend features/routes/hooks and focused tests. S02 exclusively owns in-scope schema, migrations and global catalog gates. S03 owns cross-domain API/query/cache primitives and scanners. S11 owns frontend-wide primitives and budgets. S12 owns generic adapters and repository/security/privacy gates. A domain session may adapt its caller to a shared interface but must not redesign another session's implementation.

| Session | Exclusive implementation owner | Explicit boundary |
|---|---|---|
| S01 | Auth, Organization, RBAC, module access and Settings implementation/UI | Authenticated shell/navigation primitives are S11; Directory/Me is S04; Billing Settings internals are S07; schema/migrations are S02 |
| S02 | All in-scope Drizzle schema, migrations, catalog/RLS/retention-schema gates | Domain services and UI are never edited here |
| S03 | Backend common pagination, query, cache, transport/OpenAPI primitives plus cross-layer contract manifests/scanners | Frontend shared Query/API implementation is S11; domain services/hooks only consume these interfaces |
| S04 | Home/Dashboard, Directory/Me and HR implementation/UI | Chat/Calendar/Inbox/Notifications remain external sources |
| S05 | Payroll, Accounting, Finance and Expenses implementation/UI | Billing provider/subscription logic is S07 |
| S06 | Build and Workflows implementation/UI | Notification delivery is called through S08's existing interface |
| S07 | Billing, subscriptions, payments and provider adapters/UI | Accounting customer invoicing is S05 |
| S08 | Chat, Notifications, push/email dispatch and realtime implementation/UI | Inbox/Mail consumes delivery through the current interface |
| S09 | Calendar, Inbox and Mail implementation/UI | Provider and notification delivery implementations are consumed, not edited |
| S10 | Knowledge/Wiki/Chatbot, AI gateway, ingestion and feature search/vector implementation/UI | Generic storage/integration adapters are consumed, not edited |
| S11 | Frontend-wide Query/authenticated-shell/navigation/UI/performance primitives | Domain feature implementation stays with S01 and S04–S10 |
| S12 | Generic storage and integration adapters, GDPR runtime orchestration, repository/security harnesses | Realtime is S08; feature search/AI is S10; schema/migrations are S02 |

Shared master criteria are aggregation gates, not session dependencies. Each session proves a shared criterion only for its owned files; the orchestrator checks the master box after all required evidence is present.

## Final orchestrator-only gate

After every session is reconciled, the orchestrator runs the full backend build/typecheck, spec typecheck, frontend typecheck, full build and remaining one-commit release suite serially with resource monitoring. These commands never belong in an individual session ticket. Final combined E2E, catalog parity, residual-risk disposition and release authority also remain master-only because assigning them to a session would make that session dependent on all others.
