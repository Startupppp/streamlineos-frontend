# Soft-delete audit — repo-wide

**Date:** 2026-08-11 · **Policy source:** owner decision, now `CLAUDE.md` §19 (living rule)
**Scope:** all backend modules. Cross-cutting, so it lives here rather than in a module tracker.

## The policy being audited

Business entities soft-delete via `deleted_at`; **every read filters it**; indexes on those tables are **partial**.
Physical `DELETE` is permitted only for: join/link rows · unsent drafts · terminal invitations with no retention
duty · session/token revocation · explicit DPDP/GDPR erasure. Organization hierarchy is stricter — archive/restore
only (§16).

## Verdict

| Metric | Count |
|---|---|
| `@Delete(` route handlers | 307 |
| Distinct tables physically deleted in services | ~80 |
| Soft (via `deleted_at` / status) | ~55 |
| Hard — **permitted** under the policy | ~30 |
| Hard — **policy violations** | **41** |

## The compound finding — read this first

**Seven entities have no `deleted_at` column at all:** `deals`, `tickets`, `projects`, `sprints`, `cycles`,
`quotes`, `okr_goals`. Verified for `deals` and `quotes` (0 `deletedAt` in `schema/crm/deals.ts` and
`schema/crm/invoicing.ts`). Their hard deletion is therefore **not** a service-layer oversight — there is no
soft-delete path to revert to. **Each needs a schema migration before its service can be fixed**, so these cannot
be done as a code-only sweep.

⚠️ **Migrations are currently blocked.** `db:generate` diffs the whole schema against the journal, and multiple
sessions are concurrently editing `schema/build/**` and inventory schema. Generating now would bundle their
in-flight work into someone else's migration. Run these when the tree is quiet, and per §19: FK additions go
`NOT VALID` → `VALIDATE`, `NOT NULL` in three steps, `lock_timeout` set, one purpose per migration.

## Violations by owning program

Each program should action its own; nothing here was changed outside CRM.

### CRM — mine

| ID | Where | Table | Status |
|---|---|---|---|
| V-08/09 | `leads.service.ts:455`, `leads-ops.service.ts:131` | `leads` | **Being fixed.** Column exists; hard delete + **zero** read filters |
| V-14 | `crm-organizations.service.ts:195` | `crm_organizations` | **Being fixed.** Column exists; hard delete + zero read filters |
| V-07 | `deals-crud.service.ts:133` | `deals` | **Blocked on migration** — no column. `deal_activities` FK is `cascade`, so deal history dies with the deal |
| V-13 | `quotes.service.ts:308,259` | `quotes` + `quote_line_items` | **Blocked on migration** — financial documents |
| V-25 | `crm-campaigns.service.ts:62` | `crm_campaigns` | **Blocked on migration** — campaigns carry send/click/attribution history |

### Build — other session, do not touch

`projects` (V-01, destroys every ticket, sprint, comment and timesheet in one transaction) · `tickets` (V-02) ·
`sprints` (V-10) · `cycles` (V-11) · epics (V-12) · `project_releases` (V-27) · `ticket_comments` (V-28) ·
`roadmap_items`/`feedback_posts`/`changelog_entries` (V-30/31/32) · `project_milestones` (V-34) ·
`project_whiteboards` (V-35) · `modules` (V-36) · **`timesheets` (V-37 — billing/payroll data)** ·
`project_views` (V-41). V-01 and V-37 are the highest blast radius in the whole audit.

### HR — other session, do not touch

`candidates` + applications + interviews + SLA tracking in one transaction (V-03) · `interviews` (V-04) ·
`review_cycles` (V-05) · `performance_reviews` (V-06) · `goals` (V-17) · `hr_benefit_plans` (V-19) ·
`job_postings` (V-21) · `candidate_offers` (V-22) · `talent_pools` (V-23) · `headcount_requests` (V-24) ·
`recruitment_vendors` (V-38) · `hiring_flows` (V-40).

### Other

`okr_goals` + `okr_key_results` (V-15/16) · `expenses` (V-18, financial) · `inv_products` (V-20 — guard blocks
deletion with open orders but valuation ledger and traceability still cascade away) · `acc_tax_payments` (V-26 —
tax records) · `broadcasts` (V-29) · `calendar_events` (V-33) · `blog_posts` (V-39).

## `deleted_at` that reads ignore — the worst category

A column reads don't filter silently resurrects deleted rows. **Verified:**

