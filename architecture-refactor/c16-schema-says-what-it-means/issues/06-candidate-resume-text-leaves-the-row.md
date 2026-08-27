# 06 — Candidate résumé text leaves the row

**What to build:** The candidate list loads quickly. Résumé text is large and lives on a table that is listed and filtered constantly — this is the one width-driven split in the schema with a real justification.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** The schema code is already at the target state. `candidateResumes` sidecar table exists at `backend/src/db/schema/hr/hiring.ts:147-155` with `resumeText text NOT NULL`, keyed by `candidateId` (unique index). The `candidates` table at `hiring.ts:104-145` has NO `resumeText` column. Resume text is only accessed via the sidecar (e.g., `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText`). However, migrations 0480/0481/0482 are all unapplied, meaning the actual DB still has the old `resume_text` column on `candidates` and the sidecar table does not yet exist in the live database. All ACs are BLOCKED on migrations 0480-0482 being applied.

## Acceptance criteria

- [x] ~~Résumé text moves to a sidecar keyed to the candidate.~~ **Schema code complete:** `candidateResumes` at `hiring.ts:147-155` is the sidecar; migration 0480 creates it. — **BLOCKED in DB:** migration 0480 unapplied.
- [x] ~~The candidate list no longer reads it.~~ **Schema code complete:** `candidates` table has no `resumeText` column in Drizzle schema. — **BLOCKED in DB:** migration 0482 (column drop) unapplied.
- [x] ~~Résumé text is still retrievable where it is displayed.~~ **Schema code complete:** `recruitment-candidate-ai.service.ts:78-79` reads `candidate.resume?.resumeText` via the sidecar join. — **BLOCKED in DB:** sidecar does not exist until 0480 applies.
- [ ] The list is covered by a read budget showing the improvement. — **BLOCKED:** requires a live database with real data to EXPLAIN as `streamline_app`; no DB access in this program.
- [ ] After the rewrite the table is vacuumed and analysed. — **BLOCKED:** requires a live database; no DB access in this program.

## Todo

- [x] ~~Move the column, update the read paths~~ **Schema code done:** `candidateResumes` sidecar exists, `candidates` schema has no `resumeText`; migrations 0480-0482 written. — **BLOCKED in DB:** those migrations are unapplied.
- [ ] VACUUM ANALYZE after the rewrite — it invalidates statistics and empties the visibility map — **BLOCKED:** requires a live database.
- [ ] Measure before and after as the app role — **BLOCKED:** requires a live database.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
