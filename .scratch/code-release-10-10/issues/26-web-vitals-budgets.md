# 26 — Fix the six breached Web Vitals budgets on a production build

**What to build:** A production-mode capture currently breaches six of its own budgets: mobile INP, FCP and TTFB, and desktop LCP, FCP and TTFB. These are the project's own budgets measured the project's own way, so they are real. Close them and re-measure.

**Blocked by:** 25 — route composition drives most of these numbers, so measuring before the thinning lands wastes the run. (25 is done; this is no longer a blocker.)

**Status:** 6 of 7 closed. **S11 (2026-09-03) reopened and re-closed box 1 on a non-vacuous measurement.** The CLS
budget had been green for a reason unrelated to `/dashboard` being stable: the gate compared only the profile-wide
p75, which twelve near-zero routes diluted to 0.0065 while a populated `/dashboard` measured 0.175-0.176 per sample
and `/calendar` 0.126. Both are fixed (0.0024 / 0.0022 on cold build `iTIKVvc-wqpbkjxEiy548`) and the gate now
judges every route separately, so one bad route fails by itself; it exits 1 today on `/crm/inbox` mobile CLS 0.109,
which is out of release scope and carries a named owner. Box 6 is untouched and unchanged. Previous status follows. Box 6 still open, but for a smaller reason than before. Session S10 (2026-09-03) pulled the
lever S9 identified: `@animateicons/react/lucide` is patched to tree-shake and to stop vendoring a second framer-motion, so
it ships **90 icons (147,629 B raw / 14,273 B gzip)** instead of **248 (481,691 / 55,886)**. Every governed route lost
36,103-36,660 B gzip of first load, and the total governed overage fell **2,525,139 -> 1,952,364 B (-22.7%)** — the breach
COUNT stays 17 because every route was already over by more than the icon chunk was worth. The two Web Vitals scripts that
had never been run were run: `check-web-vitals-budget.mjs` is now **exit 0, all budgets measured and met** on a 208-sample
authenticated capture of build `sDZBsbi1qW6Z9JlIhCg68` — read the TTFB pass with the caveat in S10, it ran against a local
Postgres. Previous status follows. Re-measured 2026-09-03 on a COMPLETED production build
`pRoNmQpD1X5_6lTUEhSv9` (exit 0, 601 routes). Box 6 still open and still blocked on a cross-lane decision, but the
recorded cause is corrected a second time: the largest identifiable library in the authenticated shell is
**`@animateicons/react/lucide` (481,691 B raw / 55,869 B gzip, 559 of 601 routes, 248 icons shipped for 90 used)**,
not framer-motion (95,216 B / 30,554 B gzip). Replacing framer-motion is worth **~40 kB gzip**, measured, against a
smallest open overage of 59,598 B. Original status follows: 6 of 7 closed. Four of the six breached metrics are inside budget on a real authenticated production
capture (192 samples, 0 refused); the last box is **BLOCKED on a cross-lane engineering decision**, re-measured at
head 2026-09-03 (`check-route-bundle-budget.mjs` exit 1, **17 breaches, all JavaScript**; CSS, fonts, images,
third-party and server payload all met). **The recorded cause is corrected this pass:** framer-motion's 283
importers are **261 authenticated feature files and only 22 landing/public**, so the frozen landing animations do
not pin it into the authenticated shell — the decision is who replaces it across 261 files in every feature lane.

**Residual-risk disposition (2026-09-03):** every open box below now carries an ASSIGNABLE-or-ACCEPTED verdict, a named owner and a date, recorded inline under the box and in `reports/residual-risk-register-19-30.md`. Blockers were re-verified against source, a live gate run or a committed artifact rather than transcribed; where a stated blocker did not survive, the correction is inline.

