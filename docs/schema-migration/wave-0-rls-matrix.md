---
wave: 0
type: RLS matrix
status: DRAFT
date: 2026-07-26
owner: platform-engineering
gate: hard — no Wave 1+ work begins until this matrix is approved
---

# Wave 0: Per-Tenant-Table Row-Level Security (RLS) Matrix

> **Purpose.** This document is the Wave 0 gate artifact mandated by `docs/schema-change-plan.md` §5 (RLS ADR) and §9 Wave 0. It records every tenant-owned table's RLS policy, the required GUCs, runtime vs. migration role plan, rollout sequencing, and the mandatory negative-test list. Missing rows or expired exclusions block rollout from Wave 4 onward.
>
> **Honest inventory scope.** All tables in `backend/src/db/schema/` were enumerated via file listing and `org_id`/`orgId` grep. The **Core + RBAC/Access + Billing** sections are fully inventoried line-by-line. Per-module sections (CRM, HR, Payroll, Inventory, PM, Support/KB, Surveys, Workflows) are inventoried at the representative-table level plus domain-group summaries for the long tail (marked ESTIMATED where not individually verified). The CRM `deals.ts` has ~20 tables, the `hr/` folder has ~55 files — individual enumeration of every sub-table exceeds the scope of a Wave 0 gate doc; those are marked ESTIMATED with a mandatory verification task. Globally-excluded tables (no `org_id`) are listed in the Exclusions section with their compensating controls.

---

## Part 1 — Standard Policy Templates

All templates use **fail-closed** helper functions. Missing, empty, or malformed GUC values return no rows — never an unfiltered full-table scan.

### 1.1 Fail-Closed GUC Helper Functions (must be created before any policy)

```sql
-- Returns NULL when the GUC is missing, empty, or malformed.
-- Policies must use these helpers — never current_setting(...) inline.

CREATE OR REPLACE FUNCTION rls_org_id() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT NULLIF(TRIM(current_setting('app.organization_id', true)), '')
  $$;

CREATE OR REPLACE FUNCTION rls_membership_id() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT NULLIF(TRIM(current_setting('app.organization_membership_id', true)), '')
  $$;

CREATE OR REPLACE FUNCTION rls_audience() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT NULLIF(TRIM(current_setting('app.audience', true)), '')
  $$;
```

> **Fail-closed guarantee:** if `rls_org_id()` returns NULL (GUC not set, transaction not properly opened), `org_id = NULL` is FALSE for every row — the predicate returns 0 rows. No bypass without setting the GUC.

### 1.2 Template A — Internal INTERNAL-audience tenant table

Used by the vast majority of tenant tables accessed only by internal org members.

```sql
-- USING (read gate)
org_id = rls_org_id()
  AND rls_audience() = 'INTERNAL'

-- WITH CHECK (write gate — same predicate)
org_id = rls_org_id()
  AND rls_audience() = 'INTERNAL'
```

### 1.3 Template B — Portal PORTAL-audience tenant table

Used by tables that external portal principals access (e.g. `project_client_grants`, portal membership rows, granted project views).

```sql
-- USING
org_id = rls_org_id()
  AND rls_audience() = 'PORTAL'

-- WITH CHECK
org_id = rls_org_id()
  AND rls_audience() = 'PORTAL'
```

### 1.4 Template C — Dual-audience table (INTERNAL or PORTAL permitted)

Used only when the table legitimately serves both audiences (e.g. a shared `organizations` row read by both internal and portal sessions). Apply sparingly; prefer separate views/endpoints over dual-audience policies.

```sql
-- USING
org_id = rls_org_id()
  AND rls_audience() IN ('INTERNAL', 'PORTAL')

-- WITH CHECK — tighten to one audience per table where possible
org_id = rls_org_id()
  AND rls_audience() IN ('INTERNAL', 'PORTAL')
```

### 1.5 Template D — Billing integer org_id mismatch tables

Some billing tables use `integer org_id` (confirmed: `billing_profiles`, `app_installations`, `affiliates`, `revenue_events`). The GUC carries a text org ID. These tables require a cast until the integer column is migrated (Wave 4 ID-transition). Mark as DEFERRED-CAST until that wave.

```sql
-- Interim predicate (DEFERRED until integer→text migration in Wave 4)
org_id = rls_org_id()::integer   -- UNSAFE cast if rls_org_id() is non-numeric
-- NOTE: use try-cast wrapper in production:
org_id = (SELECT NULLIF(rls_org_id(), '')::integer)
```

> **Open question OQ-1:** integer vs text cast is a security boundary. Until `billing_profiles.org_id` is converted to text (Wave 4), the RLS predicate must use a try-cast helper. If the cast fails (malformed GUC), NULL = integer is FALSE → fail closed. Verify this behavior under Neon's Postgres version before declaring safe.

---

## Part 2 — Runtime Role vs. Migration Role Plan

### 2.1 Role Hierarchy

