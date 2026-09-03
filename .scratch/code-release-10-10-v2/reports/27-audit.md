# Ticket 27 — Cleanup contraction and dependency proof — audit at current head

**Repos / SHAs measured**
- frontend `streamlineos-frontend` @ `26df21488` (branch `release/code-10-10-v2`), **121 dirty paths in the working tree**
- backend `streamlineos-backend` @ `66f09164f` (branch `release/code-10-10-v2`), **194 dirty paths in the working tree**

Two of my measurements land on uncommitted work by concurrent lanes. Every such case is
labelled **[WORKING TREE]** below and attributed with `git status` / `git cat-file` evidence.
Nothing here is inferred from a prior report without my re-running it.

**Verdict: NOT MET.** Of the 12 criteria: 0 met, 5 partially met, 7 not met.
The contraction this ticket exists to perform has not been executed — no removal batch, no
before/after ledger, no module-tree record — and two of the gates that would certify it are red
in the tree the release ships from while a third is green over a corpus that is 58.3 % stale
duplicates.

---

## 1. What I read, with numbers

### 1.1 Corpus enumerated (my own counts, not a gate's)

**Frontend (`streamlineos-frontend/frontend`)**

| Surface | Count |
|---|---:|
| `.ts` / `.tsx` files (excl. `node_modules`, `.next`) | 5,390 |
| `app/**/page.tsx` | 600 |
| distinct resolved URLs (route groups + parallel segments stripped) | **600** |
| duplicate URLs | **0** |
| `app/**/route.ts` (Route Handlers) | 2 |
| `app/**/layout.tsx` | 40 |
| `loading` / `error` / `not-found` files | 564 |
| top-level URL segments | 62 |
| `features/` first-level directories | 48 |
| files under `features/` | 2,793 |
| files under `hooks/` (`hooks/api/` = 560) | 579 |
| files under `components/` | 373 |
| files under `lib/` | 285 |
| `index.ts` barrels | 66 |
| names re-exported from barrels (named + `export *`) | 603 |
| named re-exports across the 47 barrels that use `export { … }` | 314 |
| `scripts/*.mjs` | 44 |
| `package.json` scripts | 85 |
| `check:*` gates (non-`:self-test`) | 35 |
| runtime + dev dependencies | 94 + 20 = **114** |
| `public/` assets (54 of them illustrations) | 61 |
| `.env.example` keys / `lib/env.ts` declared | 17 / 8 |

**Backend (`streamlineos-backend`)**

| Surface | Count |
|---|---:|
| `.ts` under `src/` / `test/` | 5,741 / 87 |
| `*.module.ts` | 218 |
| `*.controller.ts` | 550 |
| `*.service.ts` | 1,078 |
| `*.spec.ts` | 1,940 |
| `src/modules/*` directories | 74 |
| `src/db/schema/**/*.ts` | 349 |
| `migrations/*.sql` | 679 |
| `src/scripts/*.mjs` / `*.ts` | 193 / 44 |
| `package.json` scripts | 368 |
| `check:*` gates (non-`:self-test`) | 100 |
| runtime + dev dependencies | 43 + 29 = **72** |
| `openapi.json` paths / operations | 2,701 / 3,644 |
| API contract registry operations (102 published, 3,554 internal) | 3,656 |
| `/cron/*` endpoints | **68** |
| HTTP handlers / authorization-gated handlers | 3,634 / 3,236 |
| `.env.example` keys / `env.validation.ts` keys / `process.env.X` reads | 74 / 100 / 108 |
| `index.ts` barrels / named re-exports across the 11 that use `export { … }` | 36 / 178 |

### 1.2 Gates executed by me this session — 45 invocations, real exit codes

Exit codes captured with `cmd > file 2>&1; echo $?` (never after a pipe).

**Frontend (22)** — `check:dead-code` **1**, `check:dead-code:self-test` 0, `check:import-direction`
**1**, `check:cycles` 0, `check:type-assertions` 0, `check:gate-wiring` 0, `check:module-manifest` 0,
`check:route-thinness` 0, `check:client-pages` 0, `check:file-sizes` 0, `check:over-300` 0,
`check:route-access-contract` 0, `check:permission-binding` 0, `check:seo-metadata` 0,
`check:empty-states` 0, `check:gated-reads` 0, `check:query-scope` 0, `check:command-catalog` 0,
`check:icon-labels` 0, `check:home-manifest` 0, `check:permission-catalog` 0, `check:test-integrity` 0.

**Backend (23)** — `check:dead-code` 0, `check:dead-code:self-test` 0, `check:module-registration` 0,
`check:module-registration:self-test` 0, `check:import-direction` 0, `check:cycles` 0,
`check:type-assertions` **1**, `check:gate-wiring` 0, `check:feature-flag-governance` 0,
`check:kebab-case` **1**, `check:route-duplicates` 0, `check:mock-surface` 0, `check:module-di` 0,
`check:authz-deny` 0, `check:cache-invalidation` 0, `check:outbox-consumers` 0,
`check:navigation-permissions` 0, `check:permission-keys` 0, `check:openapi-coverage` 0,
`check:operation-ids` 0, `check:contract-registry` **1**, `check:module-gate` 0,
`check:unjoined-table-refs` 0.

Plus `knip@6 --dependencies` in both repos.

**The two backend reds are environment artifacts, not head state.** Both name
`src/scripts/.tmp-agent/emit-schema.ts` — an **untracked** file another agent wrote at 22:42 today
(`git ls-files` empty, `git check-ignore` no match). `check:type-assertions` has a second, real
half: `src/common/workflow/workflow-store.ts: 5 -> 6` assertions — also an uncommitted concurrent
edit, and already in the orchestrator's named repair wave.

### 1.3 Measurements I took beyond the gates (8 purpose-written analyses)

1. Route-URL resolver over `app/**` — 600 pages → 600 distinct URLs, 0 collisions.
2. Replication of the backend dead-code gate's `walkSource` — 14,760 files walked, by top directory.
3. UTF-8 BOM scan — 5,843 frontend / 5,980 backend files byte-inspected.
4. Barrel census (per-barrel importers) — frontend and backend.
5. Barrel census (per-**symbol** consumption through the barrel) — frontend and backend.
6. Duplicated exported-name census — 4,219 frontend files, 9,325 distinct exported names.
7. Env-key reachability — `.env.example` × `env.validation.ts` × literal + dynamic-name reachability.
8. Public-asset reachability — `IllustrationName` union × `public/illustrations/*.svg`.

---

## 2. Per-criterion assessment

### PRD-C022 — Nest module registration + one canonical frontend route owner — **PARTIALLY MET**

**Backend half: MET, and proven twice independently.**
- `check:module-registration` → `218 module class(es) declared, 217 reachable from AppModule, 0 unreachable`, exit 0; its `:self-test` asserts 13 cases, exit 0.
- `check:module-di` Check-D → `1745 decorated class(es) · 217 modules reachable from AppModule · 1778 registered · 0 unregistered · exempt: 2 enhancer · 2 factory · 1 aliased · 1 base-class`, exit 0.
- The 218 vs 217 delta is `AppModule` itself plus CLI bootstrap modules under `src/scripts/`, which the gate's `STANDALONE` list accounts for. This is the strongest single result in the ticket.

