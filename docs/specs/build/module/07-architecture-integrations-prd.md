# BLD-07 — Architecture and Cross-Module Integration PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Build has one definition for each domain job and composes with the rest of
StreamlineOS through explicit ownership, tenant-safe links, durable events, and
permission-safe projections. It does not recreate CRM, Calendar, Meetings,
Files, Knowledge, Timesheets, Accounting, Chat, Mail, Notifications, or Goals.

## Current Architecture Findings

- `sprints` and `cycles` are separate tables with overlapping project, name,
  dates, status, and ticket-assignment responsibilities.
- tickets store both `sprintId` and `cycleId`, and the UI exposes both filters
  and routes.
- project automation is represented by both `/automations` and
  `/project-automations`.
- project Calendar, Gantt, Timeline, saved Views, Workflow, Integrations,
  Webhooks, Members, AI, agent policy, and agent credentials are split across
  operational and configuration routes with overlapping ownership.
- product roadmap and project roadmap can present the same term for different
  jobs.
- QA bugs and ticket type `BUG` can create dual work-item lifecycles.
- generic project Intake overlaps configurable Forms plus Triage, while
  Analytics overlaps the Agile Reports surface.
- **Resolved 2026-09-23:** PM Workspace is removed entirely (BLD-00 D01), not
  reconciled to one directory path. Organization owns Products, Projects,
  Teams, Programs, and Portfolios directly.
- Build integrations currently place Git configuration and agent credentials
  on the same module settings page despite different lifecycle and security
  ownership.
- `projects-ticket-subresources.service.ts` is currently 570 lines and crosses
  the hard review threshold while owning several ticket subresource jobs.
- frontend request schemas, response contracts, query keys, and backend Zod
  schemas need a declared generation/parity owner.
- ticket detail responses omit `assignees` from the backend Zod contract while
  the query and frontend require it; `applyContract` throws on those reads.
- `project_client_grants.expires_at` exists, but portal list/read/write still
  accept `ACTIVE` grants after expiry.
- ticket `customer_id` still foreign-keys the legacy `clients` table while the
  picker writes CRM organization IDs.
- Git ingress advertises Bitbucket, verifies non-GitLab providers as GitHub,
  acknowledges webhooks before durable processing, and stores the webhook
  secret in the Build schema.
- `BuildCalendarSource` emits only ticket due dates, skips deleted-row filters,
  and returns a capped array that the calendar registry treats as complete.
- charged Build AI calls discard usage metadata through `unwrapAiResult`
  except on comment drafts; most surfaces omit `aiUsage`.

## Canonical Domain Decisions

### Iteration

Normative BLD-00 contract:

- one canonical `Cycle` domain record and `/cycles` route;
- project terminology preference displays `Cycle`, `Sprint`, or
  another approved label without changing API/storage identity;
- one ticket relation, one permission family, one filter, one analytics owner;
- cadence, completion, carry-over, velocity, and events use the same record.

- [ ] **BLD-07-001** inventory live Sprint/Cycle rows, links, analytics,
  templates, automations, views, notifications, and portal projections.
- [ ] **BLD-07-002** define deterministic merge/mapping rules and conflict
  report before migration.
- [ ] **BLD-07-003** backfill and cutover preserve IDs or provide a complete
  reference map.
- [ ] **BLD-07-004** delete duplicate columns, tables, services, permissions,
  routes, hooks, types, and tests after verified cutover.

### Defect

Normative BLD-00 contract:

- ticket type `BUG` is the canonical actionable defect;
- QA stores test evidence, environment, reproduction, and result linkage;
- one status, assignee, priority, comments, dependencies, and client visibility
  lifecycle;
- QA views are filtered projections, not duplicate bug records.

- [ ] **BLD-07-005** compare every QA bug field and behavior with ticket BUG.
- [ ] **BLD-07-006** migrate unique QA evidence to an extension/relation owned
  by QA and link it to the canonical ticket.
- [ ] **BLD-07-007** remove independent duplicate mutation and route owners.

### Roadmap and Planning

- product roadmap owns outcome, customer evidence, release intent, and product
  prioritization;
- organization roadmap is a roll-up of product roadmap records;
- project timeline, milestones, releases, and issues own execution dates;
- no project record is silently promoted to a product outcome.

- [ ] **BLD-07-008** define explicit product-roadmap-to-project-work links and
  progress calculation.
- [ ] **BLD-07-009** consolidate project Roadmap/Gantt/Timeline duplicates
  according to BLD-02B.

## Source-of-Truth Matrix

