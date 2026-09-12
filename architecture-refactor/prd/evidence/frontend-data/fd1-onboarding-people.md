# FD1 — Scoped Request Inventory: Onboarding & People Journeys

Source audit: 2026-09-12. Scope: two journeys only.
`(authenticated)` layout: `frontend/app/(authenticated)/layout.tsx`
QueryProvider: `frontend/components/providers/query-provider.tsx`

---

## Summary Counts

| Category | Count |
|---|---|
| Duplicate HTTP requests (true, after TanStack coalescing) | **0** |
| Repeated SQL (backend) | UNVERIFIED — backend not in scope |
| Duplicate React subscriptions (same underlying stream) | **0** |

---

## Journey 1: signup → org-setup → dashboard

### 1a. Shell reads (every authenticated `/dashboard` mount)

These fire from `DashboardShell` (`components/layout/dashboard-shell.tsx`) and its lazy children, which wrap every `(authenticated)` route.

| screen/component (file:line) | hook | canonical query key (exact factory call) | API route + method | trigger | staleTime+gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `DashboardShell` (dashboard-shell.tsx:110) | `useAccess()` | `platformCoreQueryKeys.access.me()` | GET `/me/access` | mount, windowFocus, reconnect | 30 000 ms / 10 min | `!!orgId && !!userId` | yes | KEEP | access.ts:64–75; server prefetch in access.ts (prefetch/access.ts:21–25) warms this; shell re-read hits cache |
| `AccessVersionSync` via `useAccessVersionSync` (use-access-version-sync.ts:24) | `useAccess({ staleTime: Infinity, refetchOnMount:false, refetchOnWindowFocus:false, refetchOnReconnect:false })` | `platformCoreQueryKeys.access.me()` | GET `/me/access` | version change only | Infinity (overridden to 30 000 ms by shell observer — minimum wins in TanStack v5) | same as above | yes | KEEP | Same key as above; TanStack coalesces; no extra HTTP. layout-client.tsx:51–54 |
| `OrgSwitcher` (org-switcher.tsx:98) | `useGetOrganizations()` | `platformCoreQueryKeys.organization.all` (static array) | GET `/organization` | mount, windowFocus, reconnect | 60 000 ms / 10 min | `status === "authenticated"` | yes | REPAIR — staleTime 60 s should be 5 min (session/org tier) | auth-hooks.ts:183–194 |
| `NotificationBell` (notification-bell.tsx:69) | `useUnreadNotificationCount()` | `platformCoreQueryKeys.notifications.unreadCount()` | GET `/notifications/unread-count` | mount; SSE stream invalids this key | 5 min (NOTIFICATION_FALLBACK_INTERVAL_MS) / 10 min | `!!orgId` | yes | KEEP | notifications-inbox.ts:139–153; refetchOnWindowFocus:false is correct |
| `NotificationBell` (notification-bell.tsx:68) | `useNotificationEvents()` | n/a — SSE stream, no query key | SSE `/notifications/events` (token-exchange POST first) | mount | n/a | `status === "authenticated" && !!orgId` | n/a (AbortController) | KEEP | use-notification-events.ts:141–163; module-level singleton with subscriber ref-count, only one stream per org |
| `TrialBanner` (trial-banner.tsx:18) | `useSubscription()` | `growthAndSignQueryKeys.billing.subscription()` | GET `/billing` | mount | 5 min / 10 min | `!!orgId && useCan("billing:subscription:view")` | yes | REPAIR — billing data read on every route; should be lazy-loaded or moved to a billing-context provider that renders only on billing-adjacent routes | subscription.ts:94–104; dashboard-shell.tsx:36 (TrialBanner rendered unconditionally inside shell) |
| `usePushSubscription` (dashboard-shell.tsx:111) | no `useQuery`; side-effect only | — | POST `/push/subscribe` (conditional on permission + opt-out) | mount, permission change | — | `userId && permission === "granted" && !optedOut` | no | KEEP | use-push-subscription.ts:100–107; mutation not a read query |

### 1b. Authenticated layout server prefetches

