# 05 — Keep column counts correct on a filtered board

**What to build:** On a Kanban board with any filter applied, the per-column ticket counts update after a create, move, edit or delete. Today they do not: the cache key built for "no filters" has the same length as a filtered key rather than being a prefix of it, so the invalidation issued on every mutation never matches an active filtered query. The counts stay wrong until the staleness window expires.

The shape of the defect, since it is easy to reintroduce:

```
query key       [ ..., projectId, { search: "foo" } ]
invalidate key  [ ..., projectId, {} ]        <- same length, so not a prefix
```

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Mutating a ticket on a filtered board updates that board's column counts
- [ ] The argument-less key factory produces a genuine prefix of the filtered key
- [ ] Unfiltered boards behave exactly as before
- [ ] A test asserts the invalidation key is a prefix of the filtered query key, so the regression cannot return silently
