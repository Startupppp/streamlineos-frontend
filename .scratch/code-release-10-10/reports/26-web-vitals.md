# Ticket 26 — Web Vitals budgets on a production build

**6 of 7 boxes closed. 1 open** — the route-level JavaScript budget. Every number below came from a command I ran and read; the
command and its exit code are named beside it.

**The headline changed this session.** The previous pass recorded numbers for six routes that were
void: it had no authenticated session, so every route painted an access-failure shell and the driver
correctly refused all 72 samples. This session obtained a real session against a local seeded
backend and re-measured. On **192 authenticated samples** — 12 routes × 2 profiles × 8 repetitions,
0 unauthorized, 0 off-route, 0 unusable — **four of the six breached metrics are now inside budget
and the remaining two are one backend call.**

| | previous (void) | this capture (authenticated) | budget | verdict |
|---|---|---|---|---|
| desktop LCP p75 | 1 685 | **888 ms** | 1 500 | **met** |
| desktop FCP p75 | 1 564 | **865 ms** | 1 200 | **met** |
| desktop INP p75 | not measured | **48 ms** | 200 | **met** |
| desktop CLS p75 | 0.000 | **0.0008** | 0.1 | **met** |
| desktop TTFB p95 | 1 761 | **1 669 ms** | 400 | **BREACH** |
| mobile LCP p75 | — | **1 002 ms** | 2 500 | **met** |
| mobile FCP p75 | 1 742 | **758 ms** | 1 800 | **met** |
| mobile INP p75 | not measured | **96 ms** | 200 | **met** |
| mobile CLS p75 | 0.000 | **0.000** | 0.1 | **met** |
| mobile TTFB p95 | 1 804 | **932 ms** | 600 | **BREACH** |

`node scripts/check-web-vitals-budget.mjs` → **exit 1, 2 violations** (was 4 violations + 2 not
measured). Both remaining violations carry an owner and a measured cause.

---

## 1. How the session was obtained — and the product defect on the way

`streamlineos-backend/.env` carries neither `NEXTAUTH_SECRET` nor `AUTH_SIGNING_KEYS`. Without them
`POST /auth/session-exchange` returns **503** unconditionally, so no local frontend can obtain a
backend JWT. Supplying both as **local placeholders in the process environment only** (never written
into either repository, never a real secret) makes the exchange work.

**The product defect that hides behind that 503 is worth a ticket of its own.** When
`/auth/session-exchange` fails, the frontend does not render an error state — it sits on
**"Syncing organization…"** forever, with no message, no retry and no way out. A user whose exchange
fails in production sees a branded spinner and nothing else. The driver now detects exactly this
(`brandedLoader` in `findUnusableSamples`), which is how the previous pass's refusal worked at all,
but the app itself still has no terminal state for it. *Owner: whoever owns
`components/layout/dashboard-shell.tsx` / the org-sync boundary — not this ticket's territory.*

The identity used is the seeded owner of the `scratch_perf_seed` tenant
(`aaaaaaaa-1111-0000-0000-000000000001`), the same fixture report `00-seeded-perf-database.md`
provisions. The cookie is minted exactly as NextAuth v5 does it:
`hkdf("sha256", secret, "authjs.session-token", "Auth.js Generated Encryption Key (authjs.session-token)", 64)`
then `EncryptJWT({alg:"dir", enc:"A256CBC-HS512"})`.

**Proof of authentication before any number was recorded**, which is the thing the previous pass
could not do:

- `authorization.verdict` — *"every measured sample rendered an authorized shell"*, `unauthorizedSamples: 0`
  of 192, against `MIN_AUTHORIZED_NAV_LINKS = 3` distinct in-app nav links.
- `contentAssertion.verdict` — *"every measured sample rendered real page content"*, 0 unusable,
  0 off-route.
- Independently: `curl` with the cookie against `/hr/employees` returns 200 and the parsed body
  contains the HRMS shell, not the sign-in page.

The refusal is not decorative: it is what produced the previous session's honest zero.

---

## 2. `next build` — the wall is real, and it is one line

**It is not `/billing/ai-credits`.** That route does not exist. The build dies in the **root layout**:

```
[env] Validation failed:
  NEXTAUTH_SECRET: In production, NEXTAUTH_SECRET must be at least 44 characters (256-bit base64)
      at module evaluation (lib/env.ts:40:11)
      at module evaluation (app/layout.tsx:120:1)
```

`frontend/.env` carries a **36-character** `NEXTAUTH_SECRET`; the schema demands 44. With a longer
local placeholder in `.env.production.local` the build completes. This session's capture ran against
build id **`qlh_3k7hMskrlYGND5MMp`**, `serverMode` **derived** as `"production"` by comparing the
build id in the served HTML against `.next/BUILD_ID` — not asserted.

Turbopack refuses a `node_modules` symlink that leaves the project root; an APFS clone (`cp -Rc`) is
the working way to build an out-of-tree copy.

---

## 3. TTFB — the two remaining breaches, decomposed

Same production server, same machine, same session:

| Leg | Measured | Method |
|---|---|---|
| `/` (public landing) | **9–13 ms** | `curl` |
| backend `GET /health` (no DB) | **0.6–1.4 ms** | `curl`, 3 runs |
| backend `GET /auth/session-data/:userId` | **p50 100 ms**, max 948 | 6 runs, direct |
| backend `POST /auth/session-exchange` | **p50 563 ms**, min 463, max 1 122 | 6 runs, direct |
| backend `GET /me/access` | **p50 503 ms**, min 378, max 1 004 | 6 runs, direct, with a real JWT |
| frontend `/dashboard` server render | **p50 517 / p75 659 / p95 835 ms** | plain Node fetch to first byte, 8 runs, all HTTP 200 |
| frontend, worst route (`/inbox`) | **p50 597 / p75 835 / p95 1 218 ms** | same |

`lib/rbac/get-server-access.ts` issues **`GET /me/access` on every authenticated server render**.
React's `cache()` dedupes it within a single render, never across renders, so every navigation pays
it. At p50 503 ms that one call *is* the TTFB: the same server, same process, same build returns the
public landing in 9 ms.

Note the earlier report's attribution — "`GET /auth/session-data` at 588–757 ms, issued twice on a
non-2xx" — was measured on the **failing** path. Authenticated, that call is 100 ms and is not the
problem. The correction matters because it moves the owner from the retry logic to `/me/access`.

**Localhost variance, acknowledged rather than used.** Loopback removes real network time, so these
figures **understate** production. The mobile profile adds 150 ms of emulated RTT — about a sixth of
its 932 ms p95, not the breach. The desktop browser p95 (1 669 ms) exceeds the unthrottled
server-side p95 (835–1 218 ms) because the server pass ran last, with the host under other agents'
load; both are recorded so neither can be cherry-picked.

---

## 4. Perceived responsiveness — measured, fixed, and now gated

Ticket 27 turned the sidebar's viewport prefetch off, which was right: 354 nav `<Link>`s were firing
speculative RSC requests that re-ran the authenticated layout. The cost is that a nav click now
starts a cold navigation against a route that answers in 400–1 000 ms. The previous session measured
a tap producing **no DOM change for up to 1 739 ms** — the interface looked frozen while work ran.

