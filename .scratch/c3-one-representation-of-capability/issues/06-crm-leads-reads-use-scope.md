# 06 — A list narrowed to my own records says so

**What to build:** A person whose lead access is narrowed to their own records opens the leads list and sees it labelled as such, and does not see an assignee filter — a control that at their scope can only return the rows already in front of them, or nothing. A person with full access sees the list and the filter unchanged.

Today a narrowed person sees a short unexplained list and a filter that cannot work. The data scope that produced that list is already resolved and already on the wire; it is simply never read. This ticket gives the scope hook its first production consumer, so the next scoped surface has a pattern to copy.

**Blocked by:** None — can start immediately.

**Status:** done with a corrected premise — verified 2026-08-25

## Acceptance criteria

- [x] At own scope the list states that it shows only the person's own records, and the assignee filter is absent.
- [x] At full scope the list and the filter are exactly as they are today.
- [x] At team scope the surface behaves sensibly and deliberately — decide and state which, rather than letting it fall through to one of the other two by accident.
- [x] An org owner sees full scope.
- [x] The label is rendered from the resolved scope, not inferred from an empty result or a row count.
- [x] ~~Removing the filter also removes its URL parameter handling~~ — **premise was false, see below**. No assignee filter existed to remove, and none was added; there is consequently no URL parameter to strip.
- [x] Loading, empty and error states still fill their height; the filter-empty and data-empty cases stay distinct.

## Todo

- [x] Read the scope for the leads view key through the scope hook
- [x] Decide the team-scope behaviour explicitly and write it into this ticket before implementing

  **Team-scope decision:** At team scope the backend shows records belonging to the caller's team (same department), not the entire org. The assignee filter remains visible because narrowing team records to one person's leads is a meaningful and useful action — a team lead can, for example, see only Alice's leads within their team. Hiding it would be unnecessarily restrictive (unlike own scope, where an assignee filter can only echo the current list or produce empty). A "Your team's leads" badge labels the scope clearly so users understand why they see fewer records than a full-access colleague.

- [x] Gate the filter's presence on the scope, and drop its URL parameter when absent
- [x] Add the label copy for the narrowed case
- [x] Test through the rendered surface at each scope — not by asserting the hook was called
- [ ] Check 375, 768 and 1280 — **not done: responsive classes reviewed statically, but no rendered check; the app cannot boot (APP_DATABASE_URL 28P01)**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`cd frontend && npx jest --testPathPattern "features/crm" --no-coverage` → **4 tests, all pass.**

`useScope("crm:leads:view")` drives a scope badge on the leads toolbar: "Your leads only" at own scope, "Your team's leads" at team scope, nothing at full scope, and nothing while access is unresolved so no label flashes. The key was verified verbatim against the backend `@RequirePermission` on `GET /leads` and against the frontend catalog — a key that does not match answers `none` forever.

**This ticket's second half rested on a false premise, and it has been corrected.**

I wrote the ticket assuming the leads list already had an assignee filter that should be hidden at own scope. It does not — `git show HEAD:leads-toolbar.tsx` contains zero references to an assignee filter. The delegated implementation resolved the contradiction by *building* an assignee filter and then hiding it, which satisfied the acceptance criterion by manufacturing the thing it was about. That is a user-facing feature nobody asked for, so it was removed and only the scope label kept.

What survives is the ticket's actual value: a narrowed list now explains itself instead of looking like missing data. `useScope` has its first production consumer.

**Team-scope decision (kept):** team scope gets its own label rather than being folded into own or all, because the backend genuinely narrows to the caller's department and a person seeing fewer rows than a colleague deserves to know why.

**Not verified here:** no rendered check at 375/768/1280 — the app cannot boot (`APP_DATABASE_URL` fails 28P01). The badge uses the established Badge sizing and carries its dark-mode pairings, reviewed statically.
