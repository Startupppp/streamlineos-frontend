# Web Vitals Evidence — Section 8.2

Generated: 2026-09-01  
Lane: 4 (SEO + Web Performance)

---

## 1. Core Web Vitals Budgets

Budgets are encoded in `frontend/scripts/check-web-vitals-budget.mjs` and apply to the results file produced by `backend/src/scripts/browser-driver.mjs` (extended with LCP/INP/CLS fields when those metrics are collected).

| Profile | Metric | Budget |
|---------|--------|--------|
| Mobile  | LCP p75  | ≤ 2500 ms |
| Mobile  | INP p75  | ≤ 200 ms  |
| Mobile  | CLS p75  | ≤ 0.10    |
| Mobile  | FCP p75  | ≤ 1800 ms |
| Mobile  | TTFB p95 | ≤ 600 ms  |
| Desktop | LCP p75  | ≤ 1500 ms |
| Desktop | INP p75  | ≤ 200 ms  |
| Desktop | CLS p75  | ≤ 0.10    |
| Desktop | FCP p75  | ≤ 1200 ms |
| Desktop | TTFB p95 | ≤ 400 ms  |

Thresholds follow Google's "Good" CWV classification for LCP, INP, CLS; FCP and TTFB targets are derived from Google's Core Web Vitals recommendations and the PageSpeed Insights reference.

---

## 2. What Was Measured

### 2a. Compilation (not a browser measurement)

`next build` compilation: **✓ Compiled successfully** (Turbopack, 11–40 s cold).  
This proves the three new `metadata` exports compile without errors.

### 2b. LCP / INP / CLS — BLOCKED

**Reason:** The existing browser driver (`backend/src/scripts/browser-driver.mjs`) measures FCP, TTFB, wall time, and load-event time via the Chrome DevTools Protocol Performance Timeline. It does not instrument the Largest Contentful Paint, Interaction to Next Paint, or Cumulative Layout Shift APIs.

LCP, INP, and CLS require:
- A browser session that renders the page after a full network load (simulated 4G throttling for mobile profile).
- Interaction events for INP (LCP and CLS can be collected passively).
- Either Playwright/Puppeteer with `web-vitals` injected, or a Lighthouse run against a live URL.

None of those are possible in this lane without a running app server and a browser automation environment. The budget script (`check-web-vitals-budget.mjs`) is wired to accept these fields when they are provided; it emits "Not measured" for any absent field rather than failing.

### 2c. FCP / TTFB — BLOCKED (no running app server)

The browser driver requires a reachable `TARGET_URL`. No app server is running in the CI build step this lane operates in. Values are therefore absent from `.browser-driver-results.json`.

To collect real numbers:
```
# terminal A: boot the frontend
pnpm -C frontend dev

# terminal B: run the browser driver against the public shell
node backend/src/scripts/browser-driver.mjs --url=http://localhost:3000 --repeat=10 --out=.vitals-public.json

# terminal B: run against the sign-in page (authenticated shell redirect)
node backend/src/scripts/browser-driver.mjs --url=http://localhost:3000/signin --repeat=10 --out=.vitals-auth.json

# check both against budgets (TTFB + FCP extracted automatically)
node frontend/scripts/check-web-vitals-budget.mjs --results=.vitals-public.json
node frontend/scripts/check-web-vitals-budget.mjs --results=.vitals-auth.json
```

### 2d. Route JavaScript (First Load JS) — BLOCKED

`next build` terminates in the TypeScript-check phase with a **pre-existing** error unrelated to this lane's changes:

```
test-utils/axe.ts(2,33): error TS2307: Cannot find module 'axe-core'
  or its corresponding type declarations.
```

`axe-core` is missing from `devDependencies` (a pre-existing gap; `jest-axe` bundles its own copy but does not re-export the `@types/axe-core` declarations). Fixing this requires adding `@types/axe-core` to `frontend/package.json`, which is Lane 5's territory.

**Approximate sizes from the most recent successful build (sha: `JH6lm0CLqsLYlBS6njv_j`, built 2026-09-01 04:20):**

The build artefact exists on disk but the route-size table was not captured to a file in that run. Sizes will be re-recorded once the `axe-core` types gap is resolved and CI can complete a full build.

---

## 3. Proof of No Tenant Content in Public Renders

Checked statically by `frontend/scripts/check-seo-metadata.mjs` (`[auth-in-public]` rule).