| prefetch factory (file:line) | queryKey | staleTime | scope hash | matches client key? |
|---|---|---|---|---|
| `prefetchAccess()` (prefetch/access.ts:11) | `platformCoreQueryKeys.access.me()` | 30 000 ms | `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))` via `createServerQueryClient()` | YES — client `QueryProvider` uses same `authenticatedScope` + `scopedQueryKeyHashFn`. Proven by query-scope.ts:29–48 and query-provider.tsx:79 |

### 1c. Org-setup page (`/org-setup`) — outside `(authenticated)` layout

Route: `app/org-setup/page.tsx` (full "use client", no server prefetch, no authenticated shell).

| screen/component (file:line) | hook | canonical query key | API route + method | trigger | staleTime+gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `OrgSetupPage` (org-setup/page.tsx:56) | `useOrgSetupSessionQuery()` | `platformCoreQueryKeys.orgSetup.session()` | GET `/org/setup/session` | mount | 30 000 ms / default 10 min | `true` (always) | yes | KEEP | lib/api/hooks/org.ts:46–54 |
| `useSetupProvisioning` (use-setup-provisioning.ts:36) | `useOrgSetupStatusQuery({ refetchInterval: 2 000 ms })` | `platformCoreQueryKeys.orgSetup.status()` | GET `/org/setup/status` | mount when `isStarted && !hasTimedOut`; polling every 2 s | 0 ms (always stale) / 10 min | `isStarted && !hasTimedOut` | yes | KEEP — staleTime 0 is correct for active provisioning poll | lib/api/hooks/org.ts:56–72; use-setup-provisioning.ts:36–43 |

### 1d. Dashboard page reads (`/dashboard`)

Route: `app/(authenticated)/dashboard/page.tsx`. Server prefetches `dashboard.stats` via `prefetchDashboardStats()` (prefetch/dashboard.ts:12–24).

