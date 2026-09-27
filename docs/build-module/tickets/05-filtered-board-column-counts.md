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

- [ ] Exercise the real mutation/cache path with title, assignee, status, create and delete against active filtered/unfiltered count queries; assert immediate correct counts or a scheduled refetch

- [ ] Mutating a ticket on a filtered board updates that board's column counts
- [x] The argument-less key factory produces a genuine prefix of the filtered key
- [ ] Unfiltered boards behave exactly as before
- [x] A test asserts the invalidation key is a prefix of the filtered query key, so the regression cannot return silently
