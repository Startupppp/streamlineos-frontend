# Build module — architecture tickets

68 tickets from two architecture reviews of the Build module, both on 2026-09-26. Tickets **01–34** came from the first pass; **35–68** from the second, which re-read the module corner by corner and found six things that are wrong today rather than merely shallow. Each ticket is a vertical slice: a narrow but complete path through every layer it touches, verifiable on its own, sized for one fresh context window.

Numbers run in dependency order — blockers before the tickets they gate. A ticket whose "Blocked by" reads *None* can start immediately; 42 of the 68 can.

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
| **Second pass — correctness** | **35–40** | A portal visibility leak, a decorative compare-and-swap, an event scale that skips forever, a 200 over a rollback, a dropped column, and the gate that could not see it |
| **Reachability** | **41–42** | Eight competing definitions of "which projects can this actor reach" become one |
| **The ticket-change module** | **43–45** | The effect set follows what changed, not which route changed it |
| **Server-side search** | **46–48** | Search reaches the read contract, then every list, then the filter module stops offering what no seam consumes |
| **The list surface** | **49–56** | One assembly for 73 pages, migrated in five batches, then the harness collapses onto it and a gate holds the line |
| **Honest gates** | **57–61** | Four Build gates stop reporting what they never checked |
| **Schema-enforced invariants** | **62–68** | Illegal states become unrepresentable, and two misleading records are corrected |

## Which second-pass findings were already ticketed

Four findings from the second review produced no new tickets because the first pass had them: the three tables with grants and no row-level security are **29** and **30**; the roadmap's dead keyset implementation is **04**; the assignee dropdown built from a capped project list is **09**; and the pass-through wrapper layers the ticket-change module makes removable are **02**.

## Four things to carry into the work

**CCG-1 is false, and tickets 11–13 depend on knowing that.** The cross-cutting gaps document records optimistic concurrency as absent anywhere in the backend. Ticket update implements a complete compare-and-swap: it guards the write on the row's current version, increments it, returns 409 through a dedicated conflict exception, and has a passing spec. CCG-1 reached its conclusion by searching for `If-Match` and `ETag`; this codebase carries the token in the request body, so that search could not have found it. Two deferrals rest on the false premise — C3 was scoped out on pages needing a conflict surface, and C7's conflict state was called unreachable. Both should be reopened.

**And the compare-and-swap is currently decorative, which is why 36 now gates 11–13.** Only five of the eleven ticket writers move the token. A check guarded on a value that six writers leave alone is not a check. Enforcing the token before the token is maintained would ship a conflict surface over a guarantee that does not hold.

**Nothing in either review was measured.** No query plan was run: every connection string in this repository points at production, so `EXPLAIN` was not an option and index reasoning comes from index definitions and predicate shape. No bundle was built and no browser opened. Where a ticket implies a performance gain, it is an argument from structure, not a measurement — do not close one by asserting an improvement that was never observed. Three findings were deliberately left unticketed for this reason: the board's four unindexed sort combinations, the leading-wildcard searches against trigram indexes that are dead under row-level security, and the 62 hardcoded physical table names inside SQL templates. Ticket 67 is the one exception, because its defect is readable off the source rather than off a plan.

**Two records in this module actively mislead, and ticket 68 exists because of them.** Open question 11 states four things about Build permissions that are all false, and the authorization census exists in two copies of which the stale one is the copy a search from the repository root finds first. Until 68 lands, do not cite either as evidence.