- [x] LCP, INP and CLS meet their targets on production builds for in-scope authenticated routes at the defined reference viewport and device profile.
    All six pass. Desktop LCP p75 **888 ms** (≤1500), INP p75 **48 ms** (≤200), CLS p75 **0.0008** (≤0.1); mobile LCP p75 **1002 ms** (≤2500), INP p75 **96 ms** (≤200), CLS p75 **0.000** (≤0.1). Measured on `node scripts/measure-web-vitals.mjs --base-url=http://localhost:1043 --routes=<12> --repeat=8` (exit 0): production build `qlh_3k7hMskrlYGND5MMp`, `serverMode` derived from `.next/BUILD_ID`, **192 samples**, `authorization.verdict` = "every measured sample rendered an authorized shell" (0 unauthorized), `contentAssertion.verdict` = "every measured sample rendered real page content" (0 unusable, 0 off-route), `routeFailures: 0`. The previous pass's numbers were void — no session, so every route painted an access-failure shell; that run is superseded, not averaged in.
    **2026-09-03 S11 — this box was ticked on a measurement that could not see the route it governs, and is
    re-ticked on one that can.** The profile-wide desktop CLS p75 of 0.0065 was inside budget because twelve
    near-zero routes diluted it: across 13 routes x 8 repetitions there are 104 desktop samples, and the 16 bad
    ones sat above the 75th percentile. Reproduced independently on build `sDZBsbi1qW6Z9JlIhCg68`: **`/dashboard`
    desktop CLS 0.175-0.176 on all eight samples (990 words) and `/calendar` 0.126 on all eight (415 words)**, and
    a third breach the same aggregate hid, `/crm/inbox` desktop TTFB p95 660 ms against 400.
    Both in-scope breaches are fixed and re-measured on cold production build `iTIKVvc-wqpbkjxEiy548`
    (208 samples, 208/208 authorized, 0 off-route, 0 route failures, 0 hydration mismatches, 0 settle-capped):
    **`/dashboard` desktop CLS 0.1798 -> 0.0024, `/calendar` 0.1258 -> 0.0022**, and every one of the 11 in-scope
    routes is inside all five budgets on both profiles. `node scripts/check-web-vitals-budget.mjs` now judges each
    route on its own and exits **1** with a single violation, `/crm/inbox` mobile CLS 0.109 — a CRM route, out of
    release scope, recorded as a route-scoped `budgetException` with a named owner and a measured cause that
    annotates the failure without removing it. Against the same capture with the two CRM routes removed the gate
    is **exit 0, all budgets measured and met**. Full evidence, including the layout-shift rects, the two capture
    defects that let this hide, and the LCP cost of the fix, in `reports/26-web-vitals.md` section S11.
- [x] The six currently breached metrics are each brought inside budget, or an exception is recorded with a named owner and a concrete reason.
    Four brought inside budget: mobile INP 392 → **96 ms**, mobile FCP 2188 → **758 ms**, desktop LCP 2578 → **888 ms**, desktop FCP 2432 → **865 ms**. Two remain and carry an exception with a named owner and a measured cause: desktop TTFB p95 **1669 ms** and mobile TTFB p95 **932 ms**, both owned by `streamlineos-backend`'s `GET /me/access` — `lib/rbac/get-server-access.ts` issues it on every authenticated server render (React `cache()` dedupes within a render, never across them) and it measures **p50 503 ms / max 1004 ms** while the same server returns the public landing in 9–13 ms. The earlier attribution (`/auth/session-data` at 588–757 ms, issued twice) was measured on the failing path and is corrected: authenticated, that call is 100 ms. `node scripts/check-web-vitals-budget.mjs` → **exit 1, 2 violations**, each printing its owner; annotation never removes a failure and the self-test asserts it. **UPDATED 2026-09-03 S10: `node scripts/check-web-vitals-budget.mjs` → exit 0, all budgets measured and met** on a 208-sample capture of build `sDZBsbi1qW6Z9JlIhCg68` (desktop LCP p75 384 ms / INP 48 / CLS 0.0065 / FCP 104 / TTFB p95 173; mobile 565 / 120 / 0.0024 / 273 / 39). The two TTFB exceptions no longer fire — **but read that with its cause**: this capture reached a backend running on a LOCAL Postgres, where server-side TTFB measured p50 20-25 ms / p95 21-36 ms on all 13 routes against 500-602 / 569-1218 ms on 2026-09-02. The pass is a property of the database it measured, not a change to the app, and `GET /me/access` has not been retested against a remote instance. The exceptions are left in the manifest for that reason.
