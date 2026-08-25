# 06 — Candidate résumé text leaves the row

**What to build:** The candidate list loads quickly. Résumé text is large and lives on a table that is listed and filtered constantly — this is the one width-driven split in the schema with a real justification.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Résumé text moves to a sidecar keyed to the candidate.
- [ ] The candidate list no longer reads it.
- [ ] Résumé text is still retrievable where it is displayed.
- [ ] The list is covered by a read budget showing the improvement.
- [ ] After the rewrite the table is vacuumed and analysed.

## Todo

- [ ] Move the column, update the read paths
- [ ] VACUUM ANALYZE after the rewrite — it invalidates statistics and empties the visibility map
- [ ] Measure before and after as the app role
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
