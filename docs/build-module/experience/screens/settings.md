# settings screen specifications

Status: Planned

## Problem Statement

Users need explicit settings flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a authorized org/Build/project administrators, I want build access with short edit sheet, so that owner/admin resolve broad standing; member requires assignment.
2. As a authorized org/Build/project administrators, I want client grants with short edit sheet, so that never raw token in list.
3. As a authorized org/Build/project administrators, I want organization build integrations with short edit sheet, so that least scopes; encrypted secrets; mapping tenant bound; disconnect stops jobs without deleting work.
4. As a authorized org/Build/project administrators, I want project settings with short edit sheet, so that changing key preserves alias mapping; archive impact preview; no automatic project membership expansion.
5. As a authorized org/Build/project administrators, I want project access with short edit sheet, so that project assignment requires effective build standing; change module standing separately with explicit review.
6. As a authorized org/Build/project administrators, I want workflow designer with short edit sheet, so that published version immutable; map retired statuses and validate existing items before migration.
7. As a authorized org/Build/project administrators, I want custom fields with short edit sheet, so that never reuse retired id; options have stable ids.
8. As a authorized org/Build/project administrators, I want saved views with short edit sheet, so that shared visibility does not grant records.
9. As a authorized org/Build/project administrators, I want cycle settings with short edit sheet, so that existing cycles unchanged by default; future schedule review lists exact dates and timezone.
10. As a authorized org/Build/project administrators, I want automation rules and runs with short edit sheet, so that dry run has no side effects.
11. As a authorized org/Build/project administrators, I want ai policy and history with short edit sheet, so that caller access is ceiling; no inaccessible retrieval.
12. As a authorized org/Build/project administrators, I want agent credentials with short edit sheet, so that secure vault owns secret.
13. As a authorized org/Build/project administrators, I want project integration mappings with short edit sheet, so that reuse org connection; unique external id by tenant/provider; mapping preview before import/write.
14. As a authorized org/Build/project administrators, I want webhooks and attempts with short edit sheet, so that ssrf-safe destinations; signed requests; replay key; bounded retries/jitter/dead letter; no secret payload in logs.
15. As a authorized org/Build/project administrators, I want portal settings with short edit sheet, so that single portal policy owner with project client portal administration; no competing publish toggle or grant schema.
16. As a authorized org/Build/project administrators, I want retention and recovery with short edit sheet, so that current access checked at execution and download.

## Implementation Decisions

### Build access

Route: `/build/settings/access`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** effective principals, organization standing, Build standing, assignment origin, project coverage, status, last changed. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** status/org role/Build role/origin/project/team IN; changed between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** invite; inspect effective access; assign/revoke module role; owner transfer. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/settings/access` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate Build roles and access versions; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Owner/Admin resolve broad standing; Member requires assignment. Review gained/lost access; cannot remove final owner.

**Acceptance:** demonstrate invite with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh Build roles and access versions after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Client grants

Route: `/build/settings/client-access`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** contact/client, projects/surfaces/actions, expiry, state, grant version, last access, delivery state. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** client/contact/project/state/surface IN; expiry before. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create grant; resend/rotate; revoke; exact client preview. A Member without grant permission sees an actionable Request client access flow addressed to a grantable administrator, with project and reason; this request does not activate a grant or reveal other clients. The project picker queries only reachable projects and separates empty, denied, and failed states. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/settings/client-access` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate grants, portal sessions/files/notifications; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Never raw token in list. Grant persists and link entry available before success; delivery retry visible. A request-access submission is a distinct approval/notification record with its own status and audit; it never silently grants portal access.

**Acceptance:** demonstrate create grant with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh grants, portal sessions/files/notifications after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Organization Build integrations

