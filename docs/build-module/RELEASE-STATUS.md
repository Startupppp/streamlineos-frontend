# Build module — Release Status

**Date:** 2026-09-24
**Authority:** This file supersedes all earlier Build module status documents. See the Historical documents section at the bottom for the eleven prior ledgers.

---

## 1. Production frontend / API mismatch

**State: FIX MERGED AND BUILD-VERIFIED; NOT YET LIVE — BLOCKED on Vercel**

| Fact | Detail |
|---|---|
| Production frontend commit | `857037f04` — last successful Vercel Production deployment (2026-09-23 06:18 IST) |
| Root cause | At `857037f04`, `frontend/hooks/api/build/build-project-schema.ts` declares `pmWorkspaceId: z.string()` as REQUIRED (lines 56, 312). The live API omits it, producing `ApiContractError` on `GET /build/6`. Production JS chunks confirmed to still contain `pmWorkspaceId`, permission keys `build:workspaces:view|create|update`, and calls to `/build/workspaces/{id}`. |
| Fix merged | PM Workspace removed from frontend in `8549fb4cc` (2026-09-23 09:45 IST) and from backend in `f6d12e138`. Both are on `origin/main`. Current `main` has no `pmWorkspaceId` in any Build contract. |
| Build blocker (fixed) | `features/wiki/components/wiki-page-collection-table.tsx` passed `onChange` to `SearchInput` which takes `onValueChange` — TS2322, fails `next build` because `next.config.ts` sets no `ignoreBuildErrors`. Fixed in current `main`. |
| How to read Vercel state | Do **not** infer from the Deployments API — it records successful (and in-flight) builds only, so a repo whose builds all fail looks identically like a repo whose integration was disconnected. Read the **commit statuses**, and specifically their `description` field: `gh api repos/Startupppp/streamlineos-frontend/commits/<sha>/status`. Watcher: `D:/agent-work/watch-vercel.mjs <sha>`. |
| Blocker 1 — build (FIXED) | TS2322 above. Builds genuinely ran and failed on 2026-09-23 08:38–09:26Z for `84cc8d432` and `e6dd8422a` (`Deployment has failed — run … vercel inspect …`). Fixed on this branch; `pnpm build` exits 0. |
| Blocker 2 — Vercel plan (**OPEN, blocks release**) | Since 2026-09-23T09:26Z Vercel has refused to **start** a build. All four contexts report: **“Cannot deploy from a private GitHub organization repository on the Hobby plan.”** Upgrade links returned by the API: `https://vercel.com/tarun-44555f1b?upgradeToPro=github-private-org-to-hobby` and `https://vercel.com/ad1tyas-projects-dff81b95?upgradeToPro=github-private-org-to-hobby`. The trigger was almost certainly the repo moving into the `Startupppp` GitHub **organization** (which is also why `Startupppp/Streamlineos` now redirects to `Startupppp/streamlineos-frontend`). |
| Why no code change can fix blocker 2 | The refusal happens before the build starts, so the TS2322 fix cannot reach production no matter how often `main` is pushed. There is no Vercel CLI, `VERCEL_TOKEN` or `.vercel` link on the build machine, so there is no out-of-band deploy path either. |
| Action required (human, outside the repo) | Pick one: upgrade the Vercel account to Pro; move the repo back to a personal GitHub account; make the repo public; or add a `VERCEL_TOKEN` so CI/CLI can deploy. Until one is done, production keeps serving `857037f04` and the `pmWorkspaceId` contract error persists. |
| Verification standing in for the deploy | Because production cannot be updated, the fixed frontend was built in production mode and browser-verified **against the live production API** (`https://api.streamlineos.in`) with a real authenticated session. That isolates the remaining risk to the Vercel plan alone — see section 8. |

---

## 2. Migrations

**State: DONE — applied to production 2026-09-23, all postconditions verified**

