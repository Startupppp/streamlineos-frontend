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
  — Migration 1372 authors the exclusive-arc CHECK; backend/src/db/schema/build/goals.ts does not yet declare that CHECK. goal-links.service.ts translates the expected constraint error. Database enforcement remains unverified.

- [ ] A goal cannot be linked to the same project twice
  — `backend/migrations/1372_okr_links_exclusive_arc.sql`: `CREATE UNIQUE INDEX IF NOT EXISTS uniq_okr_links_goal_project ON build.okr_links (goal_id, project_id) WHERE project_id IS NOT NULL`; `backend/src/db/schema/build/goals.ts:108` reflects `uniqueIndex("uniq_okr_links_goal_project")`; `backend/src/modules/goals/goal-links.service.ts` catches `23505` and throws `ConflictException`

- [x] Existing duplicate and malformed links are surveyed and reported before the constraints are added
  — **Surveyed 2026-09-27** by the orchestrator, read-only inside a `SET TRANSACTION READ ONLY` block that was then rolled back, against production Aurora over IAM auth. Results:
  ```
  links with neither arm, or with both : 0 rows
  duplicate (org_id, goal_id, project_id) links : 0 rows
  build.okr_links total : 0 rows
  ```
  The table is empty, so neither constraint can fail to build and no remediation is required. Note what this does and does not establish: it proves the constraints are safe to add, and it proves nothing about whether the defect was reachable — a link to neither arm or to both was representable, and the project arm had no uniqueness guard. The survey found no victims, not no hole.

  Survey SQL, for reproduction:
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

  Observation: progress computation is duplicated between goals-progress.ts and goals.service.ts. This is duplicated behavior to consolidate behind the existing helper if tests establish equivalent semantics, not necessarily a pure pass-through wrapper.

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
