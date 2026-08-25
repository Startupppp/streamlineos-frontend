# c3 · Ship one representation of "what may this person do"

**Status: half shipped.** Verified at source 2026-08-25. Commit `9f1a9d9d8` (2026-08-24, the day after the review) dropped `permissions` from `AccessSnapshot` and `AccessResponse`, moved `useCan` onto `scopes`, added `useScope`, and fixed two contract faults it found on the way. The wire is fixed. Both ends are not: the server still builds the same flat array per request, the client resurrected it in a different file, and the fetch state is still outside the seam.

## Problem Statement

The system holds one fact — the set of permission keys a person holds, each at a `DataScope` — and still stores, ships and reads it in more than one shape.

**As a developer**, when I need to ask "may this person do X" inside a backend service, there is no one answer. `authorize()` builds `granted: string[]` from the resolved map (`authorize.ts:56-65`), `PermissionGuard` writes it onto `req.user.permissions` (`permission.guard.ts:58`), and five services read it with `.includes()`. That array is a lossy copy, and it is silently empty in two situations nothing in the type system marks:

- **Org owners.** `authorize()` short-circuits at `if (ctx.isOrgOwner) return { allow: true, scope: "all" }` with no `permissions` field, so the guard never hydrates and the array stays `[]`. All five call sites survive only because a human wrote `user.isOrgOwner ||` in front of the check by hand. The sixth that forgets will deny the owner, and nothing will fail.
- **Routes without `PermissionGuard`.** The guard is deliberately not global (backend constitution §2), so on any route reached without it the array is `[]` and every capability read inside answers false. What keeps this working today is convention, not code.

The array also discards the `DataScope` it came from, so a service can tell *whether* someone holds a key but not whether they hold it at `all`, `team` or `own` — the exact distinction every list endpoint needs.

**As a developer on the client**, the flat array came back after it was deleted. `usePermissions()` (`lib/rbac/hooks.ts:10`) recomputes `Object.keys(access.scopes)` and hands it to the command palette, the product switcher and sidebar visibility, which then do the `.includes()` the refactor removed.

**As a user of the product**, every permission-gated control renders hidden and then appears. `useCan` answers `false` while `/me/access` is in flight (`hooks/api/access.ts:42`); `useModuleEnabled` does the same (`:72`). Across 1,066 `useCan` call sites this is the most visible loading artefact in the product, and it reads as *denied* rather than *loading*. `useModuleEnabled` also contradicts its own documented contract, which says it defaults to `true` while loading.

**As a developer writing a scoped list**, `useScope` exists but has zero production consumers — all eight references are tests. The next scoped surface will re-derive scope from a boolean, or ignore it and show an `own`-scoped person an empty table with no explanation.

## Solution

Make the scope map the only representation on **both** sides of the wire, and prefetch it on the server so it is present on first paint.

**Server.** Capability becomes a question you ask, not a value lying on the request object. `AccessService` — already `@Global()`, already warm-cached per `(userId, orgId)` — answers `holds(user, key)` and `scopeFor(user, key)`. The answer is right for an org owner, right on a route with no `PermissionGuard`, and carries the `DataScope`. `AuthResult.permissions` and `CurrentUserContext.permissions` are deleted, so the empty-array failure mode stops being representable.

**Client.** Prefetch `/me/access` on the server and hand it down through `HydrationBoundary`, using the mechanism `/directory/workers` already proves works in this app. `useCan`, `useScope` and `useModuleEnabled` then answer from real data on first render. All 1,066 call sites are untouched.

**And the last derived copy goes.** `usePermissions()` is deleted and its three navigation consumers move onto the seam; one real scoped list gains a `useScope` consumer.

## User Stories

