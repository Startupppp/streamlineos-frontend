# Build Module Audit and Product Direction

## Status and evidence

This document is the product authority for the Build audit. It is documentation only; it does not assert that a proposed behavior is implemented.

Verified on 2026-09-21 against:

- Production: `https://www.streamlineos.in/build/*`, authenticated read-only walkthrough.
- Routes: `frontend/app/(authenticated)/build/**/page.tsx` and `frontend/lib/rbac/route-access/app-routes.ts`.
- Navigation: `frontend/lib/build/build-nav-model.ts`, `frontend/lib/build/build-nav-groups.ts`, `frontend/features/build/navigation/`.
- Backend: `backend/src/modules/build/`.
- Schemas: `backend/src/db/schema/build/`.
- Client data layer: `frontend/hooks/api/build/` and `frontend/lib/query-keys.ts`.
- Shared UI: `frontend/components/shared/`, `frontend/components/ui/`, `frontend/components/command-palette/`.
- External Build surfaces: `frontend/app/(authenticated)/portal/`, `frontend/app/(portal)/`, and the Build-owned pages under `frontend/app/(public)/`.

Anything prefixed **ASSUMPTION** needs user or production-data confirmation.

## Local setup evidence

| Service | Exact command | Result | Observed warnings/failures |
|---|---|---|---|
| Backend | `pnpm -C backend start:dev` | Listening on `http://localhost:1500`; `GET /health` returned HTTP 200 | Legacy `/public/feedbucket/*` wildcard conversion, two retired permission keys, disabled schedulers, and local process timezone UTC+05:30 differed from the configured runtime expectation |
| Frontend | `pnpm -C frontend dev` | Listening on `http://localhost:1000`; root returned HTTP 200 | Root `pnpm.overrides` ignored from the package directory, Turbopack cache cleared, and Edge Runtime deprecation warning |
| Production | Authenticated read-only browser session supplied by the user | `/build/command-center` and the route crawl were accessible | No production mutation was performed |

Repository state before documentation work was not clean. The audit branch `build-module/audit-v1` was created from local `main` (11 commits ahead of `origin/main`) while preserving pre-existing user changes; only `docs/build-module/` belongs to this audit.

## Product thesis

Build is the execution system connecting product intent, project delivery, customer evidence, and company operations. It should beat ClickUp on focus, Jira on approachability, and Linear on cross-functional depth without copying their surface area.

The product wins through five properties:

1. One canonical work item and one canonical iteration model.
2. Scope-aware navigation across organization, workspace, product, and project.
3. Fast keyboard-first daily execution with durable, shareable views.
4. Native links to CRM customers/deals, HR people/capacity, Timesheets cost, Files, Calendar, Chat, and Knowledge.
5. Trustworthy permissions, audit history, offline recovery, and bounded performance.

## Personas

| Persona | Primary job | Winning outcome |
|---|---|---|
| Product manager | Turn evidence and goals into prioritized, shipped outcomes | Roadmap decisions trace to feedback, delivery, and releases |
| Project/program manager | Coordinate scope, schedule, risk, capacity, and stakeholders | Risks surface early and status reporting is generated from current evidence |
| Team lead | Plan and unblock a delivery team | Workload and flow are visible without spreadsheet reconciliation |
| Contributor | Find, update, and discuss assigned work quickly | Common actions stay under two interactions and survive weak connectivity |
| Freelancer | Manage projects, clients, time, files, and approvals without enterprise setup | A project works without a workspace hierarchy |
| Client/external collaborator | Review approved progress and make bounded requests | No internal field or unrelated project can leak |

## Verified production findings

| Finding | Evidence | Priority |
|---|---|---|
| The project sidebar links Cycles to `/build/1/sprints`; that route has no page and renders the Projects surface | Production route and `frontend/app/(authenticated)/build/[projectId]/cycles/page.tsx` | P0 |
| `/build/6/workload` canonicalizes to `/build/6?view=workload`, while a physical workload page also exists | Production redirect and `frontend/app/(authenticated)/build/[projectId]/workload/page.tsx` | P0 |
| My Work, Templates, Backlog, Intake, Files, and Analytics rendered another surface or an under-specified generic surface during the crawl | Production routes listed in each page specification | P0/P1 |
| Production exposes 83 authenticated Build pages, while primary project navigation contains nine direct destinations plus 26 tools under More tools | Route census and production project sidebar | P1 |
| Organization Command Center showed two projects and 84 open issues, proving production data is sufficient for organization and project audit | `/build/command-center` | Evidence |
| Several list pages remained on skeletons during a bounded wait, obscuring empty/error/slow distinctions | `/build/managed-products`, `/build/portfolios`, `/build/programs`, `/build/teams` | P0 |

## Product decisions

