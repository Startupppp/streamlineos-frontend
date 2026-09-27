# 68 — Two Build records stop misleading the next reader

**What to build:** Neither of the two documents that currently state falsehoods about Build authorization survives in that state.

The first is open question 11, which asserts that the Cycles navigation entry is still gated on the retired sprint permission, that the cycle entity card resolves through the same key, that no cycle permission key exists, and that renaming it would break every issued grant. All four are false: the rename shipped, the retired key appears nowhere in backend or frontend source, and a migration rewrote the existing grants — which is itself worth recording, because backfilling grants by migration is forbidden by name and that migration cannot replay on an empty database.

The second is the authorization census: the generated backend copy is canonical, but currently stale. Replacing the ungenerated root copy with a pointer prevents two copies drifting; it does not make the remaining artifact correct. Regenerate and pass its current-source checker before calling it verified.

**Blocked by:** None — can start immediately.

**Status:** partial — pointer consolidation and permission-key cleanup are present; current census and remaining records fail verification

**Audit 2026-09-27:** The live census checker failed with 139 stale anchors and found 54
controllers/343 handlers, while the saved census describes 49/325. Do not call the backend copy
current merely because it is the canonical generated path. `backend/CLAUDE.md:150` has no exception
pointer, and retired keys remain in `backend/test/build/build-workflow-fixtures.ts:10` and
`docs/specs/build/sidebar/04-access-lifecycle-prd.md:482`. Preserve clearly marked historical quotes.

- [x] Open question 11 is retired as answered, stating what shipped rather than being edited into a new question — OQ11 removed from `docs/build-module/99-open-questions.md` "Raised by the 2026-09-22 reconciliation" section (2026-09-27); a `[x]` checkbox added to the acceptance criteria stating what shipped: `frontend/lib/build/nav/build-project-catalog.ts:75` reads `"build:cycles:view"`; `backend/src/modules/build/entity/build-entity-reads.service.ts:38` reads `cycle: "build:cycles:view"`; `CyclesController` in `iterations.controller.ts` declares `@RequirePermission("build:cycles:view")` at lines 156 and 215 and `"build:cycles:manage"` at lines 169, 182 and 195; migration `1197_build_cycle_permissions.sql` rewrote all four grant tables. (OQ11's cited line 80 for the nav catalog was incorrect; the real line is 75.)
- [ ] The grant-rewriting migration's conflict with the no-backfill rule is recorded where a reader of that rule would find it, along with its replay limitation — `docs/build-module/MIGRATION-RUNBOOK.md` section "Migration 1197 — BE-111 conflict and replay limitation" added 2026-09-27: names the BE-111 conflict, explains why the exception was operationally necessary, and records that lines 6-11 of the migration `RAISE EXCEPTION` when the legacy keys are absent (making it non-replayable on an empty database). `backend/CLAUDE.md:150` is not in this lane's territory; the exact proposed addition is in the report below.
- [ ] Exactly one authorization census exists (the generated backend copy); the stale root copy at `docs/build-module/backend-docs/authorization-census.{md,json}` is replaced with a pointer that names the generated path (`backend/docs/build-module/authorization-census.{md,json}`) and the script (`backend/scripts/build-authorization-census.mjs`). The pointer explains why the root copy was replaced (stale sprint keys, moved line numbers, no generator writing here) and instructs a root-level searcher to use the backend copy. Chosen over making the generator write two copies, which doubles the thing that can drift.
- [x] No copy of the census names a permission key absent from source — the stale root copy named `build:sprints:view` (6 occurrences in the JSON, 5 in the MD) and is replaced; the backend copy has 0 occurrences of `build:sprints` and 9 of `build:cycles`, confirmed current.
- [ ] Any other Build record citing the retired sprint keys is corrected in the same pass — `docs/build-module/99-open-questions.md` OQ11 is removed; the root census is replaced; `docs/specs/build/` files (5 files, outside this lane's territory) and `backend/test/build/build-workflow-fixtures.ts:10` (inside territory boundary but reported in the report rather than edited) are noted.
