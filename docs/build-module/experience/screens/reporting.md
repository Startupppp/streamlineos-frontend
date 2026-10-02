# reporting screen specifications

Status: Planned

## Problem Statement

Users need explicit reporting flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). All listed endpoints and additions are Planned. Screen-specific rules below override the general overview catalog.

## User Stories

1. As a PMs, PjMs, agencies, analysts, I want project reports with metric opens exact filtered work collection, so that no create/run dead end: generated result or observable job.
2. As a resource managers and project managers, I want workload with ticket pane, so that do not mix hours and points in same denominator; unavailable hr still permits explicit project capacity defaults.
3. As a freelancers, agencies, finance-authorized managers, I want time and budget with time sheet, so that build owns planning baseline; timesheets owns time/rates/approval; accounting owns ledger/invoice/payment.

## Implementation Decisions

### Project reports

Route: `/build/[projectId]/reports`
Audience: PMs, PjMs, agencies, analysts
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** report library, Overview/Flow/Quality/Time/Budget/Client/Outcome tabs, builder. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** metric title/definition, value/unit, period, comparison, source time, authorized denominator, chart/table. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** date between; person/team/status/type/cycle/release/client IN; shared custom filters. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** configure; save; run; schedule; export; drill down. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** metric opens exact filtered work collection; builder full page. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/reports` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate reports/source revisions/dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** No Create/Run dead end: generated result or observable job. Exact metric formula plus freshness and scope shown.

**Acceptance:** demonstrate configure with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh reports/source revisions/dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Workload

Route: `/build/[projectId]/workload`
Audience: resource managers and project managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** people/team timeline, capacity band, unassigned work. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** person/team, available hours/points, allocated effort, overlap, leave projection, overload/gap. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** person/team/skill/project/type IN; period between; overload EQ. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** reassign/reschedule with impact preview; edit capacity in owner. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** ticket pane; person capacity sheet; HR availability contextual action. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/workload` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Build owns this record or its explicit project association. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate workload/ticket dates and capacity projection; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Provide accessible ordered-list alternative to the spatial view.

**Lifecycle decision:** Do not mix hours and points in same denominator; unavailable HR still permits explicit project capacity defaults.

**Acceptance:** demonstrate reassign/reschedule with impact preview with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh workload/ticket dates and capacity projection after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Time and Budget

Route: `/build/[projectId]/budget`
Audience: freelancers, agencies, finance-authorized managers
Entry points: persona sidebar or More, scoped parent record, command search, notification and authorized deep link.

**Layout and components:** budget totals, baseline/change history, time breakdown, invoice status. Follow shared header/toolbar/card styling; surface urgent exceptions before ordinary metadata.

**Exact projection/card/row fields:** currency, baseline/approved changes, consumed/remaining/forecast, rate visibility, time approvals, invoice refs. Every record also includes revision, source freshness and allowed actions; missing optional metadata occupies no empty card row. Header title/name remains visible at mobile width.

**Filters and operators:** period between; person/work type/milestone IN; billable EQ; payment status IN. Stable field IDs, typed values and FilterEnvelope v1 are required. Removable chips, Clear all and filtered-empty explanation are mandatory for collections; form settings use field/section search instead of invented work filters.

**Primary and secondary flows:** log time; propose budget change; open Timesheets/Accounting; reconcile projection. Create/edit validates client-side for feedback and server-side for authority. Click a primary action opens the appropriate short sheet or full editor; after successful commit reconcile the canonical record and close only when input is safely persisted.

**Opening and return:** time sheet; Accounting page; change-request pane. Direct record links reconstruct the full detail; mobile pane is full screen. Back/close restores authorized origin query, scroll anchor and focus. Complex external handoffs include safe return context.

**Data/API/schema:** proposed `GET /build/projects/:projectId/budget` returns the named projection or bounded items/pageInfo collection; domain changes use canonical POST/PATCH commands with expectedRevision and Idempotency-Key. Time/financial writes call Timesheets/Accounting owner. The architecture catalog and dashboard/onboarding contracts take precedence over illustrative screen GET paths for specialized batch/activation operations.

