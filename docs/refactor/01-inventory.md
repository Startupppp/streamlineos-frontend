# 01 — Build Module Inventory (Phase 1 Recon)

**Date:** 2026-07-31
**Scope:** Build module ONLY (narrowed by user mid-task; CRM and freelancer domains excluded)
**Method:** 7 parallel read-only recon lanes + orchestrator verification. No sampling.
**Status:** Phase 1 complete. No production code written. No commits. No branch created.

> **Evidence convention.** Findings marked **[VERIFIED]** were re-checked by the orchestrator against
> source after the lane reported them. Findings marked **[REPORTED]** come from a lane and are
> plausible but not independently re-verified. Findings marked **[REFUTED]** were claimed by a lane
> and disproved. Do not act on a **[REPORTED]** item without verifying it first.

---

## 1. Scope and method

| Lane | Surface | Detail file |
|---|---|---|
| 1 | `backend/src/db/schema/build/` — 27 files, 81 tables | `_recon/01-build-schema.md` |
| 2 | Build API core — projects, members, provision, budget, customers | `_recon/02-build-api-core.md` |
| 3 | Build API extended — 15 `build-*` modules, ~170 endpoints | `_recon/03-build-api-extended.md` |
| 5 | `app/(authenticated)/build/` — 176 route files, 68 routes | `_recon/05-build-routes.md` |
| 6 | `features/build/` components — 344 files | `_recon/06-build-components.md` |
| 7 | Build data layer — hooks, query keys, mutations | `_recon/07-build-data-layer.md` |
| 8 | Build RBAC catalog + dead code | `_recon/08-rbac-deadcode.md` |

Lane 4 (CRM clients) was **stopped** when scope narrowed to Build only.

### Out of scope (recorded, not audited)

- **Clients / CRM domain.** Not audited. The Build→client foreign key is noted below.
- **"Freelancing Users."** No such domain exists. `freelanc*` appears in 20 files, all as a *worker
  type* inside HR/directory (`backend/src/db/schema/directory/worker-engagements.ts`, contractor
  payroll seeds). There is no freelancer profile, marketplace, bid, or application model anywhere.
  This is a **gap, not a defect** — nothing is broken, the domain was never built.

---

## 2. Stack facts — confirmed against the repo

| Claimed | Actual | Status |
|---|---|---|
| NestJS API | `@nestjs/core` 10.4.15 | ✓ |
| Next.js App Router | Next **16.2.9**, React 19.2.0 | ✓ |
| Drizzle + Postgres | `drizzle-orm` 0.45.2, Neon | ✓ |
| TanStack Query | **v5** (5.90.12) → `placeholderData: keepPreviousData` is correct syntax | ✓ |
| shadcn/Tailwind | ✓ | ✓ |
| Dev URL `localhost:1000` | `next dev -p 1000` | ✓ |
| `/users` reference page | `frontend/app/(authenticated)/users` | ✓ |
| Zod | backend on **Zod 4.1.13**, not v3 | ⚠ differs |
| Single repo | `backend/` is a **separate git repo** (`backend/.git`) | ⚠ differs |

### Rule conflicts flagged (H12: CLAUDE.md wins)

1. **Branching.** Brief H11 says create `refactor/platform-overhaul`; CLAUDE.md §0.11 forbids all
   branching. → **No branch created.** Work stays on `refactoring-hrms`.
2. **LOC cap.** Brief H9 says ≤600; CLAUDE.md §9 says ≤500 hard / ≤300 target. Lower wins.
   → **500/300 enforced** throughout this document.
3. **Prepared statements.** CLAUDE.md §19 recommends `sql.placeholder` for hot queries.
   `backend/src/db/drizzle.module.ts:32` sets **`prepare: false`** (postgres-js → Neon).
   → Prepared statements are **unavailable**. This is correct for pooled/serverless Postgres.
   Optimisation must come from indexes, projection, and killing N+1 — never prepared statements.
   **[VERIFIED]**
4. **Middleware.** Brief H6 cites Next middleware. Already migrated: routing is `frontend/proxy.ts`;
   `middleware.ts` was deleted (Next 16). No action needed.

---

