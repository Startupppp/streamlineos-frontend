# BLD-00 — Normative Product and Architecture Decisions

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Authority

These decisions remove ambiguity across the Build-module and Build-sidebar
documents. They are normative unless the user explicitly changes one. Older
design text and completed evidence must be reconciled to these contracts before
implementation can close.

## D01 — Workspace Is Optional

- A freelancer or small team can create a standalone project with
  `pmWorkspaceId = null`.
- Current storage contradicts this: `projects.pmWorkspaceId` is `NOT NULL` and
  the frontend project contract requires a string. Schema, APIs, create forms,
  and response contracts must become nullable; no hidden default workspace may
  be invented to satisfy the old column.
- An organization may use workspaces to group access and work, but the product
  does not invent a hidden default workspace to satisfy the hierarchy.
- Workspace-scoped create preselects its workspace. Organization-scoped create
  offers `No workspace` plus backend-paged accessible workspaces.
- Moving into or out of a workspace revalidates memberships, product links,
  client grants, saved views, and defaults.
- Managed Product linkage is also optional and never substitutes for Project.

- [ ] **BLD-00-D01-A** sidebar design, quick create, schema nullability, create
  forms, APIs, scope resolver, and tests agree that workspace is optional.

## D02 — Drafts Stay Discoverable but Lose a Standalone Page

- `Drafts` remains a stable My Work destination because recoverability matters.
- Its canonical URL is `/build/inbox?view=drafts`.
- `/build/drafts` is deleted only after draft list, resume, discard, expiry,
  source link, badge, dirty navigation, and deep-link parity.
- Draft storage remains actor, organization, scope, and record keyed.

- [ ] **BLD-00-D02-A** sidebar catalog, command palette, notifications, route
  manifest, and tests use the Inbox Drafts destination with zero old callers.

## D03 — One Canonical Iteration

- The canonical domain and URL are `Cycle` and `/cycles`.
- Workspace/project settings may display `Cycle`, `Sprint`, or another approved
  label without changing route, API, permission, cache, schema, event, filter,
  or analytics identity.
- Canonical permission keys are `build:cycles:view` and
  `build:cycles:manage`; current Sprint role/custom-role assignments migrate
  atomically and the old keys are removed after compatibility cutover.
- Existing Sprint and Cycle rows are reconciled through a field-level migration
  and conflict report.
- There is one ticket relation, one active-iteration policy, one carry-over
  flow, and one velocity definition.
- No alternative two-model outcome remains available in BLD-07.

- [ ] **BLD-00-D03-A** schema, migrations, services, routes, nav, filters,
  reports, templates, automations, events, portal, and tests use one identity.

## D04 — Ticket BUG Is the Actionable Defect

- Ticket type `BUG` owns title, status, priority, assignee, hierarchy,
  dependencies, comments, attachments, time, client visibility, and workflow.
- QA owns test suites, cases, runs, results, environment, reproduction evidence,
  and the relation to the canonical BUG ticket.
- A failed test may create or link one BUG idempotently.
- The independent QA bug lifecycle is migrated and removed after evidence
  preservation.

- [ ] **BLD-00-D04-A** every QA bug field has a keep/migrate/drop mapping and no
  duplicate actionable lifecycle remains.

## D05 — Settings Paths Follow Scope Ownership

- Organization Build settings: `/build/settings/*`.
- Workspace settings:
  `/build/workspaces/{pmWorkspaceId}/settings/*`.
- Managed Product settings:
  `/build/managed-products/{managedProductId}/settings/*`.
- Project settings: `/build/{projectId}/settings/*`.
- Global `/settings/*` owns platform/organization configuration only, never
  Build module or project configuration.
- Operational queues, run history, approvals, incidents, and customer work do
  not move into Settings.

- [ ] **BLD-00-D05-A** every settings row has one canonical scope/path,
  permission, schema, API, cache owner, inheritance rule, and dirty-state test.

## D06 — Canonical Collection Names and Scope Roots

- Organization collections use plural nouns:
  `/build/goals`, `/build/workspaces`, `/build/managed-products`,
  `/build/portfolios`, `/build/programs`, `/build/teams`.
- Workspace root `/build/workspaces/{pmWorkspaceId}` owns Projects; `/overview`
  owns workspace summary.
- Managed Product root owns product Overview.
- Project root owns Project Overview; `/issues` owns all issue layouts.
- Current singular `/build/goal` and directory `/build/pm-workspaces` are moved
  and deleted after caller migration.
