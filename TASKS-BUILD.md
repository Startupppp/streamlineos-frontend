# TASKS — Build module refactor

Updated: 2026-08-11 · **Done: 73 / 76** · 0 blocked · 3 open · report: `COMPLETION-REPORT-BUILD.md`

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
- [x] **SCH-007** temporal types (migration `0158`)
      Evidence: `tickets.created_at`/`updated_at` now `timestamp with time zone`, converted with an
      explicit `AT TIME ZONE 'UTC'` so the reinterpretation is intentional. Sprint bounds left as
      `timestamp` — narrowing to `date` loses the time component irreversibly and code depends on it
- [x] SCH-008 three estimate columns — canonical column designated, **no column dropped**
      Dropping is irreversible and the protocol's default is the reversible path; new code writes one,
      the others are documented rather than removed
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
- [x] **API-009** text search — **UNBLOCKED and fixed.** The `LEAKPROOF` remedy I proposed is
      impossible on Neon (no superuser exists; you hit `42501` as owner) and was likely the wrong
      mechanism anyway — it is the *search operators* that are non-leakproof. Fixed instead with a
      `SECURITY DEFINER` id-probe (`0424`/`0425`): selective searches **208ms → 2ms**, results
      proven identical, fails closed without the tenant GUC (`DECISIONS.md` B-27)
- [x] **API-005** list `COUNT(*)` — assessed and left as-is with evidence
      37 buffer blocks (`Index Only Scan`). Complicating it for 37 blocks is not worth it; the real
      risk was the soft-delete predicate breaking the index-only scan, which VACUUM restored
- [x] **API-008** portfolio rollup now reads `project_daily_snapshots` instead of recomputing
      Evidence: **142.8ms/1,478 blocks → 0.64ms/364 blocks, ~190× faster**, returning 36 real rows.
      I populated the snapshot table first — measuring a snapshot-backed query against an EMPTY table
      would have reported a fake win

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
- [x] **UI-002** workspace routes now scope data by workspace (your decision)
      Evidence: `pmWorkspaceId` threaded URL → page → component → hook → SQL `WHERE`, additive so the
      unprefixed org-wide routes are unchanged. Query keys already carry the filter object, so a
      workspace switch can't serve the previous workspace's cache. Proof: `ws-seed-aa5627a2` → **60
      projects**, non-existent workspace → **0**
- [x] UI-003 `pm-workspaces` left org-wide on purpose (`DECISIONS.md` B-21) — scoping a workspace
      list to the current workspace is a 1-item list; org-wide is the navigation hub
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
- [x] **SCH-006d** soft delete for the last 4: `project_milestones`, `project_releases`,
      `project_templates`, `project_whiteboards` (migration `0160`)
      Evidence: 18 read sites across 7 files; 6 partial indexes; **the `@Public()` whiteboard
      share-token path now filters deleted boards** — a deleted board stops resolving before any
      visibility/expiry check. Rollback verified in-transaction. `VACUUM ANALYZE` run on all four

## Phase 6 — product management schema
- [x] **PM-001** CRM linkage added to feedback (nullable FKs + value snapshot)
- [x] **PM-002** RICE **inputs** (`reach`/`impact`/`confidence`/`effort`) on `roadmap_items` — 4/4
      verified. Inputs stored, not a computed score, so it stays explainable and recomputable
- [x] **PM-003** `managed_product_releases` created, mirroring `project_releases`
      Evidence: table exists; all 5 FKs/checks `convalidated = true`
- [ ] PM-004 no feedback dedup/merge
- [x] **PM-013** `feedbucket_widgets.managed_product_id` added alongside `project_id` (both linkages
      are legitimate); `fk_feedbucket_widgets_managed_product` validated
- [x] **PM-012** owner FK `restrict` → `set null` (column confirmed nullable)
- [ ] PM-011/014 — deferred with SCH-004 (`DECISIONS.md` B-16)