| Domain | Canonical owner | Build responsibility |
|---|---|---|
| Organization/person identity | Auth/Directory | Store tenant-safe membership/reference IDs and project roles |
| Customer/contact/account | CRM | Link delivery work and show permission-safe customer context |
| Calendar event | Calendar | Publish Build source events and open `/calendar` with scope filters |
| Meeting/event/minutes | Meetings | Link project/issues, decisions, and action items; do not duplicate attendee truth |
| Binary file/document | Files/Documents | Store authorized links and Build relation metadata |
| Knowledge page | Knowledge Base | Link specifications, decisions, runbooks, and search results |
| Time entry/approval/rate | Timesheets | Show project/ticket summaries and launch scoped log-time |
| Ledger/cost/invoice | Accounting | Show authorized budget/actual projections and source drill-down |
| Customer goal/OKR | Goals | Link project/product contribution and evidence |
| Chat channel/message | Chat | Link scoped discussions; never copy full conversation into Build |
| Email/thread | Mail | Link authorized customer/vendor correspondence |
| Notification delivery | Notifications | Emit typed Build events; Inbox owns Build work-state projection |
| Integration connection/token | Integrations/Composio | Store connection reference and Build mapping, never provider token |
| AI model usage/billing | AI gateway/billing | Supply scoped context and action proposals with usage metadata |
| Client authentication/grant | Client Portal | Publish explicit Build projection under portal identity |

- [ ] **BLD-07-010** every matrix row has an owner-approved read/write/event
  contract and data-retention rule.
- [ ] **BLD-07-011** Build tables contain only canonical IDs, relation metadata,
  and intentional snapshots; copied mutable fields have a reconciliation rule.
- [ ] **BLD-07-012** deleting or archiving a source record has defined Build
  behavior without dangling unsafe links.

## Integration Workflows

### CRM

- link customer/account/contact to product, project, ticket, feedback, release,
  and client portal grant;
- show delivery health and updates in CRM through source links or authorized
  projections;
- create CRM follow-up from Build only through CRM APIs and permissions;
- customer search is server-side and tenant scoped.

### Unified Calendar

Build contributes:

- project dates;
- issue start/due dates;
- canonical iterations;
- milestones and releases;
- meetings;
- approval/change deadlines; and
- incident review dates.

Each event includes source type/ID, permission-aware title, start/end, status,
owner, source color, and deep link. Calendar toggles sources and never receives
records the actor cannot open.

### Meetings, Chat, and Mail

- attach a project/ticket/product agenda context to a meeting;
- convert an approved action item into a ticket with idempotent source linkage;
- link chat or mail threads instead of copying private content;
- mentions and assignments emit Notification events once;
- removal of source access removes the Build preview.

### Knowledge, Documents, and Files

- link specs, decisions, requirements, postmortems, runbooks, and release notes;
- search respects source ACL and does not index unauthorized body text into
  Build;
- file upload and retention use the platform binary owner;
- client publication is a separate approved projection.

### Timesheets and Accounting

- log time from a ticket with token-derived actor;
- summarize approved/unapproved time according to permission;
- budget versus actual uses Accounting/Timesheets sources and records freshness;
- sensitive rates, salaries, margins, and ledger data never enter general
  project responses.

### Goals, Roadmap, and Client Progress

- link goal outcomes to product roadmap and project evidence;
- calculate progress from explicit contribution policy;
- publish approved updates, releases, milestones, roadmap items, files, and
  issues to clients;
- preview as each client grant before publish;
- revoke immediately without waiting for cache expiry.

- [ ] **BLD-07-013** each workflow has positive, denied, cross-tenant,
  source-deleted, stale-cache, and retry tests.
- [ ] **BLD-07-014** integration writes use existing idempotency and durable
  outbox machinery.
- [ ] **BLD-07-015** no provider call executes inside a database transaction.

## Event Contract

Typed events include:

- event ID and version;
- organization and source scope;
- actor or system identity;
- source entity type and ID;
- action and occurred-at time;
- minimal non-sensitive payload;
- correlation and causation IDs; and
- idempotency/deduplication key.

Consumers re-authorize reads; an event is not a data-access grant.

- [x] **BLD-07-016** inventory Build event producers and consumers. The only orphaned Build event was removed because incident status already persists a timeline entry and audit record, with no downstream consumer or user job for an outbox delivery.
- [ ] **BLD-07-017** remove duplicate direct side effects where an owned outbox
  event exists.
- [ ] **BLD-07-018** version compatibility, replay, poison message, and
  dead-letter recovery are tested.

## Settings Ownership

Build module settings own:

- terminology and defaults;
- access and client grants;
- workflow, fields, templates, automations, integrations, and retention.

Project settings own project-specific values. Product settings own their
scope-specific values. There is no Workspace settings scope. Operational
queues and records remain on operational pages.

