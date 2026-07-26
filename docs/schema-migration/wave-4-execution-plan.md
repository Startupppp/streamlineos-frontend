---
wave: 4
type: execution-plan
status: DRAFT
date: 2026-07-26
depends-on: wave-0-composite-fk-matrix-hr-payroll.md, wave-0-composite-fk-matrix-inventory-finance.md, wave-0-composite-fk-matrix-crm-projects-misc.md, wave-0-id-transition-matrix-modules.md
blocks: Wave 5 (RBAC actor-ref migration), Wave 7 (composite FK enforcement at module level), Wave 9 (RLS FORCE rollout)
---

# Wave 4 — Tenant-safe Foreign Keys: Ordered Execution Program

> This document is the sequenced, gated execution plan for establishing every
> prerequisite that makes composite tenant FKs structurally possible across the
> StreamlineOS schema. It converts the per-domain gap matrices produced in Wave 0
> into an ordered migration program. Nothing in this plan may be skipped or
> reordered — every phase is a hard prerequisite for the phase that follows it.
>
> **Read the four Wave-0 matrices before making any change. They are the source of
> truth for every table list, gap classification, and repair sketch used here.**

---

## Cross-cutting truths (non-negotiable context)

These facts are confirmed across all four Wave-0 matrices and govern every phase:

1. **No legacy parent has `UNIQUE(org_id, id)` today.** Only the newest tables
   (`pm_workspaces`, `organization_people`, `portal_memberships`, `business_parties`,
   `party_contacts`) carry this candidate key. Every other tenant parent table — across
   HR, payroll, inventory, finance, CRM, projects, support, KB, chat, and RBAC — lacks
   it. This is the single structural fact that blocks every composite FK in the schema.

2. **Zero composite `foreignKey({columns, foreignColumns})` declarations exist anywhere
   in the legacy module tables.** Every existing FK is a bare single-column
   `.references()`. All composite FKs in this plan are net-new declarations.

3. **~55+ tables lack `org_id` entirely.** They scope tenant membership only through a
   parent FK chain. Every such table must receive an `org_id text NOT NULL` column
   (backfilled from the parent) before any candidate key or composite FK can land on it.
   These span: HR (25 tables), inventory line tables (18 tables), project junction
   tables (9 tables), CRM line tables (4 tables), chat (8 tables), support/KB
   junctions (a further handful).

4. **~40+ bare-integer FK columns carry no `.references()` at all.** These must receive
   a single-column constraint first; then the composite FK program can subsume them.

5. **Billing `org_id` int→text mismatch is isolated.** Only four tables
   (`billing_profiles`, `app_installations`, `affiliates`, `revenue_events`) use
   `org_id integer` against `organizations.id text`. No other module table has a type
   mismatch — all module `org_id` columns are `text`. The billing fix is a dedicated
   shadow-column program (Phase E).

6. **Accounting AR tables are NOT part of the billing mismatch.** `finance-ar-ap.ts`
   already uses `org_id text` with FK. Do not touch them in Phase E.

7. **`organization_members` does not yet have `UNIQUE(org_id, id)`.** This blocks
   `pm_workspace_memberships` from getting a composite FK to it. It is Wave 1 work
   that must land first.

---

## Ordering invariant (obey this or all phases fail)

```
Phase A — Add missing org_id columns + backfill
    ↓
Phase B — Add missing single-column .references() (bare FK columns)
    ↓
Phase C — Add UNIQUE(org_id, id) candidate keys on parent tables
    (ordered: anchor parents → mid-tier parents → leaf parents)
    ↓
Phase D — Add composite FKs (org_id, parent_id) → parent(org_id, id)
    (NOT VALID first; quarantine invalid rows; then VALIDATE CONSTRAINT)
    ↓
Phase E — Billing int→text org_id shadow-column migration (parallel to D)
    ↓
Phase F — RLS pilot on one low-risk table (after its composite FKs validate)
```

**Why this order is mandatory:**
- A composite FK requires a candidate key on the parent. No candidate key → constraint
  error at DDL time.
- A candidate key requires `org_id` on the table. No `org_id` → cannot form
  `UNIQUE(org_id, id)`.
- A bare FK column with no `.references()` must first be constrained at single-column
  level before the planner can widen it to a composite declaration.

---

## Phase A — Add missing `org_id text NOT NULL` to all org_id-less tables

**Gate:** This phase must land and backfill to 100% before any Phase C or D work begins.

**Why NOT NULL immediately:** All these tables already scope to one organization through
a parent FK chain. There is no legitimate cross-tenant row. A nullable `org_id` would
create a false sense of optionality and make the eventual FK constraint unreliable.

### SQL pattern

```sql
-- Step 1: add as nullable so existing rows are not rejected
ALTER TABLE <table> ADD COLUMN org_id text;

-- Step 2: backfill from the immediate parent (one-hop example)
UPDATE <table> t
SET org_id = p.org_id
FROM <parent_table> p
WHERE p.id = t.<parent_fk_col>;

-- Step 3: verify zero nulls remain
SELECT COUNT(*) FROM <table> WHERE org_id IS NULL;
-- Must be 0 before proceeding.

-- Step 4: set NOT NULL
ALTER TABLE <table> ALTER COLUMN org_id SET NOT NULL;

-- Step 5: add bare FK to organizations (single-column; composite comes in Phase D)
ALTER TABLE <table>
  ADD CONSTRAINT <table>_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id);
```

**Two-hop backfill pattern** (for tables whose parent also lacks org_id, resolved in
the same migration batch):

```sql
-- Must process parent first in the SAME migration transaction
-- Then child can copy from newly populated parent column.
UPDATE child_table c
SET org_id = (
  SELECT p.org_id FROM parent_table p WHERE p.id = c.parent_fk_col
)
WHERE c.org_id IS NULL;
```

### A.1 — HR domain (25 tables)

Process in parent-before-child order within each migration file:

| Order | Table | Parent FK col | Backfill source |
|-------|-------|--------------|-----------------|
| 1 | `department_members` | `department_id` | `departments.org_id` |
| 2 | `roster_entries` | `roster_id` | `rosters.org_id` |
| 3 | `key_results` | `goal_id` | `goals.org_id` |
| 4 | `survey_responses` | `survey_id` | `pulse_surveys.org_id` |
| 5 | `assessment_attempts` | `assessment_id` | `skill_assessments.org_id` |
| 6 | `competencies` | `framework_id` | `competency_frameworks.org_id` |
| 7 | `feedback_cycle_requests` | `cycle_id` | `feedback_cycles.org_id` |
| 8 | `feedback_cycle_responses` | `request_id` | (first add org_id to `feedback_cycle_requests` in row 7 above, then backfill here via two-hop) |
| 9 | `announcement_reads` | `announcement_id` | `announcements.org_id` |
| 10 | `course_enrollments` | `course_id` | `courses.org_id` |
| 11 | `training_attendance` | `program_id` | `training_programs.org_id` |
| 12 | `team_event_participants` | `event_id` | `team_events.org_id` |
| 13 | `interview_scorecards` | `interview_id` | `interviews.org_id` |
| 14 | `booking_link_interviewers` | `booking_link_id` | `interview_booking_links.org_id` |
| 15 | `vault_access_logs` | `vault_document_id` | `candidate_documents_vault.org_id` |
| 16 | `email_sequence_steps` | `sequence_id` | `email_sequences.org_id` |
| 17 | `email_sequence_enrollments` | `sequence_id` | `email_sequences.org_id` |
| 18 | `vendor_candidate_submissions` | `vendor_id` | `recruitment_vendors.org_id` |
| 19 | `job_recruiters` | `job_posting_id` | `job_postings.org_id` |
| 20 | `onboarding_template_steps` | `template_id` | `onboarding_templates.org_id` |
| 21 | `exit_checklists` | `resignation_id` | `resignations.org_id` |
| 22 | `hr_poll_votes` | `poll_id` | `hr_polls.org_id` |
| 23 | `hr_community_members` | `community_id` | `hr_communities.org_id` |
| 24 | `hr_workflow_steps` | `definition_id` | `hr_workflow_definitions.org_id` |
| 25 | `hr_import_rows` | `job_id` | `hr_import_jobs.org_id` |

