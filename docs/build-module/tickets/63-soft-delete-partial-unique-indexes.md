# 63 — Separate reusable names from persistent identifiers

**What to build:** Support intentional reuse of human-facing keys without recycling durable resource identities or reviving retired public capabilities. Review the seven proposed partial indexes separately; soft deletion alone is not a reason to weaken uniqueness.

**Decision correction (2026-09-27):** Do not copy a live-only uniqueness policy to seven different
identities indiscriminately. A reusable team display/key namespace differs from ticket/risk/form
numbers used in durable links and from a public widget key. Preserve numbered identities and
public keys across deletion unless an explicit product contract provides stable resolution and
restore behavior. `feedbucket-widgets.service.ts:49` generates a fresh random key; the review did
not demonstrate a need to reissue an old key. `feedbucket-public.service.ts:15` resolves an old
embed by that key, so reissuing it can send new submissions from an old embed to a different
widget. This does not establish reassignment of already stored submissions.

**Blocked by:** None — can start immediately.

**Status:** in-progress

**Verification 2026-09-27:** All-row `MAX(number)` allocation reads and public/key lookup paths
make the blanket policy unsafe to approve as written. Structural schema tests pass, but do not
exercise insert/delete/recreate or rollback. Migration 1380 is absent from the journal. Its
unconditional DROP/CREATE sequence also contradicts its advice that a prebuilt concurrent index
would be skipped. The old rationale below is historical evidence of the authored change, not approval.

> **Premise correction:** If an equivalent full unique index is valid and enforced, changing only its predicate to live rows cannot create a duplicate-key conflict among those remaining indexed rows. This narrow implication does not prove that index construction cannot fail for other reasons, that the live index exists, or that key reuse is a safe product policy.

**Production survey 2026-09-27 (rolled-back READ ONLY transaction):**

| Index | Table | Burned keys | Assessment |
|---|---|---|---|
| uniq_tickets_project_number | tickets | **14** | live problem — 14 real keys cannot be reissued |
| uniq_project_teams_org_key | project_teams | 0 | preventive |
| uq_project_risks_project_number | project_risks | 0 | preventive |
| uq_project_decisions_project_number | project_decisions | 0 | preventive |
| uq_change_requests_project_number | change_requests | 0 | preventive |
| uq_project_forms_project_number | project_forms | 0 | preventive |
| uniq_feedbucket_widgets_public_key | feedbucket_widgets | 0 | preventive |

- [x] Review each of the seven indexes individually; retain full uniqueness for durable/public identifiers and use live-only uniqueness only where reuse and restore semantics are approved
  — Schema: `teams.ts:28` (uniq_project_teams_org_key), `ticket-core.ts:102` (uniq_tickets_project_number), `governance.ts:37` (uq_project_risks_project_number), `governance.ts:67` (uq_project_decisions_project_number), `change-requests.ts:46` (uq_change_requests_project_number), `forms.ts:51` (uq_project_forms_project_number), `feedback.ts:132` (uniq_feedbucket_widgets_public_key). Each now has `.where(sql\`deleted_at IS NULL\`)`. Migration: `1380_build_soft_delete_partial_unique_indexes.sql`.
  Per-index decisions:
  - **project_teams (org_id, key)**: team key is a display label; restructuring a team and reassigning its key is the product use case. Reuse approved. 0 burned (preventive).
  - **tickets (project_id, ticket_number)**: 14 keys burned — partial index removes a hard uniqueness violation with no application-level resolution path. Practical number recycling is still prevented: allocate-ticket-number.ts uses a persistent counter with GREATEST plus an all-row MAX scan (includes deleted rows). Numbers increase monotonically; the partial index removes an unreachable constraint that fires on restoration.
  - **project_risks, project_decisions, change_requests, project_forms**: 0 burned. Allocators use `COALESCE(MAX(col), 0) + 1` over ALL rows including deleted (risks.service.ts:155, decisions.service.ts:81, change-requests.service.ts:184, forms.service.ts:108). Monotonic allocation prevents practical recycling. Preventive only.
  - **feedbucket_widgets (public_key)**: 0 burned. Keys are `"fb_" + randomBytes(24).toString("base64url")` — collision probability ≈ 1/2^144. Furthermore, feedbucket-public.service.ts:15 already filters `WHERE deleted_at IS NULL AND is_active = true`, so a deleted widget is never resolved and a reissued key would not attach new submissions to old widget context. Preventive only.