1. As a backend developer, I want one function that answers whether a person holds a permission key, so that I never choose between `req.user.permissions`, `authorize()` and `resolveUserPermissions` at a call site.
2. As a backend developer, I want that function to return the `DataScope` alongside the verdict, so that a service can narrow a query without a second lookup.
3. As a backend developer, I want the check to answer correctly for an org owner without me writing `user.isOrgOwner ||` in front of it, so that forgetting that prefix is not a silent authorization defect.
4. As a backend developer, I want the check to answer correctly on a route that does not mount `PermissionGuard`, so that guard placement and service logic stop being coupled by convention.
5. As a backend developer, I want `CurrentUserContext` to carry identity and standing only, so that nobody can read a stale or empty capability list off the request.
6. As a backend developer, I want the type system to stop offering me `user.permissions`, so that the old pattern cannot be copied into a new service.
7. As a security reviewer, I want exactly one code path deciding what a person may do, so that a policy change lands in one place and cannot be half-applied.
8. As a security reviewer, I want the removal of the flat array pinned by a test, so that a future refactor cannot reintroduce a lossy copy.
9. As an org owner, I want every capability-gated feature to work for me on every route, so that owning the organisation does not depend on which guard a handler mounts.
10. As an org owner using the KB, I want to see all page reviews and manage all spaces, so that ownership is honoured by retrieval and review the way it is honoured by the guards.
11. As an HR administrator, I want the HR calendar to show travel and interviews according to what I hold, so that a capability read that lost its scope does not hide events I am entitled to.
12. As a frontend developer, I want `useCan` to answer from real data on the first render of an authenticated page, so that I do not hand-roll a loading branch at every gated control.
13. As a frontend developer, I want `useModuleEnabled` to behave the way its documentation says, so that the constitution and the code stop disagreeing.
14. As a frontend developer, I want the six surfaces that pull `isLoading` off `useAccess()` to be able to stop, so that access loading is handled once.
15. As a frontend developer, I want `useScope` to have a real consumer, so that the next scoped list has a pattern to copy.
16. As a frontend developer, I want `usePermissions()` gone, so that there is no supported way to get a flat permission array on the client.
17. As a user opening any authenticated page, I want the controls I am entitled to use present in the first paint, so that the page does not appear to deny me and then change its mind.
18. As a user, I want the sidebar and product switcher populated immediately, so that navigation does not visibly rebuild itself on every full page load.
19. As a user, I want the command palette to offer my commands as soon as it opens, so that a query typed fast does not miss entries that had not resolved.
20. As a user with a narrowed role, I want a page showing only my own records to say so, so that a short list reads as a scope rather than as missing data.
21. As a user with a narrowed role, I want filters that can only ever return nothing at my scope to be absent, so that I am not offered a control that cannot work.
22. As a user switching organisations, I want gating to resolve for the new organisation, so that a prefetched snapshot from the previous one is never shown.
23. As a user granted a new permission, I want it to appear without a hard reload, so that prefetching does not pin me to a stale snapshot.
24. As an operator, I want capability resolution to keep costing zero extra round trips on the warm path, so that the CI transaction-ceiling job stays green.
25. As a developer reading the codebase, I want "what may this person do" to map to exactly one type, so that the answer is greppable.

## Implementation Decisions

### Backend — capability becomes a question, not a value on the request

- **`AccessService` gains `holds(user, key)` and `scopeFor(user, key)`**, both taking `CurrentUserContext` so they honour `isOrgOwner` and `tokenScopes` internally. They resolve through the existing `resolveUserPermissions`, already cached in-process and in Redis and already invalidated by `bumpPermissionsVersion`. No new cache, no new key namespace.
- **Owner and personal-token handling live inside the seam.** `holds` returns `true` for an org owner without consulting the map; both members apply the same `isPersonalTokenPermissionDelegable` / `tokenScopes` filter `authorize()` applies, so a personal access token cannot widen its reach by going through the new door.
- **`AccessModule` is already `@Global()`** — no module import changes anywhere. Injection alone is enough, which is what makes this the cheap option rather than the expensive one.
- **`AuthResult.permissions` is deleted**, and with it the `granted` array. `AuthResult` keeps `allow`, `scope`, `reason` — the three things `PermissionGuard` acts on.
- **`CurrentUserContext.permissions` is deleted**, along with the hydration block in the guard. The context then carries `userId`, `orgId`, `role`, `isOrgOwner`, `sessionId`, `tokenScopes`.
- **The five read sites migrate**: the HR calendar's admin, travel and interview checks (`hr/helpdesk/hr-calendar.service.ts:71-73`); `KbAccessService.isAdmin` (`kb/core/kb-access.service.ts:31`); `reviewerCanSeeAllReviews` (`kb/wiki/kb-page-reviews.service.ts:29`). Each drops its hand-written owner prefix. The two KB helpers become `async`; their callers already sit in `async` methods.
- **`req.rbacScope` stays.** It is the guard's answer for the key the route declared and what list endpoints feed to `applyScope` — one field of the one map, selected for this request, not a second representation.
- **`GET /me/access` is unchanged.** No field added, none removed.