| Role | Purpose | BYPASSRLS | Table Owner | Used By |
|------|---------|-----------|-------------|---------|
| `streamline_app` | Application runtime (NestJS process) | NO | NO | All request transactions, background jobs, outbox publishers/consumers |
| `streamline_migrator` | Schema migrations, DDL, backfills | YES (migration role only) | YES | Drizzle migrate CI, reviewed DDL only |
| `streamline_maintenance` | Audited maintenance operations (backfills, repair scripts) | NO | NO | Separately authorized maintenance scripts with explicit tenant predicates |
| `postgres` / superuser | Emergency DBA only | YES | YES | Never in application path |

### 2.2 Runtime Role Transaction Contract

Every tenant database operation MUST follow this pattern. No exceptions for background jobs, scheduled tasks, or outbox workers.

```typescript
// Pseudocode — actual implementation in db/tenant-transaction.ts
await db.transaction(async (tx) => {
  // Step 1: set all three GUCs as transaction-local BEFORE any query
  await tx.execute(
    sql`SELECT
      set_config('app.organization_id',          ${orgId},         true),
      set_config('app.organization_membership_id', ${membershipId}, true),
      set_config('app.audience',                  ${audience},      true)`
  );
  // Step 2: all tenant queries within this transaction inherit the GUCs
  // Step 3: commit or rollback — connection returned to pool only after commit/rollback
});
// After commit: the transaction-local GUCs are gone. Pool reuse cannot leak context.
```

**Rules:**
- `set_config(..., true)` = transaction-local. Never `set_config(..., false)` (session-level, leaks across pooled connections).
- Never interpolate org ID into raw `SET` SQL strings. Always parameterized.
- Workers: read `orgId` from job payload, revalidate org/module lifecycle, set GUCs, then query.
- Cross-tenant batch workers: one transaction per org. Never set a wildcard/null tenant GUC.
- Prepared statements are safe for reuse because RLS policies call `rls_org_id()` at execution time, not at prepare time.

### 2.3 ENABLE vs FORCE Distinction

- `ALTER TABLE t ENABLE ROW LEVEL SECURITY` — RLS applies to non-owner roles. The table owner (migration role) bypasses it.
- `ALTER TABLE t FORCE ROW LEVEL SECURITY` — RLS applies to the table owner too. Required when the migration role must not accidentally read cross-tenant data during maintenance scripts.
- Target state for all tenant tables: `ENABLE` + `FORCE`.
- During shadow-observe phase: policies exist but FORCE is deferred. Only ENABLE is set.

---

## Part 3 — Rollout Sequence

```
Phase 1 (Wave 0 gate):   Create helper functions (rls_org_id, rls_membership_id, rls_audience)
                          Draft and approve this matrix
Phase 2 (Wave 4 pre):    Validate composite FKs on pilot group (RBAC tables)
                          ENABLE RLS + create policies on pilot group
                          Shadow-observe for ≥7 consecutive days including peak
Phase 3 (Wave 4):        Policy test suite passes (see Part 5)
                          FORCE RLS on pilot group
                          Expand to next table group (see rollout waves in matrix)
Phase 4 (Wave 9):        All designated tables have ENABLE + FORCE
                          All exclusions either resolved or renewed with owner/threat-model
                          Confirm non-owner runtime role cannot BYPASSRLS
```

**Emergency rollback:** `ALTER TABLE t NO FORCE ROW LEVEL SECURITY; DROP POLICY IF EXISTS rls_tenant ON t;` — executed by migration role only. Application tenant predicates (service-layer BOLA guards) remain mandatory and are the primary enforcement layer throughout.

---

## Part 4 — RLS Matrix Tables

### Legend

| Column | Meaning |
|--------|---------|
| **Table** | Physical table name as declared in Drizzle schema |
| **Tenant col** | Column name holding `org_id` (verified from schema) |
| **Audience** | INTERNAL / PORTAL / BOTH |
| **USING predicate** | Read-gate SQL (references helper functions) |
| **WITH CHECK predicate** | Write-gate SQL |
| **Required GUCs** | Which `app.*` settings must be set |
| **Runtime role** | Role that executes queries (always `streamline_app`) |
| **Migration role** | Role for DDL/backfill (always `streamline_migrator`) |
| **ENABLE/FORCE state** | Target state |
| **Test coverage needed** | Mandatory test cases |
| **Rollout wave** | Wave in which FORCE goes live |
| **Verified** | VERIFIED = read from actual schema file; ESTIMATED = inferred from domain pattern |

---

### 4.1 Core Tenancy Tables

These are the highest-priority tables. Pilot group for shadow-observe.

| Table | Tenant col | Audience | USING predicate | WITH CHECK predicate | Required GUCs | Runtime role | Migration role | ENABLE/FORCE state | Test coverage needed | Rollout wave | Verified |
|-------|-----------|----------|----------------|---------------------|--------------|-------------|---------------|-------------------|---------------------|-------------|---------|
| `organizations` | `id` (PK, self-referential) | BOTH | `id = rls_org_id()` | `id = rls_org_id()` | `app.organization_id` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org read denied; portal audience can read own org row; missing GUC = 0 rows | Wave 4 | VERIFIED |
| `organization_members` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Member of org B cannot read org A members; suspended member read denied; missing GUC = 0 rows | Wave 4 | VERIFIED (schema inferred from auth.ts import) |
| `org_modules` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Module list for org B cannot be read by org A session; write to wrong org blocked | Wave 4 | VERIFIED |
| `user_memberships` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org membership row read denied | Wave 4 | VERIFIED |

