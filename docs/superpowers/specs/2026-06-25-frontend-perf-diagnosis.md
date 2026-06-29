# StreamlineOS — Initial Dashboard Load Performance Diagnosis & Remediation Plan

**Date:** 2026-06-25
**Scope:** Sign-in → first `/dashboard` paint (TTFB + first-load JS + post-hydration fetch fan-out)
**Method:** Static source/build analysis, then adversarial re-verification of every critical-path finding against the actual code. Impact numbers are **estimates** (see "Measured vs. estimated" at the end).

---

## 1. Executive summary

The reported ~7s initial dashboard load is **not caused by a single bottleneck** and **not caused by the API being co-resident in the Next.js app**. It is the sum of three independent cost centres on one render path:

1. **Cross-region serialized DB round-trips** — the Neon Postgres pooler is pinned to `ap-southeast-1` (Singapore) while Vercel functions have no region pin (default `iad1`/us-east). Every authenticated dashboard render does a chain of DB hops at ~150–250ms RTT each. This is the single biggest constant lever.
2. **Intermittent Neon cold-start** — `connect_timeout: 60` + scale-to-zero means the first load after idle can stall 1–5s with no fast-fail.
3. **Client first-load JS + redundant auth/permission work** — framer-motion and cmdk are in the dashboard first-load bundle; `auth()` is called 4× per render with no `React.cache()` memoization; permissions are re-fetched client-side even though they already live in the session.

A large part of the *observed* 7s is also very likely a **`next dev` compilation artifact** — `package.json:8` is `next dev -p 1000` with **no `--turbopack`**, so the first hit to `/dashboard` pays one-time on-demand webpack compilation of the route + its provider tree. **Measure production TTFB (`next build && next start`) before attributing the 7s to runtime causes.**

### Verdict on the NestJS split (one line)

> **Moving the API to a separate NestJS backend will NOT by itself fix the initial-load time** — the dashboard's first paint is gated by *server-render data work that runs inside the Next.js server component itself* (cross-region Neon round-trips, the 4× un-memoized `auth()` cascade, blocking `Promise.all` prefetch) plus *client first-load JS*; a NestJS service would still talk to the same Singapore Neon DB over the same cross-region RTT and could **add** a network hop (Next server → NestJS → DB) unless co-located, so it addresses none of the root causes and risks regressing TTFB.

---

## 2. Quick wins (low risk, S/M effort, high impact)

Ordered by impact ÷ effort. All are low-to-medium risk and config- or small-code-scoped.

### QW-1 — Pin Vercel functions to Singapore (co-locate with Neon)
- **Evidence:** `vercel.json` has **no `regions` key** (only a `crons` array — verified); `.env:4` `DATABASE_URL` host is `ep-old-darkness-...-pooler.c-2.ap-southeast-1.aws.neon.tech`; no `preferredRegion` anywhere in app routes.
- **Fix:** add `"regions": ["sin1"]` to `vercel.json` so functions and the Neon pooler are co-located, eliminating cross-region RTT on every serial DB hop.
- **Impact:** ~700ms warm median (cold ceiling near ~1500ms). **Highest impact/effort ratio of any item.**
- **Risk:** low. **Effort:** S.
- **Caveat:** Upstash Redis region also matters — if Redis is not in SG, sin1 shifts the Redis-hop latency. Net effect is still a reduction because the dominant uncached cost is against SG Postgres.

