# planning screen specifications

Status: Planned

## Problem Statement

Users need explicit planning flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a product managers, project managers, engineers, I want backlog with ticket pane, so that planning shows commitment capacity and prerequisite conflicts; ranking uses canonical rank command.
2. As a software teams and managers, I want cycles with cycle full page, so that current cycle is explicit by configured team/project; cadence includes timezone and overlap rules.
3. As a software delivery team, I want cycle detail with ticket pane, so that finish captures immutable commitment/result snapshot; reopened work does not rewrite historical cycle outcome.
4. As a PMs and project managers, I want epics with epic pane, so that type epic is different from belongs-to-epic; relation filter uses epic id.
5. As a project managers and contributors, I want workstreams with workstream pane, so that product modules remain build/crm/hr etc; workstream is only project grouping.
6. As a freelancers, PjMs, product teams, I want milestones with milestone pane, so that achieved requires configured completion/approval rule; manual override audited with reason.
7. As a PMs, leaders, contributors, I want goals list with goal full page, so that numeric targets use explicit unit, calculation source, and manual override reason.
8. As a goal owners and stakeholders, I want goal detail with ticket pane, so that historical check-ins retain original target/version; cannot present shipment as measured outcome.
9. As a PMs and leadership, I want organization roadmap with initiative pane, so that external commitments require explicit visibility and approved wording/version.
10. As a PjMs, executives, agencies, I want portfolios with portfolio full page, so that aggregate only authorized denominators; partial scope marker must not reveal hidden counts.
11. As a portfolio stakeholders, I want portfolio detail with project full page, so that linking preserves record access; scenario is draft until reviewed canonical commands execute.
12. As a program managers and executives, I want programs with program pane/full-page promotion, so that explicit program↔project membership is required; nested headings are not membership.

## Implementation Decisions

### Backlog

Route: `/build/[projectId]/backlog`
Audience: product managers, project managers, engineers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** ranked unplanned work and upcoming cycle/release lanes. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** ticket key/title, readiness, priority, estimate, dependencies, owner, epic. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** readiness/status/type/priority/epic/owner IN; estimate empty/between; age greater. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** rank; estimate; split; plan cycle/release; archive. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; target cycle/release planning sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/backlog` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate backlog, tickets, cycle/release capacity, dashboards; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Planning shows commitment capacity and prerequisite conflicts; ranking uses canonical rank command.

**Acceptance:** demonstrate rank with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh backlog, tickets, cycle/release capacity, dashboards after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Cycles

Route: `/build/[projectId]/cycles`
Audience: software teams and managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** current/upcoming/completed list plus current-cycle badge. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, goal, dates, team, state, committed/completed effort, scope delta, carryover. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** state/team IN; dates between; current EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create recurring cadence; plan; start; complete rollover preview. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** cycle full page; linked ticket pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/cycles` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate cycles, project overview/current-cycle, ticket views; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Current cycle is explicit by configured team/project; cadence includes timezone and overlap rules.

**Acceptance:** demonstrate create recurring cadence with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh cycles, project overview/current-cycle, ticket views after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Cycle detail

Route: `/build/[projectId]/cycles/[cycleId]`
Audience: software delivery team
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** goal header; Scope, Flow, Capacity, Retrospective tabs. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** commitment baseline, added/removed scope, done, blocked, capacity, carryover, notes. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** ticket owner/type/status/epic IN; added/removed EQ; activity time. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** add/remove work; finish cycle; move unfinished into next/backlog. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; completion impact sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/cycles/:cycleId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate cycle, backlog/tickets, project overview, reports; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Finish captures immutable commitment/result snapshot; reopened work does not rewrite historical cycle outcome.

**Acceptance:** demonstrate add/remove work with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh cycle, backlog/tickets, project overview, reports after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Epics

Route: `/build/[projectId]/epics`
Audience: PMs and project managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** progress list with expandable linked work and detail pane. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name/key, outcome, owner, status, progress, dates, goal/release, child count. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/status/goal/release IN; due between; progress less; stale EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; link/unlink; update; archive. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** epic pane; linked issue nested pane; full-page promotion. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/epics` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate epics, ticket relation filters, roadmap/release rollups; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Type Epic is different from belongs-to-epic; relation filter uses epic ID.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh epics, ticket relation filters, roadmap/release rollups after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Workstreams

Route: `/build/[projectId]/modules`
Audience: project managers and contributors
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Workstreams list; label replaces Modules; compatible URL. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, lead, scope, state, tickets/progress, release links, dates. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** lead/status/release IN; date between; progress between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; link tickets; update; retire. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** workstream pane; ticket nested pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/modules` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate workstreams, linked tickets, reports; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Product modules remain Build/CRM/HR etc; workstream is only project grouping. Retiring preserves history.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh workstreams, linked tickets, reports after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Milestones

