# projects screen specifications

Status: Planned

## Problem Statement

Users need explicit projects flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a workspace collaborator, I want build entry with 302 to saved allowed landing, so that do not use a permanent redirect for personalized entry.
2. As a workspace collaborator, I want command center with widget record pane, so that use dashboards/default plus bounded dashboard-query; maximum 24 widgets/layout and 12/query batch.
3. As a workspace collaborator, I want projects list with project card full overview, so that list/count must use canonical membership reachability.
4. As a workspace collaborator, I want project overview with ticket pane, so that health includes explanation and last reviewed date.
5. As a workspace collaborator, I want teams list with team full page, so that team membership and project access remain separate facts.
6. As a workspace collaborator, I want team detail with ticket pane, so that roster edits show access implications but do not silently grant unrelated projects.
7. As a workspace collaborator, I want templates with preview sheet → destination/mapping → impact review → durable job → project, so that immutable recipe versions; no silent overwrite.
8. As a freelancers, agencies, client managers, I want client delivery index with client pane for delivery summary, so that this is a delivery index, not duplicate crm contacts/deals.

## Implementation Decisions

### Build entry

Route: `/build`
Audience: all internal roles
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** route resolver; no separate Projects dashboard. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** resolvedTenant, landingRoute, assignmentOrigin. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** none; resolve saved preference. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** resolve authorized landing. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** 302 to saved allowed landing; default /build/command-center. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate navigation and access; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Do not use a permanent redirect for personalized entry. No Build assignment produces access-needed, never an empty workspace.

**Acceptance:** demonstrate resolve authorized landing with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh navigation and access after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Command Center

Route: `/build/command-center`
Audience: all internal roles
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** attention strip, default widgets, 12-column grid, customization drawer. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** dashboard name/version, widget source/time/value, urgency, query summary. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** global time/scope AND widget-local typed filters. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** add/resize/reorder widget; preview; save version; reset; restore. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** widget record pane; metric opens exact filtered collection; complex editor full page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/command-center` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate dashboard/layout/widget namespace; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Use dashboards/default plus bounded dashboard-query; maximum 24 widgets/layout and 12/query batch. See dashboard spec for schema.

**Acceptance:** demonstrate add/resize/reorder widget with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh dashboard/layout/widget namespace after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Projects list

Route: `/build/projects`
Audience: freelancers, agencies, project managers, product teams
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** searchable grid/list with My projects default for Member; active/archive tabs. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** key, name, client/product, owner, health, target date, next milestone, active cycle, authorized progress. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** name contains; owner/client/product/team IN; health/status IN; target between; overdue true. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** New project; template/import; archive with preview. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** project card full overview; quick health menu stays inline. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate projects, command-center, portfolio/program rollups; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** List/count must use canonical membership reachability. Hide inaccessible client/revenue fields. Archive never deletes underlying work.

**Acceptance:** demonstrate New project with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh projects, command-center, portfolio/program rollups after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project overview

Route: `/build/[projectId]`
Audience: project collaborators and managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** health header, attention, current cycle/milestone, update, work progress, risks, approvals, budget. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** project key/name, owner, health/reason, period, completion, blockers, last update, client visibility. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** period between; team/cycle/milestone IN; visibility EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** Create ticket; post update; review milestone; edit health. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; milestone pane; cycle detail full page; client context opens owning module. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate project, related collections, dashboard/rollups; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Health includes explanation and last reviewed date. Zero visible work is not evidence of zero total project work.

**Acceptance:** demonstrate Create ticket with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh project, related collections, dashboard/rollups after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Teams list

Route: `/build/teams`
Audience: admins, project managers, members
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** list/grid with membership badge and permitted Create. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, lead, authorized member count, projects, current cycle, workload signal. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** name contains; lead/member/project IN; status IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create team; invite/link member; archive. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** team full page; person limited profile pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/teams` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate teams, navigation, projects/workload; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Team membership and project access remain separate facts. Linking a project requires manage access.

**Acceptance:** demonstrate create team with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh teams, navigation, projects/workload after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Team detail

Route: `/build/teams/[teamId]`
Audience: team members and admins
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Overview, Members, Work, Cycles, Capacity tabs. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** team purpose/lead, membership origin, work status, cycle, capacity/week. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** tab; person/project/type/status IN; period between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** manage roster; link project; set team cadence. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; cycle full page; role change review sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/teams/:teamId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate team and access caches, workload, scoped work; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Roster edits show access implications but do not silently grant unrelated projects.

**Acceptance:** demonstrate manage roster with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh team and access caches, workload, scoped work after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Templates

Route: `/build/templates`
Audience: all creators; template admins
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** category gallery, preview sheet, apply wizard, job result. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, profession, version, author, created entities, workflow/fields preview, updated. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** profession/role/module/entity IN; built-in EQ; text contains. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** preview; apply; duplicate; publish organization template; retire. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** preview sheet → destination/mapping → impact review → durable job → project. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/templates` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate templates, created project/configuration, navigation; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Immutable recipe versions; no silent overwrite. Show required modules and unavailable steps before apply.

**Acceptance:** demonstrate preview with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh templates, created project/configuration, navigation after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Client delivery index

Route: `/build/clients`
Audience: freelancers, agencies, client managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** client grid/table with linked delivery projects and waiting actions. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** client name, CRM reference if enabled, projects, health, awaiting approvals, permitted balance/freshness. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** name contains; project/owner/health IN; approval state IN; aging band. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** link client; create lightweight portal client; open CRM; grant review. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** client pane for delivery summary; CRM full contextual handoff; project full page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/clients` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate client projection, grant/project/financial namespaces; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** This is a delivery index, not duplicate CRM contacts/deals. Financial fields require Accounting read permission.

**Acceptance:** demonstrate link client with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh client projection, grant/project/financial namespaces after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

### Project creation and import entry

New project opens one creation sheet: name (required), suggested unique key (editable), recommended template/work style, optional client/product reference and target date. Owner defaults to creator. Team and invite controls are collapsed; all advanced tools/workflow choices default from the template. Preview states the initial entities and fields, access, client visibility and plan usage. Primary action is Create project; secondary is Preview template or Import existing work.

Create calls the canonical project command with template version and idempotency key. Validate key uniqueness within tenant, owner/grantability, selected module availability, active-project quota, dates and required field defaults. Commit project, explicit memberships, template configuration, audit and outbox atomically or through the documented activation coordinator. A template failure cannot leave an apparently completed half-project; show durable setup status and retry.

On success open the project overview with a single first-ticket/import action. Quick Create ticket only needs title and defaults the workflow start state; collaborators are invited through explicit module/project policy. Do not create sample tasks as real obligations without the user's selection. Import opens preview/mapping/reconciliation before job start and returns to this project when completed.

Quota conflict offers archive an existing project, defer creation, or authorized upgrade; it never silently deletes a project. Retry cannot create another project. Cancel preserves a private draft. Mobile uses a full-screen form with sticky Create and the same controls. Acceptance: solo creates first real project/work item quickly; agency adds client and invited contributor; product team links product; invalid key/quota/permission/template failure preserves input and produces no false success.

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.