### QW-2 — Wrap `auth()` in `React.cache()` (collapse 4 calls → 1 per request)
- **Evidence:** `auth()` is the raw Auth.js v5 export with **no `React.cache()` wrapper anywhere** — called 4× per dashboard render: `app/(dashboard)/layout.tsx:11`; `app/(dashboard)/dashboard/page.tsx:14` → `lib/auth-helpers.ts:57`; `server/queries/dashboard/project-widgets.ts:14` & `:88` → `lib/abilities-server.ts:6`. The jwt callback body `lib/auth.ts:223-346` re-runs on every call (not gated by `trigger`/`user`), doing at minimum one Upstash REST GET each.
- **Fix:** wrap `auth()` (or a thin `getSession()`) in `React.cache()` so all 4 calls in one request share one decode + one Redis GET. (Note: two of the four — the widget calls — already run inside the same `Promise.all`, so they are *parallel*, not serial; the real serial collapse is the layout→page hop.)
- **Impact:** ~80ms warm (cold worst-case ~200–400ms). The original "removes 3 round-trips / 1200ms" claim is **overstated** — the calls are not all serialized.
- **Risk:** low. **Effort:** S.

### QW-3 — Lazy-load CommandPalette (cmdk) off the dashboard first-load JS
- **Evidence:** `components/layout/dashboard-shell.tsx:8` eagerly imports and `:89` unconditionally renders `<CommandPalette />`; cmdk is the largest dashboard-route page chunk at **140KB raw / 44KB gzip** (`.next/static/chunks/1w27jw8e9x7-2.js`, present in the dashboard `page_client-reference-manifest`). The palette is invisible until Cmd+K.
- **Fix:** `next/dynamic(..., { ssr: false })` (same pattern already used in this file for `ChatUnreadNotifications`, lines 16–19). Ideally mount only after the first Cmd+K/Ctrl+K keydown.
- **Impact:** ~44KB gzip removed from every dashboard route's critical path (~150–350ms download/parse, connection-dependent).
- **Risk:** low. **Effort:** S.

### QW-4 — Seed permissions from the session instead of re-fetching
- **Evidence:** `lib/rbac/hooks.ts:6` `useUserPermissions` fires `GET /api/rbac/user-permissions` (`lib/api/hooks/rbac.ts:9-18`) on mount; it is **not** prefetched. But `session.permissions` is already populated server-side (`lib/auth.ts:271,322,368`) and typed (`types/next-auth.d.ts:11`).
- **Fix:** in `usePermissions()`, return `session?.permissions ?? []` and drop the redundant query.
- **Impact:** ~120ms for affected custom-role admins; ~0ms for owners/platform admins (their ability short-circuits to `manage all` from `session.user.isOrgOwner`/`isPlatformAdmin`, `abilities.ts:21-24`, so they never waited on this fetch). Removes the empty-sidebar / EmployeeDashboard-flash for custom-role users.
- **Risk:** low. **Effort:** S.
- **Note:** the gating `AbilityContextProvider` lives in the layout (`dashboard-shell.tsx`), so a `HydrationBoundary` seed only in `page.tsx` would be incomplete — the session-based approach is correct and already wired at the data layer. `useSession()` itself still fetches `/api/auth/session` on mount (SessionProvider has no SSR seed), so this removes the *second* sequential fetch, not the first.

### QW-5 — Gate the middleware IP-allowlist Redis GET
- **Evidence:** `middleware.ts:377-399` runs `await redis.get('org:ip-allowlist:<orgId>')` on **every authenticated non-API navigation** (API routes return early at `:229-231`). `lib/redis.ts:4-18` returns a real client (Upstash env vars set). The key only exists when an org saved a non-empty allowlist (`app/api/organization/settings/route.ts:124-139`), so for most orgs this is a guaranteed null-returning HTTPS round-trip. It is the **only** Redis round-trip in the middleware for a page nav (rate-limit `resolveTier` returns null for non-`/api/` paths, `lib/rate-limit.ts:263`).
- **Fix (safer variant):** in-process LRU/`Map` cache keyed by `orgId`, ~30–60s TTL, so only the first request per org per minute pays the round-trip.
- **Impact:** ~60ms per navigation (range 5–150ms, region-dependent).
- **Risk:** low. **Effort:** S.
- **Security caveat:** the JWT-flag variant (`token.hasIpAllowlist`) is viable but the settings route does **not** invalidate the per-user `UserSessionCache`, so a newly-enabled allowlist would not be enforced until JWT + session-cache refresh — an enforcement-staleness gap. Prefer the bounded in-process cache, or add explicit cache invalidation if using the flag.

