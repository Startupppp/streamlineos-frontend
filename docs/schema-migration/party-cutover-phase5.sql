-- =============================================================================
-- PARTY CUTOVER — PHASE 5: Composite FK installation (highest-risk step)
-- =============================================================================
-- What:  Adds composite (org_id, party_id) -> business_parties FKs to every
--        consumer table. Uses NOT VALID first, then VALIDATE in a separate step.
-- Risk:  MEDIUM-HIGH — VALIDATE acquires ShareUpdateExclusiveLock on the target
--        table, blocking DDL and autovacuum (but NOT reads or writes).
-- Prereq:
--   1. Phase 4 live >= 14 days.
--   2. Zero party_id NULLs on invoices, purchase_bills, fin_collection_activities.
--   3. UNIQUE CONSTRAINT uniq_business_parties_org_party exists on business_parties
--      (added in migration 0324_recon_directory_party_fks.sql).
-- Order: validate smallest tables first; schedule invoices + purchase_bills in a
--        dedicated maintenance window (these may take minutes).
-- Rollback per table: DROP CONSTRAINT fk_{table}_org_party (instant).
-- =============================================================================

SET statement_timeout = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT: Verify zero NULLs on critical tables before adding any FK
-- Run BEFORE executing §A. Abort if any count > 0.
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT 'invoices_nulls'              AS check_name, COUNT(*) AS null_count
FROM invoices WHERE client_id IS NOT NULL AND party_id IS NULL
UNION ALL
SELECT 'purchase_bills_nulls',         COUNT(*)
FROM purchase_bills WHERE vendor_id IS NOT NULL AND party_id IS NULL
UNION ALL
SELECT 'fin_collection_activities_nulls', COUNT(*)
FROM fin_collection_activities WHERE party_id IS NULL
UNION ALL
SELECT 'support_vip_clients_nulls',    COUNT(*)
FROM support_vip_clients WHERE party_id IS NULL;
-- ALL must be 0 before adding NOT VALID FKs.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §A. ADD CONSTRAINT ... NOT VALID (instant, no row scan)
--     Order: smallest/least-critical tables first.
--     Each block is idempotent (guarded by pg_constraint check).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. client_opportunities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_client_opps_org_party') THEN
    ALTER TABLE client_opportunities
      ADD CONSTRAINT fk_client_opps_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 2. client_onboarding_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_client_onboarding_items_org_party') THEN
    ALTER TABLE client_onboarding_items
      ADD CONSTRAINT fk_client_onboarding_items_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 3. csat_surveys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_csat_surveys_org_party') THEN
    ALTER TABLE csat_surveys
      ADD CONSTRAINT fk_csat_surveys_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 4. support_vip_clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_support_vip_clients_org_party') THEN
    ALTER TABLE support_vip_clients
      ADD CONSTRAINT fk_support_vip_clients_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 5. deals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deals_org_party') THEN
    ALTER TABLE deals
      ADD CONSTRAINT fk_deals_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 6. support_tickets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_support_tickets_org_party') THEN
    ALTER TABLE support_tickets
      ADD CONSTRAINT fk_support_tickets_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 7. inv_sales_orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inv_sales_orders_org_party') THEN
    ALTER TABLE inv_sales_orders
      ADD CONSTRAINT fk_inv_sales_orders_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 8. inv_customer_returns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inv_customer_returns_org_party') THEN
    ALTER TABLE inv_customer_returns
      ADD CONSTRAINT fk_inv_customer_returns_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 9. credit_notes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_credit_notes_org_party') THEN
    ALTER TABLE credit_notes
      ADD CONSTRAINT fk_credit_notes_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 10. vendor_credits
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendor_credits_org_party') THEN
    ALTER TABLE vendor_credits
      ADD CONSTRAINT fk_vendor_credits_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 11. fin_payment_run_items (no org_id column; skip composite FK — use party_id only FK)
--     fin_payment_run_items has no org_id column directly. The FK here is single-column
--     (party_id -> business_parties.party_id), not composite. Composite FKs require both
--     columns in the child table. Since party_id is a UUID (globally unique), a bare
--     party_id FK is safe (no cross-tenant ambiguity).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fin_payment_run_items_party') THEN
    ALTER TABLE fin_payment_run_items
      ADD CONSTRAINT fk_fin_payment_run_items_party
      FOREIGN KEY (party_id)
      REFERENCES business_parties(party_id)
      NOT VALID;
  END IF;
