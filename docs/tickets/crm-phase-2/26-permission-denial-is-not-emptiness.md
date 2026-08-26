# 26 — A user who cannot see a list is told it is empty

**Status:** not started
**Track:** E — discovered by the empty-state pass
**Blocked by:** —

## The defect

Every CRM read hook gates itself on a permission:

```ts
const canView = useCan("crm:campaigns:view");
return useQuery({ ..., enabled: canView });
```

In TanStack Query v5 — 5.90.12 is installed — a **disabled** query is
`isPending: true, isFetching: false`, and `isLoading` is defined as
`isPending && isFetching`. So `isLoading` is **false**.

A user without the permission therefore falls straight through the loading gate,
reaches the empty branch, and is told **"No campaigns yet"** when the truth is
**"you are not allowed to see this"**.

**Measured: 82 read hooks across 21 files in `hooks/api/crm/` gate this way.**
The exposure is every surface reading through one of them that does not
separately render a permission state — and today **no** CRM surface renders
`NoPermissionState` at all.

## Why it matters more than the four states

Principle 2 exists because a product that misreports its own status stops being
trusted, and this is the worst version of that: it does not merely fail to
explain, it asserts something false about the customer's data. A rep who cannot
see the pipeline is told the pipeline is empty. The natural next action is to
create a duplicate of something that already exists.

It is also invisible to everyone who can reproduce it least — anyone testing as
an owner or admin has every permission and will never see it.

## Acceptance criteria

- [ ] A surface whose read is denied renders `NoPermissionState`
      (`components/shared/no-permission-state.tsx`, which already exists), naming
      the permission required — never an empty state.
- [ ] **The denial is carried by the hook, not re-derived at each call site.**
      Every one of those 82 hooks already computes `canView`; a surface asking
      `useCan` again is a second source of the same truth, and the two will drift.
      Widening the hook's return is the change — decide the shape deliberately and
      apply it uniformly.
- [ ] The four states keep their meanings: denial is a **fifth**, not a variant
      of first-use or error.
- [ ] A test that would have caught this. It is a rendering-order property, so a
      unit test over a surface with a denied hook is enough; it does not need a
      browser.
- [ ] Server-side gating is unchanged — this is a display defect, and
      `requirePermission()` plus the API guards remain the boundary. Nothing here
      grants access; it stops the UI lying about why access is absent.

## Notes

Found by the empty-state pass, which correctly declined to fix it: it is
systemic rather than per-surface, and bolting it onto 64 surfaces one at a time
would have produced 64 slightly different answers.

Do not attempt this without being able to run the app. The failure mode is a
rendering-order interaction between a permission hook and a query's loading
state, and the whole class of bug is one that typechecks and passes tests while
being wrong on screen.