| screen/component (file:line) | hook | canonical query key | API route + method | trigger | staleTime+gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `DashboardClient` (dashboard-client.tsx:95) | `useDashboardStats()` | `collaborationQueryKeys.dashboard.stats()` | GET `/dashboard/stats` | mount | 5 min / 10 min | `!!orgId` | yes | KEEP | hooks/api/dashboard.ts:95–107; server prefetch warms on first render |
| `DashboardClient` (dashboard-client.tsx:97) | `useMyIssues({ enabled: access.projectsEnabled })` | `collaborationQueryKeys.dashboard.myIssues()` | GET `/dashboard/my-issues` | mount | 5 min / 10 min | `buildEnabled && projectsEnabled` | yes | KEEP | hooks/api/dashboard.ts:109–120; ALSO called in DashboardDeferredBody:157 — same key, TanStack coalesces. Comment at deferred-body.tsx:152 explains design |
| `DashboardDeferredBody` (dashboard-deferred-body.tsx:115) | `useRecentProjects()` | `collaborationQueryKeys.dashboard.recentProjects()` | GET `/dashboard/recent-projects` | IntersectionObserver fires `deferredVisible` | 5 min / 10 min | `deferredVisible && projectsEnabled && canViewTickets` | yes | KEEP | hooks/api/dashboard.ts:142–158 |
| `DashboardDeferredBody` (dashboard-deferred-body.tsx:125) | `useTeamAttendance()` | `collaborationQueryKeys.dashboard.teamAttendance()` | GET `/dashboard/team-attendance` | deferred visible | 65 000 ms / 10 min | `deferredVisible && hrEnabled && canViewAttendance` | yes | KEEP | hooks/api/dashboard.ts:307–320 |
| `DashboardDeferredBody` (dashboard-deferred-body.tsx:147) | `useRecentActivity()` | `collaborationQueryKeys.dashboard.recentActivity()` | GET `/dashboard/recent-activity` | deferred visible | 5 min / 10 min | `deferredVisible && projectsEnabled && canViewTickets` | yes | KEEP | hooks/api/dashboard.ts:179–196 |
| `DashboardDeferredBody` (dashboard-deferred-body.tsx:157) | `useMyIssues({ enabled: projectsEnabled })` | `collaborationQueryKeys.dashboard.myIssues()` | GET `/dashboard/my-issues` | mount (not deferred) | 5 min / 10 min | `buildEnabled && projectsEnabled` | yes | KEEP — second consumer, same key, TanStack deduplicates. Intentional; comment at line 152 | dashboard-deferred-body.tsx:152–162 |
| `DashboardDeferredBody` (dashboard-deferred-body.tsx:165) | `useActiveSprintSummary()` | `collaborationQueryKeys.dashboard.activeSprintSummary()` | GET `/dashboard/active-sprint` | deferred visible | 5 min / 10 min | `deferredVisible && projectsEnabled` | yes | KEEP | hooks/api/dashboard.ts:160–177 |
| `DashboardDeferredBody` (dashboard-deferred-body.tsx:171) | `useTodayActivities()` | `collaborationQueryKeys.dashboard.todayActivities()` | GET `/dashboard/today-activities` | deferred visible | 5 min / 10 min | `deferredVisible && crmEnabled && canViewCrmLeads` | yes | KEEP | hooks/api/dashboard.ts:127–140 |
| `LeavesTodayWidget` (hr-widgets.tsx via dynamic import) | `useLeavesToday()` | `collaborationQueryKeys.dashboard.leavesToday()` | GET `/dashboard/leaves-today` | deferred visible + `canViewLeaves` renders widget | 2 min / 10 min | `!!orgId && canView("hr:leaves:view")` | yes | KEEP | hooks/api/dashboard.ts:237–250 |
| `TeamAttendanceWidget` (hr-widgets.tsx) | — (data passed as prop from `useTeamAttendance`) | — | — | — | — | — | — | KEEP — no query, data is prop-drilled from DashboardDeferredBody | dashboard-deferred-body.tsx:128 |
| `PendingApprovalsWidget` (hr-widgets.tsx) | `usePendingApprovals()` | `collaborationQueryKeys.dashboard.pendingApprovals()` | GET `/dashboard/pending-approvals` | deferred visible + `canApproveLeaves` | NOTIFICATION_FALLBACK_INTERVAL_MS (5 min) / 10 min | `!!orgId && useCan("hr:leaves:approve")` | yes | KEEP | hooks/api/dashboard.ts:291–305 |
| `BirthdaysWidget` (hr-widgets.tsx, batch2Ready) | `useBirthdays()` | `collaborationQueryKeys.dashboard.birthdays()` | GET `/dashboard/birthdays` | `batch2Ready` (setTimeout 0 after deferred) + hrEnabled | DAILY_DATA_STALE_TIME_MS (12 h) / 10 min | `!!orgId && hrEnabled` | yes | KEEP | hooks/api/dashboard.ts:276–289 |
| `UpcomingHolidaysWidget` (hr-widgets.tsx, batch2Ready) | `useUpcomingHolidays()` | `collaborationQueryKeys.dashboard.upcomingHolidays()` | GET `/dashboard/upcoming-holidays` | batch2Ready + hrEnabled | DAILY_DATA_STALE_TIME_MS (12 h) / 10 min | `!!orgId && hrEnabled` | yes | KEEP | hooks/api/dashboard.ts:252–262 |
| `PublicDocumentsCard` (server slot, dashboard/page.tsx:7) | `usePublicDocuments(limit=6)` | `collaborationQueryKeys.dashboard.publicDocuments(6)` | GET `/hr/documents?limit=6` | mount (passed as server-rendered slot) | 5 min / 10 min | `!!orgId && hrEnabled && useCan("hr:documents:view")` | yes | KEEP — key includes limit | hooks/api/dashboard.ts:422–436 |
| `ExpensesWidget` (server slot) | UNVERIFIED — `features/hr/expenses/expenses-widget.tsx` not inspected | — | — | — | — | — | — | UNVERIFIED | dashboard/page.tsx:6 |
| `ExecutiveKpiWidget` (dynamic, canViewExecutive) | `useExecutiveDashboard()` | `collaborationQueryKeys.dashboard.executive()` | GET `/dashboard/executive` | mount when `canViewExecutive` | 5 min / 10 min | `!!orgId && useCan("hr:analytics:read")` | yes | KEEP | hooks/api/dashboard.ts:407–420 |
| `GuidedTourOverlay` (dynamic) | `useGuidedTours()` | `platformCoreQueryKeys.onboardingFlow.tours()` | GET `/onboarding/tours` | mount | 30 000 ms / 10 min | gated via `useGatedQuery("onboarding:tours:view")` | yes | KEEP | hooks/api/onboarding-flow.ts:136–142 |
| `ModuleSetupBanners` (dashboard-client.tsx:268) | `useModuleChecklists()` | `platformCoreQueryKeys.onboardingFlow.moduleChecklists()` | GET `/onboarding/module-checklists` | mount | 30 000 ms / 10 min | gated via `useGatedQuery("onboarding:module-checklists:view")` | yes | KEEP | hooks/api/onboarding-flow.ts:86–93 |