**Fix:** `components/layout/nav-pending-indicator.tsx` — Next 16's `useLinkStatus`, rendered inside
every sidebar item (expanded and collapsed) and every mobile bottom-nav and overflow item. It is
absolutely positioned and present in **both** states, so appearing costs no layout shift, and it is
`aria-hidden` because the route change is the announcement.

**Measured on the authenticated capture**, click → first DOM mutation on the same in-page clock:

| Profile | navigations | p50 | p75 | max | target |
|---|---|---|---|---|---|
| desktop | 12 | 1 ms | **1 ms** | 3 ms | 100 ms |
| mobile | 11 | 5 ms | **5 ms** | 52 ms | 100 ms |

One route/profile pair is listed as not measured — `mobile /chat` has no in-app nav link in view at
390 px — and is reported rather than counted as a breach, because there is no navigation there to be
slow.

**The target is now enforced rather than narrated.** It sat in the manifest with nothing reading it.
`checkPerceivedResponsiveness` gates the p75 per profile, **fails a profile that was never measured**
rather than passing it by absence, and carries four self-test fixtures (breaching, inside-target,
absent block, profile with no measurement).

Proof: `jest components/layout` → **17 suites / 122 tests pass, exit 0**, including
`nav-pending-indicator.test.tsx` (3 tests: pending reaches the DOM; present in both states so it
costs no layout shift; hidden from assistive technology).

---

## 5. Route-level budgets — everything but JavaScript is inside ceiling

`node scripts/check-route-bundle-budget.mjs` → **exit 1**, 13 routes, 12 measured, 1 pending,
**17 breaches — all JavaScript**.

| Budget | Result |
|---|---|
| CSS | 58 244 B (60 192 on `/settings`) vs 65 536 ceiling — **met on every route** |
| Fonts | 55 206 B on every route vs 131 072 — **met** |
| Images | 2 907–14 480 B vs 524 288 — **met** |
| Third-party | **0 B** on every route — **met** |
| Server payload | 19 466–25 682 B vs 40 960 — **met** |
| JavaScript | 610 108–850 044 B `measuredScriptBytes` vs 524 288 — **13 routes breach** |

