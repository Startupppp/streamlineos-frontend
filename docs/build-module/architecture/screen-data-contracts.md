# Screen data contracts

Status: Planned

## Canonical interfaces

OnboardingActivation: preview, saveDraft, activate, resumeRun. TicketCommands: create, change, transition, bulkChange. ScopedQueries: get/list/query by registered record kind. Dashboard: load/save/restore/queryBatch. PortalGrants: preview/create/exchange/revoke. These reuse existing reachability and authorization seams; controllers, visual screens, imports, integrations, AI and automations are adapters.

## Projection schemas

All projections inherit organizationId, id, revision, createdAt, updatedAt, allowedActions. Optional sensitive fields are omitted, not populated with hidden counts.

| Record | Required domain fields | Owned relationships |
|---|---|---|
| Project | key, name, ownerId, state, health, timezone, startDate?, targetDate? | clientRef?, productRefs, member/team refs, milestone refs |
| Ticket | key, title, projectId, typeId, statusId, priority, assigneeIds, reporterId, visibility | parent, dependencies, cycle/epic/workstream/milestone/release, request/evidence refs |
| Intake | projectId, title, body, sourceType, sourceId, requesterRef, type, state, receivedAt | evidence/files, duplicateOf?, resultingTicketId?, legacy mappings |
| Product | name, ownerId, lifecycle, audience, mission | project/goal/opportunity/release refs |
| Evidence | sourceType/sourceRef, text/fileRef, capturedAt, consent, sensitivity, provenance | customerRef?, segment refs, feedback/opportunity links |
| Opportunity | problem, ownerId, state, confidence, assumptions, desiredOutcome | evidence refs, initiative/goal refs, scoring version |
| Priority score | method=RICE, reachPeriod, reach, impact, confidence 0–1, effort>0, formulaVersion | opportunityId, input evidence, override/reason/actor/version |
| Outcome review | goal/initiative/release ref, dueDate, ownerId, baseline/target/current/unit, sourceRef, reviewState | experiment/evidence refs and conclusion |
| Goal | outcome, ownerId, period, unit, baseline/target/current, method, confidence | initiative/project/product refs; versioned check-ins |
| Cycle | project/team, dates/timezone, state, goal, cadenceRef | ticket scope, immutable commitment/result snapshots |
| Epic/Workstream | projectId, name, ownerId, state, dates | tickets, goal/release refs |
| Milestone | projectId, name, ownerId, dueDate, state, confidence | deliverables/dependencies/approvals |
| Release | project/product, name/version, ownerId, targetDate, state | tickets, QA, approval, deployment evidence |
| Portfolio/Program | name, ownerId, objective, state, health | typed project/program membership and dependency links |
| Approval | artifactRef, artifactVersion, state, approverPolicy, dueAt | immutable decisions, superseding approval |
| Risk | projectId, description, ownerId, probability, impact, formulaVersion, state | trigger, mitigation/contingency and work refs |
| Decision | statement, ownerId, state, decidedAt?, rationale, version | options/evidence, affected refs, supersedes? |
| Change request | baselineRef/version, requestedDelta, ownerId, state | impact estimate/version, approval, resulting work/accounting refs |
| Form | name, audience, schemaVersion, state, destinationRef | typed field schema/logic, immutable published versions |
| Test run | environment/buildRef, planVersion, state, ownerId | case-version attempts, evidence, defects, signoff |
| Incident | projectId, severity, state, commander, serviceRef, start/end | typed timeline, mitigation, approved messages, postmortem/actions |
| Saved report | name, ownerId, audience, measureIds, dimensions, filterVersion=1 | query envelope, output jobs and version |
| Configuration | projectId?, configKind, version, state, ownerId | validated draft and immutable published version |

References identify the owning module, tenant, record type and ID. Enforce same-tenant relationships in database constraints and commands. Typed join tables hold authorization-bearing memberships/grants and reportable relationships. JSON is reserved for validated configuration/layout, not hidden ACLs.

## HTTP interface catalog

All paths below are API paths, separate from UI route URLs. Existing controllers retain adapters until generated clients migrate. Screen-specific GET suggestions defer to this catalog.

| Family | Read | Mutation |
|---|---|---|
| Work | GET /build/projects/:projectId/tickets and /:ticketKey | POST collection; PATCH record; POST /transitions and /bulk-change |
| Project domain collections | GET /build/projects/:projectId/{cycles,epics,workstreams,milestones,releases,intake,risks,decisions,change-requests,approvals,forms,incidents,qa-runs} and /:id | POST create; PATCH /:id; explicit POST transition/link/unlink/archive commands |
| Global domain collections | GET /build/{projects,teams,goals,portfolios,programs,managed-products} and /:id | POST create; PATCH /:id; relationship/transition commands |
| Product discovery | GET /build/managed-products/:id/{feedback,evidence,opportunities,outcome-reviews} and /:recordId | POST create; PATCH revision; POST /score, /override, /link, /review |
| Cross-project views | POST /build/query with recordKind and FilterEnvelope | delegate commands to each owning domain; export is a job |
| My Work / Inbox | GET /build/my-work; GET Home unified inbox with module=build | private focus/snooze commands; notification owner marks read |
| Configuration | GET /build/projects/:id/settings/:kind | PUT revisioned draft; POST /validate, /publish, /restore |
| Dashboards | GET /build/dashboards/default and /:id; POST /build/dashboard-query | POST dashboard; PUT revisioned layout; POST /restore |
| Organization budget | UI `/build/budget` resolves to the governed budget report view; bounded organization budget projection query uses FilterEnvelope v1 and field policy | Budget change delegates to project budget/approval owner; time and money actions delegate to Timesheets and Accounting |
| Portal | GET /build/client-grants and authorized preview | POST create/exchange/revoke/rotate under portal authority |
| Integrations | GET integration connection/mapping/status/run projection | POST connect/test/sync/pause/reconcile; vault owns secrets |
| Collaboration | GET Build project associations to Chat, Knowledge, Home, Files | writes in owning module with signed safe return context |

API list responses use items/pageInfo/sourceRevision/generatedAt; detail responses contain the named projection and heavy-section descriptors. Command results include recordRef, revision, auditRef, replayed and affected namespace versions. Never expose auditRef content without audit access.

## Dashboard reconciliation

GET /build/command-center, if retained as compatibility API, resolves the default dashboard through the same module and returns canonical links. It does not own a separate dashboard schema/cache. Canonical layout and query endpoints are those in the dashboard spec. No per-widget uncapped fanout. Filter storage is FilterEnvelope v1 throughout.

## Testing Decisions

Contract tests round-trip every registered projection/query, typed relationship, filter envelope and error. Integration tests verify persisted commands/outbox/audit at canonical seams and negative tenant/project/field policy. Imported legacy source IDs reconcile against unique mappings. Browser tests use generated wire contracts and actual persisted records.

## Out of Scope

Implementing migrations/controllers or changing permission keys in this documentation revision.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Add same-tenant database constraints and authorized command validation for membership, grant, and record relationships; keep authorization-bearing links out of opaque JSON.
- [ ] Route legacy Command Center reads through the canonical dashboard owner; cap widget fanout and verify layout/query/cache parity and authorized drill-down.
