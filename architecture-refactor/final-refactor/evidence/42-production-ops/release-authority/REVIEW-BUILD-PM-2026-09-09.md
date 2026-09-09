# Build/PM code review — 2026-09-09

Scope: uncommitted Build changes at root `4bdc36089db6356b3a50726a016a6065c1cbc4f1`
and backend `de29980832fd7cd8afa532b74bc62f52c849d0fa`, including new Build files.
The user confirmed HEAD as the comparison point. This was a working-tree review,
not an empty `HEAD...HEAD` comparison. Captured diffs are in
`backend/.artifacts/build-review-20260909/`.

The requirements are the user's Build/PM acceptance criteria, the C123 release
entry, and `PRD-IN-SCOPE.md` §27. Standards are the root/backend/frontend
constitutions and frontend agent instructions. Independent agents reviewed the
two axes; the orchestrator verified findings and owns all commits.

## Standards

1. **P1 — repaired:** `projects-tickets-update.service.ts` validated parent and
   epic chains before acquiring the project transaction lock. Concurrent inverse
   links could both commit. This breached root §9/backend §3 transactional
   invariants. Both validations now use the locked transaction; recursive reads
   explicitly select `build.tickets` and exclude deleted rows. The PostgreSQL red
   run returned `[200,200]` for each inverse-link race, proving the defect.
2. **P2 — repaired:** whole-snapshot optimistic rollback in `ticket-cache.ts`,
   ticket mutations and Kanban could overwrite newer edits and newly loaded rows.
   This breached frontend §2 optimistic-state behavior and root §6 concurrency
   requirements. Rollback now conditionally restores changed fields in current
   rows, preserving newer values, project metadata and current page structure.
   Regression tests reproduce and verify these scenarios.

No additional speculative abstraction or cosmetic code-smell finding was raised.

## Spec

1. **P1 — repaired:** the inverse parent/epic race above violated concurrency-safe
   Build mutation behavior and the requested absence of regressions.
2. **P2 — repaired:** the shared mutation invalidator omitted
   `projects.analytics(projectId)`, leaving TanStack analytics stale even after
   backend cache removal. The key is now invalidated for ticket mutations,
   including assignments and deletions. A failing freshness assertion was made
   green. This addresses “No stale board, report or dashboard state.”
3. **Acceptance gap — closed:** final committed execution at backend `b1bbacaee`
   and root `376f543d3` passed 132 unit suites / 681 tests, 19 database-enabled HTTP
   suites / 369 tests, seven seeded PostgreSQL suites / 69 tests, and the read-cost
   gate. The isolated database permits execution without migrating shared scratch data.
4. **Acceptance gap — partially closed:** timesheet reads now use stable cursors,
   and the final Build production source scan found no `.offset(...)` calls.
   Browser/Web Vitals and production-concurrency measurements remain absent.
   Local timings and cursor tests do not establish universal website performance.

Summary: Standards **2 findings**, worst P1 hierarchy race, both repaired. Spec
**2 original code findings**, worst P1 hierarchy race, both repaired; **2 original
acceptance gaps** tracked separately above. The shared hierarchy finding is counted
independently on each axis, not as two distinct bugs. Three distinct original code
defects were repaired. Follow-up audit work is recorded separately below.

## Follow-up audit and repairs

The expanded audit checked adjacent producers and shared Build surfaces rather than
assuming the initial review covered them. Parallel agents implemented and reviewed
bounded changes; only the orchestrator committed them.

### Standards disposition

- Capacity checks now share a transaction-bound policy across normal and secondary
  ticket producers, including imports and recurring jobs. Destination existence is
  checked after locking; capacity failures cannot partially allocate or insert.
- Project member previews are capped per project through a batched lateral query;
  visibility stays in SQL. Velocity uses two batched reads and a tenant-leading index.
- Timesheet and report cursor contracts are validated at boundaries. Write response
  schemas reflect actual rows; generated contracts retain continuation headers.
- Exact report computations have explicit limits and 422 responses rather than
  unbounded execution or silently incomplete answers.
- Source and strict test-tree typechecks passed. Import graphs found zero cycles;
  frontend external-import resolution warnings are disclosed in the evidence.

### Spec disposition

- Activity and project progress enforce ticket DataScope, with tenant-first isolation
  and scoped summary tests. Custom completed-status categories drive progress/reports.
- Concurrent producer tests prevent WIP bypasses; inverse hierarchy and ordering
  tests establish the measured mutation invariants.
- Project summaries no longer use an incompletely invalidated backend cache.
  Logged time refreshes dependent Build views; bounded-report UI errors recover on retry.
- Timesheet and velocity cursor tests cover ties, malformed cursors and bounds.
  Legacy timesheet `page>1` now returns 400; this API migration is explicitly disclosed.
- Final frontend verification passed 24 suites / 137 tests. Real-browser rendering,
  cross-tab behavior and loading measurements remain blocked by browser availability.

All confirmed Build defects repaired during this audit have passing targeted controls
and the final consolidated backend run. This is not proof of universal bug freedom.

## VERIFIED DONE

Prior verified improvements remain closed: bounded bulk query counts, exact rank
and timestamp precision, nullable cursor traversal, tenant-first bulk failures,
report revision keys, backend analytics-cache removal and ticket-detail contracts.
The three review repairs have targeted regression coverage. No API contract or
migration change was required for those three repairs.

## REGRESSED

No newly proved regression of a previously certified fix. The hierarchy race was
a surviving gap in the modified path, not a claim that a certified invariant
regressed.

## STILL PENDING

See the latest execution disposition in
`CERTIFICATION-BUILD-PM-2026-09-09.md`. Passing Build checks do not override an
unrelated failing repository gate or certify unmeasured browser/scale behavior.
The remaining external item is a connected signed-in browser for UI sign-off.
After scope approval, the KB reaper gap was closed by real two-tenant PostgreSQL
tests and the broader isolation selection passed 469 suites / 1,992 tests.
Matching whole OpenAPI snapshots are committed; the deliberate synchronous
timesheet totals decision and limits are in `BUILD-ACCEPTANCE-FOLLOWUP-2026-09-09.md`.

## NEW

The three new review findings above have been repaired and are not copied into
the active backlog. The isolated database `scratch_build_review_20260909` was
cloned from `scratch_local`; migration removals affected only that disposable
copy. The original database and fixture values remain unchanged and recoverable.

## Assessment

Code review completed with repairs. No universal bug-free, 10/10, or production
readiness claim is issued. Current execution evidence and explicit limitations
take precedence over a numeric architecture score.
