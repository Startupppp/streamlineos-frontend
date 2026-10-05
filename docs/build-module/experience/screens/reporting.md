# reporting screen specifications

Status: Planned

## Problem Statement

Users need explicit reporting flows instead of disconnected screens or empty shells.

## Solution

Use the following route contracts with the [shared screen contract](./shared-screen-contract.md). Illustrative endpoints and broader additions remain Planned; the bounded current Quality projection below uses the existing QA contract. Screen-specific rules below override the general overview catalog.

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

### Quality report projection

Route: `/build/[projectId]/reports?tab=quality`. Audience: product/project managers, engineers, QA contributors, freelancers and agency delivery leads with project access and `build:qa:view`. Entry is the existing Reports Quality tab or authorized deep link; no duplicate route or QA data owner. The broader reporting checklist remains open.

**Current verified source and focused tests:** ReportsTabs composes ReportsQualityTab using the existing black/white Tabs, BuildListToolbar, BuildFilterSelect, Switch, StatCardGrid, BuildListSurface/DataTable and BuildMobileCard. [Canonical implementation receipt](../../audit/bugs-and-verification.md#quality-report113-and-workload-state112--2026-10-05) records matching revisions, browser observations and gaps separately. Source/test verification does not establish deployed role/tenant or populated production-result proof.

**Exact rows and summaries:** each row shows linked run name, status, environment or an em dash, and `passCount`, `failCount`, `blockedCount`, `notRunCount`, `skippedCount` as tabular numerals. Desktop uses columns; mobile uses the same fields in labeled cards. Run names open `/build/:projectId/qa/runs/:runId` as a full QA execution page, preserving normal link/modifier behavior. The five summary cards sum only returned rows. Each card says Displayed page; the explanatory text states cases can appear in multiple runs. No project-wide denominator, percentage, readiness score or all-pages total is inferred. A genuine empty state offers Open QA at `/build/:projectId/qa`; filtered empty explains clearing filters.

**Filters and cursor:** `q` uses the shared300ms debounced search and the existing server English full-text predicate over run names, not a client-only substring filter. `status` is one of `not_started`, `in_progress`, `completed`, `aborted`; All removes it. Completed runs with failures writes `failuresOnly=true` and status=completed atomically because the server requires completed runs with a failed result. Selecting another status removes failuresOnly; switching it off keeps the chosen Completed status. Clear uses the canonical clearAll, clears search/status/failures/cursor history and retains tab=quality. Shared synchronization tests cover pending typing, delayed own URL acknowledgements, external history, status-only Clear and absence of stale q restoration. Unknown enum inputs fall back locally; the server remains authoritative. Existing `cursors` URL stack supplies numeric cursor pages, Next/Previous and displayed Page N. Page size is50, ascending ID, with no invented page count or total; filter changes reset pagination. Refresh reconstructs the tab/filter state, and QA return uses browser history. Browser proof of each behavior is recorded separately from hook tests.

**Canonical data/API/schema:** `useTestRuns(projectId, {q,status,failuresOnly,cursor})` owns the only report query, `GET /build/:projectId/test-runs`. It forwards AbortSignal and the lazy existing generated testRunListPageContract. Response is `{data: TestRunListItem[],hasMore:boolean,nextCursor:number|null}`; each item retains the canonical TestRun fields plus the five persisted-result counts. The backend authorizes project reachability before reads, constrains trusted actor organization/project/deleted state, applies filters before the cursor, and aggregates counts over only authorized page run IDs. Existing DTO/response and database schemas remain owners; this report adds no endpoint, schema, permission or copied result table. Physical deployed tenant relationships/RLS and result arithmetic still require runtime proof.

**Permission, cache and error behavior:** the parent Reports route requires Build entry/project access; this projection additionally requires `build:qa:view`, independently of mutation rights. `usePageState`/PageState owns access loading, denied, read loading, original402/403/404 errors, Retry and successful content; the canonical query explicitly uses INLINE_READ_ERROR so404/503 do not escape before those states render. Its existing `buildWorkQueryKeys.projects.qa.runs(projectId, params)` uses scoped QueryClient hashing, existing60s staleTime and response parsing. Retried reads create no mutations. Successful canonical result execution (`build:qa:execute`) invalidates the existing project runs prefix, covering detail plus filtered result-count/failures lists; denied/failed execution retains previous report data, and other-project caches stay untouched in focused tests. Run creation/update/deletion retain existing canonical run invalidations. Cross-tab events, physical cache/event delivery and operational freshness are not established by these tests. This projection has no result editing, capture, export or publication action.

**Mobile and remaining acceptance:** reuse the existing mobile filter drawer/search expansion and ordered cards; no separate mobile records. Required browser cases are375/768/1280, keyboard filter access, search/status/failure selection, Clear after debounce, refresh, Open QA/Back and real run link. Populated production counts, true cursor movement, source-result persistence after a permitted change, revoked/project/tenant denial, cache/event delivery, source timestamps/formula versions and governed export parity remain Current unverified or Planned until the canonical receipt proves them. The page-scoped projection does not close the full report requirement or claim release readiness.

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

### Organization reports compatibility destination

Route: Planned `/build/reports` resolves to `/build/all-work?view=reports` after module/report permission checks. This is a stable alias for links and command search, not a second reporting data owner. Preserve an authorized saved-view ID and FilterEnvelope v1 query when redirecting; reject unknown filter fields and strip unauthorized fields. The Reports view uses the same report library, versioned metric definitions, field policies, freshness indicators, and exact filtered drill-down described for project reports above, with organization scope constrained to reachable projects. Report cards show title, metric and formula version, owner, scope, period, last generated time, source freshness, and allowed actions. Filters include project/team/owner IN, period BETWEEN, metric IN, status IN, and saved-view search; create/edit opens the full report builder, while a metric click opens the authorized source collection. Mobile cards preserve metric, period, freshness and drill-down. Acceptance requires a direct alias link, return history, tenant/field denial, consistent dashboard/export results, stale projection state, and source revisions after mutation.

## Testing Decisions

Test the public command/query behavior and committed state using the shared test matrix. Each section's acceptance paragraph is a required scenario, not a route-render smoke check. Preserve historical pack findings until the same actor/action/lifecycle is verified on the current deployment.

## Out of Scope

Implementing these routes during this documentation task; public/financial actions without domain-owner authority; copying source-of-truth records across modules.

## Further Notes

The [route table](../routes-and-screen-decisions.md) distinguishes existing routes from proposed destinations. The [research map](../../audit/research-traceability.md) explains the evidence and priority behind the decisions.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement project reports with authorized cycle/release/goal/intake/quality/health measures, explicit formulas and freshness, and metric clicks that open the exact filtered source rows.
- [ ] Implement Workload report with person/team/date capacity, planned versus unplanned work, overload/underuse, and permission-safe allocation drill-down.
- [x] Implement Time and Budget from Timesheets/Accounting-owned approved ledgers with billable/non-billable, estimate/actual/variance, currency/rate provenance, and reconciliation status.
- [ ] Resolve organization budget/reports compatibility routes to the canonical reporting destination without losing saved filters, source IDs, or deep links.
- [x] Use FilterEnvelope v1 for report, export, and drill-down parity; bound queries and asynchronous exports, and avoid mixing unknown totals or currencies.
- [ ] Verify source-row arithmetic, late approvals/reversals, role/client/tenant redaction, mobile chart table alternatives, report refresh after commands, and export audit/revocation.