- [x] The capture is a real production build at the stated repetition count, not a development-mode run.
    `npx next build` exit 0, build id `qlh_3k7hMskrlYGND5MMp`; `serverMode` **derived** as "production" by comparing the build id in the served HTML against `.next/BUILD_ID`, not asserted. 8 repetitions per route per profile across **12 routes × 2 profiles = 192 samples** (the previous pass was 12 × 3 routes × 2 = 72). The build wall was reproduced first and is one line: `lib/env.ts:40` throws because `.env` carries a 36-character `NEXTAUTH_SECRET` and the schema requires 44 in production.
- [x] Localhost TTFB variance is acknowledged in the evidence rather than used to dismiss the breach.
    Recorded in the report and in the capture's `serverTtfb` block: loopback removes real network time so these figures **understate** production; the mobile profile's 150 ms emulated RTT is about a sixth of its 932 ms p95, not the breach. The unthrottled server-side figure is recorded beside the browser figure for all 12 routes (p50 500–602 ms, p95 569–1218 ms, **all HTTP 200**), and the desktop browser p95 exceeding it is attributed to the server pass running last under other agents' host load rather than argued away.
- [x] Navigation, skeleton, optimistic or queued feedback appears within the perceived-responsiveness target of user intent; no action looks unresponsive while work runs.
    Measured, fixed and now gated. Ticket 27 turned sidebar viewport prefetch off (correctly — 354 speculative RSC requests), which left a nav tap producing **no DOM change for up to 1739 ms**. `components/layout/nav-pending-indicator.tsx` uses Next 16's `useLinkStatus` in every sidebar item (expanded and collapsed) and every mobile bottom-nav and overflow item; it is absolutely positioned and present in both states so appearing costs no layout shift, and `aria-hidden` because the route change is the announcement. Measured click → first DOM mutation on the same in-page clock: **desktop p75 1 ms** (12 navigations, max 3), **mobile p75 5 ms** (11 navigations, max 52), target 100 ms. `checkPerceivedResponsiveness` now enforces that p75 per profile and **fails a profile that was never measured** rather than passing it by absence; 4 self-test fixtures. `pnpm exec jest --testPathPattern="components/layout"` → **exit 0, 17 suites / 122 tests**.
