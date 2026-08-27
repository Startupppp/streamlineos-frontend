# c18 · Removals are proved, not grepped

**Status: the tooling exists and the answer is "there is very little to delete".** Verified at source 2026-08-25. `knip` is installed in both repos. Frontend: **zero unused files across 4,429**. Backend: 11 unused files, all of which are the deliberate SQL-managed holding barrel that a spec asserts must stay unimported. `madge --circular` reports **zero cycles in both repos**. This spec exists less to delete things than to record *how* deletion is proved here, because the last attempt to measure it produced a number that was wrong by three orders of magnitude.

## Problem Statement

**As a developer, I cannot tell whether an endpoint is used.** An exact-string join of backend routes against frontend call sites reported that 1,074 of 3,385 routes had no first-party caller — about a third of the API. Checking them individually collapsed that to roughly one provably dead route. **The join cannot follow a URL the frontend builds dynamically**, which is most of them. Acting on that number would have deleted a third of a working API.

**As a developer, a grep-based dead-code claim is unsafe.** Import search misses side-effect imports, dynamic imports and re-export chains. A bare side-effect import is invisible to any scanner that looks for a `from` clause, and deleting a file on that basis has already cost a live file here.

**As a developer, an empty table looks abandoned.** 95 tenant tables have zero rows and all of them are referenced by live services — they are unseeded features, not dead ones. A scan that reported "everything is dead" turned out to be broken in two ways at once: a pattern that missed the capitalised constructor, and a single-line pattern when the table name sits on the following line.

**As a developer, some unused code is deliberately unused.** The SQL-managed schema barrel is kept out of the runtime barrel *by design*, so the ORM never manages those tables — and a spec asserts exactly that. Being unimported is the point. Tooling reports all 11 files as unused; deleting them removes a guarded arrangement.

**As a developer, deletions of capability hide inside deletions of code.** An agent removing code to satisfy a rule has already deleted two user-visible options here. A diff that only removes lines still needs reviewing for what it removes.

## Solution

Write down the standard of proof, then apply it to the small set that actually qualifies.

**The standard.** A file is dead when a module-graph tool says so *and* a real build agrees — not `tsc`, which misses a missing side-effect import. An endpoint is dead when access logs show no calls over a stated window; static analysis can only produce candidates. A table is dead when it has no symbol references, no raw name references, no dependent foreign key, and no spec asserting its arrangement.

**The work.** Six overlapping routes to consolidate, one dead controller, and the confirmed-by-logs set. Plus the two schema items other specs create: `invoices.lineItems` after c16 normalises it, and the dunning JSONB array after c17 moves that state.

The honest headline is that this codebase does not have a dead-code problem. Recording the standard is worth more than the deletions.

## User Stories

1. As a developer, I want a dead-code claim backed by a module graph and a build, so that a deletion is safe.
2. As a developer, I want to know that static analysis produces candidates and not conclusions, so that I verify before deleting.
3. As a developer, I want dynamically-constructed URLs understood as unfollowable, so that an endpoint is not declared dead because a string did not match.
4. As a developer, I want deliberately-unused files marked as such, so that tooling does not propose deleting a guarded arrangement.
5. As a developer, I want an empty table understood as unseeded rather than abandoned, so that a live feature is not dropped.
6. As a developer, I want a reference scan reporting near-total deadness treated as a broken scan, so that an implausible result is checked before it is acted on.
7. As a developer, I want overlapping endpoints consolidated, so that the API has one way to do each thing.
8. As a developer, I want a deleted endpoint's frontend callers updated in the same change, so that removal does not break a page.
9. As a reviewer, I want a deletion diff reviewed for lost capability, so that removing code does not quietly remove a feature.
10. As a reviewer, I want a stated reason for each deletion, so that "unused" is a conclusion rather than an assumption.
11. As an operator, I want route usage measured from access logs, so that "nobody calls this" is evidence.
12. As an operator, I want a route deprecated before deletion, so that an external caller is warned.
13. As an operator, I want a deletion to be revertible, so that a wrong call is cheap.
14. As a developer, I want the import graph to stay acyclic, so that the current zero-cycle state is preserved.
15. As a developer, I want dead-code checks to run in CI, so that accumulation is visible.

