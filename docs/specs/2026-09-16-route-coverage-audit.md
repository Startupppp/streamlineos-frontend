# Route coverage audit — Home · HRMS · Documents

> 2026-09-16 · read-only audit, no code changed · deferred until the unified page-state Phase 1 lands
> Method: every route declared in the nav model, `universal-routes.ts`, `route-access-extensions.ts`, `module-manifest.json` and the per-module route constants, set-diffed against every `app/**/page.tsx` on disk, in both directions.

## Headline

| Module | Declared routes | Missing pages | Pages not declared |
|---|---|---|---|
| HRMS | 90 | **0** | **35** (17 under-gated) |
| Home | 30 | **6** | 0 (13 undeclared in nav only, all correctly gated) |
| Documents | 24 | **3** | 8 |

**No sidebar link 404s in any of the three modules.** Every missing page is a declaration nothing links to.

The severe findings are in the opposite direction: pages that exist, are reachable, and inherit a weaker permission than their content warrants.

---

## A. Under-gated HR pages (17) — highest severity

**Root cause.** `/hr/recruitment` declares `hr:requisitions:view` — a read-only key — at `sidebar-nav-groups-recruitment.ts:18`. `routeOwnsPath()` (`components/layout/sidebar/sidebar-nav-items.ts:270-279`) does longest-prefix ownership, so every descendant without its own nav entry inherits that read key. `app/(authenticated)/hr/recruitment/layout.tsx:5-12` adds only an OR over three view keys, which is weaker still.

Their in-app entry point `/hr/recruitment/settings` **does** self-gate on `hr:requisitions:manage` (`page.tsx:73`). The page is manage-gated; its destinations are not. Typing the URL bypasses it.

### Tier 1 — configuration surfaces that mutate hiring policy

| Route | Suggested key | Why |
|---|---|---|
| `/hr/recruitment/hiring-flows` | `hr:requisitions:manage` | pipeline definition |
| `/hr/recruitment/scorecard-templates` | `hr:requisitions:manage` | evaluation criteria |
| `/hr/recruitment/question-bank` | `hr:requisitions:manage` | interview content |
| `/hr/recruitment/automations` | `hr:requisitions:manage` | creates/toggles/deletes automations (`hooks/api/hr/recruitment/automations.ts:84,99,112`) |
| `/hr/recruitment/sla` | `hr:requisitions:manage` | SLA policy |
| `/hr/recruitment/email-sequences` | `hr:requisitions:manage` | sends candidate drip campaigns (`email-sequences-page.tsx:361`) |
| `/hr/recruitment/offer-templates` | `hr:offers:manage` | offer bodies w/ compensation merge fields; sibling `/hr/recruitment/offers` correctly requires `hr:offers:view` |

### Tier 2 — interview analytics bypassing `hr:interviews:view`

`/hr/recruitment/sla-report` · `/hr/recruitment/interviewer-performance` · `/hr/recruitment/scorecard-analytics` → `hr:interviews:view`

### Tier 3 — sensitive / bulk export

| Route | Suggested key | Why |
|---|---|---|
| `/hr/recruitment/diversity-report` | `hr:sensitive:view` | candidate demographics; `/hr/background-verification` uses this key for comparable data |
| `/hr/recruitment/reports` | `hr:export:manage` | ad-hoc candidate/job/offer exports; settings-level export uses this key |
| `/hr/recruitment/headcount` | `hr:requisitions:manage` | approve/reject headcount, create job (`hooks/api/hr/headcount.ts:129,145,161`) |

### Tier 4 — orphans: reachable, gated only by the inherited read key, **no inbound link anywhere**

`/hr/recruitment/recruiters` · `/hr/recruitment/booking-links` · `/hr/recruitment/internal-jobs` · `/hr/recruitment/inbox`

Decide per route: give it a nav entry and a correct gate, or delete it. Leaving them is a permanently unreviewed reachable surface.

> ⚠ **The suggested keys above are LEADS, not findings.** They are inferred from sibling nav routes, the manage-gate on the hub that links to them, and the mutation verbs in the hooks. **The backend `@RequirePermission` decorator on each endpoint was NOT read.** Verify every key against the real decorator before changing it — a wrong tightening locks out legitimate users, and the frontend key must match the backend catalog verbatim or `useCan` is false forever.

### Why the existing guard misses this

`components/layout/sidebar/sidebar-hr-route-gates.test.ts:34-59` asserts every HR page *matches* a permission-owned nav route (`matched: true`). It never asserts the matched permission is **correct**. That is the hole all 17 sit in.

---

## B. Dead route declarations (9)

Declared, nothing links to them, no page on disk. All 404.

| Route | Declared at | Note |
|---|---|---|
| `/home` | `universal-routes.ts:22` | comment calls it a "Home alias"; **no alias mechanism exists**. Product switcher resolves Home → `/dashboard` via the manifest. |
| `/me` | `universal-routes.ts:26` | index-only prefix, acknowledged at `sidebar-nav-items.ts:52`. Arguably intentional — but `app/(authenticated)/me/loading.tsx` exists beside no `page.tsx`. |
| `/announcements` | `universal-routes.ts:63` | real page is `/hr/announcements` |
| `/referrals` | `universal-routes.ts:105` | **superseded by `/me/recruitment`**, which exists and is `requireSession()` only |
| `/jobs` | `universal-routes.ts:110` | same |
| `/support/my` | `universal-routes.ts:100` | nearest real surface is `/support/portal` |
| `/knowledge` | `module-manifest.json:214`, `universal-routes.ts:85`, `sidebar-nav-items.ts:53`, `knowledge-routes.ts:1` | **the kb module's own canonical route.** Gate passes, then Next finds no segment → `not-found.tsx`. Every in-app path deliberately skips it via the href override at `sidebar-products.ts:17-20`. |
| `/kb` | `universal-routes.ts:77` | "Knowledge Base reading is platform core" |
| `/docs` | `universal-routes.ts:81` | same |

