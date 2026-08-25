# c6 · Split the two products living inside `kb/`

**Status: shipped on the backend, unfinished on the frontend and in the data.** Verified at source 2026-08-25. `backend/src/modules/kb/` is now `core/ help-centre/ migration/ retrieval/ wiki/` — 135 files, **one** flat (down from 126 files, 109 flat). The folder reads as a table of contents, exactly the shape `hr/` and `build/` already use, and `retrieval/` exists as the review predicted it would once candidate 1 landed. Two things remain: the frontend still carries both `features/kb/` and `features/knowledge-base/` with nothing marking which is which, and `migration/` — the folder whose whole purpose is to become deletable — has no end date.

## Problem Statement

**As a developer opening the frontend, I still cannot tell which product I am in.** `features/kb/` is the help centre and `features/knowledge-base/` is the wiki, and nothing in either name says so. The backend now names them `help-centre/` and `wiki/`; the frontend uses two words that are synonyms in English and antonyms in this codebase. A developer who guesses wrong edits the public help centre while intending to edit the internal wiki.

**As a developer, the migration has no termination condition.** `migration/` holds `kb-article-migration.service.ts` and its `mapArticleToPage` — a live conversion of help-centre articles into wiki pages. The review's deletion test named this as the only deletable part of the module, and standing alone is what makes it obviously deletable. But nothing records how many articles remain unmigrated, whether new articles are still being created on the old shape, or what condition would let the folder go. A migration with no end date is a permanent second write path.

**As a developer, the two products still share one permission namespace.** Every key is `kb:*` — `kb:spaces:manage`, `kb:reviews:manage`, `kb:articles:*` — so a grant that was meant to give someone help-centre authorship may or may not also give them wiki authority, depending on which key it happens to be. The backend folders are separate; the vocabulary that gates them is not. This is deliberate and may stay deliberate, but it is currently undecided rather than decided.

## Solution

Finish the split where it is still visible to a developer, and give the migration a defined end.

**Frontend:** rename to match the backend's vocabulary — `features/help-centre/` and `features/wiki/` — so one word means one product on both sides of the wire.

**Migration:** measure what is left, stop new writes to the old shape, and record the condition under which `migration/` is deleted.

**Namespace:** make the shared `kb:` namespace an explicit decision, recorded, rather than an artefact of the folder they used to share.

## User Stories

1. As a developer, I want the frontend folder name to say which product it holds, so that I do not edit the public help centre while intending to edit the internal wiki.
2. As a developer, I want the same word to mean the same product on the backend and the frontend, so that a full-stack change does not require a translation step.
3. As a developer, I want a wiki change to touch only wiki folders, so that locality is real rather than nominal.
4. As a developer, I want imports to fail loudly if I reach across the two products, so that they cannot silently re-merge.
5. As a developer, I want retrieval to have one owner, so that indexing, search and the visibility predicate change together.
6. As an operator, I want to know how many help-centre articles remain unmigrated, so that the migration has a measurable finish line.
7. As an operator, I want new content to be created only on the surviving shape, so that the backlog shrinks rather than refills.
8. As an operator, I want a recorded condition for deleting `migration/`, so that the folder is retired deliberately rather than forgotten.
9. As a developer, I want the migration folder to be deletable in one commit when that condition is met, so that the end is cheap.
10. As a permissions administrator, I want to grant help-centre authorship without granting wiki authority, so that two products do not share one grant.
11. As a permissions administrator, I want the reverse to be true too, so that wiki editors are not implicitly help-centre publishers.
12. As a developer, I want whichever namespace decision is made to be written down, so that the next person does not re-litigate it.
13. As a reader of a public help-centre page, I want nothing about this to change, so that a refactor is invisible at `/help/:orgId`.
14. As a wiki user, I want nothing about this to change, so that the internal surface is unaffected.

## Implementation Decisions

**Already shipped — recorded so it is not undone**

- `kb/core/` — module, settings, access service, notification visibility.
- `kb/help-centre/` — articles, categories, widget, public pages, analytics.
- `kb/wiki/` — pages, spaces, tree, versions, reviews, comments, visits, record links, AI.
- `kb/retrieval/` — indexing, search, `pageVisibleTo` / `chunkVisibleTo` / `visibleTo`, page access util.
- `kb/migration/` — `kb-article-migration.*`, its own `kb-migration.module.ts`, standing alone and therefore obviously deletable.

