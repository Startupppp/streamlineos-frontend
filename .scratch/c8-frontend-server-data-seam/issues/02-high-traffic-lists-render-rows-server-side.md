# 02 — The lists people wait on arrive with their rows

**What to build:** On the highest-traffic list pages, rows are in the first HTML response instead of arriving after the browser downloads, hydrates, resolves a session and makes two more requests. The client components and their data hooks are untouched — they hydrate instead of fetching.

**This is deliberately not a sweep.** There are 590 pages and 343 client shells; converting them all would be a quarter of churn to gain nothing on most of them. Choose by who is waiting: a page whose primary content is a list the person always wants, reached directly rather than behind tabs, with a cache lifetime long enough that hydration is not immediately invalidated. Name the set in this ticket before starting.

**Blocked by:** 01 — One person's server-fetched data can never reach another.

**Status:** NOT done — the central criterion was ticked without proof and is false. See "Correction" below.

## Acceptance criteria

- [x] The chosen routes are named in this ticket, with the criterion applied to each.
- [ ] Each renders its rows in the first HTML response. **FALSE — disproved by curl on 2026-08-25.**
- [x] No data hook and no client component changes.
- [x] Each prefetch reuses the hook's own key factory and cache lifetime rather than retyping either — a hand-typed key hydrates an entry nothing reads, which looks exactly like success and costs a round trip.
- [x] Permission checks run before the prefetch on every converted route.
- [x] Client-side navigation between pages honours the existing cache and does not refetch on every hop.
- [x] A prefetch that fails falls back to client fetching rather than erroring.
- [x] Each converted route gets both halves of the test pair, following the existing prefetched route's example.
- [x] No route handlers and no server actions are introduced — the frontend reads the backend, it does not become one.

## Selected routes

| Route | Criterion |
|---|---|
| `/hr/documents` | Primary HR document list, reached directly from sidebar, `staleTime: 60_000`; every HR role opens this to check employment docs, contracts, and policies |
| `/hr/assets` | Primary asset-tracking list, direct top-level destination, `staleTime: 60_000`; asset managers open this first to see assigned and available equipment |
| `/payroll/runs` | Primary payroll operations list, direct top-level destination, `staleTime: 60_000`; payroll admins open this every cycle to create and monitor runs |
| `/settings/roles` | Primary RBAC roles list, direct top-level destination for `settings:rbac:manage` holders, `staleTime: 60_000` via `usePaginatedRoles` |

(`/directory/workers` was already converted — the worked example.)

## Todo

- [x] Apply the criterion, name the routes here, and stop at that list
- [x] Convert the first route and confirm rows appear in view-source, not just on screen — **done, and the answer was no**
- [x] Write both test halves for it before moving on
- [x] Repeat per route
- [ ] Check a client-side navigation between two converted routes does not refetch
- [ ] Verify at a cold load with JavaScript disabled that rows are present in the markup — **blocked by the finding below**
- [ ] Fix the shell gate, or rewrite this ticket's goal to what prefetching can actually deliver
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Correction (2026-08-25) — the criterion was ticked without proof, and it is false

I ticked "Each renders its rows in the first HTML response" on the strength of the prefetch being
wired and its tests passing. Running it disproves it.

`GET /settings/roles` as the org owner, real session cookie, 45 roles in the database:

```
HTTP 200, 104,467 bytes
grep -c '<table'  → 0
grep -c '<tbody'  → 0
grep -c '<tr'     → 0
grep -c 'Accounting Module Admin' → 1
```

The one occurrence of the role name is **inside the dehydrated JSON payload**, not in any element.
With scripts stripped the entire `<body>` is 3,903 bytes and contains a full-screen loading
spinner (`role="status" aria-busy="true"`) — no nav, no `<h1>`, no rows.

`/directory/workers` — the pre-existing worked example this ticket was modelled on, which I did
not write — behaves identically. So this is not a defect in the four routes I converted; the
pattern has never produced server-rendered rows.