END $$;

-- 12. fin_recurring_invoice_templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fin_recur_inv_tmpl_org_party') THEN
    ALTER TABLE fin_recurring_invoice_templates
      ADD CONSTRAINT fk_fin_recur_inv_tmpl_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 13. fin_recurring_bill_templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fin_recur_bill_tmpl_org_party') THEN
    ALTER TABLE fin_recurring_bill_templates
      ADD CONSTRAINT fk_fin_recur_bill_tmpl_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 14. fin_collection_activities  (NOT NULL party_id required — verify pre-flight before adding)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fin_collection_activities_org_party') THEN
    ALTER TABLE fin_collection_activities
      ADD CONSTRAINT fk_fin_collection_activities_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 15. acc_fixed_assets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_acc_fixed_assets_org_party') THEN
    ALTER TABLE acc_fixed_assets
      ADD CONSTRAINT fk_acc_fixed_assets_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- 16. journal_lines — client-side party_id  (org_id may be NULL on some rows; use bare FK)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_journal_lines_party') THEN
    ALTER TABLE journal_lines
      ADD CONSTRAINT fk_journal_lines_party
      FOREIGN KEY (party_id)
      REFERENCES business_parties(party_id)
      NOT VALID;
  END IF;
END $$;

-- journal_lines — vendor-side vendor_party_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_journal_lines_vendor_party') THEN
    ALTER TABLE journal_lines
      ADD CONSTRAINT fk_journal_lines_vendor_party
      FOREIGN KEY (vendor_party_id)
      REFERENCES business_parties(party_id)
      NOT VALID;
  END IF;
END $$;

-- 17. inv_vendors
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inv_vendors_org_party') THEN
    ALTER TABLE inv_vendors
      ADD CONSTRAINT fk_inv_vendors_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §B. VALIDATE CONSTRAINT — run each statement in a separate maintenance window.
--     VALIDATE acquires ShareUpdateExclusiveLock (no read/write block, but blocks DDL).
--     Set lock_timeout to avoid hanging: if blocked, it fails and can be retried.
--     Run one table at a time. Do NOT batch-validate in a single session.
-- ─────────────────────────────────────────────────────────────────────────────

-- Template (execute individually, NOT as a batch):
/*
SET lock_timeout = '30s';   -- fail fast if blocked by another DDL session
ALTER TABLE client_opportunities      VALIDATE CONSTRAINT fk_client_opps_org_party;
ALTER TABLE client_onboarding_items   VALIDATE CONSTRAINT fk_client_onboarding_items_org_party;
ALTER TABLE csat_surveys              VALIDATE CONSTRAINT fk_csat_surveys_org_party;
ALTER TABLE support_vip_clients       VALIDATE CONSTRAINT fk_support_vip_clients_org_party;
ALTER TABLE deals                     VALIDATE CONSTRAINT fk_deals_org_party;
ALTER TABLE support_tickets           VALIDATE CONSTRAINT fk_support_tickets_org_party;
ALTER TABLE inv_sales_orders          VALIDATE CONSTRAINT fk_inv_sales_orders_org_party;
ALTER TABLE inv_customer_returns      VALIDATE CONSTRAINT fk_inv_customer_returns_org_party;
ALTER TABLE credit_notes              VALIDATE CONSTRAINT fk_credit_notes_org_party;
ALTER TABLE vendor_credits            VALIDATE CONSTRAINT fk_vendor_credits_org_party;
ALTER TABLE fin_payment_run_items     VALIDATE CONSTRAINT fk_fin_payment_run_items_party;
ALTER TABLE fin_recurring_invoice_templates VALIDATE CONSTRAINT fk_fin_recur_inv_tmpl_org_party;
ALTER TABLE fin_recurring_bill_templates    VALIDATE CONSTRAINT fk_fin_recur_bill_tmpl_org_party;
ALTER TABLE fin_collection_activities VALIDATE CONSTRAINT fk_fin_collection_activities_org_party;
ALTER TABLE acc_fixed_assets          VALIDATE CONSTRAINT fk_acc_fixed_assets_org_party;
ALTER TABLE journal_lines             VALIDATE CONSTRAINT fk_journal_lines_party;
ALTER TABLE journal_lines             VALIDATE CONSTRAINT fk_journal_lines_vendor_party;
ALTER TABLE inv_vendors               VALIDATE CONSTRAINT fk_inv_vendors_org_party;
-- Schedule last (largest tables — dedicated maintenance window):
ALTER TABLE invoices                  VALIDATE CONSTRAINT fk_invoices_org_party;
ALTER TABLE purchase_bills            VALIDATE CONSTRAINT fk_purchase_bills_org_party;
*/

