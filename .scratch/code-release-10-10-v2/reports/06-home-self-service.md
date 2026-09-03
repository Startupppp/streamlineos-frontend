# 06 — Home and self-service

**PRD-C115** (reconstruct current-head Home evidence + KEEP/REFACTOR/REMOVE) ·
**PRD-C144** (concurrent, independent, bounded fanout) ·
**PRD-C087** (measured on this route, owned by ticket 04)

## Commit SHAs measured at

| Repo | SHA at start of run | SHA at end of run | Branch |
|---|---|---|---|
| `streamlineos-backend` | `8f37e580e4038459227ecbd21e92e40e33fa4531` | `93fe5f46149405c2c53b81360b276acd19295b19` | `release/code-10-10-v2` |
| `streamlineos-frontend` | `fa562ef6672b125959d648a5dda3808f43a26486` | `778f7d467f7fce5f890f06d006bd745bf3157748` | `release/code-10-10-v2` |

Both repos are one shared working tree across ~16 concurrent agents, so HEAD moved under this run.
Every command below was executed against the working tree at the time it ran; none of the moves
touched `modules/dashboard/**`, `features/dashboard/**` or `features/employee-self-service/**`
(verified with `git status --short` on those paths before each measurement).

Database: **`scratch_perf_seed`**, local Postgres, at head (journal 665/665), measured as the
non-owner role **`streamline_app`** (`rolbypassrls=f`) with `SET app.organization_id`, across the
89.93 % tenant (`aaaaaaaa-…-001`), the 9.00 % tenant (`…-002`) and the 0.18 % tenant (`…-004`).

Frontend production build for the byte measurements: **`5o4xLkSDla7WoSLqCH9rB`**
(`next build`, exit 0). Baseline build read for the "before" figure: **`ApR6RvWsqbdL6GTV-aEwj`**.

---

## 1. Commands run, with real exit codes

| Command | Exit | Result |
|---|---|---|
| `pnpm -C streamlineos-backend exec jest --maxWorkers=2 --testPathPattern="modules/dashboard/"` | **0** | 20 suites / 177 tests passed (with the new fanout spec, before the registry change) |
| same, re-run after the registry change, and once more as a final sweep | **0** | 20 suites / **179 tests** passed, both times |
| `pnpm exec jest --maxWorkers=2 --testPathPattern="features/dashboard"` | **0** | 7 suites / **38 tests** passed |
| `pnpm exec jest --maxWorkers=2 --testPathPattern="lib/home"` | **0** | 2 suites / 20 tests passed |
| `pnpm check:home-manifest` | **0** | 16 controller routes + 1 external = 17 manifest sections, consistent |
| `pnpm check:home-manifest:self-test` | **0** | 14 passed, 0 failed |
| `pnpm check:route-bundle-budget` | **1** | 15 breaches across **all 13** measured routes (see §4) |
| `pnpm -C streamlineos-frontend/frontend type-check` | **0** | clean |
| `pnpm -C streamlineos-backend typecheck` | **0** | clean (run twice — after the service change, and again after the registry type change) |
| `pnpm exec eslint features/dashboard/{dashboard-deferred-body,public-documents-card,home-section-independence.test}.tsx` | **0** | 0 errors, 1 pre-existing warning (`pendingUploadCount` unused, `public-documents-card.tsx:256`) |
| `pnpm exec next build` (with a 44-char local placeholder `NEXTAUTH_SECRET`) | **0** | compiled successfully |
| `node scripts/measure-route-bundles.mjs` | **0** | see §4 |

Removal proofs (each ran, was read, and was reverted):

| Bite | Command | Exit | What went red |
|---|---|---|---|
| Neutralise the section deadline (`deadlineMs` default → 1 h) | `jest --testPathPattern="dashboard-home-fanout"` | **1** | 2 tests failed with `Exceeded timeout of 20000 ms` — the exact C087 defect |
| Make one Home section's data absent | `jest --testPathPattern="home-section-independence"` | **1** | `an answered section renders while a sibling is still loading` failed |
| Delete the two new registry entries | `jest --testPathPattern="dashboard-section-registry"` | **1** | both new FAIL-CLOSED tests failed, naming `recent-activity` and `recent-projects` |

---

## 2. Home fanout: concurrency, independence, boundedness — MEASURED

### 2.1 The shape at head