### QW-6 — Add `optimizePackageImports` to `next.config.ts`
- **Evidence:** `next.config.ts:32-53` experimental block only sets `serverActions`; no `optimizePackageImports`/`modularizeImports`. framer-motion is duplicated across 7 chunks (145/107/45/31/28/28/27 KB).
- **Fix:** `experimental.optimizePackageImports: ['framer-motion','recharts','date-fns','lucide-react','@tabler/icons-react']`.
- **Impact:** ~200ms (collapses duplicated framer chunks; compounds with structural fix SF-3).
- **Risk:** low. **Effort:** S.

### QW-7 — Remove the redundant second membership lookup
- **Evidence:** `lib/auth-helpers.ts:62` calls `ensureOrgMembership()` (which itself queries `organizationMembers.findFirst` at `:19` and returns `{orgId, role}`), then `:71` issues a **second** `organizationMembers.findFirst` on the same `userId`, strictly sequentially, gating the prefetch `Promise.all` (`page.tsx:14`→`:21`).
- **Fix:** reuse the row `ensureOrgMembership` already returned instead of re-querying at `:71`.
- **Impact:** ~80ms (one Neon round-trip; magnified cross-region until QW-1 lands).
- **Risk:** low. **Effort:** S.
- **Caveat:** do **not** skip `ensureOrgMembership` wholesale — it also auto-provisions a membership row on first login (`:34-53`) and corrects stale roles (`:24-29`). Only the line-71 re-query is removable.

### QW-8 — Enable Turbopack for dev (measurement hygiene, not prod)
- **Evidence:** `package.json:8` `"dev": "next dev -p 1000"` — no `--turbopack`; heavy provider tree at `app/layout.tsx:137-151`.
- **Fix:** `next dev --turbopack`; and **measure prod** (`next build && next start`) before chasing runtime causes.
- **Impact:** removes one-time dev compilation from the *observed* number (est. ~4000ms of the 7s is dev-only).
- **Risk:** low. **Effort:** S.

---

## 3. Structural fixes (larger)

### SF-1 — Don't block first HTML on the widget `Promise.all` prefetch (Suspense / stream the shell)
- **Evidence:** `app/(dashboard)/dashboard/page.tsx:21-38` `await Promise.all([...4 prefetchQuery])` before returning JSX at `:40`; no `<Suspense>` wraps `DashboardClient`. The client (`dashboard-client.tsx:211-257`) **already** renders a full skeleton when `isLoading`, so blocking server prefetch buys nothing for first paint.
- **Fix:** wrap `<DashboardClient />` in `<Suspense>` with the skeleton fallback so the shell + sidebar stream immediately while widgets resolve — OR drop the blocking prefetch and rely on the existing client hooks + skeletons.
- **Impact:** ~900ms (converts a blocking all-widgets TTFB into an instant shell paint).
- **Risk:** medium (verify hydration/SEO expectations). **Effort:** M.

### SF-2 — Parallelize the jwt() cache-miss DB cascade
- **Evidence:** `lib/auth.ts:233-276` cache-miss branch runs `Promise.all(users + organizationMembers)` → **then** `organizations.findFirst` (`:260`) → **then** `getUserPermissions` (`:271`) → **then** `subscriptions.findFirst` (`:276`), all serial. `server/queries/rbac.ts:17,22,34,46` runs 4 more sequential queries (only `roles` genuinely depends on the role id; the rest can parallelize). Fires only on Redis miss (TTL 300s, `auth.ts:57`).
- **Fix:** run `organizations` + `getUserPermissions` + `subscriptions` in one `Promise.all` (all depend only on the already-known `membership.orgId`); inside `getUserPermissions`, `Promise.all` the user/userPerms/role lookups where independent. Keep the Redis cache.
- **Impact:** ~150ms on cache-miss renders; ~0ms warm. (Original ~1200ms claim is **not supported** — it ignores the Redis cache and assumes always-on.)
- **Risk:** medium (ordering must be preserved exactly; combine results identically). **Effort:** M.

