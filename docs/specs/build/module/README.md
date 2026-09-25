# Build Module Completion Program

## Purpose

This directory is the normative acceptance catalog for bringing the entire
Build module to a release-ready product standard. It covers page ownership,
navigation, filters, views, pagination, ticket interaction, validation,
authorization, data performance, cross-module integration, visual hierarchy,
competitor parity, and release evidence.

Agent scheduling, reservations, session-sized TODOs, and evidence-state
transitions live only in the
[`Build execution` ledger](../README.md). The checkboxes in this
directory are aggregation criteria and must not be assigned directly to an
agent or ticked from an agent summary.

The existing
[`Build sidebar`](../sidebar/README.md) program is a subordinate
navigation dependency. Its tasks are linked rather than duplicated here.

## Source Snapshot

The baseline was audited on 2026-09-19 against:

- `frontend/app/(authenticated)/build/**`
- `frontend/features/build/**`
- `frontend/hooks/api/build/**`
- `frontend/lib/build/**`
- `backend/src/modules/build/**`
- `backend/src/db/schema/build/**`
- `frontend/PAGES.md`
- the Build sidebar design and its five delivery PRDs

The second-pass source inventory currently contains:

- 65 unique authenticated `app/(authenticated)/build/**/page.tsx` routes;
- 5 internal or external portal pages: internal preview index/detail, external
  client portal index/detail, and invitation acceptance;
- 4 public Build pages: published form, legacy public intake, shared board, and
  public roadmap; the shared Wiki remains a Knowledge-owned integration;
- 49 controllers and 325 HTTP handlers under `backend/src/modules/build/`;
- 36 schema files and 86 tenant tables under `backend/src/db/schema/build/`;
  and
- cross-module Build dependencies in Chat, Knowledge, Goals, CRM, Calendar,
  Meetings, Files, Timesheets, Accounting, Notifications, Integrations, AI,
  Feedbucket, and Client Portal.

Unchecked items are requirements, not claims that functionality is absent.
Current-source findings identify defects already proven in code. Every item
must be rechecked at implementation time because the working tree is active.

## Recheck Verdict

The Build module is **not complete**.

The documentation census now accounts for the current 74-route Build census
(65 authenticated pages plus nine portal/public routes) in BLD-01A, every
current/final page's product contract in BLD-02C through BLD-02F, the current
mutation surfaces in BLD-05A, the 49-controller/325-handler matrix in BLD-06A,
and all 36 Build schema files in BLD-06B. That is
documentation coverage, not shipped evidence.

Confirmed open defects include route/catalog drift, duplicate Sprint/Cycle and
Reports/Analytics owners, incomplete filtered-board paging/counts, client-side
filtering of paged results, misleading cross-project bulk failure behavior,
ticket contract drift, missing import UI, sparse dirty-state coverage, inline
schema duplication, ticket-subresource scope bypasses, same-project FK gaps,
timesheet fail-open billing, destructive deletion, expired portal grants,
legacy CRM customer IDs, ticket `assignees` contract throws, advertised
Bitbucket Git ingress with non-durable webhook side effects, calendar
sources that can lie about truncation, discarded AI usage metadata, and
unapplied or unverified migrations.

Partial browser smoke on 2026-09-19 against a running frontend at
`http://localhost:1000` confirmed `/build` loads All Projects, `/build/1/issues`
renders a board, Drafts still links to `/build/drafts`, Cycles still links to
`/sprints`, Timeline remains a standalone destination, and the listed
organization routes return HTTP 200. That is reachability proof, not journey
completion.

## Completion Authority

This README is the parent acceptance roll-up. It is not the task scheduler. A
child PRD remains authoritative for its own acceptance items, while packet
status lives in the Build execution ledger. A parent checkbox may be checked
only when:

1. every required child item is checked;
2. the child file records exact source, test, browser, database, or deployed
   evidence;
3. unresolved external checks remain visibly open;
4. `frontend/PAGES.md` matches the shipped route manifest and root `PAGES.md`
   records the delivery evidence as an operator changelog rather than a second
   route inventory; and
5. the final release PRD accepts the integrated frontend/backend revision pair.

Passing types, mocks, or unit tests alone does not close a customer journey.

## Product Contracts

- Organization, Managed Product, Project, and Work Item are distinct scopes.
  PM Workspace is removed (BLD-00 D01) — Organization owns Products, Projects,
  Teams, Programs, and Portfolios directly. Managed-product links are optional
  so the product remains usable by a freelancer; a project without a product
  is an organization-level project.
- Product management and project delivery share Build but never merge their
  records or page responsibilities.
- Project work opens on Overview or Issues intentionally; query parameters
  must never be copied onto an unrelated page.
