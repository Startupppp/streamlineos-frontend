# 06 — Home and self-service — audit at current head

**PRD-C115** (reconstruct current-head Home evidence + KEEP/REFACTOR/REMOVE) ·
**PRD-C144** (concurrent, independent, bounded fanout)

This is a **second-pass audit**. The prior report
`reports/06-home-self-service.md` is read, its claims are re-verified at head below, and
this report pushes into what its "Honest gaps" section left open: responsive
accessibility, representative E2E, the self-service half of the ticket, and the
consequences of the deadline it shipped.

**READ-ONLY. No file in either repository was modified. This report is the only write.**

---

## 0. Head measured at

| Repo | SHA | Branch |
|---|---|---|
| `streamlineos-frontend` | `7469d27895add587f9427e7c50c457f56e0048bf` | `release/code-10-10-v2` |
| `streamlineos-backend` | `2f37e1bb035006e5c03680497298ad62031e79d6` | `release/code-10-10-v2` |

18 backend commits and 8 frontend commits landed since the prior audit's end SHAs
(`93fe5f46` / `778f7d46`). Three touched this ticket's surface:

| Commit | Repo | Effect on this ticket |
|---|---|---|
| `70fbf9e9d` | backend | The prior audit's own fanout/deadline/registry work — **present at head, verified** |
| `372cbc10c` | frontend | The prior audit's own lazy-loading work — **present at head, verified** |
| `cb81230c9` | frontend | Another agent (ticket 18/19) **closed the prior audit's open findings X2 and X3** |

---

## 1. Corpus actually read, with numbers

### 1.1 Backend

| Surface | Count |
|---|---|
| `src/modules/dashboard/` files | **39** (5,742 lines) |
| — non-spec `.ts` | **19** (incl. 1 `.e2e-spec.ts`) |
| — `.spec.ts` | **20** |
| `DashboardController` routes | **18** = 16 `@Get` + 1 `@Post` + 1 `@Delete` |
| Section services | **8** (`stats`, `availability`, `birthdays`, `personal`, `leave`, `announcements`, `crm`, `project`) |
| `DASHBOARD_HOME_SECTIONS` registry entries | **22** |
| Self-service controllers | **5** (`me`, `me/expenses`, `me/attendance`, `me/recruitment`, `me/time-off`) |
| Self-service routes | **28** (7 + 3 + 9 + 2 + 7) |

Every one of the 18 dashboard routes, all 8 section services, the registry, the two
cache-key builders, the settle primitive, the read-limit module and all 4 self-service
controllers plus their scope predicates were read in full.

### 1.2 Frontend

| Surface | Files | Lines |
|---|---|---|
| `features/dashboard/` | 33 (26 source + 7 test) | 4,527 |
| `components/dashboard/` | 7 | 723 |
| `features/employee-self-service/` | 5 | 773 |
| `lib/home/` | 4 | 597 |
| `app/(authenticated)/dashboard/` | 3 | 75 |
| `app/(authenticated)/me/` | 8 | 136 |
| `hooks/api/dashboard.ts` | 1 (18 hooks) | 415 |
| **Total Home + self-service** | **61** | **7,246** |

### 1.3 Commands run, with real exit codes

| Command | Exit | Result |
|---|---|---|
| `jest --maxWorkers=2 --testPathPattern="modules/dashboard/"` (backend) | **0** | 20 suites / **179 tests** pass |
| `jest --maxWorkers=2 --testPathPattern="features/dashboard\|lib/home"` | **0** | 9 suites / **58 tests** pass |
| `jest --runInBand --testPathPattern="lib/query-scope-isolation"` | **0** | 1 suite / 3 tests pass |
| `jest --runInBand --testPathPattern="shared-key-observer-union"` | **0** | 1 suite / 6 tests pass |
| `pnpm check:home-manifest` | **0** | 16 controller routes + 1 external = 17 manifest sections |
| `pnpm check:home-manifest:self-test` | **0** | 14 passed, 0 failed |
| `pnpm check:route-access-contract` | **0** | 26 nav files, 204 permission keys, 633 contract entries |
| `pnpm check:cache-invalidation` (backend) | **0** | 1,076 service files, 187 write / 475 invalidate sites |
| `pnpm check:cache-key-shapes` (backend) | **0** | **ZERO output — nothing was checked (see F11)** |

### 1.4 Database measurements

Local `scratch_head_1010`, as the **non-owner** role `streamline_app`
(`rolbypassrls=f`), with `SET app.organization_id`:

| Measurement | Value |
|---|---|
| `notifications` partitions (`pg_inherits`) | **49** |
| Unread-count query, planning buffers | **13,572–14,053** |
| Unread-count query, planning time | **14.4 ms warm / 73.7–81.7 ms cold** |
| Unread-count query, execution time | **0.69–1.57 ms** |
| `deals.value` type | `numeric(15,2)` |
| `expenses.currency` | `text NOT NULL DEFAULT 'INR'` |

The prior audit's headline number (12,063 buffers / 31.7–50.4 ms) is **independently
reproduced and slightly exceeded** at head on a different database. Planning is 20× execution.

---

## 2. PRD-C144 — concurrent, independent, bounded

### 2.1 What holds (verified, not assumed)

