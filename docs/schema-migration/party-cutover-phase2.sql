-- =============================================================================
-- PARTY CUTOVER — PHASE 2: Batched backfill
-- =============================================================================
-- What:  Creates business_parties rows from clients, inv_vendors, crm_organizations.
--        Populates shadow party_id columns in all consumer tables.
-- Risk:  LOW — all writes are additive. Legacy int columns unchanged.
-- Prereq: Phase 1 complete (bridge tables + shadow columns exist).
-- Idempotent: yes — every INSERT checks the map table first.
-- Batch size: 500 rows per statement. Adjust _batch_size if row counts are large.
-- Rollback: §ROLLBACK block at the bottom of this file.
-- =============================================================================

SET statement_timeout = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT A: Duplicate (org_id, name) detection in clients
-- Run this FIRST. If any row returns, resolve before executing Phase 2A.
-- Options: merge rows, rename one, or accept multiple parties with the same name.
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT org_id, name, COUNT(*) AS occurrences,
       array_agg(id ORDER BY id) AS client_ids
FROM clients
WHERE deleted_at IS NULL
GROUP BY org_id, name
HAVING COUNT(*) > 1
ORDER BY occurrences DESC, org_id, name
LIMIT 100;
-- Zero rows = safe to proceed.
-- Non-zero = each name collision will produce N separate business_parties rows.
-- Decide: merge (manual UPDATE + DELETE), rename, or accept duplicates.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT B: Clients appearing in BOTH invoices AND purchase_bills
-- These should be reviewed and their party_type set to 'BOTH' after backfill.
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT c.org_id, c.id AS client_id, c.name,
       c.is_vendor,
       COUNT(DISTINCT i.id)  AS invoice_count,
       COUNT(DISTINCT pb.id) AS purchase_bill_count
FROM clients c
LEFT JOIN invoices      i  ON i.client_id  = c.id
LEFT JOIN purchase_bills pb ON pb.vendor_id = c.id
WHERE i.id IS NOT NULL OR pb.id IS NOT NULL
GROUP BY c.org_id, c.id, c.name, c.is_vendor
HAVING COUNT(DISTINCT i.id) > 0 AND COUNT(DISTINCT pb.id) > 0
ORDER BY c.org_id, c.id
LIMIT 100;
-- After Phase 2A runs, UPDATE business_parties SET party_type = 'BOTH'
-- WHERE party_id IN (SELECT party_id FROM party_migration_client_map WHERE client_id IN (...));
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT C: Row counts — size the job before running
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT 'clients'          AS tbl, COUNT(*) FROM clients
UNION ALL
SELECT 'inv_vendors_no_client', COUNT(*) FROM inv_vendors WHERE client_id IS NULL
UNION ALL
SELECT 'crm_organizations',     COUNT(*) FROM crm_organizations WHERE deleted_at IS NULL
UNION ALL
SELECT 'business_parties_existing', COUNT(*) FROM business_parties;
-- business_parties_existing MUST be 0 before Phase 2A runs (or reconcile first).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §PRE-FLIGHT D: Timesheet bare-int sanity — does client_id reference real clients?
-- ─────────────────────────────────────────────────────────────────────────────

