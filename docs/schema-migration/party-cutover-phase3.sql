-- =============================================================================
-- PARTY CUTOVER — PHASE 3: Dual-write + shadow-read parity verification queries
-- =============================================================================
-- What:  Read-only verification queries. No DDL.
--        Run these queries daily during the >= 7-day parity window.
--        Gate for Phase 4: ALL checks must pass for 7 consecutive days.
-- Risk:  ZERO — SELECT only.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.1 Shadow fill rate — expect 100% on tables with a NOT NULL source column
--      After dual-write ships, NEW rows must arrive with party_id populated.
--      These queries check BOTH historical fill (from Phase 2) and new rows.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  'invoices'    AS tbl,
  COUNT(*)      AS total_with_client_id,
  COUNT(party_id) AS party_id_filled,
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2) AS fill_pct
FROM invoices WHERE client_id IS NOT NULL
UNION ALL
SELECT 'purchase_bills',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM purchase_bills WHERE vendor_id IS NOT NULL
UNION ALL
SELECT 'fin_collection_activities',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM fin_collection_activities
UNION ALL
SELECT 'support_vip_clients',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM support_vip_clients
UNION ALL
SELECT 'client_opportunities',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM client_opportunities
UNION ALL
SELECT 'deals',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM deals WHERE client_id IS NOT NULL
UNION ALL
SELECT 'support_tickets',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM support_tickets WHERE client_id IS NOT NULL
UNION ALL
SELECT 'credit_notes',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM credit_notes WHERE client_id IS NOT NULL
UNION ALL
SELECT 'vendor_credits',
  COUNT(*), COUNT(party_id),
  ROUND(100.0 * COUNT(party_id) / NULLIF(COUNT(*),0), 2)
FROM vendor_credits WHERE vendor_id IS NOT NULL
ORDER BY tbl;

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.2 Name parity check — compare clients.name vs business_parties.name
--      For each consumer row that has BOTH client_id and party_id populated,
--      the name resolved from both paths must match.
--      Mismatches indicate: (a) the map is wrong, (b) a name update raced Phase 2.
-- ─────────────────────────────────────────────────────────────────────────────

-- Check invoices:
SELECT
  i.org_id,
  i.id AS invoice_id,
  c.name  AS legacy_name,
  bp.name AS party_name,
  CASE WHEN c.name = bp.name THEN 'MATCH' ELSE 'MISMATCH' END AS parity
FROM invoices i
JOIN clients          c  ON c.id = i.client_id AND c.org_id = i.org_id
JOIN business_parties bp ON bp.party_id = i.party_id
WHERE i.party_id IS NOT NULL
  AND i.client_id IS NOT NULL
  AND c.name <> bp.name         -- only mismatches
LIMIT 50;

-- Check purchase_bills:
SELECT
  pb.org_id,
  pb.id AS bill_id,
  c.name  AS legacy_name,
  bp.name AS party_name
FROM purchase_bills pb
JOIN clients          c  ON c.id = pb.vendor_id AND c.org_id = pb.org_id
JOIN business_parties bp ON bp.party_id = pb.party_id
WHERE pb.party_id IS NOT NULL
  AND pb.vendor_id IS NOT NULL
  AND c.name <> bp.name
LIMIT 50;

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.3 Map table integrity — every map entry points to a live business_parties row
-- ─────────────────────────────────────────────────────────────────────────────

SELECT COUNT(*) AS dangling_client_map_entries
FROM party_migration_client_map m
LEFT JOIN business_parties bp ON bp.party_id = m.party_id
WHERE bp.party_id IS NULL;
-- Expect: 0

SELECT COUNT(*) AS dangling_vendor_map_entries
FROM party_migration_vendor_map m
LEFT JOIN business_parties bp ON bp.party_id = m.party_id
WHERE bp.party_id IS NULL;
-- Expect: 0

SELECT COUNT(*) AS dangling_org_map_entries
FROM party_migration_org_map m
LEFT JOIN business_parties bp ON bp.party_id = m.party_id
WHERE bp.party_id IS NULL;
-- Expect: 0

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.4 New-row dual-write check — rows created AFTER Phase 3 shipped
--      must have party_id populated (written by app code).
--      Run after each deploy of the dual-write service changes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Replace '2026-08-01' with the actual Phase 3 deploy date.
SELECT
  'invoices_new' AS tbl,
  COUNT(*) AS new_rows_with_client_id,
  COUNT(party_id) AS new_rows_with_party_id,
  COUNT(*) - COUNT(party_id) AS missing_party_id
FROM invoices
WHERE created_at >= '2026-08-01'
  AND client_id IS NOT NULL
UNION ALL
SELECT
  'purchase_bills_new',
  COUNT(*), COUNT(party_id), COUNT(*) - COUNT(party_id)
FROM purchase_bills
WHERE created_at >= '2026-08-01'
  AND vendor_id IS NOT NULL;
-- Expect missing_party_id = 0 after dual-write has been live for a full day.

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.5 Cross-tenant isolation sanity check
--      No consumer row's (org_id, party_id) should map to a business_party in
--      a different org. This should be structurally impossible, but verify anyway.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT COUNT(*) AS cross_tenant_violations
FROM invoices i
JOIN business_parties bp ON bp.party_id = i.party_id
WHERE i.party_id IS NOT NULL
  AND bp.organization_id <> i.org_id;
-- Expect: 0 — any non-zero count is a critical data bug, stop the migration.

SELECT COUNT(*) AS cross_tenant_violations
FROM purchase_bills pb
JOIN business_parties bp ON bp.party_id = pb.party_id
WHERE pb.party_id IS NOT NULL
  AND bp.organization_id <> pb.org_id;
-- Expect: 0

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.6 Map coverage completeness — clients without a map entry (daily check)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT COUNT(*) AS unmapped_clients
FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM party_migration_client_map m
  WHERE m.org_id = c.org_id AND m.client_id = c.id
);
-- Expect: 0 after Phase 2 complete. Non-zero = some clients were added after
-- Phase 2 and the dual-write hasn't yet created their business_parties row.

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.7 Parity gate summary — run this daily, record results in a tracking sheet
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  NOW()::DATE AS check_date,
  (SELECT COUNT(*) FROM invoices WHERE client_id IS NOT NULL AND party_id IS NULL)   AS invoice_nulls,
  (SELECT COUNT(*) FROM purchase_bills WHERE vendor_id IS NOT NULL AND party_id IS NULL) AS bill_nulls,
  (SELECT COUNT(*) FROM fin_collection_activities WHERE party_id IS NULL)            AS collection_nulls,
  (SELECT COUNT(*) FROM clients c
   WHERE NOT EXISTS (SELECT 1 FROM party_migration_client_map m WHERE m.org_id=c.org_id AND m.client_id=c.id)
  )                                                                                   AS unmapped_clients,
  (SELECT COUNT(*) FROM invoices i
   JOIN clients c ON c.id=i.client_id AND c.org_id=i.org_id
   JOIN business_parties bp ON bp.party_id=i.party_id
   WHERE i.party_id IS NOT NULL AND c.name <> bp.name)                               AS name_mismatches,
  (SELECT COUNT(*) FROM invoices i JOIN business_parties bp ON bp.party_id=i.party_id
   WHERE i.party_id IS NOT NULL AND bp.organization_id <> i.org_id)                  AS cross_tenant_violations;
-- GATE: invoice_nulls=0, bill_nulls=0, collection_nulls=0,
--       unmapped_clients=0, name_mismatches=0, cross_tenant_violations=0
-- for 7 consecutive calendar days before proceeding to Phase 4.