**Frontend half: canonical ownership holds; "remove obsolete routes" is unevidenced for 68 endpoints.**
- 600 pages → 600 distinct URLs, **0 duplicates** (measured, §1.3-1). Next.js would refuse to build a real collision, but route groups and parallel segments can hide one and none exists.
- I chased seven candidate *hidden* duplicates by reading the pages: `/portal` vs `/client-portal` vs `/build/[projectId]/client-portal` (three distinct owners: internal permission-gated list, external portal-token guard, admin visibility config), `/mail` vs `/inbox` (`inbox-shell.tsx:182` pushes to `/mail?messageId=…`, so it is a composition, not a duplicate), `/ask` vs `/knowledge/chat` (different components), `/blog` vs `/blogs` (admin vs public site), `/dashboard` vs `/hr/dashboard`. **None is a duplicate.**
- Routes with no navigation entry are *declared*, not hidden: `lib/rbac/route-access/route-access-extensions.ts:31-41` records `/ai/executive-brief` with the reason "The surface has no navigation entry" and `/ask` with the backend gate it mirrors. That is the discipline the criterion asks for, in writing.
- `check:route-access-contract` (every route-access permission names a real endpoint) and `check:permission-binding` (2,385 bindings) both exit 0.
- **Where it fails:** the 68 `/cron/*` endpoints. `check:contract-registry` exits **1** with `GET /cron/calendar-provider-sync-sweep` and `POST /cron/calendar-provider-sync-sweep` *absent from the registry and treated as published (fail-closed)* — two endpoints entered the public contract surface with no owner recorded. See **T27-F5**.

### PRD-C027 — unreachable branches, compat shims, commented-out code, debug logging, stale TODOs, duplicated constants — **NOT MET**

Walked in the order the criterion names them:

| Dimension | Measured | Verdict |
|---|---|---|
| Debug logging | 202 `console.log` in backend `src/`; **0 outside `src/scripts/` and `src/db/seeds/`**. Frontend: **0** `console.log`, **0** `console.debug` in `app/features/hooks/lib/components/types` | ✅ **clean** |
| `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` | 0 in both repos (confirmed by both `check:type-assertions` runs) | ✅ **clean** |
| `FIXME` / `HACK` / `XXX:` | 0 in both repos | ✅ **clean** |
| Stale TODO scaffolding | **25** backend production TODOs (97 incl. specs), **41** frontend production TODOs (45 incl. tests) | ❌ |
| Obsolete compatibility shims | **7 `@deprecated` sites in 4 compatibility paths, 0 with a removal date, 0 with a contract test naming the deprecation, and 2 of the 4 with zero consumers anywhere** | ❌ see T27-F7, T27-F8 |
| Constants duplicating an authoritative enum/config/schema | **284** exported names declared in >1 file (of 9,325 distinct, across 4,219 files, CRM/Inventory and tests and barrels excluded). Worst: `ApprovalStatus` ×5 with 3 incompatible member sets and 2 casings; `DataScope` ×3; `STATUS_OPTIONS` ×6; `formatFileSize` ×3 with 3 different behaviours | ❌ see T27-F3, T27-F6, T27-F14 |

The criterion's closing sentence — *"Retain a compatibility path only with a named consumer, removal
date and contract test"* — is satisfied by **0 of 4** compatibility paths at head.

### PRD-C029 — unused dependencies, scripts, env vars, config keys, feature flags, assets — **PARTIALLY MET**

| Dimension | Measured | Verdict |
|---|---|---|
| Runtime + dev dependencies | backend 72 declared, knip reports **0 unused**, 1 unlisted (classified `KEEP` in the ledger, `require.resolve` with `paths` — verified resolvable). Frontend 114 declared, knip reports **0 unused**, 1 unlisted binary (`feedbucket-widget`, the `build:widget` dir — false positive) | ✅ substance clean, ❌ **no wired frontend gate** — T27-F4 |
| Package scripts | 368 backend + 85 frontend + 11 root; **every file-path token in every script resolves to an existing file** (my check, 464 scripts). But 416 backend script files are exempt from the dead-code gate by rule (`check-dead-code.mjs:67 EXECUTABLE_RE`) | ⚠️ |
| Environment variables | backend 74 `.env.example` keys × 100 `env.validation.ts` keys × 108 `process.env.X` reads. **1 declared-only key** (`GOOGLE_GENERATIVE_AI_API_KEY`, `env.validation.ts:159`) — **not dead**: `chat-assistant-model.ts:44` calls `google()`, and the Vercel AI SDK reads that exact name from the environment. **5 `REGION_CELL_2_*` keys** with no literal occurrence — **not dead**: built dynamically by `region.config.ts:99` `` `REGION_${region.toUpperCase()…}_${suffix}` ``. Frontend: 17 keys, **0 unreferenced** | ✅ **clean** — and both near-misses are textbook C034 illustrations |
| Configuration keys | `frontend/knip.json` — entry pattern `**/*.spec.{ts,tsx}` matches **nothing** (this repo uses `.test.`), plus 8 "redundant entry pattern" hints and 3 `ignoreDependencies` with no written reason | ❌ T27-F11 |
| Feature flags | `check:feature-flag-governance` exits 0 — but its **entire corpus is one file** (`src/db/schema/common/feature-flags.ts`) and it regex-tests for two column declarations. Nothing verifies a live flag has an owner, a future removal date, or a consumer | ❌ T27-F15 |
| Asset references | 61 public files. My first pass called 53 unreferenced; **52 of those are false positives** — `illustration-image.tsx:71` builds `` src={`/illustrations/${name}.svg`} `` from a 53-member union. Diffing the union against disk: **54 svgs, 53 union members, exactly 1 orphan** (`forgot-password.svg`), and **0 union members missing on disk** | ❌ 1 orphan — T27-F10 |
| Lockfiles / deployment manifests | both `pnpm-lock.yaml` present and newer than `package.json`; 1 frontend + 7 backend GitHub workflows; `check:gate-wiring` exits 0 in both (frontend: 35 gates, 32 blocking, 48 run-steps across 6 jobs; backend: 100 gates, 91 blocking, 161 run-steps across 15 jobs, 9 declared exceptions) | ✅ |
| Documentation updated in the same change | one stale doc found and proved wrong (`region.config.ts:43`, T27-F7) | ❌ |

### PRD-C032 — canonical domain-owned constants; deletion test on pass-through wrappers — **NOT MET**

The criterion has two halves and both fail.

**Half 1 — "at least two real callers share the invariant" → the canonical owner should win.**
Head has the inverse in three proven cases:
- `formatFileSize` exists **three** times: canonical `lib/format-utils.ts:31` (1-decimal KB, GB tier); a divergent copy at `features/hr/documents/document-table-constants.ts:109` (0-decimal KB, **no GB tier**, `null → "—"`); and a **pure pass-through wrapper** at `features/chat/chat-helpers.ts:80` (`return _formatFileSize(bytes);`).
- `DataScope` (`all|team|own|none`) is declared **three** times independently — two separate `z.enum` contracts (`hooks/api/access-schema.ts:20`, `hooks/api/roles-schema.ts:22`) plus a **hand-written union** (`hooks/api/module-access/types.ts:5`) — with a fourth re-export alias at `types/access.ts:6-9`. Consumers import it from all three. See T27-F3.
- `idCursorPageContract` **[WORKING TREE]** is declared privately at `hooks/api/module-access/module-access-schema.ts:117` and again as an unconsumed shared export. See T27-F2.