| Table | Evidence | Consequence |
|---|---|---|
| `leads` | 0 `isNull(leads.deletedAt)` across 8 leads services / ~41 read sites | `mergeLeads` soft-deletes the loser, so **every merged lead reappears** in lists, boards, counts, exports and reports. Merge looks broken to the user |
| `leads` | `leads-board.service.ts:64,104,108` | Kanban columns and status counts include merged leads |
| `crm_organizations` | no filter anywhere; service hard-deletes too | Column dead in both directions |

## Missing partial indexes

Tables with `deleted_at` whose list indexes lack `WHERE deleted_at IS NULL`, so every scan re-evaluates the
predicate against dead rows: `contacts` · `leads` (has a plain `idx_leads_deleted`, not partial) · `crm_organizations` ·
`kb_spaces` · `hr_people` · `hr_employments` · `crm_pricebooks` · `crm_quote_templates` · `crm_products` ·
`crm_sequences`.

**Already correct** (do not re-raise): `project_approvals`, `change_requests`, `feedbucket_widgets`,
`feedbucket_submissions`, `project_forms`, `project_risks`, `project_decisions`, `project_incidents`,
`managed_products`, `project_meetings`, `meeting_action_items`, `pm_workspaces`, `project_portfolios`,
`project_programs`, `test_suites`, `test_cases`, `test_runs`, `bugs`, `project_teams`, `workflow_transitions`.

## Cascade across a soft-delete boundary

A soft-deleted parent survives, so a child's `onDelete: "cascade"` **never fires** — the declaration is
misleading and children linger.

| Parent | Children | Consequence |
|---|---|---|
| `kb_spaces` | `kb_articles`, `kb_pages` | Hidden today only because `kb-access.service.ts:70` resolves space ids with `isNull(deletedAt)`. Latent: any path listing articles without the access service exposes them |
| `kb_articles` (archived) | `kb_article_versions`, `kb_attachments`, `kb_chunks` | Storage leak — versions and embedding chunks accumulate for archived articles |
| `contacts` | `crm_contact_channel_consent`, `crm_contact_roles`, `deal_contacts` | Consent rows of deleted contacts linger. **Relevant to GAP-025**: consent must be read through the contact filter |
| `hr_people` | `hr_employments`, `hr_probation` | Payroll lookups by employment id can return records for soft-deleted employees |
| `leads` | `lead_activities` | Merge-loser activities still surface in feeds |

## Deliberate non-filters — do not "fix" these

Four leads reads are correctly left unfiltered; a blanket sweep would have broken them:

| Site | Why it must see soft-deleted rows |
|---|---|
| `leads-ops.service.ts:149,153` — merge winner/loser lookup | Read before the transaction sets `deletedAt`. On a partial-failure retry the loser is already soft-deleted, so a filtered lookup would return "loser not found" and break idempotent retry |
| `leads-ops.service.ts:231` — post-commit winner read | Deliberately reads post-merge state; the winner is never soft-deleted so the filter would be a no-op |
| `leads-exports.service.ts:41` — `checkDuplicates` | **Intake-time** dedupe. A phone/email that was merged away is still "in the system" — a new lead reusing it *should* be flagged |
| `leads-ops.service.ts:261` — import dedupe | Same reasoning: prevents re-importing contact data that already exists, merged or not |

Also corrected: `mergeLoser` in `leads-detail.service.ts` is **not** an exception — it sets status `LOST`, never
`deletedAt`, so filtering to live leads there is right.

## `crm_organizations` uniqueness — checked, no action

The table has **no** unique constraint on any business key; the only one is `uniq_crm_organizations_org_id` on
`(org_id, id)`, a surrogate. So a soft-deleted row occupies no business-key slot and cannot block a new org of the
same name. **If** an `(org_id, name)` constraint is ever added it must be partial (`WHERE deleted_at IS NULL`).

## Recommended order

1. ~~**Read filters where the column already exists** — leads, `crm_organizations`~~ ✅ **DONE.** 24 filters across
   8 leads services, `crm_organizations` converted to soft delete with both CTE arms filtered, plus the
   org-detail contacts read. Backend typecheck: 3 pre-existing errors, none in the edited files.
2. **Partial indexes** on the ten tables above — cheap, and required by §19 anyway.
3. **Migrations for the seven column-less entities**, highest blast radius first: `projects`/`tickets`/`timesheets`
   (Build), then `deals`/`quotes` (CRM), then `okr_goals`.
4. **Cascade review** — for each parent that soft-deletes, decide per child: filter through the parent, or
   soft-delete the child in the same transaction. Do not leave `cascade` declared where it cannot fire.
5. **Storage reclamation** for archived KB articles' versions and chunks.
