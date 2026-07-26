# Wave 7 — Composite FK Migration Matrix

> Generated: 2026-07-26  
> Tenant key: `organizations.id` (text, `backend/src/db/schema/auth.ts:10`)  
> Goal: every tenant-scoped table gets `UNIQUE(org_id, id)` + `FK(org_id) → organizations(id)`.  
> Wave 7 tickets: T7.2 (fix integer org_id defects), T7.3 (UNIQUE+composite FKs), T7.4 (typed polymorphic replacements).

## Coverage

**Scanned modules (HIGH confidence — files read in full):**  
auth/tenancy (`auth.ts`), access/RBAC (`access.ts`), billing (`billing.ts`), org hierarchy (`organization.ts`), CRM core (`crm/contacts.ts`, `crm/leads.ts`, `crm/billing.ts`), Finance AR/AP (`finance-ar-ap.ts`), Projects core (`projects/core.ts`, `projects/tasks.ts`, `projects/members.ts`), project-teams (`project-teams.ts`), HR employees/leaves/payroll-runs (`hr/employees.ts`, `hr/leaves.ts`, `hr/payroll-runs.ts`), Payroll entities/periods (`payroll/entities-periods.ts`), Inventory core (`inventory/core.ts`), KB (`kb/spaces.ts`, `kb/pages.ts`), Signos (`signos/envelopes.ts`), Integrations (`integrations.ts`), user-management (`user-management.ts`).

**Coverage gaps (not read — MEDIUM/LOW confidence, need per-wave inventory):**  
`hr/*` (30+ HR sub-files beyond employees/leaves/payroll-runs), `payroll/*` (inputs, run-events, tax-windows, journal-batches, payslip-publications, command-receipts, templates), `crm/*` (deals, products, campaigns, metadata, pricebooks, contact-roles, analytics, attribution, automation-rules, automation-studio, customer-success, nps, playbook), `inventory/*` (warehouses, operations, planning, quality, shipping, channels, reservations, valuation, stock, traceability, purchase-orders, sales-orders, admin), `projects/*` (portfolios, goals, reporting, roadmap, qa, bugs, change-requests, governance, incidents, forms, workflow, whiteboards, git, timesheet-core, timesheet-payroll, activity, approvals, meetings), `support/*`, `kb/*` (beyond spaces/pages), `surveys/*`, `signos/*` (beyond envelopes), `accounting.ts`, `accounting-core.ts`, `finance-assets.ts`, `finance-banking.ts`, `finance-expenses.ts`, `finance-planning.ts`, `finance-tax.ts`, `blog.ts`, `ai-chat.ts`, `chat.ts`, `onboarding.ts`, `notifications-delivery.ts`, `automation/*`, `workflow.ts`, `platform.ts`, `email.ts`, `feedbucket.ts`, `agent-tokens.ts`, `feature-flags.ts`, `workspace-search.ts`, `payment-providers.ts`, `shared.ts`.

---

## Module: Auth / Tenancy

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `organizations` | `auth.ts` | `text` | — (is the tenant) | — | — | n/a | — | n/a | HIGH |
| `organization_members` | `auth.ts` | `serial` (int) | `text` | ✅ | ✅ `.references(organizations.id)` | `UNIQUE(org_id,id)` already exists (`uniq_org_members_org_id`); add FK `(org_id)→organizations(id)` on that composite index | NOT NULL | LOW | HIGH |
| `invitations` | `auth.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)`; no composite FK needed (PK is text, not an int FK child) | NOT NULL | LOW | HIGH |
| `org_custom_domains` | `auth.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_holidays` | `auth.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `roles` | `auth.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `role_permissions` | `auth.ts` | `serial` (int) | `text` | ✅ | ✅ (nullable) | `UNIQUE(org_id,id)` | NULLABLE | LOW | HIGH |
| `user_permissions` | `auth.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `onboarding_steps` | `auth.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `api_keys` | `auth.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `service_accounts` | `auth.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `user_delegations` | `auth.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `login_history` | `auth.ts` | `text` | `text` | ✅ | ✅ (nullable) | `UNIQUE(org_id,id)` | NULLABLE | LOW | HIGH |
| `user_memberships` | `user-management.ts` | `text` | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` (to-retire in Wave 5) | NOT NULL | LOW | HIGH |

---

