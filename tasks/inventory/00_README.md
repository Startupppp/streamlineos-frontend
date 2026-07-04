# StreamlineOS Product Bible

# Inventory Management Module

# 00_README.md

## Overview

Inventory is the stock-control and warehouse-operations backbone of StreamlineOS. It must support small and mid-market businesses today while leaving room for enterprise warehouse, valuation, compliance, and automation requirements later.

This folder is the canonical end-to-end PRD pack for Inventory. It should be read in order before any implementation work.

## Reading Order

1. `01_Vision_Goals_Research.md`
2. `02_Information_Architecture_And_Routes.md`
3. `03_UI_UX_Every_Screen.md`
4. `04_Domain_Model_And_Stock_Ledger.md`
5. `05_Database_Design.md`
6. `06_Drizzle_Schema_And_Migrations.md`
7. `07_Backend_Architecture_And_Stock_Engine.md`
8. `08_API_Contracts.md`
9. `09_RBAC_Module_Gating_And_Data_Scope.md`
10. `10_Product_Catalog_UOM_And_Variants.md`
11. `11_Warehouse_Locations_And_Stock_Operations.md`
12. `12_Procurement_PO_GRN_And_Vendor_Returns.md`
13. `13_Sales_ATP_Reservation_Pick_Pack_Ship.md`
14. `14_Batch_Lot_Serial_Expiry_And_Traceability.md`
15. `15_Valuation_Costing_And_Accounting.md`
16. `16_Replenishment_Forecasting_And_AI.md`
17. `17_Barcode_Mobile_Offline_And_WMS.md`
18. `18_Integrations_Import_Export_And_Webhooks.md`
19. `19_Analytics_Audit_Performance_And_Security.md`
20. `20_Testing_QA_And_Production_Readiness.md`
21. `21_AI_Agent_Implementation_Guide.md`
22. `22_Quality_Inspection_Status_And_Compliance.md`
23. `23_Channel_3PL_Packages_Loads_And_Shipping.md`
24. `24_Settings_Admin_And_Master_Data_Governance.md`

## Existing Repo Context

The current repo already has Inventory implementation surfaces:

- `streamlineos-frontend/PRD-inventory.md`
- `streamlineos-frontend/tasks/Inventory & Warehouse Management/*`
- `streamlineos-frontend/frontend/app/(authenticated)/inventory/**`
- `streamlineos-frontend/frontend/features/inventory/**`
- `streamlineos-frontend/frontend/hooks/api/inventory/**`
- `streamlineos-frontend/frontend/types/inventory.ts`
- `streamlineos-frontend/frontend/lib/rbac/permissions/inventory.ts`

The existing PRD says Inventory APIs live in the NestJS backend, not frontend `app/api`. Preserve that boundary unless the actual repo audit proves the architecture changed.

## Product Principle

Inventory must be stock-correct before it is feature-rich.

Every receipt, issue, adjustment, transfer, reservation, shipment, return, and valuation change must be auditable, transactional, idempotent, and tenant-scoped.

## MVP Scope

Must ship:

- Inventory dashboard.
- Products, variants, categories, UOM.
- Warehouses, zones, bins/locations.
- Stock on hand, available, reserved, incoming, outgoing.
- Stock ledger/transactions.
- Adjustments.
- Transfers.
- Purchase orders.
- Goods receipt notes.
- Vendor returns.
- Sales orders.
- ATP/reservation.
- Pick, pack, ship.
- Goods issue notes.
- Customer returns.
- Reorder rules.
- Stock summary, movement, reorder reports.
- RBAC and warehouse-level data scope.
- Audit logs.
- Import/export.
- Basic barcode support.
- Production-ready tests.

## Advanced Scope

Should be designed now, implemented by phase:

- Cycle counting.
- Physical stock audit.
- Batch/lot tracking.
- Serial tracking.
- Expiry/FEFO.
- Inventory valuation.
- FIFO/weighted average/standard costing.
- Accounting postings.
- Forecasting.
- AI inventory assistant.
- Mobile/offline WMS.
- Webhooks and public API.
- Quality inspection, quarantine, inventory status, recall/warranty readiness.
- Packages, containers, shipment loads, carrier/3PL integration readiness.
- Settings and master-data governance.

## Competitor Baseline

Use these as reference points:

- Odoo Inventory: warehouses, locations, routes, replenishment, valuation, barcode, multi-step operations.
- Zoho Inventory: serial/batch tracking, barcodes, UOM conversion, low-stock alerts, roles, reports.
- Cin7: multi-channel stock, batches, serials, expiry, FIFO/FEFO, fulfillment.
- inFlow: barcode workflows, lots, expiry, purchasing, shipping, returns.
- NetSuite Inventory: warehouses, bin management, lot/serial traceability, inventory counts, FEFO, fulfillment strategies.
- Microsoft Dynamics 365 Supply Chain: warehouse mobile app, inbound/outbound operations, quality assurance, transportation, landed cost, demand planning.
- Fishbowl: multi-location tracking, barcode scanning, manufacturing-lite, QuickBooks/Xero integrations.
- SAP Business One: bin locations, serial/batch management, purchasing/sales inventory flows.

## Definition Of Done

Inventory is complete when:

- All stock-changing operations create immutable stock transactions.
- Stock quantities cannot drift silently.
- Concurrency cannot oversell or double-receive.
- RBAC and module gating are enforced server-side.
- Lists are paginated, scoped, and indexed.
- UI has loading, empty, error, permission, disabled-module, and mobile states.
- Accounting integration points are defined even if full accounting posting ships later.
- Lint, typecheck, tests, and build pass.
