# Build deep-module reconciliation

Status: Planned architecture authority with Current unverified source anchors  
Snapshot: `a5b8347fb`, 2026-10-02  
Scope: every Build workflow, cross-module seam, and architecture decision captured in the approved architecture review

## 1. Purpose

This document is the durable Markdown counterpart of the approved Build architecture report. It prevents an implementation agent from interpreting an isolated screen, controller, schema, or research file as permission to create a second owner for the same behavior.

Use the repository truth vocabulary throughout:

- **Current verified**: demonstrated on the current revision with the named runtime evidence.
- **Current unverified**: present in source or historical evidence but not demonstrated end to end on the current revision.
- **Planned**: accepted target behavior requiring implementation and verification.
- **Conditional**: enabled only by a plan, permission, selected module, integration, feature flag, or client grant.
- **Deferred**: intentionally outside the current delivery sequence.

The source census behind this snapshot found 732 backend Build files, 86 Build table declarations, 354 Build HTTP handlers, 75 Build pages, and 1,366 frontend Build route, feature, and hook files. These counts are **Current unverified** inventory, not release proof. Recount them before implementation because the branch may have changed.

## 2. Deep modules to retain

These existing seams concentrate policy and should be deepened rather than bypassed:

| Module | Current source anchor | Interface responsibility | Rule |
|---|---|---|---|
| Ticket change | `backend/src/modules/build/core/tickets/apply-ticket-change.ts` | ticket field changes, status/WIP rules, assignment permission, revision, activity, audit, invalidation, and effects | Every UI, bulk, import, automation, AI, webhook, and system Ticket mutation crosses this interface. |
| Project reachability | `backend/src/modules/build/core/project-crud/project-access.ts` | project and record reachability from trusted actor context | A permission never implies record reachability. No caller recreates project membership logic. |
| Portal projection | current client-portal projection and visibility paths | client-safe fields/actions selected by an active grant | Portal queries never reuse internal projections or imply organization membership. |
| Integration delivery | shared outbox, webhook, and provider adapters | after-commit delivery, signing, retry, idempotency, and evidence | Domain modules describe intent; the delivery implementation owns transport behavior. |
| Ask OS tools | current Build AI tools/actions | permission-scoped query, proposal, confirmation, and command execution | AI uses the same command/query interfaces as humans and cannot broaden scope. |
| Access evaluation | `AccessService`, permission catalog, module/project access sources | organization standing, module standing, project/record reach, action/field policy, and external projection | Navigation is derived from authorization; it is never authorization itself. |

## 3. Accepted architecture decisions

### ARC-01 — Module Access is the only Build assignment authority

- **Problem:** organization membership, Build assignment, team eligibility, role templates, project reachability, invitation activation, and revocation can disagree when multiple writers own them.
- **Target module:** one Module Access interface owns Build standing assignment and revocation. Organization Owner/Admin receives enabled-module entry according to organization policy. Organization Member needs explicit Build assignment. Project and record reach remain narrower checks after module entry.
- **Keep behind the interface:** role grantability, invitation activation, membership discovery, access revision, cache invalidation, audit, and revocation.
- **Forbidden duplication:** feature-local role parsing, controller-side standing writes, UI-only access decisions, or client grants represented as internal membership.
- **Dependencies:** none; this is the first authority decision.
- **Acceptance:** invitation, direct assignment, role change, and revocation converge on one writer; owner/admin/member/custom-role/client negative matrices pass; cached and open-session access is revoked within the documented bound.

### ARC-02 — Timesheets is the only time-ledger owner

- **Problem:** Build currently duplicates reads, writes, approvals, billability, permission checks, cache rules, and derived Ticket time over tables owned by Timesheets.
- **Target module:** Build retains a contextual Timesheets adapter for start timer, add entry, and authorized project/ticket actuals. Timesheets owns entries, approvals, rates, periods, exports, and billing attributes.
- **Migration:** compare the Timesheets projection with `tickets.time_spent`; stop writes and recomputation; migrate all reads; remove the derived column only in a later reversible migration.
- **Forbidden deletion:** Timesheets ledger, audit, approval, rate, payroll, or export data.
- **Dependencies:** ARC-01, wire contracts, projection freshness.
- **Acceptance:** identical totals across ticket/project/timesheet views; Build cannot mutate the ledger without the Timesheets interface; denied and revoked access fails closed.

### ARC-03 — Project Provision and Ticket Command own creation and change

