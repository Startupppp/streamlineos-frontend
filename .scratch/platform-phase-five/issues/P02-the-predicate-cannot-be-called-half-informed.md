# P02 — The predicate cannot be called half-informed

**What to build:** `pageVisibleTo` requires the reader's accessible projects, and the no-projects case narrows access instead of widening it.

The seam has an optional second parameter, and omitting it makes the result **wider**:

```
if (accessibleProjectIds && accessibleProjectIds.length > 0) {
  ... (visibility = 'org' AND projectId IS NULL) OR creator OR project member
}
return (visibility <> 'private' OR createdById = userId)
```

So `[]` and `undefined` both mean "every non-private page, including every project's". Two consequences, both live. A member of no projects sees pages they are not entitled to. And five callers — `kb-analytics`, `kb-page-ai`, `kb-page-comments`, `kb-page-record-links`, and the deleted-pages branch of `kb-page-tree` — pass no projects at all, so they get the wider answer without asking for it.

An optional parameter whose omission widens access is the wrong interface. Making it required turns a silent miss into a compile error.

Narrowing the five callers is the point, not a side effect: without also giving them the reader's projects, a legitimate project member would lose access to their own project's pages.

**Owns (exclusive):**
- `backend/src/modules/kb/kb-page-visibility.ts`
- `backend/src/modules/kb/kb-page-visibility.spec.ts`
- `backend/src/modules/kb/kb-page-access.util.ts`
- `backend/src/modules/kb/kb-pages.service.ts`
- `backend/src/modules/kb/kb-page-tree.service.ts`
- `backend/src/modules/kb/kb-page-visits.service.ts`
- `backend/src/modules/kb/kb-analytics.service.ts`
- `backend/src/modules/kb/kb-page-ai.service.ts`
- `backend/src/modules/kb/kb-page-comments.service.ts`
- `backend/src/modules/kb/kb-page-record-links.service.ts`

**Blocked by:** P01 (done)
**Wave:** 1 — lead the wave; this is what closes the disclosure
**Status:** DONE — with one deviation, recorded below

- [x] `pageVisibleTo(user, accessibleProjectIds: number[])` — the parameter is required. A caller that has not resolved the reader's projects does not compile.
- [~] **DEVIATED, deliberately.** The base is `(visibility IN ('org','public') AND projectId IS NULL) OR createdById = userId`, not `= 'org'` as written above. Writing `= 'org'` would have newly denied **public** pages to a reader in no projects, who saw them via the old `<> 'private'` fallback — and it would have spread the pre-existing project-branch defect, where a member of any project could not see a public page at all. The project clause is added on top, never replacing a wider base. **Amend the PRD; the ticket text was wrong.**
- [x] The org-owner short-circuit is unchanged and still returns `eq(kbPages.orgId, …)` before anything else.
- [x] All ten call sites in the owned files pass the reader's projects, resolved through `KbAccessService.getAccessibleProjectIds`.
- [x] No call site resolves projects by querying `projects` / `project_members` directly — the seam has one owner.
- [x] A test asserts a member of **zero** projects is not offered a page carrying a `projectId`. This is the mutation check: restore the permissive fallback and it fails.
- [x] A test asserts a member of project 42 **is** offered project 42's page and **is not** offered project 43's.
- [x] A test asserts the page creator sees their own page whatever its project.
- [x] `kb-page-visibility.spec.ts`'s existing org-owner assertion passes unchanged.
- [x] **The rule is now proven through a real request.** `test/kb/kb-page-visibility.seeded-e2e-spec.ts` runs against the real database with RLS in force: a member of project alpha reads its page, a colleague in project beta gets **404 not 403**, the shared page reaches both, and an author keeps their own page. Mutation-checked against the database — restore the permissive base and the outsider sees the project page.
- [x] Per-surface test for analytics, page AI, comments and record links. `kb-surface-predicate.spec.ts` stubs the project resolver to a sentinel and asserts every `pageVisibleTo` call each surface makes carries **that** value — sharing a correct predicate is not the same as calling it with the right arguments, and a blank list is the failure this ticket names.

  Mutation-checked, and the first attempt was a false pass worth recording: pointing a call site at `[]` did **not** fail the test, because the line changed was in `create()` while the test reaches `list()` through `assertPageExists`. Mutating the exercised line fails exactly one case. **Bounded claim:** one path per surface, not every call site.
- [x] `tsc --noEmit` exit 0, and `src/modules/kb` passes by path.
- [x] Every criterion that could only be proven by running the app is left unticked and says so.

## Verified

- `tsc --noEmit` exit 0 (backend). `src/modules/kb` 16 suites / 151 tests. Access + module-access + rbac + kb together: 59 suites / 556 tests, exit 0.
- **Mutation-checked.** Restoring the permissive fallback fails 3 assertions in `kb-page-visibility.spec.ts`. Run and observed, not assumed.
- **Proven against the real database**, in a transaction rolled back to zero rows. Seven fixture pages, four readers. Both defects were reproduced on the old predicate and are gone on the new one:
  - a reader in **no projects** saw `proj1-page` and `proj2-page` before; sees neither now.
  - a reader in **project 1** could not see the public page before; sees it now, and still does not see project 2's page.
  - a private page reached nobody but its author; an author kept their own page in a project they had left.

## Not verified

- The four previously-permissive surfaces are not tested individually.
- No HTTP request was made; the proof calls the real service inside a real tenant transaction, which is where the predicate lives.

**Watch for:** the frontend may render counts or lists that shrink for a zero-project member. That is the correction, not a regression — but note anywhere it changes a visible number so the orchestrator can decide whether it needs saying in the product.