- One canonical iteration entity replaces the current ambiguous Sprint/Cycle
  duplication. The workspace may display the label `Cycle` or `Sprint`; the
  URL, API, storage, permissions, filters, and analytics stay canonical.
- `/calendar` is the only calendar. Build contributes permission-scoped event
  sources and deep links; it does not own a parallel project calendar.
- Module configuration lives under Build settings. Operational work remains
  outside settings.
- CRM, Meetings, Files/Documents, Knowledge, Timesheets, Accounting, Chat,
  Mail, Notifications, and Calendar remain sources of truth for their own
  records. Build stores scoped links, projections, and workflow state only.
- Client visibility is explicit per record and deny-by-default. Internal notes,
  costs, permissions, AI traces, and audit data never inherit client access.
- AI proposes or drafts consequential work. The actor reviews the exact diff,
  permissions are rechecked at execution, and every action is auditable.

## Acceptance Workstreams

- [ ] [BLD-00 — Normative product and architecture decisions](./00-product-decisions-prd.md)
- [ ] [BLD-01 — Route and navigation integrity](./01-route-navigation-prd.md)
- [ ] [BLD-01A — Canonical Build route manifest](./01a-canonical-route-manifest-prd.md)
- [ ] [BLD-01B — Route access, action, data-scope, and persona matrix](./01b-route-access-persona-matrix-prd.md)
- [ ] [BLD-02A — Organization, workspace, and product pages](./02a-cross-scope-pages-prd.md)
- [ ] [BLD-02B — Project page disposition and anatomy](./02b-project-pages-prd.md)
- [ ] [BLD-02C — Organization page contracts](./02c-organization-page-contracts-prd.md)
- [ ] [BLD-02D — Workspace, product, and public page contracts](./02d-scope-public-page-contracts-prd.md)
- [ ] [BLD-02E — Project delivery page contracts](./02e-project-delivery-page-contracts-prd.md)
- [ ] [BLD-02F — Project control and settings page contracts](./02f-project-control-page-contracts-prd.md)
- [ ] [BLD-03 — Search, filters, views, sorting, and pagination](./03-discovery-views-pagination-prd.md)
- [ ] [BLD-04 — Ticket cards, bulk actions, workflow, and settings](./04-ticket-workflow-prd.md)
- [ ] [BLD-05 — Forms, validation, contracts, and unsaved work](./05-forms-validation-prd.md)
- [ ] [BLD-05A — Form and mutation surface matrix](./05a-form-surface-matrix-prd.md)
- [ ] [BLD-06 — API, authorization, database, cache, and performance](./06-data-performance-prd.md)
- [ ] [BLD-06A — Backend resource, query, cache, and schema matrix](./06a-backend-resource-matrix-prd.md)
- [ ] [BLD-06B — Database schema and index matrix](./06b-database-schema-matrix-prd.md)
- [ ] [BLD-07 — Architecture and cross-module integration](./07-architecture-integrations-prd.md)
- [ ] [BLD-08 — Visual hierarchy, responsive UX, and accessibility](./08-visual-accessibility-prd.md)
- [ ] [BLD-09 — Competitor baseline and product differentiation](./09-competitor-parity-prd.md)
- [ ] [BLD-10 — Release verification and rollout](./10-release-verification-prd.md)

The Build module is complete only when all twenty-one parent items are checked.

## Acceptance Roll-up Order

The items below express dependency and release closure. Dispatch only the
session-sized packets in the Build execution ledger; do not assign these
aggregate boxes to agents.

### Phase 0 — Lock Product and Data Decisions

- [ ] **BLD-00-012** Complete the first-party competitor baseline and select
  deliberate non-goals before final page/feature scope is locked.
- [ ] **BLD-00-001** Reconcile every route disposition and page contract in
  BLD-02A through BLD-02F to the normative BLD-00 decisions.
- [ ] **BLD-00-002** Record the canonical Cycle and BUG migration maps,
  dependencies, owners, and cutover gates.
- [ ] **BLD-00-003** Reconcile Build-sidebar design and tracker requirements to
  optional workspaces, Inbox Drafts, and canonical paths without rewriting
  historical evidence.
- [ ] **BLD-00-004** Lock source-of-truth ownership for every integration in
  BLD-07 with no alternative duplicate model.
- [ ] **BLD-00-014** Close contract registry, vendor, parity, response-coverage,
  file-size, cycle, and event gates with conclusive evidence from one revision.
- [ ] **BLD-00-015** Retire `projects.clientMembershipId` as external portal
  authority and prove one grant/projection path for preview and portal sessions.
- [ ] **BLD-00-016** Complete the owner/API/event/retention/index matrix for
  every BLD-07 source-of-truth row before cross-module acceptance.
- [ ] **BLD-00-017** Complete D12 advertised-provider cutover: remove
  unimplemented Git providers from selectors, move webhook secrets to
  Integrations, and acknowledge ingress only after a durable receipt.