### SF-3 — Remove framer-motion from the dashboard critical path
- **Evidence:** `app/layout.tsx:9,146` wraps the whole app in `<MotionProvider>` (`components/providers/motion-provider.tsx:3` imports `MotionConfig`), forcing framer into the always-loaded provider boundary chunk (`.next/static/chunks/40ka0dy36r0j-.js`, 27KB, also carries SessionProvider/QueryProvider). Eager `import { motion }`: `dashboard-client.tsx:34`, `features/dashboard/{ceo,sales,hr,employee}-dashboard.tsx:4`, `quick-actions.tsx:6` (renders `motion.div` at `:80`). Chunk `0bdxhz0tghxp5.js` = 110KB raw / 36KB gz contains `MotionConfigContext`.
- **Fix:** (1) remove `MotionProvider` from `app/layout.tsx` (replace `reducedMotion='user'` with a CSS `prefers-reduced-motion` rule); (2) replace decorative `motion.div` fade-ups with a CSS `animate-fade-up` utility in `globals.css` — **must cover `quick-actions.tsx` and all four role-dashboard widgets**, not just `dashboard-client.tsx`, or framer stays in the bundle. Use `next/dynamic({ ssr:false })` for any genuinely interactive animation elsewhere.
- **Impact:** ~180ms (~36KB gz; ~100–250ms download/parse).
- **Risk:** low. **Effort:** M.
- **Caveat:** framer is an app-wide dep (used in 83 files incl. signin/signup), so it is cached across navigations — marginal first-load saving is below a dedicated 107KB. `mini-area-chart.tsx` is **not** imported by any dashboard widget, so it is not relevant to this path despite being cited elsewhere.

### SF-4 — Cache the 3 uncached prefetch queries (scoped keys)
- **Evidence:** only `getDashboardStats` uses `cached()` (`hr-widgets.ts:25`, `CACHE_TTL.SHORT=30s`). `getRoleStats` (`hr-widgets.ts:96`), `getRecentProjects` (`project-widgets.ts:13`), `getActiveSprintSummary` (`project-widgets.ts:87`) hit SG Postgres on every load; client hooks use 5-min `staleTime` so prefetched data is genuinely consumed (truly on critical path).
- **Fix:** wrap all three in `cached()`. **`getRoleStats` is org-wide → key by `orgId`.** `getRecentProjects`/`getActiveSprintSummary` are **role/permission-scoped → keys MUST include `userId`/role** (per the project rule against caching permission-specific data in shared caches; keying by `orgId` alone would leak owner data to members). Add explicit invalidation on the relevant mutations.
- **Impact:** ~175ms (the 4 prefetches are parallel, so saving ≈ the max uncached query ≈ one SG round-trip, not the sum). Original ~400ms is ~2× overstated.
- **Risk:** low (with correct scoped keys). **Effort:** M.

### SF-5 — Collapse the per-widget 2-step project→sprint waterfall
- **Evidence:** `project-widgets.ts:88` `getActiveSprintSummary` (admin path): `db.query.projects.findMany` ids-only (`:94-97`) **then** `db.query.sprints.findFirst` with `inArray(projectIds)` (`:109-123`) — two sequential awaits, plus a per-widget `getSessionAbility()`→`auth()`.
- **Fix:** thread the already-resolved ability/session in (removes the redundant `auth()`), and query sprints with a direct org filter. **Correction to the original fix:** `idx_sprints_project_status` is on `(project_id, status)` (leading column `project_id`) and **cannot** serve an `(org_id, status)` filter — there is no `(org_id, status)` index on `sprints`. Either **add a `(org_id, status)` index** or keep the project-id join (the non-admin path also needs the membership join for correctness, else it over-returns sprints).
- **Impact:** ~30ms (tiny per-org datasets, indexed/PK lookups; 2 round-trips → 1). Original ~350ms is overstated.
- **Risk:** medium (index addition + correctness on the non-admin scope). **Effort:** M.