---

## Journey 2: invitations → employee admission

### 2a. Invitation acceptance (`/invitation/[token]`) — in `(auth)` layout, no authenticated shell

| screen/component (file:line) | hook | canonical query key | API route + method | trigger | staleTime+gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `InvitationPage` (app/(auth)/invitation/[token]/page.tsx:62) | `useValidateInvitation(token)` | `platformCoreQueryKeys.invitation.token(token)` | GET `/organization/invitations/validate?token=…` | mount | 60 000 ms / 10 min | `!!token` | yes | KEEP | hooks/common/auth-hooks.ts:107–116; retry:false correct for one-time token |

Mutations (not reads): `useAcceptInvitation`, `useDeclineInvitation` — not in scope for read inventory.

### 2b. Employee onboarding (`/employee-onboarding`) — outside `(authenticated)` layout

Route: `app/employee-onboarding/page.tsx`. Full "use client". No server prefetch. Layout: `app/employee-onboarding/layout.tsx` (not inspected for layout-level reads — UNVERIFIED).

| screen/component (file:line) | hook | canonical query key | API route + method | trigger | staleTime+gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `useOnboardingWizard` (use-onboarding-wizard.ts:104) | `useOnboardingSessionQuery()` | `platformCoreQueryKeys.onboardingFlow.session()` | GET `/onboarding/session` | mount | 30 000 ms / 10 min | `true` (always enabled) | yes | KEEP | hooks/api/onboarding-flow.ts:40–48 |
| `useOnboardingWizard` (use-onboarding-wizard.ts:116) | `usePersonalDetailsQuery()` | `platformCoreQueryKeys.onboardingFlow.personalDetails()` | GET `/onboarding/personal-details` | mount (unconditional) | 30 000 ms / 10 min | `true` (always enabled) | yes | KEEP — prefetch is intentional for smooth step-switch UX; staleTime 30 s caps frequency | lib/api/hooks/onboarding.ts:37–44 |
| `useOnboardingWizard` (use-onboarding-wizard.ts:121) | `useBankDetailsQuery()` | `platformCoreQueryKeys.onboardingFlow.bankDetails()` | GET `/onboarding/bank-details` | mount (unconditional) | 30 000 ms / 10 min | `true` (always enabled) | yes | REPAIR — always fetches bank details even when user is on step 1 (personal); gate with `enabled: session?.completedSteps.includes('personal') \|\| step !== STEP_IDS.PERSONAL` to eliminate the initial wasted round trip for first-time visitors. Customer impact: adds ~50–100 ms to every new employee's first onboarding page load with no benefit until they reach step 2. | lib/api/hooks/onboarding.ts:70–76; use-onboarding-wizard.ts:121 |

---

## Specific Questions

### Q1 — Shell reads on every route; route-unrelated lists?

Shell reads confirmed on every `(authenticated)` route (from `layout.tsx` → `LayoutClient` → `DashboardShell`):

| read | route-related? |
|---|---|
| `useAccess()` → GET `/me/access` | YES — identity/RBAC, used everywhere |
| `useGetOrganizations()` → GET `/organization` | YES — org-switcher in header |
| `useUnreadNotificationCount()` → GET `/notifications/unread-count` | YES — badge count |
| SSE `/notifications/events` | YES — live notification stream |
| `useSubscription()` → GET `/billing` | BORDERLINE — billing subscription status used only by `TrialBanner`; permission-gated but fires for every admin/owner on every route. It is billing data, not a badge or identity read. Meets the "route-unrelated" threshold for most routes. |

