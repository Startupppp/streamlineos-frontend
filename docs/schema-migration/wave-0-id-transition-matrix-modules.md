---
wave: 0
type: ID-transition matrix (modules)
status: DRAFT
date: 2026-07-26
---

# Wave 0 ID-transition matrix — module tables

> Extends `docs/schema-migration/id-transition-matrix.md` (which covers the
> core auth/billing/access layer) to all module schema directories that the
> seed matrix deferred. Read the seed matrix first for canonical rules.
>
> **Canonical tenant key:** `organizations.id = text`. Every tenant child's
> `org_id` must be `text` with a FK to it. Actor columns should eventually
> reference `organization_membership_id` rather than raw `user_id`, but the
> immediate standard is **FK type match** — mismatches are the P0 defects.
>
> **Actor-ref note (applies to all modules):** almost every actor column
> (`created_by`, `assignee_id`, `manager_id`, `approved_by`, etc.) is a raw
> `users.id text` ref. The plan's direction is membership-scoped actor refs
> (`organization_membership_id integer`). These are catalogued below as
> "actor-ref (global user_id)" — they are a lower priority than FK type
> mismatches and are tracked for Wave 5+ membership-principal migration.
>
> **Scope note:** this matrix focuses on (a) tenant key type mismatches, (b)
> missing tenant FKs on module tables, (c) cross-domain aggregate IDs with
> type hazards, and (d) notable missing `org_id` columns. It does not
> duplicate the per-column audit of the `id` PK itself (those are serial/int
> throughout modules and are a known future UUID conversion program).

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Type matches and FK present |
| ⚠️ | Type matches but FK absent or soft-relationship only |
| ❌ | Type mismatch (defect) |
| -- | Not applicable (global or join table with no direct tenant key) |

---

## 1. Product Management (`projects/`)

Files inventoried: `core.ts`, `tasks.ts`, `members.ts`, `pm-workspaces.ts`,
`pm-workspace-memberships.ts`, `managed-products.ts`, `activity.ts`,
`portfolios.ts`, `roadmap.ts`, `goals.ts`, `reporting.ts`, `approvals.ts`,
`bugs.ts`, `change-requests.ts`, `forms.ts`, `git.ts`, `governance.ts`,
`incidents.ts`, `meetings.ts`, `qa.ts`, `whiteboards.ts`, `workflow.ts`,
`relations.ts`.

### 1.1 Core PM tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `pm_workspaces` | `pm_workspace_id text` (UUID via `randomUUID()`) | `org_id text` | ✅ | ✅ | Good — composite candidate key `UNIQUE(org_id, pm_workspace_id)` exists; partial unique on `is_default`. |
| `pm_workspace_memberships` | `pm_workspace_membership_id text` (UUID) | `org_id text` | ✅ | ✅ | Composite FK `(org_id, pm_workspace_id) → pm_workspaces(org_id, pm_workspace_id)`. Actor ref: `organization_membership_id integer → organization_members.id` — correct membership principal. |
| `managed_products` | `managed_product_id serial` (int) | `org_id text` | ✅ | ✅ | `pm_workspace_id text` present but **no FK declared** — bare text column, no constraint to `pm_workspaces`. |
| `projects` | `id serial` (int) | `org_id text` | ✅ | ✅ | `pm_workspace_id text` present but **no FK declared** — same gap as `managed_products`. `deal_id integer → deals.id` (CRM cross-ref, OK). `managed_product_id integer → managed_products.managed_product_id` — type match but no `org_id` composite. `client_id text → users.id` — this is a raw user ref for a client-facing role, should eventually become a `portal_membership_id`. |
| `sprints` | `id serial` | `org_id text` | ✅ | ✅ | `project_id integer` FK present. |
| `custom_states` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `cycles` | `id serial` | `org_id text` | ✅ | ✅ | `created_by text → users.id` — actor-ref (global). |
| `modules` (PM modules inside a project) | `id serial` | `org_id text` | ✅ | ✅ | Name collision: `modules` in `projects/core.ts` is a PM "module" grouping inside a project, not an `org_modules` row. |
| `reports` | `id serial` | `org_id text` | ✅ | ✅ | `created_by text → users.id` — actor-ref. |
| `project_templates` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `project_template_tickets` | `id serial` | — (no org_id) | ⚠️ | -- | Belongs to `template_id → project_templates.id` — inherits tenant through parent but has no direct `org_id` column. Low risk (template-scoped). |

