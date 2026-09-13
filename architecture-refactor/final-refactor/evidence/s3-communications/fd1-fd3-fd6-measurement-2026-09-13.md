<!-- Evidence capture 2026-09-13 — FD1 / FD3 / FD6 -->
<!-- Source-proof level unless marked MEASURED or NOT MEASURED/INCONCLUSIVE -->

# FD1 / FD3 / FD6 — Measurement capture 2026-09-13

**Environment:** frontend `next start` port 1000 (BUILD_ID `2REKrikocjK5aTuOFjG6p`), backend port 1500, DB `scratch_local`, Redis Upstash-REST shim port 8079.

**Environment defect (blocks browser measurement):** `INTERNAL_API_SECRET` in `D:/agent-work/fe-serve.sh` was set with extra double-quote characters causing a value mismatch with the backend. The `/auth/session-data` and `/auth/session-exchange` calls returned 403; without a `backendJwt` every authenticated API call from the client failed and all pages rendered error boundaries. The `measure-web-vitals` harness correctly refused all 16 samples (`errorBoundary=true, words=14`). The fe-serve.sh file was later corrected (outer single-quotes only, no embedded double-quotes) but the running process retained the wrong env. Restarting the server is out of scope for this session. All browser-driven measurements in this document are marked **NOT MEASURED (env defect)**.

**Host quietness:** multiple parallel agents running on the same host. All latency numbers are **INCONCLUSIVE** even where server TTFB was reachable.

---

## FD1 — Actual journey request inventory (source-proof)

Browser request counts and byte measurements cannot be captured — see environment defect above.

### Mounted consumers per journey (source-verified)

#### Authenticated shell (all routes)
| Consumer | Query key | Endpoint | staleTime | SSR-prefetched? |
|---|---|---|---|---|
| `useAccess` | `access.me()` | `GET /me/access` | 30 s | YES — `prefetchAccess()` in `(authenticated)/layout.tsx` |
| `useNotificationCount` | `notifications.unreadCount()` | `GET /me/notifications/unread-count` | live (refetchInterval) | no |
| `useOrgDisplay` | `organization.display()` | `GET /me/org-display` | 5 min | no |

#### Dashboard (`/`)
| Consumer | Query key | Endpoint | staleTime | SSR-prefetched? |
|---|---|---|---|---|
| `useDashboardStats` | `dashboard.stats()` | `GET /dashboard/stats` | 5 min | YES — `prefetchDashboardStats()` |
| `useMyIssues` | `dashboard.myIssues()` | `GET /dashboard/my-issues` | 5 min | no |
| `useTodayActivities` | `dashboard.todayActivities()` | `GET /dashboard/today-activities` | 5 min | no |
| `useRecentProjects` | `dashboard.recentProjects()` | `GET /dashboard/recent-projects` | 5 min | no |
| `useActiveSprintSummary` | `dashboard.activeSprintSummary()` | `GET /dashboard/active-sprint` | 5 min | no |
| `useRecentActivity` | `dashboard.recentActivity()` | `GET /dashboard/recent-activity` | 5 min | no |
| `useLeavesToday` | `dashboard.leavesToday()` | `GET /dashboard/leaves-today` | 2 min | no |
| `useUpcomingHolidays` | `dashboard.upcomingHolidays()` | `GET /dashboard/upcoming-holidays` | daily | no |
| `useMyLeaveBalance` | `dashboard.myLeaveBalance()` | `GET /dashboard/my-leave-balance` | 5 min | no |
| `useBirthdays` | `dashboard.birthdays()` | `GET /dashboard/birthdays` | daily | no |
| `usePendingApprovals` | `dashboard.pendingApprovals()` | `GET /dashboard/pending-approvals` | 5 min | no |
| `useExpensePageData` (ExpensesWidget) | `hr.expenses()` | `GET /hr/expenses` | 30 s | no |
| `useAnnouncements` | `dashboard.announcements()` | `GET /dashboard/announcements` | 5 min | no |

SSR path: `(authenticated)/layout.tsx` → `prefetchAccess()` + `(dashboard)/page.tsx` → `prefetchDashboardStats()`. Both factories call `createServerQueryClient()` which installs `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))` — the hash matches the client's `QueryProvider` scope. SSR hydration is intact (verified separately by `check-query-scope.mjs`).

