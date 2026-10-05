# Shared screen contract

Status: Planned

## Problem Statement

Short page descriptions leave engineers to decide layout, redirects, permission behavior, and failure recovery differently. This contract makes those choices consistent.

## Solution

Every screen below inherits this contract and overrides it only through an explicit route-specific decision.

## User Stories

1. As a freelancer, I want client work and approvals in context, so that I can deliver without navigating a large tool menu.
2. As a project manager, I want every count to open supporting work, so that I can explain delivery confidence.
3. As a product manager, I want feedback linked to decisions, so that prioritization remains accountable.
4. As an engineer, I want collection context preserved when I inspect work, so that I can process multiple items quickly.
5. As a content creator, I want brief, asset, review, and publication states on the same record, so that versions do not drift.
6. As a client, I want only my granted deliverables, so that internal information stays private.
7. As an administrator, I want revocation applied to reads and jobs, so that cached access cannot outlive a grant.
8. As a mobile user, I want the same actions and clear Back behavior, so that I can complete work away from a desktop.

## Implementation Decisions

### UI route and data interface are separate

`Route:` names a browser destination. A page's illustrative `GET /build/...` line is a proposed projection shape, not an approved backend operation, a generated operation ID, or evidence that such an endpoint exists. Before implementation, the owning work package must map the screen to the current controller/OpenAPI operation or propose one versioned query interface in [screen data contracts](../../architecture/screen-data-contracts.md). Do not implement a duplicate endpoint merely because its UI route appears here. Special cases are explicit: `/build` is an authorized redirect, Command Center uses the dashboard query interface, Inbox uses the owning notification projection, and legacy Feedbucket routes resolve identity then redirect.

### Layout and component appearance

Header: breadcrumb, title, scope, freshness, one primary action and at most two secondary actions. Toolbar: saved view, search, filter, group, sort, display. Content: collection or detail; 8 px spacing scale, 16–24 px content padding, semantic colors, visible focus, compact/comfortable density.

Cards: key/type above a two-line title; state/health and urgent exceptions immediately below; configured metadata; owner/avatar and due state at the bottom. Default no more than seven signals. Tables: first column key/name; owner/state/date next; optional columns selected through Display. No raw permission strings or technical IDs in ordinary product copy.

Detail: stable header, main content, property rail, activity. Long editors use full pages; quick inspection uses a right pane. Approval uses a decision sheet containing exact artifact version and Approve/Request changes/Reject. Create/edit uses a sheet for a short form and full page for a builder.

### Record opening and navigation

Collection click opens a pane for ticket, intake, epic, workstream, milestone, release, risk, decision, change request, goal preview, and approval preview. Project/product/portfolio/team opens a full page. Wiki editor, whiteboard, form builder, incident command page, and QA execution open full pages. Portal records always open portal pages.

Canonical record URLs remain stable. Pane URL records the authorized source collection and record identifier; refresh reconstructs the page/pane safely. Related ticket replaces the existing pane and pushes pane history, without stacking arbitrary drawers. Escape closes the top modal then pane. Browser Back unwinds pane history before leaving the collection. Modifier-click uses a canonical link in a new tab.

Closing restores view, filters, sorting, cursor, scroll anchor, selection, and focus. If the source row disappeared, focus the nearest remaining row and announce the change. Mobile uses a full-screen pane with Back and next/previous. Unsaved long edits offer Save draft, Discard, or Stay.

### Versioned query contract

All collections, dashboards, exports, report drill-downs, automations, and AI use FilterEnvelope v1 from the shared filter specification: version plus expression, group/condition nodes, stable fieldId, typed operator and value. No alternative predicate/op/field shape is permitted.

GET lists accept a saved view ID or serialized bounded query; complex predicates use a typed POST query endpoint. Responses contain items, pageInfo with endCursor/hasNextPage, sourceRevision, generatedAt, and optional bounded facets. Count is authorized matching records; unknown totals are shown as loaded count plus More.

Default page size 50; maximum 100. Maximum filter depth 4, conditions 50, IN values 100, scope IDs 50, search length 500. Stable sort ends in ID. Relative dates use explicit timezone. No null equals empty-string coercion. Null operators are is_empty/is_not_empty.

### Data and mutation contract

Every projection contains id, organizationId, revision, timestamps, allowedActions, and only authorized fields. UUIDs are wire strings. Monetary values use decimal strings plus currency; durations use integer seconds; instants use ISO UTC; date-only commitments use YYYY-MM-DD plus timezone context.

