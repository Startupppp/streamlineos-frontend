# PERF4 — Read-cost budget coverage expansion

Date: 2026-08-31

## Summary

Expanded `src/scripts/read-cost-budgets.mjs` from **51 to 60 budgets** (+9 new) and fixed **1 SQL drift** in an existing budget. Updated `run-read-cost-budgets.mjs` to add 6 new fixture lookups for tables that are not seeded by default.

## Drift found and fixed

**`org-people-list`** — the budget measured `ORDER BY first_name ASC, last_name ASC LIMIT 100`. The actual service (`directory/directory.service.ts listPeople`) uses cursor-based pagination: `ORDER BY organization_person_id ASC LIMIT 51`. These route through different index paths — the old budget measured an index+sort path while the service uses the unique index `uniq_org_people_org_person (organization_id, organization_person_id)` for a direct range scan. The budget could pass (index scan avoids seq scan assertion) while the service regressed to a full re-sort on every page flip. Fixed by aligning ORDER BY and LIMIT with the service. SQL diff confirmed against `directory.service.ts:listPeople` line 79.

## New budgets added (9)

SQL for each was diffed against the named service method before writing.

| ID | Service | Table | Index used | Assertions | Ceiling |
|---|---|---|---|---|---|
| `timesheets-mine` | `build/execution/timesheets.service.ts listTimeEntries` (scope=own) | `timesheets` | `idx_timesheets_org_user_date (org_id, user_id, date)` | forbid-seq-scan | 3 000 |
| `mail-inbox-cached` | `mail/mail-metadata.service.ts listCached` | `mail_message_metadata` | `idx_mail_metadata_list (org_id, user_id, folder, date DESC)` | forbid-seq-scan | 5 000 PROVISIONAL |
| `build-all-work` | `build/core/projects-work-query.service.ts getAllWork → pageFilteredWork` | `build.tickets` + `build.project_members` | `idx_project_members_org_user`, `idx_tickets_org_project_rank` (BitmapOr) | none | 30 000 PROVISIONAL |
| `build-roadmap-list` | `build/core/projects-roadmap.service.ts listRoadmap` | `build.roadmap_items` | `idx_roadmap_items_org_status` partial | none | 5 000 PROVISIONAL |
| `build-feedback-list` | `build/core/projects-roadmap.service.ts listFeedback` | `build.feedback_posts` | `idx_feedback_posts_org_status` partial | none | 5 000 PROVISIONAL |
| `build-changelog-list` | `build/core/projects-roadmap.service.ts listChangelog` | `build.changelog_entries` | no sort-covering index; seq scan is planner-correct | none | 3 000 PROVISIONAL |
| `finance-tax-payments` | `finance/tax/tax-payments.service.ts list` | `acc_tax_payments` | `uniq_acc_tax_payments_org_id (org_id, id)` descending | none | 3 000 PROVISIONAL |
| `finance-reminder-policies` | `finance/ar/reminders.service.ts listPolicies` | `fin_reminder_policies` | `uniq_fin_reminder_policies_org_id (org_id, id)` | none | 2 000 PROVISIONAL |
| `module-access-roster` | `module-access/module-access-roster.service.ts fetchMembers` | `role_assignments` + `organization_members` + `users` | `idx_role_assignments_org_role` | none | 10 000 PROVISIONAL |

## SQL alignment notes (diffed against service source)