- **Problem:** templates, imports, onboarding, intake conversion, portal actions, automation, AI, and ordinary UI can reproduce quota, defaults, identifiers, workflow, audit, cache, and effect ordering.
- **Target modules:** `ProjectProvision` creates a complete project idempotently; `TicketCommand` creates and changes Tickets through `apply-ticket-change.ts` and focused relation/collaboration interfaces.
- **Project Provision owns:** quota and plan check, template version, default statuses/views/fields, project key allocation, membership, initial client relation, audit, outbox, and replay result.
- **Ticket Command owns:** create, update, transition, rank, assign, archive, restore, transfer, bulk intent, CAS, lifecycle validation, activity, audit, invalidation, and outbox.
- **Dependencies:** ARC-01, ARC-05, ARC-06.
- **Acceptance:** every entry point returns the same persisted result and effects for the same command; double submit replays; partial project provisioning resumes without duplicate objects.

### ARC-04 — Forms capture, Triage processes, Intake projects, canonical commands convert

- **Problem:** legacy Intake, Forms, Triage, and Feedbucket can independently own status, assignment, duplicate detection, evidence, conversion, and notifications.
- **Target ownership:** Forms and Feedbucket preserve immutable submitted evidence; Triage owns processing state; Intake is the unified authorized request projection; Ticket Command or Project Provision owns conversion.
- **Required identity:** every source record keeps a durable source-to-destination mapping and idempotency key. Legacy Feedbucket and submission links resolve through explicit record-ID mapping.
- **Dependencies:** ARC-03, ARC-05, ARC-15.
- **Acceptance:** accept, decline, mark duplicate, assign, prioritize, convert to Ticket, and convert to Project are repeat safe; source evidence is unchanged; old links resolve to the same request.

### ARC-05 — Files is the only attachment-byte owner

- **Problem:** caller-supplied URLs and record-local attachment metadata duplicate upload, scanning, retention, signed access, and revocation.
- **Target module:** Files owns file identity, upload session, malware scanning, retention, versions, deletion, and signed download. Build owns typed relations between a File identity and a Ticket, project, wiki page, meeting, release, QA result, client grant, or request.
- **Forbidden behavior:** persisting arbitrary file URLs as trusted attachments, exposing storage keys, or authorizing a file solely from possession of a relation ID.
- **Dependencies:** ARC-01 and record reachability.
- **Acceptance:** upload/scan/attach/download/delete/revoke work for internal and portal actors; signed URLs expire; removing a relation does not delete bytes still referenced elsewhere.

### ARC-06 — One generated wire-contract module

- **Problem:** backend DTOs, frontend Zod schemas, generated clients, manual interfaces, and tests can describe different payloads.
- **Target module:** registered backend request/response schemas generate or validate one wire contract consumed by frontend hooks and contract tests. Compatibility adapters are versioned and temporary.
- **Rules:** no hand-written duplicate response shape; reject unknown keys at the root and at every nested mutation object unless an explicitly versioned extension map is allowed; restore and every mutation operation appear in the registry; contract version changes include migration and removal criteria. Add a strict-object ratchet that fails on a newly permissive nested schema.
- **Acceptance:** OpenAPI/registry/frontend contract parity passes; no unresolved handler is omitted; stale generated files fail CI.

### ARC-07 — Collection reads are bounded authorized projections

- **Problem:** unbounded loads, parent-detail hydration, hidden client filtering, N+1 enrichment, and inconsistent counts make Build slow and unsafe.
- **Target module:** one query module per collection owns tenant/project/record scope, FilterEnvelope v1, stable cursor, allowlisted sort, fields projection, facets/counts, freshness, and query budget.
- **Rules:** default page 50, maximum 100 unless stricter; no hidden post-filter authorization; counts use the same scope/filter; exports and AI reuse the query interface.
- **Acceptance:** list-projection, unbounded-read, N+1, tenant, stable-pagination, filter-equivalence, and query-plan gates pass on representative large data.

### ARC-08 — Reconcile duplicate schema identities

- **Problem:** primary assignee plus `ticket_assignees`, legacy Bug plus Ticket, project client fields plus typed customer links, and derived time fields create two truths.
- **Target:** select one canonical identity for each concept after production cardinality, usage, import, and route evidence; provide a read/write compatibility period, backfill and compare, move callers, then remove the duplicate in a later migration.
- **Required direction:** Ticket assignment must support the accepted multi-assignee user contract, but the migration must first measure primary-assignee and join-table parity; BUG is a Ticket type with QA sidecar; Workstream keeps compatible `build.modules` storage/URL identity; clients use typed project/customer or portal-grant relations; Timesheets supplies actuals. The primary assignee field may become a derived compatibility projection only after the comparison proves that no supported workflow depends on separate semantics.
- **Acceptance:** actual cardinality and callers are recorded, duplicate writers are blocked, parity reports are clean, reverse migration or adapter exists, and old identifiers remain resolvable for the retention period.

### ARC-09 — Frontend modules follow workflows and import direction