### Client — prefetch on the server, hydrate on the client

- **Use `HydrationBoundary`, not a context seed.** `/directory/workers` already does exactly this and has a test proving the page renders from the hydrated cache. `SessionProvider` receives `session` from the server layout, so `useSession()` reports `authenticated` on first render and `QueryProvider`'s `key={scope}` does not remount underneath the hydrated data. Follow the proven path.
- **Add `prefetchAccess()` beside `prefetchWorkers()`** in `lib/prefetch/`, reading `/me/access` through `serverGet` under `queryKeys.access.me(orgId, userId)` with the same `staleTime` the hook declares (30s).
- **Hydrate at the authenticated layout, not per page.** Access is needed by the shell — sidebar, header, command palette — so the boundary belongs where the shell mounts. This is one edit that covers every authenticated route, versus 343.
- **`getServerAccess()` is already `cache()`d** and already called by that layout, so the prefetch is free. Note the layout currently skips it on `/settings/*`; that branch becomes unconditional.
- **A failed server read must be skipped, not hydrated.** `getServerAccess` swallows every error into a fully-denied snapshot, so hydrating it would turn a transient API blip into a visibly stripped page that never recovers. The prefetch must distinguish failure from denial and hydrate nothing on failure, letting the client fetch normally.
- **`useCan` and `useScope` keep their exact signatures.** `useCan(key): boolean`, `useScope(key): DataScope`. The `if (!data) return false` branch stays as the honest answer when there genuinely is no data; it simply stops being the common case.
- **`useModuleEnabled` is corrected to its documented contract** and defaults to `true` while unresolved, matching `frontend/CLAUDE.md` §2. With hydration this branch is rare, but the correction stands alone: hiding a whole module's UI is a worse failure than briefly showing it.
- **`usePermissions()` is deleted.** Its three consumers move to `useCan` per key, or read `access.scopes` directly where they genuinely iterate the whole set — either way they stop materialising an array to call `.includes()` on.
- **One scoped list gains a `useScope` consumer.** CRM leads is the recommendation: the backend already narrows it with `applyScope(scope, orgId, userId, { ownerColumn: leads.assignedToId })`. At `own` the list labels itself and omits the assignee filter — a control that at that scope can only return the rows already shown, or nothing.

### Not changed

The `DataScope` union, the key grammar, both catalogs, `ROLE_TEMPLATES`, `bumpPermissionsVersion`, the access cache, `applyScope`, `ModuleGuard`, and the six standings. This redistributes no authority; it removes a second copy of an answer.

## Testing Decisions

**What makes a good test here.** Assert what a caller observes at the seam: given a person with a known scope map, what does the seam answer? Not which cache it came from or which helper ran. The prior art already reads this way — `__tests__/access-snapshot-shape.spec.ts` opens with a case literally named *"carries one representation of what a person may do"*.

**Backend**