`useSubscription` is the only candidate that exceeds "identity/access/lightweight badge" scope. It is gated on `billing:subscription:view` which limits it to admins; staleTime 5 min prevents repeated fetches. No free list is returned (single subscription entity). The blast radius is narrow.

### Q2 — Distinct hooks fetching the SAME API route with equivalent parameters (true duplicate HTTP)?

**None found.** Two cases that look like duplicates are actually TanStack coalescing:

- `useAccess()` in `DashboardShell` (`dashboard-shell.tsx:110`) and `useAccess({ staleTime:Infinity, … })` in `useAccessVersionSync` (`use-access-version-sync.ts:24`) — same key `platformCoreQueryKeys.access.me()`. TanStack v5 deduplicates to one HTTP request. The minimum staleTime across active observers (30 s from shell) controls refetch behavior; `Infinity` from version-sync is overridden. No duplicate HTTP.
- `useMyIssues()` in `DashboardClient` (`dashboard-client.tsx:97`) and `DashboardDeferredBody` (`dashboard-deferred-body.tsx:157`) — same key `collaborationQueryKeys.dashboard.myIssues()`. TanStack deduplicates. The code comment at `dashboard-deferred-body.tsx:152–157` explicitly documents this.

### Q3 — Query keys omitting response-shaping inputs?

Not found in these two journeys. Specific checks:
- `usePublicDocuments(limit)` → key is `collaborationQueryKeys.dashboard.publicDocuments(limit)` — limit IS in the key. `hooks/api/dashboard.ts:427`
- `useNotifications(params)` → key is `platformCoreQueryKeys.notifications.list(params)` — params object IS in the key. `notifications-inbox.ts:52`
- The `calendar member search omits limit` defect cited in the PRD brief (`recovery-frontend-data.md:42`) is in the calendar lane, not these journeys; confirmed out of scope.
- All other dashboard hooks take no filter/cursor params (single-entity or unconfigured aggregates).

### Q4 — Expensive reads for unopened dialogs/sheets?

None found on these two journeys. Dashboard deferred reads are gated behind `deferredVisible` (IntersectionObserver in `DeferredDashboardContent`). The `useMyIssues` exception is deliberate and documented.

### Q5 — Server prefetch hash alignment

**CONFIRMED ALIGNED.** Code path:

1. Server: `prefetchAccess()` at `prefetch/access.ts:11` calls `createServerQueryClient()` at `prefetch/server-query-client.ts:24`, which calls `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))` (query-scope.ts:29, 45).
2. Client: `QueryProvider` at `query-provider.tsx:118` → `ScopedQueryProvider` at line 91 → `createAppQueryClient(scope)` at line 60 with `scope = authenticatedScope(orgId, userId)`. That client uses `queryKeyHashFn: scopedQueryKeyHashFn(scope)` at line 79.
3. Both call the same exported `scopedQueryKeyHashFn` from `lib/query-scope.ts`. Both derive `scope` with the same `authenticatedScope(orgId, userId)`. Keys dehydrated by the server will match what the client looks up. `HydrationBoundary` at `layout.tsx:54` transfers the dehydrated state.
4. `createServerQueryClient` comment at line 10 explicitly documents the failure mode it prevents.

### Q6 — Duplicate React subscriptions

**None.** `useNotificationEvents()` at `use-notification-events.ts:141` uses a module-level `activeStream: ActiveStream | null` singleton with a `subscribers` counter (lines 28–38, 154–157). Multiple calls to the hook from the same org increment the same subscriber counter; the SSE stream is opened once and closed only when `subscribers` reaches 0. Only one `AbortController`, one `window.addEventListener("online", …)`, one retry timer tree per org session.

---

## Counts (required by brief)

| Metric | Count | Notes |
|---|---|---|
| Duplicate HTTP requests | **0** | `useMyIssues` × 2 and `useAccess` × 2 are multi-consumer single-key patterns; TanStack coalesces each pair to one HTTP request |
| Repeated SQL (same endpoint, backend) | **UNVERIFIED** | Backend not in scope for FD1; `GET /dashboard/stats` and `GET /me/access` have the highest blast radius — defer to FD4 |
| Duplicate React subscriptions | **0** | SSE singleton confirmed; no BroadcastChannel, EventSource, setInterval or WebSocket found on these journeys |

