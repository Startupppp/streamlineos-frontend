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
- [x] Coordinator/paired: getDueLoanRepayments bounded page + payroll-inputs-build caller (PC1; paging loop spec by coordinator)
- [x] Coordinator: deleted dead CACHE_KEYS ticketsList/customStates/projectLabels (decision records kept)
- [x] BA7 Home follow-up: approval writers (build approvals, attention adapters) bump the approver's inbox namespace; 22+ calendar unprojected selects
- [x] Coordinator: check:cache-invalidation now passes (analytics readers use the literal namespace the 12 writers bump)
- [x] Deferred (inbox bump now moot: BY removed the inbox read cache): 8 calendar stores still full-row (typed $inferSelect views) — projected: meeting workspace/content, source-action (+repair) stores; booking-payment list/due kept full (view maps all 31 columns). Coordinator: re-added columns the BA7 projections dropped (poll option startAt/endAt, locked hold id/fencingToken, resource booking lifecycleVersion, lifecycle booking id/orgId/hostMembershipId/providerSyncStatus). UNTESTED
- [x] Coordinator: travel nav keys aligned to hr:travel:view/manage; nav digest updated
- [x] Coordinator: index migrations — none needed: users trgm already exist (no RLS); cycles trgm dead under RLS (non-leakproof ILIKE); work_item_relations served by uniq_work_item_relation + idx_..._related (int eq is leakproof, 0999 dropped the dup); modules has no deleted_at and idx_modules_project serves the per-project list

## Phase 2C — paired contract changes (BE + FE together)
- [x] HRMS keyset pagination: done by PC1 (see Wave C)
- [x] Build: drop `storyPoints` alias (keep `estimate`), drop `q` (keep `search`) (CA DONE UNTESTED)
- [x] NavGroup alias: `product` removed, `module` canonical (no `product` field left in sidebar-nav-types)
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
- [x] Forwarding-function sweep (user rule 10-22): FE — isValidHexColor/normalizeHexColor merged, getSuggestFieldsDisabledReason, rowLabel, roadmapSignalsQueryKey, inboxListDefaultQueryOptions removed. BE (lane BF) — facade forwarders deleted in performance-reviews (12), attendance (8), recruitment-sourcing (8), payroll-inputs adjustments (4), analytics-plus getCommandCenter, hr-policies preview, plus calendar/chat/lifecycle candidates; callers inject the sub-services directly. Rescan: only buildAttendanceSummary left (KEEP: hides internal scope param). Kept by rule: controller handlers, interface methods (sendTest), private Map/Set wrappers. Deferred: manifest productKey rename → Build paired contract lane. UNTESTED (user rule)

- [x] FW: 15 Build factories spread by their hooks (4 moved to *-read-options.ts); prefetch added for project home, cycle detail, my-work, approvals, build inbox. Coordinator: BoardFilters/TicketOrderBy/TicketOrderDir importers re-pointed to ticket-queries-read-options, re-export removed (FE-128)
- [x] BY: per-user notification/inbox read caches removed (NOTIF_READ_NS, cacheRead, hasStoredReadPolicies, approval-writer bumps); 556 specs green; landed in user commit b08333aa7
- [x] PC1 HRMS keyset: hiring-flows, automations, webhooks + deliveries, drilldown, case notes/docs, getDueLoanRepayments (BE in user commit b08333aa7; FE hooks → useInfiniteQuery + sentinel). Coordinator: payroll paging loop extracted (allDueLoanRepayments) + 3-page spec with mutation check; automations access test mock moved to the paged shape
- [x] Paired contract lane, Build part: ticket aliases (points/storyPoints/estimate, assigneeId/assignee/assignees), member q vs search, list-view + cycle planning keyset, assets server filters, manifest productKey rename — after FW/RO3 (CB DONE UNTESTED: productKey -> moduleKey across BE registry/scripts/manifest + FE manifest/sidebar/header ModuleGrid/ModuleTile + check-module-manifest.mjs; assets server filters N/A, no Build assets surface and no audit finding. CA DONE UNTESTED: estimate-only, assignee?.id, member search only, list render limit removed (board pane sentinel + My Work pager own paging), cycle planning sheet uses paged board query with unscheduled + server search, gated on open)