## Implementation Decisions

**Already established — this is the standard, do not weaken it**

- **`knip` proves file-level deadness**, confirmed by a real build. `tsc --noEmit` is insufficient: it does not catch a missing side-effect import.
- **`madge --circular` is at zero in both repos** and stays there. `forwardRef` hides a cycle rather than removing one and is banned in new code; a type-only import does not break a DI cycle and erases the injection token if applied to an injected service.
- **The SQL-managed barrel is exempt and stays.** Before removing any schema file, grep the repo for its **path**, not only its symbols, to find specs asserting it.
- **Deleting a schema file additionally requires** zero symbol references, zero raw table-name references, and no dependent foreign key.
- **An empty table is not a dead table.** All 95 empty tenant tables are referenced by live services.

**To build**

- **Consolidate the six overlapping route groups.** Consolidation, not deletion — one canonical shape, callers updated in the same change, old routes removed with no compatibility shim, matching the existing route-ownership rule.
- **Remove the one confirmed dead controller.**
- **Confirm the remaining candidates by access log** over a stated window before touching them. Until then they are candidates and must be labelled as such.
- **Two schema removals are downstream of other specs** and must not be done here: the invoice line-item column after c16 normalises it, and the dunning JSONB array after c17 moves that state. Removing either first is data loss.
- **A deliberate-retention marker.** The SQL-managed barrel is currently protected by a spec and by institutional memory. An explicit marker makes it self-documenting to the next person and to tooling.
- **Dead-code checks run in CI**, reporting rather than failing initially, so the number is visible and its growth is noticed.
- **Deletions land as their own commits**, separate from behaviour changes, so a revert is surgical.

## Testing Decisions

**What makes a good test here.** The build is the test. A deletion is proved by the application still building, booting and serving — not by a suite passing, which it will do regardless if the deleted thing was reached by a side-effect import.

- **A real build after every deletion**, both repos. Not `tsc`.
- **The application boots and serves a request.** A missing side-effect import can survive a build and fail at runtime. Typecheck, build and a fully mocked suite have all been green here while nothing worked.
- **Existing tests must not be rewritten to accommodate a deletion.** If a test fails because something was removed, that is the signal. Editing the fixture to match has already hidden a regression here.
- **The migration-integrity spec keeps passing** — it is the guard on the SQL-managed arrangement.
- **`madge --circular` stays at zero** in both repos, asserted in CI.
- **Route consolidation is covered by controller e2e** for the surviving route, with the same allow/deny matrix the removed one had.
- **Prior art**: `migration-integrity.spec.ts`, and the existing controller e2e specs for any consolidated route.

## Out of Scope

- Deleting the SQL-managed schema barrel.
- Removing tables because they are empty.
- Acting on static route analysis without log confirmation.
- Removing the permission-catalog subset on the frontend, which is intentional and tested. Do not re-raise it.
- Consolidating modules or renaming folders.

## Further Notes

The most useful output of this work is a number that turned out to be wrong. **1,074 routes with no first-party caller** came from an exact-string join; the true figure is approximately one. The join was not buggy — it did precisely what it was asked — but it cannot follow a URL assembled at runtime, and most of this frontend's URLs are.

Two other scans failed the same way and are recorded in the constitution: a table scan whose pattern missed the capitalised constructor reported every table unreferenced, and a single-line pattern found none because the name sits on the following line. **If a scan says everything is dead, the scan is broken.**

That is the rule this spec exists to preserve. The deletions themselves are minor — which is the other finding worth stating plainly: after four passes looking for things to remove, there is very little here to remove.
