# Ticket 26 — Web Vitals budgets on a production build

**1 of 7 boxes closed. 6 open.** Every number below came from a command I ran and read; the
command and its exit code are named beside it.

**The headline is not a fix. It is that the six breached numbers this ticket was handed cannot be
reproduced as product evidence, because on this machine the app never renders the product.** The
production build now works, the capture is real, and the capture *refuses itself* — which is the
correct outcome and the thing that had been missing.

---

## 1. `next build` — the wall is real, and it is one line

**It is not `/billing/ai-credits`.** That route does not exist (it is `/settings/billing/ai-credits`,
and platform billing is exactly two Settings pages per root CLAUDE.md §8). The build dies at
whichever route's page data is collected first — on HEAD that is `/forms/[token]` — and the cause is
the same for all 601 routes because the throw is in the **root layout**:

```
[env] Validation failed:
  NEXTAUTH_SECRET: In production, NEXTAUTH_SECRET must be at least 44 characters (256-bit base64)
Error: Failed to collect configuration for /forms/[token]
  [cause]: Error: Missing or invalid required environment variables
      at module evaluation (lib/env.ts:40:11)
      at module evaluation (app/layout.tsx:120:1)
```

`app/layout.tsx:6` does `import "../lib/env"`, and `lib/env.ts:39-40` throws when
`NODE_ENV === "production"`. `frontend/.env` carries a **36-character** `NEXTAUTH_SECRET`; the schema
demands 44. That is the entire wall.

**Reproduced:** `npx next build` on a clean `git archive HEAD` tree with the repo's own `.env` →
**exit 1**, log `build2-wall.log`.
**Cleared:** the same tree with `.env.production.local` supplying a 52-character local placeholder
(`local-capture-placeholder-not-a-real-secret-00000000` — a placeholder, never a credential, never
written into the repository) → `npx next build` **exit 0**, build id `5KxS0uW9Wrm0BIVYZicTs`,
601 routes, `log build3-capture.log`.

Two smaller findings from the same runs:

- A build against the **shared working tree** failed earlier at `Running TypeScript` with **38
  errors** in `lib/api-envelope` consumers (tickets 28/34 mid-refactor). Not mine, and gone by the
  end of the session — `pnpm type-check` through the mutex now exits **0** with **0** errors.
  I built from `git archive HEAD` (65b99a49b) **plus this ticket's own changed files** so the
  capture is of a known commit and not of 43 files of other agents' in-flight work. Ticket 27's
  `DataTable` row-loss fix is committed at HEAD (3c2e354fb) and **is** in this build.
- Turbopack refuses a `node_modules` symlink that leaves the project root
  (`TurbopackInternalError: Symlink [project]/node_modules is invalid`). An APFS clone
  (`cp -Rc`, 18 s, 1.2 GB logical) is the working way to build an out-of-tree copy.

**For ticket 27:** yes — production build plus real-browser capture both work now. Method, ports and
env are in this report; `memory`, `longTasks` and `hydration` are recorded below.

---

## 2. The capture, and why it refuses itself

`node scripts/measure-web-vitals.mjs --base-url=http://localhost:1002 --routes=/mail,/inbox,/dashboard --repeat=12 …`
→ **exit 1**, 72 samples, `serverMode: "production"`, build id matches `.next/BUILD_ID`.

It refuses. `72/72` samples rendered **3 words**. The reason is not the frontend:

| Leg | Measured | How |
|---|---|---|
| Backend `/auth/session-exchange` | **503** before, **401** after | `NEXTAUTH_SECRET` is absent from `streamlineos-backend/.env`, so the endpoint short-circuits; with it supplied the synthetic identity is not an active account in the shared Neon database |
| Therefore `session.backendJwt` | `undefined` | `lib/auth.ts:238-252` |
| Therefore `serverGet("/me/access")` | throws `UNAUTHENTICATED` | `lib/server-fetch.ts:45-48` |
| Therefore `getServerAccess()` | returns `DENIED` | `lib/rbac/get-server-access.ts` |
| Therefore the shell | paints its access-failure state, then `lib/api-client.ts:181` calls `signOut()` | — |