**The JS budget used to pass on a number that is not what users download.** `/dashboard` governs
440 065 B (`measuredFirstLoadJsBytes`, gzip over the route's client-reference manifest) but the
browser downloads **641 789 B** before the load event and a further **319 347 B** after it. The
driver now splits on `Page.loadEventFired`, so the route is charged its own first load
(`measuredScriptBytes` / `measuredTotalBytes`) and the shell's speculative tail is recorded beside it
(`measuredPostLoadScriptBytes`) rather than inside it.

The breach has no single owner-chunk to point at: `/dashboard`'s 25 largest first-load scripts run
74 672 · 58 371 · 54 829 · 43 894 · 32 187 B and then a long tail of ~14 kB chunks. It is the shared
authenticated shell, not one missing lazy boundary. The largest identifiable library in it is
**framer-motion** (224 kB raw / 71 kB gzip, 278 importers), pinned there by the public landing's
animations — escalated in §7, not worked around.

`components/feedbucket/feedbucket-embed.tsx` loads a **196 937 B** local widget at
`strategy="afterInteractive"` on every authenticated page — inside the window INP measures. It did
**not** load in this capture, because it returns `null` when `NEXT_PUBLIC_FEEDBUCKET_*` is unset, so
it is not in any number above. In a production deployment that sets those keys it is 197 kB inside
the interaction window and `lazyOnload` is a one-word change. *Not my territory; recorded for
routing.*

---

## 6. Memory, long tasks and hydration — ticket 27's remaining box

Not measurable in jsdom (`performance.memory` is Chrome-only, `longtask` is not implemented, and
`react-dom/server.browser` needs a `MessageChannel` jsdom does not define). Measured here on the
production build in a real browser, **192 authenticated navigations**.

**Hydration: 0 mismatches of 192**, read from the console over CDP, with the detector's negative
control in the self-test (an unrelated console error is not counted).

**Long tasks**, total blocking per navigation, p75:

| | desktop (no throttling) | mobile (4× CPU) |
|---|---|---|
| best route | 0 ms (`/mail`) | 198 ms (`/settings`) |
| worst route | 0 ms | **408 ms (`/dashboard`)** |
| profile p75 | **0 ms** | **275 ms** |

Desktop is genuinely clean. On a 4×-throttled CPU every route spends 200–400 ms in tasks longer than
50 ms, and `/dashboard` is the worst — that is the number a mid-range phone actually experiences, and
it is the reason mobile INP (96 ms) is twice desktop's (48 ms) while still inside budget.

**Memory.** `usedJSHeapSize` p75 per route, in one browser session that navigated the 12 routes in
order:

```
/dashboard  59 MB  →  /mail 97  →  /inbox 150  →  /notifications 194  →  /settings 246
→  /calendar 290  →  /chat 347  →  /parties 352  →  /crm/inbox 347  →  /support/inbox 362
→  /build/inbox 351  →  /build/my-work 345 MB
```

The heap appears to climb monotonically ~25–50 MB per route and then plateau around 350 MB. **That
reading is an artifact and it would have been reported as a leak.** It was taken without forcing a
collection, so it counts uncollected garbage, not retention.

### 6a. Post-GC re-measurement — there is no leak

The driver now calls `HeapProfiler.collectGarbage` immediately before every heap read, so
`usedJsHeapBytes` is what the page is still *holding*. Re-measured over the same 12 routes, same
build, same session, `--repeat=3` (72 samples, `authorization` and `contentAssertion` both clean,
`routeFailures: 0`):

| route | desktop | mobile | | route | desktop | mobile |
|---|---|---|---|---|---|---|
| /dashboard | 16 MB | 16 MB | | /chat | 17 MB | 17 MB |
| /mail | 14 | 14 | | /parties | 14 | 14 |
| /inbox | 14 | 13 | | /crm/inbox | 14 | 14 |
| /notifications | 14 | 14 | | /support/inbox | 15 | 15 |
| /settings | 14 | 14 | | /build/inbox | 13 | 13 |
| /calendar | 16 | 17 | | /build/my-work | 15 | 17 |

**13–17 MB, flat, on every route and both profiles** — profile p75 **15.5 MB desktop / 15.7 MB
mobile**, against 345–362 MB for the same routes without a collection. The app retains nothing
across navigation; the 350 MB was garbage the collector had not been asked to take. Hydration was
clean again on this pass (**0 mismatches of 72**) and mobile long tasks reproduced at **p75 309 ms**
against the first pass's 275 ms.

The lesson is worth keeping: a heap read without a forced GC is not a memory measurement, and this
one would have shipped a leak report.

---

## 7. Escalations and cross-territory findings

**The public landing is untouched** — nothing under `app/(public)/**`, `features/marketing/**` or any
landing animation was modified this session or last. The landing renders in 9–13 ms TTFB and is not
on the authenticated critical path, so no frozen animation prevents any target. It does pin
framer-motion into every authenticated first load; dropping it is a **product decision about the
landing**, escalated rather than worked around.

Things measured that I was not allowed to fix:

1. **`GET /me/access` at p50 503 ms, once per authenticated server render.** This is both remaining
   TTFB breach. *Owner: `streamlineos-backend` for the endpoint cost; ticket 28 for whether
   `lib/rbac/get-server-access.ts` may cache across renders.*
2. **No error state for a failed org sync.** `/auth/session-exchange` failing leaves the app on
   "Syncing organization…" forever — no message, no retry. *Owner: the shell.*
3. **`streamlineos-backend/.env` has no `NEXTAUTH_SECRET` / `AUTH_SIGNING_KEYS`,** so nobody can
   authenticate a local frontend without supplying them by hand. *Owner: environment.*
4. **`lib/api-client.ts` calls `signOut()` on any 401**, including a transient one. *Owner: ticket 28.*
5. **`components/feedbucket/feedbucket-embed.tsx`** — 197 kB at `afterInteractive`, see §5.

---

## 8. Driver changes this session

- **A CDP request had no deadline.** `Runtime.evaluate` with `awaitPromise` resolves only when the
  page's promise does, so a renderer that never settles parks the driver forever. The previous agent
  sat on `/build/inbox` for **2 h 31 m at 0 % CPU**, having produced 10 of 24 route/profile pairs,
  and the only evidence was a log that stopped. Sends now carry a 60 s deadline
  (`withDeadline`, self-tested both ways), and a wedged route is recorded in `routeFailures` and
  skipped instead of consuming the run. This capture: **`routeFailures: 0`**, all 24 pairs completed.
- **Forced collection before every heap read** (`HeapProfiler.collectGarbage`), so `usedJsHeapBytes`
  is a retention figure rather than a count of uncollected garbage.
- Carried forward from the previous pass and now proven on real data: the load-event byte split, the
  theme init script (the app reads `localStorage["streamlineos-app-theme-mode"]` and only consults
  `prefers-color-scheme` when that is `"system"`, so emulating the media feature alone measured light
  while claiming dark), script itemisation, and the three refusals.

---

## 9. Commands run, exit codes read

| Command | Exit | Number |
|---|---|---|
| `node scripts/measure-web-vitals.mjs --base-url=http://localhost:1043 --routes=<12> --repeat=8 …` | 0 | 192 samples, 24/24 pairs, 0 refused, build `qlh_3k7hMskrlYGND5MMp` |
| `node scripts/check-web-vitals-budget.mjs` | **1** | 2 violations (both TTFB), 0 not measured |
| `node scripts/check-route-bundle-budget.mjs` | **1** | 13 routes, 12 measured, 1 pending, 17 breaches — all JS |
| `node scripts/measure-web-vitals.mjs --self-test` | 0 | 43 fixtures |
| `node scripts/check-web-vitals-budget.mjs --self-test` | 0 | breach + unmeasured + exception-never-clears + 4 perceived-responsiveness fixtures |
| `node scripts/check-route-bundle-budget.mjs --self-test` | 0 | 5 fixtures |
| `node scripts/measure-route-bundles.mjs --self-test` | 0 | 4 fixtures |
| `pnpm exec jest --runInBand --testPathPattern="components/layout"` | 0 | 17 suites / 122 tests |
| `node .scratch/t26-decompose.mjs` | 0 | session-data 100 / exchange 563 / me-access 503 ms p50 |

`pnpm lint` and the repo-wide jest suite: **not run.** `pnpm type-check`: **not run this session**
(no TypeScript source changed except `nav-pending-indicator.tsx`, which is covered by the jest run
above and by the production build that serves it).

## 10. Reproducing this

```
# frontend, out of tree (Turbopack rejects an out-of-tree node_modules symlink)
git archive HEAD frontend | tar -x -C <scratch> ; cp -Rc frontend/node_modules <scratch>/frontend/
printf 'NEXTAUTH_SECRET=<44+ char local placeholder>\nNEXTAUTH_URL=http://localhost:1043\n' \
  > <scratch>/frontend/.env.production.local
npx next build && npx next start -p 1043

# backend, with the two keys its .env lacks, supplied in the environment only
NEXTAUTH_SECRET=<same> AUTH_SIGNING_KEYS=<local placeholder> CORS_ORIGINS=http://localhost:1043 \
  node --env-file=.env <backend>/dist/main

NEXTAUTH_SECRET=<same> SEED_USER_ID=<seeded owner> SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 \
  node frontend/.scratch/t26-mint-session.mjs > cookie.txt

node scripts/measure-web-vitals.mjs --base-url=http://localhost:1043 --cookie-file=cookie.txt \
  --routes=<12 routes> --repeat=8 --write-manifest
```

It refuses unless the samples reach an authorized shell. That refusal is the feature: this release
has already had two full runs report zero findings while every step rendered an error page.

---

# Session S9 — 2026-09-03 — production build completed; the shell's biggest library is not framer-motion

**Build:** `NEXTAUTH_SECRET=<47-char local placeholder> NODE_ENV=production npx next build` through `heavy.sh 2`
→ **exit 0**, build id `pRoNmQpD1X5_6lTUEhSv9`, **601 routes**. S8's killed build left `.next` with no
`BUILD_ID`; it was deleted (cache kept) before rebuilding, so nothing below reads a half-written artifact.
`pnpm -C frontend type-check` → **exit 0**.

## 1. The governed number understates the download — confirmed

`/dashboard` `measuredFirstLoadJsBytes` re-measures at **441,834 B** gzip over **37** chunks by the
client-reference-manifest method. Next's own accounting for the same route, from
`.next/diagnostics/route-bundle-stats.json`, is **2,281,422 B raw / 573,428 B gzip over 42 chunks** — the extra
five are framework/polyfill/main, which the manifest method never sees. The recorded 640,260 B over-the-wire
figure sits between the two and is the honest one for what users fetch.

## 2. framer-motion, priced

Isolated bundles built with the repo's own `esbuild 0.27.1` (`--bundle --minify --format=esm`, react external):

| entry surface | raw | gzip |
|---|---|---|
| `motion, AnimatePresence, useReducedMotion, LayoutGroup, MotionConfig, useTransform, useSpring, useMotionValue, useInView` | 121,284 B | **40,690 B** |
| `motion, AnimatePresence, useReducedMotion` | 117,537 B | 39,330 B |
| `useReducedMotion` alone | 368 B | **253 B** |

In the build itself framer-motion is a single merged module of 94,837 B inside chunk `2-tfck0qpw5kq.js`
(95,216 B raw / **30,554 B gzip**), a first-load chunk of **601 of 601** routes.

Importers at head: **278** — 22 `features/landing`, 256 authenticated. `useReducedMotion` is used by 102 of them
and costs **253 B**, so those files are not part of any migration. The price is `motion` (256) and
`AnimatePresence` (67).

**Answer for the scope decision: ~40 kB gzip per first load.** Smallest open breach is 59,598 B. Replacing
framer-motion does not close the JS budget by itself.

## 3. The finding that changes the decision — `@animateicons/react/lucide`

| | raw | gzip | routes in first load |
|---|---|---|---|
| `@animateicons/react/lucide` (`448xe3n3zsx8s.js`) | **481,691 B** | **55,869 B** | **559 / 601** |
| framer-motion (`2-tfck0qpw5kq.js`) | 95,216 B | 30,554 B | 601 / 601 |

- Ships **248** icons (counted from `displayName=` literals in the built chunk); the app imports **90** distinct
  icons across **596** files.
- `next.config.ts` **already** lists it in `experimental.optimizePackageImports`. **The optimisation is vacuous
  here** — the package is one 412,078 B ESM file with no per-icon modules to rewrite to, and it carries **zero
  `@__PURE__` annotations** on 248 top-level `forwardRef(...)` calls, so no bundler may drop an unused one.
- Reproduced outside Next: all 248 → 455,497 B raw / 60,394 B gzip; only the 90 used → 452,184 B raw /
  59,354 B gzip. A **1,040 B** difference. Structurally unshakeable.
- It **vendors its own copy of framer-motion** (`dist/chunk-SZP4YRB3.js`, 73,833 B, carrying
  `transformPerspective` / `anticipate` / `whileHover` / `originX`) and declares no dependency on it —
  **framer-motion ships twice** in every authenticated first load.
- Prorating 90/248 puts roughly **35 kB gzip** per first load in icons that are never rendered.

**Owner: a dependency decision, outside ticket 26's territory.** It is a one-dependency lever, larger than
framer-motion, versus a 256-file refactor.

## 4. `org-switcher.tsx` — the `dynamic()` deferred nothing

`LeaveOrganizationDialog`'s own description string sits in `.next/static/chunks/176qxkejwz55m.js`
(71,974 B raw / 22,373 B gzip) **together with** `LeaveOrganizationMenuItem` — the module the static import on the
line above already pulled in. That chunk is a **first-load** chunk of **556 of 601** routes, confirmed directly
against `/dashboard`, `/inbox` and `/settings`. **No async chunk carrying the module exists** anywhere under
`.next/static/chunks`; the only other file containing the string is `1-t3ze_xbo39w.js`, itself a first-load chunk
of `/settings/organization`. Collapsed to a static import. **Byte saving: zero** — the value is that the code no
longer claims a deferral it never performed. Dropping `ssr: false` is safe: the dialog returns `null` unless
`access.isOrgOwner === false`, and `ConfirmDialog` renders through a Radix portal that emits nothing while closed.

## 5. `maxTotalBytes` — governed, loose, deliberately not tightened

1,048,576 B, every route inside: `/chat` 989,423 B (**94.4%**), `/build/my-work` 963,374 (91.9%), `/crm/leads`
951,954 (90.8%). It would fire, so it is not vacuous — but it has never rejected anything and it sits above a
`measuredScriptBytes` ceiling that 14 routes breach, so it is not evidence that page weight is controlled.
Tightening it would manufacture red routes on a box already blocked, with no agreed target. Recorded in the
manifest rather than changed.

## 6. Gates

| command | exit | number |
|---|---|---|
| `npx next build` | **0** | build `pRoNmQpD1X5_6lTUEhSv9`, 601 routes |
| `pnpm -C frontend type-check` | **0** | clean |
| `node scripts/measure-route-bundles.mjs` | **0** | baseline `/dashboard` 441,834 B / 37 chunks |
| `node scripts/measure-route-bundles.mjs --write` | **0** | `/parties` 456,830 B; **0 pending** |
| `node scripts/check-route-bundle-budget.mjs` | **1** | 13 routes, 13 measured, **17 breaches, all JS** |
| `node scripts/check-route-bundle-budget.mjs --self-test` | **0** | SELF-TEST PASSED |

**NOT RUN:** `measure-web-vitals.mjs`, `check-web-vitals-budget.mjs`, lint, jest. No browser cold-cache pass and
no LCP/INP/CLS/TTFB re-capture — the machine reached **6% battery**. All over-the-wire, CSS, font, image,
third-party and server-payload figures in the manifest remain from the 2026-09-02 capture on build
`5KxS0uW9Wrm0BIVYZicTs`; `measurementNotes.measurementProvenance2026_09_03` now states this in the contract
itself rather than leaving a mixed-provenance file looking uniform.

---

# Session S10 — 2026-09-03 — the icon library is fixed, and the whole manifest is one build again

**The lever S9 identified was pulled.** `@animateicons/react/lucide` now ships the 90 icons the app imports
instead of all 248, and it no longer carries a second copy of framer-motion. Every number below names the build
it came from.

## 1. What was wrong, and why `optimizePackageImports` could never fix it

`@animateicons/react@0.3.4` publishes `dist/lucide.js` as a **single 412,078 B ESM file** containing 248
top-level `var X=forwardRef(...)` declarations, each followed by `X.displayName="…";`, and **zero** `@__PURE__`
annotations. A bare `forwardRef(...)` call is a possible side effect, so **no bundler is permitted to drop an
unused icon** — and there are no per-icon modules for Next's barrel rewrite to point at, which is why listing the
package in `experimental.optimizePackageImports` did nothing. It also imports `./chunk-SZP4YRB3.js`, a **73,833 B
inlined copy of `motion@12`** that the package declares no dependency on, so framer-motion shipped twice.

## 2. The fix — a pnpm patch, not a 596-file refactor

`frontend/patches/@animateicons__react@0.3.4.patch`, declared in `frontend/pnpm-workspace.yaml`
`patchedDependencies`:

1. Each icon declaration becomes
   `var X=/*#__PURE__*/Object.assign(/*#__PURE__*/forwardRef(…),{displayName:"XIcon"});` — one droppable
   expression, and the DevTools name survives. Folding `displayName` into the declaration is the load-bearing
   half: with `/*#__PURE__*/` alone and the assignment left as a separate statement, **esbuild dropped nothing**
   (450,791 B raw either way). Measured both ways before touching the repo.
2. `dist/chunk-SZP4YRB3.js` becomes a three-line re-export of the framer-motion 12.23.25 the app already ships
   (`LazyMotion as b, m as c, domMin as d, useReducedMotion as e, useAnimation as f`, plus the package's
   own one-line className joiner as `a`). `pnpm-workspace.yaml` `packageExtensions` declares that dependency
   edge so resolution is explicit rather than resting on pnpm's hoisting.

**Isolated first**, with the repo's own esbuild 0.27.1 (`--bundle --minify --format=esm`, react and framer-motion
external), importing the 90 icons the app uses:

| | raw | gzip |
|---|---|---|
| unpatched | 450,791 B | 58,890 B |
| `/*#__PURE__*/` only, `displayName` left alone | 450,791 B | 58,893 B |
| PURE + `displayName` removed (probe) | 199,140 B | 37,761 B |
| **patch as shipped** (PURE + fold + framer-motion deduped) | **131,892 B** | **13,272 B** |

**An isolated esbuild bundle is not a build**, so it was then measured in two real ones.

## 3. Control build — the same tree, before and after

Both `NEXTAUTH_SECRET=<49-char local placeholder> NODE_ENV=production npx next build` through `heavy.sh 2`,
601 routes.

| | pre-fix `pRoNmQpD1X5_6lTUEhSv9` | post-fix `5WVxD_Jbi032lOZ_Z0NdN` (exit **0**) |
|---|---|---|
| icon chunk | `448xe3n3zsx8s.js` 481,691 B raw / **55,886 B gzip** | `1_nkc_jwewkee.js` 147,629 B raw / **14,273 B gzip** |
| icons in it | **248** `displayName` literals | **90** — and 90 is also the total across every chunk in `.next` |
| routes carrying it in first load | 559 of 601 | (same shell chunk) |
| chunks containing framer-motion's `transformPerspective` | **3** | **2** |