Create returns the canonical record and audit reference. Mutation requires expectedRevision and Idempotency-Key. Conflict is 409; rule violation 422; known-but-denied operation 403; undisclosable existence 404. Keep entered data after error; reconcile ambiguous commits by idempotency key before retrying.

Long operations return jobId, state, correlationId, and a status destination. Partial failures list only authorized failed items. Notification/provider failure does not reverse a committed domain command.

### Authorization

Use current enabled-module entitlement, active membership, operation permission, canonical project reachability, and field policy. Org Owner/Admin have broad access to enabled modules; Org Member requires explicit module assignment. Build Member contributes within granted projects. Client principal uses a separate grant projection.

The permission catalog supplies established keys. Each screen's named capability maps to those keys in generated contracts; no invented role or arbitrary wildcard grants. Shared view/dashboard visibility never grants record access.

### Cache and freshness

Private browser query keys include tenant, principal, permissionVersion, record/scope, normalized query, and revision. Server read keys additionally include dataScope hash and source version. Collection stale time 30 seconds; attention widgets 15 seconds; detail header 15 seconds; configuration 5 minutes. These are initial budgets, not guaranteed freshness.

Successful commands invalidate record, parent collection, affected relationship lists, counts, dashboards, and reports. Access/entitlement/grant changes invalidate immediately and purge sensitive browser data. Tenant switch clears prior content. Files use authorized short-lived access; raw bearer tokens are never cached in layouts or logs.

### State and mobile matrix

Loading: fixed skeleton. True empty: relevant create/import/template. Filtered empty: show active chips and reset. Denied: safe access-request path. Module unavailable: explain enable/upgrade to authorized admins. Error: preserved input, retry, correlation ID. Stale/partial: source time and explicit limitation. Offline: cached read timestamp and durable drafts only; privileged writes require connectivity.

Under 768 px, sidebar is a drawer, pane full screen, board one column at a time, filters a sheet, properties collapsible. Minimum touch target 44 px. Every drag operation has a keyboard alternative. Screen reader names, focus restoration, reduced motion, contrast and 200% zoom are required.

## Testing Decisions

Test external behavior at onboarding activation, canonical ticket commands, scoped query compilation, dashboard queries, project reachability, and portal grant exchange. Reuse existing onboarding tenant-isolation, project-access, ticket mutation, route manifest, and filter tests as prior art. Do not inspect private internal call sequences when persisted output and authorized responses suffice.

Each screen must demonstrate: populated happy path; true and filtered empty; permitted and denied actor; different-tenant actor; deep link/refresh/back/new tab; mobile/keyboard; mutation retry/conflict; correct persistence, audit, cache refresh, and linked-record drill-down. A route render alone does not close acceptance.

## Out of Scope

Application implementation, live production writes, deployment, and changing established permission keys are outside this documentation revision.

## Further Notes

Feature visibility follows role, persona, selected modules, plan, and project template. A hidden advanced destination remains reachable by authorized deep link. See the screen-specific sections for the owning data module and lifecycle.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Map every browser route to an existing or approved versioned query/command operation, with `/build`, Inbox, Command Center, and legacy Feedbucket exceptions resolved as described above.
- [ ] Implement one page shell and card/table/detail anatomy with authorized fields, freshness, allowed actions, accessible focus, and responsive density.
- [ ] Implement canonical record URLs and pane history for specified record types; prove modifier-click, refresh, Back/Forward, Escape, close-to-origin, and mobile full-screen behavior.
- [ ] Apply FilterEnvelope v1 limits, typed operators, stable sort, cursor pagination, authorized counts, and explicit timezone semantics to every collection and drill-down.
- [ ] Require expectedRevision and idempotency for retryable writes; preserve drafts after 409/422/ambiguous outcomes and reconcile committed results before success feedback.
- [ ] Enforce enabled module, active org membership, explicit Member module assignment, project/record reachability, field policy, and separate client grants at both query and command seams.
- [ ] Implement private tenant/principal/permission-version cache keys, after-commit invalidation, immediate revocation purge, source freshness, and partial/offline states.
- [ ] Run the shared browser/DB/audit/role/tenant/mobile/keyboard matrix for each adopting screen; a render or mock-only pass does not close its checklist.
