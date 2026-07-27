-- =============================================================================
-- PARTY CUTOVER — PHASE 7: Drop legacy columns and tables
-- =============================================================================
-- What:  Removes legacy int FK columns and ultimately drops clients,
--        crm_organizations (Track B), and inv_vendors (Track C).
-- Risk:  HIGH — irreversible. Requires maintenance window.
-- Prereq:
--   1. Phase 5 complete — ALL composite FKs VALIDATED.
--   2. Phase 6 complete — legacy columns confirmed not written for >= 30 days.
--   3. Full database backup taken and restore-tested.
--   4. Drizzle schema files updated to remove legacy columns BEFORE running this SQL
--      (run db:generate to verify no schema diff after this migration).
--   5. The telemetry query §PRE-FLIGHT A returns 0 writes for 30 days.
-- Rollback: NOT POSSIBLE after DROP TABLE. Back up first. Always.
-- Idempotent: yes — DROP IF EXISTS on all steps.
-- =============================================================================

SET statement_timeout = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT A: Verify no legacy column is still receiving writes
-- Adjust the date to the Phase 6 deploy date.
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- Check: any invoice created after Phase 6 deploy still has a client_id set?
SELECT COUNT(*) AS invoices_with_legacy_client_id_after_phase6
FROM invoices
WHERE created_at >= '2026-09-01'   -- replace with Phase 6 deploy date
  AND client_id IS NOT NULL;
-- Expect: 0

SELECT COUNT(*) AS bills_with_legacy_vendor_id_after_phase6
FROM purchase_bills
WHERE created_at >= '2026-09-01'
  AND vendor_id IS NOT NULL;
-- Expect: 0

-- Check all NOT VALID FKs are gone:
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND conname LIKE 'fk_%_party%' AND NOT convalidated;
-- Expect: 0 rows
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT B: Verify no remaining FK constraints point to clients / inv_vendors
--                after Phase 6 removed the old FK declarations in app code.
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT con.conname, rel.relname AS child_table, a.attname AS child_col
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
JOIN pg_class relf ON relf.oid = con.confrelid
WHERE con.contype = 'f'
  AND relf.relname IN ('clients', 'inv_vendors', 'crm_organizations')
ORDER BY rel.relname, a.attname;
-- This shows every FK still pointing to legacy tables.
-- ALL of these must be dropped before DROP TABLE will succeed.
-- If non-zero: run the DROP CONSTRAINT statements in §A before §B.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §A. Drop legacy int FK columns from consumer tables
--     These are the old client_id / vendor_id columns that pointed to clients.id.
--     Do NOT drop party_id (that is the new column).
-- ─────────────────────────────────────────────────────────────────────────────

-- First: drop the legacy FK constraints (if Phase 6 DDL did not already do so)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname AS tbl
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class relf ON relf.oid = con.confrelid
    WHERE con.contype = 'f' AND relf.relname = 'clients'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.tbl, r.conname);
    RAISE NOTICE 'Dropped FK: %.%', r.tbl, r.conname;
  END LOOP;
END $$;

-- Now drop the legacy int columns:
ALTER TABLE client_opportunities    DROP COLUMN IF EXISTS client_id;
ALTER TABLE client_onboarding_items DROP COLUMN IF EXISTS client_id;
ALTER TABLE csat_surveys            DROP COLUMN IF EXISTS client_id;
ALTER TABLE deals                   DROP COLUMN IF EXISTS client_id;
ALTER TABLE invoices                DROP COLUMN IF EXISTS client_id;
ALTER TABLE purchase_bills          DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE support_tickets         DROP COLUMN IF EXISTS client_id;
ALTER TABLE support_vip_clients     DROP COLUMN IF EXISTS client_id;
ALTER TABLE credit_notes            DROP COLUMN IF EXISTS client_id;
ALTER TABLE vendor_credits          DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE fin_recurring_invoice_templates DROP COLUMN IF EXISTS client_id;
ALTER TABLE fin_recurring_bill_templates    DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE fin_collection_activities DROP COLUMN IF EXISTS client_id;
ALTER TABLE fin_payment_run_items   DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE acc_fixed_assets        DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE inv_vendors             DROP COLUMN IF EXISTS client_id;
ALTER TABLE inv_sales_orders        DROP COLUMN IF EXISTS client_id;
ALTER TABLE inv_customer_returns    DROP COLUMN IF EXISTS client_id;
ALTER TABLE journal_lines           DROP COLUMN IF EXISTS client_id;
ALTER TABLE journal_lines           DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE timesheet_budgets       DROP COLUMN IF EXISTS client_id;
ALTER TABLE timesheet_rates         DROP COLUMN IF EXISTS client_id;

-- Track B: drop crm_organizations int FK from contacts
ALTER TABLE contacts                DROP COLUMN IF EXISTS organization_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- §B. Drop legacy tables
--     Order: children first (to avoid FK violations), then parents.
--     Verify no remaining FKs before each DROP TABLE (use PRE-FLIGHT B above).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. client_account_activities (child of client_accounts)
DROP TABLE IF EXISTS client_account_activities;

-- 2. client_accounts (dependent on leads, branches; no FK into clients directly)
DROP TABLE IF EXISTS client_accounts;

-- 3. clients (the primary legacy table)
--    SAFETY CHECK: verify zero FK dependents before running
--    SELECT COUNT(*) FROM pg_constraint WHERE confrelid = 'clients'::regclass::oid;
DROP TABLE IF EXISTS clients;

-- Track B: crm_organizations
-- Children: contacts.organization_id already dropped in §A.
-- crm_party_accounts.crm_organization_id must also be dropped first:
ALTER TABLE crm_party_accounts DROP COLUMN IF EXISTS crm_organization_id;
-- crm_organizations self-refs (parent_id, merged_into_id) will cascade with DROP TABLE.
DROP TABLE IF EXISTS crm_organizations;

-- Track C: inv_vendors
-- Children: inv_purchase_orders, inv_vendor_returns, inv_reorder_rules still reference
-- inv_vendors.id. These must be migrated to reference inv_party_vendor_profiles first
-- (Track C sub-migration — NOT part of this file).
-- Placeholder: DROP TABLE inv_vendors will fail if these FKs exist.
-- Complete Track C migration separately before running:
/*
DROP TABLE IF EXISTS inv_vendors;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §C. Drop bridge/map tables (no longer needed after drop is complete)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS party_migration_client_map;
DROP TABLE IF EXISTS party_migration_vendor_map;
DROP TABLE IF EXISTS party_migration_org_map;

-- ─────────────────────────────────────────────────────────────────────────────
-- §D. Post-drop verification
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- Verify tables are gone:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clients','crm_organizations','client_accounts',
                     'client_account_activities',
                     'party_migration_client_map','party_migration_vendor_map',
                     'party_migration_org_map');
-- Expect: 0 rows (all dropped).

-- Verify no orphaned legacy columns remain:
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('client_id','vendor_id')
  AND table_name NOT IN (
    -- Tables where vendor_id / client_id is NOT a legacy int FK to clients:
    'inv_purchase_orders',   -- vendor_id -> inv_vendors (Track C, not yet dropped)
    'inv_vendor_returns',
    'inv_reorder_rules'
  )
ORDER BY table_name;
-- Expect: 0 rows (all legacy int FKs removed).

-- Verify new composite FKs are in place and validated:
SELECT conrelid::regclass, conname, convalidated
FROM pg_constraint
WHERE contype = 'f' AND conname LIKE 'fk_%_party%'
ORDER BY conrelid::regclass::text;
-- All should show convalidated = true.
*/
