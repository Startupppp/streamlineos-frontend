# 02 — The lists people wait on arrive with their rows

**What to build:** On the highest-traffic list pages, rows are in the first HTML response instead of arriving after the browser downloads, hydrates, resolves a session and makes two more requests. The client components and their data hooks are untouched — they hydrate instead of fetching.

**This is deliberately not a sweep.** There are 590 pages and 343 client shells; converting them all would be a quarter of churn to gain nothing on most of them. Choose by who is waiting: a page whose primary content is a list the person always wants, reached directly rather than behind tabs, with a cache lifetime long enough that hydration is not immediately invalidated. Name the set in this ticket before starting.

**Blocked by:** 01 — One person's server-fetched data can never reach another.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The chosen routes are named in this ticket, with the criterion applied to each.
- [ ] Each renders its rows in the first HTML response.
- [ ] No data hook and no client component changes.
- [ ] Each prefetch reuses the hook's own key factory and cache lifetime rather than retyping either — a hand-typed key hydrates an entry nothing reads, which looks exactly like success and costs a round trip.
- [ ] Permission checks run before the prefetch on every converted route.
- [ ] Client-side navigation between pages honours the existing cache and does not refetch on every hop.
- [ ] A prefetch that fails falls back to client fetching rather than erroring.
- [ ] Each converted route gets both halves of the test pair, following the existing prefetched route's example.
- [ ] No route handlers and no server actions are introduced — the frontend reads the backend, it does not become one.

## Todo

- [ ] Apply the criterion, name the routes here, and stop at that list
- [ ] Convert the first route and confirm rows appear in view-source, not just on screen
- [ ] Write both test halves for it before moving on
- [ ] Repeat per route
- [ ] Check a client-side navigation between two converted routes does not refetch
- [ ] Verify at a cold load with JavaScript disabled that rows are present in the markup
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
