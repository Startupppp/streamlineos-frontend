# P0 production execution evidence

Date: 2026-09-22
Target: Aurora PostgreSQL 18.4, cluster `streamlineos`
Authorization: the repository owner explicitly authorized production execution because the product has no customers.

## Recovery point

Manual cluster snapshot `streamlineos-pre-build-p0-20260922085750` reached `available` before any DDL ran.

## Sprint and Cycle

The expand, backfill, and constraint phases ran first in a transaction that was deliberately rolled back.
The identical transaction then committed.

| Proof | Result |
|---|---|
| Legacy sprints | 4 |
| Migration-map rows | 4 |
| Cycles carrying `legacy_sprint_id` | 4 |
| Unmapped sprints | 0 |
| Scope events with null `cycle_id` | 0 |
| Validated cycle foreign keys | 3 |

The detach and legacy-table drop phases did not run. Their SQL requires the application to be deployed with
Cycle as the only identity first. The current code still contains deliberate dual-identity tripwires.

## QA Bug

The expand and backfill phases committed. Production currently contains zero legacy `build.bugs` rows.
The verifier returned zero for all 14 parity and integrity checks.

The write freeze and destructive contract drop did not run. Their SQL requires the application cutover first.

## Composite SET NULL

The initial live catalog gate found eight additional unsafe composite foreign keys that were hidden by the
reconciled migration ledger. Migrations `1143_repair_build_composite_set_null` and
`1144_repair_inventory_composite_set_null` were authored, rehearsed, applied, and recorded.

| Proof | Result |
|---|---|
| Migration ledger | 905 rows |
| Catalog `SET NULL` foreign keys inspected | 814 |
| Keys that would null a NOT NULL column | 0 |
| Declared composite keys requiring a column list | 286 |
| Migration-text bare keys | 0 |
| Migration-text drift/new/untraceable keys | 0 |

Migrations 1141 and 1142 also passed live postconditions: `projects.pm_workspace_id` is nullable, the
headcount constraint is validated and nulls only `headcount_id`, and no rollback scaffolding remains.

## Verification

- Backend typecheck: PASS.
- Focused Phase 2 tests: 7 suites, 386 tests, all PASS.
- Migration discipline: PASS, 905 files.
- Migration rollback coverage: PASS, 905 files.
- Migration immutability: PASS.
- Live migration-chain watermark check: PASS at `1803000010440`.
- QA SQL verifier: 14/14 zero checks PASS.
- Live composite catalog gates: PASS, zero violations.

## Acceptance criteria

- [x] Recovery snapshot exists before DDL.
- [x] Sprint/Cycle expand, backfill, and constraints committed atomically.
- [x] Every legacy sprint has one canonical cycle mapping.
- [x] QA sidecar and identity-map foundation exists.
- [x] QA parity verifier reports zero defects.
- [x] All unsafe composite `SET NULL` keys are repaired in the live catalog.
- [x] Repairs are journalled with rollback files.
- [ ] Application uses Cycle as its only sprint identity.
- [ ] Sprint detach/drop phases execute after application cutover.
- [ ] Application uses work-item QA as its only bug identity.
- [ ] QA freeze/drop phases execute after application cutover and rollback window.
