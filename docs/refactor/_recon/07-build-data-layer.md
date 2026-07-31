# Build + CRM Data Layer Recon — 07

Scope: `frontend/hooks/api/build/`, `frontend/hooks/api/crm/` (and sibling CRM hooks in `frontend/hooks/api/leads.ts`, `frontend/hooks/api/crm-settings.ts`), `frontend/lib/api-client.ts`, `frontend/lib/query-keys.ts`, `frontend/lib/api/hooks/`, `frontend/components/providers/query-provider.tsx`, `frontend/hooks/api/access.ts`, `frontend/hooks/api/dashboard.ts`.

---

## 11. Provider Defaults

**File:** `frontend/components/providers/query-provider.tsx:11–23`

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min default
      gcTime: 1000 * 60 * 10,          // 10 min gc
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

**Issues:**
- `retry: 1` retries on ALL errors, including 4xx (403 Forbidden, 404 Not Found, 409 Conflict). There is no `retryCondition` guard. Every permission-denied or not-found response fires twice, wasting bandwidth and Neon CPU. Fix: `retry: (count, err) => count < 1 && !(isApiError(err) && (err.status ?? 0) < 500)`.
- `refetchOnWindowFocus: true` with wide-open RBAC gate gaps (see §RBAC) means every tab focus can trigger 40+ API calls for users without the relevant permissions.

**Portal provider** (`frontend/features/portal/components/portal-providers.tsx:9–20`) has identical `staleTime`/`gcTime`/`retry` but no `refetchOnWindowFocus` key (defaults to `true`).

---

## 1. Hook Inventory

### Query-Key Factory

All hooks import from the central typed factory at `frontend/lib/query-keys.ts`. The factory is well-structured with namespace roots (`.all`) and parameterised sub-keys. However:

- **Inline keys exist** (see §2 below) — some hooks extend factory keys with raw spreads rather than adding factory entries.
- **Trailing `undefined` slots** on optional-param factories (see §2).

### Build Hooks (`frontend/hooks/api/build/`)

49 hook files. Selected inventory (RBAC gate column is the critical column):

