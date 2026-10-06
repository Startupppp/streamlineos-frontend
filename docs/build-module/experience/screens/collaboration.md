# collaboration screen specifications

Status: Planned

Current verified bounded source127: the [whiteboard delete receipt](../../audit/bugs-and-verification.md#whiteboard-delete127-reconciliation--2026-10-06) records backend940e7c7a39cc229af230724ddaaf6d2bbdc8a74d, root's existing scoped-write RETURNING/zero-row404 correction,101 focused tests, strict/scoped checks, fresh production/test-inclusive TypeScript and two matching-hash independent reviews. Authorization semantics remain unchanged; refusal precedes audit. Current unverified: physical SQL/RLS/concurrent deletion, complete actor/tenant/share/token matrix, durable canvas versions/export/keyboard, deletion/restore/persistence/cache/events/browser/mobile and deployment/operations. No live deletion or screenshot is claimed, and the complete Whiteboard delivery item stays open. Historical/planned route contracts below are not current runtime evidence.

## Problem Statement

Users need explicit collaboration flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a project managers, freelancers, stakeholders, I want project updates with update pane, so that ai never publishes automatically.
2. As a project collaborators, I want project chat with thread pane, so that use platform chat as message owner through project-scoped projection; access is at least project reachability.
3. As a project collaborators, I want meetings list with meeting full page, so that build owns project agenda/action links; home owns invitations/calendar event.
4. As a participants with project access, I want meeting detail with ticket pane, so that transcript retrieval requires source access and consent; summarization does not broaden participant access.
5. As a project collaborators, I want project knowledge index with wiki full editor, so that knowledge platform owns pages/history; build stores project associations and client-publication refs, not a second document store.
6. As a project readers/editors, I want knowledge page with full editor, so that concurrent edit is versioned; publication preview separates private blocks/links.
7. As a authorized page editors/readers, I want knowledge history with full history, so that restore is a new audited change; existing client-published version unchanged until republished.
8. As a project collaborators, I want whiteboard with full canvas, so that collaboration adapter reauthorizes access; no arbitrary remote executable embeds.
9. As a project members, freelancers, clients through grants, I want project files with file preview sheet, so that files platform owns scan/storage.
10. As a triagers, freelancers, admins, I want forms list with form full builder, so that public submitters need no internal seat; rate limits, abuse, consent and attachment scan enforced.
11. As a authorized form managers, I want form builder with full builder, so that conditions validated against typed fields; retired field dependency prompts repair.

## Implementation Decisions

### Project updates

Route: `/build/[projectId]/updates`
Audience: project managers, freelancers, stakeholders
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** chronological status cards, period, audience preview composer. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** period, author, health, accomplishments, next, blockers, decisions, published version, acknowledgements. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** author/audience/health/type IN; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** draft; AI cited draft; preview; publish; acknowledge. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** update pane; editor sheet; linked work pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/updates` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate updates, portal/inbox, project freshness; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** AI never publishes automatically. Client publication includes only authorized approved projection.

**Acceptance:** demonstrate draft with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh updates, portal/inbox, project freshness after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project chat

Route: `/build/[projectId]/chat`
Audience: project collaborators
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** conversation/threads, linked work sidebar, search. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** message, actor, sent/edited time, thread count, mentions, authorized attachment refs. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** text search; actor IN; time between; thread state. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** reply; mention; link; convert message to ticket/decision. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** thread pane; ticket pane; important decision full record. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/chat` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Message writes call Chat owner. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate chat thread/unread and new record namespaces; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Use platform Chat as message owner through project-scoped projection; access is at least project reachability. Decisions must link durable record.

**Acceptance:** demonstrate reply with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh chat thread/unread and new record namespaces after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Meetings list

Route: `/build/[projectId]/meetings`
Audience: project collaborators
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** past/upcoming list, agenda and action-item summary. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** title, time/timezone, participants allowed, Home calendar ref, notes/actions/decisions count. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** period between; participant IN; action state IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** schedule in Home; attach notes; create actions. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** meeting full page; action ticket pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/meetings` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate meeting references, Home events, linked work; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Build owns project agenda/action links; Home owns invitations/calendar event. Do not duplicate recording/transcript storage.

**Acceptance:** demonstrate schedule in Home with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh meeting references, Home events, linked work after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Meeting detail

Route: `/build/[projectId]/meetings/[meetingId]`
Audience: participants with project access
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** agenda, notes, transcript reference, decisions/actions, files. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** title, event ref, participants, agenda, notes revision, source consent, action owners/due. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** action owner/state IN; transcript authorized text search. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** edit notes; turn action into ticket; record decision; reschedule in Home. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; Calendar owning module page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/meetings/:meetingId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate meeting/action/decision and Home projection; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Transcript retrieval requires source access and consent; summarization does not broaden participant access.

**Acceptance:** demonstrate edit notes with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh meeting/action/decision and Home projection after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project knowledge index

Route: `/build/[projectId]/wiki`
Audience: project collaborators
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** tree/list, search, recently changed pages and linked records. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** title, parent, owner, version, updated, access/published marker. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** title contains; owner/tag IN; updated between; published EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; organize; link; publish client version with preview. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** wiki full editor; backlink ticket pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/wiki` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Page writes call Knowledge owner. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate knowledge page/index/search/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Knowledge platform owns pages/history; Build stores project associations and client-publication refs, not a second document store.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh knowledge page/index/search/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Knowledge page

Route: `/build/[projectId]/wiki/[pageId]`
Audience: project readers/editors
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** reading width, editor toolbar, backlinks, comments, publish controls. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** title, body, revision, owner, parent, collaborators, linked work, audience. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** comments actor/time; backlinks type. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** edit draft; publish internal/client version; restore. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** full editor; ticket pane; history page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/wiki/:pageId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Page writes call Knowledge owner. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate page/index/search/version/portal; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Concurrent edit is versioned; publication preview separates private blocks/links. Never authorize by backlink alone.

**Acceptance:** demonstrate edit draft with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh page/index/search/version/portal after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Knowledge history

Route: `/build/[projectId]/wiki/[pageId]/history`
Audience: authorized page editors/readers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** version list and side-by-side diff. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** revision, author, time, summary, field/body diff. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** author IN; time between; revision EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** compare; restore as new revision. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** full history; back to page at selected version. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/wiki/:pageId/history` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Page writes call Knowledge owner. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate page/history/search/portal revision; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Restore is a new audited change; existing client-published version unchanged until republished.

**Acceptance:** demonstrate compare with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh page/history/search/portal revision after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Whiteboard

Route: `/build/[projectId]/whiteboard`
Audience: project collaborators
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** canvas, frames, palette, linked records, versions. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** board ID/name/revision, object IDs/types/positions, text, links, comments, author. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** frame/object type; authorized search. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** draw; connect; comment; snapshot; export; link ticket. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** full canvas; linked ticket pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/whiteboard` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate board snapshot/collaboration and backlinks; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Collaboration adapter reauthorizes access; no arbitrary remote executable embeds. Advanced canvas is deferred until core delivery gates.

**Acceptance:** demonstrate draw with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh board snapshot/collaboration and backlinks after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project files

Route: `/build/[projectId]/files`
Audience: project members, freelancers, clients through grants
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** grid/list, upload queue, preview and version drawer. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, type, size, version, uploader, scan state, updated, linked record, visibility. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** type/uploader/link type/visibility IN; date between; scan state IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** upload; new version; preview/download; attach; publish; archive. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** file preview sheet; linked ticket pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/files` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Upload/download calls Files owner. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate file metadata/links/portal versions; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Files platform owns scan/storage. Quarantined files unavailable; download reauthorized before short-lived URL issuance.

**Acceptance:** demonstrate upload with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh file metadata/links/portal versions after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Forms list

Current verified bounded136/139: root fc28bf1d8 supplies the canonical filtered-empty body Clear with the existing heading; backend e3a948601 rejects invalid/repeated isActive through existing queryBoolean, with official artifacts at root ff747e155. The [canonical receipt](../../audit/bugs-and-verification.md#forms-decisions-and-query-contract136139--2026-10-06) records tests/reviews and actual1000 q/type/status Clear/refresh/responsive recovery. Desktop pointer remains obstructed by the floating Feedback widget; keyboard recovery is observed.139 is undeployed. Full builder/version/publish/answers/conversion, populated actions, physical actors/tenants/persistence/effects and operations remain Current unverified; the full delivery checklist stays open.

Route: `/build/[projectId]/forms`
Audience: triagers, freelancers, admins
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** published/draft list, submissions metrics and public-link actions. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, owner, version, audience, destination, state, submissions/accepted, updated. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** state/audience/owner/destination IN; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** Create opens an unsaved builder draft; Cancel discards the local draft and leaves the list unchanged. Explicit Save draft or Publish persists a named, validated form and returns a canonical form ID. Duplicate uses an idempotent command; publish/unpublish, copy URL, and inspect submissions follow the saved form. Create/edit validates client-side for feedback and server-side for authority; close only after a committed result.

**Opening and return:** form full builder; submissions Intake filtered. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/forms` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate forms, public descriptors, intake; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Public submitters need no internal seat; rate limits, abuse, consent and attachment scan enforced. Opening or cancelling New Form must not create an untitled server record; if autosave is introduced, the user first opts into a named recoverable draft.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh forms, public descriptors, intake after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Form builder

Route: `/build/[projectId]/forms/[formId]`
Audience: authorized form managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** closed field palette, preview canvas, conditional/routing panel, Publish. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, schema/version, fields/options/required rules, audience, routing, success text, consent, spam policy. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** builder field search/type; submissions state/date. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** add/reorder; preview desktop/mobile; validate; publish; rotate public URL. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** full builder; submissions pane; public preview. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/forms/:formId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate form versions/public cache/intake routes; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Conditions validated against typed fields; retired field dependency prompts repair. No executable custom HTML/script.

**Acceptance:** demonstrate add/reorder with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh form versions/public cache/intake routes after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement project Updates with draft/preview/publish/acknowledge, audience and health filters, cited AI drafts, and client-safe publication revisions.
- [ ] Implement project Chat threads with authorized mentions, search, attachment/link previews, and conversion to canonical ticket or decision without duplicate writes.
- [ ] Implement Meetings list/detail with participant/action filters and notes/decision/action links; schedule or reschedule in Home Calendar with signed return context.
- [ ] Implement Wiki index/page/history with hierarchy, title/tag/published filters, revision compare/restore, backlinks, comments, and separate internal versus client publication.
- [ ] Implement Whiteboard full-page canvas with durable versions, linked tickets, export, keyboard alternative, and permission-safe snapshot/share behavior.
- [ ] Implement Files index and preview with type/uploader/visibility/scan filters, versioned uploads, short-lived signed download, malware state, retention, and linked-record authorization.
- [ ] Implement Forms list and full builder with versioned fields, destination mapping, publish preview, response detail, and source-preserving conversion into Intake or Ticket.
- [ ] Verify pane versus full-page openings, mobile/keyboard alternatives, publish/revoke timing, cross-tenant and client field denial, idempotent conversion, file URL expiry, cache refresh, and persisted audit.
