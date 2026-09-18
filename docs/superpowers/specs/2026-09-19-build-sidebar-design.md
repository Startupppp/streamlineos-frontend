# Build Sidebar and Agentic Navigation Design

## Status

Approved design direction awaiting written-spec review.

## Summary

Build serves product management and project delivery in one module. Its navigation must make the active scope explicit, keep personal work stable, and expose only the tools that belong to the selected organization, PM workspace, managed product, or project.

The design reuses the existing global sidebar and its `17rem` expanded and `3.5rem` collapsed states. It does not add a second rail. A unified scope selector controls the contextual portion of the sidebar. Agentic behavior remains draft-first, evidence-backed, permission-aware, and reversible where technically safe.

## Goals

- Make the active Build scope obvious at all times.
- Stop navigation from changing meaning based only on the current route.
- Support standalone projects and projects linked to managed products.
- Scale from a freelancer with a few client projects to a multinational with many workspaces, products, programs, teams, and projects.
- Give internal collaborators enough access to execute work without exposing unrelated organization data.
- Give clients a dedicated, curated progress and approval experience.
- Make AI useful through contextual preparation rather than decorative or autonomous behavior.
- Keep primary navigation compact, predictable, keyboard accessible, and permission-correct.

## Non-goals

- Creating separate freelancer and enterprise product modes.
- Adding another permanent product rail.
- Replacing the existing global sidebar collapse.
- Giving clients access to the internal Build shell.
- Making the agent autonomous for meaningful record changes or external communication.
- Deleting valid routes only because they leave the primary sidebar.

## Current Evidence

The current global Build catalog mixes Delivery and Product groups in `frontend/components/layout/sidebar/sidebar-nav-groups-work-management.ts`. Project navigation is injected under the first Build group by `frontend/components/layout/app-sidebar.tsx`.

The project switcher in `frontend/features/build/sidebar/project-switcher.tsx` copies the current project subpath to the destination project. That can navigate to an unsupported or inaccessible page and is the primary example of route-driven behavior overriding user intent.

`frontend/features/build/sidebar/project-nav-config.ts` defines roughly forty project destinations across six groups while hiding almost all of them by default. This creates both excessive capability density and poor discoverability.

Managed products have detail pages but no equivalent product-level navigation context. PM workspaces have list, My Work, and All Work routes, but the documented nested project workspace routes are not implemented. Global and project navigation also duplicate labels such as My issues and Approvals.

The existing shell already owns the correct collapse behavior in `frontend/components/layout/dashboard-shell.tsx`: a persisted `sidebar-collapsed` cookie, a global header toggle, and widths of `17rem` and `3.5rem`. The new design must reuse this.

## Product Model

Build has four internal scopes:

1. Organization
2. PM workspace
3. Managed product
4. Project

A project belongs to a PM workspace. A project may optionally belong to a managed product.

The resulting hierarchy is:

```text
Organization
└── PM workspace
    ├── Managed product
    │   └── Linked project
    └── Standalone project
```

Portfolios and programs are organization-level rollups across projects. Delivery teams may serve multiple products and projects. They are not parent nodes in the scope selector.

## Unified Scope Selector

The scope selector is the only Build control that changes the contextual sidebar.

It shows:

- Scope type
- Scope name
- Parent path
- Project key where applicable
- Archived or restricted state where applicable

It supports:

- Recent scopes
- Starred scopes
- Hierarchical browsing
- Server-backed search
- Keyboard navigation
- Permission-filtered results
- Bounded and virtualized large collections

Selecting a scope opens that scope's Overview. The selector never copies an arbitrary subpath from the previous scope.

Browser Back restores the previous scope and destination. A deep link may preserve its requested destination only when the target scope supports that destination and the user remains authorized.

Duplicate names include their parent path and project key. Long names truncate visually while preserving an accessible full label.

## Sidebar Anatomy

The sidebar has four zones:

1. Product identity and the existing global collapse control
2. Unified scope selector
3. Stable My Work navigation
4. Contextual scope navigation and utilities