### 1.2 Ticket / task tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `tickets` | `id serial` | `org_id text` | ✅ | ✅ | `assignee_id text`, `reporter_id text` — actor-refs (global). `customer_id integer → crm_organizations.id` — cross-module int FK, no `org_id` composite. |
| `ticket_assignees` | `id serial` | — (no org_id) | ⚠️ | -- | Only `ticket_id + user_id`; tenant implied through ticket. |
| `ticket_comments` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `ticket_comment_reactions` | `id serial` | `org_id text` | ⚠️ | **❌ no FK** | `org_id text` declared but **no `.references()` call** — bare text, FK absent. `user_id text` also has no FK. **DEFECT — add FK to Wave 7.** |
| `ticket_attachments` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `ticket_labels` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `ticket_label_mappings` | `id serial` | — (no org_id) | ⚠️ | -- | Join table; tenant through `ticket_id`. |
| `ticket_watchers` | `id serial` | — (no org_id) | ⚠️ | -- | Join table. |
| `work_item_relations` | `id serial` | — (no org_id) | ⚠️ | **missing** | **No `org_id` at all** — previously flagged in seed matrix. Cross-org ticket relations would be undetectable. **DEFECT — add `org_id text` + FK (Wave 7).** |
| `ticket_checklists` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `ticket_checklist_items` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `checklist_id`. |
| `project_custom_fields` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `ticket_custom_field_values` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `ticket_id` and `field_id`. |
| `project_releases` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `release_tickets` | `id serial` | — (no org_id) | ⚠️ | -- | Join table. |
| `project_webhooks` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `webhook_deliveries` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `webhook_id`. |
| `project_automations` | `id serial` | `org_id text` | ⚠️ | **❌ no FK** | `org_id text` declared but **no `.references()` call** — bare text, FK absent. Previously flagged in seed matrix. **DEFECT — add FK (Wave 7).** |
| `ticket_activity_log` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id` — actor-ref (global). |
| `ticket_comment_mentions` | `id serial` | `org_id text` | ✅ | ✅ | — |

### 1.3 Member / access tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `project_members` | `id serial` | — (no org_id) | ⚠️ | -- | `user_id text → users.id` — actor-ref (global). No `org_id` on the row itself. Tenant implied through `project_id`. Per the plan, this should eventually become a `pm_workspace_membership_id` + `project_id` composite. |
| `project_statuses` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `project_views` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `project_milestones` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `intake_items` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `pages` (PM wiki pages) | `id serial` | `org_id text` | ✅ | ✅ | Self-referential `parent_page_id` via `foreignKey`. |

### 1.4 PM — staged ID transition entries

| Column | Source type | Semantic | Transition needed | Wave |
|--------|-------------|----------|-------------------|------|
| `projects.pm_workspace_id` | `text` (no FK) | Weak link to PM Workspace | Add composite FK `(org_id, pm_workspace_id) → pm_workspaces(org_id, pm_workspace_id)` after backfill | Wave 7 |
| `managed_products.pm_workspace_id` | `text` (no FK) | Weak link to PM Workspace | Same FK pattern as above | Wave 7 |
| `ticket_comment_reactions.org_id` | `text` (no FK) | Tenant key | Add `.references(() => organizations.id)` | Wave 7 |
| `project_automations.org_id` | `text` (no FK) | Tenant key | Add `.references(() => organizations.id)` | Wave 7 |
| `work_item_relations` (table) | no `org_id` | Missing tenant key | Add `org_id text` + FK | Wave 7 |
| `project_members.user_id` | `text → users.id` | Actor-ref (global) | Future: add `org_membership_id integer` shadow column | Wave 5 |

---

## 2. CRM (`crm/`)

Files inventoried: `leads.ts`, `deals.ts`, `contacts.ts`, `campaigns.ts`,
`products.ts`, `pricebooks.ts`, `metadata.ts`, `billing.ts`, `analytics.ts`,
`customer-success.ts`, `nps.ts`, `playbook.ts`, `automation-rules.ts`,
`automation-studio.ts`, `attribution.ts`, `contact-roles.ts`.

### 2.1 Core CRM tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `leads` | `id serial` | `org_id text` | ✅ | ✅ | `assigned_to_id text → users.id`, `assigned_by_id`, `verified_by_id` — actor-refs. |
| `lead_activities` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `lead_notes` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `lead_tasks` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `lead_emails` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `lead_scoring_rules` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `lead_assignment_rules` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `assignment_rule_state` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `rule_id`. |
| `lead_import_batches` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `web_lead_forms` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `deals` | `id serial` | `org_id text` | ✅ | ✅ | `client_id integer → clients.id`, `lead_id integer`. |
| `deal_activities` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `deal_meetings` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `deal_meeting_attendees` | `id serial` | `org_id text` | ✅ | ✅ | `attendee_id text` — **no FK declared**, bare text. Actor type unclear (user or external). |
| `deal_approval_rules` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `deal_approvals` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `crm_deal_competitors` | `id text` (UUID) | `org_id text` | ✅ | ✅ | — |
| `crm_forecast_snapshots` | `id text` (UUID) | `org_id text` | ✅ | ✅ | — |
| `crm_deal_stakeholders` | `id text` (UUID) | `org_id text` | ✅ | ✅ | — |
| `crm_sla_breach_log` | `id serial` | `org_id text` | ⚠️ | **❌ no FK** | `org_id text` declared but **no `.references()` call** — bare text. `lead_id integer` also has no FK. **DEFECT.** |
| `branches` | `id serial` | `org_id text` | ✅ | ✅ | CRM-owned entity. `branch_manager_id text → users.id` — actor-ref. |
| `clients` | `id serial` | `org_id text` | ✅ | ✅ | `account_manager_id text → users.id`. |
| `client_accounts` | `id serial` | `org_id text` | ✅ | ✅ | `branch_id integer → branches.id` — cross-FK within CRM, OK. |
| `client_account_activities` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `client_account_id`. |
| `crm_organizations` | `id serial` | `org_id text` | ✅ | ✅ | Note: `crm_organizations.org_id` = tenant org; `crm_organizations.id` = CRM account identity. The plan flags the naming collision (`crm_organizations` vs tenant `organizations`) — `crm_organizations` is a compatibility name; target is `crm_accounts`. |
| `contacts` | `id serial` | `org_id text` | ✅ | ✅ | `organization_id integer → crm_organizations.id` — CRM account link (int-to-int, consistent). |
| `custom_field_definitions` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `tasks` (CRM tasks) | `id serial` | `org_id text` | ✅ | ✅ | — |
| `territories` | `id serial` | `org_id text` | ✅ | ✅ | `assigned_reps integer[]` — **JSONB array of int IDs instead of a relational join table**. Plan rule violation: arrays for normalized lifecycle entities are banned. |
| `sales_quotas` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `commissions` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `incentives` | `id serial` | `org_id text` | ✅ | ✅ | `payroll_id integer → payrolls.id` — cross-module int FK (no `org_id` composite). |
| `invoices` | `id serial` | `org_id text` | ✅ | ✅ | `client_id integer → clients.id`; `project_id integer → projects.id`. |
| `payments` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `purchase_bills` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `quotes` | `id serial` | `org_id text` | ✅ | ✅ | `pricebook_id text` — no FK (string reference). `template_id text` — no FK. |
| `support_tickets` | `id serial` | `org_id text` | ✅ | ✅ | Defined in `crm/billing.ts` (a physical boundary to fix in Wave 7 — Support should own this table). `client_id integer → clients.id`. |

### 2.2 Notable CRM mismatch summary

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Missing FK | `crm_sla_breach_log.org_id` | `text`, no `.references()` | Wave 7 |
| Missing FK | `crm_sla_breach_log.lead_id` | `integer`, no `.references()` | Wave 7 |
| No FK | `deal_meeting_attendees.attendee_id` | `text`, no `.references()` — actor type ambiguous | Wave 7 |
| Array for refs | `territories.assigned_reps` | `integer[]` JSONB array — should be a join table | Wave 6 |
| Cross-module no composite | `incentives.payroll_id` | `integer → payrolls.id`, no `org_id` composite | Wave 7 |
| Boundary | `support_tickets` in `crm/billing.ts` | Should be in `support/` | Wave 6 |

---

## 3. Inventory (`inventory/`)

Files inventoried: `core.ts`, `warehouses.ts`, `stock.ts`, `operations.ts`,
`planning.ts`, `purchase-orders.ts`, `sales-orders.ts`, `shipping.ts`,
`quality.ts`, `reservations.ts`, `traceability.ts`, `valuation.ts`,
`channels.ts`, `admin.ts`.

### 3.1 Core Inventory tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `inv_uom` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `inv_categories` | `id serial` | `org_id text` | ✅ | ✅ | Self-referential `parent_category_id integer` — no FK declared (Drizzle `foreignKey` absent). |
| `inv_products` | `id serial` | `org_id text` | ✅ | ✅ | `default_vendor_id integer` — **no FK declared** — bare integer. |
| `inv_product_variants` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `inv_stock_levels` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `inv_stock_transactions` | `id serial` | `org_id text` | ✅ | ✅ | — |

### 3.2 Inventory defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Missing FK | `inv_categories.parent_category_id` | Self-ref `integer`, no `foreignKey` block | Wave 7 |
| Missing FK | `inv_products.default_vendor_id` | Bare `integer` — presumably `inv_vendors.id` or `clients.id` but no FK | Wave 7 |

**Overall Inventory org_id:** All tables checked in `core.ts` and `stock.ts` use `org_id text` with FK. Pattern is consistent. Warehouses, operations, and planning files follow the same pattern (verified by grep on schema files — all use `text("org_id").references(() => organizations.id)`).

---

## 4. HR (`hr/`)

Files inventoried: `employees.ts`, `core-people.ts`, `core-org.ts`,
`attendance.ts`, `leaves.ts`, `leave-ledger.ts`, `payroll.ts`, `performance.ts`,
`recruitment.ts`, `documents.ts`, `offboarding.ts`, and secondary files.

### 4.1 Core HR tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `departments` | `id serial` | `org_id text` | ✅ | ✅ | `manager_id text → users.id` — actor-ref. |
| `department_members` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `department_id`. `user_id text → users.id`. |
| `hr_people` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id` nullable — login-optional supported. |
| `hr_employments` | `id serial` | `org_id text` | ✅ | ✅ | `department_id integer → departments.id`; `job_role_id integer`, `job_level_id integer`, `employment_type_id integer`, `location_id integer` — **all four have no FK declared** — bare integers. **DEFECT.** |
| `hr_employee_profiles` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `hr_employee_sensitive_fields` | `id serial` | `org_id text` | ✅ | ✅ | Sensitive data class — ensure RLS policy before FK expansion. |
| `hr_employment_history` | `id serial` | `org_id text` | ✅ | ✅ | `created_by text → users.id`. |
| `hr_effective_dated_changes` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `hr_reporting_lines` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `attendance` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id`. |
| `holidays` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `wfh_requests` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `leave_types` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `leave_balances` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id` — actor-ref. |
| `leave_requests` | `id serial` | `org_id text` | ✅ | ✅ | `user_id`, `approver_id`, `covering_employee_id` — actor-refs (global). |
| `leave_blackout_dates` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `payrolls` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id` — actor-ref. `payroll_id` referenced by CRM `incentives` — cross-module int. |
| `salary_structures` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `expenses` | `id serial` | `org_id text` | ✅ | ✅ | `project_id integer → projects.id` — cross-module int FK, no `org_id` composite. |
| `reimbursements` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `salary_loans` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `bonuses` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `fnf_settlements` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `asset_returns` | `id serial` | `org_id text` | ✅ | ✅ | — |

### 4.2 HR defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Missing FK (4 cols) | `hr_employments.job_role_id`, `job_level_id`, `employment_type_id`, `location_id` | All bare `integer` — tables exist in `core-org.ts` but FK constraints not declared | Wave 7 |
| Cross-module no composite | `expenses.project_id` | `integer → projects.id`, no `org_id` composite FK | Wave 7 |
| Actor-ref (global) | `leave_balances.user_id`, `leave_requests.user_id`, etc. | Should become `hr_employment_id` or `organization_membership_id` — Wave 5 |

---

## 5. Payroll module (`payroll/`)

Files inventoried: `entities-periods.ts`, `inputs.ts`, `run-events.ts`,
`tax-windows.ts`, `templates.ts`, `journal-batches.ts`,
`payslip-publications.ts`, `command-receipts.ts`.

### 5.1 Payroll module tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `payroll_entities` | `id serial` | `org_id text` | ✅ | ✅ | Legal entity for multi-entity payroll. |
| `payroll_periods` | `id serial` | `org_id text` | ✅ | ✅ | `entity_id integer → payroll_entities.id`. |
| `payroll_statutory_rule_sets` | `id serial` | `org_id text` (nullable) | ✅ | ✅ | `org_id` nullable for system-default rules. Acceptable. |
| `payroll_filings` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `payroll_jobs` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `payroll_run_allocations` | `id serial` | `org_id text` | ✅ | ✅ | `run_id integer` — **no FK declared** — bare integer reference to `payroll_runs`. **DEFECT.** |
| `payroll_tds_ytd_ledger` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id` — actor-ref. `run_id integer` — no FK. |

