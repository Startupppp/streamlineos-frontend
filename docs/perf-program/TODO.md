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
- [x] Coordinator: index migrations — none needed: users trgm already exist (no RLS); cycles trgm dead under RLS (non-leakproof ILIKE); work_item_relations served by uniq_work_item_relation + idx_..._related (int eq is leakproof, 0999 dropped the dup); modules has no deleted_at and idx_modules_project serves the per-project list

## Phase 2C — paired contract changes (BE + FE together)
- [ ] HRMS keyset pagination: hiring-flows, automations rules/webhooks, analytics drilldown, case notes/documents
- [ ] Build: drop `storyPoints` alias (keep `estimate`), drop `q` (keep `search`)
- [ ] NavGroup alias: keep `module`, delete `product` (in FS)
## Phase 2B — frontend fixes (BRIEF-FRONTEND.md; prefetch + per-page loading + cache patching + pagination + dead code + compiler cleanup + RBAC)
- [x] FS Shell/sidebar/nav (L7) incl. NavGroup `product` → `module`, ProductKey → ModuleKey (user ruling: "product" = Build managed products only)
- [x] FH1 HR people & documents — 29 pages: 25 prefetched, 2 create forms, find-expert (input-driven), org-chart (session key); 35 key factories; editor gate restored to manage
- [x] FH2 HR time & settings (attendance, leaves, holidays, shifts, rosters, overtime, comp-off, geofencing, settings…)
- [x] FH3 HR talent & analytics (performance, goals, kpis, benefits, engagement, analytics, workforce, hub) — comp-planning/equity/retention prefetched; coordinator restored factory spreads in 7 hooks, gating test follows spreads, 7 private enterprise-comp keys → factory
- [x] FH4 HR pay, cases & ops (expenses, travel, cases, safety, assets, service-delivery, enterprise ops)
- [x] FME Employee self-service `/me` (7/7 pages prefetched, orphan me/loading.tsx + 9 empty dirs removed)
- [x] FBA Build cross-project pages — 10 pages prefetched, 13 files split under 300 lines, recharts lazy, FE-137 fix; follow-up FW: hooks spread factories, my-work/approvals/inbox prefetch
- [x] FBB Build project tickets/board/list/cycles/ticket-details — 12 pages, factory aliases removed, 3 files split; follow-up FW: hooks spread factories, project home + cycle detail prefetch targets
- [x] FBC (39 pages: 33 prefetched, 6 valid skips) — Build project other pages (wiki, files, intake, qa, releases, risks, meetings…)
- [x] FHM Home: dashboard, calendar, chat, inbox, mail (L5) — primary-read prefetch (dashboard 4 widgets, inbox list, chat channels, mail default list, calendar settings); calendar events skip = browser timezone range; coordinator: deleted recreated /calendar/resource-approvals (removed by 39433480c, it is a workspace tab), fixed mail prefetch key (all-accounts, was accounts[0] = never hydrated), deleted 3 test-only prefetch fns, send/reply invalidation refetches thread+Sent+inbox+unified lists, test comparator fixed (String(obj) matched any object)
- [x] FKB Knowledge: docs/wiki/Ask OS/research briefs (L6). 19 factories each spread by a hook and the prefetch; private/shared/doc/space pages prefetched. Coordinator fix: spaces-list prefetches gated on kb:spaces:view per read.
- [ ] Forwarding-function sweep (user rule 10-22, FE-126/BE-144 tightened): after Build/Home/KB lanes finish, sweep in-scope FE + BE for any function/method whose body only returns another call with the same args (exported or private, class methods too); merge duplicate isValidHexColor (lib/column-colors.ts + components/labels/label-colors.ts); check lib/module-manifest moduleByProductKey naming vs module rule

- [ ] (running) FW: wire 15 Build factories into hooks; prefetch project home, cycle detail, my-work, approvals, build inbox
- [ ] (running) BY: remove per-user notification/inbox read caches (stored-read policies need live auth per read; cache was dead in prod)
- [ ] (running PC1: HRMS part) Paired contract lane: HRMS keyset (hiring-flows, automations, webhooks, drilldown, case notes/docs), getDueLoanRepayments, Build ticket aliases, member q/search, assets filters, Build list-view + cycle planning keyset

- [ ] (running) FQ part 3: hr-people.ts 21 literal keys → factories (part 2 done: hr/hr-ops/hr-time 27 factories, all hook-spread, 5 staleTime drifts fixed)

- [ ] (running) FBC follow-up 2: hooks spread its 29 factories (0 did); budget skip reason. Coordinator removed stale assets-page entry from aggregate-import-known.json (FH4 dropped the import)
- [ ] Coordinator gate: test that every exported *QueryOptions factory has a non-prefetch consumer (hook) and every lib/prefetch spread targets one — add after FBC/FKB/FW finish

## Phase 3 — verification
- [ ] (running) BX backend spec repair: 48 suites failing after Wave A (mostly mock drift; checking real regressions)
- [ ] Backend tsc · lint · focused jest
- [ ] Frontend type-check · lint · knip · focused jest · next build
- [x] Coordinator fixes after FS: nav groups computed once (hook applies HR week-one, AppSidebar takes prop); restored named slot renderers (FS passed a dynamic component to a function-called slot → hooks-order crash); removed 3 added comments; getNavGroupsForProduct → getNavGroupsForModule
- [x] Coordinator (after FH1/FH3): export queryOptions from hr exit/attendance/expenses/documents/manager-home hooks; replace hand-typed keys in lib/prefetch/me.ts; share documentTypes/delegations/positions queryOptions with lib/prefetch/hr-people.ts — done by FQ (10 prefetches, 7 factories); part 2 running: hr.ts, hr-ops.ts, hr-time.ts literal keys
- [ ] Unwired-module sweep · RBAC gate parity
- [ ] Local commits (root + backend)