- [ ] Route-level JavaScript, CSS, server payload, image/font and third-party budgets are recorded and met.
    **RESIDUAL-RISK REGISTER 2026-09-03 — R-19 (ACCEPTED RESIDUAL · DECISION). The decision holds; three of the
    numbers under it have moved, and one clause of the priced conclusion is wrong.**
    Re-run at head: `node scripts/check-route-bundle-budget.mjs` → **exit 1, 13 routes, 13 measured, 0 pending,
    17 breaches, every one JavaScript**, overages spanning **26,993 → 325,756 B**.
    **The narrative above is one capture behind S9's `--write`.** `/chat` first-load is **+109,462** (recorded:
    +101,313), `/chat`'s page chunk **+26,993** (recorded: +20,085), `/crm/leads` first-load **+63,798** (recorded:
    +59,598). So **"the smallest open breach is 59,598 B" is wrong twice** — the smallest breach is `/chat`'s page
    chunk at +26,993, and the smallest first-load breach is +63,798.
    **The conclusion survives, and the arithmetic was checked rather than transcribed.** The comparison is apples
    to apples: `measuredFirstLoadJsBytes` is gzip(9) over the client-reference manifest
    (`measure-route-bundles.mjs:80-122`) and `measuredScriptBytes` is over-the-wire transfer, which is compressed.
    Subtracting the full ~75 kB gzip both levers together would buy from every route's first load closes **at most
    2 of the 17** (`/crm/leads` +63,798 and `/build/my-work` +73,324); it does not touch `/chat`'s page chunk,
    because framer-motion and `@animateicons` sit in shared first-load chunks rather than a route's own page chunk.
    Twelve of the seventeen have an overage above 100 kB. *"Neither closes 17 breaches alone"* is correct and, if
    anything, understated. **Owner: frontend platform/shell owner, plus a dependency decision on
    `@animateicons/react/lucide`. Deadline: 2026-09-17 for the decision.**
    **A-24 (ASSIGNABLE) — something this box does not record.** The breach is **growing while the release runs**:
    `/chat` first load moved +8 kB in a day. `check-route-bundle-budget.mjs` compares against a fixed ceiling that
    14 routes already breach, with **no ratchet on the last measured value**, so growth is invisible until someone
    re-measures. A ratchet would make growth fail even while the absolute ceiling stays unreachable. **Owner:
    frontend perf owner. Deadline: 2026-09-17.** Full reasoning: `reports/residual-risk-register-19-30.md` §3.5.
    PARTIAL: recorded on 12 routes, and everything except JavaScript is met — CSS 58 244 B (ceiling 65 536), fonts 55 206 B (131 072), images 2 907–14 480 B (524 288), third-party **0 B**, server payload 19 466–25 682 B (40 960). JavaScript is not: `node scripts/check-route-bundle-budget.mjs` → **exit 1**, 13 routes, 12 measured, 1 pending, **17 breaches, all JS** — 13 × `measuredScriptBytes` (610 108–850 044 B vs 524 288), 3 × `measuredFirstLoadJsBytes` (`/chat` +101 kB, `/build/my-work` +68 kB, `/crm/leads` +60 kB) and `/chat`'s page chunk (+20 kB). It is not one missing lazy boundary: `/dashboard`'s largest first-load scripts are 74 672 · 58 371 · 54 829 · 43 894 · 32 187 B then a long tail of ~14 kB chunks — the shared authenticated shell. The largest identifiable library in it is framer-motion (224 kB raw / 71 kB gzip, 278 importers), pinned there by the public landing's animations, which box 7 escalates rather than works around. Bringing this inside budget is a shell-composition project, not a fix this ticket can land.

    **2026-09-03 — re-measured at head, and the recorded REASON for the blockage is corrected.**
    `node scripts/check-route-bundle-budget.mjs` → **exit 1**, 13 routes, 12 measured, 1 pending,
    **17 breaches, every one JavaScript**: 14 × `measuredScriptBytes` (`/support/inbox` 758 783 · `/chat` 850 044 ·
    `/build/my-work` 817 721 · `/crm/leads` 807 617 · `/calendar` 728 786 · `/mail` 665 207 · `/parties` 656 265 ·
    `/settings` 654 878 · `/dashboard` 641 789 · `/crm/inbox` 639 947 · `/notifications` 623 968 ·
    `/build/inbox` 612 193 · `/inbox` 610 108, all against a 524 288 ceiling), 3 × `measuredFirstLoadJsBytes`
    (`/chat` +101 313, `/build/my-work` +68 443, `/crm/leads` +59 598) and `/chat`'s page chunk (+20 085 against
    204 800). Everything that is not JavaScript is **met**: CSS 58 244 B / 65 536, fonts 55 206 / 131 072, images
    2 907–14 480 / 524 288, third-party **0 B**, server payload 19 466–25 682 / 40 960.
    **Still not one missing lazy boundary** — `/dashboard`'s largest first-load scripts are 74 672 · 58 371 ·
    54 829 · 43 894 · 32 187 B and then a long tail of ~14 kB chunks, which is the shared authenticated shell, not
    a route's own code.
    **CORRECTION, and it changes who has to decide.** This box previously recorded framer-motion as "pinned there
    by the public landing's animations, which box 7 escalates rather than works around". Measured at head, that is
    not what pins it. framer-motion has **283 importers**, and **only 22 of them are landing/public**
    (`features/landing` — the directory is `features/landing`, not `features/marketing`, which is why an earlier
    grep for the frozen paths returned 0). The other **261 are authenticated feature code** — hr 46, build 42,
    `app/(authenticated)` 27, crm 23, org-setup 15, notifications 14, payroll 10, timesheets 8, dashboard 8, and a
    long tail. `features/landing` is imported by exactly two files, `app/page.tsx` and
    `features/legal/legal-shell.tsx`, neither of them authenticated, and Next.js splits per route group — so
    **freezing the landing animations does not put a single byte of framer-motion into the authenticated shell**.
    **The decision needed, stated so it can be routed:** who owns replacing framer-motion across **261
    authenticated-side importers spanning every feature lane**, and with what (CSS transitions, `@formkit/auto-animate`,
    the View Transitions API)? That is a cross-lane engineering decision with an owner and a budget, not an
    escalation about a frozen landing page, and not something a lazy boundary fixes. Until it is made this box
    cannot be met, and the previous framing would have sent it to the wrong owner.
    **SUPERSEDED IN PART by Session S9 below (2026-09-03, build `pRoNmQpD1X5_6lTUEhSv9`): framer-motion is NOT the
    largest library in the shell and replacing it is worth a measured ~40 kB gzip, not an unpriced project.
    `@animateicons/react/lucide` is larger. Read S9 before routing this decision.**

    **BLOCKED on that decision.** Not on territory (the shell is reachable), not on infrastructure (the budget
    script runs and measures), and not on tool capability.

    **2026-09-03 S10 — the icon lever was pulled, and the box is still open.** `node scripts/check-route-bundle-budget.mjs`
    -> **exit 1, 13 routes, 13 measured, 0 pending, 17 breaches**, all JavaScript, on build `sDZBsbi1qW6Z9JlIhCg68`:
    13 x `measuredScriptBytes` (`/chat` 817,008 · `/build/my-work` 784,096 · `/crm/leads` 773,117 · `/support/inbox` 725,951 ·
    `/calendar` 698,541 · `/mail` 639,362 · `/parties` 618,550 · `/settings` 605,854 · `/dashboard` 604,993 ·
    `/crm/inbox` 601,219 · `/notifications` 586,986 · `/build/inbox` 574,989 · `/inbox` 573,118, ceiling 524,288),
    3 x `measuredFirstLoadJsBytes` (`/chat` +72,805, `/build/my-work` +37,209, `/crm/leads` +27,660) and `/chat`'s page
    chunk (+26,650). **Everything that is not JavaScript is met** and is now measured on the same build: CSS 58,161 /
    65,536, fonts 55,206 / 131,072, images 2,907-10,531 / 524,288, third-party **0 B**, server payload 20,289-25,747 /
    40,960, and every `measuredTotalBytes` inside 1,048,576 (worst `/chat` 965,524 = 92.1%).
    **What changed:** the shared shell lost the icon library's dead weight. Pre-fix `pRoNmQpD1X5_6lTUEhSv9` carried
    `448xe3n3zsx8s.js` at 481,691 B raw / 55,886 B gzip with 248 icons in the first load of 559 of 601 routes; post-fix
    it is `1_nkc_jwewkee.js` at 147,629 / 14,273 with exactly the 90 the app imports, and the chunks containing
    framer-motion's `transformPerspective` marker went 3 -> 2. The mechanism is a pnpm patch
    (`frontend/patches/@animateicons__react@0.3.4.patch`) that PURE-annotates each `forwardRef` declaration and folds its
    `displayName` into the same expression, plus a three-line replacement of the package's inlined copy of `motion@12`
    with a re-export of the framer-motion the app already ships. Both halves are load-bearing: PURE alone dropped nothing.
    **`experimental.optimizePackageImports` for this package is now proved vacuous, not merely suspected** — building with
    and without its three `@animateicons/react*` entries produced a byte-identical icon chunk and every route within
    +-32 B (except `/calendar` at +696 B of chunk-splitting noise). The entries are removed.
    **What is still open and who owns it.** 17 breaches remain and no single library explains them: after this fix the
    largest identifiable thing in the shell is framer-motion at 95,216 B raw / 30,554 B gzip in 601 of 601 routes, worth a
    measured ~40 kB gzip against a smallest remaining overage of 26,650 B — so replacing it *would* now close the smallest
    breaches, but not `/chat` (+292,720 on script bytes). The rest is shared authenticated-shell composition. The decision
    to route is unchanged in shape and better priced: **who owns thinning the authenticated shell, and is framer-motion's
    256-file migration the next 40 kB or is route-level code splitting the bigger one?** The icon lever, which was the
    cheapest, is spent.
    **STILL BLOCKED on that decision**, and no longer on measurement: the manifest is single-provenance again, every
    field on all 13 routes coming from `sDZBsbi1qW6Z9JlIhCg68`.