- **Problem:** route pages, broad barrels, oversized features, direct fetches, and cross-domain imports spread behavior and load unnecessary code.
- **Target:** thin route entry, workflow feature module, domain hook module, generated contract, central query-key domain module, and shared UI primitives. Record page and split pane use the same detail workspace.
- **Rules:** no business `route.ts`; no raw fetch in components/features; no Build hook aggregate imports; server state stays in TanStack Query; responsive actions use the same commands.
- **Acceptance:** route, import-direction, bundle, hook-locality, query-scope, response-contract, history, refresh, and mobile tests pass.

### ARC-10 — Architecture evidence is repaired before implementation is deleted

- **Problem:** a provider declaration, passing focused test, route render, screenshot, or old report can be mistaken for runtime reachability or release proof.
- **Target:** each removal records current callers, runtime composition, database migration, compatibility window, replacement evidence, and rollback. Contradictory scanners are fixed or explained before changing source.
- **Acceptance:** source, static, unit, integration, browser, database, role/tenant, deployment, and operations evidence are separately recorded; no deletion relies on one evidence class. Gate counts have anti-vacuity fixtures, and the outbox scanner's reachability model agrees with an actual booted module/consumer registration check.

### ARC-11 — One planning relationship graph

- **Problem:** goals, roadmaps, products, projects, portfolios, programs, milestones, releases, opportunities, and outcomes can duplicate links, progress, ownership, and health.
- **Target module:** record owners remain distinct; a typed relationship interface owns authorized edges, direction, scope, cycle rules, and relationship history. Versioned projections calculate progress and health.
- **Acceptance:** one link vocabulary, cycle prevention, cross-tenant denial, scope-aware reads, no copied progress, and authorized drill-down from every planning surface.

### ARC-12 — Domain content stays local; collaboration delivery is shared

- **Problem:** Tickets, meetings, wiki, risks, decisions, incidents, approvals, requests, and portal surfaces repeat comments, mentions, reactions, files, activity, and notifications.
- **Target:** each domain record owns content and visibility. Shared interfaces own actor references, typed record links, comments/reactions, mention resolution, File relations, immutable activity delivery, subscriptions, and notification delivery.
- **Rule:** a subscription or mention never grants access; delivery rechecks current reachability.
- **Acceptance:** comment edit/delete/restore/moderation rules are explicit; mention/reaction dedupe works; revoked users receive no new content; portal projections expose only grant-safe collaboration.

### ARC-13 — One versioned metric and projection module

- **Problem:** Command Center, health, workload, QA, delivery, product, portfolio, program, goals, budgets, reports, exports, portal, and AI can calculate the same metric differently.
- **Target module:** metric identity, formula version, dimensions, source revisions, freshness, authorization, provenance, and drill-down query are defined once. Materialized projections are rebuildable.
- **Acceptance:** dashboard/report/export/AI equivalence, visible freshness, versioned formulas, bounded rebuild, authorized drill-down, and stale-source behavior.

### ARC-14 — Activation is a resumable provisioning module

- **Problem:** organization creation, module selection, templates, custom fields, invitations, projects, client grants, and initial work span multiple owners and can partially fail.
- **Target module:** a revisioned identity-scoped session stores intent; preview resolves dependencies/quotas; an idempotent activation run records each step and owner result; retry resumes incomplete steps.
- **Experience:** Workspace -> Products -> People; People optional; at most five visible inputs on the default Build-only path; optional adjustments use disclosure.
- **Acceptance:** six journeys, multi-module activation, concurrent retry, cross-device resume, quota changes, invitation replay, deterministic destination, and no duplicate resource.

### ARC-15 — One extension/effect runtime

- **Problem:** automations, webhooks, agents, imports, notifications, callbacks, background jobs, and AI actions each need dispatch, retry, idempotency, secrets, quotas, revocation, and evidence.
- **Target module:** domain modules own trigger/action meaning; one runtime owns durable dispatch, attempts, leases, retry/backoff, dead letter, loop/depth guards, confirmation class, secret access, rate/cost quota, cancellation, replay, and telemetry.
- **Acceptance:** outbox-first execution, duplicate delivery protection, permission recheck at execution, secret isolation, bounded retries, operator replay, and current registration proof.

### ARC-16 — Settings precedence and capability registry are explicit

- **Problem:** organization, Build, project, client, workflow, notification, retention, view, field, automation, webhook, integration, and agent settings can disagree with navigation and permissions.
- **Target:** owner interfaces resolve organization default -> module policy -> project override -> user view preference where applicable. A capability registry drives routes, navigation, searchable More, deep links, plan state, permission state, and availability explanations.
- **Rule:** hiding a capability removes navigation only; it never deletes records or invalidates authorized deep links.
- **Acceptance:** precedence, revision, cache key, audit, route/nav parity, plan lock, denied deep link, and compatibility redirect tests.

## 4. Required dependency order