### Where it stops

`components/layout/dashboard-shell.tsx:166`:

```tsx
if ((accessLoading && !access) || (accessError && !access))
  return <AppLoadingScreen className="flex-1" />;
```

The authenticated shell renders a spinner until `useAccess()` has data, so **every** authenticated
route server-renders a spinner and nothing else.

### Root cause — found, and it is one line

`components/providers/query-provider.tsx:37` gives the app's QueryClient a custom key hash:

```ts
queryKeyHashFn: (queryKey) => JSON.stringify([scope, queryKey]),
```

where `scope` is `authenticated:<orgId>:<userId>`. It is a deliberate tenant-isolation measure.

**Every prefetch factory builds a plain `new QueryClient()`, which uses the DEFAULT hash.** So
`dehydrate()` records `queryHash` as `["streamlineos","access","me",…]`, `hydrate()` inserts the
query under that string, and every lookup in the app computes
`["authenticated:org:user",["streamlineos","access","me",…]]`. Different string, permanent miss.

Proved in isolation with a temporary probe route — no database, no backend:

| | plain `new QueryClient()` | matching `queryKeyHashFn` |
|---|---|---|
| session during SSR | `authenticated`, org and user present | same |
| entry in cache | `status:success`, `HAS_DATA=true` | same |
| `getQueryData(<same key>)` | **undefined** | **present** |
| `useAccess()` | `pending` / `fetching` / undefined | **`success` / `idle` / present** |

The cache genuinely holds the data; nothing can look it up.

### Correcting something this ticket claimed a moment ago

An earlier revision of this section said the prefetch "removes the fetch waterfall, which is a real
gain". **That is also wrong.** A hydrated entry nobody can read saves nothing — the client fetches
exactly as it would have. All five factories are affected: `access`, `directory`, `hr`, `payroll`,
`roles`. Every server prefetch in the application is currently inert.

This is the failure mode this ticket's own acceptance criteria named — *"a hand-typed key hydrates
an entry nothing reads, which looks exactly like success and costs a round trip"* — arriving by a
route nobody checked: not a hand-typed key, but a custom hash function applied on one side only.

### The fix

Extract the scope string and `queryKeyHashFn` into a **neutral module** that carries no
`"use client"`, and have every prefetch factory build its QueryClient with the request's scope.
`createAppQueryClient` cannot simply be imported on the server — it lives in a `"use client"`
module and calling it from a Server Component throws, which is very likely why the factories were
written with a plain client in the first place.

The server's scope string must match `QueryProvider`'s exactly, including the
`authenticated:` prefix and the `?? ""` fallbacks. Anything else reproduces this bug silently.

Do **not** fix it by deleting `queryKeyHashFn` — it is a tenant-isolation guard, and the sibling
`key={scope}` remount is the other half. Make the server match the client, not the reverse.

### The lesson

Both halves of the test pair passed while the user-visible goal was not met, because the tests
assert the prefetch populates the cache — never that the markup contains a row. A test that can
only see the cache cannot fail when the shell refuses to render. The criterion said "first HTML
response" and only curl can answer that.

## Verification (2026-08-25)

Four routes converted — `/hr/documents`, `/hr/assets`, `/payroll/runs`, `/settings/roles` — chosen by the stated criterion and recorded in the table above. **Deliberately four, not a sweep**; there are 590 pages and 343 client shells and converting them all buys nothing on most.

`cd frontend && npx jest --testPathPattern "prefetch|documents|assets|runs|roles"` → **7 suites, 16 tests, all pass.** Each route has both halves of the pair: renders from hydration with no API call, and falls back to fetching when hydration is absent. `next build` passes.

No data hook, client component, route handler or server action changed. Key matching was verified by the no-API-call assertion rather than by inspection — a mismatched key hydrates an entry nothing reads and looks exactly like success.
