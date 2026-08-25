# 01 — One person's server-fetched data can never reach another

**What to build:** Proof that the server-side API adapter is isolated per request and that permission checks happen before any data is fetched. Both properties hold today by virtue of how the adapter is written, and neither is tested. Before this pattern is rolled out to more routes, the two ways it could go catastrophically wrong need to be pinned.

The adapter's request-scoped cache is keyed on the caller's token as well as the path. That keying is what makes a module-level cache per-request rather than shared across every person hitting the server. A refactor that moves the token out of the cached function's arguments — reading the session inside it, for instance — would silently make the cache global, and nothing would fail.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] Two different callers do not share a cached server response for the same path.
- [x] A caller with no session fails as unauthenticated rather than fetching unauthenticated.
- [x] A slow upstream aborts on the configured timeout rather than holding a render open.
- [x] An error response is parsed through the shared error envelope rather than surfacing raw.
- [x] On a prefetched route, a person who lacks the page's permission is redirected and **no data is fetched** — assert the absence of the call, not just the redirect.
- [x] The existing prefetched route keeps both halves of its test pair: renders from hydrated state without calling the API, and falls back to fetching when hydration is absent.
- [x] The frontend tests actually compile and run — a clean typecheck does not prove this.

## Todo

- [x] Read the adapter and confirm exactly what its request-scoped cache is keyed on before writing the test
- [x] Write the two-caller isolation test so that moving the token out of the cache key would fail it
- [x] Add the unauthenticated, timeout and error-envelope cases
- [x] Add the permission-before-prefetch ordering test on the existing prefetched route
- [x] Run the frontend test suite, not just the typecheck
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`cd frontend && npx jest --testPathPattern "server-fetch|prefetch|workers"` → **6 suites, 18 tests, all pass.**

**The isolation test is built to fail on the specific refactor that would break it.** React's `cache` is mocked as a real argument-keyed memoizer. Today `serverFetch(token, path)` keys on both, so two callers both hit the network. If someone moved the session read inside the cached function — making the key `[path]` alone — the second caller would receive the first caller's cached promise, and both the call-count assertion and the payload assertion would fail. That is the cross-tenant hazard, and it is now pinned rather than trusted.

Permission-before-prefetch is asserted by the absence of the fetch, not just the presence of a redirect. Unauthenticated, timeout and error-envelope paths are covered.
