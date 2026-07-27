-- =============================================================================
-- PARTY CUTOVER — PHASE 1: Add nullable shadow columns + bridge tables + indexes
-- =============================================================================
-- What:  Adds party_id TEXT NULL alongside every legacy int client_id / vendor_id
--        column in each consumer table. Creates the three bridge (map) tables.
--        Builds indexes CONCURRENTLY (no table lock).
-- Risk:  ZERO — all columns are NULL and unused. No behavior change.
-- Prereq: Migrations 0307, 0317, 0324 applied (business_parties + overlays + FKs).
-- Rollback: party-cutover-phase1-rollback.sql (DROP COLUMN for each, DROP TABLE map).
-- Idempotent: yes — every block is guarded by IF NOT EXISTS / column-existence check.
-- =============================================================================

SET statement_timeout = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- §A. Bridge / map tables
-- These are NOT Drizzle-managed (no schema file). They exist only during the
-- migration window and are dropped in Phase 7.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS party_migration_client_map (
  org_id     TEXT    NOT NULL,
  client_id  INTEGER NOT NULL,
  party_id   TEXT    NOT NULL,
  source     TEXT    NOT NULL DEFAULT 'clients',
  mapped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT party_migration_client_map_pkey PRIMARY KEY (org_id, client_id),
  CONSTRAINT party_migration_client_map_party_id_uq UNIQUE (party_id)
);

CREATE TABLE IF NOT EXISTS party_migration_vendor_map (
  org_id     TEXT    NOT NULL,
  vendor_id  INTEGER NOT NULL,
  party_id   TEXT    NOT NULL,
  mapped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT party_migration_vendor_map_pkey PRIMARY KEY (org_id, vendor_id),
  CONSTRAINT party_migration_vendor_map_party_id_uq UNIQUE (party_id)
);

CREATE TABLE IF NOT EXISTS party_migration_org_map (
  org_id     TEXT    NOT NULL,
  crm_org_id INTEGER NOT NULL,
  party_id   TEXT    NOT NULL,
  mapped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT party_migration_org_map_pkey PRIMARY KEY (org_id, crm_org_id),
  CONSTRAINT party_migration_org_map_party_id_uq UNIQUE (party_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §B. Shadow party_id columns — Track A consumers (clients.id -> business_parties)
-- ─────────────────────────────────────────────────────────────────────────────

-- client_opportunities
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_opportunities' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE client_opportunities ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- client_onboarding_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_onboarding_items' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE client_onboarding_items ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- csat_surveys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'csat_surveys' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE csat_surveys ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- deals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- invoices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- purchase_bills (vendor_id -> clients.id; shadow column is party_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_bills' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE purchase_bills ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- support_tickets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- support_vip_clients
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_vip_clients' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE support_vip_clients ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- credit_notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE credit_notes ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- vendor_credits (vendor_id -> clients.id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_credits' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE vendor_credits ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- fin_recurring_invoice_templates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fin_recurring_invoice_templates' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE fin_recurring_invoice_templates ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- fin_recurring_bill_templates (vendor_id -> clients.id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fin_recurring_bill_templates' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE fin_recurring_bill_templates ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- fin_collection_activities  (client_id NOT NULL — shadow is nullable; NOT NULL added in Phase 6)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fin_collection_activities' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE fin_collection_activities ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- fin_payment_run_items (vendor_id -> clients.id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fin_payment_run_items' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE fin_payment_run_items ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- acc_fixed_assets (vendor_id -> clients.id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'acc_fixed_assets' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE acc_fixed_assets ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- inv_vendors.client_id -> shadow party_id on inv_vendors itself
-- (when client_id IS NOT NULL, party_id maps to the same business_party as the client)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inv_vendors' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE inv_vendors ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- inv_sales_orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inv_sales_orders' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE inv_sales_orders ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- inv_customer_returns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inv_customer_returns' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE inv_customer_returns ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- journal_lines: two shadow columns (one for client, one for vendor)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_lines' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE journal_lines ADD COLUMN party_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_lines' AND column_name = 'vendor_party_id'
  ) THEN
    ALTER TABLE journal_lines ADD COLUMN vendor_party_id TEXT;
  END IF;
END $$;

-- timesheet_budgets (bare int, no FK — shadow column added for backfill)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_budgets' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE timesheet_budgets ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- timesheet_rates (bare int, no FK)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_rates' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE timesheet_rates ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §C. Shadow party_id columns — Track B (crm_organizations.id -> business_parties)
-- ─────────────────────────────────────────────────────────────────────────────

-- crm_organizations gets its own party_id (the org itself becomes a party)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_organizations' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE crm_organizations ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- contacts.organization_id currently references crm_organizations.id (int).
-- Add shadow contacts.party_id pointing directly to business_parties.party_id.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN party_id TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §D. Concurrent indexes (no table lock; safe to run online)
--     Run these after §A–§C are committed. They may take minutes on large tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Run each statement below in its own psql session (NOT wrapped in BEGIN/COMMIT).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_opportunities_party
  ON client_opportunities (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_onboarding_items_party
  ON client_onboarding_items (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_csat_surveys_party
  ON csat_surveys (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_party
  ON deals (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_party
  ON invoices (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_bills_party
  ON purchase_bills (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_party
  ON support_tickets (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_vip_clients_party
  ON support_vip_clients (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_notes_party
  ON credit_notes (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_credits_party
  ON vendor_credits (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fin_collection_activities_party
  ON fin_collection_activities (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fin_payment_run_items_party
  ON fin_payment_run_items (run_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_acc_fixed_assets_party
  ON acc_fixed_assets (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inv_vendors_party
  ON inv_vendors (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inv_sales_orders_party
  ON inv_sales_orders (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inv_customer_returns_party
  ON inv_customer_returns (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_lines_party
  ON journal_lines (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_lines_vendor_party
  ON journal_lines (org_id, vendor_party_id)
  WHERE vendor_party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_organizations_party
  ON crm_organizations (org_id, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_party
  ON contacts (org_id, party_id)
  WHERE party_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- §E. Phase 1 verification — run after §A–§D complete
-- Expect: one row per table listed, all reporting 'shadow_column_exists'
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT table_name, column_name, data_type,
       'shadow_column_exists' AS status
FROM information_schema.columns
WHERE column_name = 'party_id'
  AND table_name IN (
    'client_opportunities','client_onboarding_items','csat_surveys','deals',
    'invoices','purchase_bills','support_tickets','support_vip_clients',
    'credit_notes','vendor_credits','fin_recurring_invoice_templates',
    'fin_recurring_bill_templates','fin_collection_activities',
    'fin_payment_run_items','acc_fixed_assets','inv_vendors',
    'inv_sales_orders','inv_customer_returns','journal_lines',
    'timesheet_budgets','timesheet_rates',
    'crm_organizations','contacts'
  )
ORDER BY table_name;
-- Should return 23 rows (journal_lines also has vendor_party_id — check separately).

SELECT table_name FROM information_schema.tables
WHERE table_name IN (
  'party_migration_client_map',
  'party_migration_vendor_map',
  'party_migration_org_map'
);
-- Expect 3 rows.
*/
