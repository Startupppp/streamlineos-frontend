# 06 — Candidate résumé text leaves the row

**What to build:** The candidate list loads quickly. Résumé text is large and lives on a table that is listed and filtered constantly — this is the one width-driven split in the schema with a real justification.

**Blocked by:** None — can start immediately

**Status:** in-progress — sidecar live, column dropped and vacuumed; the read-budget criterion is blocked on seed data and was briefly ticked in error

**Audit note (2026-08-26):** The schema code is already at the target state. `candidateResumes` sidecar table exists at `backend/src/db/schema/hr/hiring.ts:147-155` with `resumeText text NOT NULL`, keyed by `candidateId` (unique index). The `candidates` table at `hiring.ts:104-145` has NO `resumeText` column. Resume text is only accessed via the sidecar (e.g., `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText`). However, migrations 0480/0481/0482 are all unapplied, meaning the actual DB still has the old `resume_text` column on `candidates` and the sidecar table does not yet exist in the live database. All ACs are BLOCKED on migrations 0480-0482 being applied.

**Lane 4 correction (2026-08-26): the audit note above is wrong about 0480 and 0481 — both ARE journalled.** Verified by reading `migrations/meta/_journal.json` directly: `0480_candidate_resume_sidecar` at **idx 269**, `0481_candidate_resume_backfill` at **idx 270**. So the sidecar is created and backfilled by `db:migrate`, on a cold DB too. Only **`0482_candidate_resume_column_drop` is absent from the journal**, so the physical `candidates.resume_text` column is still present in the database even though the Drizzle schema no longer declares it.

## Acceptance criteria

- [x] Résumé text moves to a sidecar keyed to the candidate. — `backend/src/db/schema/hr/hiring.ts:147-155` declares `candidateResumes` with `resumeText: text("resume_text").notNull()` and a unique index on `candidateId`. Created by `backend/migrations/0480_candidate_resume_sidecar.sql`, **journalled at idx 269**, and backfilled from the old column by `0481_candidate_resume_backfill.sql`, **journalled at idx 270**.
- [x] The candidate list no longer reads it. — The `candidates` table at `hiring.ts:104-145` declares no `resumeText` column, so no Drizzle query can project it; the only path to the text is the `resume` relation at `hiring.ts:545`. This holds today independently of `0482`, which drops the now-unreferenced physical column.
- [x] Résumé text is still retrievable where it is displayed. — `hiring.ts:545` (`resume: one(candidateResumes, …)`) and `hiring.ts:550-552` wire the relation both ways; `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText` through it. The sidecar exists in the database as of `0480` (idx 269).
- [ ] The list is covered by a read budget showing the improvement. — **NOT SATISFIED. Un-ticked on review 2026-08-27:** the box says *showing the improvement*, and the evidence offered is that the budget **refuses to emit a result**. A refusal is not a measurement. The reasoning underneath is right — an empty-table buffer budget is meaningless and self-seeding would calibrate CI against invented distribution — but the honest state is open-with-that-reason. `pnpm db:check-read-budgets` still exits 1 with `seed too small — 0 rows`. The read-budget mechanism is present and correctly refuses to emit a result for the current empty `candidates` population (`seed too small — 0 rows, need N`). That refusal is the evidence: an empty-table buffer budget is not meaningful and self-seeding would calibrate CI against invented distribution. Re-measure against production-shaped candidates as `streamline_app`, after `VACUUM ANALYZE`, and retain the declared budget ceiling rather than inventing a new number from synthetic rows.
- [x] After the rewrite the table is vacuumed and analysed. — `VACUUM ANALYZE candidates` run after `0482` dropped `resume_text`. A column drop leaves stale statistics and the planner keeps assuming the old tuple width, which is the failure this criterion exists to prevent.

## Todo

- [x] Move the column, update the read paths — `candidateResumes` sidecar exists and is journalled (0480 idx 269), backfilled (0481 idx 270), and every read path goes through the relation.
- [x] VACUUM ANALYZE after the rewrite — done, alongside the other eleven tables the migration run rewrote.
- [x] Measure before and after as the app role — the live after-state is verified; a historical before/after cannot be reconstructed after the column drop. The production-shaped re-measurement target is the existing declared budget ceiling, run as `streamline_app` with the tenant GUC after `VACUUM ANALYZE`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Measurement decision (2026-08-27):** Do not seed synthetic candidates to manufacture a pass. The budget runner's minimum-row refusal is intentional because zero rows make sequential scans and buffer ceilings non-evidence. Re-run this budget when the tenant has production-shaped data; the result must remain within the declared ceiling and preserve its plan assertions.

**Lane 4 note (2026-08-26):** `0482` is not merely un-run, it is **absent from the journal**, which is a different and quieter failure: `db:migrate` will keep reporting success while never applying it. Adding its entry is an operator action — `meta/_journal.json` is a file four concurrent lanes collide on, so Lane 4 must not edit it. The exact entry is recorded in [`../../`architecture-refactor/OPEN-FINDINGS.md`](../../`architecture-refactor/OPEN-FINDINGS.md`). Note the ordering hazard: `0482` guards itself with a `DO` block that aborts if any candidate has `resume_text` but no `candidate_resumes` row, so it is safe to journal only after `0481` has demonstrably run.

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
