# StreamlineOS Product Bible

# Inventory Management Module

# 21_AI_Agent_Implementation_Guide.md

## Purpose

Use this file when handing Inventory implementation to an AI coding agent. It tells the agent how to start with no missing context.

## First Instruction

You are implementing the StreamlineOS Inventory module. Read this entire `inventory/` folder before editing. Then audit the repository and reuse existing Inventory code instead of rebuilding disconnected systems.

## Mandatory Reading

1. `inventory/00_README.md`
2. `inventory/01_Vision_Goals_Research.md`
3. `inventory/02_Information_Architecture_And_Routes.md`
4. `inventory/03_UI_UX_Every_Screen.md`
5. `inventory/04_Domain_Model_And_Stock_Ledger.md`
6. `inventory/05_Database_Design.md`
7. `inventory/06_Drizzle_Schema_And_Migrations.md`
8. `inventory/07_Backend_Architecture_And_Stock_Engine.md`
9. `inventory/08_API_Contracts.md`
10. `inventory/09_RBAC_Module_Gating_And_Data_Scope.md`
11. `inventory/10_Product_Catalog_UOM_And_Variants.md`
12. `inventory/11_Warehouse_Locations_And_Stock_Operations.md`
13. `inventory/12_Procurement_PO_GRN_And_Vendor_Returns.md`
14. `inventory/13_Sales_ATP_Reservation_Pick_Pack_Ship.md`
15. `inventory/14_Batch_Lot_Serial_Expiry_And_Traceability.md`
16. `inventory/15_Valuation_Costing_And_Accounting.md`
17. `inventory/16_Replenishment_Forecasting_And_AI.md`
18. `inventory/17_Barcode_Mobile_Offline_And_WMS.md`
19. `inventory/18_Integrations_Import_Export_And_Webhooks.md`
20. `inventory/19_Analytics_Audit_Performance_And_Security.md`
21. `inventory/20_Testing_QA_And_Production_Readiness.md`
22. `inventory/22_Quality_Inspection_Status_And_Compliance.md`
23. `inventory/23_Channel_3PL_Packages_Loads_And_Shipping.md`
24. `inventory/24_Settings_Admin_And_Master_Data_Governance.md`

## Mandatory Repo Audit

Inspect:

- `streamlineos-frontend/PRD-inventory.md`
- `streamlineos-frontend/tasks/Inventory & Warehouse Management`
- `streamlineos-frontend/frontend/app/(authenticated)/inventory`
- `streamlineos-frontend/frontend/features/inventory`
- `streamlineos-frontend/frontend/hooks/api/inventory`
- `streamlineos-frontend/frontend/types/inventory.ts`
- `streamlineos-frontend/frontend/lib/rbac/permissions/inventory.ts`
- `streamlineos-backend` inventory modules, schema, migrations, controllers, services, guards, permissions.

## Non-Negotiable Rules

- Do not create frontend `app/api` business endpoints for Inventory if backend owns APIs.
- Do not bypass stock engine for stock mutations.
- Do not update stock without ledger transaction.
- Do not skip idempotency for receive/ship/transfer/adjustment.
- Do not rely on client-side permissions.
- Do not allow reports, exports, or AI to bypass data scope.
- Do not change costing method with non-zero stock without revaluation plan.
- Do not permanently delete posted stock transactions.

## Implementation Order

1. Audit current code and produce plan.
2. Fix module gating and RBAC gaps.
3. Implement/verify schema and migrations.
4. Implement stock ledger engine.
5. Implement products/UOM/variants.
6. Implement warehouses/locations.
7. Implement stock levels/movements.
8. Implement adjustments/transfers.
9. Implement POs/GRNs/vendor returns.
10. Implement SOs/reservation/pick-pack-ship/customer returns.
11. Implement lots/serials/expiry.
12. Implement valuation hooks.
13. Implement reports.
14. Implement import/export.
15. Implement barcode/mobile flows.
16. Implement AI/replenishment.
17. Implement quality/status/recall flows.
18. Implement packages/shipments/loads/channels/3PL readiness.
19. Implement settings/admin diagnostics.
20. Run tests/build and fix.

## Required Agent Output Before Editing

The agent must report:

- Existing files found.
- Existing backend modules found.
- Existing schema/tables found.
- Existing route/hook patterns.
- Gaps against this PRD.
- Exact implementation order.
- Files expected to change.
- Risk areas.

## Final Done Checklist

- Inventory module works end to end.
- Every stock mutation creates ledger rows.
- Idempotency works.
- RBAC and data scope work.
- Existing routes remain stable.
- Reports are paginated and scoped.
- Import/export are permission-safe.
- Quality/status/recall flows are ledger-backed and audited.
- Packages/shipments/channels cannot publish or ship more than available stock.
- Settings and master-data governance prevent destructive historical changes.
- Tests pass.
- Lint/typecheck/build pass.