**Note on `hr_import_rows`:** This table has a UUID PK. The `org_id` backfill pattern
is identical — UUID PK does not affect the org_id column type.

### A.2 — Inventory line tables (18 tables)

All line tables (`*_lines`) inherit tenant through their header table. Headers already
have `org_id`. Process headers first if they lack it (none do — all inv_ header tables
have `org_id text`).

| Order | Table | Parent FK col | Backfill source |
|-------|-------|--------------|-----------------|
| 1 | `inv_po_lines` | `po_id` | `inv_purchase_orders.org_id` |
| 2 | `inv_grn_lines` | `grn_id` | `inv_grns.org_id` |
| 3 | `inv_so_lines` | `so_id` | `inv_sales_orders.org_id` |
| 4 | `inv_shipment_lines` | `shipment_id` | `inv_shipments.org_id` |
| 5 | `inv_package_lines` | `package_id` | `inv_packages.org_id` |
| 6 | `inv_load_lines` | `load_id` | `inv_loads.org_id` |
| 7 | `inv_vendor_return_lines` | `return_id` | `inv_vendor_returns.org_id` |
| 8 | `inv_customer_return_lines` | `return_id` | `inv_customer_returns.org_id` |
| 9 | `inv_pick_list_lines` | `pick_list_id` | `inv_pick_lists.org_id` |
| 10 | `inv_cycle_count_lines` | `cycle_count_id` | `inv_cycle_counts.org_id` |
| 11 | `inv_physical_audit_lines` | `audit_id` | `inv_physical_audits.org_id` |
| 12 | `inv_stock_adjustment_lines` | `adjustment_id` | `inv_stock_adjustments.org_id` |
| 13 | `inv_stock_transfer_lines` | `transfer_id` | `inv_stock_transfers.org_id` |
| 14 | `inv_quality_inspection_lines` | `inspection_id` | `inv_quality_inspections.org_id` |
| 15 | `inv_recall_lines` | `recall_id` | `inv_recall_events.org_id` |
| 16 | `inv_vendor_return_lines` (lot/serial refs) | — | same batch as row 7 |
| 17 | `inv_customer_return_lines` (lot/serial) | — | same batch as row 8 |
| 18 | `inv_pick_list_lines` (lot/serial) | — | same batch as row 9 |

### A.3 — Project / CRM junction tables (9 tables)

| Order | Table | Parent FK col | Backfill source |
|-------|-------|--------------|-----------------|
| 1 | `project_template_tickets` | `template_id` | `project_templates.org_id` |
| 2 | `project_members` | `project_id` | `projects.org_id` |
| 3 | `ticket_assignees` | `ticket_id` | `tickets.org_id` |
| 4 | `ticket_label_mappings` | `ticket_id` | `tickets.org_id` |
| 5 | `ticket_watchers` | `ticket_id` | `tickets.org_id` |
| 6 | `ticket_checklist_items` | `checklist_id` | `ticket_checklists.org_id` |
| 7 | `ticket_custom_field_values` | `ticket_id` | `tickets.org_id` |
| 8 | `release_tickets` | `release_id` | `project_releases.org_id` |
| 9 | `webhook_deliveries` | `webhook_id` | `project_webhooks.org_id` |

Also add `work_item_relations.org_id` (P2 defect from ID-transition matrix):

| Order | Table | Notes |
|-------|-------|-------|
| 10 | `work_item_relations` | Cross-ticket relation — backfill from `tickets` via `work_item_id` |

### A.4 — CRM line tables (4 tables)

| Order | Table | Parent FK col | Backfill source |
|-------|-------|--------------|-----------------|
| 1 | `invoice_items` | `invoice_id` | `invoices.org_id` |
| 2 | `purchase_bill_items` | `bill_id` | `purchase_bills.org_id` |
| 3 | `support_ticket_messages` | `ticket_id` | `support_tickets.org_id` |
| 4 | `quote_line_items` | `quote_id` | `quotes.org_id` |

Also: `client_account_activities` — backfill via `client_account_id → client_accounts.org_id`.

### A.5 — Chat tables (8 tables)

| Order | Table | Parent FK col | Backfill source |
|-------|-------|--------------|-----------------|
| 1 | `chat_channel_members` | `channel_id` | `chat_channels.org_id` |
| 2 | `chat_messages` | `channel_id` | `chat_channels.org_id` |
| 3 | `chat_attachments` | `message_id` | `chat_messages.org_id` (after row 2) |
| 4 | `chat_pinned_messages` | `channel_id` | `chat_channels.org_id` |
| 5 | `chat_saved_messages` | `message_id` | `chat_messages.org_id` (after row 2) |
| 6 | `chat_huddles` | `channel_id` | `chat_channels.org_id` |
| 7 | `chat_huddle_participants` | `huddle_id` | `chat_huddles.org_id` (after row 6) |
| 8 | `chat_channel_invite_links` | `channel_id` | `chat_channels.org_id` |

### A.6 — Support / KB junction tables

| Order | Table | Parent FK col | Backfill source |
|-------|-------|--------------|-----------------|
| 1 | `support_ticket_tags` | `ticket_id` | `support_tickets.org_id` |
| 2 | `kb_article_tags` | `article_id` | `kb_articles.org_id` |

### Phase A gate

Before advancing to Phase B or C:

- Run for every table in A.1–A.6:
  ```sql
  SELECT table_name, COUNT(*) AS null_org_rows
  FROM information_schema.tables t
  -- dynamic: run per table:
  SELECT COUNT(*) FROM <table> WHERE org_id IS NULL;
  -- must return 0
  ```
- Run cross-tenant integrity check per table:
  ```sql
  SELECT COUNT(*) FROM <table> t
  WHERE NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.id = t.org_id
  );
  -- must return 0
  ```
- Record row counts in a reconciliation ledger; rerun must change 0 rows.
- **Rollback:** `ALTER TABLE <table> DROP COLUMN org_id;`
  (safe — no downstream constraints exist yet in Phase A)

---

## Phase B — Add missing single-column `.references()` on bare FK columns

**Gate:** These columns already have values in the DB but carry no FK constraint at the
DB layer. Adding a single-column FK is safe (it is just a constraint check on existing
data) if the data is clean. Quarantine any invalid rows first.

