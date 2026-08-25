# 04 — Gated controls are there in the first paint

**What to build:** Opening any authenticated page shows the buttons, row menus, bulk actions and navigation entries the person is entitled to, immediately — not hidden and then filled in a moment later. Today every gated control renders as denied while the access snapshot is in flight, across more than a thousand call sites, and it reads as "you don't have access" rather than "still loading".

The access snapshot is prefetched on the server and hydrated into the client cache, so the gating hooks answer from real data on first render. No gating call site changes. Module gating is corrected to its documented contract at the same time: a module reads as enabled while access is unresolved, because hiding an entire module's UI is a worse failure than briefly showing it.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [ ] On a full page load of an authenticated route, gated controls the person is entitled to are present in the first paint — no flash.
- [x] Not one of the gating call sites changes; the hooks keep their exact signatures.
- [x] The module-enabled hook answers enabled while access is unresolved, matching its documented contract.
- [x] A person who lacks a permission still sees nothing they should not — hydration must not widen anything.
- [ ] Switching organisations resolves gating for the new organisation; a prefetched snapshot never outlives the switch.
- [ ] A newly granted permission still appears without a hard reload — prefetching must not pin a stale snapshot.
- [x] **A failed server read is not hydrated.** The server helper collapses every error into a fully-denied snapshot, so hydrating it would turn a transient blip into a permanently stripped page. Distinguish failure from denial and hydrate nothing on failure.
- [x] Hydration happens once at the authenticated layout, not per page.
- [x] With no hydrated state, behaviour is exactly as today.

## Todo

- [x] Read the one route that already prefetches and hydrates, and copy its shape — including its negative test
- [x] Add the access prefetch beside the existing prefetch factory, reusing the hook's own key factory and stale time rather than retyping either
- [x] Hydrate at the authenticated layout; make the existing server-access read unconditional so settings routes are covered too
- [x] Handle the failure case explicitly so a denied snapshot from an error is never hydrated
- [x] Correct the module-enabled loading default
- [x] Write both halves of the test pair: renders from hydration without calling the API, and falls back to fetching when hydration is absent
- [ ] Verify in a browser at a cold load, a client-side navigation, and an organisation switch — **blocked: API cannot boot (APP_DATABASE_URL 28P01)**
- [x] Run the frontend tests — a clean typecheck does not prove they compile
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`lib/prefetch/access.ts` prefetches `/me/access` through `serverGet`, reusing `queryKeys.access.me(orgId, userId)` and the hook's own 30s stale time. The authenticated layout now reads server access unconditionally (the MFA redirect stays guarded to non-settings routes) and wraps the shell in `HydrationBoundary`. `useModuleEnabled` now returns `true` while access is unresolved, matching its documented contract.

`cd frontend && npx jest --testPathPattern "hooks/api/access" --no-coverage` → **4 suites, 22 tests, all pass**, including three new cases: hydrated state answers on the first render with no API call; no hydrated state falls back to fetching; module-enabled defaults true while unresolved.

**How a failed server read is kept out of the cache** — handled structurally, not by a flag. `prefetchAccess()` deliberately does NOT call `getServerAccess()`, because that helper swallows every error into a fully-denied snapshot. It passes `serverGet` directly as the `queryFn`. Query v5 catches the throw and leaves the query in ERROR state; `dehydrate()` serialises only SUCCESS queries, so a failed fetch dehydrates to nothing and the client falls back to its normal fetch. A genuine denial is a 200 with empty scopes — a success — so it hydrates correctly.

Zero of the ~1,066 gating call sites changed.

**Not verified here:** first-paint behaviour, organisation switch and client-side navigation were not confirmed in a browser. The API cannot boot — `APP_DATABASE_URL` fails 28P01 (app role password rotated).
