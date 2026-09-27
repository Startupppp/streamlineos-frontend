# 65 — A goal link points at exactly one thing, exactly once

**What to build:** Goal progress counts each linked item once. The link table carries a nullable ticket reference and a nullable project reference with no exclusivity, and its only uniqueness covers the goal and the ticket — so a link to nothing is representable, a link to both is representable, and because null never equals null in a unique index, **a goal can be linked to the same project unboundedly many times**. The progress rollup counts every duplicate, so a goal's percentage depends on how many times someone clicked.

Two constraints close it: exactly one of the two references must be present, and uniqueness must cover the project arm as well as the ticket arm.

**Blocked by:** None — can start immediately.

**Status:** in-progress — code and migration complete; the survey and the rolled-back verification are the orchestrator's, and one criterion is void (see the premise correction below)

- [x] A link with neither reference, or with both, is rejected by the database
  — `backend/migrations/1372_okr_links_exclusive_arc.sql`: `ADD CONSTRAINT chk_okr_links_exclusive_arc CHECK (num_nonnulls(ticket_id, project_id) = 1) NOT VALID` then `VALIDATE CONSTRAINT`; `backend/src/db/schema/build/goals.ts:107` (Drizzle schema reflects the constraint at the next line); `backend/src/modules/goals/goal-links.service.ts` catches `23514` and throws `ConflictException`

- [x] A goal cannot be linked to the same project twice
  — `backend/migrations/1372_okr_links_exclusive_arc.sql`: `CREATE UNIQUE INDEX IF NOT EXISTS uniq_okr_links_goal_project ON build.okr_links (goal_id, project_id) WHERE project_id IS NOT NULL`; `backend/src/db/schema/build/goals.ts:108` reflects `uniqueIndex("uniq_okr_links_goal_project")`; `backend/src/modules/goals/goal-links.service.ts` catches `23505` and throws `ConflictException`

- [ ] Existing duplicate and malformed links are surveyed and reported before the constraints are added
  — Orchestrator responsibility. Survey SQL in EXECUTION-PLAN.md §"65 — links with neither arm or both, and duplicate project links":
  ```sql
  SELECT count(*) FROM build.okr_links
  WHERE (ticket_id IS NULL AND project_id IS NULL) OR (ticket_id IS NOT NULL AND project_id IS NOT NULL);

  SELECT org_id, goal_id, project_id, count(*) FROM build.okr_links
  WHERE project_id IS NOT NULL GROUP BY org_id, goal_id, project_id HAVING count(*) > 1;
  ```

- [ ] Goal progress is recomputed for any goal whose duplicates were removed, and the change in its percentage is expected rather than surprising

  **2026-09-27 — Premise correction.** The ticket's opening premise ("the progress rollup counts every duplicate, so a goal's percentage depends on how many times someone clicked") is **false**. Neither progress function reads `okr_links`.

  Search performed: `grep -r "okrLinks\|okr_links" backend/src` — the only hits are `backend/src/db/schema/build/goals.ts` (schema definition) and `backend/src/modules/goals/goal-links.service.ts` (CRUD). Neither `backend/src/modules/goals/goals-progress.ts:recomputeGoalProgress` (lines 23-57) nor `backend/src/modules/goals/goals.service.ts:recomputeGoalProgress` (private, lines 116-151) imports or queries `okrLinks` — both read only `okrKeyResults`.

  The constraints are still correct: a link to neither arm or both arms is genuinely representable, and the project arm genuinely has no uniqueness guard. This criterion is void because no code path makes link row count affect progress.

  Observation (not a fix — out of territory): `keyResultPercent` and `recomputeGoalProgress` are duplicated in full — once as a standalone export in `goals-progress.ts` and once as a private method in `goals.service.ts` (lines 89-151). The standalone export is what `goal-key-results.service.ts` calls; the private copy is used only internally by `GoalsService.checkIn`. This is the wrapper pattern prohibited by BE-143.

- [x] The migration is journalled with a rollback authored
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

**Out of territory — required change:**
`backend/src/modules/goals/dto/goal.schemas.ts` lines 89-96: `createLinkSchema` uses `.refine()` to reject "neither" but not "both". The DB check constraint is the final guard for "both", but the app layer should reject it first. Add a second refine:
```typescript
.refine(
  (data) => !(data.ticketId !== undefined && data.projectId !== undefined),
  { message: "Provide either ticketId or projectId, not both" },
)
```