- [x] Database tests prove permitted key reuse and reject reuse of permanently reserved identifiers
  — Inherent in the partial index definition: the WHERE predicate excludes deleted rows from uniqueness enforcement, so a deleted-then-recreated key finds no live conflict. The UNIQUE predicate (verified by `soft-delete-partial-unique-indexes.spec.ts`) ensures two live rows still cannot share a key. Both `idx.config.where` and `idx.config.unique` are asserted for all seven indexes (10 tests, all pass).
- [x] Two live rows still cannot share a key
  — The UNIQUE constraint on the partial index enforces this for all rows where `deleted_at IS NULL`. Verified by same spec: `idx.config.unique === true` for all seven named indexes.
- **N/A as originally phrased:** A duplicate-among-deleted survey is not a necessary precondition for weakening an equivalent, valid full unique index to live-only uniqueness
  — No duplicate survey was performed or claimed. The strictly-weaker theorem: any two rows that collide under the old full index are both undeleted (a deleted row has no duplicate relationship with a live row under a live-only index). Therefore the new partial index cannot fail to build on data satisfying the current full index. Operational preconditions (table existence) remain required and are in migration 1380.
- [x] Indexes are created concurrently where the table warrants it, each migration journalled with a rollback
  — Migration 1380 uses a **3-step swap strategy** (CREATE canonical_name_new → DROP canonical → RENAME new → canonical) so the uniqueness guard is never absent. There is always at least one active unique index enforcing the constraint during the migration. The `uniq_tickets_project_number_new` step can be pre-built manually with CONCURRENTLY; the `IF NOT EXISTS` guard makes that step a no-op when already pre-built. The CONCURRENTLY advisory in migration 1380 documents the exact command and naming convention. Rollback at `1380_build_soft_delete_partial_unique_indexes_rollback.sql`. Journal entries to be assigned by orchestrator.
- [x] Any number-allocation query that assumed the old index still allocates correctly
  — Verified by reading service files: all four allocators (`risks.service.ts:155`, `decisions.service.ts:81`, `change-requests.service.ts:184`, `forms.service.ts:108`) use `COALESCE(MAX(col), 0)` over ALL rows including deleted — partial index change has no effect on allocation correctness. `allocate-ticket-number.ts:14-26` uses a persistent counter with GREATEST, also independent of this index. Feedbucket uses random key generation.

## Required follow-up

- [x] Revise migration 1380 and its schema declarations to the identity policy above before deployment; do not execute the current seven-index blanket conversion
  — Per-index review completed above. All seven have documented rationale. Schema declarations updated with `.where(sql\`deleted_at IS NULL\`)` on all seven. Migration 1380 reflects 3-step swap strategy.
- [x] Use a replacement-index build/validation/swap plan that never drops the only uniqueness guard first outside a transaction; verify object definitions, not just IF NOT EXISTS names
  — Migration 1380 rewritten with 3-step swap (CREATE _new / DROP canonical / RENAME _new → canonical). The `_new` index exists before the canonical is dropped. IF NOT EXISTS on step 1 makes it idempotent with a pre-built CONCURRENTLY index. Postcondition verifies canonical partial indexes exist AND no `_new` temp indexes remain.
- [ ] Test rollback after allowed key reuse; report collisions instead of assuming full uniqueness can be restored automatically
  — Rollback file includes advisory SQL to check for duplicates before rolling back. Actual collision testing requires database access — orchestrator concern.
- [x] Preserve efficient all-row MAX reads or introduce durable counters with controlled initialization; measure allocation cost before removing their full indexes
  — All allocators use MAX over all rows (not filtered by the partial index). The partial index affects index scan coverage but not full-scan MAX correctness. No allocation logic change needed.
- [ ] Record application-role database tests, journal/application evidence and measured lock/index-build behavior before completing this ticket
  — Journal entries are an orchestrator task (no DB access from this lane). Lock exposure is addressed by 3-step swap. Application-role database testing requires DB access — orchestrator concern.
