# BLD-02A — Organization, Workspace, and Product Pages PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Build provides a compact cross-project information architecture that works for
a freelancer with one project and an enterprise with workspaces, products,
programs, portfolios, teams, access reviews, and client stakeholders.

## Decision Labels

- **KEEP** — customer job and route remain.
- **CONSOLIDATE** — capability remains but moves into the named owner.
- **MOVE** — route changes because the current owner is wrong.
- **ADD** — required page is missing.
- **REMOVE** — capability is duplicate or has no defensible customer job.

No page is deleted until its records, actions, permissions, inbound links, and
unique requirements are migrated and verified.

## Organization Scope

| Route | Decision | Required job and page anatomy |
|---|---|---|
| `/build/command-center` | KEEP | Build landing: attention queue, active projects, overdue work, approvals, updates, agent proposals, and quick create. Every metric opens its exact filtered source. |
| `/build` | KEEP | Project directory: search, saved directory views, active/archived state, workspace/product/team/customer filters, owner, health, date, and bounded pagination. |
| `/build/all-work` | KEEP | Permission-scoped issue explorer across accessible projects. List and table by default; board only with an explicit grouping. |
| `/build/my-work` | KEEP | Actor-owned work: assigned, created, subscribed, blocked, due soon, and recently completed. No organization-wide default. |
| `/build/inbox` | KEEP | Build-specific notifications, mentions, assignments, approval requests, and automation/agent outcomes with read/snooze/resolve actions. |
| `/build/drafts` | CONSOLIDATE | Move recoverable comment/update drafts into an Inbox `Drafts` view; delete the standalone route after recovery and deep-link parity. |
| `/build/approvals` | KEEP | Full approval queue for requesters and approvers; Inbox may show a preview but cannot replace bulk review, delegation, history, and filters. |
| `/build/roadmap` | KEEP | Portfolio roadmap across products, programs, and releases. Project delivery plans do not create a second roadmap concept. |
| `/build/goal` | MOVE | Rename to plural `/build/goals`; show organization goals, hierarchy, ownership, health, check-ins, and linked products/projects. |
| `/build/programs` | KEEP | Program directory and roll-up for coordinated projects and dependencies. |
| `/build/portfolios` | KEEP | Portfolio directory for investment, health, capacity, risk, and strategic roll-up. |
| `/build/portfolios/{portfolioId}` | KEEP | Portfolio detail with projects, progress, risks, goals, budget summary, updates, and access-safe drill-down. |
| `/build/teams` | KEEP | Build team directory and scoped delivery metrics; people identity remains owned by Directory. |
| `/build/teams/{teamId}` | KEEP | Team work, capacity, projects, cycles, goals, and health; no duplicate employee profile editing. |
| `/build/templates` | KEEP | Project, issue, workflow, and form templates with preview, version, visibility, apply, duplicate, archive, and usage count. |
| `/build/customers` | KEEP | Read-only or relation-focused customer delivery view. CRM owns customer CRUD and canonical contact data. |
| `/build/members` | CONSOLIDATE | Move Build membership administration into `/build/settings/access`. |
| `/build/access` | MOVE | Move access review, scoped roles, guest access, and recertification to `/build/settings/access`. |
| `/build/client-access` | MOVE | Move client grants, expiry, portal visibility defaults, and review to `/build/settings/client-access`. |
| `/build/settings` | ADD | Build module settings landing for access, terminology, defaults, templates, client access, integrations, retention, and archive. |

### Organization Acceptance

- [ ] **BLD-02A-001** every kept page exposes one primary job and no duplicate
  configuration owner.
- [ ] **BLD-02A-002** Command Center metrics are server-derived, permission
  scoped, timestamped, and deep-link to the exact underlying query.
- [ ] **BLD-02A-003** My Work defaults to the actor and cannot widen to
  organization scope without the required data scope.
- [ ] **BLD-02A-004** Inbox distinguishes unread, unresolved, snoozed, and
  completed work and never uses the global notification count as a Build count.
- [ ] **BLD-02A-005** Draft consolidation preserves local recovery, expiry,
  scope, source record, and unsaved-work behavior.
- [ ] **BLD-02A-006** access pages move under settings with no duplicate route,
  API, permission, or nav entry.
- [ ] **BLD-02A-007** customer pages link to CRM records and cannot edit
  canonical CRM fields through parallel Build forms.
- [ ] **BLD-02A-008** list sizes, filters, views, and pagination follow BLD-03.

## PM Workspace Scope

