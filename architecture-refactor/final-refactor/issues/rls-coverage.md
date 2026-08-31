# RLS Coverage Audit

**Audited:** 2026-08-31  
**Auditor:** L5 (parallel fleet)  
**Scripts:** `backend/scripts/rls-audit.mjs`, `rls-find-data.mjs`, `rls-find-nonempty.mjs`, `rls-probe.mjs`

---

## Headline Numbers

| Category | Count |
|---|---|
| Tables with `org_id` column (total) | **817** |
| (a) RLS enabled + ≥1 policy — GOOD | **801** |
| (b) RLS enabled, 0 policies — deny-all | **0** |
| (c) RLS disabled — cross-tenant holes | **16** |
| Organizations in DB | 19 |
| RLS-covered tables with live data (non-empty) | 86 |
| RLS-disabled tables with live data | **0** |

Coverage rate: **97.9 %** (801/817). No table sits in the worst state (RLS enabled but zero policies = deny-all).

---

## Script Status

| Script | Prior state | Fixed state | What it proves |
|---|---|---|---|
| `rls-audit.mjs` | BROKEN — 28P01 on `streamline_app` | FIXED — catalog via owner; isolation proof gracefully deferred | pg_catalog coverage counts + OPEN notice for isolation |
| `rls-find-data.mjs` | BROKEN — 28P01 | FIXED — uses owner (BYPASSRLS, cross-org counts) | which RLS tables are non-empty |
| `rls-find-nonempty.mjs` | BROKEN — 28P01 | FIXED — uses owner (BYPASSRLS), sorted by row count | higher-risk non-empty RLS tables |
| `rls-probe.mjs` | BROKEN — 28P01 | FIXED — detects 28P01, exits 2 with runbook | isolation proof (OPEN until streamline_app auth repaired) |

**Root cause of breakage:** `streamline_app` password was rotated in the Neon console but `APP_DATABASE_URL` in `backend/.env` was not updated. All four scripts hardcoded the stale password. They now read `APP_DATABASE_URL` from `process.env` with the hardcoded string as a fallback, and the catalog/count scripts were switched to the owner connection where appropriate.

**Important:** The catalog queries (pg_class, pg_policies) run as owner. This is correct — catalog metadata is role-independent. The owner has BYPASSRLS, so it CANNOT be used for isolation proofs. `rls-probe.mjs` is the only script that must run as `streamline_app`, and it is marked OPEN until auth is repaired.

---

## Failure Mode (c): RLS Disabled — 16 Cross-Tenant Holes

A table with `org_id` and no RLS policy is readable org-wide by any session that holds the app role. All 16 are currently **empty** (0 rows as of 2026-08-31), which reduces immediate risk but does not eliminate it — data written to these tables before RLS is enabled is instantly cross-tenant readable.

### All 16 RLS-disabled tables

| Table | Module | Rows | Risk |
|---|---|---|---|
| `inv_asn_lines` | Inventory (WMS) | 0 | LOW — empty |
| `inv_asns` | Inventory (WMS) | 0 | LOW — empty |
| `inv_channel_pools` | Inventory (WMS) | 0 | LOW — empty |
| `inv_dock_appointments` | Inventory (WMS) | 0 | LOW — empty |
| `inv_dock_doors` | Inventory (WMS) | 0 | LOW — empty |
| `inv_handling_units` | Inventory (WMS) | 0 | LOW — empty |
| `inv_kit_components` | Inventory (WMS) | 0 | LOW — empty |
| `inv_labor_records` | Inventory (WMS) | 0 | LOW — empty |
| `inv_platform_payout_lines` | Inventory (platform) | 0 | LOW — empty |
| `inv_platform_po_lines` | Inventory (platform) | 0 | LOW — empty |
| `inv_platform_purchase_orders` | Inventory (platform) | 0 | LOW — empty |
| `inv_slotting_recommendations` | Inventory (WMS) | 0 | LOW — empty |
| `inv_slotting_rules` | Inventory (WMS) | 0 | LOW — empty |
| `inv_velocity_classes` | Inventory (WMS) | 0 | LOW — empty |
| `operator_access_grants` | Platform admin | 0 | LOW — empty |
| `operator_access_log` | Platform admin | 0 | LOW — empty |

**Pattern:** 14 of 16 are inventory WMS tables (advanced warehouse management sub-features). Two are platform admin tables (`operator_access_grants`, `operator_access_log`) which hold cross-org platform admin privileges — these should be checked whether they should even carry `org_id` RLS or whether they are intentionally platform-scoped.

**Fix required before any of these tables receive production data:**
```sql
-- For each table: enable RLS and add the standard tenant policy
ALTER TABLE <tname> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <tname>
  USING (org_id = app.current_org_id());
```
The migration must also grant `EXECUTE` on `app.current_org_id()` to `streamline_app` if not already present, and run `VACUUM ANALYZE <tname>` after.

---

## Failure Mode (b): RLS Enabled, Zero Policies

**Count: 0.** No table is in this state. A table with RLS enabled but no policies denies all access to non-owner sessions; finding zero here means no accidental lockout exists.

---