- [x] Public landing visuals and animations remain unchanged; if a frozen landing animation prevents an agreed target, that is escalated rather than worked around.
    Nothing under `app/(public)/**`, `features/marketing/**` or any landing animation was touched this session or last. The landing renders in 9–13 ms TTFB and is not on the authenticated critical path, so no frozen animation prevents any target — every LCP/FCP/INP/CLS budget is now met with the animations exactly as they are. ESCALATED rather than worked around: those animations pin framer-motion into every authenticated first load, which is the single largest identifiable contributor to the open JS budget in box 6; dropping it is a product decision about the landing, not a refactor.


---

## Session S8 (2026-09-03) — NOT MEASURED THIS PASS

A production build was started and killed at ~15% battery before producing a `BUILD_ID`. Nothing was measured,
ticked or changed. Superseded by S9 below, which ran the build to completion.

---

## Session S9 (2026-09-03) — BUILD COMPLETED, BOX 6 STILL OPEN, RECORDED CAUSE CORRECTED AGAIN

`NEXTAUTH_SECRET=<47-char local placeholder> NODE_ENV=production npx next build` through `heavy.sh 2` →
**exit 0**, build id **`pRoNmQpD1X5_6lTUEhSv9`**, **601 routes** (counted from
`.next/diagnostics/route-bundle-stats.json`). The stale `.next` left by S8 was deleted first (cache kept), so
nothing here reads a half-written artifact. `pnpm -C frontend type-check` → **exit 0**.

