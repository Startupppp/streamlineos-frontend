# Build/PM verification evidence — 2026-09-09

**Status: Build implementation and review repairs committed; final consolidated Build checks passed. The KB coverage gap is closed; browser sign-off remains blocked.**

The later acceptance follow-up is recorded in `BUILD-ACCEPTANCE-FOLLOWUP-2026-09-09.md`:
946/946 declared isolation coverage, 469 suites / 1,992 runtime isolation tests passed,
two real-PostgreSQL KB controls passed, synchronous timesheet totals deliberately
retained, and matching whole OpenAPI documents regenerated and committed.

This certifies only the measured Build delta, not universal bug freedom, a numeric
10/10 rating, or production infrastructure readiness. The independent review is
recorded in `REVIEW-BUILD-PM-2026-09-09.md`. Requirements come from the user's
Build/PM acceptance criteria and `PRD-IN-SCOPE.md` §27.

## Source and commits

The final consolidated run passed at backend `b1bbacaee` and root `376f543d3`.
Its manifest records full hashes, dirty paths, selected checks and the isolated
database under `backend/.artifacts/build-review-final-committed/`.
Documentation-only commits do not change the tested runtime. Unrelated sessions'
Chat, KB and Integrations work was preserved, not rolled back or swept into commits.

| Repository | Reviewed commit | Change |
|---|---|---|
| Backend | `e2ec8e5c0` | Exact ticket cursors, detail contracts, deny-all project scope |
| Root | `8a786aeba` | Isolated verification runner |
| Root | `1a330925b` | Conditional optimistic rollback, cache invalidation, activity UI |
| Backend | `3368da356` | Serialized mutations, hierarchy checks, report revisions, database tests |
| Backend / Root | `6570fa4b2` / `81d24f94e` | First reviewed Build contract synchronization |
| Backend | `d6b55b169` | Test-only RAG citation dependency fixture repair |
| Backend | `b1c550be2` | JSON timesheet-scope fixture projection |
| Root | `d5292ddef` | Database-enabled HTTP checks by default |
| Backend | `6ba75f876` | Ticket activity DataScope enforcement |
| Backend | `f2d610307` | Shared capacity enforcement across ticket producers |
| Backend | `8040f5872` | Timesheet cursors and correct write response contracts |
| Root | `f1ca2164a` | Logged-time parsing and dependent-view refresh |
| Backend | `e127a461b` | Scoped, fresh, bounded project summaries |
| Backend | `ac1d19166` | Report cursors, computation bounds and cursor index |
| Root | `ec63ddaa9` | Bounded-report errors, labels and retry recovery |
| Root | `98303cc89` | Expanded seven-suite seeded verification and HTTP heap collection |
| Backend | `0254b063f` | Preserve OpenAPI response metadata |
| Backend / Root | `b1bbacaee` / `376f543d3` | Final reviewed generated contracts |

## VERIFIED DONE

### Authorization and mutation integrity

- Anonymous 401, same-tenant denied 403 and cross-tenant 404 are asserted separately.
  Project, ticket, activity, sprint, assignment and bulk paths have real-database coverage.
- Project summaries now apply ticket DataScope to progress rather than exposing
  whole-project ticket totals to a restricted reader. Activity uses the same
  ticket visibility predicate and verifies project access.
- Bulk assignment/status paths batch reads and writes. They preserve atomic rejection,
  validate assignee membership, increment versions, and batch status outbox events.
- Create/update/bulk/rank use the project transaction lock. WIP checks count all
  incoming rows together. Parent/epic ancestry validation runs inside the same lock.
  Deterministic inverse-link races admit one edge and reject the other.
- Capacity checks cover normal creation, imports, feedback, intake, forms, meeting
  conversion, entity actions, automation and recurring jobs. Imports and epics
  competing for one remaining slot cannot both commit.
- Destination columns are revalidated after locking. Missing configured destinations,
  including a project with no configured statuses, return 409 before insertion.
  The database FK disproved the earlier assumption that implicit TODO was supported.
- Recurring capacity failures retain the established rollback/no-advance/retry behavior.
  Template-created projects start with configured, unlimited default statuses.
- Single-ticket version checks reject future/stale client versions. Foreign/mixed
  bulk IDs return 404 before any partial mutation.

### Pagination, ordering and bounded reads

- Rank calculations preserve exact PostgreSQL numeric midpoints, including
  `9007199254740992.5`. Stale-gap concurrent insertion returns 409; normalization is
  one set-based update and adjacency reads are bounded.
- Ticket cursors preserve PostgreSQL microseconds and correctly traverse nullable
  due dates. Activity uses stable cursor pages and the UI supports retry/loading older items.
- Project visibility uses SQL membership subqueries rather than unbounded ID arrays.
  Member previews use one batched lateral query limited to five rows per project.
  Seven-member/two-project fixtures verify the cap independently for each project.