## 3. Scale — the real numbers

| Metric | Value |
|---|---|
| Build surface total | **720 files, 108,998 LOC** |
| Backend `build*` modules | **15 modules**, 39 controllers, ~170 endpoints |
| Build schema | 27 files, **81 tables** |
| Frontend feature files | 344 (`features/build/`) |
| Frontend route files | 176 (68 `page.tsx` routes) |
| Files over 500 LOC (§9 hard cap) | **29** |
| Files over 300 LOC (§9 target) | **112** |

The Build module is not "projects" — it spans `build`, `build-approvals`, `build-client-portal`,
`build-comment-drafts`, `build-execution`, `build-forms`, `build-governance`, `build-incidents`,
`build-managed-products`, `build-meetings`, `build-pm-workspaces`, `build-portfolios`, `build-qa`,
`build-teams`, `build-workflow`.

### Baseline (H10 — established before any change)

- `backend`: `pnpm typecheck` → **exit 0, green** **[VERIFIED]**
- `frontend`: `pnpm type-check` → **exit 0, green** **[VERIFIED]**
  (note: the frontend script is `type-check`, hyphenated; backend is `typecheck`)

---

## 4. Top findings by severity

### P0-1 — Ten write endpoints are gated by a READ permission **[VERIFIED]**

Privilege escalation: any user holding `build:view` can mutate shared project state.

| Endpoint | File:line | Gated on | Should be |
|---|---|---|---|
| `POST /build/:projectId/members` | `projects.controller.ts:141` | `build:view` | `build:manage` |
| `DELETE /build/:projectId/members` | `projects.controller.ts:152` | `build:view` | `build:manage` |
| `PATCH /build/:projectId/members/:memberUserId` | `projects.controller.ts:163` | `build:view` | `build:manage` |
| `POST /build/:projectId/custom-states` | `projects.controller.ts:184` | `build:view` | `build:manage` |
| `PATCH /build/:projectId/custom-states/:stateId` | `projects.controller.ts:195` | `build:view` | `build:manage` |
| `DELETE /build/:projectId/custom-states/:stateId` | `projects.controller.ts:207` | `build:view` | `build:manage` |
| `POST /build/:projectId/automations` | `projects-automations.controller.ts:32` | `build:view` | `build:manage` |
| `PATCH /build/:projectId/automations/:automationId` | `projects-automations.controller.ts:43` | `build:view` | `build:manage` |
| `DELETE /build/:projectId/automations/:automationId` | `projects-automations.controller.ts:54` | `build:view` | `build:manage` |
| `PATCH /build/:projectId` (update project) | `projects-by-id.controller.ts:42` | `build:view` | **`build:update`** |

**Why this is a bug, not a design:** the *same file* correctly uses `build:manage` for label
mutations (`projects.controller.ts:94,104,114,225`) and `build:create` for creates (`:66,:77`).
The catalog defines **`build:update`** (`modules/rbac/permissions/shared.ts:48`, description
"Update projects") and it is enforced **zero** times repo-wide (`grep` count = 0).

Services do call `assertCanManageProject` as a second check, so exploitability depends on that
helper — but the guard is the stated contract and it is wrong. Fix at the decorator.

**Excluded from this count after review (defensible by design):**
- `build-comment-drafts` ×4 (`comment-drafts.controller.ts:34,44,51,61`) — every handler passes
  `u.userId` to the service (`deleteAllMine`, `upsert(orgId, userId, …)`). Own-data writes scoped
  by user; ticket-read is a reasonable gate. **[VERIFIED]**
- `build-forms/submissions.controller.ts:43` `createSubmission` — filling a form vs managing it;
  sibling PATCH correctly uses `build:forms:manage`. Loose but defensible; a `build:forms:submit`
  key would be cleaner. **[VERIFIED]**

### P0-2 — Build automations are stored, billed, and never executed **[VERIFIED]**

`project_automations` (`db/schema/build/tasks.ts:548`) has a full CRUD API
(`projects-automations.service.ts`) and a **686-line UI page**
(`app/(authenticated)/build/[projectId]/automations/page.tsx`).