/*
SELECT 'timesheet_budgets' AS tbl,
       COUNT(*)            AS total_rows,
       COUNT(tb.client_id) AS rows_with_client_id,
       COUNT(c.id)         AS matched_to_clients,
       COUNT(tb.client_id) - COUNT(c.id) AS orphaned_client_ids
FROM timesheet_budgets tb
LEFT JOIN clients c ON c.id = tb.client_id AND c.org_id = tb.org_id;

SELECT 'timesheet_rates' AS tbl,
       COUNT(*)          AS total_rows,
       COUNT(tr.client_id) AS rows_with_client_id,
       COUNT(c.id)         AS matched_to_clients,
       COUNT(tr.client_id) - COUNT(c.id) AS orphaned_client_ids
FROM timesheet_rates tr
LEFT JOIN clients c ON c.id = tr.client_id AND c.org_id = tr.org_id;
-- Orphaned rows = values that reference a non-existent client.
-- These will NOT be backfilled (party_id stays NULL). Acceptable if count is low.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §2A: INSERT business_parties from clients (batched, idempotent)
--
-- Run this as a loop in psql or a migration script. The DO block processes one
-- batch of _batch_size rows. Repeat until 0 rows inserted (check affected rows).
--
-- For large tables: wrap in a shell loop:
--   while psql -c "... DO \$\$ ... \$\$" returns affected > 0; do sleep 0.1; done
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  _batch_size CONSTANT INT := 500;
  _inserted INT;
BEGIN
  WITH batch AS (
    SELECT c.id        AS client_id,
           c.org_id,
           c.name,
           c.email,
           c.phone,
           c.status,
           CASE WHEN c.is_vendor THEN 'VENDOR' ELSE 'CUSTOMER' END AS party_type,
           gen_random_uuid()::TEXT AS new_party_id
    FROM clients c
    WHERE NOT EXISTS (
      SELECT 1 FROM party_migration_client_map m
      WHERE m.org_id = c.org_id AND m.client_id = c.id
    )
    ORDER BY c.org_id, c.id
    LIMIT _batch_size
  ),
  inserted_parties AS (
    INSERT INTO business_parties (party_id, organization_id, name, email, phone, status, party_type,
                                  created_at, updated_at)
    SELECT b.new_party_id, b.org_id, b.name, b.email, b.phone,
           COALESCE(b.status, 'active'),
           b.party_type::party_type,
           NOW(), NOW()
    FROM batch b
    RETURNING party_id, organization_id
  ),
  map_insert AS (
    INSERT INTO party_migration_client_map (org_id, client_id, party_id, source)
    SELECT b.org_id, b.client_id, b.new_party_id, 'clients'
    FROM batch b
    ON CONFLICT (org_id, client_id) DO NOTHING
  )
  SELECT COUNT(*) INTO _inserted FROM batch;

  RAISE NOTICE 'Phase 2A batch: % rows inserted into business_parties', _inserted;
END $$;

-- Verify completion (run until this returns 0):
/*
SELECT COUNT(*) AS clients_not_yet_mapped
FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM party_migration_client_map m
  WHERE m.org_id = c.org_id AND m.client_id = c.id
);
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §2B: INSERT business_parties from inv_vendors with no client_id (Track C seed)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  _batch_size CONSTANT INT := 500;
  _inserted INT;
BEGIN
  WITH batch AS (
    SELECT v.id        AS vendor_id,
           v.org_id,
           v.name,
           v.email,
           v.phone,
           gen_random_uuid()::TEXT AS new_party_id
    FROM inv_vendors v
    WHERE v.client_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM party_migration_vendor_map m
        WHERE m.org_id = v.org_id AND m.vendor_id = v.id
      )
    ORDER BY v.org_id, v.id
    LIMIT _batch_size
  ),
  inserted_parties AS (
    INSERT INTO business_parties (party_id, organization_id, name, email, phone, status, party_type,
                                  created_at, updated_at)
    SELECT b.new_party_id, b.org_id, b.name, b.email, b.phone,
           'active', 'VENDOR'::party_type,
           NOW(), NOW()
    FROM batch b
    RETURNING party_id
  ),
  map_insert AS (
    INSERT INTO party_migration_vendor_map (org_id, vendor_id, party_id)
    SELECT b.org_id, b.vendor_id, b.new_party_id
    FROM batch b
    ON CONFLICT (org_id, vendor_id) DO NOTHING
  )
  SELECT COUNT(*) INTO _inserted FROM batch;

  RAISE NOTICE 'Phase 2B batch: % inv_vendors rows seeded into business_parties', _inserted;
END $$;

-- Also populate inv_vendors.party_id for vendors that DO have a client_id:
DO $$
DECLARE
  _batch_size CONSTANT INT := 500;
  _updated INT;
BEGIN
  WITH batch AS (
    SELECT v.id AS vendor_id, v.org_id, m.party_id
    FROM inv_vendors v
    JOIN party_migration_client_map m ON m.org_id = v.org_id AND m.client_id = v.client_id
    WHERE v.party_id IS NULL
      AND v.client_id IS NOT NULL
    LIMIT _batch_size
  )
  UPDATE inv_vendors v
  SET    party_id = b.party_id
  FROM   batch b
  WHERE  v.id = b.vendor_id AND v.org_id = b.org_id;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'Phase 2B (client-linked vendors): % rows backfilled', _updated;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2C: INSERT business_parties from crm_organizations (Track B)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  _batch_size CONSTANT INT := 500;
  _inserted INT;
BEGIN
  WITH batch AS (
    SELECT o.id AS crm_org_id,
           o.org_id,
           o.name,
           o.website,
           gen_random_uuid()::TEXT AS new_party_id
    FROM crm_organizations o
    WHERE o.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM party_migration_org_map m
        WHERE m.org_id = o.org_id AND m.crm_org_id = o.id
      )
    ORDER BY o.org_id, o.id
    LIMIT _batch_size
  ),
  inserted_parties AS (
    INSERT INTO business_parties (party_id, organization_id, name, website, status, party_type,
                                  created_at, updated_at)
    SELECT b.new_party_id, b.org_id, b.name, b.website,
           'active', 'CUSTOMER'::party_type,
           NOW(), NOW()
    FROM batch b
    RETURNING party_id
  ),
  map_insert AS (
    INSERT INTO party_migration_org_map (org_id, crm_org_id, party_id)
    SELECT b.org_id, b.crm_org_id, b.new_party_id
    FROM batch b
    ON CONFLICT (org_id, crm_org_id) DO NOTHING
  )
  SELECT COUNT(*) INTO _inserted FROM batch;

  RAISE NOTICE 'Phase 2C batch: % crm_organizations rows seeded into business_parties', _inserted;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2D: Shadow column backfill — all Track A consumer tables
-- Each block updates rows where party_id IS NULL, joining through the map table.
-- Batched at 500 rows per execution; repeat until 0 rows updated.
-- ─────────────────────────────────────────────────────────────────────────────

-- client_opportunities
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM client_opportunities t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL
    LIMIT 500
  )
  UPDATE client_opportunities t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'client_opportunities: % rows backfilled', _updated;
END $$;

-- client_onboarding_items
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM client_onboarding_items t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL
    LIMIT 500
  )
  UPDATE client_onboarding_items t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'client_onboarding_items: % rows backfilled', _updated;
END $$;

-- csat_surveys
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM csat_surveys t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE csat_surveys t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'csat_surveys: % rows backfilled', _updated;
END $$;

-- deals
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM deals t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE deals t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'deals: % rows backfilled', _updated;
END $$;

-- invoices  (LARGE TABLE — repeat this block until 0 rows updated)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM invoices t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE invoices t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'invoices: % rows backfilled', _updated;
END $$;

-- purchase_bills  (LARGE TABLE — repeat until 0 rows updated; vendor_id -> party_id)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM purchase_bills t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.vendor_id
    WHERE t.party_id IS NULL AND t.vendor_id IS NOT NULL
    LIMIT 500
  )
  UPDATE purchase_bills t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'purchase_bills: % rows backfilled', _updated;
END $$;

-- support_tickets
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM support_tickets t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE support_tickets t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'support_tickets: % rows backfilled', _updated;
END $$;

-- support_vip_clients
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM support_vip_clients t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL
    LIMIT 500
  )
  UPDATE support_vip_clients t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'support_vip_clients: % rows backfilled', _updated;
END $$;

-- credit_notes
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM credit_notes t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE credit_notes t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'credit_notes: % rows backfilled', _updated;
END $$;

-- vendor_credits  (vendor_id -> clients.id)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM vendor_credits t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.vendor_id
    WHERE t.party_id IS NULL AND t.vendor_id IS NOT NULL
    LIMIT 500
  )
  UPDATE vendor_credits t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'vendor_credits: % rows backfilled', _updated;
END $$;

-- fin_recurring_invoice_templates
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM fin_recurring_invoice_templates t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE fin_recurring_invoice_templates t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'fin_recurring_invoice_templates: % rows backfilled', _updated;
END $$;

-- fin_recurring_bill_templates  (vendor_id -> clients.id)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM fin_recurring_bill_templates t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.vendor_id
    WHERE t.party_id IS NULL AND t.vendor_id IS NOT NULL
    LIMIT 500
  )
  UPDATE fin_recurring_bill_templates t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'fin_recurring_bill_templates: % rows backfilled', _updated;
END $$;

-- fin_collection_activities  (NOT NULL client_id — every row must be mapped)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM fin_collection_activities t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL
    LIMIT 500
  )
  UPDATE fin_collection_activities t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'fin_collection_activities: % rows backfilled', _updated;
END $$;

-- fin_payment_run_items  (vendor_id -> clients.id)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, m.party_id
    FROM fin_payment_run_items t
    JOIN purchase_bills pb ON pb.id = t.bill_id
    JOIN party_migration_client_map m ON m.org_id = pb.org_id AND m.client_id = t.vendor_id
    WHERE t.party_id IS NULL AND t.vendor_id IS NOT NULL
    LIMIT 500
  )
  UPDATE fin_payment_run_items t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'fin_payment_run_items: % rows backfilled', _updated;
END $$;

-- acc_fixed_assets  (vendor_id -> clients.id)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM acc_fixed_assets t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.vendor_id
    WHERE t.party_id IS NULL AND t.vendor_id IS NOT NULL
    LIMIT 500
  )
  UPDATE acc_fixed_assets t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'acc_fixed_assets: % rows backfilled', _updated;
END $$;

-- inv_sales_orders
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM inv_sales_orders t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE inv_sales_orders t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'inv_sales_orders: % rows backfilled', _updated;
END $$;

-- inv_customer_returns
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.org_id, t.id, m.party_id
    FROM inv_customer_returns t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE inv_customer_returns t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id AND t.org_id = b.org_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'inv_customer_returns: % rows backfilled', _updated;
END $$;

-- journal_lines  (two columns: client_id -> party_id, vendor_id -> vendor_party_id)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, m.party_id
    FROM journal_lines t
    JOIN party_migration_client_map m ON m.client_id = t.client_id
      AND m.org_id = COALESCE(t.org_id, '')
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE journal_lines t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'journal_lines (client): % rows backfilled', _updated;
END $$;

DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, m.party_id AS vendor_party_id
    FROM journal_lines t
    JOIN party_migration_client_map m ON m.client_id = t.vendor_id
      AND m.org_id = COALESCE(t.org_id, '')
    WHERE t.vendor_party_id IS NULL AND t.vendor_id IS NOT NULL
    LIMIT 500
  )
  UPDATE journal_lines t SET vendor_party_id = b.vendor_party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'journal_lines (vendor): % rows backfilled', _updated;
END $$;

-- timesheet_budgets  (bare int — only backfill if client_id matches a real clients row)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, m.party_id
    FROM timesheet_budgets t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE timesheet_budgets t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'timesheet_budgets: % rows backfilled', _updated;
END $$;

-- timesheet_rates (bare int)
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, m.party_id
    FROM timesheet_rates t
    JOIN party_migration_client_map m ON m.org_id = t.org_id AND m.client_id = t.client_id
    WHERE t.party_id IS NULL AND t.client_id IS NOT NULL
    LIMIT 500
  )
  UPDATE timesheet_rates t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'timesheet_rates: % rows backfilled', _updated;
END $$;

-- Track B: crm_organizations.party_id + contacts.party_id
DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, m.party_id
    FROM crm_organizations t
    JOIN party_migration_org_map m ON m.org_id = t.org_id AND m.crm_org_id = t.id
    WHERE t.party_id IS NULL
    LIMIT 500
  )
  UPDATE crm_organizations t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'crm_organizations: % rows backfilled', _updated;
END $$;

DO $$
DECLARE _updated INT;
BEGIN
  WITH batch AS (
    SELECT t.id, o.party_id
    FROM contacts t
    JOIN crm_organizations o ON o.id = t.organization_id AND o.org_id = t.org_id
    WHERE t.party_id IS NULL AND t.organization_id IS NOT NULL AND o.party_id IS NOT NULL
    LIMIT 500
  )
  UPDATE contacts t SET party_id = b.party_id
  FROM batch b WHERE t.id = b.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RAISE NOTICE 'contacts (crm_org -> party): % rows backfilled', _updated;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §POST-BACKFILL VERIFICATION — run after all DO blocks above return 0 rows
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- 1. Overall fill rates per table (expect 100% for NOT NULL source cols):
SELECT
  'invoices'             AS tbl, COUNT(*) AS total, COUNT(party_id) AS filled, COUNT(*) - COUNT(party_id) AS unfilled FROM invoices WHERE client_id IS NOT NULL
UNION ALL
SELECT 'purchase_bills',          COUNT(*), COUNT(party_id), COUNT(*) - COUNT(party_id) FROM purchase_bills WHERE vendor_id IS NOT NULL
UNION ALL
SELECT 'fin_collection_activities', COUNT(*), COUNT(party_id), COUNT(*) - COUNT(party_id) FROM fin_collection_activities
UNION ALL
SELECT 'support_vip_clients',      COUNT(*), COUNT(party_id), COUNT(*) - COUNT(party_id) FROM support_vip_clients
UNION ALL
SELECT 'credit_notes',             COUNT(*), COUNT(party_id), COUNT(*) - COUNT(party_id) FROM credit_notes WHERE client_id IS NOT NULL
UNION ALL
SELECT 'deals',                    COUNT(*), COUNT(party_id), COUNT(*) - COUNT(party_id) FROM deals WHERE client_id IS NOT NULL;

-- 2. Map table coverage:
SELECT COUNT(*) AS total_clients FROM clients;
SELECT COUNT(*) AS mapped_clients FROM party_migration_client_map;
-- Should be equal. Gap = clients not yet processed.

-- 3. Party type distribution (manually review 'CUSTOMER' rows in purchase_bills):
SELECT party_type, COUNT(*) FROM business_parties GROUP BY party_type ORDER BY COUNT(*) DESC;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- §ROLLBACK — execute ONLY if Phase 2 must be completely reversed
-- WARNING: This deletes ALL business_parties rows created by this migration.
-- Do NOT run if other processes have created business_parties rows.
-- ─────────────────────────────────────────────────────────────────────────────

/*
BEGIN;

-- 1. Clear shadow columns on all consumer tables
UPDATE client_opportunities       SET party_id = NULL;
UPDATE client_onboarding_items    SET party_id = NULL;
UPDATE csat_surveys               SET party_id = NULL;
UPDATE deals                      SET party_id = NULL;
UPDATE invoices                   SET party_id = NULL;
UPDATE purchase_bills             SET party_id = NULL;
UPDATE support_tickets            SET party_id = NULL;
UPDATE support_vip_clients        SET party_id = NULL;
UPDATE credit_notes               SET party_id = NULL;
UPDATE vendor_credits             SET party_id = NULL;
UPDATE fin_recurring_invoice_templates  SET party_id = NULL;
UPDATE fin_recurring_bill_templates     SET party_id = NULL;
UPDATE fin_collection_activities  SET party_id = NULL;
UPDATE fin_payment_run_items      SET party_id = NULL;
UPDATE acc_fixed_assets           SET party_id = NULL;
UPDATE inv_vendors                SET party_id = NULL;
UPDATE inv_sales_orders           SET party_id = NULL;
UPDATE inv_customer_returns       SET party_id = NULL;
UPDATE journal_lines              SET party_id = NULL, vendor_party_id = NULL;
UPDATE timesheet_budgets          SET party_id = NULL;
UPDATE timesheet_rates            SET party_id = NULL;
UPDATE crm_organizations          SET party_id = NULL;
UPDATE contacts                   SET party_id = NULL;

-- 2. Delete business_parties rows created by this migration
DELETE FROM business_parties
WHERE party_id IN (SELECT party_id FROM party_migration_client_map)
   OR party_id IN (SELECT party_id FROM party_migration_vendor_map)
   OR party_id IN (SELECT party_id FROM party_migration_org_map);

-- 3. Truncate map tables
TRUNCATE party_migration_client_map;
TRUNCATE party_migration_vendor_map;
TRUNCATE party_migration_org_map;

COMMIT;
*/
