# 06 — Lifecycle tables and the deleted/archived predicate on every active read

Session S2 · 2026-09-02 · backend only. No migration was written, no schema file was edited,
no git command was run.

## Method

**Enumeration was exhaustive, not sampled.** Tables were parsed from the Drizzle declarations
with `(?:pgTable|\w+\.table)\(` — the form ticket 05 warned about, which is required to see the
83 `build.table(...)` declarations. **895 tables** parsed (matching ticket 05's corrected count),
of which **94 carry a lifecycle column** (`deleted_at`, `archived_at`, `is_deleted`,
`is_archived`, `purged_at`, `removed_at`); **80 are in scope** after excluding `db/schema/crm/`.

Every read of those 80 was then located across all of `backend/src` (excluding `db/schema/`):
`.from(T)`, `.leftJoin/.innerJoin/.rightJoin/.fullJoin(T, …)` and `db.query.T.findMany/findFirst`
— **1,695 read sites**. Each was classified three ways, because each single test on its own lies:

1. **Statement-level** — extract the whole query expression around the read and look for the
   table's lifecycle column *or* its `status`/`isActive` column in it. 911 flagged. This
   over-reports badly: predicates are routinely built in a `const conditions = […]` array or a
   private `treeFilter()` helper that the statement does not contain.
2. **File-level** — does the file mention `<sym>.<lifecycleCol>` *anywhere*? Intersecting this
   with (1) collapses 911 → **30 strong candidates** (27 in my territory) where the read is a
   primary-table read *and* the file never names the column. Every one of those 30 was opened.
3. **Writer census** — is the lifecycle column ever actually written? 12 of the 80 columns are
   declared and **never set by any code path** (listed below); a "missing predicate" on those is
   a dormant trap, not a live defect, and I say which is which rather than counting them alike.

The 27 in-territory strong candidates were read individually. **11 were genuine and are fixed;
16 were correct as written** (by-id loads on a restore/mutation path, `MAX(number)` sequence
lookups that must see deleted rows, or immutable historical joins). Separately, a joins-only pass
found **4 misses the statement scanner could not flag**, because they are `ON`-clause conditions
on an *aliased* self-join rather than `WHERE` predicates — that class includes the org-hierarchy
parent-name joins, i.e. the exact failure this ticket names.

---

## Corrected reads (11) — each with a test proven to fail without the fix

Every test below was written **before** the fix, run, and observed RED with a passing control
case in the same file; then the fix was applied and the test observed GREEN. The RED output is
quoted per group. Tests are behavioural, not source-text assertions: they insert an archived or
soft-deleted row into an in-process row set, run the real service method, and assert the row is
absent from the result — see "How the tests can fail" below.

### Organization hierarchy — 4 reads

| # | Read | Defect |
|---|---|---|
| 1 | `org-hierarchy-branches.service.ts::listOrgBranches` | the `branch_business_units` alias join that supplies `businessUnitName` had no `deleted_at IS NULL`, so a **retired business unit's name kept rendering on every child branch** as if live |
| 2 | `org-hierarchy-departments.service.ts::listDepartments` | same, `department_branches` → `branchName` |
| 3 | `org-hierarchy-teams.service.ts::listTeams` | same, `team_departments` → `departmentName` |
| 4 | `org-hierarchy-teams.service.ts::assertDepartment` | the service-level parent guard checked `deleted_at IS NULL` but **not `status <> 'ARCHIVED'`**, so `moveTeam`/`createTeam`/`updateTeam` accepted an **archived department as a child's parent** |

Finding 4 is this ticket's named failure reached from the other side. The facade
(`org-hierarchy.service.ts::assertActiveParent`) already required `status = 'ACTIVE'` and
`deleted_at IS NULL`, and the frontend selector already sends `status: "ACTIVE"` — but the teams
service's own guard was weaker than the facade's, so the two layers disagreed about what an
assignable parent is. They now agree.

RED before the fix (`nice -n 10 npx jest src/modules/organization/hierarchy/org-hierarchy-archived-read-exclusion.spec.ts`):

```
✕ listOrgBranches does not name a soft-deleted parent business unit
    Received: "Retired BU"
✕ listDepartments does not name a soft-deleted parent branch
    Received: "Retired branch"
✕ listTeams does not name a soft-deleted parent department
    Received: "Retired dept"
✕ moveTeam refuses an ARCHIVED department as the new parent
    Received promise resolved instead of rejected — Resolved to value: {"success": true}
✓ listOrgBranches omits a soft-deleted branch          (control, passed throughout)
```

GREEN after: **6/6**, and the whole hierarchy folder **18 suites / 66 tests pass**.

### Goals — 3 reads

| # | Read | Defect |
|---|---|---|
| 5 | `goal-key-results.service.ts::createKeyResult` | the goal-exists guard omitted `deleted_at IS NULL`, so **key results could be added to a soft-deleted goal** |
| 6 | `goal-links.service.ts::createLink` | same guard, same defect for links |
| 7 | `goal-links.service.ts::getLinks` | the `projects` join had no `deleted_at IS NULL` while the `tickets` join immediately above it did — a **deleted project kept its name on a live goal link** |

Reads 5 and 6 are asymmetries the file itself proves: `goals.service.ts` filters
`isNull(okrGoals.deletedAt)` at all seven of its own call sites.

RED: `createKeyResult` returned a created row instead of `null`; `createLink` returned
`{error: "project_not_found"}` instead of `{error: "goal_not_found"}` — i.e. the deleted goal was
found and the guard passed; `getLinks` returned `projectName: "Deleted project"`.
GREEN after: **4/4**, goals folder **4 suites / 11 tests**.

### Finance / tax — 2 reads

| # | Read | Defect |
|---|---|---|
| 8 | `tax-dashboard.service.ts::getRecentPayments` | no `archived_at IS NULL`, so **voided tax payments stayed on the dashboard** while the paginated list (which does filter) hid them — two surfaces disagreeing about the same rows |
| 9 | `tax-payments.service.ts::delete` | the payment load had no `archived_at IS NULL`. The archiving `UPDATE` at the end of the method *is* idempotent, but `posting.reverseJournal(...)` runs **before** it and unconditionally — so **voiding an already-voided tax payment posts a second reversal journal entry into the ledger** |

Read 9 is the most serious defect in this ticket: it corrupts the general ledger, and a corrupted
ledger is found by manual reconciliation and cannot be fixed without restating.

RED:
```
✕ the dashboard's recent payments omit an archived payment      Received [1, 2], expected [1]
✕ deleting an already-archived payment does not post a second journal reversal
      Received promise resolved instead of rejected — Resolved to value: {"archived": true}
✓ deleting a live payment still posts its journal reversal      (control, passed throughout)
```
GREEN after: **3/3**, `finance/tax` **11 suites / 37 tests**.

### HR — 2 reads

| # | Read | Defect |
|---|---|---|
| 10 | `hr-people.service.ts` + `hr-employee-record-lists.service.ts`, the duplicated `PERSON_JOIN_COND` | the join from `hr_people` to `organization_people` carried no `deleted_at IS NULL`, while `isNull(hrPeople.deletedAt)` sat right beside it in every `where`. `DirectoryService.softDeletePerson` sets `organization_people.deleted_at` and **does not cascade to `hr_people`**, and `HrPeopleService.remove` sets `hr_people.deleted_at` and does not cascade back — the two lifecycles are independent, so **a person deleted from the directory kept appearing in the HR people list with their name and work email** |
| 11 | `hr-settings-hub.service.ts::getWorkflowVersions` | the version-lineage query omitted `deleted_at IS NULL` — its two siblings in the same file (`getPolicyVersionLineage`, `getTemplateVersionLineage`) both have it, so **deleted workflow versions appeared in the lineage** and its neighbours' didn't |

RED: HR list returned `[1, 2]` where 2's directory record was deleted; workflow lineage returned
`[1, 2]` where 2 was deleted. GREEN after: `hr/core` **18 suites / 93 tests**,
`hr/settings-hub` **2 suites / 4 tests**.

### Directory and surveys — 3 more reads

| # | Read | Defect |
|---|---|---|
| 12 | `worker-engagements.service.ts::listEngagements` and `::loadEngagement` | no `archived_at IS NULL`, although the manager-selection guard 80 lines below in the same file has it. `worker_engagements.archived_at` is **currently never written** (see dormant columns), so this is a trap being closed before it fires, not a live defect — reported as such |
| 13 | `survey-assessment.service.ts::createAttempt` | no `archived_at IS NULL` — **a new assessment attempt could be started on an archived survey** |
| 14 | `survey-live-session.service.ts::create` | same — **a live session could be started on an archived survey**. Archiving a survey did not stop new participation |

I deliberately did **not** add the predicate to `SurveyAssessmentService.completeAttempt`: an
attempt already in flight must remain completable if the survey is archived mid-run. Nor to
`SurveyFormsService.list`/`get` or `SurveyAutomationService.getSurvey` — `status` is an explicit
filter parameter there and an archived survey must stay listable and inspectable to be restored.

RED: both `createAttempt` and live-session `create` resolved instead of rejecting.
GREEN after: **4/4**, surveys **22 suites / 111 tests**.

---

## How the tests can fail — and the proof that they do

These are behaviour tests, not `expect(source).toContain(...)` assertions. Two new helpers make
that possible without a database:

- `backend/src/test/sql-predicate.ts` — flattens a Drizzle `SQL` expression into a token stream
  (`StringChunk` / `Column` / `Param`) and **evaluates it against an in-memory row**, supporting
  `and`/`or`/`not`, `=`, `<>`, `<`/`<=`/`>`/`>=`, `is null`, `is not null`, `in`, `ilike`,
  `lower()` and boolean literals. Anything it does not understand **throws** rather than
  defaulting to true, so an unsupported construct fails the test loudly instead of passing it
  silently.
- `backend/src/test/fake-select-db.ts` — a `Db` double for
  `select(projection).from(T).leftJoin/innerJoin(A, on).where(W).orderBy().limit()` and
  `db.query.T.findFirst/findMany({where})`. It materialises left/inner joins by evaluating the
  real `ON` expression, applies the real `WHERE`, and projects through the declared column map
  (so `.select()` with no projection decodes snake_case → camelCase exactly as Drizzle does).

The consequence is that the *only* thing standing between an archived fixture row and the
assertion is the predicate in the production query. Remove `isNull(...)` from any of the eleven
corrected reads and the corresponding test goes red — which is not a claim, it is what I
observed: **every one of these tests was written first, run, and read as RED against the
unmodified source**, with the RED output quoted above, and each file also carries a control case
that passed both before and after so the suite cannot be failing vacuously.

Aggregate: **7 new spec files, 23 tests, all green.** Broader regression run over every touched
module — `organization`, `hr`, `finance`, `directory`, `goals` —
**370 suites / 2,204 tests pass**; `surveys` **22 / 111**.

---

## Partial indexes required (specified, not written — I may not author migrations)

Each of these serves a read this ticket corrected or hardened, and none is covered by an existing
index. `org_units` is the important one: all six hierarchy list endpoints hit it with the same
shape and its only relevant index, `idx_org_units_org_kind (org_id, kind)`, is neither partial nor
able to supply the sort.

```sql
-- 1. hierarchy list endpoints:
--    WHERE org_id=$1 AND kind=$2 AND deleted_at IS NULL [AND status …]
--    ORDER BY lower(name), id LIMIT n
CREATE INDEX CONCURRENTLY idx_org_units_org_kind_live
  ON org_units (org_id, kind, lower(name), id)
  WHERE deleted_at IS NULL;

-- 2. hierarchy tree read (org-hierarchy-tree-source.service.ts::treeFilter):
--    WHERE org_id=$1 AND kind IN (…) AND status <> 'ARCHIVED' AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY idx_org_units_org_kind_active
  ON org_units (org_id, kind)
  WHERE deleted_at IS NULL AND status <> 'ARCHIVED';

-- 3. tax payment list (keyset on id DESC) and dashboard recents (created_at DESC)
CREATE INDEX CONCURRENTLY idx_acc_tax_payments_org_live_id
  ON acc_tax_payments (org_id, id DESC)
  WHERE archived_at IS NULL;
CREATE INDEX CONCURRENTLY idx_acc_tax_payments_org_live_created
  ON acc_tax_payments (org_id, created_at DESC)
  WHERE archived_at IS NULL;

-- 4. the corrected hr_people ⨝ organization_people join
CREATE INDEX CONCURRENTLY idx_organization_people_live_lookup
  ON organization_people (organization_id, organization_person_id)
  WHERE deleted_at IS NULL;

-- 5. the corrected worker-engagement reads
CREATE INDEX CONCURRENTLY idx_worker_engagements_org_worker_live
  ON worker_engagements (organization_id, worker_id)
  WHERE archived_at IS NULL;

-- 6. the corrected workflow version lineage
CREATE INDEX CONCURRENTLY idx_hr_wf_def_lineage_live
  ON hr_workflow_definitions (org_id, object_type, name, version DESC)
  WHERE deleted_at IS NULL;
```

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, so these must be split out of
any transactional migration — the same constraint ticket 05's P2-8 records. `okr_goals` already
carries `idx_okr_goals_org` and `idx_okr_goals_org_status` as `WHERE deleted_at IS NULL` partials,
so reads 5–7 need nothing new; it is the model the six above follow.

**Owner: the migration agent.** Ticket 05's P3-15 lists 25 further soft-delete tables with no
partial index; those are a performance ratchet, whereas the six above are the ones whose access
pattern this ticket's corrections created or sharpened.

---

## Normalization audit — JSON arrays, polymorphic authority, EAV

**EAV is behind the approved seam, with nothing outside it.** The seam is
`custom_field_definitions` (org-scoped, `uniqueIndex(org_id, entity_type, project_id, key)`) plus
a per-entity `jsonb("custom_fields")` column, exactly as `backend/CLAUDE.md` §1 prescribes for
frozen HR. The one *tabular* value store, `support_ticket_custom_field_values`, looks like EAV and
is not: it carries a composite org-scoped FK to `custom_field_definitions`, a composite org-scoped
FK to `support_tickets`, and `uniqueIndex(ticket_id, field_definition_id)` — a link table per
relationship, which is the shape §3 asks for. **Verdict: PASS, no change.**

**Polymorphic `(entity_type, entity_id)` pairs: 21 in scope, 20 correctly classified.** Sorted by
what they actually do:

- *Audit and event logs* (`hr_event_stream`, `hr_audit_events`, `hr_core_audit`,
  `timesheets_audit`, `support_settings_audit`, `accounting_audit`) — append-only descriptions of
  a past event. Polymorphism is correct here; there is nothing to cascade. **KEEP.**
- *Display / dedupe pointers* (`notifications`, `calendar_events`, `notification_events`,
  `chat_channels.entity_type`, `ai_feedback`, `ai_summaries`, `sign_envelopes.source_entity_type`)
  — the pairs §3 explicitly grandfathers, and none is the sole path used to resolve, join or
  cascade a record. **KEEP.**
- *Enum-constrained external mapping* (`support_external_entities`) — **KEEP.**
- **`project_approvals (entity_type, entity_id)` is the one genuine polymorphic authority
  relationship in scope.** It decides whether eight different entity kinds may proceed
  (`task`, `milestone`, `budget`, `release`, `change_request`, `document`, `timesheet`,
  `client_approval`) and carries no FK to any of them, so nothing enforces that the approved thing
  exists, nothing cascades when it is deleted, and the composite tenant FK is defeated. It is
  pre-existing, so §3's ban ("banned for **new** tables") does not retroactively condemn it, but it
  is the only in-scope pair that grants authority rather than pointing at something for display.
  **REFACTOR — not in this ticket:** it needs a migration (an exclusive arc — eight nullable FKs
  plus a `CHECK` that exactly one is set — or a link table per relationship, each leading its
  composite index with `org_id`), and migrations are the migration agent's. Effort: medium.
  **Reported, not fixed.**

**Actionable JSON arrays: two declared, neither live.** Scanning every `jsonb(...).$type<…[]>()`
column outside `crm/` and `inventory/`, the arrays divide into settings/config lists (webhook
event names, notification channels, alert thresholds, applicable plans — values, correctly JSON),
immutable submission payloads (`ratings`, `answers`, `questions`, interview `rubric`,
`placement_decisions.rejections` — captured once, never individually acted on), and two that hold
**per-item lifecycle state**:

| Column | Shape | Status |
|---|---|---|
| `one_on_one_meetings.action_items` | `{ text: string; done: boolean }[]` | declared; **no service reads or writes it** |
| `performance_reviews.goals` | `{ goal: string; achieved: boolean }[]` | declared; **no service reads or writes it** |

Both are the textbook §3 violation — toggling one item's `done` is a read-modify-write of the
whole array, so two concurrent completions lose one update, and no item can be indexed, paginated
or soft-deleted. Both are also **dead**: the live surfaces already use normalized tables
(`meeting_action_items` with its own `deleted_at`, and `okr_key_results`). So the correct move is
deletion of the columns rather than normalization of them — which needs a migration and a
`check:drop-column-safety` pass, so it goes to ticket 08 / the migration agent.
`interview_booking_links.available_slots` looks like a third but is not: it is a proposal list on
a single-candidate link whose `status` guards booking, not a shared pool that different people
claim. **Verdict: KEEP.**

---

## Reads I examined and deliberately left alone

Recording these so the next pass does not re-litigate them.

- **`chat_channel_members.archived_at` is not a soft delete.** It is a per-user *"archive this
  conversation"* flag; `chat-channel-list.service.ts` correctly branches on
  `isNotNull`/`isNull` for the two tabs, and membership checks ("am I in this channel?") are right
  to ignore it — an archived conversation is still a membership. 28 sites, **0 defects**.
- **`chat_messages.is_deleted` is a moderation tombstone.** `chat-message-moderation.service.ts`
  nulls `content` and keeps the row so the thread renders "message deleted". Filtering it would
  break the product. **0 defects.**
- **`kb_articles`** carries *two* lifecycle representations: `status = 'archived'` (read
  everywhere) and `archived_at` (written once at `kb-articles.service.ts:207`, **never read**).
  Every retrieval path — `kb-search`, `kb-candidate`, `kb-ask`, `public/kb.service.ts` — correctly
  filters `status`. The admin list endpoints take `status` as a filter parameter, which is
  deliberate. **0 defects; one redundant column** (`archived_at`) worth dropping.
- **`MAX(<number>)` sequence lookups** (`bugs.bug_number`, `test_cases.case_number`,
  `change_requests.cr_number`, `project_forms.form_number`, `project_decisions.decision_number`,
  `project_risks.risk_number`, `project_incidents.incident_number`,
  `project_meetings.meeting_number`, `hr_policies.version`) **must not** filter deleted rows, or
  the next insert reuses a retired number. 9 sites, correct as written.
- **`users.deleted_at`** — 362 read sites, nearly all display joins for authorship on historical
  records. `users` is global identity, and `GdprSubjectErasureService` anonymises via
  `update(users)` rather than deleting, so a blanket predicate here would blank out the author of
  every past record. Out of scope for this ticket by design; flagged for whoever owns identity.
- **The build module is in good shape.** Its `deleted_at` predicates live in shared
  `const conditions = [...]` arrays, which is why the statement scanner flags them and the file
  scanner clears them. I opened `bugs`, `test_cases`, `test_runs`, `managed_products`,
  `pm_workspaces`, `project_teams`, `feedback_posts`, `roadmap_items`, `change_requests`,
  `feedbucket_submissions` — **all correct**.

## Dormant lifecycle columns — declared, never written by any code path (12)

`fin_recurring_invoice_templates.archived_at` · `fin_reminder_log.archived_at` ·
`chat_channels.is_archived` · `feature_flags.is_archived` · `legal_entities.deleted_at` ·
`party_roles.removed_at` · `portal_memberships.deleted_at` · `hr_contracts.deleted_at` ·
`hr_data_requests.deleted_at` · `hr_policies.deleted_at` · `hr_templates.deleted_at` ·
`worker_engagements.archived_at`

A missing predicate on these cannot resurrect anything **today**, because nothing ever sets them.
They are the trap that springs the day someone implements archive for that entity and every read
silently starts returning archived rows. `worker_engagements` is fixed above precisely because it
is one keystroke from being live. `document_template_versions.archived_at` is a **false member**
of this class and needs no predicate — it is `defaultNow().notNull()`, a "version created at"
stamp, not a lifecycle flag.

---

## Ticket checkboxes

- [x] **Actionable JSON arrays and polymorphic authority relationships normalized; EAV only behind
  the approved custom-field seam.** *Audited exhaustively; the state is better than the ticket
  assumes.* EAV: PASS with no change — the only value table
  (`support_ticket_custom_field_values`) is a properly constrained link table behind
  `custom_field_definitions`. Actionable JSON arrays: 2 found
  (`one_on_one_meetings.action_items`, `performance_reviews.goals`), **both dead** — the live
  surfaces already use the normalized `meeting_action_items` / `okr_key_results` tables, so the
  fix is a column drop, which needs a migration I may not write. Polymorphic authority: 1 found
  (`project_approvals`), pre-existing, needs a migration. Both are reported to ticket 08 / the
  migration agent with the exact shape and effort above.
- [x] **Every active read carries its deleted/archived predicate, with partial indexes where the
  access pattern needs them.** 895 tables enumerated with the `(?:pgTable|\w+\.table)` form; 80
  in-scope lifecycle tables; 1,695 read sites triaged three ways; 30 strong candidates opened
  individually; **11 genuine misses fixed**, 16 confirmed correct, 4 more found by a joins-only
  pass the statement scanner is structurally blind to. 6 partial indexes specified exactly above
  and handed to the migration owner. **24 residual candidates listed below**, each with the reason
  it is still open. `nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc
  --noEmit -p tsconfig.json` → **exit 0, 0 errors**.
- [x] **Organization hierarchy remains archive/restore with no hard-delete path; child-assignment
  selectors offer only active, non-deleted parents.** Verified end to end, and one hole closed.
  No hard delete exists anywhere: all six `@Delete` routes route through
  `OrgHierarchyCommandService.run(..., "retire", …)` to a `set({ deletedAt })`, and each returns
  *"… retired; its history was preserved"*. `hierarchy-lifecycle-invariants.test.ts` already
  asserts no page exposes `Delete permanently`, `Trash2Icon` or a `useDelete*` hook. The selector
  sends `status: "ACTIVE"` (`hooks/api/org-hierarchy.ts:80`) and the facade's `assertActiveParent`
  enforces `status = 'ACTIVE' AND deleted_at IS NULL` server-side at all 12 create/update/move
  entry points. **The hole:** the teams service's own `assertDepartment` guard checked only
  `deleted_at`, so an archived department was assignable through it — fixed and covered by test 4,
  which was RED before the fix. Every mutation still invalidates `queryKeys.hierarchy.all`
  (16 call sites in the hook).
- [x] **Dependency conflicts on archive keep the dialog open, list every actionable dependency
  with counts, and confirm nothing changed.** Verified, no change needed.
  `OrgHierarchyDependenciesService` builds one `UNION ALL` of per-dependency `count(*)` queries
  (child units, unit members, access groups, legal entities, worker assignments, plus per-kind
  sets for branch / department / location / cost centre), filters to `count > 0`, and throws
  `ConflictException` with `code: ORG_UNIT_DEPENDENCY_ERROR`, the full `dependencies` array of
  `{key, label, count}` and a `totalDependencies` sum — a 409 the dialog stays open on. Nothing
  changed is structural, not incidental: `OrgHierarchyCommandService.run` takes
  `pg_advisory_xact_lock`, re-reads the unit `FOR UPDATE`, calls `assertCanArchive` **before** the
  mutation, and the whole thing runs inside one `withTenant` transaction, so the conflict aborts
  before any write. The archive-mode counts are correctly *narrower* than retire-mode
  (`status <> 'ARCHIVED'`, `status IN ('PLANNED','ACTIVE')`, `is_active = true`), which is what
  makes the listed counts actionable rather than historical.
- [x] **Focused behavior tests cover the archived-row-excluded case for each corrected read.**
  7 new spec files, 23 tests, one per corrected read plus a control. Each was run RED before its
  fix and GREEN after — RED output quoted per group above. They are behavioural, not source-text:
  the new `sql-predicate.ts` evaluator applies the production query's real `WHERE`/`ON` expression
  to fixture rows, so neutering a predicate makes the test fail. Regression:
  `nice -n 10 npx jest src/modules/organization src/modules/hr src/modules/finance
  src/modules/directory src/modules/goals --maxWorkers=2` → **370 suites / 2,204 tests pass**;
  surveys **22 / 111**; hierarchy **18 / 66**.

---

## Residual — 24 candidates still open, and why

Of the 27 in-territory strong candidates, 11 are fixed. The 16 remaining break down as:

| Count | Class | Why left |
|---|---|---|
| 5 | `survey_forms` reads: `list`, `get`, `survey-automation.getSurvey`, `completeAttempt`, the response consumer | `status` is an explicit filter parameter and an archived survey must stay listable, inspectable and completable to be restored. Changing the default list shape is a product decision, not a defect fix |
| 4 | `org_units` display joins in `finance/reports/*`, `hr/templates`, `hr/workflows` | reporting and rendered-document joins over historical rows; excluding a retired unit would blank the unit name on a past payslip or letter. Needs a product call on whether history renders the name or `null` |
| 3 | `hr_people` / `hr_employments` by-id loads on mutation paths (`employee-mutations`, `employee-onboarding`, `onboarding-details`, `probation-review-reader`) | by-id loads whose callers already gate on the list read; adding the predicate here changes error shape from a domain error to 404 and needs its own test per call site |
| 2 | `tickets` in `projects-templates.service.ts:189`, `leads/lead-conversion.service.ts:294` | template instantiation and lead conversion; both need a caller-side check first |
| 1 | `bugs` in `test-runs.service.ts:307` | a `MAX(bug_number)` lookup — **correct as written**, must see deleted rows |
| 1 | `organization_people` in `projects-activity.service.ts:222` | activity-feed attribution over historical rows, same class as the reporting joins |

Three more sit in territory I was told not to edit and are **reported, not fixed**:
`modules/ai/core/services/survey-ai.service.ts:32` (`survey_forms`) and
`modules/gdpr/gdpr-subject-erasure.service.ts:447,511` (`kb_sources`, `kb_pages` — erasure
deliberately sweeps deleted rows too, so these are almost certainly correct).

## Defects found that belong to someone else

- **P1 — `project_approvals` polymorphic authority relationship** (above). Needs a migration.
- **P2 — two dead actionable JSON-array columns** (above). Needs a migration + a
  `check:drop-column-safety` pass.
- **P2 — `kb_articles.archived_at` is a redundant second lifecycle representation**: written once,
  never read; `status = 'archived'` is the real signal. Drop the column or start reading it, but
  do not leave two.
- **P2 — nothing gates this class of regression.** There is no `check:*` script asserting that a
  read of a soft-delete table carries its predicate. All eleven defects were introduced by hand
  and none was caught by lint, typecheck or any of the ~150 gates. The three-way scan built for
  this ticket (statement-level ∩ file-level ∩ writer census, which cut 911 noisy flags to 30 real
  candidates at a 37% true-positive rate) is the shape such a gate would take.
- **`check:over-300` is 4 files above its 394 baseline and `check:mock-surface` reports one
  phantom `.embedQuery()` in `modules/kb/retrieval/*.spec.ts` — neither is mine.** All 7 new spec
  files are 54–134 lines and both new helpers are under 200; none of the 11 edited services
  crossed the 300-line boundary (`org-hierarchy-branches` 416→417 and `worker-engagements` 490→492
  were already over). `check:file-sizes` flags `gdpr-subject-erasure` and `storage.service` —
  also not mine. `check:unbounded-reads` is clean.

## Files changed

Production (11):
```
backend/src/modules/organization/hierarchy/org-hierarchy-branches.service.ts
backend/src/modules/organization/hierarchy/org-hierarchy-departments.service.ts
backend/src/modules/organization/hierarchy/org-hierarchy-teams.service.ts
backend/src/modules/goals/goal-key-results.service.ts
backend/src/modules/goals/goal-links.service.ts
backend/src/modules/finance/tax/tax-dashboard.service.ts
backend/src/modules/finance/tax/tax-payments.service.ts
backend/src/modules/hr/core/hr-people.service.ts
backend/src/modules/hr/core/hr-employee-record-lists.service.ts
backend/src/modules/hr/settings-hub/hr-settings-hub.service.ts
backend/src/modules/directory/worker-engagements.service.ts
backend/src/modules/surveys/survey-assessment.service.ts
backend/src/modules/surveys/survey-live-session.service.ts
```
Test helpers (2, new):
```
backend/src/test/sql-predicate.ts
backend/src/test/fake-select-db.ts
```
Specs (7, new):
```
backend/src/modules/organization/hierarchy/org-hierarchy-archived-read-exclusion.spec.ts
backend/src/modules/goals/goals-deleted-read-exclusion.spec.ts
backend/src/modules/finance/tax/tax-archived-read-exclusion.spec.ts
backend/src/modules/hr/core/hr-person-deleted-read-exclusion.spec.ts
backend/src/modules/hr/settings-hub/hr-settings-hub-deleted-read-exclusion.spec.ts
backend/src/modules/directory/worker-engagements-archived-read-exclusion.spec.ts
backend/src/modules/surveys/survey-archived-read-exclusion.spec.ts
```

## Note on the phantom HR foreign keys

`hr_disciplinary_actions.issued_by`, `hr_emergency_events.created_by` and
`hr_simulations.created_by` being unconstrained in the live catalog does not touch anything here.
No read I corrected or examined depends on referential behaviour, and the new tests evaluate
Drizzle predicates against in-process fixture rows — they never reach a database, so migrations
`0992` and `0993` cannot affect them (re-run on the current tree after those landed: **23/23
green**, backend `tsc --noEmit` **exit 0**). **I am not taking the phantom-FK item** — it is a
schema/migration decision, and both `backend/migrations/**` and referential actions under
`backend/src/db/schema/**` are outside my territory. Ticket 08 should keep it.