| Route | Decision | Required job and page anatomy |
|---|---|---|
| `/build/pm-workspaces` | MOVE | Rename the current workspace directory to `/build/workspaces`; retain searchable membership, owner, product/project counts, status, and archive visibility. |
| `/build/workspaces/{pmWorkspaceId}/overview` | KEEP | Scope summary: health, active products/projects, goals, delivery attention, updates, and quick create preselected to the workspace. |
| `/build/workspaces/{pmWorkspaceId}` | KEEP | Workspace project directory. Root label is `Projects`; it is not a second overview. |
| `/build/workspaces/{pmWorkspaceId}/products` | KEEP | Products linked to the workspace with owner, lifecycle, roadmap health, and project count. |
| `/build/workspaces/{pmWorkspaceId}/teams` | KEEP | Teams assigned to the workspace; identity and membership remain Directory/Build access owned. |
| `/build/workspaces/{pmWorkspaceId}/all-work` | KEEP | Workspace-bounded issue explorer with truthful server-side scope. |
| `/build/workspaces/{pmWorkspaceId}/my-work` | CONSOLIDATE | Preserve workspace-scoped personal work in canonical `/build/my-work` with a visible workspace scope; delete the duplicate route after deep-link parity. |
| `/build/workspaces/{pmWorkspaceId}/goals` | KEEP | Workspace goal roll-up and linked execution. |
| `/build/workspaces/{pmWorkspaceId}/roadmap` | KEEP | Workspace slice of the portfolio/product roadmap, not a new roadmap record type. |
| `/build/workspaces/{pmWorkspaceId}/settings` | ADD | Name, owner, defaults, terminology override, memberships, linked products/projects, archive, and transfer. |

### Workspace Rules

- Workspaces are optional. Creating a project never requires a workspace.
- A workspace is an access and organization boundary, not a tenant boundary.
- Moving a project or product revalidates membership and client grants before
  commit.
- Workspace counts and filters include only records the actor may open.
- Workspace quick-create actions preselect the workspace and any unambiguous
  product context.

- [ ] **BLD-02A-009** zero, one, fifty, and enterprise-scale workspace states
  are usable without downloading a fixed first page and filtering locally.
- [ ] **BLD-02A-010** workspace search is backend-backed, paginated, cancellable,
  and cross-tenant safe.
- [ ] **BLD-02A-011** moving, archiving, restoring, and losing access follow the
  sidebar lifecycle contract.
- [ ] **BLD-02A-012** every workspace child API validates `pmWorkspaceId`
  membership and never trusts a client-supplied organization ID.
- [ ] **BLD-02A-013** overview roll-ups have bounded queries and exact
  empty/error/denied states.

## Managed Product Scope

| Route | Decision | Required job and page anatomy |
|---|---|---|
| `/build/managed-products` | KEEP | Product directory with lifecycle, owner, workspace, linked projects, roadmap health, goals, feedback, and releases. |
| `/build/managed-products/{managedProductId}` | KEEP | Product overview: outcome health, roadmap, feedback trend, open goals, releases, linked projects, and client-ready progress. |
| `/build/managed-products/{managedProductId}/projects` | KEEP | Explicit product-to-project linkage and contribution view. |
| `/build/managed-products/{managedProductId}/roadmap` | KEEP | Outcome and release roadmap owned by the product. |
| `/build/managed-products/{managedProductId}/goals` | KEEP | Product goals and key-result progress linked to delivery evidence. |
| `/build/managed-products/{managedProductId}/feedback` | KEEP | Product-scoped feedback inbox with source, customer, sentiment/theme, status, merge, link-to-roadmap, and create-issue actions. |
| `/build/managed-products/{managedProductId}/insights` | KEEP | Product evidence and trends with source drill-down; it must not invent unsupported AI conclusions. |
| `/build/managed-products/{managedProductId}/settings` | ADD | Identity, lifecycle, ownership, workspace, members, portal visibility, roadmap defaults, feedback channels, and archive. |

### Product Rules

- Products and projects are different records with explicit many-to-many or
  owned linkage defined by the schema contract.
- Product roadmap items express customer outcome and release intent. Project
  issues express execution.
- Product progress is calculated from explicit links and can be explained down
  to the source records.
- Feedback detail must retain project context when opening a project-owned
  submission.
- Client-ready views show approved roadmap, release, and update data only.

- [ ] **BLD-02A-014** product overview metrics reconcile to their source pages.
- [ ] **BLD-02A-015** product feedback rows open valid, permission-safe detail
  routes and never lose `projectId`.
- [ ] **BLD-02A-016** linking and unlinking projects is transactional,
  authorized on both scopes, and audited.
- [ ] **BLD-02A-017** product settings use the same dirty-state and lifecycle
  contract as project settings.
- [ ] **BLD-02A-018** client progress preview proves exactly what an external
  actor can and cannot see.

## Shared Page Anatomy

Every retained directory or overview includes:

- title, scope identity, breadcrumb where useful, and one primary action;
- server-backed search and filter state in the URL;
- saved view only where repeated exploration provides value;
- loading skeleton matching final geometry;
- distinct empty, no-results, denied, offline, and error states;
- bounded rows/cards with total or continuation semantics;
- keyboard-operable row/card actions;
- last-updated or data-freshness treatment for roll-ups; and
- a responsive compact mode that does not hide required actions behind hover.

- [ ] **BLD-02A-019** all pages pass the shared anatomy checklist.
- [ ] **BLD-02A-020** every add/move/consolidate decision has route, API,
  permission, cache, migration, and inbound-link evidence.
- [ ] **BLD-02A-A01** freelancer flow passes without workspace, product,
  portfolio, or program setup.
- [ ] **BLD-02A-A02** enterprise flow passes with multiple workspaces, products,
  teams, restricted projects, and external clients.
- [ ] **BLD-02A-A03** the final route inventory contains no duplicate owner and
  no configuration page outside Build settings.
