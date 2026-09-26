# Build module — architecture tickets

34 tickets from the architecture review of 2026-09-26. Each is a vertical slice: a narrow but complete path through every layer it touches, verifiable on its own, sized for one fresh context window.

Numbers run in dependency order — blockers before the tickets they gate. A ticket whose "Blocked by" reads *None* can start immediately; 26 of the 34 can.

## Waves

| Wave | Tickets | What it does |
|---|---|---|
| Prefactors | 01–03 | Structure and deletions that make the rest easy |
| Correctness | 04–10 | Seven defects that produce wrong answers, not slow ones |
| Concurrency | 11–13 | Expand–contract: stop silent last-write-wins |
| DB efficiency | 14–18 | Index-usable predicates, one access resolution per request |
| Invalidation | 19–20 | Stop evicting caches a mutation cannot have moved |
| Bundle | 21–24 | Deep imports, then a gate so it cannot regress |
| Restructure | 25–28 | Build core becomes named concepts, then the seam is enforced |
| Security | 29–30 | Three tenant tables currently failing open get RLS |
| Settled decisions | 31–33 | Keep the 410 tombstone; retire the dead endpoint; page the velocity report |
| Cleanup | 34 | A design record moves out of a production module |

## Two things to carry into the work

**CCG-1 is false, and tickets 11–13 depend on knowing that.** The cross-cutting gaps document records optimistic concurrency as absent anywhere in the backend. Ticket update implements a complete compare-and-swap: it guards the write on the row's current version, increments it, returns 409 through a dedicated conflict exception, and has a passing spec. CCG-1 reached its conclusion by searching for `If-Match` and `ETag`; this codebase carries the token in the request body, so that search could not have found it. Two deferrals rest on the false premise — C3 was scoped out on pages needing a conflict surface, and C7's conflict state was called unreachable. Both should be reopened.

**Nothing in this review was measured.** No query plan was run: every connection string in this repository points at production, so `EXPLAIN` was not an option and index reasoning comes from index definitions and predicate shape. No bundle was built and no browser opened. Where a ticket implies a performance gain, it is an argument from structure, not a measurement — do not close one by asserting an improvement that was never observed.