1. **Authority:** ARC-01 Module Access, project reachability, ARC-16 settings precedence.
2. **Contracts:** ARC-06 wire contracts, ARC-05 File identity, ARC-08 identity decisions.
3. **Commands:** ARC-03 Project Provision/Ticket Command and ARC-14 activation.
4. **Capture:** ARC-04 Forms, Feedbucket, Intake, and Triage.
5. **Effects:** ARC-15 outbox, automation, webhook, agent, notification, import, and AI execution.
6. **Relationships:** ARC-11 planning graph and ARC-12 collaboration links.
7. **Projections:** ARC-07 collections and ARC-13 metrics, workload, quality, delivery, and client reporting.
8. **Experience:** ARC-09 frontend workflows and ARC-16 capability-driven navigation.

An implementation package may move later in this order only when its prerequisite interfaces are already merged and verified at the evidence level required by that package. Parallel work is allowed only across non-overlapping seams recorded in the work-package registry.

## 5. Access evaluation for every action

Evaluate all applicable layers in this order:

1. **Organization standing:** Owner/Admin may enter enabled modules; Member needs explicit module assignment.
2. **Module standing:** module Owner/Admin/Member or approved custom role supplies permission candidates.
3. **Project reachability:** project membership, team assignment, or explicit authorized relationship narrows module scope.
4. **Record reachability:** record project, lifecycle, confidentiality, and client visibility are resolved from canonical state.
5. **Action and field policy:** create, read, update, assign, transition, link, comment, delete, restore, export, and sensitive fields are independent decisions.
6. **External projection:** a Portal grant supplies a smaller field/action set and never reuses internal authorization.

Every query, command, cache entry, search, export, event consumer, background job, AI tool, signed file, and notification applies the relevant layers. UI visibility is only a usability projection.

## 6. Current gate snapshot

### Passed static/source gates at the snapshot

- Build module registration and core-surface census.
- Permission catalog and frontend permission parity.
- route-parameter schema and thin-route gates.
- cache key/invalidation shape gates.
- record lifecycle read, gated-read, and permission-binding gates.

### Failed or inconclusive gates

- stale generated frontend Build contracts;
- missing restore operations in the contract registry;
- four list projection mismatches and unresolved handlers;
- three unclassified/unbounded Build reads;
- Build type-assertion ledger drift;
- Build list-surface exception and frontend import-direction leaks;
- RBAC ledger stale counts and optional suites not executed;
- outbox scanner reports three unregistered consumers while module source appears to register them.

### Unavailable runtime evidence

- target-database tenant relationship checks and buffered query plans;
- migration replay and rollback rehearsal;
- seeded cross-tenant and role browser flows;
- cache revocation timing;
- worker/provider outage recovery;
- deployed revision identity, observability, backup, and restore proof.

These gaps prohibit a release or production-readiness claim. They do not invalidate the planned architecture.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] ARC-01: make Module Access the sole positive Build assignment and revocation authority, then migrate invitation, group, delegation, and administration writers with permission-version and audit evidence.
- [ ] ARC-02/05: keep Timesheets as the time-ledger owner and Files as the attachment-byte owner; move Build callers to contextual adapters and reconcile existing data before removing duplicate implementations.
- [ ] ARC-03/14: route project and ticket creation/change through Project Provision and Ticket Command; make Workspace → Products → optional People activation durable, idempotent, resumable, and quota-aware.
- [ ] ARC-04: separate Forms capture, Feedbucket evidence, Triage processing, and Intake project requests; conversion to a ticket or project must use canonical commands and retain source mapping.
- [ ] ARC-06/07: generate one strict wire contract and serve bounded, tenant-scoped, permission-scoped collection projections with FilterEnvelope v1, stable cursors, matching counts, and query-plan proof.
- [ ] ARC-08: measure primary/join assignee parity, Bug/Ticket identity, client link cardinality, and derived time usage; use compatibility reads/writes, backfill comparison, and reversible removal before dropping any schema.
- [ ] ARC-09/16: enforce workflow-oriented frontend import direction and one capability registry for routes, navigation, plan locks, searchable More, and preserved authorized deep links.
- [ ] ARC-11/12/13: centralize typed planning relationships, shared collaboration delivery, and versioned metrics while keeping domain content, visibility, and source records with their owners.
- [ ] ARC-15: converge automation, webhook, agent, import, notification, callback, and AI effects on one observable, idempotent runtime that rechecks authority at execution.
- [ ] ARC-10: resolve contradictory scanners, generated-contract drift, unbounded reads, duplicate identities, and open gate failures before deleting implementations; retain a caller and migration ledger.
- [ ] Follow the authority → contracts → commands → capture → effects → relationships → projections → experience dependency order; claim parallel work only for non-overlapping interfaces in the work-package registry.
- [ ] For every action, prove organization standing, module standing, project/record reachability, and action/field policy across API, browser, jobs, cache, export, AI, and client projections; obtain target-database and deployed recovery evidence before release.
