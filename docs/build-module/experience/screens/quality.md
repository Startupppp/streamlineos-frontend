# quality screen specifications

Status: Planned

## Problem Statement

Users need explicit quality flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a software teams, PMs, PjMs, I want releases with release pane, so that native bidirectional ticket membership; deployment success requires provider evidence, not merely manual released state.
2. As a testers, engineers, release managers, I want qa catalog with case pane, so that qa run evidence includes environment/build and test version.
3. As a test executors and release approvers, I want qa run execution with full page, so that retest creates new result attempt, never overwrites failed evidence.
4. As a engineers, operations, managers, I want incidents list with incident full command page, so that client/public incident summaries are reviewed projections.
5. As a incident responders and authorized stakeholders, I want incident command and postmortem with full page, so that resolution records evidence; postmortem changes versioned.

## Implementation Decisions

### Releases

Route: `/build/[projectId]/releases`
Audience: software teams, PMs, PjMs
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** release list and readiness detail pane. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** version/name, owner, target, state, confidence, tickets, QA pass/block, approvals, environment, deployment refs. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** state/owner/environment/product IN; target between; blocked EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; link/unlink tickets; freeze scope; readiness; request signoff; publish notes. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** release pane; ticket nested; deployment provider full page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/releases` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate release scope, ticket relation filters, QA/approval/dashboard/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Native bidirectional ticket membership; deployment success requires provider evidence, not merely manual Released state.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh release scope, ticket relation filters, QA/approval/dashboard/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### QA catalog

Route: `/build/[projectId]/qa`
Audience: testers, engineers, release managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** Cases, Suites, Runs tabs and run summaries. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** case title/suite, priority, automation/source, owner, run/release/environment, pass/fail/block. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** suite/priority/automation/owner/status IN; release IN; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create case; start run; import result; link defect; retest. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** case pane; run full execution page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/qa` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate cases/runs/release confidence/tickets; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** QA run evidence includes environment/build and test version. A passed case is not deployment proof.

**Acceptance:** demonstrate create case with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh cases/runs/release confidence/tickets after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### QA run execution

Route: `/build/[projectId]/qa/runs/[runId]`
Audience: test executors and release approvers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** run header, test list, focused step/evidence panel. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** run version/build/environment, executor, case/version, steps/expected, result, evidence, defect, time. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** case suite/priority/status/executor IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** pass/fail/block; attach evidence; create defect; rerun; sign off. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** full page; defect ticket pane; file preview. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/qa/runs/:runId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate run/case/release/audit; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Retest creates new result attempt, never overwrites failed evidence. Signoff checks completed required cases.

**Acceptance:** demonstrate pass/fail/block with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh run/case/release/audit after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Incidents list

Route: `/build/[projectId]/incidents`
Audience: engineers, operations, managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** active/historical table, severity attention. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** title, severity, state, commander, impacted service, start/end, customer impact summary, release. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** severity/state/owner/service/release IN; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** declare; assign roles; update; resolve. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** incident full command page; release pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/incidents` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate incidents, release confidence, attention; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Client/public incident summaries are reviewed projections. Service details/credentials never published automatically.

**Acceptance:** demonstrate declare with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh incidents, release confidence, attention after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Incident command and postmortem

Route: `/build/[projectId]/incidents/[incidentId]`
Audience: incident responders and authorized stakeholders
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** timeline, roles, mitigation, communications, postmortem/actions. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** severity, state, timestamps, service, impact, actor events, mitigation, root-cause confidence, followups. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** timeline actor/type/time; action owner/state. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** mitigate; publish reviewed status; resolve; postmortem; create actions. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** full page; action ticket pane; external publish confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/incidents/:incidentId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate incident/events/tickets/release/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Resolution records evidence; postmortem changes versioned. Public messages require explicit audience and confirmation.

**Acceptance:** demonstrate mitigate with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh incident/events/tickets/release/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement Releases list/detail with version, scope, milestone, readiness, risk, QA state, approval, and publish/deploy event links; require a review preview before release transitions.
- [x] Implement QA catalog and run execution with case/version, assignee, environment, result, evidence attachment, defect link, and regression filters; preserve in-progress run state on navigation.
- [ ] Implement Incidents list and command/postmortem detail with severity, owner, timeline, affected release/tickets, actions, communications, and audit trail.
- [ ] Apply typed filters for release state/date/owner, QA result/environment, and incident severity/status/time; counts and report drill-downs must reflect only authorized records.
- [x] Use full pages for QA execution and incident command, panes for source tickets, and mobile ordered-list alternatives for dense matrices with usable sticky actions.
- [x] Verify concurrent QA edits, release gate refusal, incident timeline ordering, evidence file access, direct-link/Back behavior, tenant/project denial, persisted status/audit, and cache/report refresh.