- [x] FQ part 3: hr-people.ts 22 literal keys → factories, all hook-spread; 3 staleTime drifts + document-templates key fixed; no queryKey literals left in hr*/me prefetch

- [x] FBC follow-up 2: all 30 Build factories spread by their hooks; budget page now prefetched behind build:manage (same key as useProjectBudget)
- [x] Coordinator gate added: lib/prefetch/query-options-consumers.test.ts (every factory a prefetch spreads is used by client code). Fixed inbox list (unifiedInboxListQueryOptions shared by useUnifiedInbox + prefetch). Consumer test green. Test 3 added: no prefetch may reach a "use client" module (111 chains found: calling a client-module export on the server throws, the catch swallows it, so those prefetches never ran)
- [x] RO1: hr-people, hr-ops, me, dashboard prefetch graphs clean of "use client" (traced); doc-templates list URL fixed; doc-review now prefetches the summary the page reads. Coordinator: template DETAIL URL also fixed (/hr/documents/templates/:id), doc-review prefetch gated on hr:onboarding:manage. UNTESTED (user rule)
- [x] PG: 51 per-read prefetch gates added (hr-people 25, hr-ops 9, hr-talent 12, me 5), each on the hook's exact key; hr-ops/hr-talent gained try/catch. Ungated by design (hook has no permission key): announcements, hr hub, me money (self-service), me team. No page gate changed. UNTESTED (user rule)
- [x] RO2: hr-talent, hr-time, hr prefetch graphs clean of "use client" (traced by coordinator); HR factory duplicates gone. UNTESTED (user rule)
- [x] RO3: build-portfolio, build-project-extras, build prefetch graphs clean (traced: all 30 prefetch files clean); hook-local factory duplicates removed. Coordinator: useBulkUpdateManagedProducts moved from managed-products-schema.ts to managed-product-mutations.ts (schema file pulled authorized-mutation into build-portfolio), 3 unused schema exports dropped. UNTESTED (user rule)
- [x] PC1 done: hr-automations / hr-webhooks / cases read-options handed to RO2; PC1 HR dirs handed to BF
- [x] User /code-review max --fix: templates infiniteQueryOptions generics (data.pages type error), hr-webhooks import after statement, hr-automations duplicate import — fixed

## Phase 3 — verification (USER RULE 10-22: user runs tests/lint/build themselves; coordinator does not run scripts)
- [ ] (running) BX backend spec repair: 48 suites failing after Wave A (mostly mock drift; checking real regressions)
- [ ] Backend tsc · lint · focused jest
- [ ] Frontend type-check · lint · knip · focused jest · next build
- [x] Coordinator fixes after FS: nav groups computed once (hook applies HR week-one, AppSidebar takes prop); restored named slot renderers (FS passed a dynamic component to a function-called slot → hooks-order crash); removed 3 added comments; getNavGroupsForProduct → getNavGroupsForModule
- [x] Coordinator (after FH1/FH3): export queryOptions from hr exit/attendance/expenses/documents/manager-home hooks; replace hand-typed keys in lib/prefetch/me.ts; share documentTypes/delegations/positions queryOptions with lib/prefetch/hr-people.ts — done by FQ (10 prefetches, 7 factories); part 2 running: hr.ts, hr-ops.ts, hr-time.ts literal keys
- [x] Unwired-module sweep · RBAC gate parity — all BE modules in the graph (EntityReferenceModule via consumers); no lost gates vs 1b789bff6 (backend ff2f38e51): every removed useCan/requirePermission moved to the same path, hr/benefits strengthened. kb:ask:view (not in catalog) → kb:ai:generate (the Ask endpoint key). ../sl-baseline removed
- [ ] Local commits (root + backend)
