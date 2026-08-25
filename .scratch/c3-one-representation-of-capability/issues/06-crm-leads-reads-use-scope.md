# 06 — A list narrowed to my own records says so

**What to build:** A person whose lead access is narrowed to their own records opens the leads list and sees it labelled as such, and does not see an assignee filter — a control that at their scope can only return the rows already in front of them, or nothing. A person with full access sees the list and the filter unchanged.

Today a narrowed person sees a short unexplained list and a filter that cannot work. The data scope that produced that list is already resolved and already on the wire; it is simply never read. This ticket gives the scope hook its first production consumer, so the next scoped surface has a pattern to copy.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] At own scope the list states that it shows only the person's own records, and the assignee filter is absent.
- [ ] At full scope the list and the filter are exactly as they are today.
- [ ] At team scope the surface behaves sensibly and deliberately — decide and state which, rather than letting it fall through to one of the other two by accident.
- [ ] An org owner sees full scope.
- [ ] The label is rendered from the resolved scope, not inferred from an empty result or a row count.
- [ ] Removing the filter also removes its URL parameter handling, so a stale link does not apply a filter the person cannot change.
- [ ] Loading, empty and error states still fill their height; the filter-empty and data-empty cases stay distinct.

## Todo

- [ ] Read the scope for the leads view key through the scope hook
- [ ] Decide the team-scope behaviour explicitly and write it into this ticket before implementing
- [ ] Gate the filter's presence on the scope, and drop its URL parameter when absent
- [ ] Add the label copy for the narrowed case
- [ ] Test through the rendered surface at each scope — not by asserting the hook was called
- [ ] Check 375, 768 and 1280
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