### Stable My Work

- Inbox
- Assigned to me
- Drafts

These labels never change meaning with scope. Counts are loaded independently and remain bounded.

### Organization Scope

Primary:

- Overview
- Projects
- Products
- Portfolios
- Programs
- Teams

Contextual administration:

- Client access
- Templates
- Build access
- Integrations

Administration appears under Build settings or More tools, subject to exact permissions.

### PM Workspace Scope

Primary:

- Overview
- Projects
- Products
- Roadmap
- Goals
- Teams

Settings contain workspace members, access, defaults, and enabled capabilities.

### Managed Product Scope

Primary:

- Overview
- Roadmap
- Goals
- Feedback
- Linked projects
- Insights

Product scope does not gain its own Inbox, Assigned to me, or Drafts.

### Project Scope

Primary:

- Overview
- Issues
- Backlog
- Cycles
- Timeline
- Releases
- Updates
- Files
- Client portal

Client portal appears only when enabled and authorized.

More tools may contain:

- Triage
- Epics
- Milestones
- Workload
- Meetings
- Approvals
- QA and tests
- Bugs
- Incidents
- Change requests
- Intake
- Feedback
- Chat
- Wiki
- Whiteboard
- Analytics
- Agile reports
- Budget
- Risks
- Decisions
- Saved views
- Forms
- Workflow
- Automations
- Webhooks
- AI settings

Scope admins enable applicable tools. A user may pin at most three enabled More tools. Shared primary order remains canonical.

### Utilities

- More tools
- Scope settings
- Browse all Build

Scope settings use the exact scope-specific permission. Project settings must not depend on organization-wide settings permission.

## Consolidation Decisions

- Command Center becomes the selected scope's Overview.
- Product-level Inbox and My issues are removed because My Work is stable and cross-scope.
- Sprints, Cycles, and Iterations use the single customer-facing term Cycles.
- Members and Access move under Build settings.
- Customers leave primary Build navigation. Projects link CRM customers contextually.
- Client Access becomes Build administration.
- Client portal remains project-level and external-facing.
- Templates, integrations, automations, webhooks, QA, incidents, forms, and specialist tools use More tools or Settings.
- All Work remains reachable through Browse all Build, search, commands, and authorized saved views rather than occupying primary navigation.
- Removing a primary navigation entry does not by itself authorize route or feature deletion.

## Agentic Experience

The agent appears through three surfaces:

### Command Bar

The global command bar supports:

- Navigation
- Search
- Summarization
- Question answering
- Preparation of plans, updates, reminders, and reports

All results inherit the current authorized scope unless the user explicitly selects another accessible scope.

### Agent Pulse

The sidebar may show one compact Agent Pulse only when an actionable change exists:

- Delivery risk
- Blocked milestone
- Overdue approval
- Prepared draft
- Material dependency change

It does not become a permanent chat feed and does not displace navigation.

### Prepared for You

Scope Overview pages may show editable drafts:

- Client updates
- Recovery plans
- Release notes
- Approval reminders
- Status summaries
- Prioritization proposals

### Draft-first Contract

The agent may read authorized context and prepare drafts. It may not change assignments, dates, status, scope, budgets, permissions, or client-visible content without explicit approval.

Every proposal shows:

- Active scope
- Evidence used
- Affected records
- Proposed diff
- Expected impact
- Confidence or missing information

Approve applies the reviewed diff. Edit creates a user-owned draft. Reject dismisses it. Approved actions are auditable and support undo when technically safe.

Low-confidence or empty insight states remain quiet. Failed actions preserve the draft and explain what failed, why, and how to retry.

## User Models

The shell never detects or switches into a freelancer or enterprise mode. Structure simplifies only through actual data, enabled capabilities, and permissions.

### Freelancer Owner

- Full internal Build access
- Standalone and product-linked projects
- Client updates and approvals
- Progress sharing
- Optional time, budget, and billing context

