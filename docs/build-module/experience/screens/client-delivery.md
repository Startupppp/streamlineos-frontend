# client delivery screen specifications

Status: Planned

## Problem Statement

Users need explicit client delivery flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a approvers, requesters, managers, I want organization approval queue with decision sheet with immutable artifact, so that named approver policy determines decision ability, not broad view permission alone.
2. As a project approvers and clients through portal, I want project approvals with decision sheet, so that changed artifact makes approval stale; new version requires reapproval according to locked policy.
3. As a freelancers, PMs, PjMs, triagers, I want project intake with request pane, so that conversion atomically creates/link canonical ticket and preserves request provenance.
4. As a triagers, project collaborators; client uses portal projection, I want request detail with direct full page, so that internal and external comments are distinct channels.
5. As a assigned triagers and PMs, I want triage mode with request/ticket pane, so that snooze is queue metadata, not losing request.
6. As a existing bug-report users, I want legacy bug-feedback list with 302 /intake?view=bug-reports after scope check, so that do not discard browser/environment annotations or evidence.
7. As a existing linked-report users, I want legacy bug-feedback detail with 302 /intake/[requestId], so that never assume legacy id equals request id.
8. As a Build Owner/Admin; delegated visibility manager, I want portal administration and preview with preview full portal context, so that success only when grant persists and entry is available; unpublished records stay inaccessible.
9. As a freelancers, PjMs, clients via portal, I want change requests with change pane, so that approval stores exact impact/version; applying accepted change is idempotent and cannot bypass accounting.
10. As a PMs, PjMs, contributors, I want decisions register with decision pane, so that decided version immutable.
11. As a PjMs, PMs and risk owners, I want risk register with risk pane, so that exposure formula/version explicit; qualitative scales have declared mappings; stale risk appears in attention.

## Implementation Decisions

### Organization approval queue

Route: `/build/approvals`
Audience: approvers, requesters, managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** My decisions, Requested, Client, Completed tabs and decision sheet. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** subject, object type/version, requester, approvers, due, stage, state, safe change summary. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** state/type/project/client/requester/approver IN; due relative; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** approve; reject; request changes; delegate allowed; withdraw; remind. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** decision sheet with immutable artifact; artifact deep link. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/approvals` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate approvals, artifact readiness, inbox/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Named approver policy determines decision ability, not broad view permission alone.

**Acceptance:** demonstrate approve with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh approvals, artifact readiness, inbox/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project approvals

Route: `/build/[projectId]/approvals`
Audience: project approvers and clients through portal
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** project-scoped approval queue and create sheet. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** approval subject, artifact/version, approver sequence/quorum, due, state, decision history. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** same approval filters with fixed project. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** request approval; attach version; decide; withdraw. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** decision sheet; file preview; ticket pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/approvals` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate project approvals, release/milestone readiness, portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Changed artifact makes approval stale; new version requires reapproval according to locked policy.

**Acceptance:** demonstrate request approval with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh project approvals, release/milestone readiness, portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project intake

Route: `/build/[projectId]/intake`
Audience: freelancers, PMs, PjMs, triagers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** New, Reviewing, Needs information, Accepted, Declined, Duplicate; bug view. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** request ID/title, source, reporter/client, submitted date, type, severity, owner, SLA, state, linked ticket. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** type/source/client/owner/state IN; age greater; due relative; severity IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** request info; triage; convert; merge duplicate; decline response. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** request pane; created ticket pane; bug attachments preview. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/intake` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate intake, ticket links, portal request state, dashboards; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Conversion atomically creates/link canonical ticket and preserves request provenance. Never create repeated ticket on retry.

**Acceptance:** demonstrate request info with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh intake, ticket links, portal request state, dashboards after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Request detail

Route: `/build/[projectId]/intake/[requestId]`
Audience: triagers, project collaborators; client uses portal projection
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** source description and evidence, metadata rail, requester discussion, related work, triage controls. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** request ID/revision, source/legacy IDs, environment/browser if bug, attachments, state, owner, ticket mapping. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** conversation audience/time; relationships type. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** classify; ask question; convert; decline; merge. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** direct full page; collection pane; ticket nested pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/intake/:requestId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate request/intake/ticket/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Internal and external comments are distinct channels. Publish response explicitly; mask personal data in capture evidence.

**Acceptance:** demonstrate classify with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh request/intake/ticket/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Triage mode

Route: `/build/[projectId]/triage`
Audience: assigned triagers and PMs
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** one request/issue, queue sidebar, duplicate/evidence suggestions, next/previous. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** source, title, required fields, priority suggestion, owner, route, estimate, decision reason. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** queue/team/type/source/age; untriaged EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** accept; decline; snooze with wake date; route; deduplicate. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** request/ticket pane; next item remains queue context. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/triage` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate triage/intake/work views, inbox; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Snooze is queue metadata, not losing request. Denied queue differs from truly processed queue.

**Acceptance:** demonstrate accept with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh triage/intake/work views, inbox after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Legacy bug-feedback list

Route: `/build/[projectId]/feedbucket`
Audience: existing bug-report users
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** compatibility resolver to Intake bug view. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** legacy-to-request mapping; no new list owner. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** type=BUG preset; preserve allowed prior filters. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** navigate to the canonical Intake Bug reports view after authorization; Feedbucket capture and widget configuration remain available from the appropriate Intake settings actions. This compatibility route performs no record mutation.