---

## Top 5 REPAIR Items (ranked by customer impact)

### R1 — `useBankDetailsQuery` always fires on employee onboarding mount (MEDIUM)
`features/employee-onboarding/hooks/use-onboarding-wizard.ts:121`
`lib/api/hooks/onboarding.ts:70–76`
Every new employee's first visit to `/employee-onboarding` fires three sequential reads on mount; `useBankDetailsQuery` is redundant until the user reaches step 2. Gate: `enabled: session ? session.completedSteps.includes(STEP_IDS.PERSONAL) || session.currentStep === STEP_IDS.BANK || session.currentStep === STEP_IDS.REVIEW : false`. This drops the initial load from 3 parallel reads to 2, and eliminates the bank-details read for the ~80% of new employees who have not yet completed step 1.

### R2 — `useGetOrganizations` staleTime too short for a session-tier read (LOW–MEDIUM)
`hooks/common/auth-hooks.ts:188`
staleTime 60 s is the "volatile" tier, but an org list changes on the order of minutes-to-hours. The CLAUDE.md staleTime tiers call this `session/org` data (5 min). On every authenticated route change within 60 s the cache serves stale data (fine), but a forced refetch every 60 s on windowFocus adds unnecessary backend traffic for multi-tab power users. Change to `staleTime: 5 * 60_000`.

### R3 — `useSubscription` inside shell fires on every authenticated route (LOW)
`components/billing/trial-banner.tsx:18`, `hooks/api/subscription.ts:94`
`TrialBanner` renders inside `DashboardShell` unconditionally; `useSubscription` fires for every holder of `billing:subscription:view` on cold navigation to any route. The data is only relevant when the org is in TRIAL status. Mitigation: lazily render `TrialBanner` only after `useAccess` confirms the org is in a trial (add `trialActive` to the access payload) OR move the subscription query inside the banner's `open/rendered` branch. Reduces one cold read per admin page load.

### R4 — `useOrgSetupStatusQuery` has `staleTime: 0` (no-op repair, existing behavior correct)
`lib/api/hooks/org.ts:66`
`staleTime: 0` means every mount considers data immediately stale and will refetch. This is intentional for the active-provisioning polling use case (`use-setup-provisioning.ts:38–43`). However, a caller that mounts `useOrgSetupStatusQuery` in a non-polling context (e.g., settings page) would always refetch on focus. Confirm no non-polling caller exists; if one is added, it should pass `staleTime: 30_000` in options. Currently KEEP.

### R5 — `useAccessVersionSync` and `useAccess` (shell) have conflicting observer options on the same key (documentation gap)
`hooks/common/use-access-version-sync.ts:24`
`components/layout/dashboard-shell.tsx:110`
`useAccessVersionSync` passes `staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false`. `DashboardShell` passes defaults (staleTime 30 s, refetchOnMount: true). TanStack v5 applies the most eager refetch policy across all observers, so the `Infinity` and opt-out flags in the version-sync hook are silently ignored. No extra HTTP results, but the `staleTime: Infinity` comment creates a false expectation that the version-sync hook suppresses refetches. Add a comment to `use-access-version-sync.ts:22` explaining that the shell observer's 30 s staleTime governs actual refetch behavior; `staleTime: Infinity` here only prevents the version-sync observer from ITSELF triggering a refetch.

---

## UNVERIFIED items

| Item | Reason |
|---|---|
| `ExpensesWidget` reads (`features/hr/expenses/expenses-widget.tsx`) | File not inspected; passed as slot from `dashboard/page.tsx:6`. Hooks and key unknown. |
| Employee onboarding layout reads (`app/employee-onboarding/layout.tsx`) | Layout file not inspected. May add shell-level reads. |
| SQL cost per endpoint (FD4) | Backend not in scope. `GET /dashboard/stats`, `GET /me/access`, `GET /dashboard/my-issues` have the highest call frequency and are the FD4 priority candidates. |
| `useAnnouncements` on dashboard (if rendered) | Not found mounted in the inspected dashboard components. `useAnnouncements` exists in `hooks/api/dashboard.ts:355` but no call site was found in dashboard render paths for these two journeys. |
