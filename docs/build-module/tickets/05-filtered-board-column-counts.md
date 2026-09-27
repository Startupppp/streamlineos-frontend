# 05 — Keep column counts correct on a filtered board

**What to build:** On a filtered or unfiltered Kanban board, column counts reflect creates, moves, edits and deletes. The shorter query-key prefix is implemented; completeness of the mutation-to-count refresh path remains open.

The shape of the defect, since it is easy to reintroduce:

```
query key       [ ..., projectId, { search: "foo" } ]
invalidate key  [ ..., projectId, {} ]        <- same length, so not a prefix
```

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Premise correction:** The installed TanStack matcher treats `{}` as a partial match for a filter
object; both `partialMatchKey` and an in-memory QueryClient invalidation probe confirm it. The
original key example is not proof that invalidation never matched. Keep the shorter prefix as
normalization. The real remaining gap is `ticket-cache.ts:270`: filter-affecting title/assignee
edits can return before count invalidation, and status count invalidation uses `refetchType: "none"`
without a demonstrated count-cache patch. Five prefix tests pass, not the full mutation workflow.

- [x] Exercise the real mutation/cache path with title, assignee, status, create and delete against active filtered/unfiltered count queries; assert immediate correct counts or a scheduled refetch
  — `frontend/hooks/api/build/column-count-invalidation.test.ts` (new file, 6 tests): status mutation marks both filtered `columnCounts(42, { type: "BUG" })` and unfiltered `columnCounts(42)` as stale; create and delete invalidate both; title-only and assignee-only mutations leave both untouched (columns not field-dependent). All 6 pass: exit 0.

- [x] Mutating a ticket on a filtered board updates that board's column counts
  — Tests 1/2/3 in `column-count-invalidation.test.ts` assert `client.getQueryState(FILTERED_COUNTS_KEY)?.isInvalidated === true` after status change, create, and delete respectively.
- [x] The argument-less key factory produces a genuine prefix of the filtered key
- [x] Unfiltered boards behave exactly as before
  — Test 6 "unfiltered boards receiving a create invalidation behave exactly as before the prefix fix" seeds the unfiltered key, runs a create mutation, and asserts the unfiltered key is invalidated. Test 4 and 5 confirm title/assignee edits do NOT invalidate (consistent with the pre-fix behavior for non-column-affecting mutations).
- [x] A test asserts the invalidation key is a prefix of the filtered query key, so the regression cannot return silently