Route: `/build/settings/integrations`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** provider, owner, connected scope, health, last sync, job lag, failure, rate limit. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** provider/state/owner IN; synced before. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** connect; reconnect; test; pause; disconnect; view logs. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/settings/integrations` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate integration configuration/status and dependent projections; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Least scopes; encrypted secrets; mapping tenant bound; disconnect stops jobs without deleting work.

**Acceptance:** demonstrate connect with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh integration configuration/status and dependent projections after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project settings

Route: `/build/[projectId]/settings`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name/key, owner, client/product refs, dates, timezone, enabled tools, archive state. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** section search; no work filters. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** save general; manage tools; archive/restore. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate project/navigation/search/configuration; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Changing key preserves alias mapping; archive impact preview; no automatic project membership expansion.

**Acceptance:** demonstrate save general with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh project/navigation/search/configuration after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project access

Route: `/build/[projectId]/settings/access`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** members/groups/team links, role, origin, pending invitations, granted records, effective access. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** role/origin/status/team IN; name contains. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** add/change/remove project role; invite with module access; inspect. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/access` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate project access versions, private queries and queued jobs; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Project assignment requires effective Build standing; change module standing separately with explicit review.

**Acceptance:** demonstrate add/change/remove project role with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh project access versions, private queries and queued jobs after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Workflow designer

Route: `/build/[projectId]/settings/workflow`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** workflow version, statuses/category, transitions, required fields, WIP limits, approval rules, usage. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** status/category/transition; usage nonempty. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** draft; validate; preview migration; publish; restore. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/workflow` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate workflow version, tickets/board/status selectors; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Published version immutable; map retired statuses and validate existing items before migration.

**Acceptance:** demonstrate draft with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh workflow version, tickets/board/status selectors after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Custom fields

Route: `/build/[projectId]/settings/fields`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** stable ID, label/type, context, options, default, validation, sensitivity, usage/dependencies, retired state. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** type/context/state/sensitive IN; label contains. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create/edit; reorder/group; retire; repair dependency. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/fields` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate field catalog, views/filters/forms/AI/schema projections; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Never reuse retired ID; options have stable IDs. Type change with data requires explicit validated migration.

**Acceptance:** demonstrate create/edit with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh field catalog, views/filters/forms/AI/schema projections after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Saved views

Route: `/build/[projectId]/settings/views`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, owner, audience, view type, filter summary, sort/group/columns, version, dependencies. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/audience/type/state IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create/duplicate; change default; publish; restore; retire. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/views` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate saved view versions, navigation/widget query; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Shared visibility does not grant records. Stale save uses version conflict; private Save as new available.

**Acceptance:** demonstrate create/duplicate with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh saved view versions, navigation/widget query after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Cycle settings

Route: `/build/[projectId]/settings/iterations`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** cadence/timezone, start/day, duration, naming, capacity unit, overlap, rollover defaults. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** no collection filters; cadence form. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** preview schedule; save new cadence; choose next effective cycle. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/iterations` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate iteration schedule/current-cycle/capacity; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Existing cycles unchanged by default; future schedule review lists exact dates and timezone.

**Acceptance:** demonstrate preview schedule with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh iteration schedule/current-cycle/capacity after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Automation rules and runs

Route: `/build/[projectId]/settings/automations`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** rule name, owner/principal, trigger, filter v1, actions, enabled, usage, last run, failure. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** enabled/owner/trigger/state IN; run time between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** build rule; dry run; enable/pause; replay bounded failed action. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/automations` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate automation config/run history and affected domain records; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Dry run has no side effects. Execution current-policy checked; event causation dedupe and loop ceiling; failure job visible.

**Acceptance:** demonstrate build rule with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh automation config/run history and affected domain records after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### AI policy and history

Route: `/build/[projectId]/settings/agents`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** agent/tool capability, scope ceiling, confirmation class, allowance, run/cost/tokens, retention, disabled state. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** actor/tool/state IN; time between; cost greater. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** configure allowed tools; review proposal; execute confirmed; cancel; kill switch. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/agents` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate agent policy version and active proposals/context cache; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Caller access is ceiling; no inaccessible retrieval. Proposed actions reauthorize at execution and reject stale source revisions.

**Acceptance:** demonstrate configure allowed tools with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh agent policy version and active proposals/context cache after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Agent credentials

