# c8 · Give the frontend a server-data seam

**Status: seam built, rollout at one route.** Verified at source 2026-08-25. The adapter exists (`lib/server-fetch.ts` — `serverGet`, React-`cache`d, bearer token from the session, 8s timeout, parsed through the shared envelope). A prefetch factory exists (`lib/prefetch/directory.ts`). `HydrationBoundary` is used on exactly one route, `/directory/workers`, with a test proving the page renders from the hydrated cache *and* falls back to fetching when it does not. The counts the review measured are unchanged: **590 `page.tsx`, 343 of them `"use client"`.** One is prefetched.

## Problem Statement

**As a user opening any list page, I still pay a four-hop waterfall before the first row.** The browser gets a shell and a skeleton, downloads and hydrates JS, resolves the session, fetches `/me/access`, and only then fetches the rows. The review drew this and it is still what happens on 342 of 343 client pages.

**As a user, gated controls still flash.** `useCan` answers `false` until `/me/access` resolves, so the page renders stripped of its buttons and menus and then fills in. This is candidate 3's second half and the two candidates now share one mechanism: hydrate access on the server and the flash ends everywhere at once.

**As a developer, the decision is still made 343 times by omission.** The review's framing was that adding the seam concentrates a decision currently taken by default. The seam is added. The decision is still defaulted — every new page is written as a client shell because that is what the 342 next to it look like, and nothing marks the prefetched one as the pattern.

**As the business, public surfaces still cannot be indexed.** The public help centre at `/help/:orgId` is the one surface where server rendering has an external payoff, and it has no prefetch.

## Solution

Stop treating this as a sweep. The seam's value is realised per route, and the routes are not equal: a route where the user waits on rows they always want is worth prefetching, and a route behind three tab clicks is not.

Define the pattern once — `lib/prefetch/<module>.ts` beside `lib/query-keys/`, a server page that awaits `requirePermission` then the prefetch, a `HydrationBoundary` around the unchanged client component — and roll it to a named, ordered set of high-traffic routes. Do not convert 343 pages. Convert the ones where someone is waiting.

Hydrate `/me/access` at the authenticated layout so it is prefetched once for every route rather than per page.

## User Stories

1. As a user opening a list page, I want rows in the first HTML response, so that I am not watching a skeleton while the browser decides to ask for data.
2. As a user, I want gated controls present in the first paint, so that a page does not appear to deny me and then change its mind.
3. As a user on a slow connection, I want the round trips before first content to drop from four to one, so that latency compounds once rather than four times.
4. As a user navigating client-side between pages, I want the existing cache honoured, so that server prefetching does not cause a refetch on every hop.
5. As a user, I want a prefetch that fails to fall back to client fetching, so that an API blip degrades to today's behaviour rather than an error page.
6. As a user, I want a prefetched page to show me my data, so that a cached server response can never be another person's.
7. As a user switching organisations, I want prefetched data to be for the organisation I switched to, so that a hydrated cache cannot outlive the switch.
8. As a search engine, I want public help-centre pages to render their content server-side, so that they can be indexed.
9. As a developer, I want one adapter for reading the API on the server, so that a second one is never written.
10. As a developer, I want one prefetch helper per query-key factory, so that the server and client agree on the key without me typing it twice.
11. As a developer, I want the client hooks unchanged, so that prefetching a route is additive and reversible.
12. As a developer, I want a worked example to copy, so that the pattern spreads by imitation rather than by documentation.
13. As a developer, I want to know which routes are worth prefetching, so that I do not convert 343 pages to gain nothing on 300 of them.
14. As a security reviewer, I want the server adapter to send the caller's own token, so that server-side reads carry the same authorization as client ones.
15. As a security reviewer, I want no server-side response cached across users, so that `cache()` scoping is per request rather than per process.
16. As a security reviewer, I want prefetched data to pass the same permission gate as the page, so that hydration cannot leak what a redirect would have prevented.
17. As an operator, I want a server prefetch to time out rather than hang, so that a slow API cannot hold a Next.js render open.

## Implementation Decisions

**Already shipped — this is the pattern, do not write a second one**