### Phase 1 — Repair Reachability and Contracts

- [ ] **BLD-00-005** Complete BLD-01 route integrity, BLD-01A manifest
  reconciliation, and BLD-01B access/persona parity.
- [ ] **BLD-00-006** Complete page moves, additions, removals, components,
  filters, views, pagination, overlays, and data contracts from BLD-02A through
  BLD-02F.
- [ ] **BLD-00-007** Complete request/response, validation, and database
  prerequisites from BLD-05, BLD-05A, BLD-06, BLD-06A, and BLD-06B.

### Phase 2 — Complete Customer Workflows

- [ ] **BLD-00-008** Complete discovery, view, board, table, and pagination
  behavior from BLD-03.
- [ ] **BLD-00-009** Complete ticket, bulk, workflow, and settings behavior from
  BLD-04.
- [ ] **BLD-00-010** Complete cross-module and client progress workflows from
  BLD-07.

### Phase 3 — Product Quality and Release

- [ ] **BLD-00-011** Complete visual and accessibility acceptance from BLD-08.
- [ ] **BLD-00-013** Complete BLD-10 against one reviewed frontend/backend
  revision pair.

## Dependency and Ownership DAG

| Workstream | Requires | Produces; cannot reopen |
|---|---|---|
| BLD-09 | Current product census | Evidence-backed table stakes and explicit non-goals |
| BLD-00 | BLD-09 decision inputs | Workspace, Drafts, Cycle, BUG, Settings, route-owner, portal, advertised-integration, and duplicate-hub decisions |
| BLD-01A | BLD-00 | Stable current-to-final page IDs and canonical paths |
| BLD-01B | BLD-00, BLD-01A | Route/action permissions, personas, and data-scope contract |
| BLD-02A–F | BLD-00, BLD-01A, BLD-01B | Page jobs, components, filters, views, overlays, pagination, states, and data contracts |
| BLD-03 | BLD-00, BLD-02C–F | One discovery vocabulary and collection strategy |
| BLD-04 | BLD-00, BLD-02E–F, BLD-03 | Ticket/view/workflow/bulk behavior |
| BLD-05A | BLD-01A, BLD-02C–F | Exact mutation-surface census and save models |
| BLD-05 | BLD-04, BLD-05A | Form/API/database parity and unsaved-work behavior |
| BLD-06A/B | BLD-00, source census | Backend resource and database accountability |
| BLD-06 | BLD-02C–F, BLD-03, BLD-05, BLD-06A/B | Authorization, query, cache, transaction, and performance closure |
| BLD-07 | BLD-00, BLD-06A/B | Canonical owners, integrations, events, and acyclic architecture |
| BLD-01 | BLD-01A, BLD-01B, BLD-02C–F, BSN route/scope contracts | Reachability, access parity, back/deep-link migration |
| BLD-08 | BLD-02C–F, BLD-04, BLD-05A | Route-applicable visual, responsive, state, and accessibility evidence |
| BLD-10 | Every preceding workstream | Integrated revision-pair release decision |

Build-sidebar PRDs own shell structure, scope selector, sidebar lifecycle, and
shell verification. Build-module PRDs reference those IDs and own page/domain
behavior; they do not create a second sidebar implementation contract.

## Evidence Levels

- **Source proof** — confirms wiring, ownership, or a static defect.
- **Unit/contract proof** — confirms a bounded behavior with controlled data.
- **Database proof** — confirms authorization, plans, constraints, and
  transaction behavior in a named disposable environment.
- **Browser proof** — confirms routing, keyboard behavior, responsive layout,
  focus, overlays, and customer-visible states.
- **Deployed proof** — confirms migrations, providers, observability, rollback,
  and production-like performance.

Each checked item must name the evidence level. Inference must be labelled as
inference.

## Program Definition of Done

- [ ] No Build navigation, card, table row, command, notification, or back
  action reaches a missing or semantically wrong destination.
- [ ] Every retained page has an owner, required customer job, permission,
  loading/error/empty/denied state, bounded collection strategy, and primary
  action.
- [ ] Every filter is URL-shareable, server-enforced, permission-safe, and
  truthful for the full result set.
- [ ] Every mutation validates the same business contract at form, API, and
  database boundaries without parallel schemas drifting.
- [ ] Bulk, drag, retry, and offline behavior cannot silently lose, duplicate,
  or partially misrepresent work.
- [ ] Query plans, cache writers, invalidation, and cross-tenant isolation are
  proven with realistic data.
- [ ] Freelancer, agency, SMB, enterprise, and external-client journeys pass.
- [ ] Relevant focused tests, type checks, builds, cycle gates, browser checks,
  migrations, rollback, and monitoring evidence are recorded in BLD-10.
