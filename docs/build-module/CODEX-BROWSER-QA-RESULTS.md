# Codex browser verification results

Captured: 2026-09-22

## Result

The safe component-level browser pass is complete. The harness bundled the real components with the
compiled Tailwind CSS and drove system Chrome through CDP at 375 x 812 and 1440 x 900.

| Check | Result | Evidence |
|---|---|---|
| Bundle | PASS | 11/11 surfaces built |
| Horizontal overflow | PASS | 22/22 viewport cells |
| Keyboard focus | PASS | 22/22 viewport cells; the critical-path summary is intentionally non-interactive and has zero keyboard or mouse-only controls |
| SVG/chart paint | PASS | Velocity, burnup, CFD, cycle-time and lead-time charts paint at both widths |
| Public illustration assets | PASS | Client-access empty-state illustration loaded from `frontend/public/illustrations/empty-clients.svg` |
| Browser harness self-test | PASS | 7/7 |
| Authenticated production smoke workflow | PASS | Logged-in Build QA Sandbox exercised on production; details below |

Production database execution was later explicitly authorized by the repository owner. IAM authentication
was used against Aurora PostgreSQL 18.4 after a manual snapshot reached `available`. See
`P0-PRODUCTION-EXECUTION-2026-09-22.md` for the database evidence. Authenticated browser workflows remain
separate from the completed component-level browser matrix below.

## Authenticated production pass

Executed 2026-09-22 against `https://www.streamlineos.in` after the Build frontend deployment for
`c3f5f81e` completed. The later unrelated frontend `main` deployment for `53fc518f` was cancelled in
Vercel; this pass therefore proves the deployed Build revision, not every newer commit on `main`.

| Surface | Result | Browser evidence |
|---|---|---|
| Command center and navigation | PASS | Authenticated data rendered; Products points to `/build/managed-products`; command palette opened with `Ctrl+K` |
| Projects and managed products | PASS | Project table rendered two projects; managed-products empty state and creation entry point rendered |
| Workspace canonicalization | PASS | `/build/pm-workspaces` redirected to `/build/workspaces`; the canonical workspace table rendered |
| Removed access wrapper | PASS | `/build/access` redirected to `/build/settings/access` |
| Cycles | PASS | `/build/6/cycles` rendered migrated cycle `QA Sprint 01`; `/build/6/cycles/9` rendered its detail; Create Cycle sheet opened without submission |
| Backlog | PASS | 22 seeded tickets loaded after the skeleton state |
| Files | PASS | Dedicated Files heading, empty state, illustration, and upload entry point rendered |
| Analytics | PASS | Summary statistics and state, priority, volume, and velocity charts painted; the horizontal summary group is keyboard focusable |
| QA | PASS | Test Cases and Test Runs loaded; New Test Case sheet opened without submission |
| Other disputed routes | PASS | My Work, Templates, Intake, All Work, Roadmap, and Workload rendered their intended surfaces |
| Browser console | PASS with warning | No application errors; `feedbucket-widget.js` emitted a repeated missing dialog description warning |

No records were created, edited, or deleted during this pass. The active `/build/6/bugs` page confirms
that the planned Bug-to-work-item application cutover is still pending; it is not counted as complete by
this browser result. Production API health and readiness both returned HTTP 200 with database and cache up.

## Covered surfaces

- Client visibility
- Portal list
- Change requests
- Client access
- Feedbucket
- Velocity chart
- Burnup chart
- Cumulative-flow chart
- Cycle-time chart
- Lead-time chart
- Critical-path summary

Each surface was checked at both configured widths. The machine-readable measurements, generated report,
and screenshots are in `docs/build-module/phase-4-browser-evidence/`.

## P0 reconciliation

| P0 item | Current result | Remaining requirement |
|---|---|---|
| #6 Sprint/Cycle consolidation | DATABASE_EXPAND_COMPLETE; 4/4 mappings and constraints verified | Application cutover, then detach/drop |
| #7 QA Bug consolidation | DATABASE_EXPAND_COMPLETE; 14/14 verifier checks pass with zero legacy bug rows | Application cutover, then freeze/drop |
| #8 composite `SET NULL` | DONE; 814 live constraints inspected, zero unsafe keys | None |
| Migrations 1141/1142/1143/1144 | Live postconditions pass; production ledger is 905 entries | None |

The focused Phase 2 run completed 7 suites and 386 tests with no failures. The migration-text report
resolved all 286 keys that require a `SET NULL` column list with zero drift, new, or untraceable keys.
These static results do not replace database execution evidence.

## Branch audit

- Root repository: every local branch tip is contained in `main`.
- Backend repository: `codex/c1-c7-fixes` is not an ancestor of `main`, but both commits are already
  patch-equivalent in `main` (`git cherry main codex/c1-c7-fixes` reports `-` for both). It was not merged
  again because that would duplicate landed changes.
- Unmerged remote branches are unrelated HRMS, CRM, accounting, waitlist, and maintenance branches. They
  were not merged into this Build-module change.

## Acceptance criteria

- [x] Browser harness serves the public illustration used by the client-access empty state.
- [x] All 11 covered surfaces render at mobile and desktop widths.
- [x] No covered surface has horizontal overflow.
- [x] Focus order has no positive-tabindex, zero-size, or mouse-only defects.
- [x] Covered SVG charts have non-zero painted bounds.
- [x] Screenshots and measurements are retained as evidence.
- [x] Production execution had explicit owner authorization and a pre-change snapshot.
- [x] Authenticated and data-dependent browser smoke workflows pass against the seeded Build QA Sandbox.
- [x] P0 #6 and #7 database expand/backfill proofs pass.
- [x] P0 #8 live catalog proof passes.