### External Freelancer or Contractor

- Restricted internal collaborator access
- Explicit project membership
- Only authorized working tools and records
- No organization strategy, unrelated clients, budgets, or access administration

### Employee

- Internal access based on organization, workspace, product, project, team, and record permissions

### Executive or Portfolio Manager

- Organization, workspace, and product overviews
- Portfolios, programs, goals, health, capacity, dependencies, and cross-project insights

### Client Stakeholder

- Dedicated client portal
- Only explicitly granted projects and approved content

Clients never enter the internal Build shell.

## Client Portal

The client portal may expose only granted:

- Project status
- Milestones
- Approved updates
- Approved files
- Decisions requiring client input
- Change requests
- Approvals
- Client-visible comments

It does not expose internal issues, internal comments, risks, budgets, agent reasoning, access controls, or unrelated projects unless explicitly granted by the existing client-visibility contract.

Internal preview and the real external portal are visually and semantically distinct. AI-generated client content remains a draft until a permitted person approves publication.

## Responsive Behavior

### Desktop

- Reuse the existing `17rem` expanded and `3.5rem` collapsed sidebar.
- Expanded mode shows labels and hierarchy.
- Collapsed mode shows the same primary destinations as icons with tooltips.
- The selected scope remains identifiable through a compact scope avatar.
- Sidebar width transitions reuse the existing motion behavior.

### Mobile

- Reuse the shared filtered navigation model.
- Bottom navigation exposes at most five actions: Overview, My Work, Issues or Work, Updates, and More.
- Scope switching, full navigation, Agent Pulse, and settings live in the navigation drawer.
- No critical information or action depends on hover.
- Touch targets are at least 44 by 44 CSS pixels.

## Visual Direction

- Restrained neutral shell
- Existing Build violet only for active scope, current selection, and agent indicators
- One dominant action per view
- Existing Geist typography and spacing tokens
- Existing component vocabulary and animated interactive icons
- Dense but breathable information hierarchy
- Skeletons shaped like final content
- Motion between 150 and 250 milliseconds for state communication only
- Full reduced-motion support

The design does not use glassmorphism, gradients, decorative glow, display typography, novelty controls, or decorative animation. Futuristic quality comes from speed, context awareness, predictive drafts, natural-language commands, and precise feedback.

## State and Failure Behavior

### Unsaved Work

Switching scope with unsaved edits opens the existing unsaved-changes confirmation. The user may remain, save where supported, or discard and switch.

### Loading

Scope selector, navigation, counts, and content use shape-matched skeletons. Existing content remains visible during background refresh.

### Empty

- No accessible scope: explain how to create, join, or request access.
- Empty organization or workspace: offer the authorized create action.
- Empty product: explain how to link or create a project.
- Empty project tool: distinguish no data from no filter matches.

### Errors

Navigation errors preserve the current content and provide a retry. A failed destination does not masquerade as an empty state.

### Offline

Cached context is visibly stale. Unsafe writes are disabled rather than silently queued. Draft text remains locally recoverable only through the application's existing scoped draft mechanism.

### Scope Lifecycle

Renamed, moved, archived, deleted, inaccessible, or permission-revoked scopes resolve to the nearest accessible parent and explain what changed.

Moving a project updates:

- Parent breadcrumbs
- Selector hierarchy
- Favorites
- Recents
- Cached lists
- Client links where still authorized

An archived scope remains searchable only when the user enables archived results and retains access.

### Concurrency and Isolation

- Scope changes cancel or isolate in-flight requests from the previous scope.
- Late responses never populate the new scope.
- Permission changes remove stale navigation and data immediately after access-version reconciliation.
- Favorites and recents never grant access.
- Agent drafts remain tenant-, actor-, and scope-bound.

## Authorization Requirements

- PM workspace membership must become an enforced read and write boundary, matching the schema contract.
- Every primary, More tools, action, and command destination uses the exact backend permission.
- Project record access remains membership- and tenant-scoped.
- Client portal reads remain grant-scoped through the portal identity.
- Frontend hiding is usability only; backend authorization remains authoritative.
- Cache entries and local preferences remain organization- and actor-scoped.

