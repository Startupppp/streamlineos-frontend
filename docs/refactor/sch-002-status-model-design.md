# SCH-002 — status model: agreed design

Approved shape: *one status table per project, `tickets.status` FK-constrained to it, carrying the
lifecycle group.* This document records what the usage mapping actually found, which is materially
smaller than the Phase 0 audit implied, and the plan that follows from it.

## Correction to the Phase 0 finding

The audit said "three competing status systems". That is literally true in the schema, but the mapping
shows **one of the three is dead code**, not a competing system:

| System | Reality |
|---|---|
| `tickets.status` (free text) | **The real system.** 68 read/write sites. Every list query, board column and report uses it |
| `project_statuses` | **The live config table.** 11 files: WIP limits, ordering, workflow transitions, provisioning, templates, git integration, cron. Already has `name`, `order`, `color`, **`type`** and `wip_limit` |
| `custom_states` | **Orphaned.** Proven below |

**Proof `custom_states` is orphaned** (§25 requires it before deleting anything):
1. **Zero write sites.** No `insert(customStates)` / `update(customStates)` anywhere in `src/modules/`.
2. **One read site** — a `leftJoin` in `projects-reports.service.ts:80` for the burndown.
3. **`tickets.state_id` is NULL on 100% of 204,000 rows**, so that join always yields NULL and the
   `COALESCE(custom_states.group, CASE WHEN status = 'DONE' …)` fallback is *always* taken. The burndown
   has never once read a real value from this table.
4. The service literally named `projects-custom-states.service.ts` operates on **`project_statuses`**,
   not `custom_states` — the user-facing "custom states" API is already the other table.

The two tables also duplicate the same concept: `custom_states.group` is a `state_group` enum
(`backlog|unstarted|started|completed|cancelled`); `project_statuses.type` is the same idea as `text`.

## Target

`project_statuses` becomes the single per-project status table. It already has every column needed.

1. **Type the lifecycle group.** `project_statuses.type text` → the existing `state_group` enum. The
   enum already exists in the DB (created for `custom_states`), so this is a `USING type::state_group`
   cast, same pattern as SCH-009.
2. **Point the burndown at it.** Replace the always-NULL `custom_states` join in
   `projects-reports.service.ts` with `project_statuses.type`, matched on `(project_id, name)` against
   `tickets.status`. **This closes RPT-003** — the snapshot stops `COALESCE`ing across two systems and
   starts reading a real lifecycle value.
3. **Constrain `tickets.status`.** Composite FK `(org_id, project_id, status)` →
   `project_statuses(org_id, project_id, name)`, so a ticket cannot hold a status the project has not
   configured. Requires a unique constraint on the parent side.
4. **Delete `custom_states` and `tickets.state_id`.** Both proven unused above.

### Why `status` stays a text FK rather than becoming `status_id`

Keeping the natural key means the 68 existing read sites, the API contract and every client keep
working unchanged, while still making an unconfigured status impossible. Switching to an integer
`status_id` would force a join into every one of those 68 sites and change the wire format for no
correctness gain — the composite FK already guarantees "one definition of done".

## Migration order

```sql
-- 1. backfill any status value that has no configured row, so the FK can be added without data loss
INSERT INTO project_statuses (org_id, project_id, name, "order", type)
SELECT DISTINCT t.org_id, t.project_id, t.status, 999, 'unstarted'
FROM tickets t
WHERE t.project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM project_statuses s
                  WHERE s.project_id = t.project_id AND s.name = t.status);
-- 2. type the lifecycle column
ALTER TABLE project_statuses ALTER COLUMN type DROP DEFAULT;
ALTER TABLE project_statuses ALTER COLUMN type TYPE state_group USING type::state_group;
ALTER TABLE project_statuses ALTER COLUMN type SET DEFAULT 'unstarted'::state_group;
-- 3. parent-side uniqueness, then the FK, NOT VALID then VALIDATE (§19 lock rule)
ALTER TABLE project_statuses ADD CONSTRAINT uniq_project_statuses_org_project_name
  UNIQUE (org_id, project_id, name);
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_status
  FOREIGN KEY (org_id, project_id, status) REFERENCES project_statuses (org_id, project_id, name)
  ON UPDATE CASCADE NOT VALID;
ALTER TABLE tickets VALIDATE CONSTRAINT fk_tickets_status;
-- 4. drop the orphan
ALTER TABLE tickets DROP COLUMN state_id;
DROP TABLE custom_states;
```

`ON UPDATE CASCADE` so renaming a status renames it on its tickets. Step 1 must run first or step 3
fails on any ticket whose status was never configured.

**Caveat — tickets with `project_id IS NULL`:** the FK columns include `project_id`, so a NULL
project_id makes the composite FK non-enforcing for those rows (SQL MATCH SIMPLE). That is acceptable:
a ticket with no project has no project statuses to constrain against.

## Out of scope

Per-project workflow *transitions* already exist (`workflow_transitions`) and are enforced by
`assertTransitionAllowed`. This change does not touch them.
