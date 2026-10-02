# daily work screen specifications

Status: Planned

## Problem Statement

Users need explicit daily work flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a workspace collaborator, I want my work with ticket pane, so that private focus rank never changes shared priority.
2. As a workspace collaborator, I want build inbox with notification target pane, so that notifications are home-owned; build is filtered projection.
3. As a workspace collaborator, I want all work with ticket pane, so that default active recent scope; all matching selection uses authorized query snapshot and explicit review.
4. As a workspace collaborator, I want project work views with ticket pane, so that calendar is work-date projection inside build.
5. As a workspace collaborator, I want ticket detail with direct link full page, so that expectedrevision on writes; description draft survives conflict.

## Implementation Decisions

### My Work

Route: `/build/my-work`
Audience: engineers, freelancers, creators, all members
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Focus, Today, Upcoming, Overdue, Blocked, Waiting, Drafts, Done sections. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** key/title, project/client hint, status, priority, owner, due, blocker, estimate, my time. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** assignee includes_me; creator includes_me; status/project/type IN; due relative; blocked EQ; draft EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** focus/reorder privately; start; complete; snooze; log time; resume draft. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; draft editor sheet; approved time opens Timesheets. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/my-work` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate my-work, affected tickets, dashboard/time projection; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Private focus rank never changes shared priority. Snooze is personal; reschedule explicitly changes due date.

**Acceptance:** demonstrate focus/reorder privately with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh my-work, affected tickets, dashboard/time projection after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Build inbox

Route: `/build/inbox`
Audience: all internal roles
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** needs-action list with read/unread, tabs, detail pane. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** event type, actor, safe subject/snippet, project, time, urgency, read/resolved/snoozed. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** unread EQ; type/project/actor IN; time between; urgency IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** mark read; resolve; snooze; approve through decision sheet. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** notification target pane; document/editor full page; approval sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** `/build/inbox` is the browser route. The notification owner supplies the authorized unified inbox projection filtered to Build, with stable target reference, event ID, created time, read state, allowed action, and source revision. Build resolves each target through its owning record query and may add a Build attention projection without duplicating notification delivery state. Mark-read/snooze commands use the owning notification interface; record actions use their domain commands. The exact HTTP operation is selected from the generated contract during the package inventory.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate unified notification state, inbox counts; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Notifications are Home-owned; Build is filtered projection. Revocation removes private content from queued delivery.

**Acceptance:** demonstrate mark read with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh unified notification state, inbox counts after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### All Work

Route: `/build/all-work`
Audience: cross-project collaborators
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** list/table/board/calendar/timeline and saved views. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** ticket identity/title, project/team, state, owner, priority, dates, relations, custom fields. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** full shared grammar with project/team/client/product/cycle/release/epic IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** save view; create; select loaded/all matching; bounded bulk preview; export. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; metric/source link uses same predicate. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/all-work` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate ticket collections, views, dashboards/reports; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Default active recent scope; all matching selection uses authorized query snapshot and explicit review.

**Acceptance:** demonstrate save view with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh ticket collections, views, dashboards/reports after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project work views

Route: `/build/[projectId]/issues`
Audience: project members and managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Board/List/Table/Calendar/Timeline/Workload view switcher and shared toolbar. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** key/title, priority, assignee, due, blocked; optional labels/type/points/cycle/progress. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** status/priority/type/labels/assignee/cycle/epic/release IN; due relative/between; custom typed. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** quick create; drag transition/rank; inline scalar edit; multi-select. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; calendar drag previews date impact; timeline dependency review. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/issues` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate ticket/project counts, relation views, dashboard/report; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Calendar is work-date projection inside Build. Home Calendar action creates meetings separately. Workflow validation may reject drag.

**Acceptance:** demonstrate quick create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh ticket/project counts, relation views, dashboard/report after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Ticket detail

Route: `/build/[projectId]/tickets/[ticketKey]`
Audience: reachable project collaborators
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** title/status header, description/acceptance/subtasks/evidence, property rail, activity tabs. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** key/title/revision, status, priority, assignees/reporter, dates, label, goal/cycle/epic/release, client visibility, time/custom fields. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** activity type/actor/time; subtask state; relationship type. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** edit; transition; link work; log time; request approval; publish client version with preview. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** direct link full page; collection intercepted pane; related ticket replaces pane with back stack. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/tickets/:ticketKey` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate ticket/header/heavy sections, parent/relation lists, time and dashboards; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** ExpectedRevision on writes; description draft survives conflict. Client audience uses separate projection. No secret values in AI.

**Acceptance:** demonstrate edit with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh ticket/header/heavy sections, parent/relation lists, time and dashboards after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement `/build/my-work` Focus/Today/Upcoming/Overdue/Blocked/Waiting/Drafts/Done with private rank and snooze, canonical ticket links, and typed assignee/creator/status/due filters.
- [ ] Implement `/build/inbox` as a Build-filtered Home notification projection with read/resolved/snoozed state and safe target links; approval action opens an exact-version decision sheet.
- [ ] Implement `/build/all-work` list/table/board/calendar/timeline with saved views, full FilterEnvelope v1, bounded selection/export preview, and permission-scoped counts.
- [ ] Implement `/build/[projectId]/issues` view switcher, ticket card fields, drag/rank/transition validation, work-date Calendar, and Home Calendar handoff for meetings.
- [ ] Implement `/build/[projectId]/tickets/[ticketKey]` full-page/pane/mobile detail with description, properties, subtasks, relations, comments, files, time, activity, approval, and client-publication actions.
- [ ] Verify panes, related-ticket history, refresh/direct link/modifier-click, mobile return, stale revision/draft recovery, canonical mutation persistence, cache refresh, and Member/project/tenant/client denials.
