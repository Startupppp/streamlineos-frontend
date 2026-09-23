# Build module — Release Status

**Date:** 2026-09-23
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
| Vercel blocker | Every Vercel Production deployment after `857037f04` reports `failure`. Since 2026-09-23T09:26Z Vercel has created **no deployments at all** — 32 commits landed on `origin/main` (24 touching `frontend/`) with zero deployments. The frontend deploys via Vercel Git integration; `.github/workflows/frontend.yml` has no deploy job. |
| Action required | Open the Vercel dashboard, diagnose the deployment failure, and trigger or re-enable Production deployments. Until then, production serves a frontend that does not match the deployed API contract. |

---

## 2. Migrations

**State: DONE — applied to production 2026-09-23, all postconditions verified**

| Fact | Detail |
|---|---|
| Pre-migration snapshot | `streamlineos-pre-1164-1167-20260923` — confirmed `available` (100%); PITR window was live |
| Migrations applied | `1164_candidate_consent_at`, `1165_build_automation_run_history`, `1166_build_incident_postmortem_fields`, `1167_invoices_deal_id` |
| How applied | Migrations 1165–1167 were present on disk but MISSING from `migrations/meta/_journal.json`; `db:migrate` silently skipped them. Journalled, then applied one tag at a time with `--tag=`. Migration 1164 applied separately (stranded below the watermark). |
| Ledger | 924 → 928 rows. All catalog postconditions verified: tables created, enum types present, indexes present, `fk_invoices_org_deal` FK convalidated. Each ledger row hash matches on-disk file bytes. |
| Gates | `check:migration-discipline` PASS (925 SQL files, 0 violations); `check:migration-chain` PASS (watermark 1803000010584); `check:migration-rollback` PASS; `check:migration-ledger` PASS (5 known orphan rows noted below watermark) |
| Deliberately not applied | `1168_kb_page_grants`, `1169_kb_page_collection_indexes` — from unpushed KB commits outside this release |

---

## 3. Contract registry

**State: DONE**

`pnpm check:contract-registry` exits 0. 3972 operations (99 published, 3873 internal). 14 previously-absent operations classified via the generator including `GET /build/{projectId}/automations/runs`, change-request affected-ticket endpoints, incident decision/follow-up endpoints, and `POST /timesheets/billing/release-draft`. All 14 classified `internal` (carry `x-exposure: permissioned`).

---

## 4. Tenant isolation

**State: Build DONE; overall gate UNVERIFIED-PENDING**

Build automation actions are now covered: `src/modules/build/core/build-automation-actions-tenant-isolation.spec.ts`, 5 tests, proving cross-org AND cross-project denial with positive controls.

A separate agent is closing 5 remaining non-Build services. The overall `check:tenant-isolation` gate result is UNVERIFIED-PENDING until that work lands.

---

## 5. Dead code / hygiene

**State: Build DONE; overall gate UNVERIFIED-PENDING**

6 dead Build files deleted: `ai-summaries` folder, `bugs-table-columns`, `hooks/api/ai-summaries`, plus dead AI and bug-mutation exports. 3 Build ESLint errors fixed (`text-[11px]`→`text-dense`, `text-[10px]`→`text-micro`, `react/no-children-prop`); no rules disabled.

A separate agent is closing remaining non-Build dead-code findings. Overall gate UNVERIFIED-PENDING.

---

## 6. Other verified gates

| Gate | Result |
|---|---|
| `check:route-census` | PASS — 74 Build routes, 65 Build pages, 0 weak cold-load gates |
| `check:route-access-contract` | PASS |
| `check:route-thinness` | PASS (0 in-scope thick routes) |
| Build frontend jest | 211 suites / 1563 tests pass |
| Backend Build suite | 221 suites / 2137 tests pass |
| Backend `pnpm typecheck` | exit 0 |
| Frontend `pnpm type-check` | exit 0 |

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