- Timesheet list/team/ticket reads use stable `(date, id) DESC` cursors. Tied dates,
  concurrent insertion, scope and foreign-ID cases are exercised. No production
  `.offset(...)` calls remain under `backend/src/modules/build` in the final source scan.
- Velocity uses `(start_date, id) DESC` cursors with exact timestamp text, a 100-row
  maximum, and two batched data reads. Page results remain chronological for charts.
  Malformed dates/IDs and year zero return 400.
- Migration 1079 adds a tenant-leading partial velocity cursor index. Existing
  migration 0806 already provides the timesheet `(org_id, date DESC, id DESC)` index.
- Exact reports refuse oversized work with 422, not partial results: burnup supports
  1–366 days and at most 20,000 events; critical path supports at most 5,000 tickets
  and 20,000 dependencies. Critical-path relations use joins instead of expanded ID lists.

### Cache freshness and contracts

- Optimistic rollback restores only mutation-owned fields that still hold the failed
  optimistic value. It preserves newer edits, loaded pages/rows and project metadata.
- Frontend invalidation covers project details/lists, ticket/by-key detail, boards,
  reports/analytics, sprints, activity, all-work and dashboard My Issues.
- Migration 1073 advances project report revisions through statement-level triggers.
  Warm report keys change with source writes; rolled-back writes do not advance revisions.
  Report authorization precedes shared-cache reads and requires full ticket scope.
- Backend analytics/resource-allocation caches and the composite project-list cache
  were removed because their dependencies lacked complete invalidation coverage.
  Frontend query caching and revision-aware backend report caching remain.
  A warm-summary HTTP mutation regression proves immediate fresh progress.
- Completion calculations use configured completed-status categories, not the literal
  status name DONE. Ticket/detail, import and timesheet read/write schemas match
  their actual response shapes. Logged-time frontend parsing matches the returned row.
- Burnup/critical-path UI surfaces bounded-report errors. Burnup retry refreshes both
  its failed sprint-list dependency and its chart request.
- The authoritative OpenAPI generator preserves response headers/links/descriptions
  while replacing the body with the Zod contract. Both cursor endpoints now document
  Link, X-Next-Cursor and X-Has-More in generated responses.

## Verification results

Counts are separate runs and must not be added as if they were disjoint tests.
This table retains the original consolidated run; the follow-up closes the KB gate.

| Check | Result | Evidence |
|---|---|---|
| Final committed Build units | 132 suites / 681 tests passed; zero failures/skips; exit 0 | `build-review-final-committed/unit.json` |
| Final committed database-enabled HTTP | 19 suites / 369 tests passed; zero failures/skips; exit 0; 355.003s wall time | `build-review-final-committed/http-complete.json` |
| Final committed seven seeded suites | 7 suites / 69 tests passed; exit 0; 195.699s wall time | `build-review-final-committed/seeded.log` |
| Final committed read-cost gate | Passed; board 97, rank 9, My Work 578 blocks | `build-review-final-committed/read-cost.log` |
| Final frontend selection | 24 suites / 137 tests passed; exit 0; 10.587s | `frontend/.artifacts/build-review-20260909-frontend-final-results.json` |
| Final frontend source and strict test-tree types | Both exit 0 | `frontend/.artifacts/build-review-20260909-frontend-source-final.log`, `build-review-20260909-frontend-test-types-final.log` |
| Backend source after generator repair | Exit 0 | `backend/.artifacts/build-review-final-contract/backend-typecheck.log` |
| Backend strict test-tree | Exit 0 | `backend/.artifacts/build-review-final-gates/test-typecheck.log` |
| Scope application / record reads | 153/153 scopes applied; 584 reads soft-delete guarded; both exit 0 | `backend/.artifacts/build-review-final-gates/` |
| Operation IDs / OpenAPI coverage | Both exit 0 | `backend/.artifacts/build-review-final-gates/` |
| Shared tenant-isolation coverage | Exit 1: KB reaper missing negative isolation test; 945/946 declared services | `backend/.artifacts/build-review-final-gates/tenant-isolation-coverage.log` |
| Migration ledger and discipline | Both exit 0 | `backend/.artifacts/build-review-final-static/` |
| Backend alias-aware import graph | 6,460 files; zero cycles/warnings; exit 0 | `final-backend-madge-tsconfig-cached.log` |
| Frontend import graph | 5,926 files; zero cycles; 20 external-import warnings; exit 0 | `final-frontend-madge-cached.log` |
| OpenAPI regression selection | 5 suites / 71 tests passed; exit 0 | Response metadata red/green run |
| Generated OpenAPI | 3,669 operations; zero undeclared exposures; every Zod schema converted; exit 0 | `backend/.artifacts/build-review-final-contract/openapi-generate.log` |