### SF-6 — Server-prefetch / batch the post-hydration fetch fan-out
- **Evidence:** `useMyIssues` (`dashboard-client.tsx:116`) is `enabled:!!currentUserId` where `currentUserId` comes from client `useSession()` (`:85-86`) — so it waterfalls behind `/api/auth/session`. Shell badges fan out unprefetched: `useGetOrganizations` (60s), `useChatUnreadTotal` (`app-sidebar.tsx:101`), `useUnreadNotificationCount` (`:104`), `NotificationBell` eager `useNotifications(false,20)` (`notification-bell.tsx:32`, no `staleTime`). These compete for the browser's ~6 HTTP/1.1 connections with the visible-content queries.
- **Fix:** (a) server-prefetch `myIssues` in `page.tsx` using `auth.userId` into `queryKeys.dashboard.myIssues(userId)` via the existing `HydrationBoundary`; (b) batch sidebar badges into one `/api/dashboard/bootstrap` (`{orgName, unreadChat, unreadNotifications, pendingApprovals}`) prefetched in the layout; (c) make `NotificationBell` list `enabled: isOpen`; (d) raise unread-count `staleTime` to ≥60s and set `refetchIntervalInBackground:false`.
- **Impact:** ~250ms (myIssues) + reduced connection contention; below-the-fold CeoDashboard widgets (~13 queries, `ceo-dashboard.tsx:21-73`) should be deferred via `next/dynamic` + IntersectionObserver so they stop stealing connections from above-the-fold queries.
- **Risk:** low. **Effort:** M.

### SF-7 — Mitigate Neon scale-to-zero cold start (keep-alive)
- **Evidence:** `lib/db.ts:37` `prepare:false` (mandatory for the transaction pooler — keep it), `:40` `connect_timeout: 60`. First load after idle pays compute wake (~1–5s) under that ceiling with no fast-fail.
- **Fix:** keep `prepare:false`; add a lightweight `SELECT 1` keep-alive ping every ~4–5 min (`/api/health` already runs `SELECT 1`). **Do NOT lower `connect_timeout`** — that turns a slow load into a failed one.
- **Impact:** ~1500ms typical cold-start (intermittent — first visit after idle only; variable 1–5s).
- **Risk:** low. **Effort:** S–M.
- **Deployability caveat:** `vercel.json` crons are fixed daily/weekly (verified — 7 entries, none sub-hourly) and Vercel **Hobby crons run at most once per day**, so an in-platform cron **cannot** keep Neon warm at 5-min cadence — needs a Pro plan or an external pinger (e.g. cron-job.org / UptimeRobot hitting `/api/health`).

---

## 4. Explicitly ruled out (do not chase these for dashboard TTFB)

- **Rate-limit / bot detection:** `resolveTier('/dashboard')` returns null (`lib/rate-limit.ts:263`, non-`/api/` path) → `checkRateLimit` skipped; `BOT_BLOCKED_PREFIXES` are all `/api/` (`middleware.ts:161-169`). **0ms on the page path.**
- **`canAccessRoute` permission-map eval:** pure in-memory; no `/dashboard` key in `ROUTE_PERMISSION_MAP` (`middleware.ts:85-128`) → returns `true` immediately (`:153`). **~1ms.**
- **`getToken()` cookie decrypt:** local CPU only (the heavy jwt callback runs in the `/api/auth` handler, not middleware). ~8ms; lower priority — measure cookie size before shrinking the permissions array.
- **recharts / exceljs / xlsx / prosemirror-tiptap:** already code-split off the dashboard route (manifest scan = 0 recharts refs). Real costs for *their own* routes (crm/hr analytics, reports, editor) — wrap those in `next/dynamic({ ssr:false })` — but **not** dashboard first paint.
- **Geist font weights (11 files):** `display:swap` set (`app/layout.tsx:27-39`) → non-blocking. Trim unused 300/800/900 weights for bytes/CLS, but no render-block fix needed (~80ms).

