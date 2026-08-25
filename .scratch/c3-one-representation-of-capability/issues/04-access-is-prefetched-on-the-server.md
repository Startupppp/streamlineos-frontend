# 04 — Gated controls are there in the first paint

**What to build:** Opening any authenticated page shows the buttons, row menus, bulk actions and navigation entries the person is entitled to, immediately — not hidden and then filled in a moment later. Today every gated control renders as denied while the access snapshot is in flight, across more than a thousand call sites, and it reads as "you don't have access" rather than "still loading".

The access snapshot is prefetched on the server and hydrated into the client cache, so the gating hooks answer from real data on first render. No gating call site changes. Module gating is corrected to its documented contract at the same time: a module reads as enabled while access is unresolved, because hiding an entire module's UI is a worse failure than briefly showing it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] On a full page load of an authenticated route, gated controls the person is entitled to are present in the first paint — no flash.
- [ ] Not one of the gating call sites changes; the hooks keep their exact signatures.
- [ ] The module-enabled hook answers enabled while access is unresolved, matching its documented contract.
- [ ] A person who lacks a permission still sees nothing they should not — hydration must not widen anything.
- [ ] Switching organisations resolves gating for the new organisation; a prefetched snapshot never outlives the switch.
- [ ] A newly granted permission still appears without a hard reload — prefetching must not pin a stale snapshot.
- [ ] **A failed server read is not hydrated.** The server helper collapses every error into a fully-denied snapshot, so hydrating it would turn a transient blip into a permanently stripped page. Distinguish failure from denial and hydrate nothing on failure.
- [ ] Hydration happens once at the authenticated layout, not per page.
- [ ] With no hydrated state, behaviour is exactly as today.

## Todo

- [ ] Read the one route that already prefetches and hydrates, and copy its shape — including its negative test
- [ ] Add the access prefetch beside the existing prefetch factory, reusing the hook's own key factory and stale time rather than retyping either
- [ ] Hydrate at the authenticated layout; make the existing server-access read unconditional so settings routes are covered too
- [ ] Handle the failure case explicitly so a denied snapshot from an error is never hydrated
- [ ] Correct the module-enabled loading default
- [ ] Write both halves of the test pair: renders from hydration without calling the API, and falls back to fetching when hydration is absent
- [ ] Verify in a browser at a cold load, a client-side navigation, and an organisation switch
- [ ] Run the frontend tests — a clean typecheck does not prove they compile
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