Route: `/build/[projectId]/settings/agents/credentials`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** secret reference/name, provider, purpose, owner, scope, created/expiry/rotation, health. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** provider/owner/state IN; expiry before. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create/rotate/revoke reference; test minimal connection. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/agents/credentials` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate credential versions, agent/provider sessions; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Secure vault owns secret. Display one-time value only at creation when required; never return through list, AI, audit or export.

**Acceptance:** demonstrate create/rotate/revoke reference with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh credential versions, agent/provider sessions after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Project integration mappings

Route: `/build/[projectId]/settings/integrations`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** org connection ref, external repo/project, direction, field/status mappings, sync cursor, health. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** provider/direction/state IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** map; test; sync/reconcile; pause; unlink. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/integrations` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate project mapping and integration projections; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Reuse org connection; unique external ID by tenant/provider; mapping preview before import/write.

**Acceptance:** demonstrate map with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh project mapping and integration projections after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Webhooks and attempts

Route: `/build/[projectId]/settings/integrations/webhooks`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** destination, subscribed event types, signing version, owner, enabled, attempt state/time/response class. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** event/state IN; attempt date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create; verify; rotate signing; test; pause; replay. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/integrations/webhooks` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate webhook config/signature version and delivery history; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** SSRF-safe destinations; signed requests; replay key; bounded retries/jitter/dead letter; no secret payload in logs.

**Acceptance:** demonstrate create with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh webhook config/signature version and delivery history after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Portal settings

Route: `/build/[projectId]/settings/portal`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** brand, surfaces, audience-safe record policies, request form, approval reminders, domain, publish version. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** surface/visibility; grant state. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** configure draft; preview actual client; publish; open grant manager. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/portal` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate portal published versions/public assets/grants; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Single portal policy owner with project Client portal administration; no competing publish toggle or grant schema.

**Acceptance:** demonstrate configure draft with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh portal published versions/public assets/grants after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Retention and recovery

Route: `/build/[projectId]/settings/retention`
Audience: authorized org/Build/project administrators
Entry points: Settings from its project/Build sidebar, admin search and permission-aware deep link.

**Layout and components:** configuration sections, editable draft, impact review, audit/run history. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** policy/type, retained days, legal hold if entitled, deletions pending, recovery window, export status. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** record type/job state IN; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** preview impact; set future policy; request export/deletion; restore retained record. Create/edit validates client-side for feedback and server-side for authority. Publish/enable/access/secret changes show effect before confirmation; drafts do not mutate active policy.

**Opening and return:** short edit sheet; complex workflow/rule builder full page; privileged impact confirmation. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/settings/retention` returns the named projection or bounded items/pageInfo collection; configuration changes use PUT/PATCH with expectedRevision; publish/rotate/replay is an explicit POST command. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Manage authority is required to change settings; read-only configuration is separately filtered. Invalidate retention policy, jobs, files/search/projections; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus invalid draft, stale policy version, dependency conflict and failed validation/dry run. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Current access checked at execution and download. No deletion of held record; irreversible purge requires exact impact confirmation.

**Acceptance:** demonstrate preview impact with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh retention policy, jobs, files/search/projections after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Implement Build access and project access/member screens with current Org Owner/Admin bypass, explicit Org Member module assignment, project reachability, permission preview, and immediate revocation.
- [ ] Implement client grants and portal settings with audience-bound capabilities, published-field preview as the actual client, expiry, resend/revoke, and separate client identity.
- [ ] Implement workflow, custom-field, saved-view, and cycle designers as revisioned drafts with validation, dependency/impact preview, publish/restore, and no active-policy change before confirmation.
- [ ] Implement automation rules/runs and AI policy/history with dry-run, bounded allowed actions, tool permissions, token/quota display, failure replay, and human confirmation for consequential changes.
- [ ] Implement agent credentials, integration mappings, and webhooks with secret references only, rotation/revoke, signed callback verification, attempt history, retry/dead-letter state, and unlink impact.
- [ ] Implement retention/recovery with legal hold, export/delete preview, future effective policy, durable job status, and auditable restore/irreversible confirmation.
- [ ] Give every settings section field/section search or declared typed filters, correct short-sheet versus full-builder navigation, mobile form layout, 44 px controls, and safe return to its parent settings page.