### The root cause, and the one fix that prevents recurrence

`lib/rbac/route-access/__tests__/route-access-coverage.test.ts` audits only one direction. It proves every page on disk is declared (`:14-20`), every `ROUTE_ACCESS_EXTENSIONS.prefix` matches a real page (`:34-43`), and every exact `universalDescendant` matches a real page (`:45-53`).

**It never asserts that every `UNIVERSAL_ROUTES[].path` has a page.** That single missing mirror-assertion is why all nine survive.

Worse: `universal-route-matrix.test.ts` **asserts FIVE of the dead routes resolve as universal** — `:75` (`/me`, "self-service root"), `:94` (`/home`), `:98` (`/announcements`), `:103` (`/referrals`), `:104` (`/jobs`). The suite certifies that routes which 404 are correctly accessible. All five rows come out with the declarations.

**A second, independently maintained inventory already agrees the nine are not real.** `lib/rbac/route-access/__tests__/page-level-gates.test.ts:19-40` holds `SESSION_ONLY_BY_DESIGN`, a hand-kept list of genuinely universal surfaces mirroring `UNIVERSAL_ROUTES`. It contains **none** of the nine — no `/home`, `/announcements`, `/referrals`, `/jobs`, `/support/my`, `/knowledge`, `/kb` or `/docs` — while it does include `/knowledge/wiki` (`:31`). It omits precisely the roots with no `page.tsx`. Deleting them aligns the two lists rather than dropping something either relies on.

`/me` is declared in **three** places, all dead: `universal-routes.ts:26`, `page-level-gates.test.ts:28`, `universal-route-matrix.test.ts:75`, plus `sidebar-nav-items.ts:52` documenting it as index-only. If `/me` goes, drop `page-level-gates.test.ts:28` in the same change.

**Fix order matters:** add the assertion and delete the declarations in the same change, or the new test fails on the existing nine.

**Zero-consumer evidence** (whole-repo sweep, excluding `.next-baseline/` compiled bundles): `/home`, `/referrals`, `/jobs` and `/me` are referenced only by their own declaration and test rows. `/support/my` is referenced by `universal-routes.ts:100` and **nothing else, not even a test**. `/announcements`'s only third hit is a backend API path in an outage-retry fixture (`route-error-boundary.test.tsx:23`), not a frontend link.

---

## C. Gating contradictions (2)

Declaration and implementation disagree. Both can deny a user a surface the registry promises them.

1. **`/directory`** — declared universal (`universal-routes.ts:72`, "People directory root is platform core"; asserted by `route-access-coverage.test.ts:117-120`) but `app/(authenticated)/directory/page.tsx:5` calls `requirePermission("directory:people:view")`.
2. **`/me/onboarding`** — sits in the `/me` subtree declared *"no administrative descendants exist here"* (`universal-routes.ts:26-29`) but `page.tsx:9` calls `requireModulePermission("hr", "self:onboarding-tasks")`. A member in an org without the HR module is denied a self-service route. This is the §8 violation class ("employee self-service is platform core, never a paid entitlement") already present in the codebase. The `if (access.isOrgOwner) redirect("/dashboard")` at `:8` reads as a workaround for the same mismatch.

---

## D. Documents: a permission bug worth fixing regardless

`/support/kb/research-briefs` gates on `requirePermission("kb:pages:view")` (`page.tsx:5`), but its own detail route `[briefId]` uses `enforceRouteAccess` (`page.tsx:11`), which resolves by URL prefix to the **Helpdesk** `/support` gate.

A user holding `kb:pages:view` but not `dashboard:support:view` **sees the list and is denied on every row**. That is the "never render a link that predictably ends at Access Denied" rule breaking inside one feature.

Related, lower severity: `sidebar-nav-items.ts:54` labels `/support/kb` product `documents` while its gate resolves through Helpdesk. Worth an explicit `ROUTE_ACCESS_EXTENSIONS` entry so the gate is stated rather than inherited by prefix accident.

---

## E. Stale redirect stub

`/hr/onboarding/my-tasks` is a redirect-only stub to `/me/onboarding` with no inbound link, sitting behind `hr:onboarding:manage`. An ordinary employee following an old bookmark gets Access Denied instead of the redirect the stub exists to serve. Delete it, or move it where its intended audience can use it.

---

## Suggested order

1. **Verify the 17 keys against backend decorators.** Nothing in section A ships before this.
2. **Gate the 17** (or delete the 4 orphans).
3. **Delete the 9 dead declarations AND add the mirror assertion in one change**, plus their rows in `universal-route-matrix.test.ts`. Decide `/knowledge` separately: a `redirect("/knowledge/chat")` stub makes the manifest route honest and collapses all four declarations onto the existing href exception.
4. **Resolve the 2 gating contradictions** — declaration and page must agree, whichever way.
5. **Fix the research-briefs gate mismatch** (section D) and the stale stub (section E).

## Not verified

- 404 behaviour is established statically (no page file, no catch-all, no `proxy.ts` or `next.config.ts` rule). The app was not booted.
- Backend `@RequirePermission` decorators were not read. Section A's keys are inferred.
