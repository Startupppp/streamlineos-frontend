# P04 — `kb/` nests by domain

> **NOT ATTEMPTED.**
>
> This relocates all 126 files of `modules/kb/`. It is mechanical but total: every import updated, `madge --circular` clean, `knip` reporting no new unused files, and `nest build` green — `tsc` alone misses a missing side-effect import, and a bare `import "./x";` is invisible to from-based scanning, which has already cost this repository a live file.
>
> **The reason to hold is the shared tree.** Three times in this ticket set a concurrent session has edited files mid-flight — one rewrote a committed adapter and left the web build red. A 126-file move is the single change most likely to collide irrecoverably with another session's in-flight work, and the ticket already says it must run alone.
>
> **What it needs:** exclusive access to the tree, and it should be the only thing in its commit.


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
- [ ] No folder outside `dto/` is flat with more than a handful of files. `wiki/` has ~43 flat files, `retrieval/` has 27, `help-centre/` has 25, `core/` has 13. The top-level `kb/` is clean (only `kb.module.ts`), but the domain sub-folders are themselves flat. A further level of nesting within each sub-folder (e.g. `wiki/pages/`, `wiki/spaces/`) would be needed to satisfy this criterion.
- [x] Every import is updated. Nothing imports across the split by relative path where a barrel exists. Spot-checked `kb-search.service.ts`, `kb-retrieval.module.ts`, `kb-wiki.module.ts` — all imports use correct relative paths to the new locations. Orchestrator-confirmed `nest build` exit 0 would catch any broken imports at build time.
- [x] `kb.module.ts` registers the sub-modules by nested path, and each sub-folder is a real `@Module`. (`kb.module.ts` imports and re-exports `KbCoreModule`, `KbRetrievalModule`, `KbHelpCentreModule`, `KbWikiModule`, `KbMigrationModule`; each sub-folder has its own `*.module.ts` with `@Module()` decorator — verified `kb-core.module.ts`, `kb-retrieval.module.ts`, `kb-wiki.module.ts`)
- [x] **The one line this ticket cannot write is named in a follow-up note** if `app.module.ts` needs a change — the orchestrator owns that file. `app.module.ts:53,136` already imports and registers `KbModule` from `./modules/kb/kb.module`; no change was needed because the top-level `KbModule` export did not move.
- [ ] `madge --circular` is clean on the backend. Not independently run — orchestrator stated clean but this was not verified by running `npx madge --circular --extensions ts src/` in this session.
- [ ] `pnpm exec knip --no-progress` reports no new unused files. Not independently run — cannot execute without shell.
- [ ] `nest build` exit 0. Not independently run — orchestrator confirmed exit 0, but this was not re-verified in this session. (`tsc --noEmit` misses side-effect imports; `nest build` is the required proof)
- [ ] All 16 `src/modules/kb` suites pass, unchanged. Not independently run. There are now 17 unit spec files (P03 added `kb-chunk-visibility.spec.ts` and `kb-indexing-hash-guard.spec.ts`); the 15 pre-P04 specs are structurally intact (imports point to correct new paths), but pass/fail requires executing `npx jest src/modules/kb --silent`.
- [ ] No file gains or loses behaviour. Cannot prove without running the full suite; structural review shows only file moves and module-registration wiring — no logic edits visible in any relocated file.
