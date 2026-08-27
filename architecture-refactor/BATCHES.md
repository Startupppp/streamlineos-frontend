# Batches — how the remaining tickets partition

Two agents may not touch the same file. A batch is a set of lanes with **disjoint territory**, so its lanes can run at once; two batches may run in two sessions only if their territories are also disjoint.

Migration numbers are allocated per lane and never shared — one writer per number.

**Orchestrator-owned, never edited by a lane:** `backend/src/db/schema/index.ts` · `backend/src/app.module.ts` · `backend/migrations/meta/_journal.json` · `backend/src/modules/rbac/permissions/index.ts` · `frontend/lib/rbac/permissions/index.ts`. A lane reports the line it needs; the orchestrator writes it. A missing export is a compile error, so this cannot land inert.

## Batch A — running now

| Lane | Tickets | Territory | Migrations |
|---|---|---|---|
| A1 | c12 01–03 | `modules/search/**` | 0499 |
| A2 | c16 02, 03, 07, 08 | `modules/calendar/**`, calendar schema | 0500, 0501 |
| A3 | c17 06–07, c26 06 | `modules/billing/**`, `modules/platform/**` | 0502 |
| A4 | c24 01–04 | `frontend/**` except `hooks/` and `lib/api/` | — |
| A5 | c10 01–05 | `modules/rbac/**` | 0503 |
| A6 | c21 01, 03, 06 | `modules/notifications/**`, `modules/mail/**`, `frontend/hooks/`, `frontend/lib/api/` | 0504 |

22 tickets. Five module verticals plus one frontend horizontal.

## Batch B — disjoint from A, safe to start in a second session now

| Lane | Tickets | Territory | Migrations |
|---|---|---|---|
| B1 | c27 01–05 | `modules/kb/**`, kb schema | 0510, 0511 |
| B2 | c19 01–05 | `common/cache/**`, `modules/accounting/**` | 0512 |
| B3 | c15 03–06 | `modules/storage/**`, `common/security/**`, `common/tenant/**` | — |
| B4 | c11 01–03 | `backend/scripts/**`, CI config | — |
| B5 | c14 01, 03 + c22 01 | `modules/hr/**` accrual, `modules/cron/**` | 0513 |
| B6 | c20 04–05 + c25 03 | `common/observability/**`, `common/auth/**` | — |

23 tickets. B3 and B6 both sit under `common/` — different subdirectories, but they are the one pair worth watching.

## Batch C — blocked until A and B commit

Each overlaps A or B territory, or needs schema that exists only as an unapplied `.sql`.

| Tickets | Blocked on |
|---|---|
| c26 01–05 | A3's c26-06 |
| c13 01–06 | A6 (`mail/`), and it spans build · finance · chat |
| c16 01, 04, 05, 06, 09 | B5 (`hr/`); c16-01 also needs 0487/0488 applied |
| c21 02, 04, 05, 07 | A6; partitioning needs the database migrated |
| c25 01, 02, 04 | a booted API and a live database to count against |

## The two that must run alone

**c18 — removals are proved** and **c23 — tenant extensibility** both move or delete files across the whole tree. No lane can run beside them. c23-05 splits the shared schema file by domain, which touches every schema importer at once — sequence it expand–contract, not as a vertical slice.

## The standing gate

**Nothing has touched the database.** Migrations 0473–0498 are written and journalled but unapplied, and 0478 / 0482 / 0488 are deliberately un-journalled DROPs to be applied by hand. Until the operator runs `architecture-refactor/APPLY-MIGRATIONS.md`, any ticket whose proof requires querying the result is unfinishable — it can be written, not verified.
