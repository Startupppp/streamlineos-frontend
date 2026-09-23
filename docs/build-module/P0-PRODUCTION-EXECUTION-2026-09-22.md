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

## Migrations 1149, 1150, 1151 — status as of 2026-09-22 (Agent 3 review)

### What each migration does

**1149 `change_requests_client_visible_release_id`** — additive only, not destructive.
Adds two columns to `build.change_requests`: `client_visible BOOLEAN NOT NULL DEFAULT FALSE` and `release_id INTEGER`. Creates two partial indexes (org+release, org+client_visible). Adds FK `fk_change_requests_org_release` referencing `build.project_releases(org_id, id)` with `ON DELETE SET NULL (release_id) NOT VALID`. No drops, no truncates.

**1150 `invoice_items_timesheet_entry_ref`** — additive only, not destructive.
Adds `timesheet_entry_id INTEGER` to `public.invoice_items` with FK `ON DELETE SET NULL` to `public.timesheets(id)`. Creates one partial index. No drops, no truncates.

**1151 `notifications_metadata_project_id_index`** — additive only, not destructive.
Creates one expression index `idx_notifications_metadata_project_id` on `public.notifications(org_id, membership_id, (metadata->>'projectId'))` where `deleted_at IS NULL AND archived_at IS NULL`. No schema changes.

### Journal registration

All three are registered in `migrations/meta/_journal.json`:
- idx 1033, when 1803000010450 — 1149
- idx 1034, when 1803000010460 — 1150
- idx 1035, when 1803000010470 — 1151

### Production application status — APPLIED, verified against the live ledger

Read 2026-09-22 over an IAM-token connection: **908 ledger rows against 908 journal entries,
watermark `1803000010470`, 0 pending.** 1149, 1150 and 1151 each match by file sha256 *and* by
`when`. All three are applied.

**A superseded reading is kept below, because the way it was wrong is the reusable part.**

> UNVERIFIED / NOT YET APPLIED. Prior P0 session recorded production watermark at `1803000010440`
> (idx 1032). All three migrations have `when` values above that watermark and therefore had NOT been
> applied at the time of the P0 run. Live ledger check attempted 2026-09-22: BLOCKED — `.env` absent,
> `DATABASE_URL` not set, failed closed. No retry attempted.

Two mistakes produced that conclusion:

1. **A stale watermark was treated as current.** `1803000010440` was true when the P0 session read
   it; migrations landed afterwards. A watermark is a timestamp, not a standing fact.
2. **A failed read was treated as a negative result.** The ledger could not be read, so it was
   recorded as "not applied". Those are different claims. The connection failed for reasons that had
   nothing to do with which migrations exist — first a missing `.env`, then
   `PAM authentication failed`, which is not a credential fault at all: Aurora is on IAM auth and
   `check:migration-chain` never mints a token.

The standing rule this earns: **never downgrade a migration to "unapplied" on the strength of a read
that failed.** Report it as unknown and fix the reader.
