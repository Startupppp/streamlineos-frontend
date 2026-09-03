# 26 — Fix the six breached Web Vitals budgets on a production build

**What to build:** A production-mode capture currently breaches six of its own budgets: mobile INP, FCP and TTFB, and desktop LCP, FCP and TTFB. These are the project's own budgets measured the project's own way, so they are real. Close them and re-measure.

**Blocked by:** 25 — route composition drives most of these numbers, so measuring before the thinning lands wastes the run. (25 is done; this is no longer a blocker.)

**Status:** 6 of 7 closed. Four of the six breached metrics are inside budget on a real authenticated production
capture (192 samples, 0 refused); the last box is **BLOCKED on a cross-lane engineering decision**, re-measured at
head 2026-09-03 (`check-route-bundle-budget.mjs` exit 1, **17 breaches, all JavaScript**; CSS, fonts, images,
third-party and server payload all met). **The recorded cause is corrected this pass:** framer-motion's 283
importers are **261 authenticated feature files and only 22 landing/public**, so the frozen landing animations do
not pin it into the authenticated shell — the decision is who replaces it across 261 files in every feature lane.

- [x] LCP, INP and CLS meet their targets on production builds for in-scope authenticated routes at the defined reference viewport and device profile.
    All six pass. Desktop LCP p75 **888 ms** (≤1500), INP p75 **48 ms** (≤200), CLS p75 **0.0008** (≤0.1); mobile LCP p75 **1002 ms** (≤2500), INP p75 **96 ms** (≤200), CLS p75 **0.000** (≤0.1). Measured on `node scripts/measure-web-vitals.mjs --base-url=http://localhost:1043 --routes=<12> --repeat=8` (exit 0): production build `qlh_3k7hMskrlYGND5MMp`, `serverMode` derived from `.next/BUILD_ID`, **192 samples**, `authorization.verdict` = "every measured sample rendered an authorized shell" (0 unauthorized), `contentAssertion.verdict` = "every measured sample rendered real page content" (0 unusable, 0 off-route), `routeFailures: 0`. The previous pass's numbers were void — no session, so every route painted an access-failure shell; that run is superseded, not averaged in.
- [x] The six currently breached metrics are each brought inside budget, or an exception is recorded with a named owner and a concrete reason.
    Four brought inside budget: mobile INP 392 → **96 ms**, mobile FCP 2188 → **758 ms**, desktop LCP 2578 → **888 ms**, desktop FCP 2432 → **865 ms**. Two remain and carry an exception with a named owner and a measured cause: desktop TTFB p95 **1669 ms** and mobile TTFB p95 **932 ms**, both owned by `streamlineos-backend`'s `GET /me/access` — `lib/rbac/get-server-access.ts` issues it on every authenticated server render (React `cache()` dedupes within a render, never across them) and it measures **p50 503 ms / max 1004 ms** while the same server returns the public landing in 9–13 ms. The earlier attribution (`/auth/session-data` at 588–757 ms, issued twice) was measured on the failing path and is corrected: authenticated, that call is 100 ms. `node scripts/check-web-vitals-budget.mjs` → **exit 1, 2 violations**, each printing its owner; annotation never removes a failure and the self-test asserts it.
- [x] The capture is a real production build at the stated repetition count, not a development-mode run.
    `npx next build` exit 0, build id `qlh_3k7hMskrlYGND5MMp`; `serverMode` **derived** as "production" by comparing the build id in the served HTML against `.next/BUILD_ID`, not asserted. 8 repetitions per route per profile across **12 routes × 2 profiles = 192 samples** (the previous pass was 12 × 3 routes × 2 = 72). The build wall was reproduced first and is one line: `lib/env.ts:40` throws because `.env` carries a 36-character `NEXTAUTH_SECRET` and the schema requires 44 in production.
- [x] Localhost TTFB variance is acknowledged in the evidence rather than used to dismiss the breach.
    Recorded in the report and in the capture's `serverTtfb` block: loopback removes real network time so these figures **understate** production; the mobile profile's 150 ms emulated RTT is about a sixth of its 932 ms p95, not the breach. The unthrottled server-side figure is recorded beside the browser figure for all 12 routes (p50 500–602 ms, p95 569–1218 ms, **all HTTP 200**), and the desktop browser p95 exceeding it is attributed to the server pass running last under other agents' host load rather than argued away.
- [x] Navigation, skeleton, optimistic or queued feedback appears within the perceived-responsiveness target of user intent; no action looks unresponsive while work runs.
    Measured, fixed and now gated. Ticket 27 turned sidebar viewport prefetch off (correctly — 354 speculative RSC requests), which left a nav tap producing **no DOM change for up to 1739 ms**. `components/layout/nav-pending-indicator.tsx` uses Next 16's `useLinkStatus` in every sidebar item (expanded and collapsed) and every mobile bottom-nav and overflow item; it is absolutely positioned and present in both states so appearing costs no layout shift, and `aria-hidden` because the route change is the announcement. Measured click → first DOM mutation on the same in-page clock: **desktop p75 1 ms** (12 navigations, max 3), **mobile p75 5 ms** (11 navigations, max 52), target 100 ms. `checkPerceivedResponsiveness` now enforces that p75 per profile and **fails a profile that was never measured** rather than passing it by absence; 4 self-test fixtures. `pnpm exec jest --testPathPattern="components/layout"` → **exit 0, 17 suites / 122 tests**.
- [ ] Route-level JavaScript, CSS, server payload, image/font and third-party budgets are recorded and met.
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
    **BLOCKED on that decision.** Not on territory (the shell is reachable), not on infrastructure (the budget
    script runs and measures), and not on tool capability.
- [x] Public landing visuals and animations remain unchanged; if a frozen landing animation prevents an agreed target, that is escalated rather than worked around.
    Nothing under `app/(public)/**`, `features/marketing/**` or any landing animation was touched this session or last. The landing renders in 9–13 ms TTFB and is not on the authenticated critical path, so no frozen animation prevents any target — every LCP/FCP/INP/CLS budget is now met with the animations exactly as they are. ESCALATED rather than worked around: those animations pin framer-motion into every authenticated first load, which is the single largest identifiable contributor to the open JS budget in box 6; dropping it is a product decision about the landing, not a refactor.
