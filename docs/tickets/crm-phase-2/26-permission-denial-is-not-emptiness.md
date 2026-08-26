# 26 — A user who cannot see a list is told it is empty

**Status:** fixed at the seam and verified on a running screen; the rest is a ratchet — 365 surfaces, not 82, and the list may only shrink.
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


---

## Notes

### What it actually was

The ticket's diagnosis was exactly right and its estimate was low by a factor of
four. Measured: **365 surfaces across every module** — HR 74, build 68,
inventory 54, payroll 47, CRM 38. It was never a CRM bug; the CRM is only where
somebody noticed.

### The second lie, which fixing the first would have introduced

`useCan` answers `false` while the access response is still in flight, because
until it lands there is nothing to check against. So "denied" and "not known
yet" were the same value. A screen that simply branched on the boolean — which
is what the three already-fixed CRM pages do — shows **every** user, including
one who holds the permission, a flash of "Access Restricted" on first paint.

That is why the fix is a function with three inputs rather than a boolean:
`resolveGate` in `lib/rbac/gate.ts`, fed by `useCanState`. The ordering is the
whole content of it — not-yet-known outranks denied, denied outranks a query
that never ran, and emptiness is only emptiness once something has looked.

### Why a component and not 365 edits

`<Gated>` exists because this was not a mistake anybody made once. Twenty-one
files independently wrote the same four-branch ternary and all of them put
`isLoading` above emptiness and neither above denial — because that is the
obvious order until you know that a *disabled* query reports `isLoading: false`.
Leaving the branch order at each call site leaves the next file free to get it
wrong the same way.

### Verified on a running screen, which is what the ticket asked for

Both servers up, a session minted for a **non-owner** member with no CRM
permissions (`38a1dbfe…` in org `90e26fca…`), same session across both pages:

| Page | Renders |
|---|---|
| `/crm/settings/pipelines` (converted) | **Access Restricted**, naming `crm:leads:view`, and the two-pane shell does not render at all |
| `/crm/campaigns` (not yet converted) | **"No campaigns yet — A campaign groups the leads that came from one push…"** |

The second is the defect itself, reproduced live: an inviting empty state with
an illustration, shown to somebody who is not permitted to see campaigns. Their
natural next action is to create a duplicate of something that already exists.

A caution worth recording: the dev server already running on :1000 was **not
building from this working tree** — a probe string added to a page never
appeared in it. The verification above was done on a server started against this
tree (frontend :1010, backend :1501 with that origin added to `CORS_ORIGINS`).
Anything checked against a dev server somebody else started should be treated as
unverified until a probe proves it is serving your code.

### The ratchet

`lib/rbac/denial-is-not-emptiness.test.ts` collects the gated read hooks from
source — rather than listing them, so it keeps watching whatever is added next —
finds every component that uses one and asserts emptiness without handling
denial, and compares against a frozen list. **The list may only shrink.** A new
offender fails the build, and an entry whose surface was converted or deleted
also fails, so it cannot rot into an allowlist. Verified to fail: a probe
component was added, named by the test, and removed.

Five converted so far: `crm/issues`, and CRM settings' pipelines, options,
blueprints and assignment-rules. The rest of the CRM's list is deliberately
untouched — those files are being rewritten onto the renderer by another
workstream right now, and editing them mid-rewrite would cost more than it
gains. They are on the list; the list is the work.