- [ ] **BLD-07-019** every setting has one scope, storage owner, API, cache key,
  permission, and UI route.
- [ ] **BLD-07-020** inherited defaults display source and override state.
- [ ] **BLD-07-021** changing a default never rewrites existing records unless
  an explicit migration is confirmed.

## Code and Contract Architecture

- one canonical schema/type/helper/query key per job;
- no alias re-exports outside sanctioned barrels;
- neutral shared contracts do not import feature runtime code;
- controllers remain thin and services own business behavior;
- frontend features call owned Query hooks, not parallel ad hoc APIs;
- request/response artifacts have one generation source and drift gate;
- files remain cohesive and under repository review gates;
- import graph remains acyclic without `forwardRef` or dynamic-import hiding.

- [ ] **BLD-07-022** duplicate-symbol and parallel-contract scan covers both
  repositories.
- [ ] **BLD-07-023** oversized Build files are split only by responsibility,
  with no pass-through wrappers or duplicate helpers.
- [ ] **BLD-07-024** dead-code candidates are proven with module graph plus
  real frontend/backend build before deletion.
- [ ] **BLD-07-025** cycle self-tests run before cycle gates in both repos.

## Agentic Product Contract

- AI context includes only records the actor may read.
- Suggestions cite source records and freshness.
- consequential actions produce a typed proposal with exact field diff,
  affected records, cost, permissions, and expiration.
- approval revalidates authorization and record versions.
- partial or failed execution is explicit and retry safe.
- usage is token metered and returned through the AI gateway contract.

- [ ] **BLD-07-026** client-visible AI content requires human approval.
- [ ] **BLD-07-027** prompt, tool, output, and audit retention follow data
  classification.
- [ ] **BLD-07-028** revoked access removes cached AI context and invalidates
  outstanding proposals.
- [ ] **BLD-07-029** every CRM/customer reference stores one canonical,
  tenant-composite CRM/Party identifier; legacy `clients` IDs are migrated
  with a collision report before any foreign key is changed.
- [ ] **BLD-07-030** Client Portal grants are the sole external project-access
  authority; every read and write enforces status, expiry, projection version,
  and immediate revocation, and internal preview executes the same projection.
- [ ] **BLD-07-031** Build writes another module's records only through that
  owner's exported command/service contract; temporary direct-table reads name
  an owner, retention rule, freshness contract, and deletion cutover.
- [ ] **BLD-07-032** every user-visible notification, chat/mail publication,
  automation, webhook, and source synchronization is either transactionally
  committed with the initiating write or emitted through a replayable,
  idempotent outbox event.
- [ ] **BLD-07-033** inbound provider events are acknowledged only after a
  verified, tenant-resolved, deduplicated durable receipt; processing failure
  remains retryable and an advertised provider has signature, parser, replay,
  and negative tests.
- [ ] **BLD-07-034** every cross-module collection has stable ordering,
  cursor/continuation or an explicit truthful truncation flag, freshness,
  source-deleted behavior, and an org-leading supporting index.
- [ ] **BLD-07-035** backend Zod operation schemas are the API contract owner;
  generated OpenAPI, the vendored frontend artifact, frontend Zod contracts,
  and derived TypeScript types pass registry, vendor, parity, and response-seam
  gates in that order.
- [ ] **BLD-07-036** every charged Build AI response returns `aiUsage` and
  correlation ID, renders cost/usage consistently, and preserves a
  deterministic non-AI path for exhausted credits or unavailable providers.

## Acceptance

- [ ] **BLD-07-A01** every Build record and configuration value has exactly one
  canonical owner.
- [ ] **BLD-07-A02** Sprint/Cycle, bug/ticket, automation, roadmap, calendar,
  view, workflow, and integration duplications are resolved or explicitly
  proven distinct.
- [ ] **BLD-07-A03** integration contract tests pass with real module APIs and
  tenant/access isolation.
- [ ] **BLD-07-A04** durable event retry/replay and provider-failure tests pass.
- [ ] **BLD-07-A05** both repos build and report zero circular dependencies
  after non-vacuous self-tests.
- [ ] **BLD-07-A06** expired, revoked, cross-tenant, duplicate, and stale
  portal grants fail at every list, detail, download, and mutation entry point.
- [ ] **BLD-07-A07** contract, cycle, file-size, event, and bounded-collection
  gates are conclusive and green; frozen debt or inconclusive output is not
  release evidence.
- [ ] **BLD-07-A08** CRM, Calendar, Meetings, Files, KB, Timesheets,
  Accounting, Goals, Chat, Mail, Notifications, Integrations, AI, and Portal
  each have one named owner and a tested source-deletion/revocation path.