---

## 5. Measured vs. estimated (read before acting)

**Every millisecond figure in this document is a static-analysis estimate, not a measurement.** Network RTTs (~150–250ms cross-region), gzip download/parse times, and Neon cold-start (1–5s) are environment-dependent ranges. Several original impact figures were found **overstated** on adversarial re-check (auth 1200→~80ms warm; membership 250→~80ms; sprint waterfall 350→~30ms; uncached queries 400→~175ms; framer 500→~180ms) because the original model assumed serial where the code is parallel and ignored the warm Redis cache.

**Before and after each change, measure for real:**
- **Production, not dev** — `next build && next start` (or a Vercel preview). The ~7s likely includes one-time `next dev` webpack compilation; do not optimize a dev artifact.
- **TTFB / field timings** — Lighthouse (lab) + a Vercel Speed Insights / RUM sample (field), watching TTFB, FCP, LCP, TBT.
- **First-load JS** — `@next/bundle-analyzer` (or inspect `.next/build-manifest.json` / the dashboard `page_client-reference-manifest`) before/after SF-3, QW-3, QW-6 to confirm framer + cmdk actually left the dashboard chunk set.
- **DB** — `EXPLAIN ANALYZE` on the dashboard queries (esp. SF-5's sprint lookup) to confirm index usage *before* adding the `(org_id, status)` index, and to confirm `getRoleStats` is index-covered.
- **Region/RTT** — log `VERCEL_REGION` and one DB round-trip timing before/after QW-1 to confirm the cross-region delta.

Treat the estimates as a **prioritization signal**, not a contract. Re-rank after the first measurement pass.

---

## 6. Suggested sequencing

**Phase 0 — Establish ground truth (hours).**
QW-8 (Turbopack + measure prod). Capture baseline Lighthouse, bundle-analyzer, one DB-RTT timing, and `VERCEL_REGION`. **Do not optimize anything until this baseline exists.**

**Phase 1 — Config-only, highest leverage (½ day, all low-risk S).**
QW-1 (`sin1` region pin) → QW-6 (`optimizePackageImports`) → QW-3 (lazy cmdk) → QW-5 (gate IP-allowlist) → QW-7 (drop redundant membership query) → QW-2 (`React.cache(auth)`). Re-measure: expect the largest single delta from QW-1.

**Phase 2 — Cheap code, removes redundant work (½–1 day, S).**
QW-4 (permissions from session). Re-measure first-load JS and the post-hydration fetch waterfall.

**Phase 3 — Structural, render-path (1–2 days, M).**
SF-1 (Suspense/stream shell) → SF-3 (framer off critical path, all widgets) → SF-4 (scoped caching) → SF-6 (prefetch/batch fan-out). These compound; re-measure TTFB + TBT after each.

**Phase 4 — Targeted DB / infra (1 day, M).**
SF-2 (parallelize jwt cache-miss) → SF-5 (sprint waterfall + `(org_id,status)` index, gated on `EXPLAIN ANALYZE`) → SF-7 (Neon keep-alive, requires Pro cron or external pinger).

**Re-evaluate the NestJS split only after Phases 0–3.** If production TTFB is acceptable post-Phase-3, the split is a maintainability/scaling decision, not a performance one — and if pursued, the new service **must** be co-located with Neon (`sin1`) or it will reintroduce the cross-region latency this plan removes.