**Why Phase B before Phase C:** A composite FK `(org_id, col)` subsumes the single-col
FK but Drizzle generates the composite FK as a separate `foreignKey({...})` declaration.
The single-col `.references()` can co-exist with the composite or be removed once the
composite lands. Add single-col first so the DB has basic referential protection during
the Phase C/D work.

### SQL pattern

```sql
-- 1. Quarantine invalid rows first
SELECT id FROM <table>
WHERE <fk_col> IS NOT NULL
  AND <fk_col> NOT IN (SELECT id FROM <parent>);
-- Move to a quarantine table or NULL the column under a transaction.

-- 2. Add constraint
ALTER TABLE <table>
  ADD CONSTRAINT <table>_<fk_col>_fk
  FOREIGN KEY (<fk_col>) REFERENCES <parent>(id);
```

### B.1 — HR bare FK columns (23 gaps across 14 tables)

| Table | Column | Parent | Nullable? |
|-------|--------|--------|-----------|
| `hr_employments` | `job_role_id` | `hr_job_roles` | nullable |
| `hr_employments` | `job_level_id` | `hr_job_levels` | nullable |
| `hr_employments` | `employment_type_id` | *(verify target table — may be enum)* | nullable |
| `hr_employments` | `location_id` | `hr_locations` | nullable |
| `hr_loan_repayments` | `loan_id` | `salary_loans` | NOT NULL |
| `hr_travel_visit_logs` | `travel_request_id` | `travel_requests` | NOT NULL |
| `hr_attendance_regularizations` | `attendance_id` | `attendance` | nullable |
| `hr_disciplinary_actions` | `letter_render_id` | `hr_template_renders` | nullable |
| `hr_positions` | `job_level_id` | `hr_job_levels` | nullable |
| `hr_hiring_plan_items` | `linked_requisition_id` | `job_requisitions` | nullable |
| `job_requisitions` | `linked_job_id` | `job_postings` | nullable |
| `hr_teams` | `parent_team_id` | `hr_teams` (self-ref) | nullable |
| `payroll_accounting_mappings` | `component_id` | `salary_components` | NOT NULL |
| `employee_salary_profiles` | `policy_version_id` | `payroll_policy_versions` | nullable |
| `payroll_line_items` | `component_id` | `salary_components` | nullable |
| `hr_templates` | `parent_template_id` | `hr_templates` (self-ref) | nullable |
| `hr_policies` | `parent_policy_id` | `hr_policies` (self-ref) | nullable |
| `hr_automation_runs` | `triggered_by_run_id` | `hr_automation_runs` (self-ref) | nullable |
| `hr_time_devices` | `location_id` | `hr_locations` | NOT NULL |
| `hr_access_requests` | `employee_id` | `hr_people` or `users` | — |
| `hr_template_renders` | `rendered_for_employee_id` | `hr_employments` | nullable |
| `expenses` | `reimbursement_batch_id` | `reimbursements` | nullable |
| `payroll_run_allocations` | `run_id` | `payroll_runs` | NOT NULL |
| `payroll_tds_ytd_ledger` | `run_id` | `payroll_runs` | NOT NULL |

**Note on `hr_access_requests.employee_id`:** The target table is ambiguous in the
schema (could be `hr_people` or `users`). Verify the value format (integer vs text) and
the actual parent before adding the FK. Do not guess.

**Note on `hr_employments.employment_type_id`:** No `employment_types` table was
confirmed in the schema. Verify whether this is an enum-backed column or a reference to
a lookup table that was not inventoried. If it is enum-backed, no FK is needed.

### B.2 — Inventory bare FK columns (14 gaps across 10 tables)

| Table | Column | Parent |
|-------|--------|--------|
| `inv_shipments` | `so_id` | `inv_sales_orders` |
| `inv_shipment_lines` | `so_line_id` | `inv_so_lines` |
| `inv_load_lines` | `transfer_id` | `inv_stock_transfers` |
| `inv_vendor_returns` | `vendor_id` | `inv_vendors` |
| `inv_vendor_returns` | `po_id` | `inv_purchase_orders` |
| `inv_vendor_returns` | `grn_id` | `inv_grns` |
| `inv_customer_returns` | `so_id` | `inv_sales_orders` |
| `inv_customer_returns` | `shipment_id` | `inv_shipments` |
| `inv_customer_returns` | `client_id` | `clients` |
| `inv_pick_lists` | `so_id` | `inv_sales_orders` |
| `inv_pick_list_lines` | `so_line_id` | `inv_so_lines` |
| `inv_cycle_counts` | `category_id` | `inv_categories` |
| `inv_serial_numbers` | `lot_id` | `inv_lots` |
| `inv_stock_reservations` | `lot_id` / `serial_id` | `inv_lots` / `inv_serial_numbers` |
| `inv_reorder_rules` | `vendor_id` | `inv_vendors` |
| `inv_categories` | `parent_category_id` | `inv_categories` (self-ref) |
| `inv_products` | `default_vendor_id` | `inv_vendors` |

**Also:** lot_id / serial_id bare refs in: `inv_vendor_return_lines`,
`inv_customer_return_lines`, `inv_pick_list_lines`, `inv_cycle_count_lines`,
`inv_physical_audit_lines`, `inv_quality_inspection_lines`, `inv_recall_lines`,
`inv_quality_holds`.

### B.3 — P1 defects from ID-transition matrix (missing FK on existing `org_id` text)

These tables have `org_id text` declared but no `.references()` call at all — a
structural defect independent of composite FK readiness:

| Table | Column | Action |
|-------|--------|--------|
| `ticket_comment_reactions` | `org_id` | Add `.references(() => organizations.id)` |
| `project_automations` | `org_id` | Add `.references(() => organizations.id)` |
| `crm_sla_breach_log` | `org_id` | Add `.references(() => organizations.id)` |
| `crm_sla_breach_log` | `lead_id` | Add `.references(() => leads.id)` |
| `kb_research_briefs` | `space_id` | Add `.references(() => kbSpaces.id)` |
| `kb_pages` | `parent_page_id` | Add `foreignKey` self-ref block |
| `kb_pages` | `source_article_id` | Add `.references(() => kbArticles.id)` |
| `kb_spaces` | `owning_team_id` | Verify target table; add FK once confirmed |
| `survey_forms` | `active_version_id` | Add deferred circular `foreignKey` to `survey_versions` |
| `support_queues` | `created_by` | Add `.references(() => users.id)` |
| `support_ticket_links` | `created_by` | Add `.references(() => users.id)` |

### Phase B gate

For every table amended in B.1–B.3:

```sql
-- Verify the constraint exists in pg_constraint:
SELECT conname FROM pg_constraint
WHERE conrelid = '<table>'::regclass
  AND contype = 'f'
  AND conname LIKE '%<column>%';

-- Verify zero orphans remain:
SELECT COUNT(*) FROM <table>
WHERE <fk_col> IS NOT NULL
  AND <fk_col> NOT IN (SELECT id FROM <parent>);
-- must return 0
```

- **Rollback:** `ALTER TABLE <table> DROP CONSTRAINT <constraint_name>;`
  (safe — no downstream constraints depend on these single-col FKs yet)

---

## Phase C — Add `UNIQUE(org_id, id)` candidate keys on parent tables

**Gate:** This is the structural prerequisite for every composite FK in Phase D. The
order within Phase C matters: anchor parents must receive their candidate keys before
their children receive composite FKs that point to them.

