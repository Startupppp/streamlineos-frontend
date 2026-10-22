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
- [x] BA1 HRMS caching + invalidation (L2 cat 3) — reworked: per-policy ns, hire/exit fan-out 15→8, unrelated aggregates TTL-only
- [x] BA2 HRMS projections + Promise.all (L2 cat 2); pagination specs for paired lane
- [x] BA3 HRMS dead code, orgId alias, controller RBAC → service, N+1 applier (L2 cat 1/5/6)
- [x] BA4 Build: roadmap N+1, getProject cache, DONE literal, sprints, analytics key (L4)
- [x] BA5 Home: notifications/inbox cache, projections, PAGE_SIZE_MAX (L5 C/D/I)
- [x] BA6 Docs/KB/Ask backend caching + invalidation + queries (L6)
- [x] Coordinator: hr-policies.controller → HrPolicyConflictService direct; delete detectConflicts/detectOrgConflicts wrappers
- [ ] Coordinator/paired: getDueLoanRepayments bounded page + payroll-inputs-build caller
- [x] Coordinator: deleted dead CACHE_KEYS ticketsList/customStates/projectLabels (decision records kept)
- [x] BA7 Home follow-up: approval writers (build approvals, attention adapters) bump the approver's inbox namespace; 22+ calendar unprojected selects
- [x] Coordinator: check:cache-invalidation now passes (analytics readers use the literal namespace the 12 writers bump)
- [ ] Deferred: hr-workflow-engine approval writers inbox bump; 8 calendar stores still full-row (typed $inferSelect views)
- [x] Coordinator: travel nav keys aligned to hr:travel:view/manage; nav digest updated
- [ ] Coordinator: index migrations (modules, cycles trgm, workItemRelations, members search)

## Phase 2C — paired contract changes (BE + FE together)
- [ ] HRMS keyset pagination: hiring-flows, automations rules/webhooks, analytics drilldown, case notes/documents
- [ ] Build: drop `storyPoints` alias (keep `estimate`), drop `q` (keep `search`)
- [ ] NavGroup alias: keep `module`, delete `product` (in FS)
## Phase 2B — frontend fixes (BRIEF-FRONTEND.md; prefetch + per-page loading + cache patching + pagination + dead code + compiler cleanup + RBAC)
- [x] FS Shell/sidebar/nav (L7) incl. NavGroup `product` → `module`, ProductKey → ModuleKey (user ruling: "product" = Build managed products only)
- [ ] (running, follow-up: prefetch 7→31 pages; editor gate restored to manage) FH1 HR people & documents (employees, org, onboarding, exit, termination, fnf, bgv, documents…)
- [x] FH2 HR time & settings (attendance, leaves, holidays, shifts, rosters, overtime, comp-off, geofencing, settings…)
- [x] FH3 HR talent & analytics (performance, goals, kpis, benefits, engagement, analytics, workforce, hub)
- [x] FH4 HR pay, cases & ops (expenses, travel, cases, safety, assets, service-delivery, enterprise ops)
- [x] FME Employee self-service `/me` (7/7 pages prefetched, orphan me/loading.tsx + 9 empty dirs removed)
- [ ] (running) FBA Build cross-project pages (all-work, command-center, goals, roadmap, portfolios, managed-products…)
- [ ] (running) FBB Build project tickets/board/list/cycles/ticket-details
- [ ] (running) FBC Build project other pages (wiki, files, intake, qa, releases, risks, meetings…)
- [ ] (running) FHM Home: dashboard, calendar, chat, inbox, mail (L5)
- [ ] (running) FKB Knowledge: docs/wiki/Ask OS/research briefs (L6)
## Phase 3 — verification
- [ ] (running) BX backend spec repair: 48 suites failing after Wave A (mostly mock drift; checking real regressions)
- [ ] Backend tsc · lint · focused jest
- [ ] Frontend type-check · lint · knip · focused jest · next build
- [x] Coordinator fixes after FS: nav groups computed once (hook applies HR week-one, AppSidebar takes prop); restored named slot renderers (FS passed a dynamic component to a function-called slot → hooks-order crash); removed 3 added comments; getNavGroupsForProduct → getNavGroupsForModule
- [ ] Coordinator (after FH1/FH3): export queryOptions from hr exit/attendance/expenses/documents/manager-home hooks; replace hand-typed keys in lib/prefetch/me.ts
- [ ] Unwired-module sweep · RBAC gate parity
- [ ] Local commits (root + backend)