| Property | Evidence at head | Verdict |
|---|---|---|
| Concurrency | `dashboard-home-fanout.spec.ts` barrier requires 5 distinct sections to report in before it opens; a sequential implementation deadlocks. Ran: **pass** | MET |
| Boundedness | `resolvePersonalDashboardModules` (`dashboard-scope.ts:40-45`) derives probes from the **static** `DASHBOARD_HOME_SECTIONS`, not the tenant's module set. Spec runs it at 3 / 23 / 63 available modules: 5 sections, 3 probes, invariant. Ran: **pass** | MET |
| Independence under failure | `settleSection` (`dashboard-section-settle.ts:37-69`) degrades one section on rejection | MET |
| Independence under slowness | Same, on `HOME_SECTION_DEADLINE_MS = 2_500`; the log line `Home section "unreadNotifications" exceeded 2500ms and was abandoned` was observed in the live test run | MET **within the fanout** |
| Frontend independence | `home-section-independence.test.tsx` asserts on rendered output; `home-section-boundary.test.tsx` enforces a boundary per widget by source scan. Ran: **pass** | MET |
| No unbounded read | Every list read capped: `DASHBOARD_LIST_CAP=100`, `DASHBOARD_ATTENDANCE_ROW_CAP=500`, `DASHBOARD_PROJECT_ID_CAP=200`, plus `.limit(20)`, `.limit(50)`, `.limit(3)` | MET |
| No N+1 | 4 loops exist in the dashboard services (`dashboard-availability.service.ts:85,212`, `dashboard-birthdays.service.ts:127,142`); all four iterate already-fetched, capped rows in memory. Zero `await` inside a loop | MET |
| No provider call in a transaction | `grep transaction\|runInTenantTransaction src/modules/dashboard/*.service.ts` → **zero hits** | MET |

### 2.2 What does NOT hold — the deadline does not cover the prologue that gates the fanout

This is the gap the prior audit's fix left. **Both aggregates have an unprotected blocking
`await` in front of the fanout**, so PRD-C144's "renders available sections without waiting
for the slowest one" is true of the five sections and false of the endpoint.

`dashboard-personal.service.ts:46-49`

```ts
const [modules, selfMember] = await Promise.all([
  resolvePersonalDashboardModules(this.access, u),
  this.db.query.organizationMembers.findFirst({ ... }),
]);
```

`dashboard-stats.service.ts:62`

```ts
const flags = await flagsPromise;   // resolveDashboardStatsFlags — no settleSection
```

Neither is wrapped in `settleSection`. Both do real I/O:
`access.moduleAvailability` → `entitlements.getModuleMap` → `cache.cachedForOrg` →
`runInTenantTransaction` → a DB read (`entitlements.service.ts:127-141`); `access.scopeFor`
→ `resolveUserPermissions` → `getPermissionsVersion` → cache → DB.

On `/dashboard/stats` the effect is visible: `orgDataPromise` is started at line 38 **and is
deadline-protected**, yet the response still blocks at line 62 on a gate resolution that has
no ceiling. A stalled access read holds a response whose org section already answered.

`dashboard-home-fanout.spec.ts` hangs the *organization lookup* and individual *sources*; it
never hangs `resolveDashboardStatsFlags`, `resolvePersonalDashboardModules`, or the
`organizationMembers.findFirst`. **No test covers the prologue.**

The frontend mirrors this: `dashboard-hydration.ts:19`
`return !mounted || accessLoading || setupBannersPending;` — the setup-banner slot is
deliberately time-boxed (`isSetupBannerSlotPending`, line 38, honours `deadlineElapsed`),
but `accessLoading` is not. A stalled `/me/access` holds the entire Home page on its skeleton
with no ceiling.

### 2.3 What does NOT hold — 2 of the 5 fanout branches feed nothing

See **F1**. The fanout is bounded and concurrent, but 40 % of it — including the single most
expensive query on the Home surface — computes a value no client reads.

---

## 3. PRD-C115, dimension by dimension

### 3.1 Folder ownership — MET

`check:home-manifest` parses `dashboard.controller.ts` plus a declared allowlist of
`EXTERNAL_HOME_ROUTES` (currently `GET /hr/documents`) and compares each route's
`@Universal()` / `@RequireModule` / `@RequirePermission` against
`lib/home/home-manifest.generated.json`. The backend controller owns Home access; the
frontend manifest is generated. Gate: exit 0, 16 + 1 = 17. Self-test: 14/14.

### 3.2 Universal-versus-module composition — MET

| Kind | Routes | Composition on the client |
|---|---|---|
| `@Universal()` only | 3 (`announcements`, `personal`, `stats`) | mounted for every member |
| `@Universal()` + `@RequireModule` | 5 (`active-sprint`, `birthdays`, `my-issues`, `my-leave-balance`, `upcoming-holidays`) | module gate only |
| `@RequireModule` + `@RequirePermission` | 7 (`leaves-today`, `pending-approvals`, `recent-activity`, `recent-projects`, `team-attendance`, `team-availability`, `today-activities`) | both, verified per widget |
| `@RequirePermission` only | 1 (`executive`) | `hr:analytics:read` |

Spot-checked against the client gates: every gated widget fires against its route's exact
permission key. `AlertsWidget` gating only on `!!session?.orgId` is correct — `/notifications`
carries no `@RequireModule` and is a surface guaranteed to every active member.

### 3.3 Section-level authorization and privacy — MET, with two P2 notes

- Server side, `dashboard-section-isolation.spec.ts` (479 lines, the largest spec in the
  module) proves **deny-before-query** on the service mock for every gated section.
- The prior audit's **X2** (inert CRM gate on `dashboard.executive()`) is **closed at head**:
  `project-health-widget.tsx:19-31` now gates the **mount**, and
  `hooks/api/shared-key-observer-union.test.tsx` bites on it (6 tests, ran, pass).
- The prior audit's **X3** (`useMyIssues` double-mount) is **closed at head**:
  `dashboard-deferred-body.tsx:153-159` now states the real condition in a comment rather
  than an unachievable `deferredVisible &&`.
- `ExecutiveKpiWidget` renders MRR / pipeline / conversion to an `hr:analytics:read` holder,
  but the **server** withholds those fields unless `canSeeCrm(u)` (`dashboard-crm.service.ts:95-98`
  = CRM module **and** `crm:leads:view`), and the widget guards on `data.mrr !== undefined`.
  **No leak.**
