# 01 — Pin what an authorization resolution costs, in the default test suite

**What to build:** An automatic proof of how many database transactions a permission check costs — one number for the cold path, zero for the warm one.

Today the only proof is a manual script that needs a running API and a seeded database, and it cannot observe the cold path at all: it issues a hundred requests concurrently, which completes well inside the five-second window of the cache under question, so the version poll never appears in its numbers. Nothing in the default suite asserts the cost of anything.

This ticket does not change any behaviour. It makes today's cost a fact the test suite states, so that the next ticket's change is provable rather than claimed.

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] A spec resets pool telemetry, drives a **cold** authorization resolution, and asserts the exact borrow count.
- [x] A spec drives a **warm** resolution and asserts zero borrows.
- [x] Both run in the default unit suite. The e2e script is excluded from it, so a spec placed there is not executed coverage.
- [x] The resolution is exercised as a **non-owner**. An organization owner short-circuits to full scope before permission resolution runs, so measuring as one asserts the cost of a path that is not under test.
- [x] The asserted numbers are the ones measured today, not the ones hoped for after ticket 05.
- [x] Any transaction mock introduced invokes its callback. A bare stub silently voids every assertion inside it — this has now bitten this codebase three times.
- [x] The specs assert borrow counts through the existing pool telemetry reset and snapshot, not through a new harness.

## Result

**Cold resolution costs 2 pooled connections. Warm costs 0.** Measured, not estimated.

The two cold borrows are the version read and the resolution itself. The nested denied-modules read costs nothing because `runInTenantTransaction` finds the ambient context the resolution established and reuses its transaction — the mechanism ticket 05 changes is the *first* of those two, not the second.

A fifth test pins the thing the HTTP gate cannot see: advance the clock past the five-second version window and the cold cost is paid again. That is the assertion ticket 05 has to move.

Verified: 57/57 tests across this spec and the existing access service spec; `tsc --noEmit` 0 errors.