| Hook | File:line | Endpoint | Query Key Factory | staleTime | enabled/RBAC gate | Paginated? |
|---|---|---|---|---|---|---|
| `useProjects` | projects.ts:113 | GET /build | `queryKeys.projects.list(filters)` | 30s | `!!id` only (no useCan) | YES (PaginatedResponse) |
| `useProject` | projects.ts:132 | GET /build/:id | `queryKeys.projects.detail(id)` | 30s | `!!id` | NO |
| `useTickets` | tickets.ts:21 | GET /build/:id/tickets | `queryKeys.projects.tickets({projectId,...filters})` | 30s | `!!projectId` | YES |
| `useProjectBoardTickets` | tickets.ts:40 | GET /build/:id/tickets (multi-page) | `queryKeys.projects.tickets({projectId,view:"board"})` | 30s | `!!projectId` (no useCan) | multi-page (see §9) |
| `useTicket` | tickets.ts:72 | GET /build/:pid/tickets/:id | `queryKeys.projects.ticket(ticketId)` | 30s | `!!ticketId && !!projectId` | NO |
| `useAllWork` | all-work.ts:23 | GET /build/all-work | `queryKeys.projects.allWork(filters)` | 30s | `enabledOption ?? true` (no useCan) | YES |
| `useInfiniteAllWork` | all-work.ts:39 | GET /build/all-work | inline extend of allWork key | 30s | `enabledOption ?? true` (no useCan) | infinite |
| `useSprints` | sprints.ts:13 | GET /build/:id/sprints | `queryKeys.projects.sprints(projectId)` | 60s | `!!projectId` (no useCan) | NO |
| `useSprint` | sprints.ts:27 | GET /build/:pid/sprints/:id | `queryKeys.projects.sprint(sprintId)` | 30s | `!!sprintId && !!projectId` | NO |
| `useEpics` | advanced.ts:26 | GET /build/:id/epics | `queryKeys.projects.epics(projectId)` | 30s | `!!projectId` (no useCan) | NO |
| `useCycles` | advanced.ts:65 | GET /build/:id/cycles | `queryKeys.projects.cycles(projectId)` | 60s | `!!projectId` (no useCan) | NO |
| `useModules` | advanced.ts:111 | GET /build/:id/modules | `queryKeys.projects.modules(projectId)` | 60s | `!!projectId` (no useCan) | NO |
| `useViews` | advanced.ts:157 | GET /build/:id/views | `queryKeys.projects.views(projectId)` | 60s | `!!projectId` (no useCan) | NO |
| `useWorkspaceViews` | advanced.ts:215 | GET /build/views | `queryKeys.projects.workspaceViews()` | 60s | NONE (no useCan) | NO |
| `useIntakeRequests` | advanced.ts:271 | GET /build/:id/intake | `queryKeys.projects.intake(projectId)` | 30s | `!!projectId` (no useCan) | NO |
| `useProjectAnalytics` | advanced.ts:328 | GET /build/:id/analytics | `queryKeys.projects.analytics(projectId)` | 5min | `!!projectId` (no useCan) | NO |
| `usePortfolios` | portfolios.ts:17 | GET /build/portfolios | `queryKeys.projects.portfolios.list(...)` | 60s | NONE (no useCan) | NO |
| `usePortfolio` | portfolios.ts:27 | GET /build/portfolios/:id | `queryKeys.projects.portfolios.detail(id)` | 60s | `!!id` | NO |
| `useManagedProducts` | managed-products.ts:20 | GET /build/managed-products | `queryKeys.projects.managedProducts.list(...)` | 60s | `useCan("build:managed-products:view")` [UNVERIFIED vs backend] | YES |
| `useManagedProduct` | managed-products.ts:38 | GET /build/managed-products/:id | `queryKeys.projects.managedProducts.detail(id)` | 60s | `useCan("build:managed-products:view")` [UNVERIFIED] | NO |
| `usePmWorkspaces` | pm-workspaces.ts:25 | GET /product-management/workspaces | `queryKeys.projects.pmWorkspaces.list(...)` | 60s | `useCan("build:workspaces:view")` [UNVERIFIED] | YES |
| `usePmWorkspace` | pm-workspaces.ts:42 | GET /product-management/workspaces/:id | `queryKeys.projects.pmWorkspaces.detail(id)` | 60s | `useCan("build:workspaces:view")` [UNVERIFIED] | NO |
| `usePmWorkspaceMembers` | pm-workspaces.ts:99 | GET /product-management/workspaces/:id/members | `queryKeys.projects.pmWorkspaces.members(...)` | 60s | `useCan("build:workspaces:members:view")` [UNVERIFIED] | YES |
| `useProjectWorkspaceMembers` | workspace-members.ts:42 | GET /build/members | `projectWorkspaceMembersQueryKeys.list(params)` | 30s | `useCan("build:members:view")` [UNVERIFIED] | YES |
| `useProjectRoster` | roster.ts:34 | GET /build/:id/roster | `rosterQueryKeys.detail(projectId)` | 30s | `useCan("build:view")` [UNVERIFIED] | NO |
| `useTeamProjects` | teams.ts:158 | GET /build/teams/:id/projects | `teamQueryKeys.projects(teamId)` | 30s | `useCan("build:teams:view")` [UNVERIFIED] | NO |
| `useVelocityReport` | reports.ts:59 | GET /build/:id/reports/velocity | `queryKeys.projectReports.velocity(projectId)` | 60s | `!!projectId` (no useCan) | NO |
| `useBurnupReport` | reports.ts:68 | GET /build/:id/reports/burnup | `queryKeys.projectReports.burnup(projectId, sprintId)` | 60s | `!!projectId` (no useCan) | NO |
| `useCfdReport` | reports.ts:81 | GET /build/:id/reports/cfd | `queryKeys.projectReports.cfd(projectId, {days})` | 60s | `!!projectId` (no useCan) | NO |
| `useCriticalPath` | reports.ts:91 | GET /build/:id/reports/critical-path | `queryKeys.projectReports.criticalPath(projectId)` | 60s | `!!projectId` (no useCan) | NO |
| `useTicketSearch` | ticket-search.ts:10 | GET /build/search/tickets | inline: `[...queryKeys.projects.all, "search", "tickets", q]` | 30s | NONE (no useCan) | NO |
| `useSubtasks` | tickets.ts:420 | GET /build/:pid/tickets/:id/subtasks | inline: `[...queryKeys.projects.all, "subtasks", {ticketId}]` | 30s | `ticketId > 0 && projectId > 0` (no useCan) | NO |

### CRM Hooks (`frontend/hooks/api/crm/`, `frontend/hooks/api/leads.ts`)