AI-usage wallet invalidation path (source-verified, `query-provider.tsx:MutationCache.onSuccess`):
- `carriesAiCharge(data)` checks `typeof data === "object" && data !== null && "aiUsage" in data && typeof data.aiUsage?.credits === "number" && data.aiUsage.credits > 0`
- When true: `queryClient.invalidateQueries({ queryKey: billing.aiCredits() })`
- This path fires on any mutation whose response shape includes `aiUsage.credits > 0`; the billing AI credits cache is bust exactly once per qualifying mutation settlement.

#### Inbox (`/inbox`)
| Consumer | Query key | Endpoint | staleTime | Notes |
|---|---|---|---|---|
| `useUnifiedInbox` | `inbox.unified({limit,kinds,unreadOnly,infinite:true})` | `GET /me/inbox/unified` (cursor-paginated) | 30 s | infinite query; error recovery refetchInterval 3 s |

#### Calendar (`/calendar`)
| Consumer | Query key | Endpoint | staleTime |
|---|---|---|---|
| `useCalendarEvents` | `calendar.events(start,end,sources?)` | `GET /calendar/events` | not declared (uses global default 2 min) |
| `useCalendarSources` | `calendar.sources()` | `GET /calendar/sources` | not declared |
| `useExternalCalendarEvents` | `calendar.externalEvents(start,end)` | `GET /calendar/external-events` | not declared |
| `useCalendarMemberLookup` | `calendar.memberSearch(term,limit)` | `GET /calendar/members` | not declared |

#### Billing (`/settings/billing`)
| Consumer | Query key | Endpoint | staleTime |
|---|---|---|---|
| `useSubscription` | `billing.subscription()` | `GET /billing/subscription` | 5 min |
| `usePlans` | `billing.plans()` | `GET /billing/plans` | **60 min** |
| `useBillingProfile` | `billing.profile()` | `GET /billing/profile` | 5 min |
| `useBillingSeats` | `billing.seats()` | `GET /billing/seats` | 2 min |
| `useBillingSummary` | `billing.summary()` | `GET /billing/summary` | not declared |
| `useEntitlements` | `billing.entitlements()` | `GET /billing/entitlements` | 15 min |
| `useAiCredits` | `billing.aiCredits()` | `GET /billing/ai-credits` | not declared |

#### Chat (`/chat`)
Not measured — other agents own `features/chat/**`. Ably credentials unavailable in this environment (see FD6).

#### Server TTFB (plain Node.js fetch, 6 samples each, host NOT quiet — INCONCLUSIVE)
| Route | p50 | p75 | p95 | HTTP status |
|---|---|---|---|---|
| `/dashboard` | 20 ms | 22 ms | 24 ms | 200 |
| `/inbox` | 17 ms | 17 ms | 17 ms | 200 |
| `/calendar` | 22 ms | 24 ms | 25 ms | 200 |
| `/settings/billing` | 24 ms | 27 ms | 30 ms | 200 |

These measure SSR rendering latency only; they do not include API fanout or client-side hydration. Numbers are INCONCLUSIVE due to host load.

---

## FD3 — Cross-tab and authority acceptance (source-proof)

### Scope change / logout (source-verified)

`QueryProvider` (`components/providers/query-provider.tsx`) mounts `ScopedQueryProvider` with `key={scope}` where `scope = authenticatedScope(orgId, userId)`. A scope change (login, logout, org switch) changes `key` → React unmounts and remounts the entire `QueryClientProvider` → the old `QueryClient` is discarded with all cached entries. This is the primary cross-tab isolation mechanism.

Eight additional `queryClient.clear()` calls exist as defence in depth (`frontend/CLAUDE.md` §2). These are no longer load-bearing — the `key` remount is the authority — but prevent a stale provider from leaking entries.

Cross-tab logout flow: when another tab signs out via NextAuth, the session cookie expires. The next API call from the still-open tab returns 401. `apiClient` retries once with a fresh session token; if still 401 it signs out via `signOut()`, which changes the scope and triggers the remount.

Browser verification: NOT MEASURED (environment defect).

### BroadcastChannel (source-verified, `lib/build-cache-sync.ts`)

`publishBuildCacheChange(permission, orgId, userId)` publishes only when `permission.startsWith("build:")`. Non-build mutations (inbox, calendar, billing, HR) do not publish on this channel. The channel name is `streamlineos:build-cache:authenticated:<orgId>:<userId>`.