-- invoices (add NOT VALID first — separate block because this is the most critical)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_org_party') THEN
    ALTER TABLE invoices
      ADD CONSTRAINT fk_invoices_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- purchase_bills
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_bills_org_party') THEN
    ALTER TABLE purchase_bills
      ADD CONSTRAINT fk_purchase_bills_org_party
      FOREIGN KEY (org_id, party_id)
      REFERENCES business_parties(organization_id, party_id)
      NOT VALID;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §C. Verify FK status — check which constraints are still NOT VALID
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT conrelid::regclass AS table_name,
       conname             AS constraint_name,
       CASE convalidated WHEN true THEN 'VALID' ELSE 'NOT VALID' END AS status
FROM pg_constraint
WHERE contype = 'f'
  AND conname LIKE 'fk_%_party%'
ORDER BY table_name, conname;
-- All rows should show 'VALID' before Phase 6 begins.
-- Any 'NOT VALID' rows mean VALIDATE has not been run yet for that table.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §D. Rollback — per-table FK removal (instant; leaves shadow party_id column)
-- ─────────────────────────────────────────────────────────────────────────────

/*
ALTER TABLE client_opportunities      DROP CONSTRAINT IF EXISTS fk_client_opps_org_party;
ALTER TABLE client_onboarding_items   DROP CONSTRAINT IF EXISTS fk_client_onboarding_items_org_party;
ALTER TABLE csat_surveys              DROP CONSTRAINT IF EXISTS fk_csat_surveys_org_party;
ALTER TABLE support_vip_clients       DROP CONSTRAINT IF EXISTS fk_support_vip_clients_org_party;
ALTER TABLE deals                     DROP CONSTRAINT IF EXISTS fk_deals_org_party;
ALTER TABLE support_tickets           DROP CONSTRAINT IF EXISTS fk_support_tickets_org_party;
ALTER TABLE inv_sales_orders          DROP CONSTRAINT IF EXISTS fk_inv_sales_orders_org_party;
ALTER TABLE inv_customer_returns      DROP CONSTRAINT IF EXISTS fk_inv_customer_returns_org_party;
ALTER TABLE credit_notes              DROP CONSTRAINT IF EXISTS fk_credit_notes_org_party;
ALTER TABLE vendor_credits            DROP CONSTRAINT IF EXISTS fk_vendor_credits_org_party;
ALTER TABLE fin_payment_run_items     DROP CONSTRAINT IF EXISTS fk_fin_payment_run_items_party;
ALTER TABLE fin_recurring_invoice_templates DROP CONSTRAINT IF EXISTS fk_fin_recur_inv_tmpl_org_party;
ALTER TABLE fin_recurring_bill_templates    DROP CONSTRAINT IF EXISTS fk_fin_recur_bill_tmpl_org_party;
ALTER TABLE fin_collection_activities DROP CONSTRAINT IF EXISTS fk_fin_collection_activities_org_party;
ALTER TABLE acc_fixed_assets          DROP CONSTRAINT IF EXISTS fk_acc_fixed_assets_org_party;
ALTER TABLE journal_lines             DROP CONSTRAINT IF EXISTS fk_journal_lines_party;
ALTER TABLE journal_lines             DROP CONSTRAINT IF EXISTS fk_journal_lines_vendor_party;
ALTER TABLE inv_vendors               DROP CONSTRAINT IF EXISTS fk_inv_vendors_org_party;
ALTER TABLE invoices                  DROP CONSTRAINT IF EXISTS fk_invoices_org_party;
ALTER TABLE purchase_bills            DROP CONSTRAINT IF EXISTS fk_purchase_bills_org_party;
*/