**Half 2 — the enforcing gate cannot see any of it.** `frontend/scripts/check-no-local-formatters.mjs:10`
is `LOCAL_FORMATTER = /new\s+Intl\.NumberFormat\s*\(/` and `KNOWN_EXCEPTIONS = []`. It exits 0 over a
corpus holding three `formatFileSize` and three `formatDate` implementations. See T27-F6.

**The deletion test on pass-through wrappers was never applied.** `chat-helpers.ts:80` is the exact
shape the criterion names, and it stands.

### PRD-C033 — reduce public interfaces and barrel surfaces to verified consumers — **NOT MET**

| Dimension | Measured |
|---|---|
| Frontend barrels | 66; **65 reached by ≥1 importer** (the 1 unreached is `feedbucket-widget/src/index.ts`, the widget's own entry — correct) |
| Frontend barrel **symbols** | 314 named re-exports across 47 barrels; **229 imported through the barrel by name; 85 (27.1 %) never are** |
| Backend barrels / symbols | 36 barrels; 178 named re-exports across 11; **125 consumed; 53 (29.8 %) never** |
| Deep imports across module ownership (frontend) | `check:import-direction` exits **1**: `cross-feature-import: 179 violations (baseline 177) — REGRESSED`, across **101 distinct files**; `shared-imports-feature: 3/3 (at baseline)` |
| Deep imports (backend) | `check:import-direction` exits 0 — but *"scanned 230 files under `src/common`"*, i.e. **4.0 % of the 5,741-file backend**. Cross-module deep imports outside `src/common` are unmeasured by any gate |

The worst concrete clusters: `components/ai/index.ts` (19 of 36 names unconsumed),
`components/illustrations/index.ts` (~15 of 58 — and the whole path sits in knip's `ignore` list, so
it is doubly invisible), `components/shared/index.ts` (the six `Rich*` re-exports, whose consumers
all deep-import `@/components/shared/rich-surface` instead), and
`modules/rbac/permissions/index.ts` (16 of its `*_PERMISSIONS` groups never imported through it).

### PRD-C034 — prove every deletion across ten named dimensions — **PARTIALLY MET**

Walked in the criterion's own order:

| # | Dimension | Mechanism at head | Verdict |
|---|---|---|---|
| 1 | Import / dependency graph | knip module graph in both dead-code gates + `madge --circular` (backend 5,750 files, 0 cycles; frontend 0 cycles) | ✅ but see T27-F1 |
| 2 | Nest metadata / DI | `check:module-registration` (218/217/0) + `check:module-di` Check-D (1,745 classes, 0 unregistered), both self-tested | ✅ **strongest** |
| 3 | Next.js file conventions | knip `entry` globs + `NEXT_CONVENTION_STEMS` in the frontend gate + `check:client-pages`, `check:route-thinness`, `check:seo-metadata` (1,224 route files) | ✅ |
| 4 | Dynamic imports | both gates record a `dynamic` edge kind from `import(…)`; knip follows them | ✅ |
| 5 | Raw SQL / table names | `check:unjoined-table-refs` — **3,154 files, 5,460 queries, 291 skipped**, 0 violations; plus `check:hr-table-freeze` | ✅ |
| 6 | Migrations | `check:migration-chain`, `check:migration-ledger`, `check:replay-ledger`, `check:drop-column-safety`; 679 files, cold replay 677/677 per the shared context | ✅ |
| 7 | Reflection | **107** `Reflect.getMetadata` / `Reflect.defineMetadata` sites; no gate proves a reflectively-reached symbol is live | ⚠️ |
| 8 | Queues / events | `check:outbox-consumers` — 3,653 files, 216 modules, 1,209 providers, **every emitted event type has a consumer registered from AppModule**. Its emitter detector reads string literals only, so its "emitted (24)" undercounts the 29 declared by 5; I chased all five (`expense.submitted`, `expense.decided`, `accounting.invoice.reminder.due`, `kb.content.delete`, `integration.connection.disconnected`) and **each is genuinely emitted via a named constant** — no dead consumer | ✅ substance; ⚠️ detector reach |
| 9 | Cron registration | **68 `/cron/*` endpoints; 2 have in-repo evidence of being scheduled** (`health.controller.ts:172,176`). `READINESS_QUEUE_HEARTBEAT_JOBS` defaults to a single job (`readiness.config.ts:67`). No schedule manifest exists in either repository | ❌ **T27-F5** |
| 10 | Package scripts | `check:gate-wiring` proves every registered gate is invoked by a reachable CI job — but 416 backend script files are exempt from dead-code classification by rule | ⚠️ |
| 11 | Side-effect imports | both gates record a `sideEffect` edge kind for bare `import "./x";` | ✅ |

*"Text search or a successful editor rename alone is insufficient evidence"* — I proved this twice
against myself in this audit (the 5 `REGION_CELL_2_*` keys and the 52 illustration assets), and once
against the backend gate (T27-F1, where a text-adjacent module graph produced a **false retain**).

### PRD-C035 — focused tests + affected typecheck/build per batch; both dead-code gates + self-tests at integration — **NOT MET**

The integration half is the measurable one and it is red:

| Required | Result |
|---|---|
| backend `check:dead-code` | exit **0** — `knip: 0 unused file(s), 7 other finding(s) \| importer graph: 9908 files, 69573 edges \| ledger: 5 verdict(s) — 1 KEEP, 2 WIRE, 2 REMOVE` |
| backend `check:dead-code:self-test` | exit **0**, 20 lettered assertions incl. the four bite cases (i, l, t, and the schema refusal) |
| frontend `check:dead-code` | exit **1** — 2 unclassified exports **[WORKING TREE]** |
| frontend `check:dead-code:self-test` | exit **0**, 18 lettered assertions incl. bite cases i, l, p, q |

The criterion's stated purpose is *"so a broken or under-scanning analyzer cannot report a false green
result."* At head the backend analyzer reports green while **over**-scanning: 8,608 of the 14,760 files
it walks (58.3 %) are two stale checkouts under `.claude/worktrees/`, and that contamination has already
produced one live false retention (T27-F1). Same failure class, opposite direction, and the gate's scan
floor (`graphFiles: 500`) is 12× too low to notice either.

"Focused behaviour tests and the affected package typecheck/build" — **NOT MEASURED**, see §5.

### PRD-C036 — before/after counts; zero unclassified; zero unexplained suppressions; no baseline increase — **NOT MET**

**Before/after counts: no artifact exists.** No ledger, no counts file, no per-batch record anywhere
under `.scratch/code-release-10-10-v2/` or `architecture-refactor/`. `reports/02-inventory/` is an
empty directory. Here is the "after" column, measured today, with no "before" to compare it to:

| Metric | Frontend | Backend |
|---|---:|---:|
| knip raw dead files / exports / types | 4 / 37 / 59 | 0 files, 7 other findings |
| unclassified findings | **2** | 0 |
| classified: retained-by-contract / -convention / KEEP / EXCLUDED | 55 / 19 / 10 / 12 | 2 / — / 1 |
| ledger verdicts owed as debt (WIRE + REMOVE) | 0 | **4** (2 WIRE, 2 REMOVE) |
| dependencies unused | 0 (unenforced) | 0 |
| `as unknown as` sites / files | 7 / 6 | 30 / 17 |
| plain `as X` + non-null `!` under the ceiling | 999 (922 + 77) in 510 files | 1,191 (868 + 323) in 466 files |
| `as any` / `@ts-ignore` / `@ts-nocheck` | 0 | 0 |
| eslint suppressions (in-scope, non-test) | **26** | 1 |
| of those, carrying an adjacent written reason | **4** | — |
| files scanned by the assertion gate | 5,018 | 3,654 |

- **Zero unclassified findings: FAILS** — 2 (`hooks/api/id-cursor-page-schema.ts:idCursorPageContract`, `hooks/api/offset-page-schema.ts:offsetPageContract`).
- **Zero unexplained suppressions: FAILS** — **22 of 26** in-scope frontend eslint suppressions are bare, plus 3 unexplained `ignoreDependencies` in `frontend/knip.json` and 2 in `backend/knip.json`. Worst clusters: `features/chat/huddle-panel.tsx` (5), `features/chat/use-message-panel-data.ts` (4), `hooks/api/chat-notifications.ts` (2).
- **No increase in an approved baseline: FAILS** — `check:import-direction` `cross-feature-import` 177 → **179**, and the gate's own header records the baseline was *tightened 182 → 177 today*. Backend assertion ceiling `src/common/workflow/workflow-store.ts: 5 -> 6`.
- **Completion evidence: absent.** All 12 PRD checkboxes for this ticket remain `- [ ]` in `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` (lines 33, 186, 199, 206–208, 350, 351 and the 2.1 block), and `TRACEABILITY.md` carries no status column for ticket 27.

### PRD-C037 — cleanup must not have removed authz, validation, cache invalidation, outbox/worker registration, observability, a11y, SEO metadata, or error/offline states — **PARTIALLY MET**

Walked in the criterion's own order. Nothing here shows a path that *was* removed; several show a path
whose **enforcement** is too narrow to have noticed if one had been.

| Path | Evidence | Verdict |
|---|---|---|
| Authorization | `check:permission-binding` 0 — **2,385 bindings**, every resolved gate names the permission its route declares. `check:authz-deny` 0 — but its own header: **3,236 authorization-gated handlers, 924 with a declared deny test (29 %), 2,312 uncovered under a ratchet of 2,441**. It is static: it proves a deny test *exists*, per spec file, and never runs it | ⚠️ 29 % coverage |
| Authorization (namespace/nav) | `check:navigation-permissions` and `check:permission-keys` both exit 0 with the literal output **"Manifest pilot (timesheets)"** — corpus is **1 of 74 modules** | ❌ reach |
| Validation | `check:gated-reads`, `check:query-scope` (5,371 files), `check:response-contracts`, `check:command-catalog` all 0. But **[WORKING TREE]** 18 offset-page reads cross the boundary as a raw generic with no parse (T27-F2) | ⚠️ |
| Cache invalidation | `check:cache-invalidation` 0 — 1,076 service files, 187 write sites / 177 distinct shapes, 475 invalidate sites, 131 `CACHE_KEYS` factories, 10/10 table-map entries matched, 0 documentation gaps | ✅ |
| Outbox / worker registration | `check:outbox-consumers` 0 — 29 declared event types, 29 registered from AppModule, 0 orphans | ✅ |
| Observability | `queueCheck` **is** wired (`health.controller.ts:75`), but `readiness.config.ts:67` defaults `queueHeartbeatJobs` to `["outbox-events-worker"]` and `READINESS_QUEUE_HEARTBEAT_JOBS` **appears nowhere in `.env.example`**. So one of 68 cron jobs is heartbeat-monitored unless an operator knows an undocumented variable | ⚠️ T27-F5 |
| Accessibility | `check:icon-labels` 0 — 3,859 files, no icon-only button without an accessible name | ✅ |
| SEO metadata | `check:seo-metadata` 0 — 1,224 route files scanned | ✅ |
| Error / offline / empty states | `check:empty-states` 0 — 3,859 files, no hand-rolled empty state outside `EmptyState` | ✅ |

### PRD-C109 — prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and migration-integrity evidence — **PARTIALLY MET**

Same dimension walk as C034, plus:
- **Route registration**: backend proven (`check:route-duplicates` 0 findings, `check:operation-ids` no duplicates, `check:openapi-coverage` all gates passed, 2,701 paths / 3,644 operations); frontend proven (600 → 600, `check:route-access-contract` 0). **Except** the 2 unregistered `/cron/calendar-provider-sync-sweep` operations.
- **Raw table-name / FK**: `check:unjoined-table-refs` 0 over 5,460 queries; `check:restrict-fks`, `check:referential-action-drift` and `check:set-null-column-lists` exist and are wired.
- **Migration integrity**: 679 migrations; the shared context records `REACHED_HEAD 677/677` and a cold replay `applied=677 failures=0`. I did not re-run these (they were established today and the brief says to build on them).
- **Build / typecheck**: **NOT MEASURED** — excluded by the laptop budget. This is the single largest evidential hole in C109 and it is the one the criterion names most explicitly.

### PRD-C110 — record the final module folder tree and public interfaces — **NOT MET**

| What C110 asks to record | What exists at head |
|---|---|
| module folder tree | `backend/module-manifest.json` (vendored to `frontend/lib/module-manifest.json`, kept in step by `check:module-manifest`, exit 0) records `moduleFolder`, `schemaFolder`, `route`, `ladder`, `planGated`, `cacheNamespaces`, `administersNamespaces` for **22 modules**. `src/modules/` has **74 directories** — coverage **29.7 %**. The 52 absentees include `rbac`, `auth`, `organization`, `finance`, `invoices`, `expenses`, `email`, `cron`, `gdpr`, `storage`, `sessions`, `module-access`, `party`, `platform` |
| public interfaces (endpoints) | `contracts/api-contract-registry.json` — **3,656 operations, 102 published / 3,554 internal, 24 outbox events, 23 outbound webhook events**. This is genuinely strong. It also holds **14 retained entries for operations already removed from OpenAPI**, deliberately, so `check:contract-breaking-change` can detect the removal — exactly the "future work cannot recreate a retired path" mechanism C110 asks for. **But the gate exits 1**: 2 operations are absent from the registry and treated as published |
| public interfaces (hooks, query keys, schemas) | **nothing.** No record of the 66 frontend barrels' 603 re-exported names, the 561 `hooks/api/**` modules, or the 1,058 query-key leaf factories. `check:permission-catalog` and `check:home-manifest` cover two narrow slices |
| duplicated schemas | **not recorded, and duplicates exist** — `DataScope` ×3, `ApprovalStatus` ×5, `CursorPaginatedResult` ×2 with *incompatible shapes* (`hooks/api/module-access/types.ts:90` flat `{data,hasMore,nextCursor:number\|null}` vs `types/hr/workflows.ts:175` nested `{data,pagination:{limit,nextCursor:string\|null,hasMore}}`) |

### PRD-C012 — complete the 24–27 expand–migrate–contract sequence — **NOT MET**

The roll-up. Ticket 27 is the *contract* phase, and no contraction has been performed:

| Stage | State |
|---|---|
| 24 — ownership + KEEP/REFACTOR/REMOVE inventory | not met per `reports/24-audit.md`; no per-file classification artifact exists |
| 25 — assertion contraction | frontend `check:type-assertions` green (0 forced-typing escapes, 5,018 files); backend red in the working tree and in the orchestrator's named repair wave |
| 26 — dead code + cycles | not met per `reports/26-audit.md`; I independently reproduced its two P1s (F-1, F-2) |
| 27 — contraction + dependency proof | **nothing removed.** 4 compat paths stand, 1 orphan asset, 85+53 unconsumed barrel symbols, 284 duplicated names, 22 unexplained suppressions, no ledger, no module tree, all 12 checkboxes open |

---

## 3. Findings

| # | Sev | File:line | Summary | Failure scenario | Proposed fix |
|---|---|---|---|---|---|
| **T27-F1** | **P1** | `backend/src/scripts/check-dead-code.mjs:77` | `OUT_OF_SCOPE_SEGMENTS` omits `.claude`, so `walkSource` traverses two stale git worktrees. **I measured the walk: 14,760 files, of which 8,608 (58.3 %) are `.claude/worktrees/` and only 5,950 are `src/`.** Both the importer map (`buildImporterMap`) and the symbol index (`buildSymbolIndex`) — the two things that convert a knip finding into a RETAIN — are built from that corpus | **Live false retain, proved.** The gate prints `MeetingPrepInput — inferred type of meetingPrepSchema, which is parsed at a live boundary in .claude/worktrees/bold-napier-7a4a41/src/modules/ai/core/controllers/crm-ai.controller.ts`. In the real checkout `grep -rn meetingPrepSchema src/` returns **exactly two hits, both in the declaring file** (`src/modules/ai/core/dto/request.schemas.ts:64,71`); the live `crm-ai.controller.ts` does not reference it. The symbol is dead and the gate certifies it alive on evidence from a different revision of the repo. Symmetrically, any dead export whose name survives in either stale checkout is silently retained, and `SCAN_FLOOR.graphFiles = 500` is 12× below `src/` alone, so neither contamination nor collapse trips it | Skip dot-directories in `walkSource` — the frontend already does exactly this (`scripts/check-repo-paths.mjs`, `isExcludedScanDir`, `name.startsWith(".")`). Raise `SCAN_FLOOR.graphFiles` to ≈5,900, derived from `src/` alone. Re-run and classify whatever the clean corpus newly reports |
| **T27-F2** | **P1** | `frontend/hooks/api/offset-page-schema.ts:23`; `frontend/hooks/api/id-cursor-page-schema.ts:19`; `frontend/hooks/api/module-access/module-access-schema.ts:117` **[WORKING TREE]** | `check:dead-code` exits **1** with 2 unclassified exports. `offsetPageContract` has **zero** consumers while `OffsetPage<T>` is used at **18 `apiClient.get<OffsetPage<X>>(…)` sites in 17 files** with no Zod parse. `idCursorPageContract` is exported unconsumed while a **byte-identical private duplicate** sits at `module-access-schema.ts:117` and is what the two real call sites (`:138`, `:142`) use. Attribution: `git cat-file -e HEAD:frontend/hooks/api/offset-page-schema.ts` → **absent at HEAD**; 1 tracked file mentions `OffsetPage` at HEAD vs 18 in the tree; all 17 importers are `M` | The frontend gate's own doctrine (`scripts/check-dead-code.mjs:44`): *"A VALUE exported here and imported by nobody is a contract nothing parses with — an unvalidated boundary."* If the backend renames `items` → `data` on any of those 18 offset routes, `apiClient.get<OffsetPage<T>>` still type-checks, `.items` is `undefined`, and the page throws `Cannot read properties of undefined (reading 'map')` instead of raising a contract violation. The duplicate additionally returns `ResponseContract<CursorPaginatedResult<T>>` while the shared one returns `ResponseContract<IdCursorPage<T>>` — **two type names for one shape, and a third owner for the invariant** | Consume `offsetPageContract` at the 18 call sites (the pattern already used for `cursorPageContract` in `hooks/api/organization-schema.ts`); delete the private `idCursorPageContract` at `module-access-schema.ts:117` and import the shared one; collapse `IdCursorPage` and `CursorPaginatedResult` to one name |
| **T27-F3** | **P1** | `frontend/hooks/api/module-access/types.ts:5`; `frontend/hooks/api/access-schema.ts:20`; `frontend/hooks/api/roles-schema.ts:22` | The **authorization scope** invariant `all\|team\|own\|none` is declared three times independently: two separate `z.enum` contracts both named `dataScopeContract`, and one **hand-written union with no contract**. A fourth path, `types/access.ts:6-9`, re-exports the first. Consumers are split across all three: `features/settings/simulate/simulate-page.tsx:37` and `components/rbac/permission-matrix-types.ts:2` import from `@/types/access`; `hooks/api/module-access/groups.ts:14` and `members.ts:8` from `./types`; `features/module-access/components/page-action-picker.tsx:7` from the barrel | When the backend adds a scope (`"department"`, say), the two `z.enum` contracts widen through `z.infer` and the hand-written union at `types.ts:5` silently does not. Every module-access consumer typed against it then rejects a scope the server issues: the picker renders no option for it and a grant made elsewhere reads as unset — **a permission gate that renders but never denies the new scope**. The two `dataScopeContract` enums can also drift from each other with nothing comparing them | One owner: keep `dataScopeContract` in `hooks/api/access-schema.ts`, have `roles-schema.ts` import it, delete the hand-written union and re-export the shared type from `hooks/api/module-access/types.ts`. Root `CLAUDE.md` §6: type via `z.infer`, never a parallel declaration |
| **T27-F4** | **P1** | `frontend/scripts/check-dead-code.mjs:420-432` | The frontend dead-code gate reads **only** knip's `files` and `exports`/`types` issue groups. It never reads `dependencies`, `devDependencies`, `optionalPeerDependencies`, `unlisted`, `unresolved` or `binaries` — the backend gate iterates all six at `src/scripts/check-dead-code.mjs:511`. Its summary line has no dependency column and its baseline is `{deadFiles, deadExports}` only | PRD-C023 requires "zero unclassified unused files, **dependencies**, exports and exported types"; PRD-C029 requires unused dependencies be removed. **114 frontend dependencies are classified by no wired gate.** Today `knip --dependencies` happens to report 0 unused, but that is a hand-run I performed, not a CI fact: an unused dependency landing tomorrow ships, inflates the install and the lockfile, and no gate objects. The three `ignoreDependencies` entries carry no recorded reason either | Extend the frontend gate's finding loop to the same six groups as the backend's, with a `dep:<name>` key space in `EXPORT_VERDICTS`; move the 3 `ignoreDependencies` into that ledger with written reasons |
| **T27-F5** | **P1** | `backend/openapi.json` (68 `/cron/*` paths); `backend/src/health/readiness.config.ts:67`; `backend/src/health/health.controller.ts:172,176` | **68 cron endpoints; 2 have any in-repo evidence of being scheduled.** No schedule manifest exists in either repository (7 backend + 1 frontend GitHub workflows, none invoking a `/cron/` route). `queueCheck` is wired but `queueHeartbeatJobs` defaults to the single job `"outbox-events-worker"`, and `READINESS_QUEUE_HEARTBEAT_JOBS` appears **nowhere in `.env.example`**. `check:contract-registry` exits **1**: `GET /cron/calendar-provider-sync-sweep` and `POST /cron/calendar-provider-sync-sweep` are absent from the registry and treated as published | Both directions fail. (a) An unscheduled cron endpoint is silent dead surface: if nothing calls `POST /cron/calendar-provider-sync-sweep`, calendar provider sync never runs, no heartbeat is missing because none is declared, and the UI shows stale calendars rather than an error. (b) PRD-C034/C109 name "cron registration" as a required deletion-proof dimension — deleting or renaming any of the 66 unevidenced endpoints **cannot be proven safe from the repository**, which is the same class of mistake that orphaned 27 migrations | Commit the schedule as data (one JSON/YAML manifest listing every `jobKey`, its cadence and its owner), derive `READINESS_QUEUE_HEARTBEAT_JOBS` from it, and add a gate asserting `manifest jobKeys == /cron/* routes`. Run `registry:generate` to classify the two calendar-sweep operations |
| **T27-F6** | P2 | `frontend/scripts/check-no-local-formatters.mjs:10`; `frontend/lib/format-utils.ts:31`; `frontend/features/hr/documents/document-table-constants.ts:109`; `frontend/features/chat/chat-helpers.ts:80` | The formatter gate matches only `new Intl.NumberFormat(` and has an empty exception list, so it exits 0 over a corpus holding **three `formatFileSize` implementations with three different behaviours** and three `formatDate`. One of the three is a **pure pass-through wrapper** (`return _formatFileSize(bytes);`) — the exact shape C032 says to apply the deletion test to | A 3 GB HR document renders **"3072.0 MB"** in the documents table (`:109` has no GB tier) and **"3.0 GB"** everywhere else; a 1,740-byte file renders "2 KB" in HR (0 decimals) and "1.7 KB" in chat. Unit/precision mismatch across surfaces of the same product, with the gate named for exactly this reporting green | Delete both non-canonical implementations and import `lib/format-utils.ts`. Widen the gate from an `Intl.NumberFormat` regex to "a function whose name matches a canonical export of `lib/format-utils.ts` declared anywhere else" |
| **T27-F7** | P2 | `backend/src/common/region/region.config.ts:71` and `:43` | `@deprecated cacheKeyPrefix` is written at `:229` and **read by nothing** — `cacheKeyPrefixForOrg` at `region-registry.ts:179` reads `definition.cell.cache.keyPrefix`, the replacement. No named consumer, no removal date, no contract test: 0 of C027's 3 conditions. Worse, the doc comment at `:43` asserts *"The cache service reads `RegionCellConfig.cacheKeyPrefix` today"*, which is **false at head** | An engineer wiring per-cell cache isolation reads `:43`, believes `cacheKeyPrefix` is the live field, and sets it on a new cell config while the router keeps reading `cache.keyPrefix` — the new cell's keys collide with the primary's inside the shared Upstash instance, which is precisely the collision `keyPrefix` exists to prevent | Delete `cacheKeyPrefix` and its assignment at `:229`; correct the `:43` comment to name `cache.keyPrefix` and `region-registry.ts:179` |
| **T27-F8** | P2 | `backend/src/modules/cron/cron-hr-retention.service.ts:47-50`, `:76-77` | `skippedDocumentPolicies` and `skippedPayrollPolicies` are declared `@deprecated Compatibility fields`, assigned the literal `0`, and **read by nothing anywhere in `src/`** (grep returns only the 4 declaration/assignment lines) | Dead compatibility surface with no consumer, no removal date and no contract test. If an operator dashboard is ever pointed at them it will report "0 policies skipped" forever regardless of what the sweep does — a metric that cannot alarm | Delete both fields and their assignments; the comment already records that policies are no longer silently skipped |
| **T27-F9** | P2 | `frontend/features/chat/huddle-panel.tsx:89,96,100,113,126` (worst of 22) | **22 of 26** in-scope, non-test frontend eslint suppressions carry no reason on the same line or the line above (measured; 4 do). Plus 3 unexplained `ignoreDependencies` in `frontend/knip.json:36` and 2 in `backend/knip.json:28` | C036's acceptance condition is literally "zero unexplained suppressions". `huddle-panel.tsx:89` disables `react-hooks/exhaustive-deps` on an effect keyed only on `[selectedAudioInput]` — the next author cannot tell whether the omitted dependency was analysed and rejected or simply not read, so the suppression is re-copied instead of removed | Give each surviving suppression a `-- reason` clause naming the invariant that makes it safe; delete the rest by fixing the effect |
| **T27-F10** | P2 | `frontend/public/illustrations/forgot-password.svg` | 54 svgs on disk vs a **53-member** `IllustrationName` union at `components/illustrations/illustration-image.tsx:24+`, which is the only thing `illustration-image.tsx:71` can build a `src` from. `forgot-password` is not a member and appears nowhere in `app/features/components/lib/hooks/types`. 0 union members are missing on disk | An unreferenced asset ships in the deployment bundle forever, and a future author adding a "forgot password" empty state sees the file, assumes a preset exists, and writes `illustrationPreset="forgot-password"` — which is not in `StateIllustrationPreset` and does not compile, or worse is added to the union pointing at art nobody reviewed | Delete the file, or add `"forgot-password"` to the union and `PRESET_TO_ILLUSTRATION` with a consumer |
| **T27-F11** | P2 | `frontend/knip.json:15` (+ 8 more) | Entry pattern `**/*.spec.{ts,tsx}` matches **nothing** — this repo names tests `.test.tsx`. knip also reports 8 redundant entry patterns (`proxy.ts`, `instrumentation.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `jest.config.cjs`, `jest.setup.js`, `feedbucket-widget/build.mjs`) | C029 names configuration keys explicitly. A dead entry glob is worse than noise here: it reads as "spec files are entry points", so the next author adding `foo.spec.tsx` believes it is scanned when it is not, and everything that file alone reaches is reported dead | Delete the 9 dead/redundant entries and re-run; knip's `Configuration hints` section is already the evidence |
| **T27-F12** | P2 | `frontend/components/ai/index.ts` (19 of 36); `frontend/components/illustrations/index.ts` (~15 of 58); `frontend/components/shared/index.ts` (the 6 `Rich*`); `backend/src/modules/rbac/permissions/index.ts` (16 of its groups) | **85 of 314 (27.1 %) frontend and 53 of 178 (29.8 %) backend named barrel re-exports are never imported through the barrel by any file.** Measured by resolving every `import { … } from "@/<dir>"` and every relative import resolving to the barrel's directory | C033 requires public interfaces be reduced to *verified consumers*. Every unconsumed line is a public commitment nothing tests: it holds the underlying module in the graph, keeps its transitive imports in whatever chunk the barrel lands in, and cannot be reported dead — `check-dead-code.mjs` `CONTRACT_BARRELS` and `FEATURE_BARREL_RE` retain barrel re-exports by rule, the exact inverse of C026's closing sentence | Delete the 138 unconsumed re-export lines, or repoint their deep-importing consumers at the barrel. Then replace the two blanket retention rules with per-symbol evidence: retain a re-export only when some file imports *that symbol through that barrel* |
| **T27-F13** | P2 | `frontend/scripts/check-import-direction.mjs:55` | `check:import-direction` exits **1**: `cross-feature-import: 179 violations (baseline 177) — REGRESSED`, over **101 distinct violating files**. The gate's own header records the baseline was tightened 182 → 177 today. I attributed the files: **4 are dirty** (`features/build/shared/ticket-filter-bar.tsx`, `features/party/parties/parties-page.tsx`, and two CRM files), **97 are committed** | C036's third acceptance condition is "no increase in an approved baseline". A red ratchet in the release tree means either the baseline is wrong or two new deep imports landed unreviewed; both block the ticket. The most load-bearing committed pair is `features/chat/*` → `features/build/shared/status-badge` and `format-ticket-key` (7 sites): moving or deleting either `build` file silently breaks four chat components no `build` maintainer would inspect | Promote `getStatusBadgeClass` / `formatTicketKey` / `HrSheet` to `components/shared` (already mandated by `frontend/CLAUDE.md` §3 on a second consumer), then re-tighten the baseline in the same commit — never raise it |
| **T27-F14** | P2 | `frontend/hooks/api/workflows-types.ts:6`; `frontend/types/projects/approvals.ts:11`; `frontend/types/payroll/payout.ts:1`; `frontend/types/accounting/taxes.ts:132`; `frontend/features/accounting/shared/finance-status.tsx:34` | `ApprovalStatus` is declared **five** times with **three incompatible member sets in two casings**: `"PENDING"\|"APPROVED"\|"REJECTED"` (×3), `"pending"\|"approved"\|"rejected"\|"delegated"\|"expired"`, and `"requested"\|"pending"\|"approved"\|…`. Additionally `CursorPaginatedResult<T>` is declared twice with **structurally different shapes** (`hooks/api/module-access/types.ts:90` flat vs `types/hr/workflows.ts:175` nested under `pagination`) | Feed a payroll approval row (`"APPROVED"`) to any workflow-approval renderer and the switch falls through to its default branch — the row renders as unknown/pending, and a reviewer sees an approved item as awaiting action. For `CursorPaginatedResult`, the module-access file's own comment states the hazard: *"getNextPageParam reads lastPage.nextCursor on one and lastPage.pagination.nextCursor on the other, so a swap ends pagination at page one with no error anywhere"* — and then the codebase gives both shapes the same name, so auto-import picks one at random | One `ApprovalStatus` per bounded context, each named for its context (`FinanceApprovalStatus`, `WorkflowApprovalStatus`), each `z.infer`'d from its contract. Rename one `CursorPaginatedResult`, or collapse the two onto the single envelope `lib/api-envelope.ts` already owns |
| **T27-F15** | P2 | `backend/src/scripts/check-feature-flag-governance.mjs:10` | The gate's entire corpus is `SCHEMA_PATH = src/db/schema/common/feature-flags.ts` — **one file** — and it regex-tests for two column declarations (`owner` notNull, `removal_date`/`expires_at` notNull). It exits 0 | C029 requires unused feature flags be removed and C027 requires a compatibility path to carry a removal date. **No mechanism at head reads a single live flag.** A flag whose `expires_at` passed a year ago, or one with no consumer in `src/`, is invisible: the schema has the columns, so the gate is green | Extend the gate to query the flag table (the local `scratch_head_1010` DB is available) and fail on any flag past its `removal_date`, and to fail on any flag key with no reference in `src/` |
| **T27-F16** | P2 | `.scratch/code-release-10-10-v2/reports/02-inventory/` (empty); `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:33,186,199,206-208,350,351` | **No before/after count ledger exists** for the 24–27 sequence — no counts file, no per-batch record, anywhere under `.scratch/code-release-10-10-v2/` or `architecture-refactor/`. All **12** PRD checkboxes for this ticket remain `- [ ]`, and `TRACEABILITY.md` has no status for ticket 27 | C036's first sentence is "Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions." With no "before", none of the numbers in §2 (PRD-C036) can be shown to be an improvement, and the release cannot state from its own manifest which criteria are satisfied | Commit the §2 table as the "after" column, recover "before" from the branch point (`git log` on the two `check-dead-code.mjs` ledgers and the two assertion baselines), and update both checkbox sets in the completion commit |
| **T27-F17** | P2 | `backend/module-manifest.json`; `backend/contracts/api-contract-registry.json` | `module-manifest.json` records **22 of 74** `src/modules/*` folders (29.7 %) and only at the product/entitlement level (`route`, `ladder`, `planGated`, `cacheNamespaces`). The 52 absentees include `rbac`, `auth`, `organization`, `finance`, `invoices`, `expenses`, `email`, `cron`, `gdpr`, `storage`. Nothing records the frontend's 66 barrels / 603 re-exports, its 561 `hooks/api/**` modules, or its query-key surface | C110 exists so "future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints" — and the duplicates in T27-F3 and T27-F14 are exactly what an unrecorded surface permits. The *endpoint* half is genuinely done (3,656 operations, and 14 removed operations deliberately retained so `check:contract-breaking-change` can detect the removal); the module-tree and hook/schema halves are not | Extend `modules:export-manifest` to emit every `src/modules/*` folder with its controllers, schema folder and cache namespaces; add a frontend twin emitting each feature's barrel surface and query-key namespace, gated the way `check:module-manifest` already gates the vendored copy |

**No P0.** Nothing found here loses data, leaks across tenants, corrupts a money value, or 500s a
route. The two nearest a runtime defect are **T27-F5(a)** (an unscheduled cron endpoint fails as a
silently stale surface, not an error) and **T27-F2** (an unvalidated response envelope on 18 list
reads, which fails as a crash or an empty list rather than a leak).

**Deliberately not reported as findings**, because I disproved them:
- 5 `REGION_CELL_2_*` env keys with no literal occurrence — built dynamically by `region.config.ts:99`.
- `GOOGLE_GENERATIVE_AI_API_KEY` declared only in `env.validation.ts:159` — read by the AI SDK inside `google()` at `chat-assistant-model.ts:44`.
- 52 "unreferenced" illustration assets — reached through `` `/illustrations/${name}.svg` ``.
- 5 outbox event types the gate lists as declared-but-not-emitted — all five **are** emitted, via a named constant rather than a string literal (`expenses-write.service.ts:86,261`, `reminders.service.ts:285`, `kb-spaces.service.ts:236`, `org-membership-access-revocation.ts:298`). The gate's emitter detector under-reads; the code is correct.
- `src/scripts/.tmp-agent/emit-schema.ts` reddening two backend gates — an untracked scratch file another agent wrote at 22:42 today, not head state.
- **392 frontend and 19 backend files begin with a UTF-8 BOM** (byte-inspected), including `app/robots.ts` and pages whose first token is `"use client"`. SWC strips a leading BOM, and I did **not** reproduce a failure, so this is recorded as an observation rather than a finding. It is worth a lint rule: no gate in either repo detects it.

---

## 4. What head already gets right

1. **Nest module registration is completely and independently proven** — two gates, two methods, both self-tested: `218 declared / 217 reachable / 0 unreachable` and `1,745 decorated classes / 0 unregistered`. This is the hardest half of C022 and it is finished.
2. **Frontend route ownership is clean.** 600 pages resolve to 600 distinct URLs with zero collisions; I chased seven candidate hidden duplicates by reading the pages and every one turned out to be a distinct owner.
3. **Routes without navigation are declared, not hidden.** `route-access-extensions.ts:31-41` records `/ai/executive-brief` and `/ask` with the backend gate each mirrors and an explicit "has no navigation entry" reason — the exact discipline C022 asks for, written down.
4. **Debug logging is genuinely gone from product code.** 0 `console.log` outside `src/scripts/` and `src/db/seeds/` in the backend; 0 anywhere in the frontend's `app/features/hooks/lib/components/types`. All 202 backend occurrences are CLI output in operator tools, which is correct.
5. **Zero forced-typing escapes.** `as any`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`: **0** in both repos, over 5,018 + 3,654 scanned files.
6. **Zero dependency cycles at file level in both repos** — `madge` over 5,750 backend files, 0 circular; frontend 0 circular.
7. **Zero unused dependencies in either repo**, measured by hand with `knip --dependencies`. The one backend unlisted finding is correctly classified `KEEP` with a verified `require.resolve(..., { paths })` explanation.
8. **Every package script points at a file that exists** — 464 scripts across three manifests, checked.
9. **Every registered gate is invoked by a reachable CI job.** `check:gate-wiring` passes in both repos: frontend 35 gates / 32 blocking / 48 run steps / 6 jobs; backend 100 gates / 91 blocking / 161 run steps / 15 jobs / 9 declared exceptions.
10. **Both dead-code ledgers only shrink.** A verdict knip no longer reports is STALE and exits 1 in both gates, so the classification file cannot become a graveyard. Both self-tests assert the bite cases explicitly and both pass.
11. **Cleanup did not remove the uncommon paths.** Cache invalidation (1,076 service files, 187 write sites, 475 invalidate sites, 10/10 table-map entries), outbox registration (29 declared = 29 registered, 0 orphans), a11y (3,859 files, no unlabelled icon button), SEO (1,224 route files), error/empty states (3,859 files, no hand-rolled empty state) all pass — over corpora large enough to mean something.
12. **The API contract registry does the C110 job for endpoints.** 3,656 operations classified, 102 published / 3,554 internal, and **14 entries deliberately retained for operations already removed from OpenAPI** so `check:contract-breaking-change` detects the removal by finding exactly that state. That is the "future work cannot recreate a retired path" mechanism, and it works.
13. **Raw table-name reachability is proven at scale** — `check:unjoined-table-refs` over 3,154 files and 5,460 queries, every referenced table present in its query's FROM/JOIN.
14. **Environment configuration is tight.** Frontend: 17 `.env.example` keys, 0 unreferenced. Backend: every one of the 74 keys reachable once dynamic construction and SDK-internal reads are accounted for.

---

## 5. NOT MEASURED / blocked

| Item | Why | What would measure it |
|---|---|---|
| **The build/typecheck half of C035 and C109** — "run … the affected package typecheck/build" and "build/typecheck … evidence" | Explicitly excluded by the laptop budget (`next build`, `nest build`, `tsc --noEmit` each want 8–12 GB with ~26 agents resident) | The orchestrator's central run: `pnpm -C frontend build`, `pnpm -C backend build`, `pnpm -C backend typecheck` (needs `--max-old-space-size=8192`; a crashed `tsc` greps as "0 errors"). `tsc --noEmit` alone is insufficient — it does not notice a missing side-effect import |
| Whether removing the 138 unconsumed barrel re-exports (T27-F12), the orphan asset (T27-F10) and the two dead compat paths (T27-F7, T27-F8) leaves both builds green | Same budget exclusion | The same central build, run before and after the removal batch — which is precisely the per-batch cadence C035 mandates |
| "Focused behaviour tests" after a cleanup batch | No batch has been performed, so there is nothing to run them against. A bare `jest` is excluded by the budget | Once a batch lands: `jest --runInBand --testPathPattern=<the touched module>` per batch, plus the two chat/huddle suites for T27-F9 |
| Whether the 66 unevidenced `/cron/*` endpoints are actually invoked in production | The scheduler is external to both repositories and no manifest names it | A production `cron:heartbeat:*` key dump from Redis compared against the 68 route list; or the schedule manifest T27-F5 proposes |
| Whether any live feature flag is past its removal date or has no consumer | `check:feature-flag-governance` never reads a flag row (T27-F15) | `psql $APP_DATABASE_URL -c 'select key, owner, expires_at from feature_flags'` against `scratch_head_1010`, joined to a grep of `src/` for each key. Cheap; blocked only by the gate not doing it |
| Backend cross-module deep imports outside `src/common` | `check:import-direction` scans 230 of 5,741 backend files (4.0 %) | Widen the gate's root to `src/modules` with a module-ownership matrix, mirroring what the frontend gate already does for `features/` |
| Whether the frontend `check:import-direction` regression (177 → 179) is committed or introduced by a concurrent lane | 4 of the 101 violating files are dirty; the +2 delta cannot be attributed to specific imports without stashing, which is forbidden in a shared tree | Re-run the gate on a clean checkout of `26df21488` in a separate worktree |
| Whether any of the 392 BOM-prefixed frontend files misbehaves | Would need a production build and a runtime check of the `"use client"` boundary | `next build` plus a render of one BOM-prefixed client page |

**Nothing in this ticket is blocked on database infrastructure.** Every criterion here is static
analysis or gate execution; the two scratch databases were available and were not needed. The one
place a database *would* help — reading live feature-flag rows — is blocked by the gate's design, not
by access.

---

## 6. Criterion summary

| Criterion | Verdict | One-line reason |
|---|---|---|
| **PRD-C012** | **not met** | The contract phase has not been executed: nothing removed, no ledger, no module tree, all 12 checkboxes open; 24 and 26 are not met and 25 is red in the tree |
| **PRD-C022** | **partially met** | Backend registration proven twice (218/217/0, 1,745 classes, 0 unregistered) and 600 → 600 distinct frontend URLs with 0 duplicates — but 2 cron operations are unregistered and 66 more have no ownership evidence |
| **PRD-C027** | **not met** | 7 `@deprecated` sites in 4 compat paths, **0** with a removal date or contract test and 2 with no consumer at all; 66 production TODOs; 284 duplicated exported names. Debug logging and `@ts-ignore` are genuinely clean |
| **PRD-C029** | **partially met** | 0 unused dependencies and 0 unreachable env keys (both proven, including two near-misses I disproved) — but the frontend has no wired dependency gate, 9 dead knip config keys, 1 orphan asset, and no feature-flag mechanism at all |
| **PRD-C032** | **not met** | `formatFileSize` ×3 with 3 behaviours, `DataScope` ×3, `ApprovalStatus` ×5, one surviving pass-through wrapper — and the enforcing gate matches only `new Intl.NumberFormat(` |
| **PRD-C033** | **not met** | `check:import-direction` red at 179/177 across 101 files; 85/314 frontend and 53/178 backend barrel symbols never imported through their barrel; the backend gate covers 4.0 % of the repo |
| **PRD-C034** | **partially met** | 8 of 11 dimensions have a real mechanism; reflection and package scripts are weak; **cron registration has none**, and the module graph that underpins dimension 1 is 58.3 % stale worktrees |
| **PRD-C035** | **not met** | Both self-tests pass and the backend gate exits 0 — but the frontend gate exits **1**, and the backend green is produced by an *over*-scanning analyzer that already emitted one false retain |
| **PRD-C036** | **not met** | No before/after ledger exists; 2 unclassified findings; **22 of 26** suppressions unexplained; the import-direction baseline regressed 177 → 179 the same day it was tightened |
| **PRD-C037** | **partially met** | Cache invalidation, outbox, a11y, SEO and empty states are proven over large corpora — but the deny-test ratchet covers 29 % of 3,236 gated handlers and two permission gates are a "manifest pilot" over 1 of 74 modules |
| **PRD-C109** | **partially met** | Route registration, raw table names and migration integrity are proven; **build/typecheck evidence is NOT MEASURED**, which is the dimension the criterion names most explicitly |
| **PRD-C110** | **not met** | The endpoint half is genuinely done (3,656 operations, 14 retired paths deliberately retained); the module tree covers 22 of 74 folders and the hook/query-key/schema surface is unrecorded — which is what let `DataScope` and `ApprovalStatus` fan out |