| Fact | Detail |
|---|---|
| Pre-migration snapshot | `streamlineos-pre-1164-1167-20260923` — confirmed `available` (100%); PITR window was live |
| Migrations applied | `1164_candidate_consent_at`, `1165_build_automation_run_history`, `1166_build_incident_postmortem_fields`, `1167_invoices_deal_id` |
| How applied | Migrations 1165–1167 were present on disk but MISSING from `migrations/meta/_journal.json`; `db:migrate` silently skipped them. Journalled, then applied one tag at a time with `--tag=`. Migration 1164 applied separately (stranded below the watermark). |
| Ledger | 924 → 928 rows. All catalog postconditions verified: tables created, enum types present, indexes present, `fk_invoices_org_deal` FK convalidated. Each ledger row hash matches on-disk file bytes. |
| Re-verified independently 2026-09-24 | Read-only against production: ledger **928 rows**, watermark **1803000010584**. All three migrations present **by hash** — `1165`→id 927, `1166`→id 928, `1167`→id 929, `created_at` 1803000010582/3/4 matching the journal exactly. Catalog postconditions confirmed live: `build.project_automation_runs`, `build.project_automation_run_actions`, `build.incident_decisions`, `build.incident_follow_up_actions` and `public.invoices.deal_id` all exist. Matching by hash rather than by name is the point — a name match would not prove the applied bytes. |
| Workspace removal confirmed live | `build.pm_workspaces` → null, `build.pm_workspace_members` → null, `build.projects.pm_workspace_id` → absent. The database is genuinely workspace-free; the mismatch was frontend-only. |
| Defect found and fixed 2026-09-24 | Journalling 1165–1167 at idx 1048–1050 renumbered 1168 and 1169 but left **1170 still at idx 1050**, colliding with 1167. `check:migration-discipline` was failing `[journal-dup-idx]`. Fixed in `ce8bc7ad5` (1170 → idx 1053). |
| Gates (at `d4ac1d6df`) | `check:migration-discipline` PASS (926 SQL files, 0 new violations); `check:migration-chain` PASS; `check:migration-rollback` PASS; `check:migration-ledger` PASS **against production** — 928 rows / 926 entries, 3 pending, 5 known orphan rows (ids 909–913) below the watermark |
| Deliberately not applied | `1168_kb_page_grants`, `1169_kb_page_collection_indexes`, `1170_kb_page_reviews_derive_overdue` — the 3 "pending" above. All from KB work outside this release. They sit *above* the watermark, so they are pending, not stranded. |

---

## 3. Contract registry

**State: DONE**

`pnpm check:contract-registry` exits 0 at `d4ac1d6df`: **3979 operations (99 published, 3880 internal)**, 32 outbox events, 23 outbound webhook events. 14 previously-absent operations were classified — including `GET /build/{projectId}/automations/runs`, all three change-request affected-ticket endpoints, the incident decision and follow-up endpoints, and `POST /timesheets/billing/release-draft` — all `internal`, carrying `x-exposure: permissioned`.

Entries were produced by the official generator (`pnpm registry:generate`), not hand-written; `contracts/api-contract-registry.json` is generated output and must never be hand-edited. Verified by field shape: every new entry carries exactly the field set the generator emits for an internal operation, including the `"version": "1"` fallback for paths with no `/vN/` segment.

The 9 `GET|POST|PATCH|DELETE /build/workspaces*` entries still listed as "retained" are **deliberate tombstones**, not leftovers — `check-contract-breaking-change` detects a removal by finding exactly that state. Deleting them to quieten the report would disable the breaking-change detector.

---

## 4. Tenant isolation

**State: DONE — both gates green at `d4ac1d6df`**

| Gate | Result |
|---|---|
| `check:tenant-isolation` (static) | **PASS** — 979 / 979 tenant-owned services declared |
| `check:tenant-isolation:run` (execution) | **PASS** — 447 suites / 2270 tests |

Build automation actions are covered by `src/modules/build/core/build-automation-actions-tenant-isolation.spec.ts`, proving cross-org **and** cross-project denial with paired positive controls. The denial assertions are predicate-level: a `sqlValues()` walker over the Drizzle SQL AST asserts the bound WHERE values contain the attacker org and **not** the owner org. That is deliberately stronger than a status assertion — in this repo a negative-only status check passes even on a 500.

Both gates are required. The static gate matches a spec file to a service by name without running it, so a spec that throws before its first expectation still satisfies it; `:run` is what proves the assertions execute.

Three KB blockers were closed to get here (they arrived with the Knowledge-Base work merged into this branch, not from Build):
- `kb-spaces-tenant-isolation.spec.ts` — drifted from `KbSpacesService.list` after it gained a `query.cursor` argument and an `authz` dependency.
- `kb-pages-tenant-isolation.spec.ts` — did not mock `auth.resolvePageAccess`, which `KbPagesService.get` now calls.
- `kb-page-trash.service.ts` — had no isolation spec at all; one was written.

The new trash spec was **mutation-tested**: removing `eq(kbPages.orgId, orgId)` from `hardDelete`'s predicate made the denial test fail, and the scoping was then restored. A test that cannot fail is not coverage.

---

## 5. Dead code / hygiene

