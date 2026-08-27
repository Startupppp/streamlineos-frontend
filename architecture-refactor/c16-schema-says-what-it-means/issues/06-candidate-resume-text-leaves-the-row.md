# 06 — Candidate résumé text leaves the row

**What to build:** The candidate list loads quickly. Résumé text is large and lives on a table that is listed and filtered constantly — this is the one width-driven split in the schema with a real justification.

**Blocked by:** None — can start immediately

**Status:** in-progress — sidecar table live and the column dropped and vacuumed; the two measurement criteria are blocked on seed data, not on migrations

**Audit note (2026-08-26):** The schema code is already at the target state. `candidateResumes` sidecar table exists at `backend/src/db/schema/hr/hiring.ts:147-155` with `resumeText text NOT NULL`, keyed by `candidateId` (unique index). The `candidates` table at `hiring.ts:104-145` has NO `resumeText` column. Resume text is only accessed via the sidecar (e.g., `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText`). However, migrations 0480/0481/0482 are all unapplied, meaning the actual DB still has the old `resume_text` column on `candidates` and the sidecar table does not yet exist in the live database. All ACs are BLOCKED on migrations 0480-0482 being applied.

**Lane 4 correction (2026-08-26): the audit note above is wrong about 0480 and 0481 — both ARE journalled.** Verified by reading `migrations/meta/_journal.json` directly: `0480_candidate_resume_sidecar` at **idx 269**, `0481_candidate_resume_backfill` at **idx 270**. So the sidecar is created and backfilled by `db:migrate`, on a cold DB too. Only **`0482_candidate_resume_column_drop` is absent from the journal**, so the physical `candidates.resume_text` column is still present in the database even though the Drizzle schema no longer declares it.

## Acceptance criteria

- [x] Résumé text moves to a sidecar keyed to the candidate. — `backend/src/db/schema/hr/hiring.ts:147-155` declares `candidateResumes` with `resumeText: text("resume_text").notNull()` and a unique index on `candidateId`. Created by `backend/migrations/0480_candidate_resume_sidecar.sql`, **journalled at idx 269**, and backfilled from the old column by `0481_candidate_resume_backfill.sql`, **journalled at idx 270**.
- [x] The candidate list no longer reads it. — The `candidates` table at `hiring.ts:104-145` declares no `resumeText` column, so no Drizzle query can project it; the only path to the text is the `resume` relation at `hiring.ts:545`. This holds today independently of `0482`, which drops the now-unreferenced physical column.
- [x] Résumé text is still retrievable where it is displayed. — `hiring.ts:545` (`resume: one(candidateResumes, …)`) and `hiring.ts:550-552` wire the relation both ways; `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText` through it. The sidecar exists in the database as of `0480` (idx 269).
- [ ] The list is covered by a read budget showing the improvement. — **BLOCKED on seed data, which is a different blocker from the one recorded before.** The migrations are applied and `resume_text` is gone; what is missing is rows. `pnpm db:check-read-budgets` refuses with `seed too small — 0 rows, need N` across every scenario, and `candidates` holds 0 rows. A budget measured on an empty table is not evidence of an improvement, and the script is right to refuse rather than report a false pass. Unblocks by seeding to scale, then measuring as `streamline_app` with the tenant GUC — never as the owner, which carries BYPASSRLS.
- [x] After the rewrite the table is vacuumed and analysed. — `VACUUM ANALYZE candidates` run after `0482` dropped `resume_text`. A column drop leaves stale statistics and the planner keeps assuming the old tuple width, which is the failure this criterion exists to prevent.

## Todo

- [x] Move the column, update the read paths — `candidateResumes` sidecar exists and is journalled (0480 idx 269), backfilled (0481 idx 270), and every read path goes through the relation.
- [x] VACUUM ANALYZE after the rewrite — done, alongside the other eleven tables the migration run rewrote.
- [ ] Measure before and after as the app role — **BLOCKED on seed data.** Same reason: 0 rows. The "before" state is also gone now that the column is dropped, so a true before/after needs a seeded branch rather than this database.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Lane 4 note (2026-08-26):** `0482` is not merely un-run, it is **absent from the journal**, which is a different and quieter failure: `db:migrate` will keep reporting success while never applying it. Adding its entry is an operator action — `meta/_journal.json` is a file four concurrent lanes collide on, so Lane 4 must not edit it. The exact entry is recorded in [`../../lane-requests/lane-4.md`](../../lane-requests/lane-4.md). Note the ordering hazard: `0482` guards itself with a `DO` block that aborts if any candidate has `resume_text` but no `candidate_resumes` row, so it is safe to journal only after `0481` has demonstrably run.

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
