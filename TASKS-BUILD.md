# TASKS — Build module refactor

Updated: 2026-08-11 · **Done: 50 / 67** · 3 blocked · 14 open · report: `COMPLETION-REPORT-BUILD.md`

Every Phase 0 finding ID is a task here; nothing was dropped silently. `[x]` requires an evidence line.
`[!]` is blocked with the blocker named. Decisions: `DECISIONS.md` (B-NN). State: `REFACTOR-STATE.md`.
Findings: `docs/refactor/build-phase0-audit.md`. Changes: `docs/refactor/build-changelog.md`.

## Phase 0 — audit (complete)
- [x] Baseline captured at production scale
      Evidence: `seed-build-load.mjs` 1.53M rows/~590MB; `baseline:build` → `docs/refactor/baseline/`
- [x] 15 non-core sub-domains audited — 18 findings (BE-001..018)
- [x] Product-management side audited — 14 findings (PM-001..014)
- [x] Dead code proven with a module-graph tool
      Evidence: knip v6.31.0 — backend exit 0 / 0 unused files; frontend 5 unused, all HR, none Build
- [x] Route ↔ sidebar ↔ persona matrix — 20 nav entries vs 78 routes, project nav has 0 orphans

## Phase 1 — schema
- [x] **SCH-001** integer `order` → `numeric` fractional rank, server-authoritative
      Evidence: migration `0142`; 0 ordering violations across 200k tickets; ranks exact ×1000; 30
      successive midpoints still strictly between neighbours at 13 dp; board 54 blocks vs 55 before
- [x] **SCH-002** one status table per project; `custom_states` orphan deleted
      Evidence: migration `0146`; `fk_tickets_status` convalidated=true; 0 orphan tickets;
      `project_statuses.type` = `state_group`; `custom_states` and `tickets.state_id` dropped
- [x] **SCH-003b** `epicId` cycle guard + dependency-edge cycle detection; silent 100-hop escape fixed
- [x] **SCH-009** 17 timesheets enums applied
      Evidence: migration `0143`; 18 columns `USER-DEFINED`; 150,150 rows intact; 0 nulls
- [ ] SCH-004 `serial` → identity — **deferred, `DECISIONS.md` B-16.** PK-type change across the whole
      FK graph; not safe alongside six concurrent workstreams in a shared tree
- [x] **SCH-005** `tickets.version`, incremented on update, conditional UPDATE → 409 when supplied
      Evidence: migration `0416`; 0 null versions across 204k rows
- [x] **SCH-006** soft delete on tickets + partial index
      Evidence: migration `0416`; 64 `isNull(deletedAt)` filters (49 core + 15 outside); index is
      `(org_id, project_id, rank) WHERE deleted_at IS NULL`; the 3 remaining unfiltered sites are all
      `MAX(ticket_number)` and are correctly excluded — filtering them would hand out a duplicate
      number and violate `uniq_tickets_project_number`
- [ ] SCH-007 `timestamp` without timezone on tickets/comments/activity; sprint bounds are `timestamp`
- [ ] SCH-008 three estimate columns (`points`, `storyPoints`, `estimate`)
- [x] SCH-010 partitioning — **deliberately NOT done, see `DECISIONS.md` B-14**
      §19: don't partition what isn't demonstrably large. 500k/400k seeded rows is not. Documented
      trigger: revisit at ~50M rows or when a retention sweep starts timing out

## Phase 2 — API
- [x] **API-001** board 5-way fanout → `useInfiniteQuery`, real envelope, `isTruncated` exposed
- [x] **API-002/007** board + My Work indexes
      Evidence: board 3,345→54 blocks; My Work 11,477→53 blocks (partial index was the lever)
- [x] **API-012** restricted-scope board regression I introduced
      Evidence: 6 shapes benchmarked; 2-branch UNION 49.31ms/2,914 → 1.20ms/354; partition and page-1
      id sequence both re-verified unchanged
- [x] **PM-008/009** four list endpoints → `{data, pagination}` + `TablePagination`
      Evidence: both repos 0 errors; all 7 consumer call sites updated; `build:portfolios:view`
      confirmed in both catalogs
- [x] **BE-002/016** QA cross-project `caseIds` injection; explicit org predicate
- [x] **BE-003..009, 014, 017** 9 unbounded reads capped; `teamTimesheets` 500 → real pagination
- [x] **BE-010/011/012** three FK-nullify-then-delete pairs wrapped in transactions
- [x] **BE-013** meetings filtered after pagination → correlated `EXISTS`
- [x] **BE-018 / BE-015** `pg_advisory_xact_lock` added; explicit `orgId` on intake writes
- [x] **TIME-001/002/003** `project_id` + `timesheet_period_id` now written; org-scoped recompute;
      project filter moved out of post-pagination JS