Short graph filenames are under `backend/.artifacts/build-review-20260909/`;
short consolidated filenames are under `backend/.artifacts/`.

Focused PostgreSQL controls also passed independently: activity 4, project summaries 4,
ticket producers 6, timesheet writes 3, timesheet cursor/isolation 9 and report cases 10.
The earlier hierarchy suite passed 42 and the earlier consolidated HTTP passed 365.
These do not replace the final committed consolidated results above.

The two committed contract documents have matching 177 Build paths, SHA-256
`4db164787f896862a35f887ceb8de167830acb83bb45e5c19f63fdd4758d5312`
over sorted Build path entries. Eight Build paths and five shared-generator
description corrections were staged explicitly. Full-document blobs differ because
unrelated contract work belongs to other sessions; this is scoped agreement, not
a clean whole-product release or global committed-artifact freshness claim.

## Compatibility and limits

- Legacy timesheet `page>1` now returns 400; callers must use cursors. No in-repository
  Build GET consumer was found. First-page totals/fields remain, and the ticket-specific
  response remains an array with continuation headers. This is an explicit API migration,
  not a claim of unchanged behavior for unidentified external clients.
- Retained timesheet total-count queries are O(matching history). Cursor traversal is
  bounded, but that does not make the entire response constant-cost.
- Velocity charts/pickers display the latest 100 sprints; historical API traversal uses
  continuation headers. Oversized exact reports produce actionable 422 responses.
- Rank normalization remains O(project size), although it is set-based with no N+1 loop.
- Source graph warnings, forced-exit behavior and test-environment limitations are
  disclosed rather than interpreted as production guarantees.

## Database safety and reproducibility

The original `scratch_local` was not migrated or overwritten. An isolated
`scratch_build_review_20260909` copy received migrations 1075–1079 after migration
hash-prefix checks. Earlier KB table/Chat column removals occurred only in the
disposable copy. Index 1079 was added when that copy contained 48 sprint rows.
No production database, infrastructure, provider account or credentials changed.

The runner enforces loopback/scratch names, matching owner/application servers,
distinct roles, stripped external integration configuration and current migration
head. Seeded application requests use the non-BYPASSRLS role. Unknown check names fail
before execution. Default HTTP execution enables database-dependent suites.

Mutable fixture ticket data is cleaned up. Audited test tenants can remain because
append-only audit rules forbid their cascade deletion; no audit trigger is bypassed.
HTTP tests explicitly force Jest exit and request heap collection between suites.
A passing HTTP run does not establish leak-free application/test teardown.

## Efficiency evidence

The counted bulk adapter compares 1 and 100 tickets. Status operations now use three
selects and three executes for the tested workflow, including lock/capacity checks;
the count does not grow per ticket. These are handler adapter counts, not the full
authentication/permission HTTP statement count.

The populated read-cost fixture contains 19,381 organization tickets and 1,382 project
tickets. The final application-role run measured 97 scoped-board blocks,
9 rank-board blocks and 578 My Work blocks against ceilings 5,000/2,000/30,000,
using the expected index-only access paths. Block counts vary with fixture/cache state;
these measurements do not establish production latency or concurrency capacity.

Earlier local HTTP samples were tickets 50.44–57.13ms, board counts 36.33–57.46ms,
and velocity 31.21–44.77ms. These nine observations are not p95/p99, a load test,
WAN/CDN performance, or website-loading measurements.

## Corrected failures

Red tests proved inverse hierarchy races, destructive optimistic rollback, missing
analytics invalidation, activity/project-summary scope leakage, stale warm summaries,
custom-completion errors, producer capacity bypasses, invalid destination failures,
write-contract 500s, missing cursor behavior, malformed-cursor 500s, oversized report
execution and dropped OpenAPI response metadata. Each has a corresponding green
control. A year-zero driver probe showed incorrect coercion, not a proven 500.

An unrelated in-progress KB edit temporarily failed the shared typecheck. Its owning
session corrected it; the later backend source gate passed. Earlier failing attempts
are not counted as successful verification.

## Remaining verification blocker

Browser sign-off is blocked: the Browser skill reported no available browser and
discovery returned an empty list. A connected, signed-in local Build page and URL
have been requested. Visual layout, responsive breakpoints, accessibility, cross-tab
freshness and browser loading/Web Vitals cannot be certified without that access.

The earlier shared tenant-isolation coverage failure for the KB reaper was closed
after the user approved the scope extension. The new PostgreSQL suite proves a
second tenant's stale sources remain unchanged, with both owner and non-bypass
application connections. No allowlist exception or production reaper change was
needed. The follow-up also records a repaired test-only Chat dependency and the
passing full runtime selection; this resolved gap is not retained in the backlog.

Production infrastructure and whole-product clean-release certification remain
separate from these code-level measurements. No confirmed repaired finding is copied
back into an implementation backlog, and no unmeasured acceptance is marked complete.