**Why UNIQUE and not just a unique index?**
A composite FK declaration (`foreignKey({columns, foreignColumns})`) in Drizzle
generates a `REFERENCES parent(col1, col2)` clause in SQL. PostgreSQL requires the
referenced columns to have a `UNIQUE` or `PRIMARY KEY` constraint (not just an index)
for a FK to be created. A `uniqueIndex` does NOT satisfy this requirement. Use
`unique("constraint_name").on(table.orgId, table.id)` in Drizzle.

### SQL pattern

```sql
-- Via Drizzle schema:
-- In the parent table definition, add:
-- unique("uniq_<table>_org_id_id").on(<table>.orgId, <table>.id)

-- Raw SQL equivalent (for reference / verification):
ALTER TABLE <table>
  ADD CONSTRAINT uniq_<table>_org_id_id UNIQUE (org_id, id);
```

**Concurrency note for large tables (>500k rows):** Add the constraint as
`ADD CONSTRAINT ... UNIQUE USING INDEX <idx>` where the index was built
`CONCURRENTLY` first, to avoid a full-table lock:

```sql
-- Step 1 (offline-safe, runs concurrently):
CREATE UNIQUE INDEX CONCURRENTLY uniq_<table>_org_id_id_idx
  ON <table> (org_id, id);

-- Step 2 (very fast — acquires ShareLock only briefly):
ALTER TABLE <table>
  ADD CONSTRAINT uniq_<table>_org_id_id
  UNIQUE USING INDEX uniq_<table>_org_id_id_idx;
```

### C.1 — Tier 1: Anchor parents (tables that are direct children of `organizations` and parents of many others)

These must be done first. No Phase D FK can exist before these land.

**Sub-wave C.1-A — tenancy + access core (Wave 1 already owns `organization_members`):**

| Table | Candidate key | Notes |
|-------|--------------|-------|
| `organizations` | Already has PK = unique `id`; its children use `org_id text` single-col FK. The tenant anchor itself does not need `UNIQUE(org_id, id)` because it IS the `org_id` boundary. | Confirm, no action. |
| `organization_members` | `UNIQUE(org_id, id)` | Blocks `pm_workspace_memberships` composite FK. Owned by Wave 1 — confirm it has landed before this phase runs. |

**Sub-wave C.1-B — HR org structure (highest fan-out: many children reference these):**

| Table | Candidate key |
|-------|--------------|
| `departments` | `UNIQUE(org_id, id)` |
| `hr_job_roles` | `UNIQUE(org_id, id)` |
| `hr_job_levels` | `UNIQUE(org_id, id)` |
| `hr_locations` | `UNIQUE(org_id, id)` |
| `hr_teams` | `UNIQUE(org_id, id)` |
| `hr_custom_field_definitions` | `UNIQUE(org_id, id)` |
| `hr_people` | `UNIQUE(org_id, id)` |
| `hr_employments` | `UNIQUE(org_id, id)` |

**Sub-wave C.1-C — HR leave + attendance (parents for leave/shift children):**

| Table | Candidate key |
|-------|--------------|
| `leave_types` | `UNIQUE(org_id, id)` |
| `attendance` | `UNIQUE(org_id, id)` |
| `shift_templates` | `UNIQUE(org_id, id)` |
| `rosters` | `UNIQUE(org_id, id)` |

**Sub-wave C.1-D — HR lifecycle parents:**

| Table | Candidate key |
|-------|--------------|
| `hr_templates` | `UNIQUE(org_id, id)` |
| `hr_policies` | `UNIQUE(org_id, id)` |
| `review_cycles` | `UNIQUE(org_id, id)` |
| `goals` | `UNIQUE(org_id, id)` |
| `feedback_cycles` | `UNIQUE(org_id, id)` |
| `pulse_surveys` | `UNIQUE(org_id, id)` |
| `skill_assessments` | `UNIQUE(org_id, id)` |
| `competency_frameworks` | `UNIQUE(org_id, id)` |
| `one_on_one_meetings` | `UNIQUE(org_id, id)` |
| `courses` | `UNIQUE(org_id, id)` |
| `course_categories` | `UNIQUE(org_id, id)` |
| `training_programs` | `UNIQUE(org_id, id)` |
| `team_events` | `UNIQUE(org_id, id)` |
| `announcements` | `UNIQUE(org_id, id)` |
| `rich_documents` | `UNIQUE(org_id, id)` |
| `documents` | `UNIQUE(org_id, id)` |
| `hr_benefit_plans` | `UNIQUE(org_id, id)` |
| `salary_loans` | `UNIQUE(org_id, id)` |
| `tax_declarations` | `UNIQUE(org_id, id)` |
| `hr_cases` | `UNIQUE(org_id, id)` |
| `biometric_devices` | `UNIQUE(org_id, id)` |
| `helpdesk_tickets` | `UNIQUE(org_id, id)` |
| `assets` | `UNIQUE(org_id, id)` |
| `travel_requests` | `UNIQUE(org_id, id)` |

**Sub-wave C.1-E — Payroll parents:**

| Table | Candidate key |
|-------|--------------|
| `payroll_runs` | `UNIQUE(org_id, id)` |
| `salary_components` | `UNIQUE(org_id, id)` |
| `payroll_entities` | `UNIQUE(org_id, id)` |
| `payroll_policy_versions` | `UNIQUE(org_id, id)` |

### C.2 — Tier 2: Inventory parents

| Table | Candidate key | Notes |
|-------|--------------|-------|
| `inv_warehouses` | `UNIQUE(org_id, id)` | Many children blocked on this |
| `inv_locations` | `UNIQUE(org_id, id)` | Self-ref + many children |
| `inv_products` | `UNIQUE(org_id, id)` | |
| `inv_product_variants` | `UNIQUE(org_id, id)` | High fan-out: stock, reservations, shipments |
| `inv_vendors` | `UNIQUE(org_id, id)` | After Wave 6 party migration if `client_id` becomes `party_id` |
| `inv_purchase_orders` | `UNIQUE(org_id, id)` | |
| `inv_grns` | `UNIQUE(org_id, id)` | |
| `inv_sales_orders` | `UNIQUE(org_id, id)` | |
| `inv_shipments` | `UNIQUE(org_id, id)` | |
| `inv_packages` | `UNIQUE(org_id, id)` | |
| `inv_loads` | `UNIQUE(org_id, id)` | |
| `inv_vendor_returns` | `UNIQUE(org_id, id)` | |
| `inv_customer_returns` | `UNIQUE(org_id, id)` | |
| `inv_pick_lists` | `UNIQUE(org_id, id)` | |
| `inv_cycle_counts` | `UNIQUE(org_id, id)` | |
| `inv_physical_audits` | `UNIQUE(org_id, id)` | |
| `inv_stock_adjustments` | `UNIQUE(org_id, id)` | |
| `inv_stock_transfers` | `UNIQUE(org_id, id)` | |
| `inv_quality_inspections` | `UNIQUE(org_id, id)` | |
| `inv_recall_events` | `UNIQUE(org_id, id)` | |
| `inv_lots` | `UNIQUE(org_id, id)` | Referenced by serial_numbers, line items |
| `inv_serial_numbers` | `UNIQUE(org_id, id)` | |
| `inv_channels` | `UNIQUE(org_id, id)` | |
| `inv_webhooks` | `UNIQUE(org_id, id)` | |
| `inv_stock_transactions` | `UNIQUE(org_id, id)` | For valuation layers |
| `inv_carriers` | `UNIQUE(org_id, id)` | |

