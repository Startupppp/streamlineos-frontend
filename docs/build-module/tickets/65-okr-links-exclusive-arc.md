# 65 — A goal link points at exactly one thing, exactly once

**What to build:** A goal link references exactly one target, with no duplicate link to the same project. Current goal progress reads key results, not link counts; this is an integrity correction, not a demonstrated progress-percentage fix.

Two constraints close it: exactly one of the two references must be present, and uniqueness must cover the project arm as well as the ticket arm.

**Blocked by:** None — can start immediately.

**Status:** partial — SQL and error translation authored; schema reflection, journalling and database verification remain open

**Audit correction (2026-09-27):** `goals.ts` declares the uniqueness indexes but no exclusive-arc
CHECK, contrary to the earlier evidence below. Journal 1372 is absent. The four service tests
pass using mocked database errors; they do not prove enforcement. The DTO already rejects both
and neither references, so the old "required DTO change" is now obsolete.

- [x] A link with neither reference, or with both, is rejected by the database
  Earned 2026-09-27 against a real database. Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay_test`, built 2026-09-27 by a cold replay of the journal (`replay-chain-cold.mjs`, 1000 of 1008 entries applied, 928 tables). No production data and no production host. Connected as `streamline_app`, which reports `rolbypassrls = false`, so every read and write below was subject to the tenant policy.
  Both halves fired, each behind its own `SAVEPOINT` so the first failure could not abort the transaction and make the second read as a pass:
    - neither arm (`ticket_id` NULL, `project_id` NULL) -> **23514** on `chk_okr_links_exclusive_arc`
    - both arms populated -> **23514** on `chk_okr_links_exclusive_arc`
  Catalog definition observed as `CHECK ((num_nonnulls(ticket_id, project_id) = 1))`.
  — Not earned (2026-09-27, orchestrator). The constraint **is** in the catalog — read as `streamline_app`, `pg_get_constraintdef` returns `CHECK ((num_nonnulls(ticket_id, project_id) = 1))`, which rejects both the neither case and the both case by construction. But the insert probes could not run: `build.okr_links` is **empty in production** and `goal_id` is NOT NULL with an FK, so there is no goal id to reference, and `build.goals` reports no NOT NULL columns at all — it may not exist under that name. What is missing: the real table name behind goals, or a goal row planted inside the same rolled-back transaction.
  — Migration 1372 authors the exclusive-arc CHECK; backend/src/db/schema/build/goals.ts does not yet declare that CHECK. goal-links.service.ts translates the expected constraint error. Database enforcement remains unverified.

- [x] A goal cannot be linked to the same project twice
  Earned 2026-09-27. Inserting a second `(goal_id, project_id)` row for the same pair raised **23505** on `uniq_okr_links_goal_project`, whose definition was read from `pg_indexes` in the same transaction and carries the `WHERE (project_id IS NOT NULL)` predicate.
  — Not earned (2026-09-27, orchestrator). `uniq_okr_links_goal_project` was created by 1372 and is present, but the duplicate-insert probe needs a `goal_id`, which production cannot supply — see the note above.
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

- [x] The migration is journalled with a rollback authored
  — Earned (2026-09-27, orchestrator). `1372_okr_links_exclusive_arc` journalled at **idx 1126**, `when` 1803093615725, rollback authored alongside it. Applied to production; ledger row id 1007, hash `fca0624833b64221e37fd6797c12d651f6aeabbc2a26a3b855e17e76a5a9a81e` matching the file sha256 and the journal `when`.
  — Migration: `backend/migrations/1372_okr_links_exclusive_arc.sql`; rollback: `backend/migrations/rollback/1372_okr_links_exclusive_arc.down.sql`

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

- [x] Verified in a rolled-back transaction as the application role
  Earned 2026-09-27. Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay_test`, built 2026-09-27 by a cold replay of the journal (`replay-chain-cold.mjs`, 1000 of 1008 entries applied, 928 tables). No production data and no production host. Connected as `streamline_app`, which reports `rolbypassrls = false`, so every read and write below was subject to the tenant policy.
  The whole proof ran inside one transaction that ended in `ROLLBACK`. Two independent confirmations that nothing persisted and that the role was genuinely policy-bound: `rolbypassrls = false` was asserted before any write, and the identical count query issued *after* the rollback was refused with **42501**, because outside the transaction there is no `app.organization_id` to read under. A run that had leaked rows would have answered with a number instead.
  — Half earned (2026-09-27, orchestrator). The **catalog** half was verified as `streamline_app` with bypassrls asserted false: the CHECK exists with the definition above. The **behavioural** half — an insert actually being rejected — was not, for the reason above. A catalog read is not a rejection.
  — Orchestrator responsibility (requires DB access).

**Historical proposal, already implemented as of 2026-09-27; do not duplicate:**
`backend/src/modules/goals/dto/goal.schemas.ts` lines 89-96: `createLinkSchema` uses `.refine()` to reject "neither" but not "both". The DB check constraint is the final guard for "both", but the app layer should reject it first. Add a second refine:
```typescript
.refine(
  (data) => !(data.ticketId !== undefined && data.projectId !== undefined),
  { message: "Provide either ticketId or projectId, not both" },
)
```

- [x] Reflect the exclusive-arc CHECK in the Drizzle schema or an enforced migration-only manifest, then verify both catalog definition and rejecting/accepting inserts as the application role
  Earned 2026-09-27, and the ticket's own audit correction was wrong about this. The Drizzle schema **already declares the constraint** at `backend/src/db/schema/build/goals.ts:110`:
  `check("chk_okr_links_exclusive_arc", sql`num_nonnulls(${table.ticketId}, ${table.projectId}) = 1`)`
  so nothing was re-added; the correction claiming `goals.ts` has no CHECK is stale and is corrected below.
  Both directions were verified as `streamline_app`, which is the part the box asks for and the part a rejection-only test cannot supply (a constraint that rejects everything would pass a negative-only proof):
    - REJECTING: neither arm -> 23514; both arms -> 23514
    - ACCEPTING: the project-only link inserted, and the ticket-only link inserted
  Catalog definition matches migration `1372_okr_links_exclusive_arc.sql:14` exactly.
  Also resolved while here: the ticket said `build.goals` "may not exist under that name". It does not exist — the parent table is **`build.okr_goals`** (`goals.ts:24`), reached from `okr_links` through the composite FK `fk_okr_links_org_goal` on `(org_id, goal_id)`.
  — Half earned (2026-09-27, orchestrator). The Drizzle half is done: `backend/src/db/schema/build/goals.ts` now declares `check("chk_okr_links_exclusive_arc", sql`num_nonnulls(ticket_id, project_id) = 1`)`, matching the applied constraint. The catalog definition is verified as the application role. The rejecting/accepting inserts are not — see above.
  — **goals.ts updated 2026-09-27:** `check("chk_okr_links_exclusive_arc", sql\`num_nonnulls(${table.ticketId}, ${table.projectId}) = 1\`)` added to `backend/src/db/schema/build/goals.ts` (`okrLinks` table constraint array, after the two `uniqueIndex` entries). `check` imported from `drizzle-orm/pg-core`. The Drizzle schema now mirrors the `chk_okr_links_exclusive_arc` constraint that migration 1372 adds. Catalog verification and live insert/rejection testing require the migration to be applied — orchestrator concern.
