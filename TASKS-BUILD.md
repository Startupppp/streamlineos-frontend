# TASKS — Build module refactor

Updated: 2026-08-10 · **Done: 46 / 62**

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
- [ ] SCH-004 `serial` (int4) PKs → `generatedAlwaysAsIdentity` — ceiling 2.1B vs a 100M-row target
- [ ] SCH-005 no `version` column anywhere → no optimistic locking
- [ ] SCH-006 no `deleted_at` on `tickets` → hard deletes lose history
- [ ] SCH-007 `timestamp` without timezone on tickets/comments/activity; sprint bounds are `timestamp`
- [ ] SCH-008 three estimate columns (`points`, `storyPoints`, `estimate`)
- [ ] SCH-010 `ticket_comments` (160MB) / `ticket_activity_log` (157MB) unpartitioned

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
- [!] API-005 `COUNT(*)` per list request — blocked on RPT-002 (needs a maintained aggregate)
- [!] API-008 portfolio rollup — blocked on RPT-002. Plan already index-optimal; only fix is a
      materialised aggregate and there is no scheduler

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
- [ ] SEC-003 `build:manage` is a two-segment key with `resource: "projects"` — cosmetic

## Phase 4 — reporting
- [x] **RPT-003** burndown `COALESCE`d across two status systems — closed by SCH-002
      Evidence: snapshot/burnup/velocity now read `project_statuses.type` via a real join
- [ ] RPT-001 no sprint scope-event log → burndown/velocity not reconstructible
- [ ] RPT-002 snapshot is an on-demand endpoint with no scheduler → history has holes
- [ ] TIME-004 rates resolved live at billing time, not snapshotted onto the entry

## Phase 5 — UI
- [x] **UI-001** all 9 workspace routes de-re-exported; 5 inline page components extracted to
      `features/` (max 452 lines)
- [x] Nav: `/build/page.tsx` re-export fixed; module mislabelled "Product Management" → "Build";
      2 banned legacy redirect routes deleted
- [ ] UI-002 workspace routes validate `pmWorkspaceId` but do not scope data by it — product decision
- [ ] UI-003 `/build/workspaces/[id]/pm-workspaces` incoherent nesting
- [x] UI-004 UTF-8 BOM in `build/all-work/page.tsx` — removed
      Evidence: `od -c` on the file now starts `i m p o r t`, no `\357\273\277`
- [ ] UI-004b BOMs are **repo-wide** (~300 frontend files), not a Build defect — a convention artifact.
      Deliberately NOT stripped: harmless to TypeScript, and rewriting ~300 files in a tree shared with
      three concurrent sessions is pure diff noise and conflict risk for zero functional gain

## Phase 6 — product management schema
- [ ] PM-001 feedback stores free-text email, no CRM FK → revenue-weighted prioritisation impossible
- [ ] PM-002 no RICE inputs stored, only a vote counter
- [ ] PM-003 `managed_products` has no releases entity, only `changelogEntries.version text`
- [ ] PM-004 no feedback dedup/merge
- [ ] PM-013 feedback links to a project, never to a product
- [x] **PM-012** owner FK `restrict` → `set null` (column confirmed nullable)
- [ ] PM-011/014 `serial` PKs and inconsistent PK naming — cosmetic

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
- [ ] Resync `migrations/meta` snapshots at a TTY (B-10) — **hard external blocker**, needs a terminal