**Remaining**

- **Rename the frontend features.** `features/kb/` → `features/help-centre/`, `features/knowledge-base/` → `features/wiki/`. Both are kebab-case already; only the words change. Update every importer and both barrels. Root §7 requires kebab-case files and folders for CI case-safety, so this is a pure rename with no casing trap — but on Windows a two-step rename may be needed for git to record it.
- **Do not touch routes.** `/help/:orgId` is the public help centre and `/knowledge/*` is wiki reading, guaranteed to every active member by root §8. Folder names are internal; URLs are a product contract. This rename must not reach `app/`.
- **Enforce the boundary by import.** After the rename, `features/help-centre/` and `features/wiki/` must not import each other. Feature-to-feature imports are already banned by root §9; this makes an existing rule enforceable in the one place it was previously impossible to state.
- **Measure the migration before touching it.** Count help-centre articles not yet mapped to a page, per organisation. Record the number in the ticket. Without it, "the migration is nearly done" is an assertion.
- **Close the intake before draining the backlog.** If articles are still being created on the old shape, the count does not converge. Confirm which surfaces still write articles and whether that is intended — the help centre is a live product, so "articles" may not be legacy at all, in which case the migration is a *conversion tool*, not a transition, and it should be renamed to say so.
- **The namespace decision is a decision, not a code change.** Either the two products keep one `kb:` namespace (and that is recorded as deliberate, with the rationale), or help-centre keys split off. Splitting means a key rename, which breaks every stored grant and needs a backfill migration — so the bar is high and "it feels tidier" does not clear it. Record the choice either way.

## Testing Decisions

**What makes a good test here.** A rename is proved by the build and by the module graph, not by unit tests. The tests that matter are the ones that would catch the two products silently re-merging.

- **`next build`, not `tsc --noEmit`.** A bare `import "./x";` side-effect import is invisible to a from-based scan and to the type checker; only a real build catches a broken one. This has already cost a live file once in this repo.
- **`madge --circular` at zero, both repos.** The rename moves files between trees; run it before claiming done.
- **`pnpm exec knip --no-progress`** against the recorded baseline (backend 0 unused files, frontend 5, all HR). A rename that leaves an orphan will show up as a delta.
- **Import-boundary test** — `features/help-centre/` does not import `features/wiki/` and vice versa. Cheap, and it is the only thing that keeps stories 3 and 4 true a year from now.
- **The existing KB suites carry over unchanged.** `retrieval/` already holds `kb-page-visibility.spec.ts`, `kb-chunk-visibility.spec.ts`, `kb-search-page-visibility.spec.ts`; `wiki/` holds the reviews and page specs; `migration/` holds `kb-article-migration.util.spec.ts`. If a rename changes a test outcome, the rename was not a rename.
- **A migration-count query, run and recorded**, is the artefact for story 6 — not a test, but the thing without which the rest of that story is guesswork.

## Out of Scope

- **The backend split.** Done. This PRD records it; it does not redo it.
- **Route changes.** `/help/:orgId`, `/knowledge/*` and every wiki route stay exactly as they are.
- **Actually deleting `migration/`.** That is the outcome of the recorded condition, not a step in this work.
- **Candidate 1's index-eligibility residue.** It lives in `retrieval/`, which this candidate created, but it is c1's remaining scope.
- **Splitting the `kb` module entitlement.** `kb` is core; both products are reachable by every active member per root §8. Splitting the namespace is a permission-key question, not a module-entitlement one.

## Further Notes

- **The backend half is the best-executed of the nine.** 109 flat files to one, in the shape the review drew, with `retrieval/` landing exactly where it predicted candidate 1 would drag it. Commit `ea157c2fd` completed it with verification.
- **The frontend half is the cheapest remaining work in the whole review and has the highest legibility payoff.** Two folder renames, and "kb" versus "knowledge-base" stops being a coin flip.
- **`migration/` standing alone is the win, and also the risk.** It is now obvious enough to delete that someone may delete it before the backlog is drained. The recorded condition is what prevents that.
- **Watch the schema-deletion rule if the migration is ever retired.** knip alone never justifies deleting a schema file; a path grep and an FK check come first, and `hrms-phase1-sql-managed.ts` is the standing example of a deliberately unimported file that a knip-driven cleanup would wrongly remove.
