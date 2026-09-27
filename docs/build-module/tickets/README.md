# Build module — architecture tickets

68 remediation tickets associated with two Build architecture reviews dated 2026-09-26 and
subsequent decisions. The originals are `architecture-review-20260926-213335.html`
("Architecture review — StreamlineOS Build module") and
`architecture-review-20260926-230544.html` ("Build module — architecture review — 2026-09-26")
in the review author's temporary directory. Tickets 35-68 expand the second pass, but numbering
is not exact provenance: RLS tickets 29/30 also match the second report's card 1. Each ticket is
intended to be a narrow, independently verifiable change, not an automatic promise of one-session completion.

## Completion rule — owner instruction, 2026-09-27

Check an acceptance box only when its implementation exists, has been verified, and its relevant
tests pass. Record source paths, exact test command, result, date and checkout scope. A test file
existing is not a test run; a mock matching the implementation is not proof of the requested behavior.
For database criteria require application-role/catalog and behavioral evidence; for UI criteria
require browser evidence. Journalled is not applied, applied is not deployed, and deployed is not
workflow-verified. Keep unsupported claims unchecked and label them implemented/unverified rather
than pretending the code is absent. N/A decisions are recorded separately and never counted as
implemented requirements. Documentation-only decisions need consistency/source verification, not
invented runtime tests.

Current evidence and reopenings: [Architecture verification, 2026-09-27](./ARCHITECTURE-VERIFICATION-2026-09-27.md).

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

**CCG-1's original premise was false and is now corrected.** Ticket update has a body-token
compare-and-swap, but optional tokens and incomplete writer/client coverage are distinct gaps.
Seven versioned-editing page C3 boxes were reopened in this audit; C7 remains open. Follow the
corrected cross-cutting gap and tickets 36/11/12/13, not the old header-only search conclusion.

**Writer coverage must precede required-token rollout.** Ticket 36 gates 11-13. The review's
five-of-eleven count is historical and was itself disputed in the execution plan; re-enumerate
current writers and test the trigger and deployment ordering instead of repeating that number.

**Nothing in either review was measured.** No query plan was run: every connection string in this repository points at production, so `EXPLAIN` was not an option and index reasoning comes from index definitions and predicate shape. No bundle was built and no browser opened. Where a ticket implies a performance gain, it is an argument from structure, not a measurement — do not close one by asserting an improvement that was never observed. Three findings were deliberately left unticketed for this reason: the board's four unindexed sort combinations, the leading-wildcard searches against trigram indexes that are dead under row-level security, and the 62 hardcoded physical table names inside SQL templates. Ticket 67 is the one exception, because its defect is readable off the source rather than off a plan.

**Two records in this module actively mislead, and ticket 68 exists because of them.** Open question 11 states four things about Build permissions that are all false, and the authorization census exists in two copies of which the stale one is the copy a search from the repository root finds first. Until 68 lands, do not cite either as evidence.