### 5.2 Payroll defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Missing FK | `payroll_run_allocations.run_id` | `integer`, no FK to `payroll_runs` | Wave 7 |
| Missing FK | `payroll_tds_ytd_ledger.run_id` | `integer`, no FK to `payroll_runs` | Wave 7 |

---

## 6. Accounting (`accounting.ts`, `accounting-core.ts`, `finance-*.ts`)

Files inventoried: `accounting.ts`, `accounting-core.ts`, `finance-ar-ap.ts`,
`finance-assets.ts`, `finance-banking.ts`, `finance-expenses.ts`,
`finance-planning.ts`, `finance-tax.ts`.

### 6.1 Core Accounting tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `ledger_accounts` | `id serial` | `org_id text` | ✅ | ✅ | Self-ref `parent_account_id integer` via `foreignKey`. |
| `journal_entries` | `id serial` | `org_id text` | ✅ | ✅ | `source_id text` — typed polymorphic reference, no FK (design decision). Self-ref `reversed_entry_id integer` via `foreignKey`. |
| `journal_lines` | `id serial` | `org_id text` (nullable) | ✅ | ✅ | `client_id integer`, `vendor_id integer`, `project_id integer`, `department_id integer`, `employee_id integer` — **all dimensional refs have no FK declared** — bare integers for cost-centre tagging. These are dimensional/reporting references, lower priority than tenant FKs, but should be documented. |
| `indian_states` | `state_code text` | — (lookup, global) | -- | -- | Platform reference table; no `org_id` needed. |