Home is **not one aggregation endpoint**. It is 16 GET routes on `DashboardController` plus one
external route (`GET /hr/documents`), and the frontend mounts one TanStack query per section. Two of
those routes are themselves aggregates that fan out internally:

- `GET /dashboard/personal` → 5 sources (`myTasks`, `timesheet`, `leaveBalance`, `upcomingEvents`, `unreadNotifications`)
- `GET /dashboard/stats` → 4 sources (`org`, `employees`, `projects`, `attendance`)

So "the Home fanout" has two layers, and both were measured.

### 2.2 Concurrency — proved by barrier, not by reading `Promise.all`

`src/modules/dashboard/dashboard-home-fanout.spec.ts` routes all five personal-dashboard sources
through a barrier that only opens once **five distinct sections have reported in**. A sequential
implementation cannot get past section one, so it deadlocks and the test fails with
`fanout is not concurrent: only N/5 sections started within 4000ms`.

- Result: **PASS** — all 5 arrived, `degraded` empty.
- The barrier is itself bite-proved by a companion test that drives it sequentially and asserts it
  rejects with `only 1/2`.

### 2.3 Boundedness — the fanout width is a compile-time constant

`resolvePersonalDashboardModules` derives its module probes from the **static**
`DASHBOARD_HOME_SECTIONS` registry, not from the tenant's enabled modules. Measured by running the
aggregate three times with 3, 23 and 63 modules available:

| Modules available to the tenant | Sections started | `moduleAvailability` probes |
|---|---|---|
| 3 | 5 | 3 |
| 23 | 5 | 3 |
| 63 | 5 | 3 |

The probe set is asserted equal to the registry's own module-key set, so a tenant enabling 60 extra
modules starts exactly the same work. **The fanout is bounded and does not grow with the tenant.**

### 2.4 Independence — the C087 defect, measured and fixed

**What was there.** Both aggregates wrapped each source in a local `settle()` that caught a
*rejection* and returned a fallback. That handles a **failing** source. It does nothing about a
**slow** one: `Promise.all` still waits for the slowest, with no deadline anywhere, so one stalled
source held the whole response. PRD-C087 names exactly this — *"one slow source must not delay or
fail every section."*

**Why it matters here, measured on the seeded database.** As `streamline_app` with the tenant GUC,
on the 89.93 % tenant:

| Home source | Planning buffers | Planning time | Exec buffers | Exec time |
|---|---|---|---|---|
| stats-employees | 262 | 0.6–0.7 ms | 11 | 0.67 ms |
| stats-projects | 263 | " | 14 | 2.16 ms |
| stats-attendance | 239 | " | 15 | 2.20 ms |
| announcements | 242 | 0.61–0.74 ms | 34 | 1.10 ms |
| my-issues | 799 | " | 18 | 1.25 ms |
| recent-activity | 715 | " | 18 | 2.16 ms |
| upcoming-events | 294 | " | 19 | 1.84 ms |
| timesheet-week | 394 | " | 16 | 2.27 ms |
| team-attendance | 276 | " | 19 | 2.16 ms |
| recent-projects | 313 | " | 18 | 1.49 ms |
| **unread-notifications** | **12,063** | **31.7 / 39.1 / 50.4 ms** | 160 | 1.25 ms |

The unread-notification count — one of the five sources inside `/dashboard/personal` — costs
**12,063 planning buffers and 31.7–50.4 ms of planning time**, against 239–799 buffers and
0.6–0.7 ms for every other Home source. The cost is **planning, not execution**: `notifications`
has **49 partitions** (`pg_inherits`), and `prepare: false` on the Neon driver (backend CLAUDE.md §3)
means that plan is rebuilt on **every request, per user**. It is also **invariant to tenant size** —
the 0.18 % tenant, which has zero matching rows, pays 12,063 planning buffers too. Under the old
`Promise.all`, `/dashboard/personal` could never answer faster than its slowest source, and that
source is 40–70× the next slowest.

**The fix.** New `src/modules/dashboard/dashboard-section-settle.ts` exports `settleSection`, which
degrades one section on rejection **or** on exceeding `HOME_SECTION_DEADLINE_MS`. Both aggregates now
use it.