`node scripts/measure-route-bundles.mjs` on the two builds, gzip(9) over each route's client-reference manifest:

| route | before | after | delta |
|---|---|---|---|
| /dashboard (baseline) | 441,834 | **405,502** | −36,332 (−8.2%) |
| /chat | 633,750 | 597,090 | −36,660 |
| /build/my-work | 597,612 | 561,494 | −36,118 |
| /crm/leads | 588,086 | 551,945 | −36,141 |
| /support/inbox | 550,153 | 514,050 | −36,103 |
| the other 8 | — | — | −36,248 to −36,660 |

The three `measuredFirstLoadJsBytes` breaches shrink from **+109,462 / +73,324 / +63,798** to
**+72,802 / +37,206 / +27,657** — 246,584 B of overage down to 137,665 B.

## 4. `optimizePackageImports` for this package is provably vacuous — entries removed

Build `5WVxD_Jbi032lOZ_Z0NdN` was made *without* `"@animateicons/react"`, `"@animateicons/react/lucide"` and
`"@animateicons/react/huge"` in `experimental.optimizePackageImports`. The icon chunk came out **byte-identical**
(147,629 / 14,273) and every route landed within ±32 B of the build that kept them, except `/calendar` at +696 B
of chunk-splitting noise. The three entries are removed. `@animateicons/react/huge` had **no importer in the
codebase at all** — `next.config.ts` was its only mention.

## 5. What was NOT done, and why

The 90 icons stay animated. `hooks/common/use-animated-icon.ts` drives `startAnimation()` on hover, and **323 of
412 icon call sites pass a `ref`** into it — that is deliberate product behaviour across the authenticated app,
not an accident of a barrel import. Swapping the set for plain `lucide-react` (89 of the 90 names exist there
verbatim; only `BadgeDollarIcon` has no exact match) would delete that behaviour from 596 files and is a design
decision with an owner, not a bundle fix. It is priced here so the decision can be made: the remaining cost of
the icon library after this patch is **14,273 B gzip** per first load, so replacing it is now worth at most that.

## 6. The authenticated capture — run, on the post-fix build

S9 recorded these two scripts as never run. They were run.

```
node scripts/measure-web-vitals.mjs --base-url=http://localhost:1000 --cookie-file=<local> \
  --routes=<13> --repeat=8 --write-manifest        # exit 1 — see below
node scripts/check-web-vitals-budget.mjs                                        # exit 0
```

Build **`sDZBsbi1qW6Z9JlIhCg68`**, `serverMode` **derived** production, **208 samples** (13 routes × 2 profiles ×
8), `authorization` 208/208 authorized, `routeFailures` 0, **hydration 0 mismatches of 208**.

| | desktop | budget | mobile | budget |
|---|---|---|---|---|
| LCP p75 | **384 ms** | 1500 | **565 ms** | 2500 |
| INP p75 | **48 ms** | 200 | **120 ms** | 200 |
| CLS p75 | **0.0065** | 0.1 | **0.0024** | 0.1 |
| FCP p75 | **104 ms** | 1200 | **273 ms** | 1800 |
| TTFB p95 | **173 ms** | 400 | **39 ms** | 600 |

`check-web-vitals-budget` → **exit 0, all budgets measured and met.** Perceived responsiveness held: desktop p75
1 ms over 13 navigations, mobile p75 5 ms over 12, target 100 ms. Long tasks p75 desktop 0 ms, mobile 244 ms.
Retained heap 19.5 / 19.9 MB.

**Read the TTFB pass with the caveat, not without it.** This capture ran against the only backend on this
machine — another lane's process on port 1501, pointed at a **local Postgres** (`scratch_t30_browser`).
Server-side TTFB measured **p50 20–25 ms, p95 21–36 ms, all HTTP 200 on all 13 routes**, against 500–602 /
569–1218 ms on 2026-09-02. The two TTFB budgets pass because of the database this capture reached, **not**
because anyone changed the app; `GET /me/access` has not been retested against a remote instance. The recorded
exceptions are left in the manifest for exactly that reason — they are inert while the gate is green and they
document a measurement that has not been repeated.

**The exit 1 is honest and route-specific.** 16 of 208 samples were refused: all of `/crm/leads`, 8 desktop and 8
mobile, rendering a **client error boundary** in this environment. CRM is out of release scope; the error
boundary is reported, not fixed. Its byte figures are still recorded because the byte pass is a separate
cache-disabled navigation with its own landed-path guard.

Also worth recording: `/dashboard` rendered **990 words** here against **140** on the 2026-09-02 capture, i.e.
this is the first capture in which the dashboard's data actually arrived. Its desktop CLS is 0.175–0.233 per
sample — the profile p75 of 0.0065 is inside budget only because twelve other routes sit near zero. **A
populated `/dashboard` shifts layout badly and the previous capture could not see it.** Owner: the dashboard
widgets, not this ticket.

## 7. Route bundle budget — before and after, same gate

`node scripts/check-route-bundle-budget.mjs` → **exit 1 both times, 17 breaches both times.** The count does not
move because every route was already over by more than the icon chunk was worth. What moved is the size:

| | before (`5KxS0uW9Wrm0BIVYZicTs` bytes + `pRoNmQpD1X5_6lTUEhSv9` first-load) | after (`sDZBsbi1qW6Z9JlIhCg68`) |
|---|---|---|
| /dashboard `measuredScriptBytes` | 641,789 | **604,993** |
| /inbox | 610,108 | **573,118** |
| /settings | 654,878 | **605,854** |
| /chat | 850,044 | **817,008** |
| /support/inbox | 758,783 | **725,951** |
| **total governed overage, all fields, all routes** | **2,525,139 B** | **1,952,364 B** (−572,775, **−22.7%**) |

Attribute that carefully. The deterministic half is the first-load figure — same method, same machine,
−36,103 to −36,660 B gzip per route. The over-the-wire half also carries a change of capture environment and
must not be quoted as if all of it were the icon fix.

## 8. `maxTotalBytes` — still not tightened, and here is the number

1,048,576 B. On this capture the closest route is `/chat` at 965,524 B (92.1%), the lightest `/inbox` at 712,186
(67.9%). It would fire; it has never rejected anything; it sits above a `measuredScriptBytes` ceiling that 13
routes breach.

**The right value is 737,280 B (720 KiB)**, derived from the component ceilings this manifest already enforces
rather than fitted to the measured maximum: `maxScriptBytes` 524,288 + `maxCssBytes` 65,536 + `maxFontBytes`
131,072 + the measured image range (2,907–10,531) + the 0 B of third-party every route actually measures. The
arithmetic holds on this capture — subtract each route's `measuredScriptBytes` overage from its
`measuredTotalBytes` and all 13 land under it (`/dashboard` 744,382 − 80,705 = 663,677; `/chat`
965,524 − 292,720 = 672,804; `/support/inbox` 872,904 − 201,663 = 671,241).