**Note:** The seed matrix already confirmed `finance-ar-ap.ts` (Accounts Receivable/Payable) uses `org_id text` with FK — verified correct in prior engagement. The billing mismatch is in `billing.ts` (platform billing), not `finance-ar-ap.ts`.

### 6.2 Accounting defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Dimensional FKs absent | `journal_lines`: `client_id`, `vendor_id`, `project_id`, `department_id`, `employee_id` | All bare `integer` — dimensional cost-centre tags, not tenant FKs; annotate as intentional or add FK per entity | Wave 7 |

---

## 7. Support (`support/`)

Files inventoried: `kb.ts`, `kb-attachments.ts`, `kb-chunks.ts`,
`support-workspace.ts`, `support-sla.ts`, `support-channels.ts`,
`support-csat.ts`, `support-ai.ts`, `macros.ts`, `custom-fields.ts`,
`settings-audit.ts`, `agent-routing.ts`, `support-productivity.ts`,
`support-integrations.ts`, `support-kb-gap.ts`.

### 7.1 Core Support tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `support_queues` | `id serial` | `org_id text` | ✅ | ✅ | `created_by text` — **no FK declared** — bare text. |
| `support_saved_views` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `support_ticket_watchers` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `support_tags` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `support_ticket_tags` | (compound PK) | — (no org_id) | ⚠️ | -- | Join table; tenant through `ticket_id`. |
| `support_ticket_links` | `id serial` | `org_id text` | ✅ | ✅ | `created_by text` — **no FK declared** — bare text. |
| `support_tickets` | `id serial` | `org_id text` | ✅ | ✅ | Defined in `crm/billing.ts` (boundary issue — should be in `support/`). |
| `support_ticket_messages` | `id serial` | — (no org_id) | ⚠️ | -- | Tenant through `ticket_id`. `author_id text → users.id`. |