- Self-service reads fail closed: `attendance-read.service.ts:113-117` throws
  `ForbiddenException` when `scope !== "all" && userId !== u.userId`;
  `selfExpensePageDataSchema = pageDataSchema.omit({ userId: true })` strips the impersonation
  filter and `SELF_ONLY_SCOPE` forces `eq(expenses.userId, userId)`.
- Notes: **F10** (`team-calendar` is org-wide and projects `email`), **F7** (error states unannounced).

### 3.4 Bounded parallel queries — MET (see §2.1)

### 3.5 Independent loading and error states — **PARTIALLY MET**

Structurally correct: 11 widgets in `home-widget-grid.tsx:107-149`, each in its own
`HomeSectionBoundary`; every widget owns its own skeleton and error branch; no widget shares
a loading flag with a sibling.

But **a degraded section is rendered as data, not as an error** — see **F3**, the highest-value
finding in this report. `/dashboard/stats` returns `null` for a failed or timed-out section
with no degradation signal, and `use-dashboard-stat-cards.ts:30,39,48` coerces it with `?? 0`.

### 3.6 Cache and query keys — MET on tenancy, defective on two dimensions

**Tenant dimension: MET, and proved.** No dashboard query key carries an orgId —
`queryKeyBase = ["streamlineos"]` (`lib/query-keys/base.ts:1`). The org and user dimension is
injected at the **hash function**: `scopedQueryKeyHashFn(scope)` where
`scope = authenticated:${orgId}:${userId}` (`lib/query-scope.ts:28-39`), plus a `key={scope}`
remount of the provider. I ran `lib/query-scope-isolation.test.tsx`: 3 tests pass, including
one that proves the guard bites by showing a plain `QueryClient` **does** expose cross-org data.
This is the repo's most-repeated failure shape and Home is clean on it.

**Defective:** **F4** (`useExpensePageData` key omits the endpoint-selecting `selfService`
dimension), **F5** (registry `cacheScope` declarations are inert and 4 of 6 diverge),
**F6** (two Home cache entries go to the global Redis, unprefixed, never invalidated).

Server-side keys are correct on tenancy: every one embeds `orgId`
(`buildOrgDashboardCacheKey`, `buildScopedDashboardCacheKey`,
`CACHE_KEYS.announcementsList(orgId)`, `CACHE_KEYS.executiveDashboard(orgId, …)`), and the
scoped builder adds `u${userId}:v${permissionsVersion}`.

Hook hygiene at head: 18 hooks, 16 queries + 2 mutations, **every query declares a
`staleTime`**, and **no hook re-declares `enabled` after an `...options` spread**.
`usePendingApprovals` uses the strictest destructure-first form. `useUpcomingHolidays` and
`useMyLeaveBalance` accept no options at all.

### 3.7 Responsive accessibility — **NOT MET** (the prior audit's largest open gap)

**Responsive: adequate.** `home-widget-grid.tsx:106`
`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3`; `dashboard-deferred-body.tsx` carries
12 breakpoint-prefixed classes.

**Accessibility: measured, and it is thin.**

| Measure | Value |
|---|---|
| a11y test files in the repo | 11 |
| …that touch Home | **1** (`features/__tests__/modules-content-a11y.test.tsx:233-250`) |
| Home axe assertions | **1**, over the 40-line `HomeSectionBoundary` |
| Home lines covered by axe | **40 of 7,246** (0.55 %) |
| Home files rendering an error branch | 15 |
| …carrying `role="alert"` or `aria-live` | **6** |
| …carrying neither | **9** |

Zero axe coverage of the widget grid, any widget, the stat-card row, the deferred body, or
any of the four `/me/*` self-service pages. See **F7**.

### 3.8 Representative E2E — **NOT MET**

| Spec | Lines | What it asserts |
|---|---|---|
| `dashboard.controller.e2e-spec.ts` | 53 | **18 × "401 without a token"**. Nothing else. |
| `me.e2e-spec.ts` | 68 | 5 tests, all on `GET /me` identity resolution. Good tests, one route. |

There is **no authenticated E2E on any Home route**, no cross-tenant E2E, no
section-independence or degraded-path E2E. Playwright is installed but there is **no
`e2e/` directory and no `playwright.config`** in the frontend — the only browser harness is
`scripts/measure-web-vitals.mjs` over CDP. Three of the four self-service controllers have
**no controller test of any kind** — see **F8**.

I did **not run** `dashboard.controller.e2e-spec.ts`: `*e2e-spec` files require
`pnpm test:e2e` and a seeded API boot, which is outside the laptop budget for 26 concurrent
agents. **NOT MEASURED.**

### 3.9 KEEP / REFACTOR / REMOVE — **REMOVE count 0, independently re-verified**

I re-derived reachability at head rather than trusting the prior audit: 38 Home source files
scanned for an importer via both `@/`-alias and relative-path forms. **All 38 are reached.**
The 10 that a naive alias-only scan flags are reached by relative import
(`./dashboard-hydration`, `./ticket-types`, `./use-home-cache-sync`,
`./dashboard-deferred-body`, `./deferred-dashboard-content`, `./guided-tour-overlay`,
`./home-widget-grid`) or through the barrel (`features/employee-self-service/index.ts`, 4
exports). This is the "done ≠ reachable" trap; it does not apply here.

