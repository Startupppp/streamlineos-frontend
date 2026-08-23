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
**Status:** NOT DONE — deliberately not attempted, reason below

- [ ] `kb/core/` holds the module file, settings, tags, translations and the shared entry points.
- [ ] `kb/help-centre/` holds articles, categories, the widget, public pages and article AI.
- [ ] `kb/wiki/` holds pages, spaces, the tree, versions, reviews, comments, visits, record links and page AI.
- [ ] `kb/retrieval/` holds indexing, search, the ACL predicate and the ask path — the one place a change to "what comes back" is made.
- [ ] `kb/migration/` holds the article-to-page migration alone, so its end date is visible.
- [ ] No folder outside `dto/` is flat with more than a handful of files.
- [ ] Every import is updated. Nothing imports across the split by relative path where a barrel exists.
- [ ] `kb.module.ts` registers the sub-modules by nested path, and each sub-folder is a real `@Module`.
- [ ] **The one line this ticket cannot write is named in a follow-up note** if `app.module.ts` needs a change — the orchestrator owns that file. An unregistered module compiles green and does not exist at runtime.
- [ ] `madge --circular` is clean on the backend. A move is the most likely way to introduce a cycle; prove it did not.
- [ ] `pnpm exec knip --no-progress` reports no new unused files. **Do not delete a `db/schema` file on knip's word** — the eleven it flags are the deliberate SQL-managed arrangement guarded by a spec.
- [ ] `nest build` exit 0. `tsc --noEmit` misses a missing side-effect import; a bare `import "./x";` is invisible to from-based scanning and has already cost this repository a live file.
- [ ] All 16 `src/modules/kb` suites pass, unchanged. If a spec needs editing, behaviour moved and that needs justifying — a pure relocation should not touch assertions.
- [ ] No file gains or loses behaviour. This is a move; anything else belongs in another ticket.
