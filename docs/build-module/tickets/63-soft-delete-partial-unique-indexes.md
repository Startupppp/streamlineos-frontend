# 63 — Separate reusable names from persistent identifiers

**What to build:** Support intentional reuse of human-facing keys without recycling durable resource identities or reviving retired public capabilities. Review the seven proposed partial indexes separately; soft deletion alone is not a reason to weaken uniqueness.

**Decision correction (2026-09-27):** Do not copy a live-only uniqueness policy to seven different
identities indiscriminately. A reusable team display/key namespace differs from ticket/risk/form
numbers used in durable links and from a public widget key. Preserve numbered identities and
public keys across deletion unless an explicit product contract provides stable resolution and
restore behavior. `feedbucket-widgets.service.ts:49` generates a fresh random key; the review did
not demonstrate a need to reissue an old key. `feedbucket-public.service.ts:15` resolves an old
embed by that key, so reissuing it can attach old submissions to a new widget.

**Blocked by:** None — can start immediately.

**Status:** in-progress

**Verification 2026-09-27:** All-row `MAX(number)` allocation reads and public/key lookup paths
make the blanket policy unsafe to approve as written. Structural schema tests pass, but do not
exercise insert/delete/recreate or rollback. Migration 1380 is absent from the journal. Its
unconditional DROP/CREATE sequence also contradicts its advice that a prebuilt concurrent index
would be skipped. The old rationale below is historical evidence of the authored change, not approval.

> **2026-09-27 Premise correction (box 4):** The criterion "Existing duplicate-among-deleted data is surveyed before the change, since the new index must still build" rests on a false premise. Converting from a full unique index to a partial one restricted to `deleted_at IS NULL` is strictly **weaker** — any two rows that would collide under the old index are both necessarily undeleted (a deleted row cannot form a unique violation with a live row under a live-only index). Conversely, the current index already prevents two deleted rows with the same key (it covers all rows), so that state cannot pre-exist. The new index cannot fail to build on data that satisfies the current one. Box 4 is marked not-applicable with this reasoning rather than pretending a survey happened.

- [ ] Review each of the seven indexes individually; retain full uniqueness for durable/public identifiers and use live-only uniqueness only where reuse and restore semantics are approved
  — Schema: `teams.ts:28` (uniq_project_teams_org_key), `ticket-core.ts:102` (uniq_tickets_project_number), `governance.ts:37` (uq_project_risks_project_number), `governance.ts:67` (uq_project_decisions_project_number), `change-requests.ts:46` (uq_change_requests_project_number), `forms.ts:51` (uq_project_forms_project_number), `feedback.ts:132` (uniq_feedbucket_widgets_public_key). Each now has `.where(sql\`deleted_at IS NULL\`)`. Migration: `1380_build_soft_delete_partial_unique_indexes.sql`.
- [ ] Database tests prove permitted key reuse and reject reuse of permanently reserved identifiers
  — Inherent in the partial index definition: the WHERE predicate excludes deleted rows from uniqueness enforcement, so a deleted-then-recreated key finds no live conflict. Verified structurally by `soft-delete-partial-unique-indexes.spec.ts`.
- [ ] Two live rows still cannot share a key
  — The UNIQUE constraint on the partial index enforces this for all rows where `deleted_at IS NULL`. Verified by same spec.
- **N/A as originally phrased:** A duplicate-among-deleted survey is not a necessary precondition for weakening an equivalent, valid full unique index to live-only uniqueness
  — N/A per 2026-09-27 correction above. Full-to-partial is strictly weaker; the index cannot fail to build. No survey needed or meaningful.
- [ ] Indexes are created concurrently where the table warrants it, each migration journalled with a rollback
  — `build.tickets` is the primary work-item table and is likely the largest in the build schema; it warrants CONCURRENTLY. No CONCURRENTLY keyword appears in migration 1380 (it cannot run inside a transaction block). The migration uses IF EXISTS / IF NOT EXISTS guards so that manually running the tickets pair with CONCURRENTLY beforehand makes that pair a no-op — see the advisory comment in `1380_build_soft_delete_partial_unique_indexes.sql`. The other six tables (project_teams, project_risks, project_decisions, change_requests, project_forms, feedbucket_widgets) are judged small enough for a brief non-concurrent lock. Rollback at `1380_build_soft_delete_partial_unique_indexes_rollback.sql`. Journal entries reported to orchestrator.
- [ ] Any number-allocation query that assumed the old index still allocates correctly
  — Verified by reading service files:
  `risks.service.ts:155` — `COALESCE(MAX(riskNumber), 0)` scans ALL rows including deleted; monotonically increasing regardless of this index change.
  `decisions.service.ts:81` — identical pattern.
  `change-requests.service.ts:184` — identical pattern.
  `forms.service.ts:108` — identical pattern.
  `allocate-ticket-number.ts:14-26` — uses `build.project_ticket_counters` via `INSERT … ON CONFLICT … DO UPDATE` with `GREATEST` semantics; completely independent of the uniqueness index.
  `feedbucket-widgets.service.ts:49` — `"fb_" + randomBytes(24).toString("base64url")`; cryptographically random, no sequential allocation.

## Required follow-up

- [ ] Revise migration 1380 and its schema declarations to the identity policy above before deployment; do not execute the current seven-index blanket conversion
- [ ] Use a replacement-index build/validation/swap plan that never drops the only uniqueness guard first outside a transaction; verify object definitions, not just IF NOT EXISTS names
- [ ] Test rollback after allowed key reuse; report collisions instead of assuming full uniqueness can be restored automatically
- [ ] Preserve efficient all-row MAX reads or introduce durable counters with controlled initialization; measure allocation cost before removing their full indexes
- [ ] Record application-role database tests, journal/application evidence and measured lock/index-build behavior before completing this ticket