- **`serverGet<T>(path)`** is the only way to read the API from a Server Component. It takes the session's `backendJwt`, sends `cache: "no-store"`, and aborts at 8s. It is wrapped in React `cache()` **keyed on the token and path**, which is what makes it per-request rather than a shared process cache — story 15 depends on that keying and it must not be relaxed.
- **`lib/prefetch/<module>.ts`** builds a throwaway `QueryClient`, prefetches with the *same* key factory the hook uses and the same `staleTime`, and returns `dehydrate(...)`.
- **The route file** awaits `requirePermission(...)` first, then the prefetch, and wraps the unchanged client component in `HydrationBoundary`. `requirePermission` before prefetch is story 16: the redirect must happen before any data is fetched, not after.
- **The client component and its hooks are untouched.** `/directory/workers` renders the same `WorkersPage` it did before.
- **`SessionProvider` receives `session` from the server layout**, so `useSession()` reports `authenticated` on first render and `QueryProvider`'s `key={scope}` does not remount underneath hydrated data. This is why `HydrationBoundary` works here at all, and it is a precondition for every future prefetch.

**Remaining**

- **Hydrate `/me/access` at the authenticated layout.** Add `prefetchAccess()` beside `prefetchWorkers()`. The layout already awaits `getServerAccess()` and it is `cache()`d, so the fetch is free. One edit; every authenticated route benefits; candidate 3's flash ends. This is the highest-leverage remaining item in the review.
- **A failed server read must not be hydrated.** `getServerAccess` swallows every error into a fully-denied snapshot; hydrating that would turn a transient blip into a permanently stripped page. Distinguish failure from denial and hydrate nothing on failure — story 5.
- **Pick routes by waiting, not by count.** The criterion is: a page whose primary content is a list the user always wants, reached directly rather than through tabs, with a `staleTime` long enough that hydration is not immediately invalidated. Name the set in the ticket; do not open-endedly "convert pages".
- **`/help/:orgId` is the one route with an external payoff.** It is public, so `serverGet`'s session dependence does not apply and it needs its own read path. Treat it as a separate, later item — story 8 is the only one here that is about anything other than perceived speed.
- **Every prefetch reuses the hook's key factory and `staleTime`.** Hand-typing either is the failure mode: a key mismatch hydrates a cache entry nothing reads, which looks exactly like success and costs a round trip.
- **No `route.ts` handlers, no Server Actions.** Root §5 stands. The frontend reads the backend; it does not become one.

## Testing Decisions

**What makes a good test here.** Prove the page renders from hydrated state without calling the API, and prove it still works when hydration is absent. `features/directory/workers/workers-page.test.tsx` is the prior art and it already has both halves — including the negative, *"fetches from the API when `HydrationBoundary` carries no cache"*. Every new prefetched route copies that pair.

- **Renders from hydration** — with dehydrated state seeded under the real key, the component renders rows and `apiClient.get` is never called. If the key is wrong, this test fails rather than silently passing.
- **Falls back without hydration** — the same component with an empty boundary fetches normally. This is what makes prefetching reversible.
- **`serverGet`** — `lib/server-fetch.test.ts` exists. It should cover: no token throws 401 rather than fetching unauthenticated; a timeout aborts; an error body is parsed through the shared envelope rather than thrown raw.
- **Per-request caching** — two different tokens do not share a `cache()` entry. Story 15 is a cross-tenant concern and deserves an explicit test rather than trust in React's semantics.
- **Permission ordering** — a person without the page's permission is redirected and no prefetch is performed. Assert the API was not called, not just that a redirect occurred.
- **`frontend/tsconfig.json` excludes tests and ts-jest is transpile-only**, so a clean `tsc --noEmit` does not prove these compile. Run them.

## Out of Scope

- **Converting 343 pages.** Explicitly not the goal, and treating it as the goal is how this candidate turns into a quarter of churn for no measured gain.
- **Next.js Cache Components (`use cache`, `cacheLife`, `cacheTag`).** A different mechanism with different invalidation, and mixing it with Query hydration in one change makes both hard to reason about.
- **Changing any client hook.** The seam is additive by construction.
- **Server Actions or business `route.ts` handlers.** Banned by root §5.
- **Candidate 3's client cleanup** (`usePermissions`, `useScope`). Shares the access prefetch, tracked there.

## Further Notes

- **The review said "the seam does not exist yet — that is the finding". It exists now, and the finding has moved.** The question is no longer whether to build it but which routes deserve it. That is a smaller, more answerable question, and it should be answered with a named list rather than a sweep.
- **Access is the highest-leverage single prefetch in the product.** One layout edit, and it fixes a visible artefact on every authenticated page and closes half of candidate 3. If only one thing from this candidate ships, that is it.
- **The `cache()` keying on `(token, path)` is the security-critical detail.** It is what makes a module-level React cache per-request rather than per-process. Any refactor that moves the token out of the cached function's arguments — for instance by reading the session inside it — silently makes the cache shared. Read `lib/server-fetch.ts` before touching it.
- **The 590/343 counts are unchanged from the review**, which is a useful measure of how much of this candidate is rollout rather than construction: essentially all of it.