### C.3 — Tier 3: CRM + Projects parents

| Table | Candidate key |
|-------|--------------|
| `leads` | `UNIQUE(org_id, id)` |
| `clients` | `UNIQUE(org_id, id)` |
| `client_accounts` | `UNIQUE(org_id, id)` |
| `branches` | `UNIQUE(org_id, id)` |
| `crm_organizations` | `UNIQUE(org_id, id)` |
| `deals` | `UNIQUE(org_id, id)` |
| `crm_campaigns` | `UNIQUE(org_id, id)` |
| `invoices` | `UNIQUE(org_id, id)` |
| `purchase_bills` | `UNIQUE(org_id, id)` |
| `support_tickets` | `UNIQUE(org_id, id)` |
| `csat_surveys` | `UNIQUE(org_id, id)` |
| `quotes` | `UNIQUE(org_id, id)` |
| `projects` | `UNIQUE(org_id, id)` |
| `sprints` | `UNIQUE(org_id, id)` |
| `custom_states` | `UNIQUE(org_id, id)` |
| `cycles` | `UNIQUE(org_id, id)` |
| `modules` (PM modules) | `UNIQUE(org_id, id)` |
| `project_templates` | `UNIQUE(org_id, id)` |
| `tickets` | `UNIQUE(org_id, id)` |
| `ticket_comments` | `UNIQUE(org_id, id)` |
| `ticket_checklists` | `UNIQUE(org_id, id)` |
| `ticket_labels` | `UNIQUE(org_id, id)` |
| `project_statuses` | `UNIQUE(org_id, id)` |
| `project_milestones` | `UNIQUE(org_id, id)` |
| `project_releases` | `UNIQUE(org_id, id)` |
| `project_webhooks` | `UNIQUE(org_id, id)` |
| `project_whiteboards` | `UNIQUE(org_id, id)` |
| `git_connections` | `UNIQUE(org_id, id)` |
| `project_meetings` | `UNIQUE(org_id, id)` |
| `test_suites` | `UNIQUE(org_id, id)` |
| `test_cases` | `UNIQUE(org_id, id)` |
| `test_runs` | `UNIQUE(org_id, id)` |
| `project_incidents` | `UNIQUE(org_id, id)` |
| `project_forms` | `UNIQUE(org_id, id)` |
| `project_portfolios` | `UNIQUE(org_id, id)` |
| `project_programs` | `UNIQUE(org_id, id)` |
| `project_teams` | `UNIQUE(org_id, id)` |
| `managed_products` | `UNIQUE(org_id, managed_product_id)` — note: PK col name is `managed_product_id`, not `id` |
| `okr_goals` | `UNIQUE(org_id, id)` |
| `roadmap_items` | `UNIQUE(org_id, id)` |
| `feedback_posts` | `UNIQUE(org_id, id)` |

### C.4 — Tier 4: Support + KB + Chat parents

| Table | Candidate key |
|-------|--------------|
| `kb_categories` | `UNIQUE(org_id, id)` |
| `kb_articles` | `UNIQUE(org_id, id)` |
| `kb_spaces` | `UNIQUE(org_id, id)` |
| `kb_pages` | `UNIQUE(org_id, id)` |
| `kb_conversations` | `UNIQUE(org_id, id)` (if children exist) |
| `support_business_hours` | `UNIQUE(org_id, id)` |
| `support_sla_policies` | `UNIQUE(org_id, id)` |
| `support_ticket_messages` | `UNIQUE(org_id, id)` (now has org_id from Phase A) |
| `chat_channels` | `UNIQUE(org_id, id)` |
| `chat_messages` | `UNIQUE(org_id, id)` (now has org_id from Phase A) |
| `chat_huddles` | `UNIQUE(org_id, id)` (now has org_id from Phase A) |

### C.5 — Accounting + Finance parents

| Table | Candidate key |
|-------|--------------|
| `ledger_accounts` | `UNIQUE(org_id, id)` |
| `journal_entries` | `UNIQUE(org_id, id)` |

### Phase C gate

For every parent table in C.1–C.5:

```sql
-- Verify the UNIQUE constraint exists (not just an index):
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = '<table>'::regclass
  AND contype = 'u'
  AND conname LIKE '%org_id%id%';
-- must return one row

-- Verify no duplicate (org_id, id) pairs exist:
SELECT org_id, id, COUNT(*) FROM <table>
GROUP BY org_id, id HAVING COUNT(*) > 1;
-- must return 0 rows
```

- **Rollback:** `ALTER TABLE <table> DROP CONSTRAINT uniq_<table>_org_id_id;`
  (safe — no FK depends on it yet)

---

## Phase D — Add composite FKs `(org_id, parent_id) → parent(org_id, id)`

**Gate:** Every Phase A, Phase B, and Phase C gate must pass before any Phase D FK is
added. The ordering within Phase D follows the dependency graph: a table that is both a
parent (needs its Phase C candidate key) and a child (needs a composite FK to its own
parent) must receive the candidate key before any of its children's Phase D FKs land,
but it can receive its own Phase D FK to its grandparent in parallel.

### SQL pattern — NOT VALID + deferred VALIDATE

**Always use `NOT VALID` first on any table with more than ~50k rows.** This allows the
constraint to be applied without a full-table scan at DDL time, keeping write lock
duration to milliseconds. The `VALIDATE CONSTRAINT` runs later as a low-priority
operation (it holds only a `ShareUpdateExclusiveLock`, not `AccessExclusiveLock`).

```sql
-- Step 1: quarantine invalid cross-tenant rows first
-- (use the repair sketch from the Wave-0 matrix for the specific table)
BEGIN;
INSERT INTO <table>_cross_tenant_quarantine
  SELECT *, now() AS quarantined_at, 'wave-4-phase-d' AS reason
  FROM <table> t
  WHERE NOT EXISTS (
    SELECT 1 FROM <parent> p
    WHERE p.org_id = t.org_id AND p.id = t.<parent_fk_col>
  )
  AND t.<parent_fk_col> IS NOT NULL;

DELETE FROM <table> t
WHERE EXISTS (
  SELECT 1 FROM <table>_cross_tenant_quarantine q WHERE q.id = t.id
);
COMMIT;

-- Step 2: add the composite FK as NOT VALID
ALTER TABLE <table>
  ADD CONSTRAINT fk_<table>_org_<parent_fk_col>
  FOREIGN KEY (org_id, <parent_fk_col>)
  REFERENCES <parent>(org_id, id)
  NOT VALID;

-- Step 3 (can run during low-traffic window, no blocking writes):
ALTER TABLE <table>
  VALIDATE CONSTRAINT fk_<table>_org_<parent_fk_col>;
```

**Small tables (<50k rows) or tables in initial setup:** Omit `NOT VALID` and validate
inline.

### D.1 — Drizzle schema declaration

In Drizzle ORM, composite FKs are declared using the `foreignKey` helper at table level,
not via `.references()` on the column:

```typescript
import { foreignKey } from "drizzle-orm/pg-core";

export const childTable = pgTable(
  "child_table",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => organizations.id),
    parentId: integer("parent_id").notNull(),
    // ... other columns
  },
  (t) => [
    foreignKey({
      name: "fk_child_table_org_parent",
      columns: [t.orgId, t.parentId],
      foreignColumns: [parentTable.orgId, parentTable.id],
    }).onDelete("cascade"), // or "restrict" / "set null" depending on lifecycle
  ]
);
```

**onDelete policy guidance:**
- Core identity rows (employees, projects, tickets): `restrict` — prevent parent
  deletion while children exist.
- Audit / log / history rows: `cascade` — if the parent is deleted, history goes with it.
- Optional cross-module refs (timesheets → tickets): `set null` — ticket deletion does
  not invalidate the timesheet entry.

### D.2 — Execution batches (ordered by dependency depth)

**Batch D-1: Direct children of `organizations` that are also parents (C.1 tables)**

These tables already have `org_id → organizations.id`. They need no composite FK to
organizations (the bare single-col FK is correct for the tenant anchor). Their Phase D
work is adding composite FKs among themselves.

**Batch D-2: HR intra-domain composite FKs**

Representative examples (apply same pattern to every child table in the HR matrix):

```sql
-- department_members → departments
ALTER TABLE department_members
  ADD CONSTRAINT fk_dept_members_org_dept
  FOREIGN KEY (org_id, department_id) REFERENCES departments(org_id, id)
  NOT VALID;

-- hr_custom_field_values → hr_custom_field_definitions
ALTER TABLE hr_custom_field_values
  ADD CONSTRAINT fk_hrcfv_org_field_def
  FOREIGN KEY (org_id, field_definition_id)
  REFERENCES hr_custom_field_definitions(org_id, id) NOT VALID;

-- hr_employments → hr_job_roles
ALTER TABLE hr_employments
  ADD CONSTRAINT fk_hr_emp_org_job_role
  FOREIGN KEY (org_id, job_role_id) REFERENCES hr_job_roles(org_id, id) NOT VALID;

-- hr_employments → hr_job_levels
ALTER TABLE hr_employments
  ADD CONSTRAINT fk_hr_emp_org_job_level
  FOREIGN KEY (org_id, job_level_id) REFERENCES hr_job_levels(org_id, id) NOT VALID;

-- hr_employments → hr_locations
ALTER TABLE hr_employments
  ADD CONSTRAINT fk_hr_emp_org_location
  FOREIGN KEY (org_id, location_id) REFERENCES hr_locations(org_id, id) NOT VALID;

-- hr_employee_profiles → hr_employments
ALTER TABLE hr_employee_profiles
  ADD CONSTRAINT fk_hr_emp_profile_org_emp
  FOREIGN KEY (org_id, employment_id) REFERENCES hr_employments(org_id, id) NOT VALID;

-- All other child→parent pairs listed in the HR matrix follow the same pattern.
```

**Batch D-3: Inventory intra-domain composite FKs**

```sql
-- inv_locations → inv_warehouses
ALTER TABLE inv_locations
  ADD CONSTRAINT fk_inv_loc_org_warehouse
  FOREIGN KEY (org_id, warehouse_id) REFERENCES inv_warehouses(org_id, id) NOT VALID;

-- inv_locations self-ref
ALTER TABLE inv_locations
  ADD CONSTRAINT fk_inv_loc_org_parent_loc
  FOREIGN KEY (org_id, parent_location_id) REFERENCES inv_locations(org_id, id) NOT VALID;

-- inv_purchase_orders → inv_vendors + inv_warehouses
ALTER TABLE inv_purchase_orders
  ADD CONSTRAINT fk_inv_po_org_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES inv_vendors(org_id, id) NOT VALID;
ALTER TABLE inv_purchase_orders
  ADD CONSTRAINT fk_inv_po_org_warehouse
  FOREIGN KEY (org_id, warehouse_id) REFERENCES inv_warehouses(org_id, id) NOT VALID;

-- inv_po_lines → inv_purchase_orders (now has org_id from Phase A)
ALTER TABLE inv_po_lines
  ADD CONSTRAINT fk_inv_pol_org_po
  FOREIGN KEY (org_id, po_id) REFERENCES inv_purchase_orders(org_id, id) NOT VALID;

-- ... continue for every inventory child in the matrix.
```

**Batch D-4: CRM + Projects composite FKs**

```sql
-- leads → crm_campaigns
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_org_campaign
  FOREIGN KEY (org_id, campaign_id) REFERENCES crm_campaigns(org_id, id) NOT VALID;

-- sprints → projects
ALTER TABLE sprints
  ADD CONSTRAINT fk_sprints_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id) NOT VALID;

-- tickets → projects
ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id) NOT VALID;

-- ticket_comments → tickets
ALTER TABLE ticket_comments
  ADD CONSTRAINT fk_ticket_comments_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

-- ... continue for every PM child in the matrix.
```

**Batch D-5: PM Workspace composite FKs (post-Wave-1 `organization_members` candidate key)**

```sql
-- pm_workspace_memberships.organization_membership_id → organization_members
-- (Wave 1 must have added UNIQUE(org_id, id) to organization_members first)
ALTER TABLE pm_workspace_memberships
  ADD CONSTRAINT fk_pm_wsm_org_membership
  FOREIGN KEY (org_id, organization_membership_id)
  REFERENCES organization_members(org_id, id) NOT VALID;
```

**Batch D-6: Cross-module composite FKs**

These span module boundaries and require the parent module's Phase D to be complete:

```sql
-- timesheets → projects (cross-module)
ALTER TABLE timesheets
  ADD CONSTRAINT fk_timesheets_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id) NOT VALID;

-- timesheets → tickets (cross-module)
ALTER TABLE timesheets
  ADD CONSTRAINT fk_timesheets_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

-- kb_pages → projects (cross-module)
ALTER TABLE kb_pages
  ADD CONSTRAINT fk_kb_pages_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id) NOT VALID;

-- expenses → projects (cross-module)
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id) NOT VALID;
```

### D.3 — VALIDATE phase (non-blocking)

After each `NOT VALID` FK is added, schedule the corresponding `VALIDATE CONSTRAINT`
during a low-traffic window. Track validation state per constraint:

| State | Meaning |
|-------|---------|
| `NOT VALID` | Constraint added; new writes are checked; existing rows not yet scanned |
| `VALIDATING` | `VALIDATE CONSTRAINT` running |
| `VALID` | Full historical integrity confirmed; composite FK enforcement complete |

```sql
-- Run per constraint (non-blocking):
ALTER TABLE <table> VALIDATE CONSTRAINT fk_<table>_org_<col>;

-- Verify state:
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = '<table>'::regclass
  AND conname = 'fk_<table>_org_<col>';
-- convalidated must be TRUE
```

### Phase D gate

For each composite FK:

- `pg_constraint.convalidated = TRUE` for the FK.
- Zero cross-tenant rows exist:
  ```sql
  SELECT COUNT(*) FROM <table> t
  WHERE t.<parent_fk_col> IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM <parent> p
      WHERE p.org_id = t.org_id AND p.id = t.<parent_fk_col>
    );
  -- must return 0
  ```
- Quarantine table count reconciles (quarantined rows were reviewed / repaired /
  approved for deletion by the data owner).