- **timesheets-mine**: `applyScope` with scope=own adds `user_id = caller`; budget adds `user_id = $2`. Projection trimmed to columns listTimeEntries selects. LIMIT 50 matches service default. Confirmed no drift.
- **mail-inbox-cached**: budget includes `account_id` in projection (matching `listCached` select), hardcodes `folder = 'inbox'` for the common case. Full projection match.
- **build-all-work**: service runs two separate queries (project member lookup then ticket query); budget merges into one SQL with a subquery IN — semantically equivalent, slightly more conservative (subquery vs literal IN). Columns in WORK_ROW_SELECTION confirmed against service.
- **build-roadmap-list**: service uses `db.query.roadmapItems.findMany` (selects all columns); budget selects key columns. ORDER BY `sort_order ASC, id ASC` and `deleted_at IS NULL` filter confirmed.
- **build-feedback-list**: `includeMerged=false` default adds `isNull(duplicateOfId)` — budget includes `duplicate_of_id IS NULL`. ORDER BY `votes DESC, id ASC` confirmed.
- **build-changelog-list**: no `deleted_at` column on `changelog_entries` (confirmed in schema). ORDER BY `created_at DESC, id DESC` confirmed (not `id DESC` alone as initially assumed — cursor serialises `createdAt` as `sortValue`).
- **finance-tax-payments**: `WHERE org_id AND archived_at IS NULL ORDER BY id DESC` — confirmed against `list()` in tax-payments.service.ts line 54. The service uses cursor on `id < cursor`; budget tests first page.
- **finance-reminder-policies**: `WHERE org_id AND archived_at IS NULL ORDER BY id ASC` — confirmed against `listPolicies()` in reminders.service.ts line 44. Cursor is `id > cursor` (gt); first page has no cursor.
- **module-access-roster**: service uses Drizzle `selectDistinct` which generates `SELECT DISTINCT`; budget uses `SELECT DISTINCT` directly. Join conditions and WHERE clause match `fetchMembers` with no cursor, no user filter. Hardcoded `module_key = 'hr'` as the fixture since HR module roles are always present in a seeded HR org.

## Runner fixture additions

Six new fixture lookups added to `run-read-cost-budgets.mjs`, following the existing `kbPageProbe` pattern — each does a `SELECT 1 LIMIT 1` inside a `tryFixture` transaction:

- `hasRoadmapItems` — checks `build.roadmap_items` for org
- `hasFeedbackPosts` — checks `build.feedback_posts` for org
- `hasChangelogEntries` — checks `build.changelog_entries` for org
- `hasTaxPayments` — checks `acc_tax_payments` for org
- `hasReminderPolicies` — checks `fin_reminder_policies` for org
- `hasMailMessages` — checks `mail_message_metadata` for org

Budgets for these tables return `null` from `params` when the fixture is absent → reported as `SKIP`, not as a breach. This prevents false failures when the tables are not seeded (they are all empty in the default seed).

## No new indexes required

All queried paths either already have covering indexes or are on tables small enough that a seq scan is planner-correct. Specific findings:

- `timesheets-mine`: `idx_timesheets_org_user_date (org_id, user_id, date)` is an exact match — no index needed.
- `mail-inbox-cached`: `idx_mail_metadata_list (org_id, user_id, folder, date DESC)` is an exact match — no index needed.
- `build.changelog_entries` sort by `created_at DESC, id DESC` has no dedicated index. For small tables (roadmap/feedback/changelog are product-management tables expected to hold tens to low hundreds of rows per org) seq scan is correct and cheaper than an index scan with sort. Documented as planner-correct.
- `module-access-roster`: join-heavy query. An additional index on `roles (org_id, module_key)` would help the subquery, but `roles` is a tiny table (< 20 rows per org) so the seq scan is correct.
- `acc_tax_payments` and `fin_reminder_policies`: the unique constraint indexes on `(org_id, id)` already cover the cursor-paginated list queries.

## PROVISIONAL ceilings

Eight of the nine new budgets carry PROVISIONAL ceilings because the relevant tables are not seeded in the default test org. Once seeded, measure with:

```
SEED_ORG_ID=<org> node src/scripts/run-read-cost-budgets.mjs --ids=mail-inbox-cached,build-all-work,build-roadmap-list,build-feedback-list,build-changelog-list,finance-tax-payments,finance-reminder-policies,module-access-roster
```

Set each ceiling to the measured `r2:h` (warm blocks, cache-hit run) multiplied by 3, rounded up to the nearest thousand.

## Files changed

- `backend/src/scripts/read-cost-budgets.mjs` — drift fix + 9 new budgets (51 → 60)
- `backend/src/scripts/run-read-cost-budgets.mjs` — 6 new fixture lookups + fixture object entries
