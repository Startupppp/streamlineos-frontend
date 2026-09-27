# 03 — Name the migration guards for what they protect

**What to build:** Two directories are named after a delivery phase rather than a concept, so a reader cannot tell from the tree whether their contents are runtime code, architecture tests, or dead files. They are in fact regression guards that scan the source tree and assert a completed migration stays completed. Rename them to say so.

Keep the guards themselves. They scan with an empty allowlist, which is a stronger invariant than any static gate, and they must stay green.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] No directory in the Build module is named after a delivery phase
  — `src/modules/build/phase-2/` (7 files) renamed to `src/modules/build/consolidation-guards/`; `src/modules/build/qa/phase-2/` (6 files) renamed to `src/modules/build/qa/bug-consolidation/`. Both old directories removed. One remaining `phase-2` string exists in `src/scripts/assertion-ceiling-ledger.json:392` (the path key for `bug-consolidation-mapping.ts`) — that file is outside `build/` and requires orchestrator update; reported below.
- [x] The guards live under a name describing what they protect
  — `consolidation-guards/` holds the sprint/cycle and bug-column consolidation migration guards plus `bug-column-dispositions.ts` (the column-mapping live code those guards import). `bug-consolidation/` holds the QA bug-consolidation live mapping (`bug-consolidation-mapping.ts`) and its guards.
- [x] Every guard still runs and still passes, with its allowlist still empty
  — `npx jest src/modules/build/consolidation-guards`: 6 suites, 167 tests, all pass. `npx jest src/modules/build/qa/bug-consolidation`: 5 suites, 77 tests, all pass. All allowlists confirmed empty: `KNOWN_REMAINING`, `KNOWN_COLUMN_SELECT_REMAINING`, `KNOWN_WRITE_REMAINING`, `KNOWN_SPRINTS_TABLE_REMAINING` (all `readonly string[] = []` in `sprint-cycle-detach-invariant.spec.ts`); `BUGS_TABLE_IMPORTERS_ALLOWLIST: readonly string[] = []` in `legacy-bug-writer-unreachable.spec.ts`. `sprint-cycle-consolidation.spec.ts` repointed from retired `migrations/sql/a-sprint-cycle-*.sql` to journalled `1396_build_sprint_cycle_chain_repair.sql` and `1394_build_cycle_scope_events_rename.sql` (plus their rollbacks). `qa-bug-consolidation-sql.spec.ts` repointed from retired `migrations/sql/b-qa-bug-01-expand.sql` to journalled `1393_build_qa_bug_tables.sql` (plus rollback).

  **The repointing was not free, and the box's "every guard" should be read as every *surviving* guard.** Measured against the pre-repair copies: `sprint-cycle-consolidation.spec.ts` lost 4 `describe` groups and 33 test declarations, gaining 11; `qa-bug-consolidation-sql.spec.ts` lost 3 groups and 23, gaining 8. Seven groups and a net 37 declarations were retired, in every case because the file the group read no longer exists — `migrations/sql/` is deleted, which was verified rather than assumed.

  **One retirement is a permanent loss of verifiability and is recorded rather than absorbed.** Three of the seven groups asserted that the sprint→cycle status mapping was total and deterministic and that the backfill was re-runnable and row-order independent. No journalled migration contains that mapping: `grep` across all of `migrations/*.sql` finds one status `CASE` and it belongs to `0349_retire_legacy_org_tables.sql`, mapping branch status, not sprints. The mapping only ever existed in the off-journal files, it has already run against production, and it is now unassertable from the repository. This is the same defect class as the one `1396` was written to fix — production state produced by SQL that the chain never contained — and it is why `1396` carries the rename structurally instead of re-deriving the data.
  — `npx jest src/modules/build/consolidation-guards`: reported "Ran all test suites matching /consolidation-guards/i", 6 suites found. `npx jest src/modules/build/qa/bug-consolidation`: 5 suites found. Both directories are under `<rootDir>/src`, which is in Jest `roots`.