## Non-Empty RLS-Covered Tables (86 tables, sorted by row count)

These tables have live tenant data and working RLS policies. The isolation proof for these is **OPEN** until `streamline_app` auth is repaired. Counts are cross-org totals from the owner role (BYPASSRLS).

| Table | Rows |
|---|---|
| `kb_article_chunks` | 30 000 |
| `timesheets` | 15 000 |
| `role_permission_grants` | 5 626 |
| `hr_employments` | 5 000 |
| `hr_people` | 5 000 |
| `chat_messages` | 4 250 |
| `hr_reporting_lines` | 1 000 |
| `contacts` | 960 |
| `leads` | 960 |
| `deals` | 904 |
| `kb_pages` | 850 |
| `attendance` | 640 |
| `leave_requests` | 510 |
| `ai_usage_logs` | 401 |
| `notifications_y2026_m08` | 355 |
| `clients` | 350 |
| `invoices` | 350 |
| `hr_leave_ledger` | 340 |
| `inv_stock_transactions` | 338 |
| `purchase_bills` | 325 |
| `chat_channel_members` | 240 |
| `roles` | 170 |
| `notification_events` | 154 |
| `chat_saved_messages` | 120 |
| `support_tickets` | 120 |
| `kb_page_visits` | 100 |
| `payroll_line_items` | 96 |
| `org_modules` | 79 |
| `inv_product_variants` | 73 |
| `inv_products` | 73 |
| `inv_stock_levels` | 67 |
| `chat_channels` | 60 |
| `module_setup_checklist_items` | 54 |
| `organization_members` | 46 |
| `gl_journals` | 35 |
| `inv_purchase_orders` | 30 |
| `org_units` | 22 |
| `inv_audit_events` | 20 |
| `leave_balances` | 20 |
| `payroll_run_employees` | 20 |
| `inv_idempotency_keys` | 17 |
| `inv_vendors` | 17 |
| `module_ownerships` | 15 |
| `leave_types` | 14 |
| `module_setup_checklists` | 13 |
| `audit_logs` | 11 |
| `inv_locations` | 9 |
| `kb_spaces` | 9 |
| `payroll_statutory_rule_sets` | 8 |
| `subscriptions` | 8 |
| `access_versions` | 7 |
| `inv_po_lines` | 7 |
| `login_history` | 7 |
| `inv_grn_lines` | 6 |
| `account_organization_index` | 5 |
| `gl_periods` | 5 |
| `inv_landed_cost_allocations` | 5 |
| `inv_valuation_layers` | 5 |
| `payroll_runs` | 5 |
| `inv_grns` | 4 |
| `inv_landed_cost_charges` | 4 |
| `inv_landed_cost_vouchers` | 4 |
| `kb_space_members` | 4 |
| `onboarding_analytics_events` | 4 |
| `role_assignments` | 4 |
| `inv_number_sequences` | 3 |
| `inv_settings` | 3 |
| `inv_valuation_consumptions` | 3 |
| `inv_warehouses` | 3 |
| `quote_line_items` | 3 |
| `quotes` | 3 |
| `ai_credit_transactions` | 2 |
| `hr_legal_holds` | 2 |
| `inv_uom` | 2 |
| `kb_events` | 2 |
| `notification_deliveries` | 2 |
| `onboarding_flow_sessions` | 2 |
| `org_ai_credits` | 2 |
| `organization_legal_holds` | 2 |
| `ai_credit_reservations` | 1 |
| `gl_books` | 1 |
| `gl_fiscal_years` | 1 |
| `inv_barcodes` | 1 |
| `inv_channels` | 1 |
| `inv_lots` | 1 |
| `notification_queue` | 1 |

---

## Isolation Proof Status

**OPEN** — `streamline_app` authentication fails with `28P01`. The isolation proof (`rls-probe.mjs`) requires running queries as `streamline_app` with no BYPASSRLS; substituting the owner connection would defeat the proof.

**Runbook to unblock:**
1. Log in to `console.neon.tech` → project `ep-orange-mode-azxn5hbr`
2. Roles → `streamline_app` → Reset password → copy new password
3. Update `APP_DATABASE_URL` in `backend/.env` and all deploy secrets/configs
4. Run: `node --env-file=backend/.env backend/scripts/rls-probe.mjs`
5. The script exits 0 and prints `PROVEN ISOLATED` for each sampled table when passing

**Note:** The Neon pooler drops startup parameters. The GUC `app.organization_id` must be set with `SET LOCAL` inside a transaction — `rls-probe.mjs` already does this correctly.

---

## Summary

- **97.9 %** of tenant tables are protected (801/817).
- **16 tables** have no RLS; all are empty today. They are concentrated in the inventory WMS sub-module and platform admin. Enable RLS before any of these tables receive production writes.
- **Zero** tables sit in the worst state (RLS on, zero policies = deny-all).
- **86** RLS-covered tables are non-empty; the highest-risk by volume are `kb_article_chunks` (30 k), `timesheets` (15 k), `role_permission_grants` (5.6 k), `hr_employments`/`hr_people` (5 k each).
- Cross-tenant isolation proof is **OPEN** pending `streamline_app` password repair.