## Module: Access / RBAC

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `user_roles` | `access.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `role_permission_grants` | `access.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `group_roles` | `access.ts` | `serial` (int) | `text` | ✅ | ✅ (org_id only) | **DEFECT: `group_id` is polymorphic `integer` with no FK** — replace with typed tables per T7.4 | NOT NULL | HIGH | HIGH |
| `access_versions` | `access.ts` | `text` (org_id IS the PK) | `text` | ✅ | ✅ (PK = FK) | n/a — 1:1 with org | NOT NULL | n/a | HIGH |
| `user_module_access` | `access.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_modules` | `access.ts` | `uuid` | **`varchar(36)`** | ⚠️ type≠text | ❌ **no FK** | Fix type to `text`, add FK `(org_id)→organizations(id)`, `UNIQUE(org_id,id)` | NOT NULL | **MEDIUM** | HIGH |
| `resource_grants` | `access.ts` | `uuid` | **`varchar(36)`** | ⚠️ type≠text | ❌ **no FK** (orgId has no `.references()`) | **DEFECT: `resource_id`, `principal_id` are polymorphic varchar with no FKs** — replace with typed tables per T7.4; fix orgId type+FK | NOT NULL | **HIGH** | HIGH |

---

## Module: Billing

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `billing_profiles` | `billing.ts` | `serial` (int) | **`integer`** | ❌ int≠text | ❌ **no FK** | **DEFECT T7.2** — change `org_id` to `text`, add FK, `UNIQUE(org_id,id)` | NOT NULL | **HIGH** | HIGH |
| `app_installations` | `billing.ts` | `serial` (int) | **`integer`** | ❌ int≠text | ❌ **no FK** | **DEFECT T7.2** — change `org_id` to `text`, add FK, `UNIQUE(org_id,id)` | NOT NULL | **HIGH** | HIGH |
| `affiliates` | `billing.ts` | `serial` (int) | **`integer`** | ❌ int≠text | ❌ **no FK** | **DEFECT T7.2** — change `org_id` to `text`, add FK, `UNIQUE(org_id,id)` | NOT NULL | **HIGH** | HIGH |
| `revenue_events` | `billing.ts` | `serial` (int) | **`integer`** | ❌ int≠text | ❌ **no FK** | **DEFECT T7.2** — change `org_id` to `text`, add FK, `UNIQUE(org_id,id)` | NOT NULL | **HIGH** | HIGH |
| `enterprise_quotes` | `billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_ai_credits` | `billing.ts` | `serial` (int) | `text` | ✅ | ✅ | 1:1 with org, `UNIQUE(org_id)` already; `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ai_credit_transactions` | `billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ai_credit_reservations` | `billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `affiliate_commissions` | `billing.ts` | `serial` (int) | n/a (no `org_id`) | — | — | **MISSING org_id** — see §Missing below | — | MEDIUM | HIGH |
| `referrals` | `billing.ts` | `serial` (int) | `referrer_org_id integer` | ❌ int≠text | ❌ **no FK** | Both `referrer_org_id` and `referred_org_id` are integer; rename to `org_id` (`referrer_org_id`), change to text, add FK | nullable | **HIGH** | HIGH |

---

## Module: CRM

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `branches` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `clients` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `client_accounts` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `crm_organizations` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `contacts` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `client_opportunities` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `client_onboarding_templates` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `client_onboarding_items` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `csat_surveys` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `csat_responses` | `crm/contacts.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `leads` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_activities` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_notes` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_tasks` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_emails` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_scoring_rules` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_assignment_rules` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `lead_import_batches` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `web_lead_forms` | `crm/leads.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `invoices` | `crm/billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payments` | `crm/billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `purchase_bills` | `crm/billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `vendor_payments` | `crm/billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `support_tickets` | `crm/billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` — **also move to support context (Wave 6 T6.3)** | NOT NULL | LOW | HIGH |
| `quotes` | `crm/billing.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |

---

## Module: Finance / Accounting

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `credit_notes` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_payment_allocations` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `vendor_credits` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_vendor_payment_allocations` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_recurring_invoice_templates` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_recurring_bill_templates` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_reminder_policies` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_reminder_log` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_collection_activities` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `fin_payment_runs` | `finance-ar-ap.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `accounting.*`, `finance-assets.*`, `finance-banking.*`, `finance-expenses.*`, `finance-planning.*`, `finance-tax.*`, `accounting-core.*` | multiple | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | MEDIUM | LOW |

---

## Module: Inventory

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `inv_uom` | `inventory/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `inv_categories` | `inventory/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `inv_products` | `inventory/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `inv_product_variants` | `inventory/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `inv_warehouses`, `inv_stock_locations`, `inv_operations`, `inv_purchase_orders`, `inv_sales_orders`, `inv_quality_*`, `inv_shipments`, `inv_channels`, `inv_planning_*`, `inv_reservations`, `inv_valuations`, `inv_traceability` | `inventory/*.ts` | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | MEDIUM | LOW |

---

## Module: Projects / Product Management

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `projects` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `sprints` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `custom_states` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `cycles` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `modules` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `reports` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_templates` | `projects/core.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `tickets` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ticket_comments` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ticket_attachments` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ticket_labels` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `timesheets` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ticket_checklists` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_custom_fields` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_releases` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_webhooks` | `projects/tasks.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `ticket_comment_reactions` | `projects/tasks.ts` | `serial` (int) | `text` (bare, no `.references()`) | ✅ | ❌ **missing FK** | Add FK `(org_id)→organizations(id)`, `UNIQUE(org_id,id)` | NOT NULL | MEDIUM | HIGH |
| `project_automations` | `projects/tasks.ts` | `serial` (int) | `text` (bare, no `.references()`) | ✅ | ❌ **missing FK** | Add FK `(org_id)→organizations(id)`, `UNIQUE(org_id,id)` | NOT NULL | MEDIUM | HIGH |
| `project_statuses` | `projects/members.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_views` | `projects/members.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `intake_items` | `projects/members.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `pages` | `projects/members.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_milestones` | `projects/members.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_teams` | `project-teams.ts` | `integer` (generatedAlwaysAsIdentity) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_team_members` | `project-teams.ts` | `integer` (generatedAlwaysAsIdentity) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `project_workspace_members` | `project-teams.ts` | `integer` (generatedAlwaysAsIdentity) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` — rename to `product_management_members` in Wave 8 | NOT NULL | LOW | HIGH |
| `project_team_assignments` | `project-teams.ts` | `integer` (generatedAlwaysAsIdentity) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `projects/portfolios.*`, `projects/goals.*`, `projects/roadmap.*`, `projects/qa.*`, `projects/bugs.*`, `projects/change-requests.*`, `projects/governance.*`, `projects/incidents.*`, `projects/forms.*`, `projects/workflow.*`, `projects/whiteboards.*`, `projects/git.*`, `projects/timesheet-core.*`, `projects/timesheet-payroll.*`, `projects/activity.*`, `projects/approvals.*`, `projects/meetings.*`, `projects/reporting.*` | `projects/*.ts` | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | MEDIUM | LOW |

---

## Module: HR

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `departments` | `hr/employees.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `leave_types` | `hr/leaves.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `leave_balances` | `hr/leaves.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `leave_requests` | `hr/leaves.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `leave_blackout_dates` | `hr/leaves.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_runs` | `hr/payroll-runs.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_run_employees` | `hr/payroll-runs.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_line_items` | `hr/payroll-runs.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_exceptions` | `hr/payroll-runs.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_approvals` | `hr/payroll-runs.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `hr/attendance.*`, `hr/performance.*`, `hr/documents.*`, `hr/assets.*`, `hr/benefits.*`, `hr/cases.*`, `hr/core-org.*`, `hr/core-people.*`, `hr/hiring.*`, `hr/offboarding.*`, `hr/probation.*`, `hr/overtime.*`, `hr/safety.*`, `hr/succession.*`, `hr/workforce-planning.*`, `hr/enterprise-comp.*`, `hr/enterprise-ops.*`, `hr/engagement-extras.*`, etc. | `hr/*.ts` | (not read) | (not read) | ❓ | ❓ | 30+ files — inventory pending | — | MEDIUM | LOW |

---

## Module: Payroll (standalone)

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `payroll_entities` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_periods` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_statutory_rule_sets` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ (nullable) | `UNIQUE(org_id,id)` | NULLABLE | LOW | HIGH |
| `payroll_filings` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_jobs` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_run_allocations` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll_tds_ytd_ledger` | `payroll/entities-periods.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `payroll/inputs.*`, `payroll/run-events.*`, `payroll/tax-windows.*`, `payroll/journal-batches.*`, `payroll/payslip-publications.*`, `payroll/command-receipts.*`, `payroll/templates.*` | `payroll/*.ts` | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | MEDIUM | LOW |

---

## Module: Knowledge Base

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `kb_spaces` | `kb/spaces.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `kb_space_members` | `kb/spaces.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `kb_pages` | `kb/pages.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `kb_page_favorites` | `kb/pages.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `kb_page_visits` | `kb/pages.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `kb_page_links` | `kb/pages.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `kb/tags.*`, `kb/credits.*`, `kb/governance.*`, `kb/chat.*`, `kb/settings.*`, `kb/sources.*`, `kb/translations.*`, `kb/versions.*`, `kb/events.*`, `kb/page-collab.*`, `kb/restrictions.*`, `kb/research-briefs.*` | `kb/*.ts` | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | MEDIUM | LOW |

---

## Module: Signos (e-Signatures)

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `sign_envelopes` | `signos/envelopes.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `signos/templates.*`, `signos/recipients.*`, `signos/fields.*`, `signos/documents.*`, `signos/certificates.*`, `signos/bulk-send.*`, `signos/audit.*`, `signos/settings.*`, `signos/signature-assets.*`, `signos/watermark.*`, `signos/public-forms.*` | `signos/*.ts` | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | MEDIUM | LOW |

---

## Module: Org Hierarchy

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `org_business_units` | `organization.ts` | `text` (uuid) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_branches` | `organization.ts` | `text` (uuid) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_departments` | `organization.ts` | `text` (uuid) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_teams` | `organization.ts` | `text` (uuid) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_locations` | `organization.ts` | `text` (uuid) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `org_cost_centers` | `organization.ts` | `text` (uuid) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |

---

## Module: Integrations / Other (partially scanned)

| Table | File | PK Type | org_id Type | Type Match? | FK to orgs today? | Composite FK Needed | org_id Nullable? | Risk | Confidence |
|-------|------|---------|-------------|-------------|-------------------|---------------------|------------------|------|------------|
| `user_integration_connections` | `integrations.ts` | `serial` (int) | `text` | ✅ | ✅ | `UNIQUE(org_id,id)` | NOT NULL | LOW | HIGH |
| `blog.*`, `chat.*`, `ai-chat.*`, `surveys/*`, `support/*`, `notifications-delivery.*`, `automation/*`, `workflow.*`, `platform.*`, `email.*`, `feedbucket.*`, `onboarding.*`, `feature-flags.*`, `workspace-search.*`, `payment-providers.*`, `ai-jobs.*`, `ai-summaries.*`, `ai-feedback.*`, `ai-confirmation.*`, `comment-drafts.*`, `shared.*`, `agent-tokens.*` | multiple | (not read) | (not read) | ❓ | ❓ | Inventory pending | — | LOW | LOW |

---

## Known Defects (Pre-Verified)

### Type Mismatches — integer org_id (should be text)

| Table | File | Current org_id Column | Current Type | Has FK? | Fix Required | Wave |
|-------|------|-----------------------|--------------|---------|--------------|------|
| `billing_profiles` | `billing.ts:34` | `org_id` | `integer` NOT NULL | ❌ | Change to `text`, add `.references(() => organizations.id)`, add `UNIQUE(org_id,id)` | T7.2 |
| `app_installations` | `billing.ts:84` | `org_id` | `integer` NOT NULL | ❌ | Change to `text`, add FK, add `UNIQUE(org_id,id)` | T7.2 |
| `affiliates` | `billing.ts:185` | `org_id` | `integer` NOT NULL | ❌ | Change to `text`, add FK, add `UNIQUE(org_id,id)` | T7.2 |
| `revenue_events` | `billing.ts:252` | `org_id` | `integer` NOT NULL | ❌ | Change to `text`, add FK, add `UNIQUE(org_id,id)` | T7.2 |
| `referrals` | `billing.ts` | `referrer_org_id`, `referred_org_id` | `integer` (both) | ❌ | Rename `referrer_org_id`→`org_id`, change to `text`, add FK; `referred_org_id` becomes a reference-only field (nullable text) | T7.2 |

### Type Mismatches — varchar(36) org_id (should be text)

| Table | File | Current org_id Column | Current Type | Has FK? | Fix Required | Wave |
|-------|------|-----------------------|--------------|---------|--------------|------|
| `org_modules` | `access.ts:69` | `org_id` | `varchar(36)` NOT NULL | ❌ | Change to `text`, add FK, `UNIQUE(org_id,id)` | T3.1 / T7.3 |
| `resource_grants` | `access.ts:137` | `org_id` | `varchar(36)` NOT NULL | ❌ (no `.references()`) | See polymorphic section; fix as part of T7.4 typed replacement | T7.4 |

### Missing FK on org_id (type correct but no `.references()` declared)

| Table | File | org_id Type | Notes |
|-------|------|-------------|-------|
| `ticket_comment_reactions` | `projects/tasks.ts:312` | `text` NOT NULL | Has `orgId` declared but no `.references()` call |
| `project_automations` | `projects/tasks.ts:332` | `text` NOT NULL | Same — `orgId` present but no `.references()` call |

### Polymorphic Columns — No FKs (must be replaced with typed tables, T7.4)

| Table | File | Polymorphic Columns | Issue | Replacement Design |
|-------|------|---------------------|-------|--------------------|
| `group_roles` | `access.ts:34` | `group_type` (`principalGroupTypeEnum`), `group_id` (`integer`) | `group_id` cannot FK to a typed entity; no guarantee `group_id` maps to a real row in the claimed `group_type`'s table | Replace with 3 typed join tables: `group_roles_dept(org_id, dept_id, role_id)`, `group_roles_team(org_id, team_id, role_id)`, `group_roles_custom(org_id, custom_group_id, role_id)` — each with a real FK |
| `resource_grants` | `access.ts:133` | `resource_type`, `resource_id`, `principal_type`, `principal_id` — all `varchar(36)` | No FK on any of these; `org_id` is also `varchar(36)` with no `.references()` | Replace with per-resource-type typed grant tables that carry real FKs; interim: at minimum fix `org_id` type+FK |

---

## Missing org_id — Should Be Tenant-Scoped

| Table | File | Reason | Recommended Fix |
|-------|------|--------|-----------------|
| `work_item_relations` | `projects/tasks.ts:142` | Junction between two tickets (both tenant-scoped); without `org_id` there is no direct tenant guard, and cross-tenant queries against this table are possible if FK integrity is ever bypassed | Add `org_id text NOT NULL references organizations(id)`, propagate from one of the ticket rows, add `UNIQUE(org_id,id)` and index `(org_id, work_item_id)` |
| `affiliate_commissions` | `billing.ts:204` | References `affiliates` (which has `org_id`) and `referred_org_id` (integer today) but has no `org_id` of its own; cannot be scoped by tenant in queries | Add `org_id text NOT NULL references organizations(id)` (= the affiliate's org) |
| `project_template_tickets` | `projects/core.ts:226` | Child of `project_templates` (org-scoped); no direct `org_id`; template-scoped access requires joining through the parent | Acceptable via parent FK for now; flag for descriptive-PK / composite-FK wave |
| `ticket_assignees`, `ticket_label_mappings`, `ticket_watchers`, `ticket_checklist_items`, `release_tickets`, `webhook_deliveries`, `invoice_items`, `purchase_bill_items`, `quote_line_items`, `credit_note_items`, `vendor_credit_items`, `payroll_line_items` | various | Pure child/junction tables; tenant scoping via parent FK is sufficient per current design | Keep as-is; note they lack direct `org_id`; verify no direct cross-table lookups bypass the parent join |

---

## Summary Counts

| Metric | Count |
|--------|-------|
| Tables with tenant org_id **scanned (HIGH confidence)** | **~115** |
| Files / table-groups **not yet read (coverage gap)** | ~70+ files / est. 150+ tables |
| **Type-mismatch defects** (integer or varchar(36) org_id) | **7** (`billing_profiles`, `app_installations`, `affiliates`, `revenue_events`, `referrals` ×2 columns, `org_modules`, `resource_grants`) |
| **Missing FK on org_id** (correct type, no `.references()`) | **4** (`ticket_comment_reactions`, `project_automations`, `resource_grants` org_id, `org_modules`) |
| **Missing org_id** (should be tenant-scoped, confirmed) | **2** (`work_item_relations`, `affiliate_commissions`); additional junction tables flagged as low-risk |
| **Polymorphic column groups to replace** (T7.4) | **2** (`group_roles.group_id`, `resource_grants.resource_id+principal_id`) |

> **Action before T7.1 sign-off:** each wave team must fill in the coverage gap rows (HR 30+ files, payroll sub-files, inventory sub-files, projects sub-files, support, surveys, signos, crm sub-files, finance sub-files) by running this same audit pattern against those files and appending rows above. The defect count and missing-org_id count will grow as those modules are inventoried.