~30 query hooks. Selected inventory:

| Hook | File:line | Endpoint | Query Key Factory | staleTime | RBAC gate |
|---|---|---|---|---|---|
| `useLeads` | leads.ts:32 | GET /leads | `queryKeys.leads.list(filters)` | 2min | `options.enabled` passthrough only (no useCan) |
| `useLeadDetail` | leads.ts:43 | GET /leads/:id | `queryKeys.leads.detail(id)` | 2min | `id > 0` (no useCan) |
| `useLeadBoard` | leads.ts:52 | GET /leads/board | `queryKeys.leads.board()` | 2min | NONE (no useCan) |
| `useLeadStats` | leads.ts:60 | GET /leads/stats | `queryKeys.leads.stats(filters)` | 2min | NONE (no useCan) |
| `useLeadSlaAlerts` | leads.ts:79 | GET /leads/sla-alerts | `queryKeys.leads.slaAlerts()` | 2min | NONE (no useCan) |
| `useLeadAnalyticsSummary` | leads.ts:87 | GET /leads/analytics | `queryKeys.leads.analyticsSummary(filters)` | 2min | NONE (no useCan) |
| `useSalesLeaderboard` | leads.ts:269 | GET /leads/sales-leaderboard | `queryKeys.salesLeaderboard.list()` | 2min | NONE (no useCan) |
| `useSalesTeamCapacity` | leads.ts:278 | GET /leads/sales-team-capacity | `queryKeys.salesTeamCapacity.list()` | 2min | NONE (no useCan) |
| `useDeals` | crm/deals.ts:71 | GET /deals | `queryKeys.deals.list(filters)` | 2min | NONE (no useCan) |
| `useDealStats` | crm/deals.ts:79 | GET /deals/stats | `queryKeys.deals.stats()` | 2min | NONE (no useCan) |
| `useDealForecast` | crm/deals.ts:87 | GET /deals/forecast | `queryKeys.deals.forecast()` | 5min | NONE (no useCan) |
| `useDealAging` | crm/deals.ts:268 | GET /deals/aging | `queryKeys.deals.aging()` | ~5min | NONE (no useCan) |
| `useDealApprovals` | crm/deals.ts:260 | GET /deals/approvals | `queryKeys.deals.approvals(params)` | 2min | NONE (no useCan) |
| `useContacts` | crm/contacts.ts:18 | GET /contacts | `queryKeys.contacts.list(filters)` | 2min | NONE (no useCan) |
| `useContactDetail` | crm/contacts.ts:28 | GET /contacts/:id | `queryKeys.contacts.detail(id)` | 2min | `id > 0` (no useCan) |
| `useCrmOrganizations` | crm/organizations.ts:20 | GET /crm/organizations | `queryKeys.crmOrganizations.list(filters)` | 2min | NONE (no useCan) |
| `useSalesDashboard` | crm/analytics.ts:112 | GET /crm/sales-dashboard | `queryKeys.crm.salesDashboard()` | 2min | NONE (no useCan) |
| `useSalesDashboardKPIs` | crm/analytics.ts:136 | GET /sales/dashboard/kpis | `queryKeys.crm.salesKpis(params)` | 2min | NONE (no useCan) |
| `useLeadSourceReport` | crm/leads.ts:20 | GET /leads/source-report | `queryKeys.leads.sourceReport()` | 2min | NONE (no useCan) |
| `useDuplicateLeads` | crm/leads.ts:45 | GET /leads/duplicates | `queryKeys.leads.duplicates()` | 2min | NONE (no useCan) |

### Dashboard Hooks (`frontend/hooks/api/dashboard.ts`) — sampled for RBAC

| Hook | RBAC gate |
|---|---|
| `useDashboardStats` | `!!orgId` only (no useCan) — globally mounted |
| `useMyIssues` | `useModuleEnabled("build")` only |
| `useRecentProjects` | `useCan("build:tickets:view")` |
| `useTodayActivities` | `useCan("crm:leads:view")` |
| `useTeamAvailability` | `useCan("hr:attendance:view")` |
| `useActiveSprintSummary` | `useModuleEnabled("build")` only |
| `useLeavesToday` | `useCan("hr:leaves:view")` |
| `usePendingApprovals` | `useCan("hr:leaves:approve")` |
| `useExecutiveDashboard` | `useCan("hr:analytics:read")` — non-standard action (see §3) |