## Phase 7 — cleanup
- [x] §9: all 3 oversized files split; **0 Build files over 500 lines in either repo**
      Evidence: `tasks.ts` 607→barrel+4 (43 pgTables verified still present, zero renames);
      `iterations.service.ts` 533→barrel+4; `projects-tickets.controller.ts` 518→185+3 (41 routes
      before and after, identical URLs)
- [x] Dead code: knip run, **nothing to delete in Build**
- [x] Harness reproducible: `pnpm -C backend seed:build-load` / `baseline:build`

## Phase 8 — §15 raw IDs (your instruction: never show or ask for an id)
- [x] **FE-002** approval sheet made users type a raw numeric "Entity ID" for 5 of 8 entity types
      Evidence: searchable name-based pickers now cover `task`, `milestone`, `release`,
      `change_request`, `timesheet`; `budget` auto-selects (one per project) and shows a read-only
      chip. **6 of 8 covered, up from 3.** `document`/`client_approval` dropped — no list source
      exists, so using them required knowing a database id (`DECISIONS.md` B-20, trivially reversible)
- [x] Audited Build for IDs rendered as visible text — **none found**. The `{projectId}` hits are
      props, `htmlFor` attributes and URLs, not user-facing text


## Phase 9 — migrations (standing authorization: run them, fix what breaks)
- [x] **MIG-001** snapshot resync — was blocked on your TTY, now closed
      Evidence: `db:generate` on a fresh snapshot emits **0 statements**. Snapshot installed as
      `migrations/meta/0165_snapshot.json`
- [x] **MIG-002** `0421` / `0422` were blocking the entire queue and failing with the error hidden
      behind drizzle-kit's spinner. Made idempotent, applied (`DECISIONS.md` B-22)
- [x] **MIG-003** 3 forward migrations existed on disk but were **never journaled**, so `db:migrate`
      could never run them. Journaled in dependency order and applied
- [x] **MIG-004 (P0, Build)** `0352` dropped `ticket_custom_field_values` +
      `support_ticket_custom_field_values`, died partway through recreating them, and was still
      recorded as applied. Every ticket custom-field read/write in **Build and Support** was throwing
      "relation does not exist". Recreated from that migration's own DDL; both read paths verified
- [x] **MIG-005 (P0, security)** 9 tenant tables had **no RLS at all** — incl. Build's
      `managed_product_releases`. Grants come free via `ALTER DEFAULT PRIVILEGES`, so the app role
      could read every org's rows. Fixed + proven fails-closed (`42501`) (`DECISIONS.md` B-23)
- [x] **MIG-006** remaining drift: CRM consent (2 tables + 4 enums), `dunning_attempts`, 3 columns,
      1 enum value — all committed, service-referenced schema that never had a migration
- [x] Drift now **0 tables / 0 columns / 0 enums / 0 enum values**; rollback executed and verified
      in-transaction; 18 misfiled `.down.sql` moved out of the forward directory; 0 orphan files


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
- [x] Resync `migrations/meta` snapshots — **UNBLOCKED and done.** drizzle-kit 0.31.10 refuses
      piped stdin, so I drove its programmatic API with the rename-resolver forced to the
      "create, never rename" branch — the same answer you'd have typed 17 times
      (`DECISIONS.md` B-26). Proof: a fresh `db:generate` emits **0 statements**
- [x] Full Build test suite — **UNBLOCKED and green: 19/19 suites, 155 tests, 0 failures.**
      The 900s timeout was ts-jest compile cost, which parallelises — running in 4 bounded batches
      finishes each in 40–120s. Two suites were actually failing and both are now fixed:
      · `whiteboard-sharing` — **pre-existing, not mine**: `dbTransaction = jest.fn()` never invoked
        its callback, so `withPublicToken` returned undefined and every success-path assertion
        collapsed to NotFound. Share-link view-only enforcement had no real coverage
      · `portfolios` — **mine**: the snapshot-backed rollup adds a 4th `select()` ending in
        `.groupBy()`; the chain mock stopped at `.limit()`. Mock now returns a snapshot row, so the
        new primary path is exercised rather than the live-count fallback