`triggerEvent` is referenced in exactly one non-schema place —
`projects-automations.service.ts:25`, inside a `select({...})` projection in the **list** method.
It is never compared, matched, or evaluated. There is no runner, no scheduler, no event listener.

Worse: `plan-limits.service.ts:153` counts `project_automations` toward the org's **paid plan
automation quota**, alongside `automation_rules`. Customers consume quota for a feature that
silently does nothing.

A working generic engine already exists — `modules/automation/automation.service.ts`
(`runAutomationsForEvent`, backed by `automation_rules`), used by Support and settings. HR has its
own (`hr-automation-engine.service.ts`). Build duplicated the concept and never wired it up.

> Note: a lane claimed this was proven by `computeNextRunAt` having "zero imports". That is
> **[REFUTED]** — it has four real importers including a live cron
> (`modules/cron/cron-projects.service.ts:7,115`). But that utility drives *ticket recurrence*,
> a different feature. The conclusion stands on the corrected evidence above.

### P0-3 — `project_members` has no `org_id` **[VERIFIED]**

`db/schema/build/members.ts:27-37`:
```
projectMembers = pgTable("project_members", {
  id, projectId, userId, role, hourlyRate, joinedAt        // no orgId
}, [ uniqueIndex(projectId, userId), index(userId) ])
```
The sibling table directly below (`projectViews`) **does** carry `orgId` — so this is an
inconsistency, not a convention. Tenancy is a two-hop FK chain through `projects`.

Query sites confirm the exposure surface: `projects-budget.service.ts:37-39,50-51` and
`projects-members.service.ts:75-80,104-109,145-158,253-256,287-291,344` all filter by
`projectId`/`userId` without `orgId`. Each is *currently* protected by an upstream project-ownership
check, so this is **defence-in-depth debt rather than a proven live breach** — but it violates
H7 and CLAUDE.md §19/§20, and `hourlyRate` lives on this table.

### P1-1 — SSRF in webhook dispatch **[VERIFIED]**

`projects-webhooks-dispatch.service.ts:106` — `fetch(endpoint.url, …)` on a user-supplied URL
stored in the DB. The file contains **no** allowlist, no blocklist, no internal-IP guard
(grep for `allowlist|127\.|169\.254|localhost|private|isInternal` returns only unrelated lines).
Requests are HMAC-signed and time-limited (`AbortSignal.timeout`), but nothing prevents targeting
`169.254.169.254` (cloud metadata) or internal ranges.

Privilege-limited (requires webhook-create rights) but CLAUDE.md §20 A07 explicitly requires an
allowlist. Note also `projects-webhooks.controller.ts:70` `await`s a 10s test request in the
request path.

### P1-2 — Unbounded JSONB entity collections in hot rows **[VERIFIED]**

`db/schema/build/feedback.ts:145-146`:
```
consoleLogs: jsonb("console_logs").$type<FeedbucketConsoleEntry[]>(),
networkLogs: jsonb("network_logs").$type<FeedbucketNetworkEntry[]>(),
```
Arrays of entities inside a row that also powers list/filter queries (`type`, `status`,
`assignee_id`). This is precisely the anti-pattern the user called out and that
`docs/schema-redesign/north-star.md` §0.1 bans. Heavy-XHR pages produce MB-scale rows.

Related hot/cold violations **[REPORTED]**: `project_whiteboards.data` (whiteboards.ts:45, full
Excalidraw canvas), `pages.content` (members.ts:89, full document body).

> **Do not "fix" these:** the redesign register documents `project_webhooks.events` and
> `project_custom_fields.options` as *deliberately kept* bounded value lists. They are decisions,
> not defects.

### P1-3 — 29 files over the 500-line hard cap **[VERIFIED]**

Top offenders (full list in §7):

| LOC | File |
|---|---|
| 886 | `features/build/views/list-view.tsx` |
| 743 | `features/build/tickets/create-ticket-dialog.tsx` |
| 707 | `app/(authenticated)/build/[projectId]/page.tsx` |
| 701 | `features/build/ai/ticket-detail-ai.tsx` |
| 686 | `app/(authenticated)/build/[projectId]/automations/page.tsx` |
| 682 | `backend/src/modules/build/projects.service.ts` |