---

## 2. Query-Key Audit

**Factory:** Typed, centralised in `frontend/lib/query-keys.ts`. All Build and CRM hooks use it. **No hand-typed inline arrays at call sites** (good). However, hooks extend factory keys with inline spreads internally:

### Inline Keys Inside Hook Files

| Usage | File:line | Issue |
|---|---|---|
| `[...queryKeys.projects.all, "search", "tickets", q]` | ticket-search.ts:15 | Not in factory; invalidation requires knowing this literal |
| `[...queryKeys.projects.all, "subtasks", { ticketId }]` | tickets.ts:427 | Not in factory; invalidation requires knowing this literal |
| `[...queryKeys.projects.ticket(ticketId), "relations"]` | tickets.ts:526 | Extends detail key; not in factory |
| `[...queryKeys.dashboard.all, "todayActivities", orgId]` | dashboard.ts:85 | Not in factory |
| `[...queryKeys.dashboard.all, "leavesToday", orgId]` | dashboard.ts (hrWidgetKeys) | Local helper, not in root factory |
| `[...queryKeys.projectReports.all, "cfd", projectId]` | reports.ts:127 | Not in factory; mismatch with `queryKeys.projectReports.cfd(projectId,...)` |
| `[...queryKeys.projects.all, "timeEntries"]` | time-entries.ts:19 (invalidation) | Differs from `queryKeys.projects.timeEntries(params)`; may miss |

### Trailing `undefined` Slots — Break Prefix Invalidation

When the last key element is `undefined`, a prefix-based `invalidateQueries` call with the factory key cannot cleanly bust all variants:

| Factory Call | Key Produced | Risk |
|---|---|---|
| `queryKeys.hr.candidates()` | `[base,"hr","candidates",undefined]` | Cannot prefix-invalidate "all candidates" without the `undefined` slot |
| `queryKeys.hr.teams(undefined)` | `[base,"hr","teams",undefined]` | Same |
| `queryKeys.salesAnalytics.cycleLength()` | `[base,"salesAnalytics","cycleLength",undefined]` | `invalidateQueries({queryKey:[base,"salesAnalytics","cycleLength"]})` misses this |
| `queryKeys.salesAnalytics.lostAnalysis()` | `[base,"salesAnalytics","lostAnalysis",undefined]` | Same |
| `queryKeys.salesAnalytics.repComparison()` | `[base,"salesAnalytics","repComparison",undefined,undefined]` | Same |
| `queryKeys.projects.sprints()` | `[base,"projects","sprints",undefined]` | Used as invalidation target in `useCreateSprint`/`useUpdateSprint` — callers must pass the same `undefined` or `exact:true` |

---

## 3. RBAC Gating — Missing and Mismatched

**Rule (§11):** A `useQuery` hitting a permission-gated backend endpoint MUST set `enabled: useCan("<exact @RequirePermission key>")`.

### Critical: Entire Core Build Module Has No RBAC Gate

The following hooks hit protected `/build/...` endpoints but have **zero `useCan` call**:

- `useProjects` — `frontend/hooks/api/build/projects.ts:113` — `enabled: !!id` only
- `useTickets` — `frontend/hooks/api/build/tickets.ts:21` — `enabled: !!projectId`
- `useProjectBoardTickets` — `frontend/hooks/api/build/tickets.ts:40` — `enabled: !!projectId`
- `useSprints` — `frontend/hooks/api/build/sprints.ts:13` — `enabled: !!projectId`
- `useEpics`, `useCycles`, `useModules`, `useViews` — `frontend/hooks/api/build/advanced.ts:26,65,111,157` — `enabled: !!projectId`
- `useWorkspaceViews` — `frontend/hooks/api/build/advanced.ts:215` — **no `enabled` at all**
- `useIntakeRequests`, `useProjectAnalytics` — `frontend/hooks/api/build/advanced.ts:271,328` — `enabled: !!projectId`
- `useAllWork` / `useInfiniteAllWork` — `frontend/hooks/api/build/all-work.ts:23,39` — `enabledOption ?? true`
- `usePortfolios`, `usePortfolio` — `frontend/hooks/api/build/portfolios.ts:17,27` — no useCan
- `useVelocityReport`, `useBurnupReport`, `useCfdReport`, `useCriticalPath`, `useCycleTimeReport`, `useLeadTimeReport` — `frontend/hooks/api/build/reports.ts` — `enabled: !!projectId` only
- `useTicketSearch` — `frontend/hooks/api/build/ticket-search.ts:10` — **no `enabled` at all**