- **Keep one work-item model.** Bugs and epics are typed/projection views of tickets, not parallel lifecycles.
- **Keep one iteration identity: Cycle.** “Sprint” may be a display label, never a second route, permission, schema, or API identity.
- **Delete duplicate hubs.** Analytics folds into Reports; Drafts into Inbox; project My Tickets into My Work; Timeline and saved-view administration into Issues; AI runs into Command Center.
- **Move configuration into scoped Settings.** Workflow, automations, webhooks, client publication policy, fields, views, and retention are settings; operational queues remain outside Settings.
- **Keep specialist operational pages only when their user job and data shape differ.** QA execution, incidents, risks, decisions, approvals, meetings, files, wiki, and whiteboard qualify.
- **Workspace is optional.** A freelancer can create a standalone project. Current `projects.pmWorkspaceId` contradicts this in `backend/src/db/schema/build/core.ts` and must be migrated.
- **Library belongs to Knowledge, not Build.** The visible Library group is defined in `frontend/features/wiki/components/wiki-sidebar-nav.tsx`; Build Wiki pages are scoped projections/links into the Knowledge module. Organization APIs own library search/tree/templates, while project APIs own record links and project-filtered projections. Build must not duplicate Knowledge storage or permissions.

## Success metrics

- Median time from command palette open to a work-item action: under 5 seconds.
- P75 page-ready time on warm navigation: under 1 second; P95 API read under 500 ms excluding file/AI operations.
- At least 80% of weekly active contributors use a saved or shared view.
- Fewer than 1% of mutations require a manual refresh to reconcile.
- Zero cross-tenant, cross-project, expired-grant, or stale-permission disclosures.
- At least 60% of status updates are generated from linked delivery evidence and edited rather than written from scratch.

## Scope boundaries

Build owns projects, work items, cycles, delivery planning, project governance, product planning, and project-scoped projections. HRMS owns people/employment/leave; CRM owns customers/deals; Timesheets owns time and approved cost; Accounting owns recognized financials; Knowledge owns pages/library; Files owns binary objects; Calendar owns events; Chat owns channels; Access owns roles and grants.

## Cross-module touchpoints

| Shared concern | System of record | Build use | Evidence |
|---|---|---|---|
| Organization and tenant | Organization/Access | Every Build row, key, permission check, and cache partition carries `orgId` | `backend/src/db/schema/build/core.ts`, `backend/src/modules/access/` |
| User, membership, role | HR/Organization/Access | Assignee, reporter, owner, watcher, team membership, data scope; Build stores references, not employee truth | `backend/src/modules/build/core/projects-members.service.ts`, `frontend/hooks/api/organization.ts`, `frontend/hooks/api/access/` |
| Leave and capacity | HRMS | Workload projects availability and leave; Build owns assignment demand only | `frontend/features/build/views/workload-view.tsx`, `backend/src/modules/hr/` |
| Customer and commercial context | CRM | Projects link to customer/deal records; client grants expose an allowlisted projection | `backend/src/modules/build/core/projects-customers.controller.ts`, `backend/src/modules/portal/` |
| Time and cost | Timesheets | Ticket/project actuals and workload consume time projections; Timesheets owns entries and approval | `backend/src/modules/build/execution/timesheets.controller.ts`, `backend/src/modules/build/execution/timesheets.service.ts` |
| Billing and recognized finance | Accounting | Budget compares plan/forecast to permission-filtered actuals; Build does not create a second ledger | `backend/src/modules/build/core/projects-budget.controller.ts`, `backend/src/modules/accounting/` |
| Documents and library | Knowledge | Project Wiki filters/links Knowledge pages; organization Library owns page storage and ACL | `frontend/features/wiki/components/wiki-sidebar-nav.tsx`, `backend/src/modules/kb/` |
| Files | Build Files plus shared object-storage infrastructure | Work items/projects hold authorized file metadata and request signed access; upload/scanning/retention must remain a shared infrastructure concern | `backend/src/modules/build/files/`, `backend/src/modules/storage/` |
| Meetings and dates | Calendar | Build links project meetings, due dates, and milestones to calendar projections | `backend/src/modules/build/meetings/`, `backend/src/modules/calendar/` |
| Conversation | Chat | Project Chat is a scoped channel projection; Chat owns messages, retention, and moderation | `frontend/features/chat/build-project-chat-page.tsx`, `backend/src/modules/chat/` |

## Deliverables in this directory

- `01-ia-navigation.md`: current inventory, final IA, navigation behavior, and route dispositions.
- `02-schemas.md`: canonical entities, relations, indexes, tenancy, audit, and migrations.
- `03-api-contracts.md`: endpoint and wire conventions.
- `04-shared-components.md`: deep shared modules and their interfaces.
- `05-performance-caching.md`: endpoint risks, caching, invalidation, optimistic and realtime rules.
- `06-prioritized-backlog.md`: P0/P1/P2 dependency order and effort.
- `10-*.md`: 109 self-contained page implementation specifications covering 92 physical Build-owned routes and 17 target routes.
- `99-kill-list.md`: features and routes to remove or refuse.
- `99-open-questions.md`: unresolved decisions only.

## Acceptance criteria

- [ ] Every current Build route has a keep, move, consolidate, or delete decision with a user job.
- [ ] Every retained page has one self-contained `10-*.md` implementation specification.
- [ ] Every production finding names a route, endpoint, or repository path.
- [ ] No feature survives without a one-line user job.
- [ ] Cross-module ownership prevents Build from duplicating HRMS, CRM, Timesheets, Accounting, Knowledge, Files, Calendar, or Chat.
- [ ] P0/P1/P2 backlog order respects schema, permission, API, component, and page dependencies.