### P1-4 — Only 6 of 50 Build hook files carry an RBAC gate **[VERIFIED]**

`useProjects` (`frontend/hooks/api/build/projects.ts:113`) queries `/build` with `staleTime: 30_000`
and **no `enabled`**, despite the endpoint requiring `build:view` + `@RequireModule("build")`.
Same for `useTickets`, `useAllWork`, `useEpics`, `useCycles`, `useModules`, `useViews`,
`useWorkspaceViews`, `usePortfolios`, `useTicketSearch`, and all six report hooks **[REPORTED]**.

**Severity corrected from the lane's "P0-Security" to P1-Performance.** The backend correctly
enforces the permission, so nothing leaks. The cost is 403-spam and wasted Neon CPU on every mount
for non-permitted users — a CLAUDE.md §11 violation, not a breach.

Positive: `...options` is spread **last** in these hooks, so the historical **clobber bug is absent**.
No occurrences found. **[VERIFIED]**

### P1-5 — `retry: 1` with no 4xx guard **[REPORTED]**

`components/providers/query-provider.tsx:11-23` — defaults are
`staleTime: 2min, gcTime: 10min, refetchOnWindowFocus: true, retry: 1`.
Every 403/404/409 therefore fires **twice** per mount. Combined with P1-4, non-permitted users
generate double 403 traffic across every Build surface.

`refetchOnWindowFocus: true` is already set globally — the brief's frontend rule 3 is satisfied.

### P2 — Route hygiene

- **Genuinely dead:** `app/(authenticated)/build/[projectId]/pages/` contains `error.tsx` +
  `loading.tsx` and **no `page.tsx`** — Next cannot route it. **[VERIFIED]**
- **No-op layout:** `build/settings/layout.tsx` is `return <>{children}</>`. **[VERIFIED]**
- **True redirect-only:** `build/[projectId]/workload/page.tsx` → `redirect(/build/${projectId}?view=workload)`.
  Has a full `loading.tsx` that is never reached. **[VERIFIED]**
- **Inverted canonical route:** `build/page.tsx` is `export { default } from "./all/page"`.
  PAGES.md:411 declares `/build` canonical and `/build/all` the legacy deep-link, so the re-export
  points the wrong way. **Fix by inversion, not deletion** — deleting it 404s `/build`. **[VERIFIED]**
- **NOT a defect:** `build/customers/page.tsx` re-exports a feature component. A lane flagged this
  as redirect-only; it is the **correct** App Router pattern per CLAUDE.md §9 (`app/` holds route
  files only). Deleting it would remove the route. **[VERIFIED — lane claim rejected]**
- All 13 dynamic segments use descriptive params (`[projectId]`, `[ticketKey]`). No `[id]`
  violations. No `'use client'` on any layout. **[REPORTED]**

### P2 — UI conformance is strong

Full UI-UX-SYSTEM.md AP-1…AP-8 sweep across the Build surface **[VERIFIED]**:

| Anti-pattern | Hits |
|---|---|
| AP-3 gradient text in shell | **0** |
| AP-6 ad-hoc `<h1>` outside PageWrapper | **0** |
| AP-8 inline hex / arbitrary colour | **0** |
| `min-h-screen` in shell | **0** |
| Banned `@phosphor-icons` | **0** (not even a dependency) |
| AP-1 `SheetContent` missing `p-0` | 3 |
| AP-4 `rounded-2xl/3xl` | 4 (all in `ai/ai-chat-panel.tsx`) |
| AP-7 `animate-spin` | 5 (all legitimate inline `Loader2`, not page-level) |
| `w-[var(--radix-*-trigger-width)]` (should be `min-w-`) | 2 |
| AP-2 `TabsList` ≥5 triggers | 6 files |

This module is materially more conformant than the brief assumes. **Most of it works** — H3 applies
with force.

### P1-6 — Shared primitives exist and are massively underused **[VERIFIED]**

This is the largest safe win in the module and directly answers the user's rule #5
("reuse before you create"). **Every primitive below already exists** — nothing new must be built.

