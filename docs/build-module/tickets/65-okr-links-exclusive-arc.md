# 65 — A goal link points at exactly one thing, exactly once

**What to build:** A goal link references exactly one target, with no duplicate link to the same project. Current goal progress reads key results, not link counts; this is an integrity correction, not a demonstrated progress-percentage fix.

Two constraints close it: exactly one of the two references must be present, and uniqueness must cover the project arm as well as the ticket arm.

**Blocked by:** None — can start immediately.

**Status:** partial — SQL and error translation authored; schema reflection, journalling and database verification remain open

**Audit correction (2026-09-27):** `goals.ts` declares the uniqueness indexes but no exclusive-arc
CHECK, contrary to the earlier evidence below. Journal 1372 is absent. The four service tests
pass using mocked database errors; they do not prove enforcement. The DTO already rejects both
and neither references, so the old "required DTO change" is now obsolete.

- [ ] A link with neither reference, or with both, is rejected by the database
  — `backend/migrations/1372_okr_links_exclusive_arc.sql`: `ADD CONSTRAINT chk_okr_links_exclusive_arc CHECK (num_nonnulls(ticket_id, project_id) = 1) NOT VALID` then `VALIDATE CONSTRAINT`; `backend/src/db/schema/build/goals.ts:107` (Drizzle schema reflects the constraint at the next line); `backend/src/modules/goals/goal-links.service.ts` catches `23514` and throws `ConflictException`

- [ ] A goal cannot be linked to the same project twice
  — `backend/migrations/1372_okr_links_exclusive_arc.sql`: `CREATE UNIQUE INDEX IF NOT EXISTS uniq_okr_links_goal_project ON build.okr_links (goal_id, project_id) WHERE project_id IS NOT NULL`; `backend/src/db/schema/build/goals.ts:108` reflects `uniqueIndex("uniq_okr_links_goal_project")`; `backend/src/modules/goals/goal-links.service.ts` catches `23505` and throws `ConflictException`

- [ ] Existing duplicate and malformed links are surveyed and reported before the constraints are added
  — Orchestrator responsibility. Survey SQL in EXECUTION-PLAN.md §"65 — links with neither arm or both, and duplicate project links":
  ```sql
  SELECT count(*) FROM build.okr_links
  WHERE (ticket_id IS NULL AND project_id IS NULL) OR (ticket_id IS NOT NULL AND project_id IS NOT NULL);

  SELECT org_id, goal_id, project_id, count(*) FROM build.okr_links
  WHERE project_id IS NOT NULL GROUP BY org_id, goal_id, project_id HAVING count(*) > 1;
  ```

- **N/A:** Recomputing goal progress due to duplicate links is not required; current progress code does not read link rows

  **2026-09-27 — Premise correction.** The ticket's opening premise ("the progress rollup counts every duplicate, so a goal's percentage depends on how many times someone clicked") is **false**. Neither progress function reads `okr_links`.

  Search performed: `grep -r "okrLinks\|okr_links" backend/src` — the only hits are `backend/src/db/schema/build/goals.ts` (schema definition) and `backend/src/modules/goals/goal-links.service.ts` (CRUD). Neither `backend/src/modules/goals/goals-progress.ts:recomputeGoalProgress` (lines 23-57) nor `backend/src/modules/goals/goals.service.ts:recomputeGoalProgress` (private, lines 116-151) imports or queries `okrLinks` — both read only `okrKeyResults`.

  The constraints are still correct: a link to neither arm or both arms is genuinely representable, and the project arm genuinely has no uniqueness guard. This criterion is void because no code path makes link row count affect progress.

  Observation (not a fix — out of territory): `keyResultPercent` and `recomputeGoalProgress` are duplicated in full — once as a standalone export in `goals-progress.ts` and once as a private method in `goals.service.ts` (lines 89-151). The standalone export is what `goal-key-results.service.ts` calls; the private copy is used only internally by `GoalsService.checkIn`. This is the wrapper pattern prohibited by BE-143.

- [ ] The migration is journalled with a rollback authored
  — Migration: `backend/migrations/1372_okr_links_exclusive_arc.sql`; rollback: `backend/migrations/1372_okr_links_exclusive_arc_rollback.sql`

  Journal entry for orchestrator to add to `backend/migrations/meta/_journal.json`:
  ```json
  {
    "idx": <next available>,
    "version": "7",
    "when": "<apply timestamp>",
    "tag": "1372_okr_links_exclusive_arc",
    "breakpoints": true
  }
  ```

- [ ] Verified in a rolled-back transaction as the application role
  — Orchestrator responsibility (requires DB access).

**Historical proposal, already implemented as of 2026-09-27; do not duplicate:**
`backend/src/modules/goals/dto/goal.schemas.ts` lines 89-96: `createLinkSchema` uses `.refine()` to reject "neither" but not "both". The DB check constraint is the final guard for "both", but the app layer should reject it first. Add a second refine:
```typescript
.refine(
  (data) => !(data.ticketId !== undefined && data.projectId !== undefined),
  { message: "Provide either ticketId or projectId, not both" },
)
```

- [ ] Reflect the exclusive-arc CHECK in the Drizzle schema or an enforced migration-only manifest, then verify both catalog definition and rejecting/accepting inserts as the application role
