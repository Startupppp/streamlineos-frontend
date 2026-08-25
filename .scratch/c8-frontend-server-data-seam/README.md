# c8 — Give the frontend a server-data seam

Spec: [`docs/specs/c8-frontend-server-data-seam.md`](../../docs/specs/c8-frontend-server-data-seam.md)

**Candidate status:** the seam is built; the rollout is at one route. The server read adapter exists, a prefetch factory exists, and one route prefetches and hydrates with a test proving both the hydrated and the un-hydrated path. The counts the review measured are unchanged: 590 pages, 343 of them client shells.

The review's finding was "the seam does not exist yet". It exists now, so the question has moved from whether to build it to which routes deserve it — a smaller question that should be answered with a named list rather than a sweep.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [One person's server-fetched data can never reach another](issues/01-pin-server-fetch-isolation-and-ordering.md) | — | ready-for-agent |
| 02 | [The lists people wait on arrive with their rows](issues/02-high-traffic-lists-render-rows-server-side.md) | 01 | ready-for-agent |
| 03 | [Public help-centre pages can be found by a search engine](issues/03-public-help-centre-renders-server-side.md) | 01 | ready-for-agent |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**The highest-leverage prefetch in the product is not in this candidate.** Hydrating the access snapshot at the authenticated layout is one edit that ends the gated-control flash on every authenticated page. It is tracked as **c3 ticket 04**, because the flash is c3's problem — but it uses this candidate's mechanism, and it is the single most valuable thing to do first.

**Do not convert 343 pages.** Treating that as the goal is how this candidate becomes a quarter of churn for no measured gain.
