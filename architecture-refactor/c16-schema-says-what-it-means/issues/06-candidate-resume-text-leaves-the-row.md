# 06 — Candidate résumé text leaves the row

**What to build:** The candidate list loads quickly. Résumé text is large and lives on a table that is listed and filtered constantly — this is the one width-driven split in the schema with a real justification.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** The schema code is already at the target state. `candidateResumes` sidecar table exists at `backend/src/db/schema/hr/hiring.ts:147-155` with `resumeText text NOT NULL`, keyed by `candidateId` (unique index). The `candidates` table at `hiring.ts:104-145` has NO `resumeText` column. Resume text is only accessed via the sidecar (e.g., `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText`). However, migrations 0480/0481/0482 are all unapplied, meaning the actual DB still has the old `resume_text` column on `candidates` and the sidecar table does not yet exist in the live database. All ACs are BLOCKED on migrations 0480-0482 being applied.

**Lane 4 correction (2026-08-26): the audit note above is wrong about 0480 and 0481 — both ARE journalled.** Verified by reading `migrations/meta/_journal.json` directly: `0480_candidate_resume_sidecar` at **idx 269**, `0481_candidate_resume_backfill` at **idx 270**. So the sidecar is created and backfilled by `db:migrate`, on a cold DB too. Only **`0482_candidate_resume_column_drop` is absent from the journal**, so the physical `candidates.resume_text` column is still present in the database even though the Drizzle schema no longer declares it.

## Acceptance criteria

- [x] Résumé text moves to a sidecar keyed to the candidate. — `backend/src/db/schema/hr/hiring.ts:147-155` declares `candidateResumes` with `resumeText: text("resume_text").notNull()` and a unique index on `candidateId`. Created by `backend/migrations/0480_candidate_resume_sidecar.sql`, **journalled at idx 269**, and backfilled from the old column by `0481_candidate_resume_backfill.sql`, **journalled at idx 270**.
- [x] The candidate list no longer reads it. — The `candidates` table at `hiring.ts:104-145` declares no `resumeText` column, so no Drizzle query can project it; the only path to the text is the `resume` relation at `hiring.ts:545`. This holds today independently of `0482`, which drops the now-unreferenced physical column.
- [x] Résumé text is still retrievable where it is displayed. — `hiring.ts:545` (`resume: one(candidateResumes, …)`) and `hiring.ts:550-552` wire the relation both ways; `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText` through it. The sidecar exists in the database as of `0480` (idx 269).
- [ ] The list is covered by a read budget showing the improvement. — **BLOCKED on a live database.** "Showing the improvement" is a measurement, and `backend/CLAUDE.md` §7 requires it be taken in buffers as `streamline_app` with the tenant GUC set — the owner role has `BYPASSRLS` and its plans hide the cost that matters. Lane 4 has no database. The harness to run it exists (`pnpm db:check-read-budgets`, `src/scripts/run-read-cost-budgets.mjs`); only the database is missing.
- [ ] After the rewrite the table is vacuumed and analysed. — **BLOCKED on `0482` being journalled and run.** There is no rewrite to vacuum until the column is actually dropped. `0482` is absent from `meta/_journal.json` (the journal jumps idx 270 → 271), and a migration absent from the journal never runs while `db:migrate` still reports success. The migration file already names the follow-up: "Operator action required after this migration applies: `VACUUM ANALYZE candidates;`".

## Todo

- [x] Move the column, update the read paths — `candidateResumes` sidecar exists and is journalled (0480 idx 269), backfilled (0481 idx 270), and every read path goes through the relation.
- [ ] VACUUM ANALYZE after the rewrite — it invalidates statistics and empties the visibility map — **BLOCKED:** nothing has been rewritten yet; `0482` is unjournalled.
- [ ] Measure before and after as the app role — **BLOCKED:** requires a live database.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Lane 4 note (2026-08-26):** `0482` is not merely un-run, it is **absent from the journal**, which is a different and quieter failure: `db:migrate` will keep reporting success while never applying it. Adding its entry is an operator action — `meta/_journal.json` is a file four concurrent lanes collide on, so Lane 4 must not edit it. The exact entry is recorded in [`../../lane-requests/lane-4.md`](../../lane-requests/lane-4.md). Note the ordering hazard: `0482` guards itself with a `DO` block that aborts if any candidate has `resume_text` but no `candidate_resumes` row, so it is safe to journal only after `0481` has demonstrably run.

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