- The project collaborative canvas remains singular `/whiteboard` because the
  product currently owns one board per project. If multiple boards are later
  supported, that is a new data migration and route decision.

- [ ] **BLD-00-D06-A** route manifest, physical pages, nav, access rules,
  emails/notifications, public links, and `frontend/PAGES.md` match these names.

## D07 — Calendar, Timeline, Workload, and Saved Views

- `/calendar` is the only Calendar and receives Build event sources.
- Issues owns Board, List, Table, and Timeline layouts.
- Workload remains a dedicated page because capacity uses different data,
  permissions, and filters.
- Saved-view creation and daily management live in Issues; administrative
  visibility/default/archive controls may live in Project Settings.
- Standalone project Timeline and Views routes are deleted after parity.

- [ ] **BLD-00-D07-A** view switchers, deep links, saved-view schema, filters,
  and route files have one owner each.

## D08 — Intake Uses Forms and Triage

- Forms owns configurable published intake definitions and submissions.
- Triage owns classification, duplicate merge, reject, and conversion to work.
- Feedbucket remains separate because screenshot/recording/widget evidence is a
  distinct capture channel, but it converts into the same Triage/Ticket model.
- Generic authenticated/public Intake routes migrate to Forms + Triage and are
  deleted after history, links, and tokens are preserved.

- [ ] **BLD-00-D08-A** form, intake, triage, and feedback records have one
  submission/provenance contract and no duplicate accepted-work lifecycle.

## D09 — Analytics and Reports Have One Owner

- Project Reports owns analytics overview, velocity, burnup, cumulative flow,
  cycle/lead time, critical path, accessible source tables, filters, exports,
  definitions, and freshness.
- `/analytics` is consolidated into Reports Overview.
- Every metric links to the exact authorized source predicate.
- Cache revision, invalidation, and canonical Cycle terminology are shared.

- [ ] **BLD-00-D09-A** analytics/report endpoints, charts, filters, exports,
  cache keys, and routes are consolidated without metric drift.

## D10 — Internal Preview and External Portal Are Different Identities

- `/portal/*` is an employee-authenticated preview/read surface requiring Build
  portal permission.
- `/client-portal/*` is external and uses portal identity plus explicit grants.
- `/accept-invitation` exchanges a single-use invitation for the approved
  external session.
- Preview and external detail use the same field projection for a selected
  grant, while authentication and actions remain separate.
- Every portal list, detail, download, and mutation enforces grant status and
  `expires_at IS NULL OR expires_at > now()`; expiry is not a UI-only label.

- [ ] **BLD-00-D10-A** route access, projection parity, invitation replay,
  expiry, revocation, cache, and cross-tenant tests pass for both identities.

## D11 — Do Not Create Duplicate Hubs

- Project Overview owns bounded recent activity; each record owns its complete
  activity. There is no standalone project Activity page.
- Risks, decisions, approvals, changes, and incidents remain direct
  destinations. There is no Governance hub that repeats them.
- CRM owns customers, Timesheets owns time entries/approvals, Command Center
  owns durable agent runs, and `/calendar` owns calendar events.
- Build pages may show permission-safe summaries and source links without
  creating a second operational owner.

- [ ] **BLD-00-D11-A** proposed Activity, Governance, Customers, Time Tracking,
  Agents, and project Calendar pages are removed from route plans and replaced
  with their exact source link/projection contract.

## D12 — Advertised Integrations Are Implemented or Removed

- A provider shown in Git or other Build integration selectors must have
  signature verification, a parser, durable receipt, replay, and negative
  tests before it can be selected.
- Bitbucket remains advertised today and produces no events; remove it from
  schema, types, and selectors until that contract exists.
- Webhook secrets, rotation, and encryption belong to Integrations/Composio.
  Build stores connection and mapping IDs only.
- Inbound events are acknowledged only after a verified, tenant-resolved,
  deduplicated durable receipt; auto-transition and link writes are
  idempotent consumers, not fire-and-forget after HTTP 200.

- [ ] **BLD-00-D12-A** every advertised provider has signature, parser, receipt,
  replay, and negative tests, and Build schemas store no provider secrets.

## Decision-Gate Acceptance

- [ ] **BLD-00-A01** no Build PRD, sidebar PRD, design file, route catalog,
  schema, or test asserts a conflicting decision.
- [ ] **BLD-00-A02** each decision has a migration owner, dependency order, and
  release evidence row.
- [ ] **BLD-00-A03** BLD-01 through BLD-10 depend on these decisions and do not
  reopen them as implementation alternatives.