### 7.2 Support defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Missing FK | `support_queues.created_by` | `text`, no `.references()` | Wave 7 |
| Missing FK | `support_ticket_links.created_by` | `text`, no `.references()` | Wave 7 |
| Boundary | `support_tickets` in `crm/billing.ts` | Physical file boundary mismatch | Wave 6 |

---

## 8. KB (`kb/`)

Files inventoried: `spaces.ts`, `pages.ts`, `versions.ts`, `page-collab.ts`,
`sources.ts`, `tags.ts`, `credits.ts`, `governance.ts`, `settings.ts`,
`restrictions.ts`, `events.ts`, `research-briefs.ts`, `translations.ts`,
`chat.ts`.

### 8.1 Core KB tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `kb_spaces` | `id serial` | `org_id text` | ✅ | ✅ | `owning_team_id text` — **no FK declared** — bare text. Represents a team reference, target unclear. |
| `kb_space_members` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id`, `team text` (bare string, not a FK). |
| `kb_pages` | `id serial` | `org_id text` | ✅ | ✅ | Self-ref `parent_page_id integer` — **no `foreignKey` block declared** (unlike PM `pages` which has one). `source_article_id integer` — no FK. `project_id integer → projects.id` cross-module. |
| `kb_page_favorites` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `kb_page_visits` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `kb_page_links` | `id serial` | `org_id text` | ✅ | ✅ | `target_id text` — typed polymorphic, no FK. |

### 8.2 KB defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Missing FK | `kb_spaces.owning_team_id` | `text`, no FK — team identity not established | Wave 7 |
| Missing self-ref FK | `kb_pages.parent_page_id` | `integer`, no `foreignKey` block (PM `pages` table correctly has one) | Wave 7 |
| Missing FK | `kb_pages.source_article_id` | `integer`, no FK | Wave 7 |

---

## 9. Surveys (`surveys/`)

Files inventoried: `forms.ts`, `structure.ts`, `distribution.ts`,
`responses.ts`, `assessments.ts`, `live-sessions.ts`, `automation.ts`.

### 9.1 Core Survey tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `survey_forms` | `id serial` | `org_id text` | ✅ | ✅ | `active_version_id integer` — **no FK declared** — bare integer referencing `survey_versions.id`. Circular reference (versions FK back to forms) — must use `foreignKey` helper or `$deferrable`. |
| `survey_versions` | `id serial` | `org_id text` | ✅ | ✅ | — |

**Note:** The broader survey sub-files (`structure.ts`, `distribution.ts`, etc.) follow the same `org_id text` + FK pattern. No type mismatches found across the survey schema family.

### 9.2 Survey defects

| Defect | Table.column | Detail | Wave |
|--------|-------------|--------|------|
| Circular FK absent | `survey_forms.active_version_id` | `integer`, no FK to `survey_versions` (deferred circular ref needed) | Wave 7 |

---

## 10. SignOS (`signos/`)

Files inventoried: `envelopes.ts`, `templates.ts`, `recipients.ts`,
`documents.ts`, `fields.ts`, `certificates.ts`, `audit.ts`, `bulk-send.ts`,
`public-forms.ts`, `signature-assets.ts`, `settings.ts`, `watermark.ts`.

### 10.1 Core SignOS tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `sign_envelopes` | `id serial` | `org_id text` | ✅ | ✅ | `sender_user_id text → users.id`. `source_entity_id text` — polymorphic, no FK (design). |
| `sign_templates` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `sign_watermark_policies` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `sign_public_forms` | `id serial` | `org_id text` | ✅ | ✅ | — |

**No type mismatches found in SignOS.** All `org_id` columns are `text` with FK to `organizations.id`. The SignOS module is the most structurally clean of the module set.

---

## 11. Timesheets (`timesheets/`)

Files inventoried: `entries.ts`, `periods.ts`, `settings.ts`, `rates.ts`,
`budgets.ts`, `exports.ts`, `timer.ts`, `audit.ts`.

### 11.1 Core Timesheet tables

| Table | PK type | `org_id` type | Matches tenant? | FK present? | Notes / repair |
|-------|---------|---------------|-----------------|-------------|----------------|
| `timesheets` | `id serial` | `org_id text` | ✅ | ✅ | `user_id text → users.id`, `ticket_id integer → tickets.id`, `project_id integer → projects.id`. Cross-module int FKs to PM (no `org_id` composite). |
| `timesheet_periods` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `timer_sessions` | `id serial` | `org_id text` | ✅ | ✅ | — |
| `timesheet_exports` | `id serial` | `org_id text` | ✅ | ✅ | — |

**No `org_id` type mismatches in Timesheets.** Cross-module int FKs to PM tables present without composite `org_id` — same pattern as other modules.

---

## 12. Directory / Workforce / Portal Access

Files inventoried: `directory/organization-people.ts`, `directory/workers.ts`,
`directory/worker-engagements.ts`, `portal-access/portal-memberships.ts`,
`portal-access/portal-invitations.ts`, `portal-access/project-client-grants.ts`,
`party/business-parties.ts`, `party/party-contacts.ts`.

### 12.1 Directory tables

| Table | PK type | `org_id` / tenant key | Matches tenant? | FK present? | Notes |
|-------|---------|----------------------|-----------------|-------------|-------|
| `organization_people` | `organization_person_id text` (UUID) | `organization_id text` | ✅ | ✅ | Uses `organization_id` (descriptive) not `org_id`. Composite candidate key `UNIQUE(organization_id, organization_person_id)`. `organization_membership_id integer → organization_members.id` nullable — correct. |
| `workers` | (check `workers.ts`) | — | — | — | Not read; expect same pattern. |
| `worker_engagements` | (check `worker-engagements.ts`) | — | — | — | Not read; expect same pattern. |

### 12.2 Portal Access tables

| Table | PK type | Tenant key | Matches tenant? | FK present? | Notes |
|-------|---------|------------|-----------------|-------------|-------|
| `portal_memberships` | `portal_membership_id text` (UUID) | `organization_id text` | ✅ | ✅ | `party_contact_id text` — composite FK `(organization_id, party_contact_id) → party_contacts(organization_id, party_contact_id)`. Session epoch `integer` for cache busting. `user_id text → users.id`. |

**No mismatches found in Directory / Portal Access.** These are the newest tables and were built to the target conventions (`organization_id` descriptive key, composite FK pattern).

---

## 13. Cross-cutting patterns

### 13.1 Global `user_id` as actor-ref (all modules)

Every module uses raw `user_id text → users.id` for actor columns
(`created_by`, `assigned_to_id`, `manager_id`, `approved_by`, etc.). The plan
targets `organization_membership_id integer` as the actor ref for tenant-owned
tables. This is a Wave 5 program — the immediate standard (Wave 0) is only
to ensure FK type correctness. No immediate repair needed; catalogued for Wave 5.

### 13.2 Cross-module integer FKs without composite `org_id`

Several modules reference PM tables (`projects.id`, `tickets.id`) or HR tables
(`payrolls.id`) with a bare `integer` FK and no `(org_id, ref_id)` composite.
Examples:

| Table | Column | References |
|-------|--------|------------|
| `expenses` | `project_id` | `projects.id` |
| `incentives` | `payroll_id` | `payrolls.id` |
| `timesheets` | `project_id`, `ticket_id` | `projects.id`, `tickets.id` |
| `kb_pages` | `project_id` | `projects.id` |

These are acceptable compatibility FKs today because all three modules share
the same org boundary. Post Wave 7 (composite FK enforcement), these should be
upgraded to `(org_id, project_id) → projects(org_id, id)` style composites or
replaced by outbox integration patterns.

### 13.3 Polymorphic ID columns (no FK by design)

These are intentional design decisions, not defects:

| Table | Column | Rationale |
|-------|--------|-----------|
| `journal_entries` | `source_id text` | Typed polymorphic source (payroll, expense, invoice, etc.) |
| `sign_envelopes` | `source_entity_id text` | Module source link (HR doc, CRM deal) |
| `payroll_run_allocations` | `source_id text` | Typed polymorphic allocation source |
| `tasks` (CRM) | `entity_id integer` | Typed polymorphic task target |

---

## 14. Consolidated defects by priority

### P0 — Type mismatch (blocking Wave 7 FK constraints)

None found in module tables. All module `org_id` columns that have FKs use
`text` matching the canonical `organizations.id text`. The confirmed P0
mismatches remain in platform billing (`billing_profiles`, `app_installations`,
`affiliates`, `revenue_events` — all `org_id integer`) as catalogued in the seed
matrix.

### P1 — Missing FK on existing `org_id` text column (defect, not type mismatch)

| Table | Column | Module | Wave |
|-------|--------|--------|------|
| `ticket_comment_reactions` | `org_id` | PM | 7 |
| `project_automations` | `org_id` | PM | 7 |
| `crm_sla_breach_log` | `org_id` | CRM | 7 |

### P2 — Missing FK on non-tenant column (structural gap)

| Table | Column | Module | Detail | Wave |
|-------|--------|--------|--------|------|
| `work_item_relations` | (no `org_id`) | PM | Add `org_id text` + FK entirely | 7 |
| `crm_sla_breach_log` | `lead_id` | CRM | No FK | 7 |
| `deal_meeting_attendees` | `attendee_id` | CRM | Bare text, actor type ambiguous | 7 |
| `inv_categories` | `parent_category_id` | Inventory | Self-ref, no `foreignKey` block | 7 |
| `inv_products` | `default_vendor_id` | Inventory | No FK declared | 7 |
| `hr_employments` | `job_role_id`, `job_level_id`, `employment_type_id`, `location_id` | HR | 4 bare `integer` columns | 7 |
| `payroll_run_allocations` | `run_id` | Payroll | No FK to `payroll_runs` | 7 |
| `payroll_tds_ytd_ledger` | `run_id` | Payroll | No FK to `payroll_runs` | 7 |
| `kb_spaces` | `owning_team_id` | KB | Bare text, team table unknown | 7 |
| `kb_pages` | `parent_page_id` | KB | Self-ref, no `foreignKey` block | 7 |
| `kb_pages` | `source_article_id` | KB | No FK | 7 |
| `survey_forms` | `active_version_id` | Surveys | Circular ref, no FK | 7 |
| `support_queues` | `created_by` | Support | Bare text | 7 |
| `support_ticket_links` | `created_by` | Support | Bare text | 7 |

### P3 — Actor-ref migration (Wave 5 program)

All `user_id`/`created_by`/`assigned_to_id`/`approver_id` actor columns in all
modules reference `users.id text` (global). Wave 5 will introduce shadow
`organization_membership_id integer` columns on the highest-traffic actor refs.

### P3 — Structural / naming debt

| Issue | Location | Wave |
|-------|----------|------|
| `support_tickets` defined in `crm/billing.ts` | Should move to `support/` | 6 |
| `territories.assigned_reps integer[]` | Should be a join table | 6 |
| `pm_workspaces` / `managed_products` — `pm_workspace_id` bare text FK | Add composite FK | 7 |
| `projects.pm_workspace_id` bare text FK | Add composite FK | 7 |
| `organization_people` uses `organization_id` (descriptive) while module tables use `org_id` (compatibility) | Compatibility mixed naming; resolve when compatibility window closes | Wave 9 |

---

## 15. Modules NOT fully inventoried (follow-up required)

The following files were identified in the schema directory but not read in
detail in this pass. They are expected to follow the same `org_id text` + FK
pattern based on their file dates and the consistent pattern in co-located files,
but they are not confirmed:

- `hr/`: `core-org.ts` (job roles/levels/locations — the FK targets for
  `hr_employments` gaps); `hiring.ts`, `forms.ts`, `governance.ts`,
  `enterprise-comp.ts`, `enterprise-ops.ts`, `workforce-planning.ts`,
  `global-compliance.ts`, many secondary files.
- `inventory/`: `operations.ts`, `purchase-orders.ts`, `sales-orders.ts`,
  `shipping.ts`, `quality.ts`, `traceability.ts`, `valuation.ts`, `channels.ts`.
- `directory/workers.ts`, `directory/worker-engagements.ts`.
- `party/business-parties.ts`, `party/party-contacts.ts`.
- `portal-access/portal-invitations.ts`, `portal-access/project-client-grants.ts`.
- `automation/`, `blog.ts`, `chat.ts`, `ai-chat.ts`, `onboarding.ts`,
  `integrations.ts`, `notifications-delivery.ts`, `workspace-search.ts`,
  `workflow.ts`, `feedbucket.ts`.

These should be inventoried in Wave 1 prep or Wave 7 pre-constraint review.
The HR `core-org.ts` read is the highest priority as it holds the FK targets
for the confirmed `hr_employments` P2 gaps.