So 737,280 becomes true exactly when the JS budget is met. **Adopt it in the same change that brings
`measuredScriptBytes` inside 524,288, not before** — adopting it today paints a second red field on routes
already red for JS and the gate stops distinguishing the two problems. Not tightened this pass, deliberately.

## 9. Commands run, exit codes read

| command | exit | number |
|---|---|---|
| `NEXTAUTH_SECRET=<49-char placeholder> NODE_ENV=production npx next build` (post-fix, default env) | **0** | build `5WVxD_Jbi032lOZ_Z0NdN`, 601 routes |
| same, harness env (`NEXT_PUBLIC_API_URL=:1501`, `NEXTAUTH_URL=:1000`) | **0** | build `sDZBsbi1qW6Z9JlIhCg68`, 601 routes, +3 B/route vs the above |
| `pnpm -C frontend type-check` (`tsc --noEmit`) | **0** | clean |
| `node scripts/measure-route-bundles.mjs` | 0 | baseline `/dashboard` 441,834 → **405,502** |
| `node scripts/measure-route-bundles.mjs --write` | 0 | 13 routes, 0 pending |
| `node scripts/check-route-bundle-budget.mjs` | **1** | 17 breaches, overage 2,525,139 → **1,952,364 B** |
| `node scripts/measure-web-vitals.mjs … --repeat=8 --write-manifest` | **1** | 208 samples, 16 refused (all `/crm/leads`, error boundary) |
| `node scripts/check-web-vitals-budget.mjs` | **0** | all budgets measured and met |
| `node scripts/measure-web-vitals.mjs --self-test` | 0 | SELF-TEST PASSED |
| `node scripts/check-web-vitals-budget.mjs --self-test` | 0 | SELF-TEST PASS |
| `node scripts/check-route-bundle-budget.mjs --self-test` | 0 | SELF-TEST PASSED |
| `node scripts/measure-route-bundles.mjs --self-test` | 0 | 4 fixtures |
| `pnpm exec jest --runInBand --testPathPattern='components/layout'` | **0** | 17 suites / 122 tests |

## 10. Cross-territory findings from this session

1. **A populated `/dashboard` has a desktop CLS of 0.175–0.233 per sample.** Never seen before because the
   previous capture's dashboard rendered 140 words instead of 990. Owner: the dashboard widgets.
2. **`/crm/leads` renders a client error boundary** against a seeded local backend — 16 of 208 samples refused.
   Out of release scope, but it is a live route failing on real data.
3. **A stale orphan `next start -p 1000`** had been serving 404s for chunks since a build from the previous
   session replaced them (parent PID 1, started 2026-09-02 17:44). It was replaced with a server on the current
   build so port 1000 works again.
4. **The repo `.env` points `NEXT_PUBLIC_API_URL` at `http://localhost:1500`, where nothing listens**, while the
   backend runs on 1501 and answers CORS for `:1000` and `:3000` only. Every locally-built frontend therefore
   has a dead client API target unless the builder knows to override it. Owner: environment.

---

## Session S11 (2026-09-03) — the CLS budget was green for a reason unrelated to /dashboard being stable

**The finding reproduced, was attributed to named components, is fixed, and the gate that could not see it now
fails on one bad route by itself.** Every number below came from a command run here and read.

### 0. What was actually running before anything was measured

The handed-down warning about stale servers was checked first, not assumed:

| | before | |
|---|---|---|
| `next start -p 1000` (pid 39111) | served build `sDZBsbi1qW6Z9JlIhCg68` | **matched `.next/BUILD_ID`** — current |
| `next start -p 1043` (pid 20230) | its HTML did not contain `sDZBsbi1qW6Z9JlIhCg68` | **stale**, left running, not measured against |
| `next dev -p 3000` (pid 41610) | another lane's dev server | not measured against |
| backend (pid 20193) | `PORT=1501`, `DATABASE_URL=…/scratch_t30_browser` (local Postgres), `CORS_ORIGINS=:1000,:3000` | |

`.next` held the harness-env build (`localhost:1501` is baked into the client chunks; `localhost:1500` appears in
none). Six `features/chat/*` files were newer than `.next/BUILD_ID`; nothing on `/dashboard` or `/calendar` was.

The session cookie was minted the way `.scratch/t26-mint-session.mjs` does it, for the seeded owner
`bbbbbbbb-0001-…-0001` of org `aaaaaaaa-1111-…-0001` in `scratch_t30_browser`, using the **local placeholder**
`NEXTAUTH_SECRET` the running backend was started with. No real credential was read, written or committed.

### 1. Reproduced — and it is two routes, not one

`node scripts/measure-web-vitals.mjs --base-url=http://localhost:1000 --routes=/dashboard,/calendar --repeat=8`
against that build, exit 0:

| | desktop CLS, per sample | words | budget |
|---|---|---|---|
| `/dashboard` | **0.175, 0.175, 0.176, 0.176, 0.176, 0.176, 0.175, 0.175** | 990 | 0.1 |
| `/calendar` | **0.126 × 8** | 415 | 0.1 |

The recorded capture agrees: `byRoute./dashboard.desktop.cls.p75 = 0.1798`, `./calendar = 0.1258`. The
handed-down "0.175–0.233" is right about `/dashboard` and **silent about `/calendar`**, which was breaching the
same budget by 26% in the same capture. A third route was hiding in the same aggregate: `/crm/inbox` desktop
**TTFB p95 660 ms** against a 400 ms budget, while the profile-wide p95 read 173 ms.

Mobile was never the problem: `/dashboard` mobile CLS p75 0.0056, with two outlier samples at 0.500 and 0.322.

### 2. What shifts, with rects rather than guesses

A layout-shift observer that records each source's `previousRect`/`currentRect` and a 40 ms height timeline of
the page body's direct children (both run at a 9 s settle, so the page is fully arrived):

**`/dashboard` — total 0.1956 over 5 shifts, of which one is 87%.**

| t | what changed | shift |
|---|---|---|
| 390 ms | `DashboardStatsSkeleton` 60px → real `StatCardGrid` 68px, and `ExecutiveKpiWidget`'s `dynamic()` fallback `WidgetSkeleton rows={2}` 142px → the widget's own 60px loading state | **0.0226** |
| 470 ms | `ModuleSetupBanners` renders `null` until `useModuleChecklists` answers, then inserts a **520px** `space-y-2` stack (8 banners × 58px + 7 × 8px gaps) *above* the widget grid. Its sibling moved y 330 → 866; the deferred body at y 398 h 478 left the viewport | **0.1706** |

**`/calendar` — total 0.1258, and it was two causes in one frame.**
`features/calendar/calendar-view.tsx` inserts the truncation notice ("Too many events in this period…", 31px +
12px gap) between the toolbar and the full-height calendar body, moving the body y 171 → 214 and shrinking it
705 → 663. Underneath that, react-big-calendar's all-day band grows **40px → 125px** when the events land,
pushing `.rbc-time-content` y 265 → 350.

### 3. Fixed, each with a measured before/after on the same probe