- **Rollback:** `ALTER TABLE <table> DROP CONSTRAINT fk_<table>_org_<col>;`
  A `NOT VALID` constraint can be dropped at any time without consequence. A validated
  constraint can also be dropped, but re-adding it requires another `NOT VALID` + validate
  cycle. Keep the constraint but disable FK enforcement only under emergency maintenance:
  `ALTER TABLE <table> ALTER CONSTRAINT fk_... DEFERRABLE INITIALLY DEFERRED;`
  (temporary only; re-enable after incident resolution).

---

## Phase E — Billing `int → text` org_id shadow-column migration

**Scope:** Exactly four tables: `billing_profiles`, `app_installations`, `affiliates`,
`revenue_events`. No other module table is affected.

**Confirmed non-scope:** `finance-ar-ap.ts` tables already use `org_id text` with FK.
Do not touch them.

**This phase runs in parallel with Phase D (no dependency between them).**

### E.1 — Why a shadow column

The four billing tables use `org_id integer` (matching an old `organizations.id integer`
era). The canonical `organizations.id` is now `text`. A direct `ALTER COLUMN TYPE`
would lock the table for the full conversion duration and break all live queries
referencing the integer column. The safe path is a shadow column + dual-write.

### E.2 — Migration steps

```sql
-- Step 1: add shadow column (nullable, no FK yet)
ALTER TABLE billing_profiles
  ADD COLUMN org_id_text text;
ALTER TABLE app_installations
  ADD COLUMN org_id_text text;
ALTER TABLE affiliates
  ADD COLUMN org_id_text text;
ALTER TABLE revenue_events
  ADD COLUMN org_id_text text;

-- Step 2: backfill — cast the integer to text
-- (assuming organizations.id is already the text form of the former integer)
UPDATE billing_profiles SET org_id_text = org_id::text;
UPDATE app_installations SET org_id_text = org_id::text;
UPDATE affiliates SET org_id_text = org_id::text;
UPDATE revenue_events SET org_id_text = org_id::text;

-- Step 3: verify the text value matches organizations.id
SELECT COUNT(*) FROM billing_profiles bp
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = bp.org_id_text
);
-- If > 0: the integer IDs do not map 1:1 to organizations.id text values.
-- In this case, a join-lookup table is needed. Investigate before proceeding.

-- Step 4: add FK on shadow column
ALTER TABLE billing_profiles
  ADD CONSTRAINT billing_profiles_org_id_text_fk
  FOREIGN KEY (org_id_text) REFERENCES organizations(id);
-- repeat for the other three tables

-- Step 5: switch application code to dual-write (write both columns, read org_id_text)
-- This step is a backend code change, not a migration. Requires a deploy.

-- Step 6: shadow-read comparison — run for ≥7 days:
-- Application reads from org_id_text; run a background reconciliation query:
SELECT COUNT(*) FROM billing_profiles
WHERE org_id::text != org_id_text;
-- must be 0 every day for 7 consecutive days

-- Step 7: rename columns (rename old to _legacy, new to org_id)
BEGIN;
ALTER TABLE billing_profiles RENAME COLUMN org_id TO org_id_int_legacy;
ALTER TABLE billing_profiles RENAME COLUMN org_id_text TO org_id;
COMMIT;
-- repeat for the other three tables

-- Step 8: set NOT NULL on new org_id
ALTER TABLE billing_profiles ALTER COLUMN org_id SET NOT NULL;
-- repeat for the other three tables

-- Step 9: drop legacy column (after two releases with zero reads)
ALTER TABLE billing_profiles DROP COLUMN org_id_int_legacy;
-- repeat for the other three tables
```

### Phase E gate

- Zero rows in any billing table where `org_id_text` does not match an
  `organizations.id`.
- Shadow-read comparison returns 0 for 7 consecutive days including peak traffic.
- Previous app version still passes smoke with the renamed column (verify via staging).
- **Rollback (before Step 7):** Drop the shadow column and FK; revert to integer reads.
- **Rollback (after Step 7):** A forward-repair script reads the legacy column (still
  present as `org_id_int_legacy`) and re-populates `org_id` if the rename produced
  unexpected errors. Never re-add the integer FK after the text FK is in place.

---

## Phase F — RLS pilot on one low-risk tenant table

**Gate:** Phase F may not begin until the target table's composite FKs are fully
validated (`convalidated = TRUE`) and the RLS matrix for that table has been reviewed
and approved. This is the pilot for the broader Wave 9 RLS rollout.

**Target table:** `hr_helpdesk_comments` — chosen because it:
- Has low write volume (comments, not transactional records).
- Has `org_id` (present and NOT NULL).
- Is getting a composite FK to `helpdesk_tickets` in Phase D.
- Has no cascading cross-module dependencies that would complicate the policy.
- Contains no financial or payroll-sensitive data that would require additional policy
  complexity.

**Alternative candidate if `hr_helpdesk_comments` is not ready:** `biometric_logs`
(low write volume, self-contained, no cross-module refs).

### F.1 — RLS prerequisites checklist (must all pass before enabling)

- [ ] The application runtime role is NOT the table owner and does NOT have `BYPASSRLS`.
- [ ] A separate migration/DBA role owns the table and is never used for application traffic.
- [ ] Every application DB connection that touches this table runs inside an explicit
  `BEGIN`/`COMMIT` transaction block.
- [ ] The transaction sets `app.organization_id` and `app.organization_membership_id` as
  transaction-local GUCs via `SET LOCAL` before any query on the table.
- [ ] The policy helper function `current_tenant_id()` fails closed (returns NULL / raises)
  on empty or missing GUC:
  ```sql
  CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
    SELECT NULLIF(current_setting('app.organization_id', true), '');
  $$ LANGUAGE sql STABLE;
  ```
- [ ] The Neon pooler is configured for transaction-mode pooling (not session-mode).
  Session-mode would leak GUCs across connections.

### F.2 — Shadow observation helper (run first, before ENABLE RLS)

```sql
-- Create a shadow observation view — does NOT enforce anything:
CREATE OR REPLACE VIEW hr_helpdesk_comments_rls_shadow AS
SELECT
  id,
  org_id,
  org_id = current_tenant_id() AS would_pass_rls,
  now() AS checked_at
FROM hr_helpdesk_comments;

-- Run for 7 days. Every query against the real table should return rows where
-- would_pass_rls = true for all non-admin traffic. If any row has would_pass_rls = false
-- for a legitimate request, investigate before enabling RLS.
```

### F.3 — Enable RLS (non-FORCE first)

```sql
-- Enable without FORCE first; the table owner still sees all rows.
ALTER TABLE hr_helpdesk_comments ENABLE ROW LEVEL SECURITY;

-- Create tenant-isolation policy:
CREATE POLICY rls_hr_helpdesk_comments_tenant
  ON hr_helpdesk_comments
  AS PERMISSIVE
  FOR ALL
  TO <runtime_role>          -- the app's non-owner DB role
  USING (org_id = current_tenant_id())
  WITH CHECK (org_id = current_tenant_id());
```

### F.4 — Promote to FORCE RLS (after ≥7 days with zero cross-tenant reads)

```sql
-- FORCE causes even the table owner to be subject to the policy.
ALTER TABLE hr_helpdesk_comments FORCE ROW LEVEL SECURITY;
```

### F.5 — Negative tests (must pass before FORCE)