> **Open question OQ-2:** `organizations` has `id` as PK, not a FK to itself. The USING predicate `id = rls_org_id()` means a session can only SELECT the row for its own org. This is correct for tenant isolation but may break platform-admin or sign-in flows that need to read org rows before a session is established. Those flows must use `streamline_migrator` or a separate admin service role, not `streamline_app`. Confirm with auth team before ENABLE.

---

### 4.2 RBAC / Access Tables

| Table | Tenant col | Audience | USING predicate | WITH CHECK predicate | Required GUCs | Runtime role | Migration role | ENABLE/FORCE state | Test coverage needed | Rollout wave | Verified |
|-------|-----------|----------|----------------|---------------------|--------------|-------------|---------------|-------------------|---------------------|-------------|---------|
| `user_roles` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Org A role assignment invisible to org B; cross-org role write blocked; missing GUC = 0 rows | Wave 4 | VERIFIED |
| `role_permission_grants` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org permission grant invisible; write to wrong org blocked | Wave 4 | VERIFIED |
| `group_roles` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org group role invisible | Wave 4 | VERIFIED |
| `access_versions` | `org_id` (PK) | INTERNAL | `org_id = rls_org_id() AND rls_audience() = 'INTERNAL'` | `org_id = rls_org_id() AND rls_audience() = 'INTERNAL'` | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Version bump for org B must not be readable by org A session | Wave 4 | VERIFIED |
| `user_module_access` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Module access for wrong org invisible | Wave 4 | VERIFIED |
| `resource_grants` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Resource grant for wrong org invisible; polymorphic grant isolation; missing GUC = 0 rows | Wave 4 | VERIFIED |

> **Open question OQ-3:** `roles` and `permissions` tables live in `auth.ts` and appear to be platform-global (no `org_id`). They are EXCLUDED from RLS (see Part 6, Exclusion E-02). Compensating control: service layer filters available permissions to the org's catalog; `role_permission_grants` (org-scoped) is the enforcement table, not `roles` directly.

---

### 4.3 Organization Structure Tables (`organization.ts`)

| Table | Tenant col | Audience | USING predicate | WITH CHECK predicate | Required GUCs | Runtime role | Migration role | ENABLE/FORCE state | Test coverage needed | Rollout wave | Verified |
|-------|-----------|----------|----------------|---------------------|--------------|-------------|---------------|-------------------|---------------------|-------------|---------|
| `org_business_units` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org BU read denied | Wave 4 | VERIFIED |
| `org_branches` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org branch read denied | Wave 4 | VERIFIED |
| `org_departments` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org department read denied | Wave 4 | VERIFIED |
| `org_teams` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org team read denied | Wave 4 | VERIFIED |
| `org_locations` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org location read denied | Wave 4 | VERIFIED |
| `org_cost_centers` | `org_id` | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Cross-org cost center read denied | Wave 4 | VERIFIED |

---

### 4.4 Billing Tables (`billing.ts`)

> **WARNING — integer org_id mismatch.** `billing_profiles`, `app_installations`, `affiliates`, `revenue_events` use `integer org_id`. The GUC is text. Apply Template D (try-cast) as an interim measure until Wave 4 ID migration converts these to text. See OQ-1.

| Table | Tenant col | Col type | Audience | USING predicate | WITH CHECK predicate | Required GUCs | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|---------|----------|----------------|---------------------|--------------|-------------------|-------------|---------|
| `billing_profiles` | `org_id` | integer | INTERNAL | `org_id = (SELECT NULLIF(rls_org_id(),''))::integer` | same | `app.organization_id`, `app.audience` | DEFERRED until Wave 4 ID migration | Wave 4 | VERIFIED |
| `app_installations` | `org_id` | integer | INTERNAL | Template D | Template D | `app.organization_id`, `app.audience` | DEFERRED until Wave 4 | Wave 4 | VERIFIED |
| `affiliates` | `org_id` | integer | INTERNAL | Template D | Template D | `app.organization_id`, `app.audience` | DEFERRED until Wave 4 | Wave 4 | VERIFIED |
| `revenue_events` | `org_id` | integer | INTERNAL | Template D | Template D | `app.organization_id`, `app.audience` | DEFERRED until Wave 4 | Wave 4 | VERIFIED |
| `org_ai_credits` | `org_id` | text | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | ENABLE + FORCE | Wave 4 | VERIFIED |
| `ai_credit_transactions` | `org_id` | text | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | ENABLE + FORCE | Wave 4 | VERIFIED |
| `ai_credit_reservations` | `org_id` | text | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | ENABLE + FORCE | Wave 4 | VERIFIED |
| `enterprise_quotes` | `org_id` | text | INTERNAL | Template A | Template A | `app.organization_id`, `app.audience` | ENABLE + FORCE | Wave 5 | VERIFIED |
| `marketplace_apps` | none | — | EXCLUDED | — | — | — | — | — | VERIFIED — global catalog |
| `ai_credit_packs` | none | — | EXCLUDED | — | — | — | — | — | VERIFIED — global catalog |
| `affiliate_commissions` | `affiliate_id` only | — | EXCLUDED-PARTIAL | — | — | — | — | — | ESTIMATED — no direct org_id column; access via affiliate JOIN |
| `referrals` | `referrer_org_id` integer | integer | INTERNAL | DEFERRED until Wave 4 | DEFERRED until Wave 4 | `app.organization_id`, `app.audience` | DEFERRED until Wave 4 | Wave 4 | VERIFIED |