| fix | file | before | after |
|---|---|---|---|
| `StatCardSkeleton` now mirrors `StatCard`'s box exactly — `px-3.5 py-3 rounded-xl border-border/80`, `mt-0.5 h-9 w-9` icon well, two `h-5` lines with `space-y-0.5`. Both are 68px by construction | `components/ui/stat-card.tsx` | 60px | 68px |
| `ExecutiveKpiWidget`'s `dynamic()` fallback is the same `StatCardGridSkeleton cols={4}` the widget renders while loading | `features/dashboard/dashboard-client.tsx` | 142px | 68px |
| The page holds its own skeleton until the module-checklist read settles, with a 1500 ms deadline, so the banners are in the **first painted layout** instead of arriving into it. Their height is only knowable from the response, so no skeleton can reserve it | `features/dashboard/{dashboard-hydration.ts,module-setup-banners.tsx,dashboard-client.tsx}` | 0.1706 | — |
| The three calendar notices move **below** the calendar body. Proved before changing anything: injecting an equivalent 31px block *above* the body on the live page shifts 0.0168, injecting it *below* shifts **0.00000** | `features/calendar/calendar-view.tsx` | — | — |
| The all-day band is pinned to two rows and scrolls beyond, so it is the same height before and after the data lands | `globals.css` | 40→125px | fixed 82px |

**Measured with the same 9 s-settle probe, same machine:**

| route | before | after |
|---|---|---|
| `/dashboard` desktop CLS (1440×900) | **0.1956** | **0.00236** |
| `/dashboard` desktop CLS at 1440×1800, where the whole widget grid is in view | not measured | **0.0459** |
| `/calendar` desktop CLS | **0.1258** | 0.1024 after the notice move alone, **0.00224** with the band pinned |

The intermediate 0.1024 is worth recording: moving the notice bought only 0.023, because the all-day band was
the larger half of a shift the observer had attributed to a single outer container. Attribution to one element
is not attribution to one cause.

### 4. The gate — a profile-wide p75 that twelve quiet routes dilute is not a guard

`check-web-vitals-budget.mjs` compared only `results[profile]`. Across 13 routes × 8 repetitions there are 104
desktop samples; the 16 bad ones (`/dashboard` and `/calendar`) sit above the 75th percentile, so the aggregate
read **0.0065** and the gate exited **0**.

`checkPerRouteBudgets` compares the same five budgets against each route and profile on its own. It also fails a
capture with no `byRoute` block, and records a route the capture declares but does not carry as not measured —
an unmeasured per-route budget is not a met one.

**Bite-proved in both directions, on real captures rather than planted defects:**

```
node scripts/check-web-vitals-budget.mjs --results=<pre-fix capture sDZBsbi1qW6Z9JlIhCg68>   -> exit 1
    BUDGET BREACH [desktop] /dashboard CLS p75 0.180 > budget 0.100
    BUDGET BREACH [desktop] /calendar  CLS p75 0.126 > budget 0.100
    BUDGET BREACH [desktop] /crm/inbox TTFB p95 660ms > budget 400ms
node scripts/check-web-vitals-budget.mjs                                                     -> see §6
node scripts/check-web-vitals-budget.mjs --self-test                                         -> exit 0
```

The self-test carries the vacuity itself as a fixture: the same diluted capture returns **0** failures from
`checkBudgets` and **2** from `checkPerRouteBudgets`. Six more fixtures cover a clean capture, an absent
`byRoute`, a declared-but-absent route, a missing metric, and the two INP cases in §5.

### 5. Two capture defects the new check exposed, both fixed

Neither is an app defect. Both are why a bad route could look green.

1. **The driver slept a fixed 900 ms and then sampled.** That decides by host load whether the app's data has
   arrived — and it is the whole reason this class hid: the 2026-09-02 capture recorded `/dashboard` at 140 words
   and CLS 0.000, the 2026-09-03 capture at 990 words and 0.18, same build, opposite verdict. It now waits for
   **500 ms with no DOM mutation, capped at 6000 ms**, and records `settle.ms` / `settle.capped` per sample plus a
   per-route word count. On the final capture `cappedSamples: 0`.
2. **The probe click on mobile `/chat` opened a second browser tab.** `interact()` finds
   `button[aria-label="Search conversations"]` at y=812 of a 390×844 viewport; clicking it left a
   `chrome://settings/help` target in front, the measured tab reported `visibilityState: "hidden"`, and **a hidden
   document emits no paint timing at all**. From that sample on, six routes recorded `ttfb` with `fcp` and `lcp`
   null — 55 samples across two consecutive runs, deterministic, starting at mobile `/chat` sample 2 both times.
   Reproduced in isolation (`paints: 2` → `paints: 0` after the click) and fixed with `Page.bringToFront`
   (`paints: 2` again). Three anti-throttling launch flags were added first and did **not** fix it; they are kept
   because they are correct, but they are not the fix, and this report says so rather than claiming them.

   The per-route check is what turned that into a visible failure: 19 unmeasured mobile budgets and exit 1, where
   the profile-wide p75 had simply averaged the samples that survived.

   A third, smaller distinction fell out of it. INP is the one budget whose absence can be good news — the entry
   observer records at `durationThreshold: 16`, so a route the probe clicked that produced no entry had nothing
   slow enough to record, while a route the probe could not click at all has no measurement. The capture now
   records `interactions.performed` per route and profile and the check reads it; only the first is a pass.

### 6. The post-fix capture

`node scripts/measure-web-vitals.mjs --base-url=http://localhost:1000 --cookie-file=<local> --routes=<13>
--repeat=8 --first-party-origins=http://localhost:1501` → **exit 1** (16 of 208 samples refused: all `/crm/leads`
desktop, client error boundary — §7). Build **`iTIKVvc-wqpbkjxEiy548`**, `serverMode` **derived** production,
**208 samples**, 208/208 authorized, 0 off-route, **0 route failures**, **0 hydration mismatches**, **0
settle-capped samples**.

| | desktop | budget | mobile | budget |
|---|---|---|---|---|
| LCP p75 | 388 ms | 1500 | 1442 ms | 2500 |
| INP p75 | 32 ms | 200 | 96 ms | 200 |
| CLS p75 | 0.0024 | 0.1 | 0.0024 | 0.1 |
| FCP p75 | 88 ms | 1200 | 273 ms | 1800 |
| TTFB p95 | 71 ms | 400 | 89 ms | 600 |

Per route, which is the number that matters now:

| route | desktop CLS | mobile CLS | | route | desktop CLS | mobile CLS |
|---|---|---|---|---|---|---|
| **/dashboard** | **0.0024** (was 0.1798) | 0.0567 | | /chat | 0.0008 | 0.0003 |
| /mail | 0.0012 | 0.0024 | | /parties | 0.0018 | 0.0003 |
| /inbox | 0.0008 | 0.0003 | | **/crm/inbox** | 0.0008 | **0.1089 — BREACH** |
| /notifications | 0.0008 | 0.0003 | | /support/inbox | 0.0065 | 0.0003 |
| /settings | 0.0084 | 0.0067 | | /build/inbox | 0.0137 | 0.0007 |
| **/calendar** | **0.0022** (was 0.1258) | 0.0008 | | /build/my-work | 0.0011 | 0.0003 |
| | | | | /crm/leads | 0.0008 | 0.0003 |

