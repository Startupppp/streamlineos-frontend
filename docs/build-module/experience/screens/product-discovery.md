# product discovery screen specifications

Status: Planned

## Problem Statement

Product evidence, prioritization, delivery, and outcomes must remain traceable.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a PMs and product leaders, I want products list with product full page, so that product is enduring customer outcome domain, not a project alias.
2. As a PMs, leadership, engineers, I want product overview with evidence/opportunity pane, so that overview must distinguish evidence strength, delivery progress, and measured outcomes.
3. As a PMs, researchers, support/client managers, I want product feedback with feedback pane, so that raw feedback retains provenance and consent.
4. As a PMs and researchers, I want product insights with opportunity pane, so that default rice: reach×impact×confidence/effort; explicit period/units, confidence 0–1 and effort >0.
5. As a PMs and product teams, I want product goals with goal full page, so that reuse goal commands; product tab is a scope, never a second goal table.
6. As a PMs and delivery managers, I want product projects with project full page, so that unlink does not delete project.
7. As a PMs and stakeholders, I want product roadmap with initiative pane, so that opportunity acceptance creates linked initiative or epic via canonical command; retains decision and scoring snapshot.

## Implementation Decisions

### Products list

Route: `/build/managed-products`
Audience: PMs and product leaders
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** list/grid with product lifecycle and evidence/delivery summaries. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** name, owner, lifecycle, teams, goal health, feedback trend, next release, last review. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** owner/team/lifecycle/health/segment/tag IN; text contains. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create product; link projects; archive. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** product full page; quick status inline. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate products, roadmap/goals/dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Product is enduring customer outcome domain, not a project alias. Archive preserves references.

**Acceptance:** demonstrate create product with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh products, roadmap/goals/dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Product overview

Route: `/build/managed-products/[managedProductId]`
Audience: PMs, leadership, engineers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** problem/outcome summary, attention, feedback themes, goals, initiatives, release/outcome cards. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** mission, audience, owner, lifecycle, north-star measures, goals, next release, decisions. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** period; team/segment IN; initiative status IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** record opportunity; link feedback/project/goal; post product update. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** evidence/opportunity pane; project/release full detail. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products/:managedProductId` returns one revisioned detail projection and separately paged heavy sections; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate product, linked evidence/goals/roadmap/results; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Overview must distinguish evidence strength, delivery progress, and measured outcomes.

**Acceptance:** demonstrate record opportunity with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh product, linked evidence/goals/roadmap/results after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Product feedback

Route: `/build/managed-products/[managedProductId]/feedback`
Audience: PMs, researchers, support/client managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** inbox table, theme groups, request detail and related opportunities. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** request/evidence text, source, customer/segment authorized, frequency, sentiment/manual tag, owner, state, linked work. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** source/segment/customer/theme/state/owner IN; date between; duplicate EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** capture; tag; deduplicate with source retention; link opportunity; route to Intake. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** feedback pane; related ticket nested pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products/:managedProductId/feedback` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate feedback/theme/customer-impact/product; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Raw feedback retains provenance and consent. AI theme is a suggestion with citations, never proof of customer need.

**Acceptance:** demonstrate capture with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh feedback/theme/customer-impact/product after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Product insights

Route: `/build/managed-products/[managedProductId]/insights`
Audience: PMs and researchers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** evidence themes, opportunity table, scoring comparison, outcome reviews. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** opportunity/problem, evidence count/freshness, affected segment, owner, hypothesis, confidence, score inputs, outcome target. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** theme/segment/owner/state IN; evidence age greater; score between; confidence IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create opportunity; compare score; override with reason; schedule experiment/review. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** opportunity pane; source feedback pane; outcome review sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products/:managedProductId/insights` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate opportunities/insights, roadmap/goals, outcome dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Default RICE: reach×impact×confidence/effort; explicit period/units, confidence 0–1 and effort >0. Unknown input yields Unscored, not zero. Overrides versioned.

**Acceptance:** demonstrate create opportunity with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh opportunities/insights, roadmap/goals, outcome dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Product goals

Route: `/build/managed-products/[managedProductId]/goals`
Audience: PMs and product teams
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** scoped Goals view with metric and initiative detail. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** same goal projection plus product linkage and outcome measurement source. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** goal filters plus fixed product ID. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** create/link goal; check in; measure outcome. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** goal full page; source evidence pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products/:managedProductId/goals` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate product goal links, global goals/dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Reuse goal commands; product tab is a scope, never a second goal table.

**Acceptance:** demonstrate create/link goal with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh product goal links, global goals/dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Product projects

Route: `/build/managed-products/[managedProductId]/projects`
Audience: PMs and delivery managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** linked project collection plus relationship actions. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** project identity, owner, health, dates, milestone, linked initiative/goal. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** project health/status/owner IN; date between; linked initiative IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** link/unlink; create from opportunity. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** project full page; link sheet. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products/:managedProductId/projects` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate product-project links, projects/roadmap/rollups; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Unlink does not delete project. Owner must authorize both relation and project access.

**Acceptance:** demonstrate link/unlink with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh product-project links, projects/roadmap/rollups after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Product roadmap

Route: `/build/managed-products/[managedProductId]/roadmap`
Audience: PMs and stakeholders
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** product-scoped Now/Next/Later/timeline plus priority panel. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** initiative, problem, RICE/override, goal, evidence, owner, horizon, release. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** horizon/team/goal/state/segment IN; confidence IN; date between. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** prioritize; plan initiative; link tickets/release; publish external preview. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** initiative pane; evidence/ticket nested pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/managed-products/:managedProductId/roadmap` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate roadmap, opportunities, release scope, external projection; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Opportunity acceptance creates linked initiative or epic via canonical command; retains decision and scoring snapshot.

**Acceptance:** demonstrate prioritize with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh roadmap, opportunities, release scope, external projection after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement managed-products list and overview with owner/lifecycle/health/segment/tag filters, stable product page links, create/archive commands, and linked project/goal summaries.
- [ ] Implement feedback capture with source/customer/segment/theme/date/duplicate filters; preserve raw evidence and provenance when deduplicating or routing to Intake.
- [ ] Implement insights/opportunities with evidence links, confidence, score, age, override reason, experiment/review dates, and source drill-down.
- [ ] Implement product Goals, Projects, and Roadmap tabs over canonical Build links; prioritize initiatives with stated evidence and connect planned delivery to measurable outcomes.
- [ ] Complete the trace from feedback → evidence → opportunity → prioritization → roadmap → project/ticket delivery → outcome review without copying source records or losing attribution.
- [ ] Apply product-scoped permission/field policy, bounded filters, source freshness, client-safe publication preview, and cache invalidation across feedback, goals, roadmap, and delivery.
- [ ] Verify create/link/unlink, duplicate feedback, score override audit, mobile panes/full pages, saved-filter return, denial across products/tenants, and outcome drill-down to persisted source evidence.