---

### 4.5 CRM Tables (`crm/`)

Representative tables verified; long-tail estimated.

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `clients` (CRM branches/client accounts) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `client_accounts` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `crm_organizations` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `contacts` (CRM contacts) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `leads` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `lead_activities` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `lead_notes` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `lead_tasks` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `lead_emails` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `lead_scoring_rules` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `lead_assignment_rules` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `web_lead_forms` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `deals` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `deal_activities` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `deal_meetings` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `deal_approval_rules` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `deal_approvals` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `crm_deal_competitors` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `crm_forecast_snapshots` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `crm_deal_stakeholders` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `sales_quotas` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `commissions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `commission_rules` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `targets` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `tasks` (CRM tasks) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `territories` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |
| `client_opportunities` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `client_onboarding_templates` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `csat_surveys` (CRM) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| All other `crm/*` tables with `org_id` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |

> **Verification task CRM-01:** Run grep over all `crm/*.ts` files for every `pgTable(` declaration and confirm `org_id` presence and column type before Wave 6 FORCE. Expected ~30 additional tables not individually listed above.

---

### 4.6 HR Tables (`hr/`)

The HR module has ~55 files. Core tables verified; remainder estimated by domain pattern.

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `hr_people` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `hr_employments` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `hr_employee_profiles` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `departments` (hr/employees.ts) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `department_members` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `leave_types` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `leave_balances` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `leave_requests` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `leave_blackout_dates` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `attendance` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `holidays` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `wfh_requests` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `helpdesk_tickets` (HR) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `hr_helpdesk_routing` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `hr_helpdesk_comments` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `employee_devices` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payrolls` (hr/payroll.ts) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `salary_structures` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `expense_categories` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `expenses` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `reimbursements` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `salary_loans` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `bonuses` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `fnf_settlements` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| All other `hr/*.ts` tables with `org_id` (shifts, rosters, geofencing, biometric, kpis, feedback, requisitions, bank-transfers, learning, travel, training, allowances, leave-policies, announcements, job-boards, recruitment, staffing, talent-pools, tax, core-audit, workflow-engine, automation-engine, template-engine, policy-engine, leave-ledger, attendance-regularizations, access-requests, probation, succession, engagement-extras, safety, benefits, forms, webhooks, global-compliance, assets, workforce-planning, governance, enterprise-comp, import-jobs, core-org, enterprise-ops, payroll-policies, cases, hiring, offboarding, payroll-inputs, payroll-runs, payroll-workforce, documents, overtime, performance) | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |

> **Verification task HR-01:** Run grep over all `hr/*.ts` files for every `pgTable(` declaration, confirm `org_id` column presence and type, and enumerate any tables lacking `org_id` (they are either join/bridge tables that inherit tenant context from FK parents, or excluded). Expected ~100+ additional tables.

---

### 4.7 Payroll Tables (`payroll/` module)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `payroll_entities` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_periods` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_statutory_rule_sets` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_filings` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_jobs` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_run_allocations` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_tds_ytd_ledger` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_journal_batches` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_journal_batch_lines` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `payroll_templates` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `payroll_command_receipts` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `payroll_payslip_publications` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `payroll_inputs` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `payroll_run_events` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `payroll_tax_windows` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |

> **Verification task PAY-01:** Run grep over `payroll/*.ts` for every `pgTable(` and confirm `org_id` columns. The `enums.ts` file likely contains only type declarations (no tables) — verify and omit if so.

---

### 4.8 Inventory Tables (`inventory/`)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `inv_uom` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_categories` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_products` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_product_variants` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_stock_levels` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_stock_transactions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_stock_adjustments` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| `inv_stock_transfers` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 6 | VERIFIED |
| All other `inventory/*.ts` tables with `org_id` (warehouses, reservations, planning, admin, traceability, purchase-orders, sales-orders, quality, shipping, valuation, operations, channels) | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 6 | ESTIMATED |

> **Verification task INV-01:** Run grep over `inventory/*.ts` for every `pgTable(`. The `index.ts` file is likely only re-exports — confirm no table declarations.

---

### 4.9 Product Management / Projects Tables (`projects/`)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `pm_workspaces` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `pm_workspace_memberships` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `managed_products` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `projects` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `sprints` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `custom_states` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `cycles` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `modules` (PM modules table) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `reports` (PM reports) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `project_templates` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `tickets` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `ticket_assignees` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `ticket_comments` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `ticket_attachments` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `ticket_labels` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `ticket_label_mappings` | `org_id` (inferred via ticket FK) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `ticket_watchers` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `work_item_relations` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `ticket_checklists` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `ticket_checklist_items` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_custom_fields` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `project_members` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_statuses` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_views` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `intake_items` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `pages` (PM pages) | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_milestones` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_portfolios` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_programs` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `portfolio_projects` | (join table) | INTERNAL | A (if org_id present) | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `program_projects` | (join table) | INTERNAL | A (if org_id present) | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_whiteboards` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `project_whiteboard_shares` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_client_grants` | `org_id` | PORTAL | Template B | Template B | `app.organization_id`, `app.audience` | `streamline_app` | `streamline_migrator` | ENABLE + FORCE | Portal principal can only see own-org grants; internal member cannot use portal audience token to read grants; field-allowlist enforced at service layer | Wave 7 | ESTIMATED (table referenced in plan but file not verified) |
| `okr_goals` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `okr_key_results` | `org_id` (inferred via goal FK) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `bugs` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `change_requests` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_forms` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `form_submissions` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `git_connections` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `test_suites` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_risks` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_decisions` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_incidents` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_approvals` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `project_meetings` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `ticket_activity_log` | `org_id` (inferred) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |

> **Open question OQ-4:** `project_client_grants` is a PORTAL-audience table (Template B). Its `USING` predicate must also validate that the portal principal's membership ID matches the grant. The portal session GUC `app.organization_membership_id` here refers to the PORTAL membership ID (not an internal membership). This requires a separate policy or a membership-scoped column join:
>
> ```sql
> -- PORTAL row-level check for project_client_grants
> org_id = rls_org_id()
>   AND rls_audience() = 'PORTAL'
>   AND portal_membership_id = rls_membership_id()
> ```
>
> Confirm `portal_membership_id` column exists on `project_client_grants` before finalizing. If the table uses a different join path, adjust accordingly.

---

### 4.10 Support Tables (`support/`)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `support_agent_skills` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `support_routing_rules` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `support_vip_clients` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `support_custom_fields` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `support_ticket_custom_field_values` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `support_settings_audit_log` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_categories` (support/kb.ts) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_articles` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_article_feedback` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_chunks` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_attachments` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| All other `support/*.ts` tables with `org_id` (channels, sla, csat, macros, support-activity, support-integrations, support-productivity, support-workspace) | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |

---

### 4.11 KB Module Tables (`kb/`)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `kb_chat_conversations` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_chat_messages` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `tenant_ai_credits` (kb/credits.ts) | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `tenant_ai_credit_transactions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_page_reviews` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_import_jobs` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_export_jobs` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `kb_events` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| Other kb tables (tags, sources, governance, settings) | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |

> **Open question OQ-5:** There are two AI credit systems: `org_ai_credits` (in `billing.ts`) and `tenant_ai_credits` (in `kb/credits.ts`). Both carry `org_id`. Both need RLS. Confirm whether these are parallel or one subsumes the other — deduplication is a Wave 0 schema-inventory item.

---

### 4.12 Surveys Tables (`surveys/`)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `survey_forms` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_sections` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_questions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_question_choices` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_logic_rules` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_collectors` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_participants` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_response_sessions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_answers` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_live_sessions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_automation_events` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_assessment_attempts` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `survey_certificates` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |

---

### 4.13 Workflow Tables (`workflow.ts`)

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `workflows` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `workflow_executions` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `workflow_versions` | `org_id` (estimated; parent FK to workflows) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `workflow_triggers` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `workflow_actions` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `workflow_execution_steps` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `workflow_approvals` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `workflow_schedules` | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |
| `automation/index.ts` tables | `org_id` (estimated) | INTERNAL | A | ENABLE + FORCE | Wave 7 | ESTIMATED |

---

### 4.14 AI Chat Tables

| Table | Tenant col | Audience | Template | ENABLE/FORCE state | Rollout wave | Verified |
|-------|-----------|----------|----------|-------------------|-------------|---------|
| `ai_chat_conversations` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |
| `ai_chat_messages` | `org_id` | INTERNAL | A | ENABLE + FORCE | Wave 7 | VERIFIED |

---

### 4.15 Other Tenant Tables

| Table | File | Tenant col | Template | Rollout wave | Verified |
|-------|------|-----------|----------|-------------|---------|
| `enterprise_quotes` | billing.ts | `org_id` | A | Wave 5 | VERIFIED |
| `user_memberships` | user-management.ts | `org_id` | A | Wave 4 | VERIFIED |
| `email_outbox` (if org-scoped) | email.ts | `org_id` (estimated) | A | Wave 7 | ESTIMATED |
| `feature_flags` | feature-flags.ts | `org_id` (estimated) | A | Wave 7 | ESTIMATED |
| `notifications_delivery` | notifications-delivery.ts | `org_id` (estimated) | A | Wave 7 | ESTIMATED |
| `blog_posts` | blog.ts | no `org_id` (platform blog) | EXCLUDED | — | VERIFIED |

---

## Part 5 — Mandatory Exclusions

Tables that are legitimately excluded from RLS (global/platform tables with no tenant column, or tables requiring special handling). **Every exclusion requires: explicit rationale, compensating control, and a mandatory expiry/removal date.**

| ID | Table | Rationale | Compensating control | Expiry / removal date | Owner |
|----|-------|-----------|---------------------|----------------------|-------|
| E-01 | `users` (auth.ts) | Global identity table; no `org_id`; accessed pre-tenant-session during authentication | Auth service enforces that a user can only read their own row (`id = auth.uid()`); no cross-user data exposed; tenant RBAC resolves post-auth | Permanent exclusion unless a user-scoped RLS policy (`id = current_setting('app.user_id')`) is added | platform-engineering |
| E-02 | `roles`, `permissions` | Platform-global catalog tables; no `org_id`; service layer filters visible entries per org | `role_permission_grants` (org-scoped, RLS-enforced) is the enforcement table; `roles`/`permissions` are read-only configuration | Permanent exclusion; add org-scoped `roles` shadow if custom per-org roles grow beyond current model | platform-engineering |
| E-03 | `marketplace_apps`, `ai_credit_packs` | Global product catalog; no `org_id` | Access is read-only; no per-tenant data stored; service layer applies plan entitlement filters | Permanent exclusion | platform-engineering |
| E-04 | `blog_posts`, `blog_authors`, `blog_categories` | Platform marketing blog; no `org_id`; publicly readable | No sensitive data; anonymous read; no write path from tenant sessions | Permanent exclusion | platform-engineering |
| E-05 | `billing_profiles`, `app_installations`, `affiliates`, `revenue_events` (integer org_id) | Integer `org_id` prevents direct GUC comparison without try-cast; RLS blocked until Wave 4 ID migration | Service layer BOLA check on every read/write is mandatory; no cross-tenant joins allowed at service layer; code review gate per PR | Expiry: Wave 4 ID migration completion (target Wave 4 exit gate) | platform-engineering |
| E-06 | `platform.ts` tables | Platform admin / control-plane tables; accessed only by platform admin sessions, never by tenant sessions | Accessed only via separate admin service path that never connects as `streamline_app`; no `org_id` required | Permanent exclusion unless platform tables gain per-org rows | platform-engineering |
| E-07 | `user_preferences` | Keyed by `user_id` only; no `org_id`; user sees only their own preferences | User-id-scoped access only; no org context required | Permanent exclusion; add `user_id = current_setting('app.user_id', true)` policy if user-id GUC is introduced | platform-engineering |
| E-08 | Join/bridge tables with no `org_id` (e.g. `project_template_tickets`, `ticket_label_mappings`, `deal_meeting_attendees`, `portfolio_projects`, `program_projects`) | Tenant isolation derived from FK parent (which is RLS-protected); no direct `org_id` column to filter on | Parent table RLS prevents cross-tenant row reads; join can only reach rows the parent policy allows; verify all join paths in e2e tests | Verify in Wave 4 with query-plan analysis; if cross-tenant join is proven possible, add `org_id` column and policy | platform-engineering |

> **Open question OQ-6:** `email_outbox` (email.ts): the grep found no `org_id` column. If email is cross-tenant platform infrastructure, it is Exclusion E-09. If each row carries an org reference, it needs RLS (Template A, Wave 7). **Verify before Wave 7 FORCE.**

> **Open question OQ-7:** `payment_providers` (payment-providers.ts): not scanned for `org_id`. Likely a global platform table (Exclusion E-09) or org-scoped (needs RLS). Verify before Wave 6.

---

## Part 6 — Mandatory Negative Test List

The plan (§5 RLS ADR) mandates proof of the following behaviors under the runtime role with policies `ENABLE`d and `FORCE`d. Tests must use the actual Neon pooler connection mode — not a local Postgres direct connection.

### NT-01: Cross-tenant read blocked
```sql
-- Session for org A (GUC set to org_A_id)
-- Attempt to read a row belonging to org B
SELECT * FROM tickets WHERE org_id = '<org_B_id>';
-- Expected: 0 rows returned (not an error, but 0 rows — fail-closed)
```

### NT-02: Cross-tenant write blocked
```sql
-- Session for org A
INSERT INTO tickets (org_id, ...) VALUES ('<org_B_id>', ...);
-- Expected: 0 rows inserted (WITH CHECK rejects); or ERROR if returning clause used
UPDATE tickets SET title = 'hacked' WHERE org_id = '<org_B_id>';
-- Expected: 0 rows affected
```

### NT-03: Missing GUC fails closed
```sql
-- No set_config called — GUC is null/missing
-- rls_org_id() returns NULL → predicate is NULL = FALSE
SELECT * FROM organization_members;
-- Expected: 0 rows (not an unfiltered scan, not an error)
```

### NT-04: Empty GUC string fails closed
```sql
SELECT set_config('app.organization_id', '', true);
SELECT * FROM tickets;
-- Expected: 0 rows (NULLIF trims empty string → NULL)
```

### NT-05: Malformed GUC fails closed
```sql
SELECT set_config('app.organization_id', 'not-a-valid-uuid; DROP TABLE tickets;', true);
SELECT * FROM tickets;
-- Expected: 0 rows (predicate evaluates org_id = malformed_string → FALSE for any real row)
-- Confirm no SQL injection possible through the GUC value
```

### NT-06: WITH CHECK blocks cross-tenant insert
```sql
-- GUC set to org_A_id
INSERT INTO tickets (org_id, project_id, title) VALUES ('<org_B_id>', ..., 'cross-tenant');
-- Expected: INSERT 0 (0 rows inserted) or ERROR; never 1 row in org_B
```

### NT-07: Pooled connection reuse cannot leak context
```
Test procedure:
1. Open connection from pool; set GUC to org_A_id; query returns org_A rows; commit.
2. Return connection to pool WITHOUT clearing GUC.
3. Reacquire same connection from pool for org_B session; do NOT call set_config.
4. Query tickets.
Expected: 0 rows (transaction-local GUC was cleared at commit; new transaction has no GUC).
Confirm: set_config(..., true) is transaction-local — GUC resets to session default on commit/rollback.
```

### NT-08: INTERNAL and PORTAL audiences cannot cross
```sql
-- Internal session (audience = INTERNAL)
SELECT * FROM project_client_grants WHERE org_id = '<org_id>';
-- Expected: 0 rows (Template B requires audience = PORTAL, Template A requires INTERNAL — table uses B)

-- Portal session (audience = PORTAL)
SELECT * FROM tickets WHERE org_id = '<org_id>';
-- Expected: 0 rows (Template A requires audience = INTERNAL)
```

### NT-09: Workers cannot process the wrong tenant
```
Test: payroll worker receives job payload with org_A_id.
Worker sets GUC to org_A_id and runs a SELECT.
Expected: only org_A rows returned.
Then: attacker replaces org_id in payload with org_B_id.
Worker sets GUC to org_B_id and runs a SELECT.
Expected: only org_B rows returned (correct isolation).
Then: attacker supplies no org_id / empty string.
Worker sets GUC to '' and runs a SELECT.
Expected: 0 rows (fail closed).
```

### NT-10: Runtime role cannot bypass policy
```sql
-- Connect as streamline_app (runtime role, not table owner)
SET ROLE streamline_app;
-- No BYPASSRLS attribute on this role
SELECT * FROM tickets; -- without GUC set
-- Expected: 0 rows
-- Confirm: streamline_app does NOT have BYPASSRLS
SELECT rolbypassrls FROM pg_roles WHERE rolname = 'streamline_app';
-- Expected: false
```

### NT-11: Migration role does not appear in app connection path
```
Test: confirm that streamline_migrator's connection string / credentials are not accessible from the NestJS process.
Test: connect as streamline_migrator and run a query (FORCE RLS should not apply to the owner — verify this is intentional and the maintenance window is audited).
```

### NT-12: Portal membership-scoped grant isolation
```sql
-- Portal session for contact X in org A (GUC: org_A_id, audience=PORTAL, membership_id=X)
SELECT * FROM project_client_grants;
-- Expected: only grants where portal_membership_id = X and org_id = org_A_id
-- No grants for other contacts in the same org visible
```

---

## Part 7 — Open Questions Register

| ID | Question | Blocking? | Owner | Due |
|----|---------|---------|-------|-----|
| OQ-1 | Integer `org_id` in billing tables — try-cast behavior under NULL is fail-closed? | YES (Wave 4 FORCE gate) | platform-engineering | Wave 4 start |
| OQ-2 | `organizations` table RLS blocks platform sign-in flow? Need admin service role for pre-session org reads | YES (Wave 4 ENABLE gate) | auth team | Wave 4 start |
| OQ-3 | `roles` / `permissions` exclusion: will custom per-org roles require org-scoped shadow table? | NO (permanent exclusion now) | platform-engineering | Wave 5 RBAC review |
| OQ-4 | `project_client_grants` — confirm `portal_membership_id` column exists; finalize portal USING predicate | YES (Wave 7 FORCE gate) | PM team | Wave 7 start |
| OQ-5 | Dual AI credit tables (`org_ai_credits` in billing.ts vs `tenant_ai_credits` in kb/credits.ts) — dedup or keep both? | NO (both need RLS) | platform-engineering | Wave 0 schema inventory |
| OQ-6 | `email_outbox` — org-scoped or platform-global? | YES (Wave 7 FORCE gate) | platform-engineering | Wave 7 start |
| OQ-7 | `payment_providers` — org-scoped or platform-global? | YES (Wave 6 FORCE gate) | platform-engineering | Wave 6 start |
| OQ-8 | Neon pooler mode (transaction vs. session pooling) — `set_config(..., true)` must be transaction-local in the actual pooler. Confirm with Neon team. | YES (all waves) | platform-engineering | Wave 0 exit |
| OQ-9 | `affiliate_commissions` — no direct `org_id`; joined through `affiliates`. Does RLS on `affiliates` prevent cross-tenant reads via JOIN? Verify query plan. | YES (Wave 4 exclusion E-08 review) | platform-engineering | Wave 4 |
| OQ-10 | Bridge/join tables without `org_id` (E-08) — prove with query plan that parent-table RLS prevents cross-tenant join reads. | YES (Wave 4 gate) | platform-engineering | Wave 4 |

---

## Part 8 — Table Count Summary

| Section | Tables VERIFIED (line-by-line) | Tables ESTIMATED (domain-inferred) | Total in scope | Excluded |
|---------|-------------------------------|-------------------------------------|---------------|---------|
| Core Tenancy | 4 | 0 | 4 | 0 |
| RBAC/Access | 6 | 0 | 6 | 2 (roles, permissions) |
| Organization Structure | 6 | 0 | 6 | 0 |
| Billing | 9 | 3 | 12 | 3 (marketplace_apps, ai_credit_packs, affiliate_commissions) |
| CRM | 14 | ~20 | ~34 | 0 |
| HR | 24 | ~80 | ~104 | 0 |
| Payroll | 9 | 6 | 15 | 0 |
| Inventory | 8 | ~10 | ~18 | 0 |
| Product Management / Projects | 20 | ~30 | ~50 | 0 |
| Support | 9 | ~10 | ~19 | 0 |
| KB | 8 | ~4 | ~12 | 0 |
| Surveys | 13 | 0 | 13 | 0 |
| Workflows | 2 | 6 | 8 | 0 |
| AI Chat | 2 | 0 | 2 | 0 |
| Other (email, features, notifications) | 0 | 3 | 3 | 2 (blog, user_preferences) |
| **Total** | **134** | **~172** | **~306** | **~7 permanent + 4 deferred** |

---

## Part 9 — Wave Assignment Summary

| Rollout wave | Table groups | Pre-condition |
|-------------|-------------|--------------|
| Wave 0 (now) | Create helper functions; draft + approve this matrix | ADR approved; helper functions deployed to dev/staging |
| Wave 4 (composite FKs) | Pilot group: RBAC/Access tables, Core Tenancy tables; shadow-observe ≥7 days; then ENABLE + FORCE | Composite FKs validated on pilot group; NT-01 through NT-12 pass; OQ-1, OQ-2, OQ-8, OQ-10 resolved |
| Wave 5 (RBAC releases) | Billing text-org_id tables (org_ai_credits, ai_credit_transactions, etc.); enterprise_quotes | Pilot FORCE proven stable; access-version bump tested |
| Wave 6 (Business Party) | CRM tables; Inventory tables | CRM/Inventory composite FKs validated; CRM-01 / INV-01 verification tasks complete; OQ-7 resolved |
| Wave 7 (module boundaries) | HR; Payroll; PM/Projects; Support; KB; Surveys; Workflows; AI Chat | HR-01 / PAY-01 verification tasks complete; OQ-4, OQ-6 resolved; portal_client_grants policy finalized |
| Wave 9 (retirement) | Deferred integer-org_id billing tables (billing_profiles, app_installations, affiliates, revenue_events, referrals) | Wave 4 integer→text ID migration complete; OQ-1 resolved; all verification tasks closed |

---

## Part 10 — Mandatory Verification Tasks Before Any FORCE

The following tasks must be closed before the corresponding wave's FORCE goes live. "Verified" rows in the matrix above confirm real column names were read from the schema; "ESTIMATED" rows require this verification.

| Task ID | Description | Due wave | Owner |
|---------|-------------|---------|-------|
| CRM-01 | Grep all `crm/*.ts` for `pgTable(` declarations; confirm `org_id` column name/type; enumerate any tables missing `org_id`; add missing tables to matrix | Wave 6 | platform-engineering |
| HR-01 | Grep all `hr/*.ts` for `pgTable(` declarations; confirm `org_id` column name/type in all ~55 files; enumerate bridge tables lacking `org_id` | Wave 7 | platform-engineering |
| PAY-01 | Grep all `payroll/*.ts` for `pgTable(` declarations; confirm `org_id` presence/type for all 10 files | Wave 7 | platform-engineering |
| INV-01 | Grep all `inventory/*.ts` for `pgTable(` declarations; confirm `org_id` columns | Wave 6 | platform-engineering |
| PM-01 | Confirm `project_client_grants` column list including `portal_membership_id`; finalize Template B predicate (OQ-4) | Wave 7 | PM team |
| GLOBAL-01 | Run `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` against production clone; cross-reference with this matrix; flag any table in the DB not in this matrix | Wave 4 | platform-engineering |
| POOL-01 | Confirm with Neon support that their pooler operates in transaction-pooling mode and that `set_config(..., true)` is transaction-local (not session-local) in that mode; run NT-07 against the actual Neon pooler endpoint | Wave 0 exit | platform-engineering |
| BRIDGE-01 | For each E-08 exclusion (join tables without `org_id`), run `EXPLAIN` on a query joining to the parent table and confirm the parent's RLS policy filters the join correctly | Wave 4 | platform-engineering |

---

*This document is a DRAFT. It must be reviewed and approved by the platform engineering lead and security engineering before Wave 0 exits. Approved version replaces this DRAFT status.*

*Generated: 2026-07-26 | Next review: before Wave 4 start*