Route: `/build/[projectId]/milestones`
Audience: freelancers, PjMs, product teams
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** list/timeline with confidence and dependencies. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, owner, due, state, confidence/reason, deliverables, dependencies, approval state. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** state/owner/confidence IN; due relative/between; visible EQ; blocked EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; link work; shift date impact; request approval; mark achieved. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** milestone pane; artifact approval sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/milestones` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate milestones, plan/calendar, portal published projection; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Achieved requires configured completion/approval rule; manual override audited with reason.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh milestones, plan/calendar, portal published projection after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Goals list

Route: `/build/goals`
Audience: PMs, leaders, contributors
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** period selector, hierarchy/table, confidence and update age. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name/outcome, owner, baseline/target/current/unit, period, state, confidence, progress, last check-in. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/team/product/status/confidence IN; period between; stale EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; check in; link initiative; close. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** goal full page; quick check-in sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/goals` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate goals, linked work/product/portfolio dashboards; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Numeric targets use explicit unit, calculation source, and manual override reason.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh goals, linked work/product/portfolio dashboards after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Goal detail

Route: `/build/goals/[goalId]`
Audience: goal owners and stakeholders
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** outcome header; Measures, Initiatives, Updates, Risks tabs. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** baseline/target/current, evidence refs, formula, owner, confidence, period, contributors. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** initiative/project/status IN; check-in period. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** check in; update target through version; link delivery/outcomes. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; initiative pane; product full page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/goals/:goalId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate goal, product/roadmap, dashboards; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Historical check-ins retain original target/version; cannot present shipment as measured outcome.

**Acceptance:** demonstrate check in with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh goal, product/roadmap, dashboards after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Organization roadmap

Route: `/build/roadmap`
Audience: PMs and leadership
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Now/Next/Later, timeline, outcome, product/team lenses. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** initiative/problem, owner, goal, horizon, confidence, evidence, progress, release. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** product/team/goal/status/horizon/client segment IN; target date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** prioritize; move horizon; link evidence; publish approved projection. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** initiative pane; ticket pane; external projection preview. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/roadmap` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate roadmap, product/initiative/goal, published views; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** External commitments require explicit visibility and approved wording/version. Internal date changes do not automatically publish.

**Acceptance:** demonstrate prioritize with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh roadmap, product/initiative/goal, published views after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Portfolios

Route: `/build/portfolios`
Audience: PjMs, executives, agencies
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** health grid/table and rollup filters. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, owner, status/health, visible projects, next milestone, budget exposure, top risk. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/health/status/client/product IN; target date between; exposure greater. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; link projects/programs; publish update. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** portfolio full page; risk pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/portfolios` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate portfolios and source project/program rollups; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Aggregate only authorized denominators; partial scope marker must not reveal hidden counts.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh portfolios and source project/program rollups after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Portfolio detail

Route: `/build/portfolios/[portfolioId]`
Audience: portfolio stakeholders
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Overview, Projects, Programs, Goals, Timeline, Budget, Risks, Updates. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** objective, owner, sources, health, confidence, milestone dates, finance projection/freshness. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** project/program/client/health IN; date between; budget state. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** link/unlink; update; compare delivery scenario. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** project full page; risk/decision pane; scenario preview. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/portfolios/:portfolioId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate portfolio, memberships/rollups, dashboards; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Linking preserves record access; scenario is draft until reviewed canonical commands execute.

**Acceptance:** demonstrate link/unlink with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh portfolio, memberships/rollups, dashboards after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Programs