**Opening and return:** 302 /intake?view=bug-reports after scope check. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** this browser route resolves project reachability and redirects to `/build/[projectId]/intake?view=bug-reports`. The canonical Intake query reads source-preserving Feedbucket submissions through the Triage projection. Existing Feedbucket capture endpoints remain owned by the capture adapter; no new list query or mutation is created for the redirect.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate legacy mapping/intake; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Do not discard browser/environment annotations or evidence. Feedbucket stays an ingestion adapter, not a competing workflow.

**Acceptance:** demonstrate redirect only with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh legacy mapping/intake after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Legacy bug-feedback detail

Route: `/build/[projectId]/feedbucket/[submissionId]`
Audience: existing linked-report users
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** authorized lookup then mapped request detail. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** legacy provider/project/submission ID, canonical request ID. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** none. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** resolve the unique legacy identity mapping, authorize the mapped request, then redirect to its canonical Intake detail. The compatibility route performs no mutation; a missing or inaccessible mapping gives a neutral recoverable state.

**Opening and return:** 302 /intake/[requestId]; neutral not-found if missing/inaccessible. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** an authorized resolver looks up `(organizationId, projectId, provider, legacySubmissionId)` and returns `canonicalRequestId` plus mapping revision. The browser redirects to `/build/[projectId]/intake/[requestId]`; that page reads the canonical Intake detail and paged evidence. The old route introduces no second detail owner.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate legacy mapping/grant versions; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Never assume legacy ID equals request ID. Unique mapping by tenant/project/provider/submission; unresolved mapping shows recoverable message.

**Acceptance:** demonstrate resolve mapping with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh legacy mapping/grant versions after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Portal administration and preview

Route: `/build/[projectId]/client-portal`
Audience: Build Owner/Admin; delegated visibility manager
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** published/unpublished state, checklist, granted surfaces, grant list, exact preview. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** branding, publish version, allowed artifact refs, audience/actions/expiry, last use. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** grant status/contact/surface IN; expiry before; visible record type. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** preview the exact client-visible projection and its empty states; Publish opens a confirmation showing project, audience, visible surfaces, record counts, and effective time before the versioned publish command. Unpublish shows the impact on active grants. Grant invitation and revocation use the grant owner; success waits for persisted activation and a usable entry state. A failed authorized-project loader distinguishes no reachable projects, permission denial, and network failure with a retry that preserves form input.

**Opening and return:** preview full portal context; grant sheet; artifact pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/client-portal` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate portal published revisions, grants/sessions/files/notifications; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Success only when grant persists and entry is available; unpublished records stay inaccessible. Preview follows client policy. Publication confirmation is required on both Publish and Unpublish; a preview never changes active visibility.

**Acceptance:** demonstrate publish reviewed projection with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh portal published revisions, grants/sessions/files/notifications after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Change requests

Route: `/build/[projectId]/change-requests`
Audience: freelancers, PjMs, clients via portal
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** register, impact assessment detail, approval and accounting action. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** change, client/requester, baseline/version, scope/time/cost delta, affected work, state, owner, decision. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** state/client/owner IN; cost/delay greater; due between; billable EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** assess; request info; approve/reject; apply linked work; create estimate in Accounting. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** change pane; approval sheet; Accounting contextual page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/change-requests` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate baseline/change/ticket/approval/budget/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Approval stores exact impact/version; applying accepted change is idempotent and cannot bypass Accounting.

**Acceptance:** demonstrate assess with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh baseline/change/ticket/approval/budget/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Decisions register

Route: `/build/[projectId]/decisions`
Audience: PMs, PjMs, contributors
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** list and rationale detail with supersession chain. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** statement, owner, state/date, options, rationale, evidence, affected work, supersedes. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/state/tag/linked type IN; decided date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** propose; decide; supersede; link evidence. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** decision pane; source record nested/full according to type. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/decisions` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate decisions, affected goal/roadmap/project; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Decided version immutable. Correction uses new version/supersession and preserves original reasoning.

**Acceptance:** demonstrate propose with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh decisions, affected goal/roadmap/project after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Risk register

Route: `/build/[projectId]/risks`
Audience: PjMs, PMs and risk owners
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** table/matrix and mitigation detail. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** risk, owner, probability, impact, exposure, trigger, mitigation, contingency, due, state, linked work. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/category/state IN; exposure greater; due relative; stale EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; mitigate; accept with reason; close; escalate. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** risk pane; mitigation ticket nested pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/risks` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate risks, project confidence, portfolio/dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Exposure formula/version explicit; qualitative scales have declared mappings; stale risk appears in attention.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh risks, project confidence, portfolio/dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement `/build/approvals` and project approvals as authorized queues with exact artifact/version, requester, due date, decision status, filter chips, and revision-safe Approve/Reject/Request changes sheets.
- [ ] Implement project Intake queue and request detail with source identity, submitted fields/files, assignee/status, comments, and typed source/status/date/client filters; route accepted requests through idempotent ticket/project conversion.
- [ ] Implement Triage as a focused mode over the same Intake records with next/previous, duplicate/link/routing decisions, keyboard actions, and return to the original filtered queue.
- [ ] Map legacy bug-feedback list/detail URLs by submission ID into Intake Bug reports and preserve screenshot/browser metadata, attachments, comments, and authorized record history.
- [ ] Implement portal administration/preview through client grant activation, capability and publication settings, client-safe preview, and explicit revoke/resend outcomes; keep external client sessions separate from org membership.
- [ ] Implement change-request, decision, and risk registers with owner, severity/impact, dates, linked work, status transitions, audit, and exact pane/detail navigation.
- [ ] Verify approval race/changed artifact, intake duplicate/replay, client A/B isolation, legacy deep links, grant revocation, filtered-empty, mobile sheets, keyboard triage, persisted audit, and invalidation.
