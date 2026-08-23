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
**Status:** ready-for-agent

- [ ] `pageVisibleTo(user, accessibleProjectIds: number[])` — the parameter is required. A caller that has not resolved the reader's projects does not compile.
- [ ] The base expression is restrictive: `(visibility = 'org' AND projectId IS NULL) OR createdById = userId`. The project clause is **added** when there are projects, never a wider base that replaces it.
- [ ] The org-owner short-circuit is unchanged and still returns `eq(kbPages.orgId, …)` before anything else.
- [ ] All ten call sites in the owned files pass the reader's projects, resolved through `KbAccessService.getAccessibleProjectIds`.
- [ ] No call site resolves projects by querying `projects` / `project_members` directly — the seam has one owner.
- [ ] A test asserts a member of **zero** projects is not offered a page carrying a `projectId`. This is the mutation check: restore the permissive fallback and it fails.
- [ ] A test asserts a member of project 42 **is** offered project 42's page and **is not** offered project 43's.
- [ ] A test asserts the page creator sees their own page whatever its project.
- [ ] `kb-page-visibility.spec.ts`'s existing org-owner assertion passes unchanged.
- [ ] A test asserts the four previously-permissive read paths (analytics, page AI, comments, record links) now refuse a page outside the reader's projects.
- [ ] `tsc --noEmit` exit 0, and `src/modules/kb` passes by path.
- [ ] Every criterion that could only be proven by running the app is left unticked and says so.

**Watch for:** the frontend may render counts or lists that shrink for a zero-project member. That is the correction, not a regression — but note anywhere it changes a visible number so the orchestrator can decide whether it needs saying in the product.
