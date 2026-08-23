# PRD — The knowledge-base visibility predicate is one seam

Status: **ready**
Date: 2026-08-23
Stream: P
Source: architecture review 2026-08-23, candidates 1 and 6

## Problem

`pageVisibleTo` (`kb-page-visibility.ts:6`) is the one expression that says who may read a wiki page. Eleven call sites cross it. Five queries do not — they hand-write `visibility IN ('org', 'public')` instead, which drops the project clause and the creator clause.

The gap is reachable. A page with `visibility = 'org'` and `projectId = 42` is refused by `assertPageAccessible` for a caller outside project 42, and its full `contentText` is returned to that same caller by the assistant. The final content fetch repeats the weak predicate, so nothing downstream re-filters.

A second defect sits inside the seam itself. The project clause is applied only when `accessibleProjectIds` is a non-empty array; `[]` and `undefined` both fall through to `visibility <> 'private' OR createdById = userId`, which is *wider*, not narrower. So a member of no projects sees every project's pages, and five callers that omit the argument get that wider answer without asking for it. An optional parameter whose omission widens access is the wrong interface.

## Solution

One predicate, required arguments, crossed by every read of `kb_pages`.

The seam keeps its name and its shape. What changes: the parameter stops being optional, the no-projects case becomes restrictive rather than permissive, and the five queries that route around it stop doing so. `KbAccessService` gains `getAccessibleProjectIds`, so "what can this person reach" has one owner beside `getAccessibleSpaceIds`.

Then the module that holds it gets a shape. `modules/kb/` is 126 files with 109 of them flat, holding two products — a public help centre (`kb_articles`, `/help/:orgId`) and an internal wiki (`kb_pages`, `/knowledge/wiki`) — plus a live migration between them. It nests by domain the way `hr/` (595 files, 3 flat) and `build/` (215 files, 2 flat) already do.

## Goals

- Every read of `kb_pages` uses `pageVisibleTo`, and the type system refuses a call that omits the reader's projects.
- A member of zero projects sees org pages with no project and their own pages — nothing else.
- Retrieval and direct read cannot drift: a test asserts they build the same predicate.
- `kb/` reads as a table of contents.

## Non-Goals

- Changing what the help centre exposes publicly. `KbRagService` serves `visibility = 'public'` articles and is out of scope.
- Merging the two products. They stay distinct; only the folder gains a seam.
- Changing `isPageIndexable`. Indexing eligibility ("is this page indexable at all") is a different question from read access, and a private page is already excluded.

## Implementation decisions

**The predicate is required, not optional.** `pageVisibleTo(user, accessibleProjectIds: number[])` — no default. A caller that has not resolved the reader's projects cannot compile.

**The no-projects case is restrictive.** `(visibility = 'org' AND projectId IS NULL) OR createdById = userId`. The project clause is added on top when there are projects, rather than replacing a wider base.

**Org owners keep their short-circuit.** `isOrgOwner` returns `eq(orgId)` before anything else, as today, and `kb-page-visibility.spec.ts` pins it.

**Five call sites gain a project read.** `kb-analytics`, `kb-page-ai`, `kb-page-comments`, `kb-page-record-links` and the deleted-pages branch of `kb-page-tree` currently pass no projects and therefore get the permissive branch. Each resolves projects through `KbAccessService` before building its predicate. Narrowing them is the point, not a side effect — without it a project member would lose access to their own project's pages.

**ACL at index time is an optimization, sequenced after correctness.** Every retrieval query currently rejoins `kb_pages` to re-evaluate the ACL. Copying `visibility`, `projectId` and `createdById` onto the chunk row makes the filter an indexed predicate. It is worth doing and it is not what closes the hole.

**The folder split moves files, so it goes last.** Every other ticket in this stream edits files the split relocates. Running them concurrently guarantees a conflict.

## Testing decisions

The property to pin is that **retrieval and direct read build the same predicate**. `kb-search-page-visibility.spec.ts` renders the predicate a query was built with and asserts it equals `pageVisibleTo(user, projectIds)`. A test that asserts a specific SQL string would fail on any rewrite of the seam; this one fails only when the two paths disagree, which is the thing that must never happen.

Mutation check for each: change one page query back to `visibility IN ('org','public')` and the test must fail.

The existing `kb-page-visibility.spec.ts` and `kb-page-indexable.spec.ts` are the regression net. `kb-page-indexable.spec.ts` must pass unchanged — if it needs editing, indexing eligibility was changed, which is out of scope.

## Out of scope

- The public help-centre RAG path (`KbRagService`) and its separate ACL model.
- Merging the two retrieval implementations. Worth doing; it is a different decision and needs its own PRD.
- The Plate rendering branch that stops a KB document rendering outside the KB.
