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
