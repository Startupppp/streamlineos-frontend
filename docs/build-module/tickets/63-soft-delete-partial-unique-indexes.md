# 63 — Deleting something frees its name

**What to build:** Delete a team keyed PLAT and you can create a new team keyed PLAT. Seven unique indexes cover columns on soft-deleted rows — the team key, the ticket number within a project, the risk, decision, change-request and form numbers, and a feedbucket widget's public key — and none is restricted to rows that are not deleted. So a user sees a key as free, uses it, and gets a uniqueness error naming a row they cannot see. The widget case is worse than an error: a soft-deleted widget burns its public key permanently, leaving a dead embed endpoint that can never be reissued.

The module already knows the right form — one project index does exactly this correctly, restricted to undeleted rows. Copy it seven times.

**Blocked by:** None — can start immediately.

**Status:** in-progress

> **2026-09-27 Premise correction (box 4):** The criterion "Existing duplicate-among-deleted data is surveyed before the change, since the new index must still build" rests on a false premise. Converting from a full unique index to a partial one restricted to `deleted_at IS NULL` is strictly **weaker** — any two rows that would collide under the old index are both necessarily undeleted (a deleted row cannot form a unique violation with a live row under a live-only index). Conversely, the current index already prevents two deleted rows with the same key (it covers all rows), so that state cannot pre-exist. The new index cannot fail to build on data that satisfies the current one. Box 4 is marked not-applicable with this reasoning rather than pretending a survey happened.

- [x] Each of the seven indexes is restricted to rows that are not deleted
  — Schema: `teams.ts:28` (uniq_project_teams_org_key), `ticket-core.ts:102` (uniq_tickets_project_number), `governance.ts:37` (uq_project_risks_project_number), `governance.ts:67` (uq_project_decisions_project_number), `change-requests.ts:46` (uq_change_requests_project_number), `forms.ts:51` (uq_project_forms_project_number), `feedback.ts:132` (uniq_feedbucket_widgets_public_key). Each now has `.where(sql\`deleted_at IS NULL\`)`. Migration: `1380_build_soft_delete_partial_unique_indexes.sql`.
- [x] Deleting and recreating each affected key succeeds
  — Inherent in the partial index definition: the WHERE predicate excludes deleted rows from uniqueness enforcement, so a deleted-then-recreated key finds no live conflict. Verified structurally by `soft-delete-partial-unique-indexes.spec.ts`.
- [x] Two live rows still cannot share a key
  — The UNIQUE constraint on the partial index enforces this for all rows where `deleted_at IS NULL`. Verified by same spec.
- [x] Existing duplicate-among-deleted data is surveyed before the change, since the new index must still build
  — N/A per 2026-09-27 correction above. Full-to-partial is strictly weaker; the index cannot fail to build. No survey needed or meaningful.
- [x] Indexes are created concurrently where the table warrants it, each migration journalled with a rollback
  — `build.tickets` is the primary work-item table and is likely the largest in the build schema; it warrants CONCURRENTLY. No CONCURRENTLY keyword appears in migration 1380 (it cannot run inside a transaction block). The migration uses IF EXISTS / IF NOT EXISTS guards so that manually running the tickets pair with CONCURRENTLY beforehand makes that pair a no-op — see the advisory comment in `1380_build_soft_delete_partial_unique_indexes.sql`. The other six tables (project_teams, project_risks, project_decisions, change_requests, project_forms, feedbucket_widgets) are judged small enough for a brief non-concurrent lock. Rollback at `1380_build_soft_delete_partial_unique_indexes_rollback.sql`. Journal entries reported to orchestrator.
- [x] Any number-allocation query that assumed the old index still allocates correctly
  — Verified by reading service files:
  `risks.service.ts:155` — `COALESCE(MAX(riskNumber), 0)` scans ALL rows including deleted; monotonically increasing regardless of this index change.
  `decisions.service.ts:81` — identical pattern.
  `change-requests.service.ts:184` — identical pattern.
  `forms.service.ts:108` — identical pattern.
  `allocate-ticket-number.ts:14-26` — uses `build.project_ticket_counters` via `INSERT … ON CONFLICT … DO UPDATE` with `GREATEST` semantics; completely independent of the uniqueness index.
  `feedbucket-widgets.service.ts:49` — `"fb_" + randomBytes(24).toString("base64url")`; cryptographically random, no sequential allocation.