Known permission drift to repair during implementation:

- Build Customers navigation currently uses a CRM leads permission instead of `build:customers:view`.
- Project Settings navigation currently uses organization settings permission instead of the project update contract.
- Portal view permission is absent from default Build role templates that otherwise manage client visibility.

## Navigation Data Contract

Desktop sidebar, collapsed sidebar, mobile drawer, mobile bottom navigation, command palette, and scope selector consume one canonical filtered navigation model.

The model resolves:

- Product
- Scope type and identifier
- Parent path
- Primary destinations
- More tools
- Settings destination
- Required module
- Required permission
- Active state
- Mobile priority
- Optional unread or prepared-draft count

Route parsing and link creation use one canonical Build scope resolver. Components do not infer scope independently from arbitrary URL segments.

## Implementation Ownership

Likely frontend owners:

- `frontend/components/layout/dashboard-shell.tsx`
- `frontend/components/layout/app-sidebar.tsx`
- `frontend/components/layout/sidebar/sidebar-nav-groups-work-management.ts`
- `frontend/components/layout/sidebar/sidebar-nav-items.ts`
- `frontend/features/build/sidebar/`
- `frontend/lib/build/`
- Build route layouts and `frontend/PAGES.md`

Likely backend owners:

- PM workspace membership enforcement
- Build permission catalog and role templates
- Scope-aware bounded search
- Client portal grants
- Agent proposal and approval boundaries

The implementation plan must reserve shared navigation, permission, route-access, and cache primitives before parallel work.

## Acceptance Criteria

- One existing sidebar supports expanded and collapsed Build navigation.
- The active scope type, name, and parent are always available.
- Switching scope opens its Overview and never copies an unsupported subpath.
- My Work labels retain one meaning across every Build route.
- Organization, workspace, product, and project scopes expose only their own destinations.
- Standalone and product-linked projects are both first-class.
- No normal scope shows more than nine primary destinations.
- More tools is permission-filtered, searchable, and customizable within the three-pin limit.
- Product scope has a real contextual navigation model.
- Mobile shows at most five bottom destinations and reaches all other tools through the drawer.
- Internal collaborators and client stakeholders use separate access experiences.
- Agent outputs are editable, evidence-backed drafts requiring approval for meaningful changes.
- Archived, moved, inaccessible, duplicate-name, large-collection, offline, loading, empty, and error cases have defined behavior.
- Navigation surfaces consume one canonical model.
- Relevant type, unit, route-access, permission-coverage, cycle, and browser checks pass.
- `frontend/PAGES.md` and the active delivery lane record exact route and verification outcomes.

## Validation Plan

- Unit tests for scope resolution, link creation, active state, permission filtering, pin limits, and fallback behavior
- Regression test proving project switching never preserves an unsupported subpath
- Permission coverage tests for every primary and More tools route
- Cross-tenant and cross-workspace negative tests
- Portal grant allow and deny tests
- Cache isolation tests for rapid scope and organization switching
- Browser tests at 375, 768, and 1280 CSS pixels
- Keyboard-only scope selection and navigation test
- Screen-reader labels for collapsed icons and hierarchy paths
- Reduced-motion verification
- Dense enterprise test with hundreds of accessible scopes
- Freelancer test with one workspace and standalone projects
- Contractor test with one explicitly shared project
- Client test with one granted project and restricted fields

## External Pattern Check

The design follows proven category behavior without copying a single product:

- Linear keeps workspace and personal concepts stable while team and project resources provide context.
- Jira separates global sidebar navigation from project-specific views and supports project navigation customization.
- Asana separates work, strategy, and company concerns.
- ClickUp and Asana constrain guests to explicitly shared objects.

The StreamlineOS design differs by using one explicit scope selector across organization, PM workspace, managed product, and project while preserving a dedicated client portal.