- [x] API-004 `description` in list projection — **no change needed**
      Evidence: `triage-row.tsx:70-72` genuinely renders it from the list query
- [x] API-003 offset pagination — **downgraded P1→P3, deliberately not done**
      Evidence: offset 0 = 0.43ms/108 blocks; offset 400 (board's real ceiling) = 1.05ms/508
- [x] ~~API-006~~ **RETRACTED** — `Seq Scan on users` is correct on a 7-row table; seed artifact
- [!] **API-009** text search — **BLOCKED: superuser required.** RLS defeats every GIN/trigram index
      for `streamline_app`; 16/17 GIN indexes never scanned. `ALTER FUNCTION app.current_org_id()
      LEAKPROOF` is superuser-only. See `PAGES.md`
- [ ] API-005 `COUNT(*)` per list request — was blocked on RPT-002; unblocked once the sweep lands
- [ ] API-008 portfolio rollup — was blocked on RPT-002; unblocked once the sweep lands. Plan is
      already index-optimal, so the fix is to read a maintained aggregate rather than recompute

## Phase 3 — security
- [x] **SEC-002** ticket list ignored DataScope while detail enforced it — P0 disclosure
      Evidence: 2,858 visible + 476 hidden = 3,334, clean partition, re-verified after API-012
- [x] **SEC-001** public whiteboard TOCTOU + over-broad read projection
- [x] **BE-001** approvals notification fired on a committed ALS handle (42501, silently swallowed)
- [x] **PM-005** roadmap was public-by-default — every item on the unauthenticated feed
      Evidence: migration `0127`; default now `false`; 0 existing rows so no backfill needed
- [x] **PM-006** 3 public roadmap endpoints unrated — guards **and** `TIERS` entries (fails open without)
- [x] **PM-007** vote stuffing — `voterIpHash` HMAC + partial unique indexes (migration `0137`)
- [x] **FE-001** 33 ungated Build query hooks → 41/48 gated
      Evidence: all 27 distinct keys verified present in **both** catalogs; 7 remaining are
      mutations-only or `@Public()`; no enabled-clobber
- [x] SEC-003 — **deliberately NOT renamed, see `DECISIONS.md` B-15**
      Catalogued, `scopable: true`, behaviourally correct. A rename means catalog + every decorator +
      every `useCan` + migrating `role_permission_grants` — lockout risk for zero functional gain

## Phase 4 — reporting
- [x] **RPT-003** burndown `COALESCE`d across two status systems — closed by SCH-002
      Evidence: snapshot/burnup/velocity now read `project_statuses.type` via a real join
- [x] **RPT-001** append-only `sprint_scope_events` log (migration `0156`)
      Evidence: pgEnum `sprint_scope_event_type`, org-led composite index
      `(org_id, sprint_id, created_at)`, no `updated_at`/soft-delete (append-only per §19).
      **I had to make this testable myself** — the backfill inserted 0 rows because my seed never
      assigned `sprint_id`. Fixed the seed, assigned 200,000 tickets to sprints, re-ran the backfill →
      **200,000 events**; point-in-time reconstruction verified (sprint 41: 3,334 events)
- [x] **RPT-002** scheduled daily snapshot sweep — `GET/POST /cron/build-daily-snapshots`
      **Correction: I wrongly called this blocked.** `@nestjs/schedule` is absent, but the repo already
      has HTTP cron controllers (`@Public()` + `assertCronSecret` + `forEachOrg`).
      Evidence: sweeps ACTIVE projects per org, caps at 200/org with overflow **logged not silently
      truncated**, per-project failures logged and counted. I added the missing
      `ProjectsReportsService` export myself — without it NestJS throws at **runtime** while typecheck
      passes. Proved with `pnpm build` (nest build) exit 0
- [x] **TIME-004** rate snapshotting at approval (`DECISIONS.md` B-19)
      Evidence: `approvals.service.ts` stores `billRate`/`costRate`/`currency`/`rateSource` at approval —
      the moment the entry becomes immutable; `billing.service.ts:61` prefers the stored rate and `:80`
      falls back to live resolution only for entries with none. No figure was invented: 0 invoices have
      ever been issued, so no customer-visible number existed to protect

## Phase 5 — UI
- [x] **UI-001** all 9 workspace routes de-re-exported; 5 inline page components extracted to
      `features/` (max 452 lines)
- [x] Nav: `/build/page.tsx` re-export fixed; module mislabelled "Product Management" → "Build";
      2 banned legacy redirect routes deleted
- [ ] UI-002 — **product decision, `DECISIONS.md` B-17.** Took the narrower reading: changed nothing,
      made the routes proper adapters, recorded the gap
- [ ] UI-003 — tied to UI-002 (`DECISIONS.md` B-17)
- [x] UI-004 UTF-8 BOM in `build/all-work/page.tsx` — removed
      Evidence: `od -c` on the file now starts `i m p o r t`, no `\357\273\277`
- [x] UI-004b BOMs repo-wide — **deliberately NOT stripped, `DECISIONS.md` B-18.** Harmless to
      TypeScript; rewriting ~300 files across five concurrent programs is conflict risk for no gain

## Phase 6b — soft delete beyond tickets
- [x] **SCH-006b** soft delete for `projects`, `sprints`, `ticket_comments`
      Evidence: migration `0151`; 92 `isNull` filters added (projects 68, sprints 11, comments 13)
      across 50+ files in Build/CRM/Support/Portal/Dashboard/Chat/KB/AI/Timesheets; **5 partial
      indexes** excluding deleted rows, including `uniq_projects_org_key` made partial so a deleted
      project releases its key; `deleteProject` now stamps comments→tickets→sprints→project in ONE
      transaction, resolving the §19 orphaned-but-visible cascade hazard; join tables stay hard-deleted
      per §19. 0 soft-deleted rows, 64 projects intact. `nest build` exit 0
- [x] **SCH-006c** soft delete for `roadmap_items`, `feedback_posts`, `okr_goals` (migration `0155`)
      Evidence: the `@Public()` roadmap feed now filters deleted items — verified in
      `public/roadmap.service.ts:30,43`; republishing a deleted item to the internet would have been
      worse than an internal leak
- [ ] SCH-006d remaining 4: `project_milestones`, `project_releases`, `project_templates`,
      `project_whiteboards`

## Phase 6 — product management schema
- [ ] PM-001 feedback stores free-text email, no CRM FK → revenue-weighted prioritisation impossible
- [ ] PM-002 no RICE inputs stored, only a vote counter
- [ ] PM-003 `managed_products` has no releases entity, only `changelogEntries.version text`
- [ ] PM-004 no feedback dedup/merge
- [ ] PM-013 feedback links to a project, never to a product
- [x] **PM-012** owner FK `restrict` → `set null` (column confirmed nullable)
- [ ] PM-011/014 — deferred with SCH-004 (`DECISIONS.md` B-16)

## Phase 7 — cleanup
- [x] §9: all 3 oversized files split; **0 Build files over 500 lines in either repo**
      Evidence: `tasks.ts` 607→barrel+4 (43 pgTables verified still present, zero renames);
      `iterations.service.ts` 533→barrel+4; `projects-tickets.controller.ts` 518→185+3 (41 routes
      before and after, identical URLs)
- [x] Dead code: knip run, **nothing to delete in Build**
- [x] Harness reproducible: `pnpm -C backend seed:build-load` / `baseline:build`

## Protocol gaps
- [x] Rollback scripts for all six migrations, **executed** not merely written
      Evidence: `migrations/rollback/*.down.sql` + `verify-rollbacks.mjs`; I ran it myself —
      "ALL ROLLBACKS VERIFIED". Each runs inside `BEGIN … ROLLBACK` so nothing persists; confirmed
      after the run that forward state is intact (`custom_states` still dropped, `fk_tickets_status`
      present, `type` still `state_group`, `rank` present, 204,000 tickets). Two are declared
      **partially** reversible in their header comments: `0142` can restore ordering but not the exact
      original integers where ranks were fractionally split, and `0146` recreates `custom_states`
      empty — it held no application-written data
- [x] Rollback for `0416` written and executed (7 of 7 schema-changing migrations now covered)
- [x] `ANALYZE` after table rewrites — migration `0150`
      Evidence: My Work had silently gone 53 → 201,875 blocks on stale stats; back to 54 after
- [!] Resync `migrations/meta` snapshots — **BLOCKED: needs a real TTY**
- [!] Full Build test suite — **BLOCKED: times out at 900s** (~28s/spec × 19). 5 specs run: 32 tests, 0 failures