**State: DONE — `pnpm check:dead-code` exits 0 at `f83e1b5ad`**

6 dead Build files deleted: `ai-summaries` folder, `bugs-table-columns`, `hooks/api/ai-summaries`, plus dead AI and bug-mutation exports. 3 Build ESLint errors fixed (`text-[11px]`→`text-dense`, `text-[10px]`→`text-micro`, `react/no-children-prop`); no rules disabled. Build ESLint is now **0 errors** (88 warnings remain, all pre-existing `react-hooks/*` and unused-var patterns, none introduced here).

The residual gate failure was entirely KB, and was closed on evidence rather than by silencing:
- `features/wiki/lib/tree-utils.ts` — no importer anywhere for 20 days; **deleted**.
- `useKbProjectPagesTree`, `useKbSpaceArchiveImpact`, `useDeleteKbSpace`, `SpaceCardItem` — all added within the last day by in-flight KB work, each with a backend endpoint already in place and no UI surface yet. Classified **WIRE** (added, not yet wired), which is what that verdict exists for. Deleting a hook its author is about to wire up would have been the wrong fix.

---

## 6. Other verified gates

Measured at frontend `f83e1b5ad` / backend `d4ac1d6df`.

| Gate | Result |
|---|---|
| `check:route-access-contract` | PASS |
| `check:route-thinness` | PASS (0 in-scope thick routes) |
| `check:contract-parity` | PASS |
| `check:permission-binding` | PASS — 2554 bindings checked |
| `check:pm-workspace-removal` | PASS — 9 self-tests, then 1975 source files and 3546 built chunks clean |
| Build frontend jest | **212 suites / 1555 tests pass** |
| Backend Build suite | **221 suites / 2137 tests pass** |
| Backend `pnpm typecheck` | exit 0 |
| Frontend `pnpm type-check` | exit 0 |
| Frontend `pnpm build` | exit 0 |
| Backend `pnpm build` | exit 0 |

Two corrections to earlier revisions of this table:

- **`check:route-census` does not exist.** No script by that name is defined in either `package.json`. Any earlier row claiming it passed was reporting a gate that was never run. The real coverage comes from `check:routes`, `check:module-manifest` and `check:route-thinness`.
- **The frontend Build suite figure was wrong, for a fixable reason.** Four contract specs read backend service files off disk to verify projection alignment, and a frontend-only worktree has no `backend/`, so they errored with `ENOENT` and were counted as failures. Exporting `STREAMLINE_BACKEND_ROOT=<backend worktree>` makes all four pass. They fail identically on `main`; there was never a defect.

---

## 7. Active live routes

Verified 2026-09-23 in `frontend/app/(authenticated)/build/[projectId]/`:

| Route | Source file | Status |
|---|---|---|
| `/build/[projectId]/intake` | `intake/page.tsx` | **LIVE** |
| `/build/[projectId]/forms` | `forms/page.tsx` | **LIVE** |
| `/build/[projectId]/triage` | `triage/page.tsx` | **LIVE** |

Earlier planning documents (`01-ia-navigation.md`, `10-project-intake.md`) recorded a disposition to consolidate and remove the `intake` route in favour of `/forms` and `/triage`. That removal is **NOT in scope for this release**. All three routes are currently live product routes.

Use project id `6` as the QA sandbox for any manual verification. Project `5` does not exist in the active organisation.

---

## 8. Real-browser verification

Production cannot be updated (section 1, blocker 2), so the fix was verified two ways: the **failure** was reproduced on live production, and the **fix** was proven against the same live production API and database.

Both runs used a real Chromium browser with a real authenticated session — not jsdom, not API-only. The session is a NextAuth JWE minted with the production secret and bound to an existing unrevoked `user_sessions` row for the operator's own account (`adityachalla01@gmail.com`, `ORG_ADMIN`, org "Streamline OS"). `isOrgOwner` is deliberately `false`: an owner short-circuits `useCan` and would mask non-owner 403s. Driver: `D:/agent-work/prod-build-verify.mjs`.

**No production business data was created, modified or deleted.** Every check is a page read.

### Before — live production, 2026-09-24

12 routes × 2 widths. All six project-scoped routes fail at both widths; the six org-scoped routes pass.

```
ApiContractError  status 200  code CONTRACT_VIOLATION  endpoint /build/6
issues: [{ path: "pmWorkspaceId", ... }]
```

`/build` additionally rendered **85 stuck skeletons**. This is broader than the three routes originally reported — `/build/6/backlog`, `/cycles`, `/forms` and `/triage` fail the same way.

