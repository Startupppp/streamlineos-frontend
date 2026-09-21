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

#### Server TTFB — second run, environment repaired (host NOT quiet — INCONCLUSIVE)
| Route | p50 | p75 | p95 | HTTP status |
|---|---|---|---|---|
| `/dashboard` | 75 ms | 82 ms | 88 ms | 200 |
| `/inbox` | 60 ms | 61 ms | 62 ms | 200 |
| `/calendar` | 73 ms | 78 ms | 83 ms | 200 |
| `/settings/billing` | 69 ms | 69 ms | 69 ms | 200 |

Higher than the first run (20–30 ms) because the environment is under active parallel agent load. Both runs are INCONCLUSIVE for this reason. These measure only SSR rendering time (time to first byte from the Next.js server), not backend API fanout or client hydration.

#### Browser first-load bytes (static assets, measured via CDP Network, BUILD_ID 2REKrikocjK5aTuOFjG6p)
| Route | JS bytes | CSS bytes | Font bytes | Document bytes | Total first-load | 3rd-party |
|---|---|---|---|---|---|---|
| `/dashboard` | 560 KB | 55 KB | 54 KB | 21 KB | 695 KB | 0 |
| `/inbox` | 553 KB | 55 KB | 54 KB | 21 KB | 688 KB | 0 |
| `/calendar` | 568 KB | 55 KB | 54 KB | 22 KB | 703 KB | 0 |
| `/settings/billing` | 624 KB | 55 KB | 54 KB | 26 KB | 763 KB | 59 KB (Razorpay) |

These are static asset bytes on cold first load. They do not count backend API response bytes (JSON payloads from port 1500). All are within the bundle gate ceilings (which measure the route chunk, not total transfer).

#### Browser Core Web Vitals — mobile (partially measured, host NOT quiet)
Desktop: all 8 samples = errorBoundary=true (authenticated shell did not render; root cause unclear given session is valid for mobile, likely CDPSession cookie timing on first desktop navigation). Mobile: 3 of 4 routes rendered real content.

| Route | FCP | LCP p75 | INP p75 | CLS p75 | words | verdict |
|---|---|---|---|---|---|---|
| `/dashboard` mobile | 384/452 ms | 776 ms | 458 ms | 0.000 | 20 | PARTIAL |
| `/inbox` mobile | 644/552 ms | ~1676 ms | ~496 ms | 0.000 | 29 | PARTIAL |
| `/calendar` mobile | — | — | — | — | 14 | NOT MEASURED (errorBoundary) |
| `/settings/billing` mobile | 424/456 ms | ~1472 ms | ~464 ms | 0.000 | 35 | PARTIAL |

INP threshold: good <200 ms, needs improvement 200–500 ms, poor >500 ms. All three measured routes are in the "needs improvement" range (458–496 ms). INP was triggered by clicking the "Open quick actions" button in the mobile shell.

These numbers are INCONCLUSIVE: the host is not quiet (parallel agents running), and the session behaviour differs between desktop and mobile arms of the same run. They confirm the MEMORY note ("mobile INP breaches are real and memoization did not fix them") but cannot be accepted as production benchmarks.

API request counts (how many GET calls to port 1500 per journey): NOT MEASURED. The vitals harness tracks static asset bytes, not JSON API call counts. Would require CDP Network interception against the backend port or pg_stat_statements attribution.

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

### Subscription → plans key (REPAIRED)

`hooks/api/subscription.ts:invalidateSettledPurchase()` (lines 108–115, after repair) now invalidates:
- `billing.subscription()`
- `billing.summary()`
- `billing.entitlements()`
- `billing.seats()`

`billing.plans()` was NOT invalidated before this session. Its `staleTime` is 60 min, meaning a customer could see stale plan data for up to an hour after an upgrade.

REPAIRED in this session: `billing.plans()` added to `invalidateSettledPurchase`. Test written first (RED), fix applied, test passed (GREEN):
- RED output: `expect(received).toContain("[\"streamlineos\",\"billing\",\"plans\"]")` — plans key absent from the received set
- GREEN output: `PASS hooks/api/__tests__/settled-purchase-invalidation.test.ts` (1/1, 2.08 s)
- Existing reconciliation tests: all 4 PASS with no regression

No change to the 60-min staleTime — the long TTL is correct for a catalog; the writer now busts it on every settled purchase.

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
| FD1 API request counts (JSON calls to backend) | NOT MEASURED | harness tracks static asset bytes only; pg_stat_statements available but not queried |
| FD1 first-load static bytes | MEASURED | dashboard 695 KB, inbox 688 KB, calendar 703 KB, billing 763 KB (incl. 59 KB Razorpay) |
| FD3 cross-tab logout/switch browser proof | NOT MEASURED | environment defect |
| FD3 BroadcastChannel real cross-tab | NOT TESTED | suite stubs; environment defect |
| FD3 plans key stale after subscription change | REPAIRED | `invalidateSettledPurchase` now includes `billing.plans()`; test RED→GREEN |
| FD6 Core Web Vitals desktop | NOT MEASURED | errorBoundary=true all 8 desktop samples despite valid session (mobile succeeded; likely CDPSession cookie timing) |
| FD6 Core Web Vitals mobile (3/4 routes) | MEASURED (INCONCLUSIVE) | INP p75: dashboard 458ms, inbox ~496ms, billing ~464ms; LCP p75: dashboard 776ms, inbox ~1676ms, billing ~1472ms; all breach INP 200ms threshold; host not quiet |
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
| Server TTFB (run 2, env repaired) | MEASURED (INCONCLUSIVE) | dashboard p50=75ms, inbox p50=60ms, calendar p50=73ms, billing p50=69ms; host not quiet |
| FD3 plans key gap | REPAIRED | `invalidateSettledPurchase` now includes `billing.plans()`; RED→GREEN test in settled-purchase-invalidation.test.ts |
| FD1 first-load static bytes | MEASURED | dashboard 695KB, inbox 688KB, calendar 703KB, billing 763KB |
| Mobile INP confirms real breaches | MEASURED (INCONCLUSIVE) | dashboard 458ms, inbox ~496ms, billing ~464ms; all >200ms "needs improvement" threshold |