### 1. `measuredTotalBytes` — governed, but loose, and NOT tightened
`defaults.maxTotalBytes` = 1,048,576 B. All 13 routes are inside it: `/chat` 989,423 B (**94.4%**),
`/build/my-work` 963,374 (91.9%), `/crm/leads` 951,954 (90.8%), `/dashboard` 781,242 (74.5%). The budget is
**not vacuous** — `check-route-bundle-budget.mjs` compares it and the self-test asserts the pair fires — but it
has never rejected anything, and it sits *above* a `measuredScriptBytes` ceiling that 14 routes breach. Left
untightened deliberately: tightening to the measured maximum manufactures red routes on a box already blocked on
a cross-lane decision, and no owner has agreed a target. Recorded as
`measurementNotes.totalBytesBudgetHonesty2026_09_03`.

Separately: the governed `/dashboard` figure of 440,065 B (now re-measured 441,834 B) really does understate what
users fetch. Next's own accounting for the same route is **2,281,422 B raw / 573,428 B gzip over 42 chunks** —
the manifest number is the client-reference-manifest subset (37 chunks) and omits framework/polyfill/main.

### 2. framer-motion — settled with numbers, and it is NOT the biggest thing in the shell
278 importers at head (22 `features/landing`, 256 authenticated). Used surface: `motion` 256 files,
`useReducedMotion` 102, `AnimatePresence` 67, then single-digit `LayoutGroup` / `MotionConfig` / `useTransform` /
`useSpring` / `useMotionValue` / `useInView`.

**What replacing it would actually save**, bundled in isolation with the repo's esbuild 0.27.1
(`--bundle --minify --format=esm`, react external):

| surface | raw | gzip |
|---|---|---|
| full used surface | 121,284 B | **40,690 B** |
| `motion` + `AnimatePresence` + `useReducedMotion` | 117,537 B | 39,330 B |
| `useReducedMotion` alone | 368 B | **253 B** |

Corroborated in the build: framer-motion is one merged module of 94,837 B inside chunk `2-tfck0qpw5kq.js`
(95,216 B raw / **30,554 B gzip**), a first-load chunk of **601 of 601** routes.

So the answer for the scope decision: **replacing framer-motion buys about 40 kB gzip per first load**, the 102
`useReducedMotion`-only call sites are free (253 B) and can be excluded from the migration, and the smallest
open breach is **59,598 B**. It does not close the JS budget on its own.

### 3. THE LARGER LEVER, previously unrecorded — `@animateicons/react/lucide`
Chunk `448xe3n3zsx8s.js` is **481,691 B raw / 55,869 B gzip** in the first load of **559 of 601** routes —
**larger than framer-motion**. It ships **all 248** animated icons (counted from `displayName=` literals in the
built chunk) while the app imports **90** distinct icons across **596** files.