| Shared primitive | LOC | Adoption in `features/build` |
|---|---|---|
| `components/ui/confirm-dialog.tsx` | 60 | **1 file** — while **38 files** inline the raw `AlertDialog` block |
| `components/ui/responsive-popover.tsx` | 169 | 9 files — while **25 files** use a raw `<Popover>` |
| `components/ui/semantic-badge.tsx` | 58 | 0 build badges use it |
| `components/ui/status-badge.tsx` | 68 | 0 build badges use it |
| `components/members/member-picker.tsx` | 403 | bypassed by `teams/workspace-member-picker.tsx` (145 LOC, 1 importer) |
| `components/ui/date-picker.tsx` | 122 | bypassed by `project-card-inline-fields.tsx:15` (raw `Calendar`) |

**Duplication register** (priority order) **[REPORTED unless noted]**:

| # | Duplicated UI | Implementations | Existing shared? | Action |
|---|---|---|---|---|
| A | Confirm-delete dialog | **38 inline** vs 1 using shared **[VERIFIED]** | yes — `confirm-dialog.tsx` | Mechanical swap, no logic change |
| B | Status badge | 7 files in `features/build` **[VERIFIED]** | yes — `semantic-badge`, `status-badge` | Consolidate |
| C | Raw Popover on mobile | 25 files raw vs 9 responsive **[VERIFIED]** | yes — `responsive-popover.tsx` | Drawer-below-`md` rule |
| D | Member picker | `workspace-member-picker.tsx` (145 LOC, 1 importer) | yes — `member-picker.tsx` `scope="workspace"` | Delete local copy |
| E | Grouping sidebar | `project-list/` 353 LOC + `my-work/` 357 LOC | no | Extract one shared |
| F | Filter bar | 3 implementations (648 / 120 / 197 LOC) | no | Extract on 2nd occurrence |
| G | Priority colour map | 3 copies beyond canonical `shared/priority-badge.tsx` | yes | Import canonical |
| H | View switcher | 2 (one a subset of the other) | no | Merge |

> **Correction to the lane report:** `ManagedProductStatusBadge` and `PmWorkspaceStatusBadge` were
> claimed "byte-for-byte identical". They are **not** — they differ by status enum
> (`ManagedProductStatus` vs `PmWorkspaceStatus`) and formatting. They are *structurally* identical,
> so consolidation needs a **generic component parameterised by a status→style/label map**, not a
> deletion. **[VERIFIED — claim corrected]**

Other component findings **[REPORTED]**: `GoalDetailSkeleton` uses 12 uniform `h-20` blocks that
don't mirror its two-column layout; no dedicated skeletons for sprint-planning-panel,
ticket-detail-page, or list-view; `bugs/bugs-page.tsx:261-279` filter Selects use fixed `w-32`/`w-28`
with no mobile stacking (overflows at 375px).

### P3 — Other verified/reported items

- **118 route files carry a UTF-8 BOM** **[VERIFIED]** — cosmetic but inconsistent.
- `idx_tickets_org_project` is a strict prefix duplicate of `idx_tickets_org_project_status`
  (`tasks.ts:117-118`) — redundant write cost. **[REPORTED]**
- `projects.budget` `decimal(15,2)` with no currency column (`core.ts:50`);
  `project_members.hourly_rate` `decimal(10,2)` likewise (`members.ts:32`). Violates money-as-integer-
  minor-units. **[REPORTED]** — note this is a *rule* violation, not a live bug.
- Leading-wildcard `ILIKE '%x%'` in `projects.service.ts:117-121` and
  `projects-customers.service.ts:18` — cannot use a B-tree index. **[REPORTED]**
- `addMember` check-then-insert race (`projects-members.service.ts:253-265`) — should be
  `ON CONFLICT DO NOTHING`. **[REPORTED]**
- `applyTemplate` performs 4 sequential inserts with no transaction
  (`projects-templates.service.ts:107-148`). **[REPORTED]**
- `getProject` embeds an unbounded member list via relational `with:`
  (`projects.service.ts:313-330`) — violates §11. **[REPORTED]**

---

## 5. Dead-code candidates (evidence only — nothing deleted)

**No dead-code tooling is installed.** `knip`, `ts-prune`, `depcheck` are absent from both
`node_modules/.bin`. Analysis is grep-only. **[VERIFIED]**

