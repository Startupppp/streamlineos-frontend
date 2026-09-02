# 06 — Verify normalized lifecycle tables and the archived predicate on every active read

**What to build:** Lifecycle and relationship state is held in normalized tables rather than JSON arrays or polymorphic authority columns, and every active read filters deleted/archived rows. A read that forgets the predicate surfaces archived records as live data, which for organization hierarchy means an archived branch reappears in a parent selector.

**Blocked by:** 05.

**Status:** done — see `reports/06-lifecycle-predicates.md`

- [x] Actionable JSON arrays and polymorphic authority relationships are normalized; EAV appears only behind the approved custom-field seam.
  - Evidence: audited all 895 declared tables (`(?:pgTable|\w+\.table)` form). EAV PASS — the only value table, `support_ticket_custom_field_values`, is a composite-org-FK link table behind `custom_field_definitions`. 2 actionable JSON arrays found (`one_on_one_meetings.action_items`, `performance_reviews.goals`) — both dead, live surfaces already use `meeting_action_items` / `okr_key_results`; fix is a column drop (migration, not mine). 1 polymorphic authority relationship found (`project_approvals.entity_type/entity_id`, 8 kinds, no FK) — pre-existing, needs a migration. Both handed to ticket 08 / the migration agent.
- [x] Every active read carries its deleted/archived predicate, with partial indexes where the access pattern needs them.
  - Evidence: 80 in-scope lifecycle tables, 1,695 read sites triaged three ways (statement-level 911 flags ∩ file-level ∩ writer census → 30 strong candidates, all opened individually). **11 genuine misses fixed**, 16 confirmed correct, 4 found by a joins-only pass. 6 partial indexes specified exactly in the report for the migration owner. `tsc --noEmit -p tsconfig.json` → exit 0, 0 errors.
- [x] Organization hierarchy remains archive/restore with no hard-delete path; child-assignment selectors offer only active, non-deleted parents.
  - Evidence: all six `@Delete` routes go through `OrgHierarchyCommandService.run(..., "retire")` → `set({ deletedAt })`; selector sends `status: "ACTIVE"`; facade `assertActiveParent` enforces `status='ACTIVE' AND deleted_at IS NULL` at all 12 entry points. Closed one hole: `org-hierarchy-teams.service.ts::assertDepartment` accepted an ARCHIVED department as a parent (test RED before fix). Hierarchy suite: 18 suites / 66 tests pass.
- [x] Dependency conflicts on archive keep the dialog open, list every actionable dependency with counts, and confirm nothing changed.
  - Evidence: verified, no change needed. `OrgHierarchyDependenciesService` returns a 409 `ORG_UNIT_DEPENDENCY_ERROR` with the full `{key,label,count}[]` plus `totalDependencies`; `OrgHierarchyCommandService.run` takes `pg_advisory_xact_lock`, re-reads `FOR UPDATE`, and asserts **before** the mutation inside one `withTenant` transaction, so a conflict aborts before any write. Archive-mode counts are correctly narrower than retire-mode.
- [x] Focused behavior tests cover the archived-row-excluded case for each corrected read.
  - Evidence: 7 new spec files, 23 tests. Each was written first, run, and observed RED against unmodified source (output quoted in the report), then GREEN after the fix; each file carries a control that passed throughout. Tests are behavioural — the new `src/test/sql-predicate.ts` evaluates the production query's real `WHERE`/`ON` against fixture rows, so neutering a predicate turns the test red. Regression: 370 suites / 2,204 tests pass across organization+hr+finance+directory+goals; surveys 22/111.
