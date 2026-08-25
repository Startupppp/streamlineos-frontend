# 01 — One person's server-fetched data can never reach another

**What to build:** Proof that the server-side API adapter is isolated per request and that permission checks happen before any data is fetched. Both properties hold today by virtue of how the adapter is written, and neither is tested. Before this pattern is rolled out to more routes, the two ways it could go catastrophically wrong need to be pinned.

The adapter's request-scoped cache is keyed on the caller's token as well as the path. That keying is what makes a module-level cache per-request rather than shared across every person hitting the server. A refactor that moves the token out of the cached function's arguments — reading the session inside it, for instance — would silently make the cache global, and nothing would fail.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Two different callers do not share a cached server response for the same path.
- [ ] A caller with no session fails as unauthenticated rather than fetching unauthenticated.
- [ ] A slow upstream aborts on the configured timeout rather than holding a render open.
- [ ] An error response is parsed through the shared error envelope rather than surfacing raw.
- [ ] On a prefetched route, a person who lacks the page's permission is redirected and **no data is fetched** — assert the absence of the call, not just the redirect.
- [ ] The existing prefetched route keeps both halves of its test pair: renders from hydrated state without calling the API, and falls back to fetching when hydration is absent.
- [ ] The frontend tests actually compile and run — a clean typecheck does not prove this.

## Todo

- [ ] Read the adapter and confirm exactly what its request-scoped cache is keyed on before writing the test
- [ ] Write the two-caller isolation test so that moving the token out of the cache key would fail it
- [ ] Add the unauthenticated, timeout and error-envelope cases
- [ ] Add the permission-before-prefetch ordering test on the existing prefetched route
- [ ] Run the frontend test suite, not just the typecheck
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