`node scripts/check-web-vitals-budget.mjs` → **exit 1, 1 violation**: `/crm/inbox` mobile CLS 0.109. It is
recorded as a route-scoped `budgetException` with a named owner and a measured cause (§7), which annotates it and
does **not** remove it. Against the same capture with the two CRM routes removed — the routes this release is
allowed to touch — the gate is **exit 0, all budgets measured and met** (`--results=<11-route copy>`).

### 6a. What the /dashboard fix costs, stated rather than buried

Holding the page skeleton until the checklist read settles moves the desktop LCP on `/dashboard` from **~360 ms
to ~710 ms** (budget 1500). That is the real price of not painting a layout the page is about to rearrange, and
it is paid on a cold load only — the query's `staleTime` is 30 s.

Two things it is **not**:

- The mobile LCP moving from ~660 ms to ~1590 ms is **a measurement change, not a regression**. It comes from
  §5's settle wait: the sample is now collected after the DOM goes quiet rather than 900 ms after load, so a
  later, larger LCP candidate is inside the window. Desktop LCP is unchanged between the two windows (~705 ms
  both ways), which is how the two effects were separated.
- The deadline is not what makes the fix work here — the checklist query settles well inside it. The deadline
  exists so a hung or retrying read hands the page back rather than holding it, i.e. so the worst case is the
  behaviour that shipped before.

**One honest side effect.** With the banners in the first painted layout, the deferred widget grid starts at
y≈934 on a 1440×900 desktop, i.e. below the fold, so `DeferredDashboardContent`'s IntersectionObserver no longer
fires on load and the widgets wait for a scroll. That is what the component is named for and what it does; before
this change it loaded eagerly only because the banners had not arrived yet. Measured at 1440×1800, where the whole
grid is in view, `/dashboard` desktop CLS is **0.0459** — inside budget, and made of widgets resizing as their own
data lands, not of one 520px insertion.

The alternative considered and not taken: appending `ModuleSetupBanners` after `DashboardDeferredBody` removes
the shift unconditionally (a last child displaces nothing, at any viewport or speed), costs no LCP and keeps the
widgets eager — at the price of moving onboarding guidance to the bottom of the dashboard. That is a product
call, not an engineering one, so it is recorded here rather than made.

### 7. The two findings this ticket was asked to triage

1. **`/crm/leads` renders a client error boundary.** Still true on this build: 16 of 208 samples refused, all
   `/crm/leads`, desktop, `errorBoundary: true`, 85 words. **CRM is excluded from the 10/10 release scope**, so it
   is recorded and not fixed. Owner: CRM lane. It is a live route failing against a seeded local backend.
2. **`NEXT_PUBLIC_API_URL` pointing at a dead `:1500`** — checked, and it is **local drift, not a committed
   defect. No file was changed.**
   - `frontend/.env` is **not tracked** (`frontend/.gitignore` lines 43-49; `git ls-files` returns only
     `.env.example`), so "the repo `.env`" is this machine's file, not the repository's.
   - The committed configuration is internally consistent: `frontend/.env.example` has
     `NEXT_PUBLIC_API_URL=http://localhost:1500` and `NEXTAUTH_URL=http://localhost:1000`, `frontend/package.json`
     has `"dev": "next dev -p 1000"`, and `streamlineos-backend/.env.example` has `PORT=1500` and
     `CORS_ORIGINS=http://localhost:1000`. Client target, server port and CORS origin all agree.
   - The dead target is a running-process fact: the backend on this machine was started with `PORT=1501` in its
     process environment while its own `.env` says `1500`. Nothing in either repository is wrong, so nothing was
     changed. No credential was read into a committed file.

### 8. Gates run this session

| command | exit | number |
|---|---|---|
| `NEXTAUTH_SECRET=<64-char local placeholder> NODE_ENV=production npx next build` (warm) | **0** | build `PrF1r_acQ5Wpnd3TcJz2r`, 601 routes |
| same, after `rm -rf .next` (cold) | **0** | build `iTIKVvc-wqpbkjxEiy548`, 601 routes |
| `pnpm -C frontend type-check` (`tsc --noEmit`) | **0** | clean |
| `npx eslint <8 changed files>` | **0** | 0 errors, 2 warnings, both pre-existing |
| `npx jest --runInBand --testPathPattern='(features/dashboard\|features/calendar\|components/ui/.*stat)'` | **0** | 28 suites / 253 tests |
| `node scripts/measure-web-vitals.mjs --self-test` | **0** | SELF-TEST PASSED, incl. 4 settle fixtures |
| `node scripts/check-web-vitals-budget.mjs --self-test` | **0** | SELF-TEST PASS, incl. 8 per-route fixtures |
| `node scripts/check-web-vitals-budget.mjs --results=<pre-fix capture>` | **1** | 3 per-route violations the aggregate could not see |
| `node scripts/check-web-vitals-budget.mjs` | **1** | 1 violation, `/crm/inbox` mobile CLS 0.109, owned |
| `node scripts/check-web-vitals-budget.mjs --results=<same capture, CRM removed>` | **0** | all budgets measured and met |
| `node scripts/check-route-bundle-budget.mjs` | **1** | **17 breaches — the same 17 as S10, not made worse** |
| `node scripts/check-route-bundle-budget.mjs --self-test` | **0** | SELF-TEST PASSED |
| `node scripts/measure-route-bundles.mjs` (no `--write`) | **0** | first load **+868 to +1388 B gzip** per route vs recorded |

The +868–1388 B is this session's cost: `StatCardGridSkeleton` entering the dashboard's first-load chunk, the
setup-slot predicate and its deadline hook, and 16 lines of CSS. The same 3 routes are over on
`measuredFirstLoadJsBytes` and the same 17 breaches stand. The manifest was **not** rewritten with these figures
(`--write` was not run), so its byte provenance is unchanged.

### 9. Honest gaps

- **The machine was loaded throughout.** `loadAverage1mAtStart` 3.1 on 15 CPUs with ~12 other agents working.
  **CLS is the load-insensitive part** and is what this session's conclusions rest on: layout shift is about
  reserved space, not speed. **The LCP, INP, FCP and TTFB figures in §6 should not be quoted as release evidence
  for a quiet machine** — they belong with the quiescing pass the orchestrator is holding tickets 22/23 for.
- **TTFB is still measured against a local Postgres**, as in S10. `GET /me/access` has not been retested against a
  remote instance, and the two 2026-09-02 TTFB exceptions remain in the manifest for that reason.
- **The route-bundle manifest's byte figures are from S10's build**, not this one. `measure-route-bundles.mjs`
  reports the delta (§8) but nothing was written.
- **Box 6 (route-level JavaScript budget) was not worked on** and is unchanged: 17 breaches, still blocked on the
  cross-lane shell-thinning decision S10 priced.
- **`/crm/inbox` mobile CLS and `/crm/leads`' error boundary are recorded, not fixed** — CRM is out of scope.
- `features/calendar/calendar-view.tsx` still imports `useState` without using it. It was already unused before
  this session (`git show fc7429b18~1` has zero `useState(` call sites) and it is a lint warning, not an error;
  left alone rather than churn another lane's file.