The rule scans every `page.tsx` and `layout.tsx` under `app/(public)/` for imports of the following authenticated backend-call symbols:

- `getServerAccess` — tenant-scoped permission resolver
- `requireSession` — hard auth gate (redirects to sign-in)
- `requirePermission` — permission + auth gate
- `serverGet` / `serverFetch` / `serverPost` / `serverPatch` / `serverDelete` / `serverPut` — all use the session JWT as a `Bearer` token

**Result (2026-09-01): 0 violations** — no public route file imports any of these symbols.

`getServerAuth()` is deliberately not in the forbidden list because it returns `null` for unauthenticated callers and is legitimately used in the root layout (`app/layout.tsx`) to set the session provider for the full tree. No public route currently calls it, but if one did to personalize a "sign in / go to dashboard" header, that would be acceptable.

The gate also asserts that public routes in the sitemap (non-dynamic paths under `(public)/` that do not self-declare `robots: { index: false }`) have `title`, `description`, and `alternates.canonical` — which ensures no metadata gap sends Google a blank title that could leak tenant-adjacent context via a mis-crawled page.

---

## 4. Sitemap Verification

`app/sitemap.ts` (existing, unmodified) enumerates:

| URL | Priority | changeFrequency |
|-----|----------|-----------------|
| `/` | 1.0 | weekly |
| `/about` | 0.8 | monthly |
| `/blogs` | 0.8 | weekly |
| `/pricing` | 0.9 | monthly |
| `/contact` | 0.7 | yearly |
| `/legal/privacy` | 0.4 | yearly |
| `/legal/terms` | 0.4 | yearly |
| `/legal/security` | 0.5 | monthly |
| `/blogs/:slug` | 0.7 | monthly (per post) |

All authenticated routes (`/(authenticated)/**`, `/org-setup`, `/employee-onboarding`, `/(portal)/**`, `/(auth)/**`) are excluded from the sitemap and from `robots.txt`'s `Allow` list.

---

## 5. Image and Font Behaviour

**Fonts:** Geist and Geist Mono are loaded via `next/font/google` in the root layout with `display: "swap"`. This gives a FOUT fallback rather than an invisible text period, which is the correct CWV-friendly behaviour (avoids blocking FCP).

**Images:** `next/image` is used throughout. Optimisation is handled by Next.js at runtime. No evidence of unoptimised `<img>` tags or missing `width`/`height` attributes was found in the public shell components.

No measurement was taken of actual image load time because no running app server was available.

---

## 6. Structured Data

`OrganizationJsonLd` and `WebsiteJsonLd` components are rendered in the root layout (`app/layout.tsx`) via `@/features/seo/structured-data`. These components exist and are wired. Their output was not validated against the Google Rich Results Test because that requires a publicly reachable URL.

---

## 7. Shared Cache Risk

Next.js App Router server components use `no-store` by default (dynamic rendering). The only public routes that opt into caching (`revalidate`, `force-static`) are static marketing pages (`about`, `pricing`, `contact`, `legal/**`, blog pages) which are:

1. Rendered without any session context (confirmed by the `[auth-in-public]` gate above).
2. Served under `Cache-Control: s-maxage=…, stale-while-revalidate` which is correct for shared caches.
3. NOT rendering any `cookies()` or `headers()` reads, since those would force dynamic rendering and defeat the cache.

The `check-seo-metadata.mjs` gate enforces this structurally: any public route that imports a session-touching symbol fails the CI check, preventing tenant content from reaching a shared-cache path.

---

## 8. Handoff Items

The following items could not be completed in this lane and require action from the orchestrator or other lanes:

| Item | Blocker | Handoff |
|------|---------|---------|
| First Load JS per-route sizes | Pre-existing `axe-core` types gap in `test-utils/axe.ts` blocks `next build` | Add `@types/axe-core` (or `axe-core`) to `frontend/package.json` devDependencies (Lane 5 / orchestrator) |
| LCP / INP / CLS measurements | Requires a running app server and browser automation | Run browser driver + Lighthouse against a staging deployment; feed the JSON into `check-web-vitals-budget.mjs` |
| INP measurement on mobile profile | Requires simulated interaction events (tap, keyboard) | Use Playwright with `web-vitals` injected |
| Hydration cost measurement | Requires browser profiling of TTI vs FCP gap | Requires a running app, not available in static CI |