- The constant is **2,500 ms**, chosen from the measurement above: the slowest measured source is
  ~52 ms total, so the ceiling is ~48× the worst observed case and cannot fire on a healthy read.
  The measurement is recorded on the constant so the number is not a guess.
- The abandoned promise keeps a rejection handler, proved by a test that installs an
  `unhandledRejection` listener and asserts nothing arrives.

**Proof it bites.** With `deadlineMs` neutralised to 1 hour, `jest --testPathPattern="dashboard-home-fanout"`
exits **1** with two `Exceeded timeout of 20000 ms` failures:
`getPersonalDashboard answers with four sections while the fifth hangs forever` and
`a hanging organization lookup still yields the employee and project counts`. With the fix both
pass in ~2.5 s and the log shows
`Home section "unreadNotifications" exceeded 2500ms and was abandoned for org org-fanout-1`.

### 2.5 A second serialization defect in `/dashboard/stats`, fixed

`dashboard-stats.service.ts` had **five sequential await stages**: flags → org cache key → org
lookup → three cache keys → three counts. Employees and projects do not depend on the organisation
row at all; only the attendance count does (it needs `orgTz` for the local date). Restructured to two
stages — the org lookup, the flags resolution and the employee/project cache keys all start together,
and only attendance chains behind the org row.

Proved by a test that gates the organisation lookup open and counts how many section queries had
already run: **≥2 counts complete before `org:end`**, and `order.indexOf("org:end") > order.indexOf("count")`.
A second test hangs the organisation lookup forever and still gets `totalEmployees: 7` and
`activeProjects: 7` back with `orgName` falling back to `"Organization"`.

No wire shape changed. `/dashboard/stats` deliberately does **not** gain a `degraded` field —
`settleSection`'s `onDegraded` is optional and stats omits it, so the response contract that ticket 04
owns is untouched. `/dashboard/personal` already returned `degraded` and still does.

### 2.6 Frontend independence — measured on rendered output, not on types

New `features/dashboard/home-section-independence.test.tsx` drives the real `DashboardDeferredBody`
with one hook answered, one still loading and one rejected, and asserts on **what is on screen**
(the note in the brief about `apiClient.get<T>` being a cast applies here — the declared props are
identical in all three states):

- an answered section renders its rows while a sibling is still loading;
- the failed section renders its own `role="alert"` with the error text and its own Retry;
- nothing at all renders before `DeferredDashboardContent` reports visible.

Bite-proved: flipping the answered section to `isLoading: true` turns the first test red.

Structurally, the page-level composition is already correct and was verified rather than assumed:
every Home widget is wrapped in its own `HomeSectionBoundary`, and `home-section-boundary.test.tsx`
enforces that for all 22 named widgets by scanning the three composition files.

### 2.7 Verdict

**The Home fanout is CONCURRENT, BOUNDED, and — as of this change — INDEPENDENT under slowness as
well as under failure.** Before this change it was concurrent and bounded but only independent under
*failure*; a single stalled source delayed the whole `/dashboard/personal` and `/dashboard/stats`
response, which is precisely the defect PRD-C087 names. That is now fixed and the fix is bite-proved.

---

## 3. Ownership model: what `check:home-manifest` actually encodes, and the hole in it

`scripts/check-home-manifest.mjs` + `scripts/home-manifest-parse.mjs` parse
`backend/src/modules/dashboard/dashboard.controller.ts` (plus a declared allowlist of
`EXTERNAL_HOME_ROUTES`, currently just `GET /hr/documents`) and compare each route's
`@Universal()` / `@RequireModule` / `@RequirePermission` against
`lib/home/home-manifest.generated.json`. That is the concrete meaning of "folder ownership" and
"universal-versus-module composition" here: **the backend controller owns Home access; the frontend
manifest is generated from it and may never be hand-written.** The gate passes at head (16 + 1 = 17)
and still passes after every change in this ticket.

**Defect found and fixed — the registry under-described 7 routes and missed 4 entirely.**
`dashboard-section-registry.ts` is the *other* half of the ownership model: it declares each
section's kind and cache namespace. Two problems, both measured:

1. Its `PermissionSection` type had no `module` field, but **seven** Home routes carry *both*
   `@RequireModule` and `@RequirePermission`. The registry recorded the permission and silently
   dropped the module gate, disagreeing with the generated manifest, which reads both.