```sql
-- Test 1: cross-tenant read must return 0 rows
SET LOCAL app.organization_id = 'org-A';
SELECT COUNT(*) FROM hr_helpdesk_comments WHERE org_id = 'org-B';
-- must return 0

-- Test 2: missing GUC fails closed (returns 0 rows, not an error)
RESET app.organization_id;
SELECT COUNT(*) FROM hr_helpdesk_comments;
-- must return 0 (policy evaluates current_tenant_id() = NULL → no rows match)

-- Test 3: cross-tenant INSERT is blocked by WITH CHECK
SET LOCAL app.organization_id = 'org-A';
INSERT INTO hr_helpdesk_comments (org_id, ticket_id, body)
  VALUES ('org-B', 1, 'test');
-- must fail with ERROR: new row violates row-level security policy

-- Test 4: pool connection reuse cannot leak tenant context
-- Verify in the Neon console: GUCs do not persist across transaction boundaries
-- under transaction-mode pooling.
```

### Phase F gate

- All F.5 negative tests pass.
- `FORCE ROW LEVEL SECURITY` is set on the target table.
- Zero cross-tenant reads logged in the 7-day shadow observation period.
- The migration role (not the runtime role) was used for all DDL in this phase.
- A rollback procedure has been tested:
  ```sql
  ALTER TABLE hr_helpdesk_comments NO FORCE ROW LEVEL SECURITY;
  DROP POLICY rls_hr_helpdesk_comments_tenant ON hr_helpdesk_comments;
  ALTER TABLE hr_helpdesk_comments DISABLE ROW LEVEL SECURITY;
  ```
  — Rollback here does NOT restore cross-tenant data access because the
  composite FKs still enforce tenant isolation at the database level. RLS is
  defense-in-depth, not the primary isolation mechanism.

---

## Program-wide gates and rollback summary

| Phase | Entry gate | Exit gate | Rollback |
|-------|-----------|-----------|----------|
| A | Wave 0 matrices approved; no Phase C or D work started | 100% backfill; zero nulls; zero orphan org_ids; counts reconcile | `DROP COLUMN org_id` per table |
| B | Phase A complete for tables involved | Zero orphan FK values; constraint visible in `pg_constraint` | `DROP CONSTRAINT` per column |
| C | Phase B complete; Phase A complete; Wave 1 `organization_members` candidate key confirmed | `UNIQUE(org_id,id)` constraint in `pg_constraint`; zero duplicate pairs | `DROP CONSTRAINT` per table |
| D | Phase C complete for the specific parent; Phase B complete for bare FK cols | `convalidated = TRUE`; zero cross-tenant rows | `DROP CONSTRAINT fk_...` |
| E | No dependency on A–D; run in parallel | 7-day shadow parity; zero mismatches; `NOT NULL` on new column | Drop shadow column and FK; read integer column |
| F | Phase D validated for target table; RLS matrix row approved; runtime/owner role separation confirmed | All F.5 tests pass; `FORCE RLS` set | Disable policy + disable RLS (composite FKs remain) |

### Global rollback principle

Every phase produces additive changes only (new columns, new constraints, new indexes).
No existing column, index, or constraint is dropped until the corresponding shadow-read
or validation period has passed and owner approval is given. The pattern is always:
**expand → backfill → constrain → observe → retire legacy**, never a destructive
cut-over.

---

## Phase counts summary

| Phase | Domain | Estimated table count |
|-------|--------|----------------------|
| A — Add missing org_id | HR | 25 tables |
| A — Add missing org_id | Inventory lines | 18 tables |
| A — Add missing org_id | Project junctions | 10 tables |
| A — Add missing org_id | CRM lines | 5 tables |
| A — Add missing org_id | Chat | 8 tables |
| A — Add missing org_id | Support/KB junctions | 2 tables |
| **A total** | | **~68 tables** |
| B — Add bare `.references()` | HR | 23 FK gaps across 14 tables |
| B — Add bare `.references()` | Inventory | ~20 FK gaps across 10 tables |
| B — Add P1/P2 defect FKs | PM/CRM/KB/Support | 11 FK gaps |
| **B total** | | **~54 FK gaps across ~35 tables** |
| C — Add `UNIQUE(org_id, id)` | All domains (C.1–C.5) | **~110 parent tables** |
| D — Add composite FKs | All domains (D.2–D.6) | **~270 composite FK declarations** |
| E — Billing int→text shadow | Billing only | 4 tables |
| F — RLS pilot | 1 low-risk table | 1 table |

**Total tables touched across Wave 4:** approximately 300+ distinct tables across all
six phases. This is the largest single structural migration in the StreamlineOS program.
It must be executed in domain-batched migrations (one Drizzle migration file per
domain cluster) rather than one monolithic migration.

### Recommended migration file batching

| Migration file | Contents |
|---------------|----------|
| `0200_phase_a_hr_org_id.ts` | All Phase A HR tables |
| `0201_phase_a_inventory_org_id.ts` | All Phase A inventory line tables |
| `0202_phase_a_crm_pm_chat_org_id.ts` | Phase A CRM, PM, Chat, Support/KB tables |
| `0203_phase_b_hr_bare_fks.ts` | All Phase B HR bare FK columns |
| `0204_phase_b_inventory_bare_fks.ts` | All Phase B inventory bare FK columns |
| `0205_phase_b_p1_defect_fks.ts` | P1/P2 defect FKs from ID-transition matrix |
| `0206_phase_c_hr_candidate_keys.ts` | All Phase C HR parent candidate keys |
| `0207_phase_c_inventory_candidate_keys.ts` | All Phase C inventory parent candidate keys |
| `0208_phase_c_crm_pm_candidate_keys.ts` | All Phase C CRM/PM/Support/KB candidate keys |
| `0209_phase_c_accounting_candidate_keys.ts` | All Phase C accounting candidate keys |
| `0210_phase_d_hr_composite_fks.ts` | All Phase D HR composite FKs (NOT VALID) |
| `0211_phase_d_inventory_composite_fks.ts` | All Phase D inventory composite FKs (NOT VALID) |
| `0212_phase_d_crm_pm_composite_fks.ts` | All Phase D CRM/PM composite FKs (NOT VALID) |
| `0213_phase_d_support_kb_chat_composite_fks.ts` | All Phase D support/KB/chat composite FKs |
| `0214_phase_d_cross_module_composite_fks.ts` | Cross-module composite FKs (timesheets, expenses, etc.) |
| `0215_phase_e_billing_shadow_column.ts` | Phase E billing shadow column + backfill |
| `0216_phase_d_validate_hr.ts` | `VALIDATE CONSTRAINT` for all HR composite FKs |
| `0217_phase_d_validate_inventory.ts` | `VALIDATE CONSTRAINT` for all inventory composite FKs |
| `0218_phase_d_validate_crm_pm.ts` | `VALIDATE CONSTRAINT` for all CRM/PM composite FKs |
| `0219_phase_e_billing_rename_cutover.ts` | Phase E: column rename + NOT NULL after 7-day parity |
| `0220_phase_f_rls_pilot.ts` | Phase F: ENABLE + FORCE RLS on pilot table |

Each migration file must include a `down` function that reverses only its own changes,
and each must be applied in order with no skips. `db:push` is prohibited — only
`db:migrate` in CI.