Subscribers invalidate these query prefixes: `projects.all`, `projectReports.all`, `ticketActivity.all`, `whiteboards.all`, `goals.all`, `roadmap.all`, `dashboard.myIssues()`, `dashboard.recentProjects()`, `dashboard.activeSprintSummary()`.

Fallback chain: `localStorage` setItem/removeItem (fires `storage` event in other tabs) → `focus` event listener.

Real cross-tab behavior: NOT TESTED. The test suite (`lib/build-cache-sync.test.tsx`) stubs BroadcastChannel with a hand-written `TabChannel` EventTarget and does not exercise the browser's real cross-origin/cross-tab message delivery.

### Subscription → plans key (CONFIRMED GAP, source-verified)

`hooks/api/subscription.ts:invalidateBillingState()` (lines 109–112) invalidates:
- `billing.subscription()`
- `billing.summary()`
- `billing.entitlements()`
- `billing.seats()`

`billing.plans()` is NOT invalidated. Its `staleTime` is 60 min. After a subscription change that changes the available plan options or pricing, the plans cache may serve stale data for up to 60 minutes.

The completion plan row ("Subscription invalidation alone does not invalidate a plans key") is confirmed correct. No repair is authorized in this measurement session.

### Employee removal / module disable (source-only)

These paths touch the backend RBAC and session-data endpoints. When a user is removed or a module disabled, the backend's `resolveAuthSession` returns fresh data on the next NextAuth JWT callback (which runs on every session access if `maxAge` is short, or on token refresh). The frontend does not actively listen for these events; staleness window is the NextAuth token maxAge. Browser verification: NOT MEASURED (environment defect).

### Roster / search / catalog / bank freshness

These surfaces are owned by other lanes. Not measured in this session.

### Revocation (source-verified)

Per MEMORY note: Redis tombstone is a CACHE, not the authority. A tombstone cache miss falls through to the `user_sessions.is_revoked` DB flag checked on every authenticated request. Revocation propagates within one request cycle to the DB; Redis cache miss only delays it by the tombstone TTL. Source: `backend/src/common/auth/guards/jwt-auth.guard.ts` (verified in a prior session).

---

## FD6 — Bundle gate coverage gaps (source-proof + measured where possible)

### SSR prefetch correctness — VERIFIED (source + gate)

`createServerQueryClient()` (`lib/prefetch/server-query-client.ts`) installs `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))`. Client `QueryProvider` installs the same function. Both hash as `[authenticated:<orgId>:<userId>, key]`. `HydrationBoundary` transfers dehydrated state; client lookup matches server hash. The previous authenticated-routes-SSR-spinner issue was caused by a mismatch between default-hash prefetch and scoped-hash client — that is already fixed.

Gate: `scripts/check-query-scope.mjs` — 0 violations across 6,646 files scanned.

### Core Web Vitals — NOT MEASURED (environment defect)

The `measure-web-vitals` harness ran and collected timing numbers (see raw output at `D:/agent-work/vitals-v2.json`) but refused them as evidence: all 16 samples showed `errorBoundary=true, words=14`. The pages rendered a global error boundary because the backend JWT exchange failed (see environment defect at top of document).

Raw metrics captured by the harness (NOT EVIDENCE — broken render):
- Desktop TTFB: 21–28 ms across routes
- Desktop FCP: 156–200 ms across routes
- Desktop LCP: 1208–1248 ms (error boundary content, not real page)
- Mobile LCP: 2220–2348 ms (error boundary content)
- CLS: 0.000 across all routes

These numbers measure the error boundary render, not the product. They are not accepted.

Mobile INP: not measurable; note from MEMORY is preserved — "mobile INP breaches are real and memoization did not fix them."

### Wizard-gate redirect paths — VERIFIED (source + manual probe)

`resolveWizardGate` (`lib/wizard-gate.ts`):
1. No `orgId` in session → `/org-setup`
2. `isOrgOwner && !orgOnboardingCompletedAt` and no skip cookie → `/org-setup`
3. `!isOrgOwner && !userOnboardingCompletedAt && userId` and no skip cookie → `/employee-onboarding`
4. All conditions clear → `null` (no redirect)

