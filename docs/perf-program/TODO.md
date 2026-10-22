# Perf & cleanup program — 2026-10-22

Scope: HRMS (`/hr`, `/me`), Build, Home (`/dashboard`, calendar, chat, inbox, mail), Documents/KB + Ask OS (`/knowledge`).
Baseline: root `3d8b74aea` · backend `ff2f38e51`. Commit locally per wave, never push.

## Phase 0 — rules & foundation
- [x] React Compiler on (`reactCompiler: true`, `babel-plugin-react-compiler`)
- [x] Strict react-hooks lint extended to all in-scope paths
- [x] FE-114 rewritten for the compiler; FE-143..147 added (dup keys, per-page loading, fast load, pagination, access)
- [x] BE-158..160 added (dup keys, cache + invalidation, efficient queries)

- [x] Targeted-invalidation rule: BE-159 extended, FE-148 added, briefs updated

## Phase 1 — audit (8 lanes, ledgers in this folder)
- [x] L1 HRMS frontend
- [x] L2 HRMS backend
- [x] L3 Build frontend
- [x] L4 Build backend
- [x] L5 Home frontend + backend
- [x] L6 Docs/KB + Ask OS frontend + backend
- [x] L7 Shared layout/sidebar/nav/hooks used by in-scope modules
- [x] L8 Per-page loading.tsx inventory across all in-scope routes

## Phase 2A — backend fixes (non-contract)
- [ ] BA1 HRMS caching + invalidation (L2 cat 3) — REWORK: targeted invalidation (per-policy ns, aggregates only from source writers)
- [x] BA2 HRMS projections + Promise.all (L2 cat 2); pagination specs for paired lane
- [ ] BA3 HRMS dead code, orgId alias, controller RBAC → service, N+1 applier (L2 cat 1/5/6)
- [ ] BA4 Build: roadmap N+1, getProject cache, DONE literal, sprints, analytics key (L4)
- [ ] BA5 Home: notifications/inbox cache, projections, PAGE_SIZE_MAX (L5 C/D/I)
- [ ] BA6 Docs/KB/Ask backend caching + invalidation + queries (L6)
- [ ] Coordinator: hr-policies.controller → HrPolicyConflictService direct; delete detectConflicts/detectOrgConflicts wrappers
- [ ] Coordinator/paired: getDueLoanRepayments bounded page + payroll-inputs-build caller
- [ ] Coordinator: index migrations (modules, cycles trgm, workItemRelations, members search)

## Phase 2C — paired contract changes (BE + FE together)
- [ ] HRMS keyset pagination: hiring-flows, automations rules/webhooks, analytics drilldown, case notes/documents
- [ ] Build: drop `storyPoints` alias (keep `estimate`), drop `q` (keep `search`)
- [ ] NavGroup `module` alias → `product`
## Phase 2B — frontend fixes (BRIEF-FRONTEND.md; prefetch + per-page loading + cache patching + pagination + dead code + compiler cleanup + RBAC)
- [ ] FS Shell/sidebar/nav (L7) incl. NavGroup `module` → `product`
- [ ] FH1 HR people & documents (employees, org, onboarding, exit, termination, fnf, bgv, documents…)
- [ ] FH2 HR time & settings (attendance, leaves, holidays, shifts, rosters, overtime, comp-off, geofencing, settings…)
- [ ] FH3 HR talent, pay, ops (performance, goals, benefits, expenses, cases, assets, analytics, enterprise…)
- [ ] FME Employee self-service `/me`
- [ ] FBA Build cross-project pages (all-work, command-center, goals, roadmap, portfolios, managed-products…)
- [ ] FBB Build project tickets/board/list/cycles/ticket-details
- [ ] FBC Build project other pages (wiki, files, intake, qa, releases, risks, meetings…)
- [ ] FHM Home: dashboard, calendar, chat, inbox, mail (L5)
- [ ] FKB Knowledge: docs/wiki/Ask OS/research briefs (L6)
## Phase 3 — verification
- [ ] Backend tsc · lint · focused jest
- [ ] Frontend type-check · lint · knip · focused jest · next build
- [ ] Unwired-module sweep · RBAC gate parity
- [ ] Local commits (root + backend)
