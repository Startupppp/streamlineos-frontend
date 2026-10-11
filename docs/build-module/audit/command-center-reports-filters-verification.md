# Command Center, reports, and filters — browser pass

Recorded from the Cursor IDE browser on 2026-10-11 against `http://localhost:1000`, then fixed in the working tree. No cookies or tokens are included. Post-fix reload is blocked: every open tab now redirects to `/signin?session=expired`.

This does not close the [Command Center](../experience/03-command-center-and-personal-dashboards.md#delivery-checklist), [reporting](../experience/screens/reporting.md#delivery-checklist), or [filter system](../experience/06-ui-component-and-filter-system.md#delivery-checklist) checklists.

## Method

- Authenticated session in the IDE browser. `fetch(..., { credentials: "include" })` is 401; CORS rejects `x-org-id`. Read-only API probes used `Authorization: Bearer` from `/api/auth/session`.
- Viewport is 220 px wide. Layout checks used `Emulation.setDeviceMetricsOverride` at 1280 and DOM `getBoundingClientRect`. Screenshots of the emulated viewport are cropped and were not used as evidence.
- Writes: this user's Command Center layout only. Blockers was removed, saved, confirmed after reload, then added back. No project, ticket, or production-data writes.

## Defects found and fixed

### CCF-001 — Overdue card opened Assigned, not Overdue

- Screen URL: `/build/command-center`
- Checklist source: Command Center drill-downs
- Expected: the Overdue card (count 4) opens the same four tickets as My Work `?tab=overdue`
- Actual: `href="/build/my-work"` opened Assigned
- Fix: `command-center-summary-widgets.tsx` now links to `/build/my-work?tab=overdue`

### CCF-002 — Risks "View all" was Access Denied

- Screen URL: `/build/command-center` → `/build/risks`
- Checklist source: FE-55 (never link to Access Denied)
- Method, path, status: navigation to `/build/risks` redirected to `/access-denied?required=route%3Aunregistered`
- Expected: every visible link opens a reachable surface
- Actual: "View all" was an unregistered route
- Fix: the header link is gone. Each risk row links to `/build/${projectId}/risks`

### CCF-003 — Blockers copy, scope, and missing drill-down

- Screen URL: `/build/command-center`
- Expected: "Your issues that are blocked by other work", same set as My Work Blocked
- Actual: empty copy said "No overdue blocked tickets"; query used org-wide `scope=blocked`; no "View all"
- Live counts were 0 for both `scope=blocked` and `scope=mine&blockedOnly=true`, so the mismatch is from the catalog and My Work, not from current data
- Fix: query is now `{ scope: "mine", blockedOnly: true, excludeStatus: "DONE,CANCELLED" }`; empty copy matches; "View all" goes to `/build/my-work?tab=blocked`

### CCF-004 — All Work search overlapped Filters at 1280

- Screen URL: `/build/all-work?view=timeline&priority=HIGH&teamId=35`
- Expected: search, Filters, Team, and Product sit in one row without overlap
- Actual: Search input 774–966 px overlapped Filters 938–1050 px. Product sat at 1218–1378 px, past 1280. Cause: `SearchInput` `min-w-[12rem]` inside a `min-w-[10rem]` slot, and the inner toolbar row could not wrap
- Fix: the search field is `min-w-0`; the inner row wraps

### CCF-005 — Mobile Team/Product trigger hid the applied value

- Screen URL: All Work at a mobile breakpoint
- Expected: the Team trigger shows the selected team
- Actual: desktop showed "enginering"; the mobile `ResponsiveBuildFilterSelect` button showed only "Team"
- Fix: the mobile trigger shows the selected option label, or the field name when unset

### CCF-006 — Saved views dropped product, team, sort, and calendar/timeline

- Screen URL: `/build/all-work`
- Expected: save and apply restore the visible filters and layout
- Actual: save omitted `productId`, `teamId`, `group`, `sort`, `dir`. Apply left a stale product/team in the URL. Calendar and timeline (`gantt`) layouts were never restored
- Fix: `all-work-view-params.ts` owns the full key list and the `gantt` → `timeline` mapping

### CCF-007 — Overview Open KPI ignored the server open count

- Screen URL: `/build/6/reports?tab=overview`
- Expected: Open uses the status-group count (`healthBreakdown.openTickets`)
- Actual: the strip summed status *names*, so a custom "Shipped" status counted as open
- Fix: prefer `healthBreakdown.openTickets`

### CCF-008 — Workload empty state was a bare paragraph

- Screen URL: `/build/[projectId]/reports?tab=workload`
- Expected: the shared empty state
- Actual: `<p>No members found</p>`
- Fix: `EmptyState` plus a 30-day window label. `GET /build/6/analytics` was 200

## Also proven

- Customize: Add widget lists placed widgets as Added. Remove Blockers + Done persisted after reload. Blockers was added back. Reset was not run, to keep this user's layout.
- After Remove, focus dropped to `<body>`. The grid now focuses the next widget's remove control.
- All Work empty-filter state: "No results match your filters" with Clear filters.
- "Filters (1 active)" excludes Team when Team is a separate control. Acceptable.
- Project 6 Overview has no KPI drill-down links. Volume range now lives in `?volumeRange=` and only affects the volume chart.

## Still open

- Open issues card (113) links to My Work Assigned (114). Assigned has no `excludeStatus`. Changing Assigned would change My Work. No exact URL exists today.
- `/build/reports` and `/build/budget` aliases, and an org-level reports/budgets view on All Work, are still Planned. Not built in this pass.
- Post-fix browser proof at 375/768/1280, keyboard Customize, and Reset. Blocked on a fresh sign-in.
- Denial, tenant isolation, and saved-view create/apply against the live API were not re-run after the param fix.

## Frontend files

- `frontend/features/build/command-center/command-center-summary-widgets.tsx`
- `frontend/features/build/command-center/command-center-risks-panel.tsx`
- `frontend/features/build/command-center/command-center-blockers-panel.tsx`
- `frontend/features/build/command-center/command-center-widget-grid.tsx`
- `frontend/features/build/shared/ticket-filter-bar.tsx`
- `frontend/features/build/shared/build-filter-select.tsx`
- `frontend/features/build/all-work/all-work-view-params.ts`
- `frontend/features/build/all-work/all-work-views-menu.tsx`
- `frontend/features/build/reports/reports-overview-tab.tsx`
- `frontend/features/build/reports/workload-section.tsx`
- `frontend/features/build/analytics/analytics-kpi-strip.tsx`
- `frontend/features/build/analytics/chart-shell.tsx`