**No Web Vitals capture of an authenticated route is possible on this machine as configured.** That
is an infrastructure blocker, not a frontend defect, and it applies to the six numbers this ticket
was handed as much as to mine.

### Three ways the old driver would have recorded that failure as a good page

All three are now closed, all three are self-tested, and the first two are almost certainly how
earlier numbers came about.

1. **The shell's own error card was invisible to it.** `errorBoundary` matched only
   `"Something went wrong"`. The shell's access-failure copy is **`"Couldn't load your organization"`**
   (`components/layout/dashboard-shell.tsx:183`), so the error card passed the content assertion and
   its LCP would have been filed as the route's. Fixed: `SHELL_FAILURE_COPY` covers every string the
   shell can paint instead of the app.
2. **A sample measured on `/signin` was recorded as `/mail`.** Nothing compared the landed URL to the
   requested route. Because the app signs itself out on one refused `/me/access`, every navigation
   after the first landed on `/signin` — which paints in **5 ms TTFB / 48 ms FCP** and would have been
   recorded as an excellent `/mail`. I watched this happen: `[desktop] /mail 2/12 ttfb=9 fcp=68 …
   words=108`. Fixed: `findOffRouteSamples` refuses it, the session cookie is re-set before every
   navigation, and an off-route sample is re-measured up to 3 times before it fails the run.
3. **An unauthorized shell counted as a measurement.** Fixed: `findUnauthorizedSamples` requires ≥3
   distinct in-app nav links and refuses the run otherwise.

The byte pass got the same guard: 4 of 9 byte-only routes landed on `/signin` and were **DISCARDED**
rather than recorded as that route's bytes.

---

## 3. TTFB — measured, attributed, and not the frontend's

This is the one place the ticket asked for a decomposition, so here it is. Same production server,
same machine, same minute:

| What | TTFB | Method |
|---|---|---|
| `/` (public landing) | **9–13 ms** | `curl`, 3 runs |
| `/signin` (public) | **5–18 ms** | `curl`, 3 runs |
| `/dashboard` (authenticated) | **1 420 / 1 495 / 1 728 ms** p50/p75/p95 | plain Node `fetch` to first body byte, 12 runs, all HTTP 200 |
| `/mail` | **1 427 / 1 495 / 1 704 ms** | same |
| `/inbox` | **1 419 / 1 590 / 1 637 ms** | same |
| backend `GET /auth/session-data/:userId` | **588, 593, 757 ms** (three runs) | `curl`, direct to `:1500` |
| backend `GET /health` (no DB) | **0.8–1.0 ms** (three runs) | `curl`, direct to `:1500` |

The whole gap between 9 ms and 1 450 ms is one backend call. `lib/auth.ts`'s `session()` callback
calls `fetchSessionDataCached` on **every server render of every authenticated route**, and
`lib/auth-session.ts:126` retries it **twice** on a non-2xx. The backend spends that time on the
shared Neon instance in **ap-southeast-1** (its own logs show `db.query.execute latencyMs: 101-127`
per query).

**There is nothing in the bundle, the route composition or the render in this number**, and the
proof is that the same server, same build, same process returns 242 kB of landing-page HTML in 9 ms.
This is why FCP and LCP breach too: neither can precede TTFB.

I did not warm a cache to hide it — every measured navigation ran after a discarded warm-up, all
twelve returned 200, and the run is recorded at host load 3.76 → 8.06 of 15 CPUs.

### Localhost variance, acknowledged rather than used

Loopback removes real network time, so **these figures understate production**, they do not
overstate it. The mobile profile adds 150 ms of emulated RTT, which is why browser mobile TTFB
(p95 1 804 ms) exceeds the unthrottled server figure (p95 1 728 ms) by roughly that much — the
emulation accounts for ~8 % of a 1.8 s number, not for the breach. The p95 comes from **12**
repetitions per route per profile, raised from the 5 the ticket was handed; at n=5 a p95 is the
largest of five samples and is not a percentile in any useful sense.

---

## 4. The six breaches, re-measured