- `AccessService.holds` / `scopeFor` — held key at a narrowed scope answers `true` / that scope; absent key answers `false` / `none`; key held at `none` answers `false`; **an org owner holding nothing explicitly** answers `true` / `all`; a personal token that does not delegate the key answers `false` even when the map holds it.
- `authorize.spec.ts` currently asserts `permissions` in its expected results (lines 36, 50). Invert them: `AuthResult` carries a verdict and a scope, never a list.
- `permission.guard.spec.ts` / `.e2e-spec.ts` — the guard sets `req.rbacScope` and no longer writes `req.user.permissions`. The e2e file runs only under `pnpm test:e2e`.
- `kb-page-reviews.service.spec.ts` — rewritten against the seam, and gaining the case it cannot express today: **an org owner who holds nothing sees all reviews**. Remove today's hand-written `isOrgOwner ||` prefix and that case fails, which is the whole argument.
- `__tests__/warm-cold-parity.spec.ts` and `access-resolution-cost.spec.ts` guard story 24 — no added round trip, CI transaction ceiling stays green.

**Frontend**

- `hooks/api/access/use-can.test.tsx` is the right prior art (real `QueryClientProvider`, mocked `apiClient`) because hydration is about what happens *before* the query resolves. `access-scopes.test.ts` mocks `useQuery` outright and cannot observe it.
- `features/directory/workers/workers-page.test.tsx` is the prior art for the hydration half — including its negative case, *"fetches from the API when HydrationBoundary carries no cache"*. Mirror both.
- New cases: with hydrated state, `useCan` answers `true` on the first render with no `waitFor`; with no hydrated state, behaviour is exactly as today; `useModuleEnabled` answers `true` while unresolved.
- The migrated CRM leads surface: at `own` the assignee filter is absent and the list labelled; at `all` both present. Test through the rendered surface, not by asserting `useScope` was called.

**Traps**

- `*e2e-spec` files run only under `pnpm test:e2e`.
- `frontend/tsconfig.json` excludes tests and ts-jest is transpile-only, so a clean `tsc --noEmit` does not prove the frontend tests compile. Run them.
- Deleting `CurrentUserContext.permissions` breaks every backend spec whose `makeUser` fixture sets it — `access-snapshot-shape.spec.ts`, `authorize.spec.ts`, `kb-page-reviews.service.spec.ts`, the guard specs. Update the fixtures; do not restore the field to keep them compiling.
- Full backend jest dies as OS-killed workers under load; run sequential `--shard` passes at `--maxWorkers=2` and grep `^FAIL` — a clean tally hides suites that failed to run.

## Out of Scope

- **Any change to who may do what.** No key added, removed, renamed or re-scoped; no role template changes; no backfill migration. If this alters anyone's effective access, it is a defect.
- **Rolling prefetch out beyond access.** That is c8. This adds one prefetch to the layout, not 343.
- **The `getServerAccess` fail-closed redirect.** It returns a denied snapshot on any error, so a transient failure sends an entitled user to `/access-denied`. Real, pre-existing, independent — its own ticket. This spec only ensures the failure is not hydrated.
- **Migrating more than one surface onto `useScope`.** One consumer proves the shape; a sweep is follow-up.
- **`req.rbacScope`.**

## Further Notes

- **Verify before assuming this is unstarted.** The review is dated 2026-08-23; `9f1a9d9d8` landed 2026-08-24. Anyone working from the review alone will try to delete a `permissions` field that no longer exists and migrate a `useCan` already migrated.
- **The deletion test still holds, on the other end.** The review's argument was that deleting the array removes complexity and no caller loses information. Still true of the server's `granted` array: every one of its five readers gets a strictly better answer from the seam — one that carries the scope, and one that is right for owners.
- **The strongest evidence for the backend half is a test that cannot be written today.** "An org owner with no explicit grant sees all KB page reviews" passes now only because someone typed `user.isOrgOwner ||` into that helper by hand. That is the definition of a fact stored in more than one place.
- **The blast radius is real but the signatures do not move**: 1,066 `useCan` sites, 30 `useAccess` sites, five backend services, three navigation surfaces. Verify that claim by diffing — any required call-site change is a signal the seam is wrong.