2. `recent-activity`, `today-activities`, `personal` and `stats` are live controller GET routes with
   **no registry entry at all** — no declared kind, no cache namespace. The spec that was supposed
   to catch this asserted `expect(routeMap.size).toBeGreaterThan(0)`, which is true of any
   controller and had never bitten.

Fixed: `module?: string` added to `PermissionSection`; the 6 module-gated permission sections now
declare it; the 4 missing sections added; and two FAIL-CLOSED tests added — *every GET route on
`DashboardController` has a registry entry*, and *a permission section declares the module gate its
controller route carries*. Both bite (verified by deleting entries; exit 1, naming the missing keys).

**Residual coverage gap, reported not fixed.** 7 registry sections have no `routePath`
(`upcoming-events`, `unread-notifications`, `my-tasks`, `timesheet-status`, `stats-employees`,
`stats-attendance`, `stats-projects`). They are served *inside* the `@Universal()` `/dashboard/personal`
and `/dashboard/stats` endpoints and gated in-service by `resolvePersonalDashboardModules` /
`resolveDashboardStatsFlags`. `check:home-manifest` compares decorators on routes, so it structurally
cannot see the in-service gating of those seven. `dashboard-section-isolation.spec.ts` covers them
with deny-before-query BITE tests (a denied section's query never runs), which is the right proof —
but it is a spec, not a gate, and it is not wired into `check:*`.

---

## 4. `/dashboard` bundle: before/after, and why the residual breach is not this route's

### 4.1 Measured before/after

`node scripts/measure-route-bundles.mjs` — gzip(9) over every chunk in the route's
`page_client-reference-manifest.js`:

| | chunks | gzip bytes |
|---|---|---|
| Before (build `ApR6RvWsqbdL6GTV-aEwj`) | 38 | **405,507** |
| After (build `5o4xLkSDla7WoSLqCH9rB`) | 36 | **386,063** |
| Delta | −2 | **−19,444 B (−4.8 %)** |

Attribution check: on the same after-build, **every other one of the 13 measured routes moved ≤ 11
bytes**. The saving is the change, not the rebuild.

`measuredFirstLoadJsBytes` for `/dashboard` was `405,505` and is now recorded as `386,063` in
`contracts/route-bundle-manifest.json`, with the provenance and the caveats below written into that
entry's `breachOwnerNote`. **No budget number was raised.**

### 4.2 What was actually lazy-loaded (PRD-C151)

The dashboard is **not** mostly charts — `grep` for `recharts` / `@tiptap` / `react-day-picker` /
`@hello-pangea` / `react-window` across `features/dashboard` and `components/dashboard` returns
**nothing**, and the two chart-shaped widgets (`ExecutiveKpiWidget`, `BusinessPulseWidget`) were
already behind `next/dynamic`. What was actually in the first-load graph and should not have been:

1. **`UploadDocSheet` (321 lines, `features/hr/document-review/`)** — a Sheet that only opens on a
   user click, statically imported by `public-documents-card.tsx` and *always mounted* with
   `open={false}`. Now `next/dynamic` **and** only mounted once first opened (a latch preserves the
   close animation). This also removes a `features/dashboard → features/hr` runtime import, which
   root `CLAUDE.md` §9 bans.
2. **Six below-the-fold cards** — `PublicDocumentsCard` (340 lines), `MyIssuesCard`, `SprintCard`,
   `TeamCard`, `RecentProjectsCard`, `RecentActivityCard` — statically imported into
   `dashboard-deferred-body.tsx` even though every one of them renders only after
   `DeferredDashboardContent` reports visible. Now `next/dynamic` with `ssr: false` and a
   `WidgetSkeleton` fallback, matching the pattern the HR widgets already used. `DashboardTicket`
   is now an `import type`, so it creates no runtime edge.

### 4.3 Why the `measuredScriptBytes` breach is NOT closed — measured, not asserted

The breaching metric is `measuredScriptBytes = 604,993 > 524,288` (over by 80,705). I did not close
it, and here is the measurement that says it is not closable from inside `features/dashboard`.

I scanned all **602** built `page_client-reference-manifest.js` files and counted, for each of
`/dashboard`'s first-load chunks, how many routes reference it:

| | gzip bytes in chunks referenced by **1 route** | gzip in chunks referenced by 193–461 routes |
|---|---|---|
| Before | **25,619 (6.3 %)** | 379,888 (93.7 %) |
| After | **14,933** | ~371,130 |

**93.7 % of `/dashboard`'s first-load JS was already shared authenticated shell.** The single largest
chunk (56,661 B gzip / 249,947 B raw) is referenced by 449 routes. The entire remaining addressable
surface inside `features/dashboard` is **~15 kB gzip**, against an **80,705 B** overage. Lazy-loading
every last dashboard-exclusive module would still leave the route breaching by ~65 kB.

Corroborating: `check:route-bundle-budget` reports `measuredScriptBytes` breaches on **all 13**
measured routes, from `/inbox` (+48,830) to `/chat` (+292,720). `/dashboard`'s +80,705 is the **6th
smallest of 13**. This is a shared-shell budget, not a `/dashboard` composition budget.

### 4.4 Honest gaps in the byte evidence

- **`measuredScriptBytes` was NOT re-measured.** It needs the Chrome-over-CDP harness
  (`scripts/measure-web-vitals.mjs`) driving a `next start`, with `--cookie-file=<minted NextAuth
  session cookie>`; I had no such cookie and did not mint one. The recorded 604,993 therefore still
  comes from build `sDZBsbi1qW6Z9JlIhCg68` and now **overstates** this route by roughly the 19,444 B
  removed. I did not adjust it by arithmetic — an unmeasured number stays unmeasured.
- **LCP impact is small and I am not overstating it.** `check:web-vitals-budget` had `/dashboard`
  inside budget on both profiles before this change; I did not re-run it (same harness dependency).
- **Side effect worth knowing:** `/dashboard` is the baseline every other route's
  `measuredPageChunkBytes` is taken against, so lowering it mechanically raises most other routes'
  page-only figures. Re-measured on the after-build, every route still sits under
  `maxPageChunkBytes` (largest `/build/my-work` 194,410 of 204,800). No new breach. I did **not**
  rewrite other routes' entries — they belong to other tickets and their numbers come from their own
  build.

---

## 5. KEEP / REFACTOR / REMOVE — every Home file

**REMOVE count: 0.** Nothing in the Home surface is dead. Checked with `grep` for importers plus
`knip`; all four `features/employee-self-service` pages are reachable from real `/me/*` routes
(`app/(authenticated)/me/{attendance,expenses,recruitment,documents}/page.tsx`), which is the
"done ≠ reachable" trap this repo has hit before. No file is proposed for deletion.

### 5.1 Backend — `streamlineos-backend/src/modules/dashboard/` (38 files)

| File | Class | Reason / failure prevented |
|---|---|---|
| `dashboard.controller.ts` | KEEP | 16 GETs, every one declares exposure; is the source `check:home-manifest` parses |
| `dashboard.module.ts`, `dashboard.errors.ts`, `dto/dashboard.schemas.ts` | KEEP | `.strict()` on both write schemas |
| `dashboard-section-registry.ts` | **REFACTORED** | Dropped the module gate on 7 dual-gated routes and had no entry for 4 live routes — registry silently disagreed with the generated manifest |
| `dashboard-section-registry.spec.ts` | **REFACTORED** | Its coverage assertion was `size > 0`, true of any controller; replaced with two FAIL-CLOSED tests that bite |
| `dashboard-personal.service.ts` | **REFACTORED** | `Promise.all` + reject-only settle: one stalled source delayed the whole response (PRD-C087) |
| `dashboard-stats.service.ts` | **REFACTORED** | Same, plus 5 sequential await stages where 2 suffice; employees/projects were queued behind an org lookup they don't need |
| `dashboard-section-settle.ts` | **NEW** | The deadline + degrade primitive both aggregates now share |
| `dashboard-home-fanout.spec.ts` | **NEW** | Concurrency/boundedness/independence had no measured proof at all |
| `dashboard-scope.ts` | KEEP | Where the fanout bound comes from; the comment records a real fail-open that was fixed |
| `dashboard-read-limits.ts` (+spec) | KEEP | Caps every list read; `boundedDashboardList` reports the true total instead of truncating silently |
| `dashboard-cache-key.ts` (+spec) | KEEP | Scoped keys carry user + permissions version + scope; the spec pins cross-actor and cross-org separation |
| `dashboard-{stats,availability,birthdays,personal,leave,announcements,crm,project}.service.ts` | KEEP | One service per section; explicit projections |
| `dashboard-section-isolation.spec.ts` | KEEP | The strongest spec in the module — deny-before-query for every gated section, with removal proofs written into it |
| `resignation-approval-scope.ts` (+spec) | KEEP | Referenced by the leave service |
| the 9 `*-tenant-isolation.spec.ts` | KEEP | Cross-tenant proof per section |
| `dashboard-{home-scope,hr-events,invalidation,executive-projection,personal-visibility,stats-attendance-tz,project.service}.spec.ts` | KEEP | TZ spec matters given the host-timezone class of bug this repo has hit |
| `dashboard.controller.e2e-spec.ts` | KEEP (thin) | 53 lines; runs only under `test:e2e` and I did **not** run it — see §7 |

### 5.2 Frontend route + composition

| File | Class | Reason |
|---|---|---|
| `app/(authenticated)/dashboard/page.tsx` | KEEP | 5 lines, composes only |
| `app/(authenticated)/dashboard/loading.tsx` | KEEP | Skeleton mirrors the real layout |
| `app/(authenticated)/dashboard/error.tsx` | KEEP | Delegates to `ReportingRouteErrorBoundary` |
| `features/dashboard/dashboard-client.tsx` | KEEP | 216 lines; the one query it fires eagerly feeds an above-the-fold stat card |
| `features/dashboard/dashboard-deferred-body.tsx` | **REFACTORED** | Six below-the-fold cards were statically imported into the first-load graph |
| `features/dashboard/public-documents-card.tsx` | **REFACTORED** | Always-mounted `UploadDocSheet` in the first-load graph + a banned `features/dashboard → features/hr` static import |
| `features/dashboard/home-section-boundary.tsx` (+test) | KEEP | The independence mechanism; its test enforces the boundary for all 22 widgets by source scan |
| `features/dashboard/deferred-dashboard-content.tsx` (+test) | KEEP | IntersectionObserver-absent path falls open, correctly |
| `features/dashboard/dashboard-hydration.ts` (+test) | KEEP | The 1,500 ms setup-banner deadline is the one place a section may gate the page, and it is deliberate and time-boxed |
| `features/dashboard/home-widget-grid.tsx` | KEEP | All 11 widgets already `next/dynamic`; gating verified (see §6) |
| `features/dashboard/use-dashboard-access.ts` | KEEP | Single access resolution shared by every widget |
| `features/dashboard/use-dashboard-stat-cards.ts`, `use-my-pending-documents.ts`, `ticket-types.ts` | KEEP | Small, single-purpose |
| `features/dashboard/use-home-cache-sync.ts` (+test) | KEEP | Invalidates `dashboard.all` on a permissions-version bump |
| `features/dashboard/hr-widgets.tsx` | KEEP, watch | 409 lines — over the 300-line target, under the 500 hard limit; five separately-lazy-loaded widgets in one module, which is what makes them one chunk |
| `features/dashboard/{alerts,expenses,recruitment,payroll,my-attendance}-widget.tsx` | KEEP | Each self-gates and owns its states (§6) |
| `features/dashboard/{sprint,team,my-issues,recent-projects,recent-activity}-card.tsx` | KEEP | Presentational; loading/error/empty from props |
| `features/dashboard/module-setup-banners.tsx` | KEEP | 245 lines; the deadline hook keeps it from holding the page |
| `features/dashboard/quick-actions.tsx` (+test), `guided-tour-overlay.tsx` (+test) | KEEP | Tour is already `ssr:false` dynamic |
| `features/dashboard/home-section-independence.test.tsx` | **NEW** | Section independence had no rendered-output proof |
| `components/dashboard/{my-tasks,timesheet,announcements,upcoming-events,executive-kpi,project-health}-widget.tsx`, `widget-skeleton.tsx` | KEEP | Home widgets living outside `features/dashboard/`; see §7 — folder placement is inconsistent but they are live and correct |
| `lib/home/home-sections.ts`, `home-manifest.generated.json`, `__tests__/{home-sections,access-call-count}.test.ts` | KEEP | Generated artifact + its gate; 20 tests pass |
| `scripts/{check-home-manifest,generate-home-manifest,home-manifest-parse}.mjs` | KEEP | The ownership gate; self-test 14/14 |
| `hooks/api/dashboard.ts` | KEEP | 415 lines, 18 hooks, every one declares a `staleTime` and folds `options?.enabled` correctly (audited — zero clobbered gates) |

### 5.3 `features/employee-self-service/` (5 files)

| File | Class | Reason |
|---|---|---|
| `components/my-documents-page.tsx` | KEEP | Reached from `/me/documents` |
| `components/my-expenses-page.tsx` | KEEP | Reached from `/me/expenses` |
| `components/my-attendance-page.tsx` | KEEP, nit | Reached from `/me/attendance` — but imported by **deep path**, not through the barrel, unlike its three siblings (root §7) |
| `components/my-recruitment-page.tsx` | KEEP | Reached from `/me/recruitment`; 298 lines |
| `index.ts` | KEEP | Barrel; 3 of 4 consumers use it |

**Public landing page: untouched.** No file under `features/landing/**` was read for edit or
modified; `git status` on the frontend shows only the four files listed in §8.

---

## 6. Section-level authorization and privacy — audited

Every Home widget was traced to its hook, its endpoint, its `enabled:` expression and its own
loading/error states. Summary of what holds:

- `hooks/api/dashboard.ts` exports 18 hooks (16 queries, 2 mutations). **Every query declares a
  `staleTime`**, and **no hook re-declares `enabled` after an `...options` spread** — the known
  clobbering defect class in this repo. 14 of the 16 queries compose it as
  `<gate> && (options?.enabled ?? true)`; `usePendingApprovals` uses the strictest destructure-first
  form. The two exceptions, `useUpcomingHolidays` and `useMyLeaveBalance`, accept **no options
  parameter at all**, so a caller cannot pass a gate to them — they are hard-wired to
  `!!orgId && hrEnabled`. That is safe today (both call sites want exactly that) but it is an
  inconsistency worth closing if either widget ever needs a caller-side gate.
- Every gated widget fires against the endpoint's **exact** `@RequirePermission` key, and module-gated
  widgets also check the module. `PayrollWidget`, `ExpensesWidget` and `RecruitmentWidget` return
  `null` before their queries mount.
- `AlertsWidget` fires `/notifications` with only `enabled: !!session?.orgId` — **this is correct, not
  a defect**: notifications are one of the surfaces root `CLAUDE.md` §8 guarantees every active
  member, so there is no key to gate on and the route carries no `@RequireModule`.
- Every widget owns its own skeleton and its own error state; none shares a loading flag with a sibling.
- Server side, `dashboard-section-isolation.spec.ts` proves **deny-before-query**: a section the
  caller cannot see never issues its query (asserted on the service mock, not on the response).

---

## 7. Defects found, with file:line

### Fixed in my territory

| # | Location | Defect |
|---|---|---|
| D1 | `backend/src/modules/dashboard/dashboard-personal.service.ts:76-82` (pre-change) | `Promise.all` over 5 sources with a reject-only `settle` and no deadline — one slow source delayed the entire response (PRD-C087) |
| D2 | `backend/src/modules/dashboard/dashboard-stats.service.ts:29-139` (pre-change) | Same, plus 5 sequential await stages; the employee and project counts were queued behind an organisation lookup neither needs |
| D3 | `backend/src/modules/dashboard/dashboard-section-registry.ts:16-23` | `PermissionSection` could not express a module gate; 7 dual-gated routes recorded the permission and dropped the module |
| D4 | `backend/src/modules/dashboard/dashboard-section-registry.ts:43-65` | `recent-activity`, `today-activities`, `personal`, `stats` were live controller routes with no registry entry |
| D5 | `backend/src/modules/dashboard/dashboard-section-registry.spec.ts:214-217` | The route-coverage assertion was `expect(routeMap.size).toBeGreaterThan(0)` — vacuous, never bit, which is how D4 survived |
| D6 | `frontend/features/dashboard/public-documents-card.tsx:36` + `:222` | `UploadDocSheet` statically imported from `features/hr/**` (banned cross-feature import, root §9) and always mounted, so a click-only Sheet sat in the first-load graph |
| D7 | `frontend/features/dashboard/dashboard-deferred-body.tsx:21-29` | Six cards that render only after intersection were statically imported |

### Found, NOT fixed — in another agent's territory or outside my named paths

| # | Location | Finding | Route to |
|---|---|---|---|
| X1 | `backend/src/modules/notifications/notifications-read.service.ts:334-354` | `queryUnreadCount` costs **12,063 planning buffers / 31.7–50.4 ms planning time** across 49 `notifications` partitions, **on every request and on every tenant including one with zero rows**, because `prepare: false` rebuilds the plan each time. Execution is 1.5 ms. This is by far the most expensive Home source and it is pure planning cost. Likely fix is a narrower partition prune (the retention window currently spans ~90 days ⇒ 4 partitions, but the planner still opens all 49) or a cached counter. **My deadline stops it blanking Home; it does not make it cheap.** | notifications / ticket 15 or 23 |
| X2 | `frontend/components/dashboard/executive-kpi-widget.tsx:11` vs `components/dashboard/project-health-widget.tsx:18` | Both mount the same `dashboard.executive()` query key; `BusinessPulseWidget` gates on `crm:leads:view` but `ExecutiveKpiWidget` does not, so whenever the KPI row is on screen the CRM gate is inert and the query fires anyway. **No data leak** — `BusinessPulseWidget` returns `null` without `crm:leads:view` — but it is a gate that does not gate. `components/dashboard/**` is not in my named territory. | whoever owns `components/dashboard/**` |
| X3 | `frontend/features/dashboard/dashboard-client.tsx:87-89` vs `dashboard-deferred-body.tsx:133` | `useMyIssues` is mounted twice on the same key with different gates. TanStack enables a query if **any** observer enables it, so `/dashboard/my-issues` fires at mount regardless of `deferredVisible`. The eager fetch is intentional (it feeds an above-the-fold stat card), so the real defect is that the deferred observer's `deferredVisible &&` reads as deferral it does not get. Cosmetic; left alone rather than changing above-the-fold behaviour. | ticket 18/19 (query cache contracts) |
| X4 | `frontend/features/dashboard/hr-widgets.tsx:96` and `features/dashboard/team-card.tsx:64` | `LeavesTodayWidget` maps up to `DASHBOARD_LIST_CAP` = 100 rows and `TeamCard` up to one row per person in a 500-punch window, with no client slice — bounded only by the server cap and a CSS `max-h`. Both already receive `hasMore` from the server; only `LeavesTodayWidget` reads it. Not a hang risk at these caps, but it is the pattern frontend §3 warns about. | mine, deferred — low severity, and it changes visible layout |
| X5 | `frontend/features/employee-self-service/components/my-attendance-page.tsx` consumer | `app/(authenticated)/me/attendance/page.tsx:1` imports by deep path while its three siblings import through the barrel (root §7) | mine, cosmetic; the `app/me/**` route is not in my named territory |

### Honest gaps

- **`dashboard.controller.e2e-spec.ts` was NOT run.** `*e2e-spec` files run only under
  `pnpm test:e2e`, which needs a seeded API boot; I did not run it. Reported as **not run**, not as passing.
- **`check:web-vitals-budget` was NOT re-run** and `measuredScriptBytes` / `measuredTotalBytes` /
  `measuredPostLoad*` for `/dashboard` were **NOT re-measured** — both need the Chrome-CDP harness
  plus a minted NextAuth session cookie. Stated in §4.4 and written into the manifest entry.
- **No accessibility axe run.** `jest-axe` is wired into `jest.setup.js` and PRD-C115 names
  "responsive accessibility", but I added no axe assertion for the Home grid and ran none. Open.
- **Repo-wide lint and the full jest suites were not run** — only the four focused patterns above.

---

## 8. Files changed

**`streamlineos-backend`**
```
M src/modules/dashboard/dashboard-personal.service.ts
M src/modules/dashboard/dashboard-stats.service.ts
M src/modules/dashboard/dashboard-section-registry.ts
M src/modules/dashboard/dashboard-section-registry.spec.ts
A src/modules/dashboard/dashboard-section-settle.ts
A src/modules/dashboard/dashboard-home-fanout.spec.ts
```

**`streamlineos-frontend`**
```
M frontend/features/dashboard/dashboard-deferred-body.tsx
M frontend/features/dashboard/public-documents-card.tsx
M frontend/contracts/route-bundle-manifest.json   (only the /dashboard entry)
A frontend/features/dashboard/home-section-independence.test.tsx
```

No file under `features/landing/**` was modified. No budget ceiling was raised.
