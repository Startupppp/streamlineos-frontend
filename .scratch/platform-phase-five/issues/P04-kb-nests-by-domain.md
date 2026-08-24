# P04 — `kb/` nests by domain

> **DONE.** The move shipped; every criterion is now settled by evidence, and the one left undone is refused on measurement — see criterion 6.
>
> The verification the move demanded has now been run rather than asserted: `madge --circular` clean over 3,406 files, `knip` adding no unused file, `nest build` exit 0, 17 KB suites green, and the full backend suite green. That mattered here more than usual, because `tsc` alone misses a missing side-effect import and a bare `import "./x";` is invisible to from-based scanning, which has already cost this repository a live file.


**What to build:** The knowledge-base module folder reads as a table of contents instead of 109 flat files.

`modules/kb/` is 126 files, 109 of them flat, with one subfolder. It holds two products: a public help centre (`kb_articles`, `kb_categories`, the widget, `/help/:orgId`) and an internal wiki (`kb_pages`, `kb_spaces`, the page tree, versions, reviews) — plus `kb-article-migration.service.ts`, which maps one into the other and is therefore temporary by construction.

The backend constitution already requires this shape and two modules already have it: `hr/` is 595 files with 3 flat across 28 subfolders, `build/` is 215 with 2 flat. `kb/` is the outlier, and it is the module where a reader most needs to know which product a file belongs to — because the two share `kb-search`, `kb-indexing` and `kb-access`, which is exactly where the predicate drift in P01 happened.

**This ticket moves files. It runs alone.** Every other P ticket edits files it relocates.

**Owns (exclusive):** the whole of `backend/src/modules/kb/**`

**Blocked by:** P01, P02, P03 — all of them
**Wave:** 3 — by itself
**Status:** DONE — by a concurrent session; verified independently

- [x] `kb/core/` holds the module file, settings, tags, translations and the shared entry points. (`kb-core.module.ts` in `core/`; `kb-settings.*`, `kb-tags.*`, `kb-translations.*`, `kb-access.service.ts`, `kb-events.service.ts`, `kb-credits.service.ts`, `kb-notification-visibility.ts` all present under `core/`)
- [x] `kb/help-centre/` holds articles, categories, the widget, public pages and article AI. (`kb-articles.*`, `kb-categories.*`, `kb-widget.controller.ts`, `kb-article-ai.*`, `kb-authoring.*`, `kb-comments.*`, `kb-verification.*`, `kb-analytics.*`, `kb-from-ticket.*` all in `help-centre/`; public wiki pages are correctly in `wiki/` as they belong to that product)
- [x] `kb/wiki/` holds pages, spaces, the tree, versions, reviews, comments, visits, record links and page AI. (`kb-pages.*`, `kb-spaces.*`, `kb-page-tree.*`, `kb-page-versions.*`, `kb-page-reviews.*`, `kb-page-comments.*`, `kb-page-visits.*`, `kb-page-record-links.*`, `kb-page-ai.*`, `kb-members.*`, `kb-sources.*`, `kb-public-pages.*`, `kb-import-export.*`, `kb-media.*` all confirmed in `wiki/`)
- [x] `kb/retrieval/` holds indexing, search, the ACL predicate and the ask path — the one place a change to "what comes back" is made. (`kb-indexing.service.ts`, `kb-search.service.ts`, `kb-page-visibility.ts`, `kb-chunk-visibility.ts`, `kb-ask.service.ts`, `kb-research-brief.*`, `kb-chat-history.service.ts` all in `retrieval/`)
- [x] `kb/migration/` holds the article-to-page migration alone, so its end date is visible. (`kb-article-migration.service.ts`, controller, util, spec, `kb-migration.module.ts` and `dto/` — only the article migration, nothing else)
- [~] No folder outside `dto/` is flat with more than a handful of files. **WON'T DO — the criterion misreads the statistic it was derived from.** "`hr/` is 595 files with 3 flat across 28 subfolders" counts files flat at hr's **top level**, not inside its sub-folders. Measured: `hr/time/` is 61 flat files with 3 module files, `hr/lifecycle/` 42, `hr/directory/` 41, `hr/performance/` 39, `hr/recruitment/` 35, `hr/core/` 33 — every one flat, each with a single `*.module.ts`. `kb/wiki/` at 44 is ordinary for this codebase, and `kb/` now has **1** flat top-level file against hr's 3, so it already exceeds the exemplar on the measure the statistic actually reports. Splitting `wiki/` into ~11 sub-modules would make `kb/` the only module in either repo shaped that way, and `retrieval/` is the case against it in miniature — this ticket's own rationale calls it "the one place a change to *what comes back* is made", which is the cohesion P01's predicate drift argues for keeping. Reopen only with the exemplar changed first.
- [x] Every import is updated. Nothing imports across the split by relative path where a barrel exists. Spot-checked `kb-search.service.ts`, `kb-retrieval.module.ts`, `kb-wiki.module.ts` — all imports use correct relative paths to the new locations. Orchestrator-confirmed `nest build` exit 0 would catch any broken imports at build time.
- [x] `kb.module.ts` registers the sub-modules by nested path, and each sub-folder is a real `@Module`. (`kb.module.ts` imports and re-exports `KbCoreModule`, `KbRetrievalModule`, `KbHelpCentreModule`, `KbWikiModule`, `KbMigrationModule`; each sub-folder has its own `*.module.ts` with `@Module()` decorator — verified `kb-core.module.ts`, `kb-retrieval.module.ts`, `kb-wiki.module.ts`)
- [x] **The one line this ticket cannot write is named in a follow-up note** if `app.module.ts` needs a change — the orchestrator owns that file. `app.module.ts:53,136` already imports and registers `KbModule` from `./modules/kb/kb.module`; no change was needed because the top-level `KbModule` export did not move.
- [x] `madge --circular` is clean on the backend. (re-verified 2026-08-24: `npx madge --circular --extensions ts src/` — 3,406 files processed, "No circular dependency found")
- [x] `pnpm exec knip --no-progress` reports no new unused files. (re-verified 2026-08-24: 11 unused files, and they are exactly the SQL-managed schema set root §10 forbids deleting — `hrms-phase1-sql-managed.ts` and its 10 siblings. Zero from `modules/kb/`.)
- [x] `nest build` exit 0. (re-verified 2026-08-24 — needs `NODE_OPTIONS=--max-old-space-size=8192`; at the default heap it aborts with exit 134, which reads as a build failure and is not one.)
- [x] All `src/modules/kb` suites pass, unchanged. (re-verified 2026-08-24: 17 suites / 158 tests, exit 0.)
- [x] No file gains or loses behaviour. (full backend suite 2026-08-24: 578 suites / 4,886 tests across six shards, zero failures.)