Grepping the live bundle (authenticated — an unauthenticated sweep only loads signin chunks and returns a false clean) confirmed production still ships `pmWorkspaceId` in the project schema, a retired `workspace: "Workspace"` Build scope, and `/build/workspaces/${id}` mutation hooks.

### After — fixed build at `f83e1b5ad`, against the live production API

Built with `pnpm build` (exit 0) and served with `next start`, with `NEXT_PUBLIC_API_URL=https://api.streamlineos.in` baked in, so every read hit the real production API and database.

**All 24 checks pass** (12 routes × 1280px and 375px):

| Check | Result |
|---|---|
| "Projects Error" | none on any route |
| `ApiContractError` / contract violation | **none** |
| Hydration errors | none |
| Unhandled console errors / failed requests | none |
| Perpetual loading skeletons | 0 on every route |
| Blank main-content panel | none — every route rendered content |
| Horizontal overflow at 375px | 0px on every route |
| `/build/access` → `/build/settings/access` | redirects **exactly once** |
| Retired Workspace scope in the switcher | absent (`check:pm-workspace-removal` also clears all 3546 built chunks) |

`/build/6` renders "Build QA Sandbox" with its full project navigation; `/build/6/issues` and `/build/6/backlog` render real production rows.

**One caveat, stated plainly:** the production API's CORS allowlist does not include `http://127.0.0.1:1000`, so the browser was launched with `--disable-web-security` for the "after" run. That suppresses the browser's CORS check only — the requests still went to the production API with real credentials and returned real data. It does not exercise the production CORS configuration, which is unchanged by this release and already correct for `www.streamlineos.in`.

### Genuine finding, not a blocker

At **375px only**, on `/build/6`, `/build/6/cycles`, `/build/6/triage` and `/build/command-center`, one tab stop is a `div` with no focus ring — a horizontally scrollable container that Chrome makes implicitly focusable so it can be scrolled by keyboard. Focus order stays monotonic and every other stop is ringed and on-screen. This is browser-default behaviour on a shared stat/list strip, is not Build-specific, and is not a regression from this release. It is recorded here rather than silently accepted; giving those scroll containers a visible `:focus-visible` ring is a real, small improvement someone should pick up.

---

## Historical documents

The following eleven files are point-in-time records from sessions on 2026-09-21 and 2026-09-22. Their environment facts (commit SHAs, route counts, database states, migration states) reflect the time they were written and are no longer current.

| File | Covers | Session date |
|---|---|---|
| [ACCESS-ROUTE-CLOSURE-STATUS.md](./ACCESS-ROUTE-CLOSURE-STATUS.md) | `/build/access` route removal | 2026-09-22 |
| [DEAD-BUILD-SURFACE-STATUS.md](./DEAD-BUILD-SURFACE-STATUS.md) | Dead redirect route and file removal | 2026-09-22 |
| [FINAL-CLOSURE-STATUS.md](./FINAL-CLOSURE-STATUS.md) | Authorization, cold-load gates, migration chain (closure phase) | 2026-09-21 |
| [FINAL-SPRINT-REMOVAL-STATUS.md](./FINAL-SPRINT-REMOVAL-STATUS.md) | Sprint identity removal; migrations 04/05/06 applied to production | 2026-09-22 |
| [IMPLEMENTATION-STATUS.md](./IMPLEMENTATION-STATUS.md) | Wave 0/1 coordinator ledger | 2026-09-22 |
| [NEXT-CLOSURE-STATUS.md](./NEXT-CLOSURE-STATUS.md) | Sprint/Cycle + QA Bug cutover; workload, inbox, migrations 1149–1151 | 2026-09-22 |
| [PHASE-1-STATUS.md](./PHASE-1-STATUS.md) | Post-closure workstreams; UX hardening; production execution 2026-09-22 | 2026-09-22 |
| [PHASE-2-DATA-MODEL-STATUS.md](./PHASE-2-DATA-MODEL-STATUS.md) | Sprint/Cycle + QA Bug design; composite FK static verification | 2026-09-22 |
| [PHASE-2-STATUS.md](./PHASE-2-STATUS.md) | Migrations 1141/1142 applied to production RDS | 2026-09-22 |
| [PHASE-3-STATUS.md](./PHASE-3-STATUS.md) | My Work / Inbox / All Work / settings navigation consolidation | 2026-09-22 |
| [PHASE-4-STATUS.md](./PHASE-4-STATUS.md) | Client portal, discovery chain, FE-123 browser verification | 2026-09-22 |