Production build, real browser, 12 repetitions, `.browser-driver-results.json`.
**Read these as a floor:** they were measured on a shell that paints an access-failure state, which
paints *less* than the product, so the real numbers are worse.

| Profile | Metric | Budget | Handed to me | This capture | Verdict |
|---|---|---|---|---|---|
| mobile | INP p75 | 200 ms | 392 ms | **not measured** | no interactive control existed to click |
| mobile | FCP p75 | 1 800 ms | 2 188 ms | 1 742 ms | inside, on an almost-empty page |
| mobile | TTFB p95 | 600 ms | 2 641 ms | **1 804 ms** | BREACH ×3.0 |
| desktop | LCP p75 | 1 500 ms | 2 578 ms | **1 685 ms** | BREACH ×1.1 |
| desktop | FCP p75 | 1 200 ms | 2 432 ms | **1 564 ms** | BREACH ×1.3 |
| desktop | TTFB p95 | 400 ms | 2 946 ms | **1 761 ms** | BREACH ×4.4 |

CLS is **0.000** on both profiles across all 72 navigations — the one budget that is genuinely and
comfortably met, though also on a thin page.

`node scripts/check-web-vitals-budget.mjs` → **exit 1**, 4 violations, 2 not measured.

Each breach now prints its owner. Exceptions live in `contracts/route-bundle-manifest.json`
under `budgetExceptions`; they are **annotation only** — the gate still exits non-zero, and its
self-test asserts that annotation never reduces the failure count.

| Breach | Owner recorded | Reason |
|---|---|---|
| mobile + desktop TTFB p95 | `streamlineos-backend` — auth session-data seam | one backend round trip per render, measured at 588–757 ms, issued twice on a non-2xx |
| desktop LCP p75, mobile + desktop FCP p75 | same | cannot precede TTFB; not separately actionable until TTFB closes |
| mobile INP p75 | unassigned — **no measurement exists** | claims nothing; the gate still reports it unmeasured |

---

## 5. Route-level budgets — coverage 6 → 12 routes, and the JS budget now governs the right number

**`check:route-bundle-budget` was already failing when I arrived.** The brief said it passed at 5
routes; it did not. `node scripts/check-route-bundle-budget.mjs` → **exit 1**, 6 routes,
**5 breaches**, all `measuredImageBytes` against a declared ceiling of `0`. That declaration said
"this route ships no image", and measurement contradicted it: the shell paints `public/logo.svg`.
Corrected to **8 192 B** with the reason recorded in the manifest.

**The bigger problem: the JS budget was green on a number that is not what users download.**

| Route | `measuredFirstLoadJsBytes` (governed) | Actually downloaded, cold cache |
|---|---|---|
| /dashboard | 440 065 | **640 260** |
| /mail | 460 579 | **662 358** |
| /chat | 625 601 | **846 197** |

`measuredFirstLoadJsBytes` is gzip(9) over the chunks in the route's client-reference manifest;
the browser also fetches everything hydration then asks for. Added `measuredScriptBytes` and
`measuredTotalBytes` (over-the-wire, cold cache) to the manifest, to `MEASURED_PAIRS` in the gate,
and to both self-tests — including a fixture where a route inside its chunk-manifest ceiling still
fails on downloaded bytes.

Coverage went **6 → 12** routes, chosen to include the heaviest surfaces in the build. New routes
inherit the declared defaults rather than a ceiling shaped around their current size.

`node scripts/check-route-bundle-budget.mjs` → **exit 1**, 12 routes, 12 measured, 0 pending,
**12 breaches**: 7 × `measuredScriptBytes`, 3 × `measuredFirstLoadJsBytes` (`/chat` +101 kB,
`/build/my-work` +68 kB, `/crm/leads` +60 kB), 1 × `measuredPageChunkBytes` (`/chat` +20 kB),
**0 × image, 0 × CSS, 0 × font, 0 × third-party, 0 × server payload**.

CSS is **58 189 B** and fonts **55 206 B** on every route, both inside ceiling; third-party is **0**
once the app's own API origin is classified as first party (see §7); server payload is 10–13 kB
against a 40 kB ceiling. The 4 routes whose byte pass was discarded carry `null` for every
over-the-wire field — the stale values from an earlier capture were cleared rather than left to read
as a measurement.

