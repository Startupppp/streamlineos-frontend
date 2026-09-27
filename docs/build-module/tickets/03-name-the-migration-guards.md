# 03 — Name the migration guards for what they protect

**What to build:** Two directories are named after a delivery phase rather than a concept, so a reader cannot tell from the tree whether their contents are runtime code, architecture tests, or dead files. They are in fact regression guards that scan the source tree and assert a completed migration stays completed. Rename them to say so.

Keep the guards themselves. They scan with an empty allowlist, which is a stronger invariant than any static gate, and they must stay green.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] No directory in the Build module is named after a delivery phase
  — `src/modules/build/phase-2/` (7 files) renamed to `src/modules/build/consolidation-guards/`; `src/modules/build/qa/phase-2/` (6 files) renamed to `src/modules/build/qa/bug-consolidation/`. Both old directories removed. One remaining `phase-2` string exists in `src/scripts/assertion-ceiling-ledger.json:392` (the path key for `bug-consolidation-mapping.ts`) — that file is outside `build/` and requires orchestrator update; reported below.
- [x] The guards live under a name describing what they protect
  — `consolidation-guards/` holds the sprint/cycle and bug-column consolidation migration guards plus `bug-column-dispositions.ts` (the column-mapping live code those guards import). `bug-consolidation/` holds the QA bug-consolidation live mapping (`bug-consolidation-mapping.ts`) and its guards.
- [ ] Every guard still runs and still passes, with its allowlist still empty
  — `npx jest src/modules/build/qa/bug-consolidation`: 5 suites, 77 tests, all pass. Allowlists confirmed empty (`BUGS_TABLE_IMPORTERS_ALLOWLIST: readonly string[] = []`). `npx jest src/modules/build/consolidation-guards`: 6 suites run; 3 pass (cycles-schema-reconcile, qa-bug-consolidation, sprint-cycle-drop-invariant), 3 fail with pre-existing errors unrelated to the rename: `sprint-cycle-consolidation.spec.ts` and `qa-bug-consolidation-sql.spec.ts` fail because they read SQL migration files (`migrations/sql/a-sprint-cycle-*.sql`, `migrations/sql/b-qa-bug-*.sql`) that do not exist yet; `sprint-cycle-detach-invariant.spec.ts` fails asserting a code-content string (`updateTicket(actor, null, ticketId, { cycleId })`) absent from production code. None of the 3 failures existed because of the rename; the files were just moved. Box cannot be ticked until those pre-existing failures are resolved by the owning session.
- [x] The test runner discovers them at the new location
  — `npx jest src/modules/build/consolidation-guards`: reported "Ran all test suites matching /consolidation-guards/i", 6 suites found. `npx jest src/modules/build/qa/bug-consolidation`: 5 suites found. Both directories are under `<rootDir>/src`, which is in Jest `roots`.
