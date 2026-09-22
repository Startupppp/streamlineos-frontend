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
| Full authenticated route workflow | BLOCKED | No reachable non-production PostgreSQL 15+ and no disposable seeded tenant |

The machine has no configured `DATABASE_URL` or `SET_NULL_GATE_DATABASE_URL`, and neither Docker nor a
local `psql` installation is available. The repository documents that `backend/.env` and
`backend/.env.production` target production. Those files were not used and no production database was
contacted.

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
| #6 Sprint/Cycle consolidation | DESIGN_COMPLETE; focused static suites pass | Replay, backfill, row-count proof and rollback on disposable PostgreSQL 15+ |
| #7 QA Bug consolidation | DESIGN_COMPLETE; focused static suites pass | Replay, backfill, row-count proof and rollback on disposable PostgreSQL 15+ |
| #8 composite `SET NULL` | STATIC_GAP_CLOSED; text and self-test gates pass | Live `pg_constraint.confdelsetcols` proof using `SET_NULL_GATE_DATABASE_URL` |
| Migrations 1141/1142 | Applied according to `PHASE-2-DATA-FOUNDATION-FINAL.md`; local journal is 903 entries | Independent live re-read remains prohibited without a non-production database |

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
- [x] No production database was contacted.
- [ ] Authenticated and data-dependent workflows pass against a disposable seeded stack.
- [ ] P0 #6, #7 and #8 database proofs pass on PostgreSQL 15+.