| Candidate | Evidence | Verdict |
|---|---|---|
| `reports` table (`db/schema/build/core.ts:192-223`) | `from/insert/update/delete(reports)` = **0** occurrences repo-wide | Strong candidate **[VERIFIED]** |
| `app/(authenticated)/build/[projectId]/pages/` | `error.tsx`+`loading.tsx`, no `page.tsx` | Unroutable **[VERIFIED]** |
| `build/settings/layout.tsx` | no-op passthrough | Deletable **[VERIFIED]** |
| `GET build/resource-allocation` | 0 frontend callers | **[REPORTED]** |
| `build/programs/*` (all verbs) | 0 frontend callers | **[REPORTED]** |
| `POST build/:projectId/reports/snapshot` | 0 frontend callers | **[REPORTED]** |
| `GET /whiteboards` (hub, missing `build/` prefix) | 0 frontend callers | **[REPORTED]** |

⚠ **Before any deletion:** bare side-effect imports (`import "x";` with no `from`) are invisible to
from-based scanners. A previous cleanup deleted a live file this way. Every deletion needs a grep
for the bare-import form too.

---

## 6. RBAC catalog state

- **75 backend `build:*` keys**; frontend `PermissionKey` union has **74**. **[REPORTED]**
- **Ghost keys: none.** Every `@RequirePermission("build:*")` resolves to a catalogued key, and
  every `useCan("build:*")` resolves to a frontend key. **[REPORTED]**
- **Drift ×2** **[REPORTED]**:
  - `build:timesheets:manage` — backend-only (`shared.ts:122`), enforced at
    `build-execution/timesheets.controller.ts:53,62,71`, **absent from frontend** → no UI gate possible.
  - `build:customers:manage` — in both catalogs, enforced by **zero** controllers.
- **`build:update`** — catalogued, enforced zero times. See P0-1. **[VERIFIED]**
- **Module enablement — the code bug is fixed; a DATA dependency remains.** **[VERIFIED]**

  Exact chain, read from source:
  - `common/rbac/module.guard.ts:26` — `const moduleKey = required.toLowerCase()` → `"build"`
  - `common/rbac/module-vocabulary.ts:4` — `MODULE_CATALOG` contains `"build"`
  - `modules/access/entitlements.service.ts:110` — `for (const row of rows) result[row.moduleKey] = row.enabled`
    — the map is built **directly from `org_modules` rows, with no UPPERCASE projection and no translation**.
  - `entitlements.service.ts:127-133` — `isModuleEnabled` returns `map[moduleKey]`, and when that is
    `undefined` returns `this.moduleTableUnavailable` (**`false`** unless the table is missing entirely).

  So the historical lowercase-vs-UPPERCASE vocabulary bug is **genuinely resolved in code**.

  **But the hazard has moved, not disappeared.** If any org's `org_modules` row still carries the
  pre-rename `module_key = 'projects'`, then `map["build"]` is `undefined` → `isModuleEnabled` returns
  `false` → `ModuleDisabledException` → **403 on every `@RequireModule("build")` endpoint for every
  non-owner**. Org owners bypass at `module.guard.ts:25` and would never see it.

### P0-4 — The Build module-enablement gate is INERT **[VERIFIED]**

A lane concluded "module enablement PASSES for non-owners". That is technically true but
dangerously misleading: **it passes because the gate never runs.**

| Check | Result |
|---|---|
| Build controllers carrying `@RequireModule("build")` | **39** |
| ...of those that list `ModuleGuard` in `@UseGuards` | **0** |
| `ModuleGuard` registered globally via `APP_GUARD` | **No** — `app.module.ts:338` registers only `JwtAuthGuard` |
| Other modules that *do* wire it | inventory (18 modules), e-sign, hr-payroll, dashboard, accounting-ai |

Every Build controller reads `@UseGuards(JwtAuthGuard, PermissionGuard)` — no `ModuleGuard`.
The 39 `@RequireModule("build")` decorators are **decorative**. This is the "inert code" trap:
compiles green, passes review, does nothing at runtime.

**Consequences, both directions:**