Any user who lands on a Build page — regardless of role — fires all of these queries. Without a module-enabled check at minimum, the Build module endpoint is called for users who don't have it enabled.

### Critical: Entire Core CRM + Leads Module Has No RBAC Gate

- `useLeads`, `useLeadDetail`, `useLeadBoard`, `useLeadStats`, `useLeadSlaAlerts`, `useLeadAnalyticsSummary`, `useSalesLeaderboard`, `useSalesTeamCapacity` — `frontend/hooks/api/leads.ts` — no `useCan`
- `useDeals`, `useDealStats`, `useDealForecast`, `useDealDetail`, `useDealAging`, `useDealApprovals`, `useWinLossAnalysis`, `useForecastSnapshots` — `frontend/hooks/api/crm/deals.ts` — no `useCan`
- `useContacts`, `useContactDetail`, `useContactDuplicates` — `frontend/hooks/api/crm/contacts.ts` — no `useCan`
- `useCrmOrganizations`, `useCrmOrganizationDetail` — `frontend/hooks/api/crm/organizations.ts` — no `useCan`
- `useSalesDashboard`, `useSupportDashboard`, `useCustomerExecutiveDashboard`, `useSalesDashboardKPIs`, `useSalesDashboardFunnel`, `useSalesDashboardLeaderboard`, `useRevenueVsGoal`, `useDealVelocity`, `useAgingDeals`, `useSalesCycleLength`, `useLostDealAnalysis`, `useSalesCohort` — `frontend/hooks/api/crm/analytics.ts` — no `useCan`
- `useLeadSourceReport`, `useDuplicateLeads` — `frontend/hooks/api/crm/leads.ts` — no `useCan`

### Non-Standard Action Key

`useExecutiveDashboard` at `frontend/hooks/api/dashboard.ts:413` uses:
```ts
const canView = useCan("hr:analytics:read");
```
The documented action set is `{view, create, update, delete, manage, assign, export, approve, reject, import}`. `read` is **not** in this set. The frontend catalog does contain `"hr:analytics:read"` at `frontend/lib/rbac/permissions/types.ts:416`, so it is typed — but whether the backend `@RequirePermission` decorator uses `hr:analytics:read` exactly is **[UNVERIFIED]** (backend repo `streamlineos-api` is not present locally).

### Gates That Cannot Be Verified Against Backend

All `useCan` gates in Build hooks reference keys that cannot be cross-checked without the backend repo:
- `"build:managed-products:view"` — managed-products.ts:21,39
- `"build:workspaces:view"` — pm-workspaces.ts:26,43
- `"build:workspaces:members:view"` — pm-workspaces.ts:103
- `"build:members:view"` — workspace-members.ts:46
- `"build:view"` — roster.ts:38
- `"build:teams:view"` — teams.ts:162
- `"build:manage"` — use-can-manage-project.ts:8

All marked **[UNVERIFIED]**.

---

## 4. The Clobber Bug

**No clobber bugs found in Build or CRM hooks.**

The three safe patterns used throughout are:

**Pattern A — extract then combine** (`usePendingApprovals`, `useProjectWorkspaceMembers`, `useProjectRoster`, `useTeamProjects`):
```ts
const { enabled: callerEnabled, ...restOptions } = options ?? {};
const enabled = canView && !!id && (callerEnabled ?? true);
return useQuery({ ..., staleTime, enabled, ...restOptions });
```

**Pattern B — read options.enabled explicitly** (most dashboard hooks):
```ts
return useQuery({ ..., staleTime, ...options, enabled: !!orgId && canView && (options?.enabled ?? true) });
```

**Pattern C — override at end (no RBAC gate, but caller controls)** (`useAllWork`):
```ts
const { enabled: enabledOption, ...restOptions } = options ?? {};
return useQuery({ ..., staleTime, ...restOptions, enabled: enabledOption ?? true });
```

Pattern C is safe for a hook without an RBAC gate, but becomes the clobber bug IF someone adds `enabled: !!orgId` after the spread without reading the caller's value.

---

## 5. Invalidation — Blanket Invalidation of Heavy Aggregates

### `useCreateTicket` — over-invalidates on every ticket creation