### Correction to a P1 this ticket was asked to carry

Ticket 27 relayed that `ably` is eagerly reachable from 27 routes. **That does not reproduce at
HEAD.** Scanning every first-load chunk of the production build for `Ably.Realtime|ably-js|io.ably`:

| Route | ably in first load |
|---|---|
| /dashboard, /mail, /inbox | **absent** |
| /chat | present — 208 kB raw / 58 kB gzip, its own realtime client |

The largest identifiable library that *is* in every authenticated first load is **framer-motion**
(224 kB raw / 71 kB gzip on `/dashboard`), imported by **278** files across `app/`, `components/`
and `features/`. It is not a missing lazy boundary; it is the shared shell, and the public landing's
animations depend on it — see §8.

---

## 6. Memory, long tasks and hydration — carried for ticket 27

Not measurable in jsdom; measured here on the production build in a real browser, 72 navigations.

| Metric | Desktop p75 | Mobile p75 |
|---|---|---|
| `usedJSHeapSize` | **269 MB** (/dashboard) – 280 MB (/inbox) | **268–283 MB** |
| Long tasks, total per navigation | **0 ms** | **50–74 ms** |
| React hydration mismatches | **0 of 72** | — |

**Hydration is clean** — 0 mismatches across 72 production navigations on both profiles, read from
the console via CDP, with the detector's negative control in the self-test.

**~270 MB of JS heap for a page that renders three words is the finding here.** Long tasks are near
zero only because the app never got far enough to do the work; treat that row as a floor, not a
pass.

---

## 7. What I changed

**`next.config.ts`** — `public/` assets were served `Cache-Control: public, max-age=0`, so the shell
re-requested `logo.svg` on every navigation (twice per cold load: loading screen and header).
Now 1 day for the brand marks and the vendored widget, 7 days for `illustrations/` and `icons/`,
both with `stale-while-revalidate`. Verified live: `max-age=0` → `max-age=86400` on `:1002`,
against `max-age=0` still on the pre-change server on `:1000`. `sw.js` deliberately excluded — a
service worker must stay revalidated.

**`scripts/measure-web-vitals.mjs`** — the three refusals in §2, plus:
- **Server-side TTFB isolation** (`measureServerTtfb`): the same request from Node, unthrottled, so
  a TTFB breach can be attributed to the server rather than argued about. This produced §3.
- **Perceived-responsiveness probe** (`measureIntentToFeedback`): in-page click on a nav link timed
  to the first DOM mutation on the same clock. It ran and honestly reported *not measured* — the
  shell had no in-app link. Mechanism landed, number not obtained.
- **First-party origins now default from `frontend/.env`.** Previously `NEXT_PUBLIC_API_URL` was
  read from a shell variable nobody exports, so **every call to the app's own API was counted as
  third-party bytes**. The capture records `["http://localhost:1002","http://localhost:1500"]` and
  third-party bytes are now 0 — correct, since `NEXT_PUBLIC_GTM_ID` and `NEXT_PUBLIC_CLARITY_ID` are
  both empty.
- `measuredScriptBytes` / `measuredTotalBytes` folded into the manifest.
- Default repetitions **5 → 10**; this run used 12.
- The manifest write now happens **before** the refusals, so a valid byte pass is not lost to a
  vitals refusal.

**`scripts/check-web-vitals-budget.mjs`** — owner-annotated exceptions, annotation-only by
construction, with a self-test that fails if annotation ever removes a failure.

**`scripts/check-route-bundle-budget.mjs`** — governs over-the-wire script and total bytes.

**`contracts/route-bundle-manifest.json`** — 12 routes; honest image ceiling; `budgetExceptions`;
and the `notes` field corrected. It claimed *"Measured with Lighthouse 12 in CI using the Chrome
DevTools Protocol"*. **Nothing in this repository runs Lighthouse, and there is no CI job that
produces these numbers.** It now names the script that does.

**`.browser-driver-results.json`** — replaced with this capture.

---

## 8. Escalations