Route: `/build/programs`
Audience: program managers and executives
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** program list plus pane; linked project table and dependency graph. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name/outcome, owner, portfolio, health, projects, dependencies, milestones, risks, spend projection. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/portfolio/project/client/health IN; due between; dependency blocked EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; link project; add dependency; publish update. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** program pane/full-page promotion; project full page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/programs` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate program links, project rollups, portfolio/dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Explicit program↔project membership is required; nested headings are not membership.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh program links, project rollups, portfolio/dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Program detail

Route: `/build/programs/[programId]`
Audience: program owner, project manager, executive reader, or permitted collaborator.
Entry points: Programs list pane/full-page promotion; Portfolio, Roadmap, Goal, notification, report drill-down, or copied link. Recheck organization, module, program, and linked-project reachability on every request.

**Layout and components:** header (name, outcome, owner, health, observedAt, target dates, confidentiality, last update); overview stat cards (milestone confidence, blocked dependencies, approved spend, outcome progress, next decision); tabs: Projects, Timeline, Dependencies, Risks/Decisions, Goals/Outcomes, Updates, Activity. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, outcome, ownerId, health, observedAt, targetStart, targetEnd, confidentiality, formulaVersion, revision, allowedActions; linked-project row: authorized project name, owner, health, next milestone, due date, dependency state, last update; dependency edge: source/target, type, impact, owner, resolution, visibility — no inaccessible title leaks.

**Filters and operators:** Projects: owner IN, health IN, due BETWEEN, blocked EQ, portfolio IN, search CONTAINS. FilterEnvelope v1 with typed field registry per tab.

**Primary and secondary flows:** update program details; link/unlink projects; add dependencies; record decisions; publish updates; archive after impact review. Short changes use sheets with expectedRevision; dependency graphs and major edits use full-page editors. Publish to clients requires a scoped preview and confirmation.

**Opening and return:** list selection may intercept into a pane; direct link/refresh/modifier-click/mobile opens full page. Project click opens project full page; risk/decision opens pane; second linked record replaces pane with back stack. Close restores authorized list filters, scroll position, and focus.

**Data/API/schema:** `GET /build/programs/:programId` → `ProgramDetail { id, organizationId, revision, name, outcome, ownerId, health, observedAt, targetStart, targetEnd, confidentiality, formulaVersion, sourceVersion, allowedActions }` plus bounded authorized relationship page references. `GET /build/programs/:programId/projects?cursor&limit&filter` → items/pageInfo with policy-safe total. Commands: `POST /build/programs/:programId/project-links`, `DELETE /build/programs/:programId/project-links/:linkId`, `PATCH /build/programs/:programId` — all require validated IDs, expectedRevision, idempotency key, authorization, audit and after-commit events.

**Access and cache:** org, module, program, and linked-project reachability checked on every request; restricted projects omitted; counts use policy-safe aggregation. Query keys include tenant, principal, permission version, program ID, filter and source version. Link/health changes invalidate detail, program collection, portfolio/roadmap/goal rollups, dashboards and report drill-down.

**States and recovery:** loading skeleton, empty tab, filtered empty, stale projection, missing linked record, denied, deleted, conflict, and retry — no inaccessible record titles leak. Preserve edits and display safe retry/correlation ID.

**Mobile:** detail is full screen; tabs are horizontally scrollable with accessible overflow menu; rows become compact cards; all edits remain available; 44 px targets.

**Acceptance:** verify direct/refresh/pane/history behavior; persisted commands with audit; idempotent retries; filtering produces declared matching records; cross-tenant denial; project-level omission; cache invalidation after change; keyboard and mobile operation. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement Backlog and Cycles list/detail with bounded issue queries, rank/estimate/owner filters, capacity preview, start/close confirmation, and revision-safe ticket movement.
- [ ] Implement Epics, Workstreams, and Milestones with linked tickets, target dates, progress from authorized scope, status/owner/date filters, and pane navigation; retain compatible Modules URLs while changing UI labels.
- [ ] Implement Goals list/detail with owner, metric, baseline/target, check-ins, linked project/product/roadmap records, and explicit outcome versus output progress.
- [ ] Implement organization Roadmap with horizon/team/product/goal filters, dependencies, confidence and publish preview; every milestone/initiative opens its canonical record.
- [ ] Implement Portfolios and Programs list/detail with project membership, health, owner, dates, dependency rollups, and proposed stable program detail destination.
- [ ] Apply FilterEnvelope v1, saved views, authorized counts, cursor pagination, and exact drill-down predicates to each planning collection; keep client/private fields out of unauthorized rollups.
- [ ] Verify cycle rollover, cross-project links, dependency edits, stale plan conflicts, archive/restore, direct URL/pane history, mobile spatial-view alternative, role/tenant isolation, persisted audit, and cache refresh.