`frontend/hooks/api/build/tickets.ts:96–110`:
```ts
onSuccess: (data, variables, context, mutFnCtx) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.sprints(variables.projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });  // ← HEAVY
  queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard.all, "myIssues"] });
```
`queryKeys.projectReports.all` = `[base,"projectReports"]` busts ALL reports — velocity, burnup, CFD, critical path, cycle time, lead time — for the project, on **every** ticket creation. Most reports don't change on ticket add (velocity only changes when sprint closes; CFD only on status change).

### `useDeleteTicket` — same over-invalidation

`frontend/hooks/api/build/tickets.ts:302–316`: identical pattern including `queryKeys.projectReports.all`.

### `useUpdateTicket` — gated, but still invalidates sprints + reports conditionally

`frontend/hooks/api/build/tickets.ts:273–287`: The sprint/report invalidation is gated on `affectsSprintAggregates` (status/sprintId/points changed) — this is correct. No blanket aggregate blast here.

### `useUpdateDeal` — invalidates forecast + win/loss on every field update

`frontend/hooks/api/crm/deals.ts:123–130`:
```ts
onSuccess: (_, vars) => {
  qc.invalidateQueries({ queryKey: queryKeys.deals.all });
  qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
  qc.invalidateQueries({ queryKey: queryKeys.deals.stats() });
  qc.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
  qc.invalidateQueries({ queryKey: queryKeys.deals.winLoss() });
```
Name change ≠ forecast/win-loss change. Should gate aggregate busts on relevant fields (value, stage, closeDate, lostReason).

### `useUpdateDealStage` — `onSettled` repeats same blast

`frontend/hooks/api/crm/deals.ts:155–162`: Correct that stage change affects stats/forecast/win-loss, but `queryKeys.deals.all` is a broad invalidation hitting all deal list variants.

---

## 6. Optimistic Updates — Issues Found

### `useUpdateLead` — patches wrong cache key

`frontend/hooks/api/leads.ts:117–133`:
```ts
onMutate: async (vars) => {
  await qc.cancelQueries({ queryKey: queryKeys.leads.list() });        // ← no params
  const previousList = qc.getQueryData<PaginatedLeads>(queryKeys.leads.list());  // ← no params
```
But `useLeads` is called with filters: `queryKey: queryKeys.leads.list(filters as Record<string,unknown>)`. The key with no params = `[base,"leads","list",undefined]`; the key with filters = `[base,"leads","list",{status:"open",...}]`. These are different keys. The `cancelQueries` and `getQueryData` calls here will miss filtered list views entirely — those cached entries are not patched, causing the visible board/list to show stale data until the settle refetch.

### `useCreateStakeholder` — no optimistic snapshot despite `onMutate`

`frontend/hooks/api/crm/deals.ts:399–406`:
```ts
onMutate: async () => {
  await qc.cancelQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
},
onSettled: () => {
  qc.invalidateQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
},
```
`onMutate` cancels inflight but takes no snapshot and patches nothing. `onError` is missing — if the mutation fails, there's no rollback. The cancel-without-patch is half-baked optimism with no benefit.

### Correctly Optimistic

- `useUpdateTicket` — `frontend/hooks/api/build/tickets.ts:174` — patches detail, board, and list caches; rolls back on error; gated invalidation on settle. Correct.
- `useUpdateProject` — `frontend/hooks/api/build/projects.ts:215` — patches list and detail; rolls back. Correct.
- `useUpdateDealStage` — `frontend/hooks/api/crm/deals.ts:133` — patches deal list; rolls back. Correct.
- `useUpdateLead` — PARTIAL (see above).
- `useUpdateStakeholder` — `crm/deals.ts:409` — patches stakeholder list, rolls back. Correct.
- `useDeleteStakeholder` — `crm/deals.ts:434` — patches stakeholder list, rolls back. Correct.

---

## 7. staleTime — Missing or Defaults

No hooks are missing `staleTime` entirely — every query hook read sets one explicitly or inherits the 2min provider default. No refetch-storm risk from missing staleTime at hook level. However:

- `useDashboardStats` — `dashboard.ts:44` — `staleTime: 5 * 60_000` but **no RBAC gate** — fires for every authenticated user including those without Build/CRM modules.
- `useWorkspaceViews` — `advanced.ts:215` — no `enabled` check; `staleTime: 60_000` won't prevent initial fetch storm on page load for ungated users.

---

