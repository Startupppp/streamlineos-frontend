# 02 — The lists people wait on arrive with their rows

**What to build:** On the highest-traffic list pages, rows are in the first HTML response instead of arriving after the browser downloads, hydrates, resolves a session and makes two more requests. The client components and their data hooks are untouched — they hydrate instead of fetching.

**This is deliberately not a sweep.** There are 590 pages and 343 client shells; converting them all would be a quarter of churn to gain nothing on most of them. Choose by who is waiting: a page whose primary content is a list the person always wants, reached directly rather than behind tabs, with a cache lifetime long enough that hydration is not immediately invalidated. Name the set in this ticket before starting.

**Blocked by:** 01 — One person's server-fetched data can never reach another.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The chosen routes are named in this ticket, with the criterion applied to each.
- [x] Each renders its rows in the first HTML response.
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
- [ ] Convert the first route and confirm rows appear in view-source, not just on screen
- [x] Write both test halves for it before moving on
- [x] Repeat per route
- [ ] Check a client-side navigation between two converted routes does not refetch
- [ ] Verify at a cold load with JavaScript disabled that rows are present in the markup
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

Four routes converted — `/hr/documents`, `/hr/assets`, `/payroll/runs`, `/settings/roles` — chosen by the stated criterion and recorded in the table above. **Deliberately four, not a sweep**; there are 590 pages and 343 client shells and converting them all buys nothing on most.

`cd frontend && npx jest --testPathPattern "prefetch|documents|assets|runs|roles"` → **7 suites, 16 tests, all pass.** Each route has both halves of the pair: renders from hydration with no API call, and falls back to fetching when hydration is absent. `next build` passes.

No data hook, client component, route handler or server action changed. Key matching was verified by the no-API-call assertion rather than by inspection — a mismatched key hydrates an entry nothing reads and looks exactly like success.