**The frozen public landing does not block any agreed target** — box 7 is the one box I can close
cleanly. Nothing under `app/(public)/**`, `features/marketing/**` or any landing animation was
touched; the only public-facing change is a cache header, which alters no pixel. The landing renders
in 9 ms TTFB and is not on the authenticated critical path.

It does, however, **pin framer-motion into the shared bundle**. If a future ticket proposes dropping
framer-motion to cut the 224 kB raw / 71 kB gzip it contributes to every authenticated first load,
that is a product decision about the landing animations, not a refactor — escalating it rather than
working around it, as the PRD requires.

**Three things I could not fix because they are not mine:**

1. **`streamlineos-backend/.env` has no `NEXTAUTH_SECRET`**, so `/auth/session-exchange` returns
   503 unconditionally and no local frontend can ever obtain a backend JWT. Nobody can measure an
   authenticated route on this machine until that is fixed and a real seeded identity exists.
   *Owner: backend / environment.*
2. **`lib/auth.ts` + `lib/auth-session.ts`** put a backend round trip on every authenticated server
   render and retry it twice on failure. This is the whole TTFB breach. *Owner: ticket 28.*
3. **`lib/api-client.ts:181` calls `signOut()` on any 401**, including a transient one, which logs
   the user out of the whole app. It is why a browser session cannot survive a single failed
   `/me/access`. *Owner: ticket 28.*

**Worth its own ticket:** `components/feedbucket/feedbucket-embed.tsx` loads a **197 kB** local
widget at `strategy="afterInteractive"` on every authenticated page — inside the interaction window
that INP measures. `lazyOnload` is a one-word change; I did not make it because
`components/feedbucket/` is not my territory and I have no INP measurement to justify it with.

---

## 9. Gates run (exit codes read)

| Command | Exit | Result |
|---|---|---|
| `pnpm check:web-vitals-budget:self-test` | **0** | 6 fixture breaches detected; unmeasured budget not reported as met; exception annotates without removing |
| `pnpm check:route-bundle-budget:self-test` | **0** | 5 fixtures incl. the new over-the-wire case |
| `pnpm measure:web-vitals:self-test` | **0** | **31** fixtures |
| `pnpm measure:route-bundles:self-test` | **0** | 4 fixtures |
| `pnpm check:web-vitals-budget` | **1** | 4 breaches, 2 not measured — **red, correctly** |
| `pnpm check:route-bundle-budget` | **1** | 12 routes, 12 measured, 0 pending, 12 breaches — **red, correctly** |
| `pnpm type-check` (via `heavy.sh`) | **0** | 0 errors |
| `npx next build` (repo `.env`) | **1** | the wall, reproduced |
| `npx next build` (placeholder secret) | **0** | 601 routes, build id `5KxS0uW9Wrm0BIVYZicTs` |
| `node scripts/measure-web-vitals.mjs … --repeat=12` | **1** | refused as evidence — **correctly** |

Lint and jest: **not run.**

## 10. Reproducing this

```
git archive HEAD frontend | tar -x -C <scratch>          # Turbopack rejects an out-of-tree symlink
cp -Rc frontend/node_modules <scratch>/frontend/node_modules
echo 'NEXTAUTH_SECRET=<>=44 chars, placeholder>' > <scratch>/frontend/.env.production.local
echo 'NEXTAUTH_URL=http://localhost:1002'      >> <scratch>/frontend/.env.production.local
npx next build && npx next start -p 1002
NEXTAUTH_SECRET=<same> CORS_ORIGINS=http://localhost:1002 \
  node --max-old-space-size=6144 --env-file=.env <backend>/node_modules/@nestjs/cli/bin/nest.js start --builder swc
NEXTAUTH_SECRET=<same> SEED_USER_ID=… node frontend/.scratch/mint-session.mjs > cookie.txt
node scripts/measure-web-vitals.mjs --base-url=http://localhost:1002 --cookie-file=cookie.txt \
  --routes=/mail,/inbox,/dashboard --repeat=12 --write-manifest
```

It will refuse until `SEED_USER_ID` names an active account in the target database **and** the
backend has `NEXTAUTH_SECRET`. That refusal is the feature.