## 8. Raw fetch/axios Outside apiClient

**One occurrence found:**

`frontend/hooks/api/sign/public.ts:32,37`:
```ts
async function publicGet<T>(path: string, fallback: string): Promise<T> {
  const res = await fetch(buildUrl(path));   // ← raw fetch
  return parseOrThrow<T>(res, fallback);
}

async function publicPost<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(buildUrl(path), {   // ← raw fetch
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
```

This file re-implements response parsing (`parseOrThrow`) and re-imports `buildUrl` from `api-client`. The justification is that these are unauthenticated public endpoints (e-sign public session — no `Authorization` header needed), but it:
- Duplicates error-parsing logic that diverges from `parseResponse` in `api-client.ts`
- Has an unchecked `as T` cast on line 11: `return b.data as T`
- Is not a banned endpoint path in `PUBLIC_AUTH_PATHS` in `api-client.ts`, so `apiClient.get` would work if the path were added

No raw fetch or axios usage in Build or CRM hook files.

---

## 9. Hardcoded Pagination

### `useProjectBoardTickets` — bounded but hardcoded multi-page fetch

`frontend/hooks/api/build/tickets.ts:37–70`:
```ts
const BOARD_PAGE_SIZE = 100;
const BOARD_MAX_PAGES = 5;
```
Fetches up to 500 tickets in a single query via Promise.all. The backend hard cap is 100/page (per §19), so this is compliant, but it's a client-side defined ceiling that bypasses the shared `TablePagination` pattern and fetches everything upfront. This is the kanban board strategy — acceptable per §23 (windowing for boards) but the limit is not derived from server.

### `useCrmOrganizationsForPicker` — hardcoded `page: 1, limit: 100`

`frontend/hooks/api/crm/organizations.ts:37–41`:
```ts
queryFn: () =>
  apiClient.get<PaginatedCrmOrganizations>("/crm/organizations", {
    page: 1,
    limit: 100,     // ← hardcoded
    search: search ?? undefined,
  }),
```
This is the banned pattern per §25. The hook accepts a `search` param but always fetches page 1 with 100 items rather than accepting pagination params from the caller. If an org has > 100 CRM organizations, the picker is silently incomplete.

---

## 10. Debouncing

`useDebouncedValue` exists at `frontend/hooks/common/use-debounce.ts:5` — it debounces the **value** (correct pattern: input state updates immediately, debounced value drives the query key). The REQUEST is only fired after the delay.

`useTicketSearch` at `frontend/hooks/api/build/ticket-search.ts:10` accepts `q: string` with `placeholderData: keepPreviousData`. It does not debounce internally (correct — debouncing is a call-site concern). Whether callers debounce before passing `q` is a component-layer concern (outside this lane).

No hook debounces input state itself. The pattern is correct at the hook layer.

`placeholderData: keepPreviousData` (v5 function syntax) is correctly used in:
- `useTickets` — tickets.ts:32: `placeholderData: (prev) => prev`
- `useProjectBoardTickets` — tickets.ts:68: `placeholderData: (prev) => prev`
- `useLeads` — leads.ts:38: `placeholderData: keepPreviousData`
- `useContacts` — crm/contacts.ts:24: `placeholderData: keepPreviousData`
- `useCrmOrganizations` — crm/organizations.ts:29: `placeholderData: keepPreviousData`
- `useAllWork` — all-work.ts:33: `placeholderData: (prev) => prev`
- `useTicketSearch` — ticket-search.ts:19: `placeholderData: keepPreviousData`

All paginated/searched queries have `placeholderData`. ✓

---

## 12. Type Forcing

### `as Record<string, unknown>` casts on typed filter objects

Widespread pattern wherever typed filter objects are passed to `apiClient.get`:
- `crm/deals.ts:73`: `apiClient.get<Deal[]>("/deals", filters as Record<string, unknown>)`
- `crm/contacts.ts:22`: `apiClient.get<PaginatedContacts>("/contacts", filters as Record<string, unknown>)`
- `crm/organizations.ts:26`: `apiClient.get<PaginatedCrmOrganizations>("/crm/organizations", filters as Record<string, unknown>)`
- `leads.ts:36`: `apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>)`
- `crm-settings.ts:155,328`: same pattern

Root cause: `apiClient.get` has signature `get<T>(url: string, params?: Record<string, unknown>): Promise<T>`. The typed filter interfaces are not assignable without a cast. Fix: widen the `params` type in `api-client.ts` to accept `Record<string, string | number | boolean | undefined | null>` or use a generic params type — eliminates all these casts.