`next.config.ts` **already lists** `@animateicons/react/lucide` in `experimental.optimizePackageImports`, and it
cannot bite: the package is a single 412,078 B ESM file with no per-icon modules for a barrel rewrite to target,
and it has **zero `@__PURE__` annotations** on 248 top-level `forwardRef(...)` calls, so no bundler may drop an
unused one. Reproduced outside Next with esbuild — all 248 → 455,497 B raw / 60,394 B gzip; only the 90 used →
452,184 B raw / 59,354 B gzip, a **1,040 B** difference. Structurally unshakeable, not mis-configured.

It also **vendors its own copy of framer-motion** (`dist/chunk-SZP4YRB3.js`, 73,833 B, carrying
`transformPerspective` / `anticipate` / `whileHover` / `originX`) while declaring no dependency on it — so
**framer-motion ships twice** in every authenticated first load. Prorating 90/248 puts roughly **35 kB gzip** per
first load in icons the app never renders. **Owner: a dependency decision, not ticket 26.**

### 4. `org-switcher.tsx` double import — SETTLED, the `dynamic()` deferred nothing
`LeaveOrganizationDialog`'s own description string sits in `.next/static/chunks/176qxkejwz55m.js`
(71,974 B raw / 22,373 B gzip) **together with** `LeaveOrganizationMenuItem`, and that chunk is a **first-load**
chunk of **556 of 601** routes (checked directly against `/dashboard`, `/inbox`, `/settings`). **No async chunk
carrying the module exists** anywhere under `.next/static/chunks` — the only other file containing the string is
`1-t3ze_xbo39w.js`, itself a first-load chunk of `/settings/organization`. Collapsed to a static import.
Byte saving **zero**; the value is that the construct no longer claims a deferral it never performed. Dropping
`ssr: false` is safe: the dialog returns `null` unless `access.isOrgOwner === false`, and `ConfirmDialog` renders
through a Radix portal that emits nothing while closed.

### Gates run this session
| command | exit | result |
|---|---|---|
| `NEXTAUTH_SECRET=<47-char placeholder> NODE_ENV=production npx next build` | **0** | build `pRoNmQpD1X5_6lTUEhSv9`, 601 routes |
| `pnpm -C frontend type-check` (`tsc --noEmit`) | **0** | clean |
| `node scripts/measure-route-bundles.mjs` | **0** | 13 routes measured, baseline `/dashboard` 441,834 B / 37 chunks |
| `node scripts/measure-route-bundles.mjs --write` | **0** | `/parties` measured 456,830 B → **0 pending** |
| `node scripts/check-route-bundle-budget.mjs` | **1** | 13 routes, **13 measured, 0 pending**, **17 breaches, all JS** |
| `node scripts/check-route-bundle-budget.mjs --self-test` | **0** | SELF-TEST PASSED |

**NOT RUN this session:** `scripts/measure-web-vitals.mjs` and `scripts/check-web-vitals-budget.mjs` — no browser
cold-cache pass, no LCP/INP/CLS/TTFB re-capture. The machine hit **6% battery**. Every `measuredScriptBytes` /
`measuredTotalBytes` / CSS / font / image / third-party / server-payload figure in the manifest therefore remains
from the 2026-09-02 capture on build `5KxS0uW9Wrm0BIVYZicTs`, and the manifest now says so in
`measurementNotes.measurementProvenance2026_09_03`. First-load figures moved +1,505 to +8,149 B between the two
builds, so the older over-the-wire numbers are close but are not from this build.

**Box 6 remains OPEN.** Still blocked on a cross-lane engineering decision, but the decision is now a different
and better-priced one: it is not "who replaces framer-motion across 261 files for an unknown gain", it is
"@animateicons/react ships 248 icons for 90 used and vendors a second framer-motion — do we replace the icon
dependency (larger lever, ~35 kB gzip, one dependency swap) before or instead of framer-motion (~40 kB gzip, 256
files)?" Neither closes 17 breaches alone; together they are ~75 kB gzip against a smallest overage of 59,598 B.