1. **Entitlement is unenforced.** An org that has *not* enabled/paid for Build can call every Build
   endpoint, subject only to permissions. The paid-module boundary does not exist for Build.
2. **The obvious fix is a live outage.** Wiring `ModuleGuard` in is a one-line change per controller —
   and if any org's `org_modules` row still says `projects`, `map["build"]` is `undefined`,
   `isModuleEnabled` returns `false`, and **every Build endpoint 403s for every non-owner**.
   Org owners bypass at `module.guard.ts:25`, so whoever tests it would see nothing wrong.

**Mandatory sequence for Phase 4** (do not reorder):
1. Run `SELECT module_key, enabled, count(*) FROM org_modules WHERE module_key IN ('build','projects') GROUP BY 1,2;`
   **[UNVERIFIED — needs a live DB connection I do not have]**
2. If any `projects` rows exist, run the data migration
   (`docs/schema-migration/rename-projects-to-build-data.sql`) and re-verify.
3. Only then wire `ModuleGuard` into the 39 controllers.

> Positive: the second-order "three paths disagree on the missing-row default" issue appears
> **fixed** — `entitlements.service.ts:225-234` `getEffectiveModuleMap` now explicitly mirrors
> `isModuleEnabled`, with a comment saying the UI and the API "can never disagree". **[VERIFIED]**

---

## 7. Reconciliation with in-flight programs

**`docs/schema-redesign/` is 392 done / 5 open.** A cold rebuild was proven 2026-07-28
(776 tables from empty). Phase 3 must **converge on** `north-star.md`, not re-derive a schema.

Binding constraints inherited from that program:

1. **No shared products table.** `north-star.md:397` — `managed_products`, `inv_products`,
   `crm_products` and Inventory SKU "are already correctly separated in this repo and must stay so."
2. **Deliberately-kept arrays** (`project_webhooks.events`, `project_custom_fields.options`, OAuth
   scope subsets) are documented decisions.
3. `project_teams` → planned rename `pm_delivery_teams`.
4. Typed grants `pm_project_grants` / `pm_workspace_grants` already exist.

**Doc drift:** all 104 Build entries in `PAGES.md` still say `/projects/*` and `projects:*` permission
keys, though routes are `/build/*` and keys are `build:*`. Documentation-only; code is correct.

**Test coverage is illusory (W-29).** `backend/package.json` jest config sets
`testRegex: ".*\\.spec\\.ts$"` with `testPathIgnorePatterns: ["e2e-spec", …]` — **every `*.e2e-spec.ts`
is excluded from `pnpm test`**. A separate `test:e2e` script exists. The RBAC/cross-tenant coverage
that CLAUDE.md §26/§27 counts toward Definition of Done **is not executing**. Build's own
`projects.controller.e2e-spec.ts` and `projects-access.e2e-spec.ts` additionally gate on
`RBAC_E2E_DATABASE_URL`. **[VERIFIED]**

Consequence: **P0-1 is invisible to the current test suite.** No test asserts that a `build:view`-only
user cannot add members.

---

## 8. Claims raised by lanes and rejected

Recording these because acting on them would have caused damage:

| Claim | Verdict | Why |
|---|---|---|
| `build/customers/page.tsx` is a deletable redirect-only page | **REJECTED** | Correct App Router re-export pattern; deleting removes the route |
| `build/page.tsx` should be deleted | **REJECTED** | It *is* `/build`; needs inversion with `/build/all`, not deletion |
| Automations proven dead by `computeNextRunAt` having no imports | **REFUTED** | 4 real importers incl. live cron; conclusion right, evidence wrong |
| Build query hooks missing gates = P0 Security | **DOWNGRADED** | Backend enforces; real impact is 403-spam/CPU, not a leak |
| Backend repo "not present locally" | **FALSE** | `backend/` is present; that lane's backend cross-checks are unverified |
| 15 write endpoints gated on read | **CORRECTED to 10** | 5 are own-data or submit semantics and defensible |

This is why every P0 in §4 was re-verified before being written down.

---

## 9. Open questions for the gate

See the numbered list in the accompanying message. No production code will be written until the
Phase 3 change map is approved.