### `as T` casts in raw fetch helper

`frontend/hooks/api/sign/public.ts:11,13`:
```ts
const b = body as Record<string, unknown>;
if (b.success === true && "data" in b) return b.data as T;
return body as T;
```
Both casts are unsafe. The function should use a type guard instead.

---

## Summary of Top 10 Findings by Severity

| # | Severity | Finding | File:line |
|---|---|---|---|
| 1 | **P0 — Security** | All core Build queries (`useProjects`, `useTickets`, `useSprints`, `useEpics`, `useAllWork`, `usePortfolios`, etc.) have **no RBAC gate**. They fire for every authenticated user, including those without Build module access or the relevant permission. Combined with `retry: 1`, each 403 fires twice. | build/projects.ts:113, tickets.ts:21, all-work.ts:23, advanced.ts:26,65,111,157,215,271,328, portfolios.ts:17, reports.ts:59–117 |
| 2 | **P0 — Security** | All core CRM queries (`useLeads`, `useDeals`, `useContacts`, `useSalesDashboardKPIs`, etc.) have **no RBAC gate**. Same issue. | leads.ts:32,43,52,60,79,87,269,278; crm/deals.ts:71–295; crm/contacts.ts:18,28; crm/analytics.ts:112–242 |
| 3 | **P1 — Correctness** | `useUpdateLead` optimistic update patches `queryKeys.leads.list()` (no params) but `useLeads` is mounted with filters — the visible filtered list is never patched, giving stale data until settle refetch. | leads.ts:117–133 |
| 4 | **P1 — Performance** | `useCreateTicket` and `useDeleteTicket` blanket-invalidate `queryKeys.projectReports.all` on every ticket creation/deletion, busting velocity/burnup/CFD/critical-path/cycle-time/lead-time reports even when they haven't changed. | tickets.ts:96–110, 302–316 |
| 5 | **P1 — Performance** | `retry: 1` on all queries with no 4xx guard — every permission-denied/not-found response fires the backend twice per mount. | components/providers/query-provider.tsx:17 |
| 6 | **P2 — Correctness** | Hardcoded `page: 1, limit: 100` in `useCrmOrganizationsForPicker` silently truncates orgs with > 100 CRM organizations. | crm/organizations.ts:37–41 |
| 7 | **P2 — Correctness** | `useCreateStakeholder` calls `cancelQueries` in `onMutate` but takes no snapshot and has no `onError` rollback — cancel-without-patch is a broken half-optimistic pattern. | crm/deals.ts:399–406 |
| 8 | **P2 — Hygiene** | Raw `fetch` with reimplemented response parser in e-sign public hooks; includes unchecked `as T` casts. | hooks/api/sign/public.ts:32,37 |
| 9 | **P2 — Hygiene** | Widespread `as Record<string, unknown>` casts on typed filter objects — root cause is `apiClient.get` param type; fix at the source to eliminate all casts. | crm/deals.ts:73, leads.ts:36, crm/contacts.ts:22, crm/organizations.ts:26, crm-settings.ts:155,328 |
| 10 | **P3 — Hygiene** | Seven inline query keys not registered in `queryKeys` factory; five factory functions produce trailing `undefined` slots that break prefix invalidation. | ticket-search.ts:15, tickets.ts:427,526, time-entries.ts:19; query-keys.ts (cycleLength, lostAnalysis, repComparison, sprints(undefined), candidates(undefined)) |

---

## Key Facts for Fixers

- **API client is clean.** `frontend/lib/api-client.ts` correctly: dedupes token fetches via a shared promise, refreshes on 401, auto-signs out on persistent 401, extracts backend error messages (string and `string[]` validation arrays). No issues.
- **No clobber bugs** in the hooks that DO have RBAC gates — all use the safe pattern correctly.
- **`useCan` hook** (`frontend/hooks/api/access.ts:31`) resolves from cached `AccessResponse`; returns `false` while loading (safe default-deny); org owner bypass present.
- **Backend repo** (`streamlineos-api`) not present in this working tree — all `@RequirePermission` key cross-checks are **[UNVERIFIED]**.
- `useDebouncedValue` at `frontend/hooks/common/use-debounce.ts:5` debounces value correctly; the query layer does not need changes for debouncing.