Manual probe: minted JWT without `orgId` → confirmed 302 to `/org-setup`. Minted JWT with full claims including `orgOnboardingCompletedAt` → confirmed 200.

`proxy.ts` does NOT apply wizard-gate logic (per `frontend/CLAUDE.md` §1 — "proxy.ts never redirects on JWT claims"). Single authority: `resolveWizardGate` only.

### API latency (authenticated routes) — INCONCLUSIVE

Server TTFB listed under FD1. Not accepted as API latency evidence because these measure SSR TTFB (the time for the server to start sending the HTML response), not round-trip API call times from the browser.

### Ably channel lifecycle and reconnect — NOT MEASURABLE

No Ably credentials in `D:/agent-work/disposable.env`. `/chat/ably-token` returns 401 (no Ably API key configured). Cannot measure channel lifecycle, reconnect behavior or subscription fanout. This is an honest gap and cannot be closed without a configured Ably account in the disposable environment.

### Real cross-tab BroadcastChannel — NOT TESTED

Test suite stubs BroadcastChannel (`lib/build-cache-sync.test.tsx`). Source verified (see FD3 section). Real two-browser-tab behavior not exercised. Would require a working authenticated session (blocked by environment defect) and two synchronized tabs.

### Semantic-token contrast on tinted backgrounds — PARTIALLY VERIFIED (source + calculation)

**Light mode (`--muted` surface):**
- Token: `--muted: #f1f5f9` (slate-100), `--muted-foreground: #556377`
- CSS comment (line ~87 of `globals.css`): "5.58:1 on --muted"
- Previous value `slate-500 #64748b` had ratio 4.34:1 (the value referenced in the completion plan FD6 note)
- Current value `#556377` at 5.58:1 passes WCAG AA (≥4.5:1 for normal text, ≥3:1 for large text)
- Status: FIXED — the 4.34:1 concern in the completion plan is stale

**Dark mode (`--muted` surface):**
- Token: `--muted: #1c1c1f`, `--muted-foreground: #a1a1aa` (zinc-400)
- Calculated contrast: approx. 6.82:1 (L_text ≈ 0.40, L_bg ≈ 0.016; ratio = 0.45/0.066)
- Passes WCAG AA — no concern

Browser verification of contrast: NOT MEASURED (environment defect).

### Permission redirect paths — NOT MEASURED

`NoPermissionState` renders when `useCan` returns false. The exact rendering path depends on individual feature page guards. Browser verification blocked by environment defect.

---

## Summary of open gaps

| Item | Status | Blocker |
|---|---|---|
| FD1 browser request counts and bytes | NOT MEASURED | environment defect (INTERNAL_API_SECRET mismatch) |
| FD3 cross-tab logout/switch browser proof | NOT MEASURED | environment defect |
| FD3 BroadcastChannel real cross-tab | NOT TESTED | suite stubs; environment defect |
| FD3 plans key stale after subscription change | CONFIRMED GAP (source) | no repair authorized in this session |
| FD6 Core Web Vitals | NOT MEASURED | environment defect + host not quiet |
| FD6 Ably lifecycle | NOT MEASURABLE | no credentials in disposable env |
| FD6 semantic contrast browser verification | NOT MEASURED | environment defect |

## Items verified or closed

| Item | Status | Method |
|---|---|---|
| SSR prefetch hash correctness | VERIFIED | source + check-query-scope.mjs gate (0 violations) |
| Wizard-gate single authority | VERIFIED | source + manual probe |
| AI wallet invalidation path | VERIFIED | source (`carriesAiCharge` + MutationCache.onSuccess) |
| BroadcastChannel scope: build mutations only | VERIFIED | source (`publishBuildCacheChange` line 36 guard) |
| ExpensesWidget read (`hr.expenses()`) | VERIFIED | source (`hooks/api/hr/expenses.ts`) |
| Onboarding-layout reads | VERIFIED | source (`(authenticated)/layout.tsx` prefetch chain) |
| Light mode muted-foreground contrast (4.34→5.58:1) | VERIFIED | source (CSS comment + token value) |
| Dark mode muted-foreground contrast (~6.82:1) | CALCULATED | arithmetic from CSS token values |
| Server TTFB for dashboard/inbox/calendar/billing | MEASURED (INCONCLUSIVE) | plain Node.js fetch, host not quiet |