**Access and cache:** Read and action permissions plus canonical record/project reachability are required. Invalidate budget/time/financial projections/report/dashboard; use private tenant/principal/scope/permissionVersion keys and after-commit data-version events. Shared layout never expands access.

**States and recovery:** inherited state matrix plus missing linked source, stale projection and partial cross-module availability. Preserve edits and display safe retry/correlation ID. No successful toast before commit/reconciled result.

**Mobile:** inherited drawer, full-screen record, sticky action and 44 px targets. Use compact card rows and expandable property groups.

**Lifecycle decision:** Build owns planning baseline; Timesheets owns time/rates/approval; Accounting owns ledger/invoice/payment. Never add amounts across currencies silently.

**Acceptance:** demonstrate log time with authorized persisted state and audit; prove filters produce the declared matching records; verify the specified click/return/deep-link behavior; deny unrelated tenant/project and inappropriate role; retry without duplicate side effects; refresh budget/time/financial projections/report/dashboard after change. Include populated, empty, filtered-empty, failure, keyboard and mobile evidence.

### Organization budget overview and compatibility destination

Route: Planned `/build/budget`, resolved to `/build/all-work?view=budgets` after Build access and budget/report permission checks. The compatibility route must be installed before advertising the sidebar/search action. It addresses the historical organization Budget 404 recorded in the research pack; the project route `/build/[projectId]/budget` remains the detailed budget owner.

Audience: organization/Build owners and administrators, plus delegated finance or project managers whose budget fields are permitted. A normal contributor may see a project cost-free delivery view but not inferred revenue, rates, or hidden project counts.

**Layout and components:** organization currency selector, period selector, budget summary with source freshness, exception strip for overrun/forecast risk, project budget table, and drill-down. One row shows project key/name, client display if authorized, budget baseline and approved changes, actuals from Timesheets, committed amount, remaining amount, forecast, variance, currency, owner, next review date, and source timestamps. Do not add totals across currencies without an explicit conversion rate source and as-of time; default to separate currency groups.

**Filters and operators:** project/client/owner/team/product/status IN, period between, over-budget boolean, forecast risk threshold, currency EQ. All predicates use FilterEnvelope v1 after authorization and share semantics with report export and drill-down. Clicking a row opens the project budget page in full-page context; clicking a metric opens the exact authorized filtered project list. Back restores period, currency, filters, sort, cursor, and scroll.

**Actions:** save/share the governed budget report, export authorized rows, open project budget, request a budget change, and open Accounting for invoice/payment context. The page does not mutate the Accounting ledger or Timesheets entries. Saved views and export inherit the same field policy as the live page. Empty, denied, stale actuals, partial Accounting outage, multi-currency, and no authorized projects have distinct states.

**Data interface and schema:** `OrganizationBudgetProjectionQuery` is a bounded authorized report over project budget baselines plus Timesheets/Accounting projections. Query input is `FilterEnvelope v1`, sort allowlist, cursor, and currency/period. Row output includes `projectRef`, `budgetRevision`, `timeSourceRevision`, `financeSourceRevision`, `generatedAt`, `allowedActions`, and permitted monetary fields as decimal-string wire values with currency. The exact HTTP operation and generated Zod response contract are established by the Reports/metrics package; `/build/budget` is a UI route, not an inferred backend endpoint. Cache is private to actor, tenant, permission version, filter, currency, and source revisions; budget approval, time approval, and finance reconciliation invalidate their owning projection.

**Mobile and acceptance:** stacked project rows show name, currency, baseline, actual, variance, and freshness first; advanced columns expand. Verify populated projects, mixed currencies, revoked access, finance outage, matching CSV/export, stable cursor, budget change drill-down, browser return, and current database query plan. The historical 404 is closed only by a working authorized route, not by this specification.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.