**Classification at head** (deltas from the prior audit's table only; its KEEP rows stand):

| File | Class | Reason |
|---|---|---|
| `backend/dashboard-personal.service.ts` | **REFACTOR** | F1 (2 dead branches), F2 (unprotected prologue) |
| `backend/dashboard-stats.service.ts` | **REFACTOR** | F2 (unprotected `await flagsPromise`), F3 (`null` with no degradation signal) |
| `backend/dashboard-leave.service.ts` | **REFACTOR** | F5/F6 — hand-rolled key, global Redis, never invalidated |
| `backend/dashboard-crm.service.ts` | **REFACTOR** | F6 — `cache.cached` where the module standard is `cachedForOrg` |
| `backend/dashboard-section-registry.ts` | **REFACTOR** | F5 — `cacheNs`/`cacheScope` read by no production code |
| `backend/dashboard-home-fanout.spec.ts` | **REFACTOR** | F2 — no prologue coverage |
| `backend/dashboard.controller.e2e-spec.ts` | **REFACTOR** | §3.8 — 18 × 401 is not representative E2E |
| `frontend/use-dashboard-stat-cards.ts` | **REFACTOR** | F3 — `?? 0` turns a failed section into "0" |
| `frontend/components/ui/widget-card.tsx` | **REFACTOR** | F7 — the shared error surface announces nothing |
| `frontend/hooks/api/hr/expenses.ts` | **REFACTOR** | F4 — key omits the endpoint dimension |
| `frontend/features/hr/expenses/expense-list.tsx` | **REFACTOR** | F9 — `formatINR` ignores `expenses.currency` |
| everything else (27 files) | **KEEP** | reachable, single-purpose, correct |
| **REMOVE** | **0 files** | nothing in the Home or self-service surface is dead |

**Public landing page untouched.** No file under `features/landing/**` was read for edit or
modified; this audit made no writes at all.

---

## 4. Findings

| # | Sev | Location | Summary |
|---|---|---|---|
| F1 | **P1** | `backend/src/modules/dashboard/dashboard-personal.service.ts:165` | 2 of 5 fanout branches feed nothing; the dead one is the most expensive query on Home |
| F2 | **P1** | `backend/src/modules/dashboard/dashboard-stats.service.ts:62` | The section deadline does not cover the prologue that gates the fanout |
| F3 | **P1** | `frontend/features/dashboard/use-dashboard-stat-cards.ts:30` | A failed/timed-out stats section renders as **"0"**, indistinguishable from an empty org |
| F4 | **P1** | `frontend/hooks/api/hr/expenses.ts:49` | Query key omits the `selfService` dimension that selects the endpoint |
| F5 | P2 | `backend/src/modules/dashboard/dashboard-section-registry.ts:66` | `cacheScope`/`cacheNs` are inert; 4 of 6 "scoped" sections diverge |
| F6 | P2 | `backend/src/modules/dashboard/dashboard-leave.service.ts:91` | Two Home cache entries use the global Redis, unprefixed, never invalidated |
| F7 | P2 | `frontend/components/ui/widget-card.tsx:88` | 9 of 15 Home error surfaces are not announced; Home axe coverage is 40 of 7,246 lines |
| F8 | P2 | `backend/src/modules/dashboard/dashboard.controller.e2e-spec.ts:48` | 19 self-service routes have no controller test; Home E2E is 18 × 401 |
| F9 | P2 | `frontend/features/hr/expenses/expense-list.tsx:268` | `formatINR` ignores the per-row `expenses.currency` (latent — no writer today) |
| F10 | P2 | `backend/src/modules/hr/time/leaves.service.ts:204` | `/me/time-off/team-calendar` is org-wide, not team, and projects each person's `email` |
| F11 | P2 | `backend/package.json` (`check:cache-key-shapes`) | A gate script over a library module: no output, exit 0, nothing checked |

### F1 — P1 — `/dashboard/personal` computes 2 of 5 branches for data no client reads

**File:** `streamlineos-backend/src/modules/dashboard/dashboard-personal.service.ts:165-169`
(`unreadNotifications`) and `:104-110` (`leaveBalance`).

**Evidence.** `unreadNotifications` occurs **exactly once** in the entire frontend — as a type
field at `frontend/hooks/api/dashboard.ts:320`. `leaveBalance` from this aggregate occurs
exactly once, at `:318`. `usePersonalDashboard` has exactly **3** consumers
(`my-tasks-widget.tsx:25`, `timesheet-widget.tsx:11`, `upcoming-events-widget.tsx:58`), and
they read `myTasks`, `timesheetStatus` and `upcomingEvents`. The leave balance Home actually
renders comes from a **different** route: `hr-widgets.tsx:162` `useMyLeaveBalance()` →
`GET /dashboard/my-leave-balance`.

**Measured cost of the dead branch** (`scratch_head_1010`, `streamline_app`, `SET app.organization_id`):

```
Planning:  Buffers: shared hit=14053        Planning Time: 14.422 ms   (warm)
Planning:  Buffers: shared hit=13572 read=481  Planning Time: 81.743 ms (cold)
                                             Execution Time: 0.691–1.574 ms
```

49 partitions on `notifications` (`pg_inherits`). Planning is **20× execution**, and the cost
is invariant to tenant size — the plan opens all 49 partitions even when execution prunes to 4.

**Failure scenario.** A tenant loads Home. `/dashboard/personal` fans out to 5 sources. The
`unreadNotifications` source misses its 30-second `cachedVersioned` window (`CACHE_TTL.SHORT`)
— which it does at least twice a minute per active user — and spends 14 ms of planning across
14,053 buffers producing a count that **no component in the frontend renders**. Under Redis
loss (`cache.cached` falls through to the fetcher when `redis` is null) it is every request.
It is also the source that forced `HOME_SECTION_DEADLINE_MS` into existence, so the most
expensive and most timeout-prone branch of the Home fanout is dead weight.

**Proposed fix.** Delete the `unreadNotifications` and `leaveBalance` branches from
`getPersonalDashboard` and drop the two fields from the response type, narrowing the fanout
from 5 to 3. If either is wanted later, wire it to a consumer **and** its `degraded` entry in
the same change. Add an assertion to `dashboard-home-fanout.spec.ts` pinning the branch count
so a re-added dead branch is caught.

### F2 — P1 — the section deadline does not cover the prologue that gates the fanout

**Files:** `streamlineos-backend/src/modules/dashboard/dashboard-stats.service.ts:62`;
`dashboard-personal.service.ts:46-49`. Frontend mirror:
`frontend/features/dashboard/dashboard-hydration.ts:19`.

**Evidence.** `settleSection` wraps every *section*. It wraps neither
`resolveDashboardStatsFlags` (awaited bare at `dashboard-stats.service.ts:62`) nor
`resolvePersonalDashboardModules` / the `organizationMembers.findFirst`
(awaited bare at `dashboard-personal.service.ts:46`). Both do real I/O:
`entitlements.service.ts:127-141` shows `getModuleMap` reaching
`cachedForOrg` → `runInTenantTransaction` → a DB read; `access.scopeFor` →
`resolveUserPermissions` → `getPermissionsVersion` → cache → DB.

`dashboard-home-fanout.spec.ts` (429 lines, 12 tests) hangs the organization lookup and
individual sources. `grep` of its test names shows **no test hangs the gate resolution**.

**Failure scenario.** The org-modules read stalls (Redis timeout falling through to a slow
Postgres, or the `entitlements` cache stampeding on a version bump). `/dashboard/stats` has
already resolved `orgDataPromise` inside its 2,500 ms ceiling, but the handler is parked at
line 62 with no ceiling at all, so the whole response hangs — the exact condition PRD-C144
forbids, one layer above where the fix was applied. `/dashboard/personal` is identical: all
five sections are still unstarted while line 46 blocks.

**Proposed fix.** Wrap both prologues in `settleSection` with a fail-closed fallback
(`{build:false, timesheets:false, hr:false}` / `{employees:false, attendance:false,
projects:false}` — deny on timeout, never fail open) and report the degradation. Add two tests
to `dashboard-home-fanout.spec.ts` that hang `resolveDashboardStatsFlags` and
`resolvePersonalDashboardModules` and assert the endpoint still answers. On the frontend,
give `accessLoading` the same time-boxing `isSetupBannerSlotPending` already applies.

### F3 — P1 — a failed stats section renders as "0", not as an error

**File:** `frontend/features/dashboard/use-dashboard-stat-cards.ts:30`, `:39`, `:48`;
producer at `streamlineos-backend/src/modules/dashboard/dashboard-stats.service.ts:32`, `:87`, `:107`, `:134`.

**Evidence.**

```ts
// dashboard-stats.service.ts:31-32 — no onDegraded, deliberately
const settle = <T>(name, run, fallback) =>
  settleSection({ name, run, fallback, logger: this.logger, context: `org ${orgId}` });
// fallbacks at :87, :107, :134 are all `null`
// response at :139-145 has NO `degraded` field
```

```ts
// use-dashboard-stat-cards.ts:30,39,48
value: stats.totalEmployees ?? 0,
value: stats.presentToday   ?? 0,
value: stats.activeProjects ?? 0,
```

`/dashboard/personal` **does** return `degraded` and three widgets read it
(`my-tasks-widget.tsx:27`, `timesheet-widget.tsx:13`, `upcoming-events-widget.tsx:60`).
`/dashboard/stats` returns none, so the `null` is unattributable on the wire.

**Failure scenario.** An org with 500 employees loads Home. The employee-count query rejects
(or, since the prior audit's change, merely exceeds 2,500 ms — a widened trigger). The service
returns `totalEmployees: null` with no signal. The Home stat card renders **"Total Employees
0"** in the most prominent position on the page. An operator reads it as a real number: the
org looks empty, or looks like every employee was deleted. It is indistinguishable from a
genuinely empty tenant, and there is no retry affordance because nothing knows it failed.
`presentToday` and `activeProjects` behave identically.

This is the "error surfaced as an empty state" shape, and the deadline the prior audit shipped
made it fire more often. The prior audit's stated reason for omitting `degraded` from
`/dashboard/stats` — preserving the response contract ticket 04 owns — is what produced it.

**Proposed fix.** Pass `onDegraded` in `dashboard-stats.service.ts:32` and add
`degraded: string[]` to the `/dashboard/stats` response (an **additive** field — it does not
break the existing contract). In `use-dashboard-stat-cards.ts`, replace `?? 0` with a
`value: null` that the card renders as an error/retry rather than a number. Add a test that
degrades one stats section and asserts the card does **not** show `0`.

### F4 — P1 — the expenses query key omits the dimension that selects the endpoint

**File:** `frontend/hooks/api/hr/expenses.ts:49` (key) vs `:64` (endpoint).

```ts
enabled: (options?.selfService === true || (canExpenses && accountingEnabled)) && (options?.enabled ?? true),
queryKey: [...queryKeys.hr.expenses(), "pageData", params] as const,   // :49 — no selfService
queryFn: … apiClient.get(options?.selfService ? "/me/expenses" : "/hr/expenses/page-data", …)  // :64
```

Two endpoints with different scopes (self-only vs org-wide) share one cache key.

**Failure scenario — reachable on every cold load of `/hr/expenses` by an approver.**

1. `usePermissionGate` returns `allowed: false` while `/me/access` is in flight
   (`hooks/api/access.ts:76` — `data ? … : false`), so `isAdmin = useCan("hr:expenses:approve")`
   is `false` on first render (`expenses-page.tsx:54`).
2. `useExpenseFilters({ defaultPageSize: isAdmin ? 4 : 5 })` seeds `pageSize = 5` — and
   `filters` is a **`useState` initializer** (`hooks/common/use-expense-filters.ts:141`), so it
   never changes when `defaultPageSize` does.
3. `useExpensePageData(params, { selfService: !isAdmin })` (`expenses-page.tsx:100`) fires
   `GET /me/expenses` under key `K = ["streamlineos","hr","expenses","pageData",{page:1,pageSize:5,sortBy:"date",sortOrder:"desc"}]`.
4. `/me/access` resolves; `isAdmin` flips to `true`; `selfService` flips to `false`. **`params`
   — and therefore `K` — are unchanged.** TanStack does not refetch on a `queryFn` identity
   change, only on a key or `enabled` change.
5. `expenses-page.tsx:252` takes the `if (isAdmin)` branch and renders `AdminExpenseList`
   over the **member-scoped** payload, with `isAdmin: false` in the body, missing admin stats
   and missing every other employee's claim — until the next window-focus refetch.

An approver reviewing pending reimbursements sees only their own and concludes the queue is
empty. Not a cross-user leak (the scoped hash `authenticated:org:user` confines the entry to
one viewer, and the narrowing direction never widens access), but a silent authorization-shaped
correctness defect on a money surface.

**Proposed fix.** Put the endpoint in the key:
`queryKey: [...queryKeys.hr.expenses(), "pageData", options?.selfService ? "self" : "org", params]`.
Add a test that flips `selfService` under a stable `params` and asserts a second fetch is issued.

### F5 — P2 — the registry's `cacheScope`/`cacheNs` are inert; 4 of 6 "scoped" sections diverge

**File:** `streamlineos-backend/src/modules/dashboard/dashboard-section-registry.ts:66-72`.

`grep -rn "cacheNs\|cacheScope" src/` outside the registry file returns **4 hits, all inside
`dashboard-section-registry.spec.ts`**, and both assert only that the string is non-empty /
one of two values. No production code reads either field.

`buildScopedDashboardCacheKey` — the only builder that adds `u${userId}:v${permissionsVersion}`
— has **2 production callers** (`dashboard-availability.service.ts:47`, `:138`) against **33
spec references**. Against the 6 sections the registry declares `cacheScope: "scoped"`:

| Section | Declared | Actual |
|---|---|---|
| `team-availability` | scoped | `cachedForOrg` + scoped builder ✓ |
| `team-attendance` | scoped | `cachedForOrg` + scoped builder ✓ |
| `leaves-today` | scoped | **no cache at all** (`dashboard-leave.service.ts:47-88`) |
| `recent-projects` | scoped | **no cache at all** (`dashboard-project.service.ts:42`) |
| `recent-activity` | scoped | **no cache at all** (`dashboard-project.service.ts:197`) |
| `pending-approvals` | scoped | **hand-rolled string** (`dashboard-leave.service.ts:124`) |

`today-activities` is declared `cacheScope: "org"` and also does not cache.

**Failure scenario.** `dashboard-invalidation.spec.ts:120` and `dashboard-cache-key.spec.ts:77,86,104`
test `buildScopedDashboardCacheKey(access, u, "pending-approvals", …)` — a call the production
path **never makes**. Those tests are green over a dead path: they prove the per-user,
permission-versioned separation of a key that `getPendingApprovals` does not use. A future
change to the hand-rolled key at `dashboard-leave.service.ts:124` — say dropping `audience`,
which is the only thing separating one manager's queue from another's under `scope: "team"` —
would be caught by nothing. This is the repo's documented `gate-corpus.mjs` class.

**Proposed fix.** Either make `cacheScope`/`cacheNs` load-bearing (a helper that takes a
registry key and produces the key, so a declaration and its implementation cannot diverge) or
delete the two fields. Then add a FAIL-CLOSED test — in the same spirit as the two the prior
audit added for route coverage — asserting every `cacheScope: "scoped"` section resolves its
key through the scoped builder.

### F6 — P2 — two Home cache entries go to the global Redis, unprefixed, and are never invalidated

**Files:** `dashboard-leave.service.ts:91-92` and `:124-127`; `dashboard-crm.service.ts:169`.

`cachedForOrg` resolves **the org's regional Redis** and a **cell-prefixed key**
(`cache-region-router.ts:35-58`: `redisForOrg` → `getRegionRegistry().cacheConfigForOrg(orgId)`;
`scopedKey` → `${prefix}:${orgId}:${localKey}`). Bare `cached` (`cache.service.ts:85-87`) does
neither. Six of the nine dashboard cache sites use `cachedForOrg`; these three do not.

`check-cache-key-shapes.mjs`'s own header names this exact asymmetry as the defect class it
exists for: *"`<ORG>:` is deliberately NOT normalised away. The `*ForOrg` family prefixes the
org and resolves the org's Redis cell; the global family does neither."*

`grep -rn "my-leave-balance\|pending-approvals" src/` shows **zero invalidate sites** for
either shape — both rely on `CACHE_TTL.SHORT` (30 s) expiry alone.

**Failure scenario.** (a) An org placed in a non-default region has its leave balances,
its pending-approval counts and its executive KPIs (headcount, open roles, MRR, pipeline
value) written to the **default region's** Redis rather than its own — a placement/residency
break that `withNewOrgInRegion` exists to prevent, and one that a cell-recovery purge by prefix
would miss. (b) An HR admin approves a leave request; nothing invalidates
`dashboard:pending-approvals:*`, so the Home approvals widget keeps showing the pre-approval
count for up to 30 s with no way to force it.

**Proposed fix.** Move all three to `cachedForOrg` with keys from
`buildScopedDashboardCacheKey` / `buildOrgDashboardCacheKey`, and add
`invalidateForOrg` calls on the leave-approve and leave-balance write paths.

### F7 — P2 — Home error states are not announced, and Home's axe coverage is 0.55 %

**Files:** `frontend/components/ui/widget-card.tsx:86-88` (the shared surface for `my-tasks`,
`timesheet` and `upcoming-events`); `components/dashboard/executive-kpi-widget.tsx:16-26`;
`components/dashboard/project-health-widget.tsx:50-57`;
`components/dashboard/announcements-widget.tsx:222-224`;
`features/dashboard/team-card.tsx:51-53`.

Each renders `<p className="text-sm text-destructive">{…}</p>` with **no `role="alert"` and
no `aria-live`**. Six Home files do carry `role="alert"` (via `ErrorState`, or inline);
nine do not.

**Failure scenario.** A screen-reader user opens Home. Three widgets fail. The visual user
sees three red messages; the screen-reader user is told nothing at all — focus stays where it
was, no live region fires, and the Retry buttons are unlabelled by any announcement of what
they retry. The user has no way to know the page is partly broken.

**Coverage measured, not asserted:** 11 a11y test files exist; exactly one touches Home
(`features/__tests__/modules-content-a11y.test.tsx:233-250`), with **1 axe assertion** over
the 40-line `HomeSectionBoundary`. That is **40 of 7,246 lines**. No axe coverage of the
widget grid, any widget, the stat-card row, or any `/me/*` page.

**Proposed fix.** Add `role="alert"` to `widget-card.tsx:87` — one edit covers three widgets —
and to the four bare error branches. Add a `home-a11y.test.tsx` running `expectNoAxeViolations`
over `HomeWidgetGrid` and the four self-service pages in loading, loaded, empty and error
states. `jest-axe` and `test-utils/axe.ts` are already wired; nothing new is needed.

### F8 — P2 — 19 self-service routes have no controller test; Home E2E is 18 × 401

**Files:** `backend/src/modules/dashboard/dashboard.controller.e2e-spec.ts:48`;
`src/modules/expenses/employee-expenses.controller.ts`;
`src/modules/hr/time/employee-attendance.controller.ts`;
`src/modules/hr/time/employee-time-off.controller.ts`.

| Controller | Routes | `.spec.ts` | `.e2e-spec.ts` |
|---|---|---|---|
| `employee-expenses` | 3 | **none** | **none** |
| `employee-attendance` | 9 (4 `@Idempotent` writes) | **none** | **none** |
| `employee-time-off` | 7 | **none** | **none** |
| `employee-recruitment` | 2 | ✓ | none |
| `dashboard` | 18 | (11 unit specs) | 53 lines, 18 × 401 only |

**Failure scenario.** `employee-attendance.controller.ts` carries the self-service check-in,
check-out and break toggles — three `@Idempotent` writes on a payroll-adjacent surface — with
zero controller-level coverage. A regression that drops `user.userId` from
`attendance.logs(user, undefined, …)` (`:106`) and lets `requestedUserId` through would be
caught by no test in either repo; only the service-layer guard at
`attendance-read.service.ts:113-117` stands between it and a cross-user attendance read.

**Proposed fix.** Add a `*.e2e-spec.ts` per self-service controller asserting, per route:
401 unauthenticated, 403 without the `self:*` permission, and 200 returning **only** the
caller's rows. Extend `dashboard.controller.e2e-spec.ts` beyond 401 with at least one
authenticated cross-tenant assertion and one degraded-section assertion.

### F9 — P2 (latent) — `formatINR` ignores the per-row `expenses.currency`

**File:** `frontend/features/hr/expenses/expense-list.tsx:268` — `return formatINR(expense.amount);`
`lib/format-utils.ts:90-100` hardcodes `currency: "INR"`. The row type declares
`currency: string | null` (`types/hr/expenses.ts:54`, `:114`) and the renderer never reads it.
`MemberExpenseList` is what `/me/expenses` renders (`my-expenses-page.tsx:188`).

**Honest severity.** Measured on `scratch_head_1010`: `expenses.currency` is
`text NOT NULL DEFAULT 'INR'`, and `grep -rn "currency" src/modules/expenses/*.ts` returns
**zero writers** — no backend path sets it and neither `createExpenseSchema` nor the create
dialog exposes it. Every row is `'INR'` today, so the display is correct **in practice**.
This is a latent defect, not a live one, and I am not claiming otherwise.

**Failure scenario (on the first writer).** The moment an import path, an integration, or a
new field sets `currency = 'USD'`, `/me/expenses` renders a `$250.00` claim as `₹250.00` —
off by ~84×. An employee reads their own reimbursement as ₹250 instead of ~₹21,000.

**Proposed fix.** Either format from `expense.currency` (falling back to the org's currency),
or drop the column and the type field so the model stops promising a dimension nothing honours.

### F10 — P2 — `/me/time-off/team-calendar` is org-wide and projects `email`

**File:** `backend/src/modules/hr/time/employee-time-off.controller.ts:66-70` →
`src/modules/hr/time/leaves.service.ts:178-211`, `email` projected at `:204`.

`teamCalendar` calls `this.leaves.thisWeek(user.orgId)` — org-scoped, `limit: 100`, no N+1
(`getFactsBatch` at `:213`), correctly tenant-predicated. But: it is gated by
`@RequirePermission("self:leaves")`, the weakest self-service grant, and it returns **every
approved leave in the organization this week** — not the caller's team, despite the route name
— with each person's `id`, `name`, `firstName`, `lastName`, **`email`** and `image`.

**Failure scenario.** A contractor granted only `self:leaves` calls
`GET /me/time-off/team-calendar` and receives up to 100 colleagues' email addresses. Whether
that is disclosure depends on whether the directory is member-visible in this deployment, but
the **`email` projection is not needed by the calendar UI**, which renders name, avatar and
designation. This is unnecessary surface on the weakest permission in the system.

**Proposed fix.** Drop `email` from the projection at `leaves.service.ts:204`. Separately,
decide whether the route should be scoped to the caller's reporting line — if it should, rename
it or apply `applyScope`; if org-wide is intended, rename it away from "team".

### F11 — P2 — `check:cache-key-shapes` checks nothing

`pnpm check:cache-key-shapes` produces **zero output** and exits **0**.
`src/scripts/check-cache-key-shapes.mjs` (339 lines) is a **library module** consumed by
`check-cache-invalidation.mjs`; run directly it only evaluates exports. A green exit here is
"nothing to check", not "0 violations" — the exact class `src/scripts/gate-corpus.mjs`
documents. Ticket 30's territory; recorded here because I ran it as part of this audit and it
would otherwise be counted as a pass.

---

## 5. What head already gets right

Verified at head, not assumed:

1. **Cross-tenant query isolation on Home.** No dashboard key carries an orgId, but
   `scopedQueryKeyHashFn` hashes every key under `authenticated:${orgId}:${userId}`
   (`lib/query-scope.ts:38`) and the provider remounts on `key={scope}`. I ran
   `lib/query-scope-isolation.test.tsx`: 3 pass, including a bite test proving a plain
   `QueryClient` *does* leak. This is the repo's most-repeated failure shape and Home is clean.
2. **Folder ownership is enforced, not documented.** `check:home-manifest` exit 0
   (16 + 1 = 17); self-test 14/14. The frontend manifest is generated from the backend
   controller and cannot be hand-written.
3. **The fanout is concurrent and bounded, and both are proved by construction** —
   a barrier that deadlocks a sequential implementation, and a probe count invariant across
   3 / 23 / 63 available modules.
4. **`settleSection` works.** 179 backend tests pass and the abandonment log line was observed
   live in the run.
5. **Deny-before-query.** `dashboard-section-isolation.spec.ts` (479 lines) asserts on the
   service mock that a denied section never issues its query.
6. **Every list read is capped**, with `boundedDashboardList` reporting the true total instead
   of truncating silently. Zero N+1. Zero provider calls inside a transaction.
7. **Self-service reads fail closed**: `selfExpensePageDataSchema` omits `userId`;
   `SELF_ONLY_SCOPE` forces `eq(expenses.userId, userId)`; `attendance.logs` throws
   `ForbiddenException` rather than falling open.
8. **`/me/*` route-level access is coherent**: the routes are declared **universal**
   (`lib/rbac/route-access`), the page calls `requireSession()`, and the backend enforces
   `self:*` per controller. A denied read renders `ErrorState`, not an empty state
   (`my-expenses-page.tsx:160-167` gates the empty state on `Boolean(data)`).
9. **The prior audit's X2 and X3 are closed** by `cb81230c9`, with a bite test
   (`shared-key-observer-union.test.tsx`, 6 tests, ran, pass).
10. **REMOVE count 0**, independently re-derived over 38 source files at head.
11. **Hook hygiene**: 18 hooks, every query declares `staleTime`, no `enabled` clobbered by an
    `...options` spread.
12. **Public landing-page visuals and animations untouched.**

---

## 6. Blocked on infrastructure — NOT MEASURED

| Item | Blocker | What would measure it |
|---|---|---|
| `dashboard.controller.e2e-spec.ts` | Needs `pnpm test:e2e` + a seeded API boot; outside the laptop budget with 26 concurrent agents | `pnpm -C streamlineos-backend test:e2e --testPathPattern="dashboard.controller"` against a seeded local Postgres |
| `measuredScriptBytes` / `measuredTotalBytes` for `/dashboard` | Needs the Chrome-over-CDP harness driving `next start` **plus a minted NextAuth session cookie**; the manifest's 604,993 still comes from build `sDZBsbi1qW6Z9JlIhCg68` and now overstates the route by the ~19,444 B the prior audit removed | `node scripts/measure-web-vitals.mjs --cookie-file=<minted session cookie>` over a `next start` |
| `check:web-vitals-budget` | Same harness dependency | as above |
| Axe over the Home grid and the four `/me/*` pages | No harness gap — `jest-axe` and `test-utils/axe.ts` are wired. **Blocked only by this wave being read-only**: the test file does not exist and I may not create it | Add `features/dashboard/home-a11y.test.tsx` and run `jest --testPathPattern="home-a11y"` |
| F2's prologue-stall proof | Same: the test does not exist and I may not add it. The finding is established by reading the unprotected `await` and confirming both callees do DB I/O, not by a hang test | Two tests in `dashboard-home-fanout.spec.ts` hanging `resolveDashboardStatsFlags` and `resolvePersonalDashboardModules` |
| Frontend production build / typecheck | Explicitly prohibited by the wave brief (8–12 GB each) | run centrally by the orchestrator |

---

## 7. Verdict

**PRD-C115 — PARTIALLY MET.** Six of the eight named dimensions are met with evidence
(folder ownership, universal-vs-module composition, section authorization/privacy, bounded
parallel queries, cache/query keys on tenancy, KEEP/REFACTOR/REMOVE with REMOVE = 0).
**Independent loading/error states is only partially met** — F3 shows a failed section
rendering as a number. **Responsive accessibility is not met** — 0.55 % axe coverage and
9 unannounced error surfaces. **Representative E2E is not met** — 18 × 401 and nothing else,
with 19 self-service routes untested.

**PRD-C144 — PARTIALLY MET.** Concurrency and boundedness are met and well proved.
Independence is met *within* the fanout and **not met for the endpoint**: both aggregates
block on an unprotected prologue (F2), and 40 % of the fanout — including its single most
expensive branch — feeds nothing (F1).

The four P1 findings are all in code the prior audit touched or created, and none of them
contradict its work; they are the next layer down.
