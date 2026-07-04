# StreamlineOS Product Bible

# Inventory Management Module

# 06_Drizzle_Schema_And_Migrations.md

## Purpose

Define how to implement Inventory schema and migrations safely.

## Pre-Implementation Audit

Before editing:

- Locate backend schema ownership.
- Confirm whether Inventory schema lives in `streamlineos-backend` or frontend `lib/db`.
- Inspect existing migration naming convention.
- Inspect existing Inventory tables.
- Inspect current `types/inventory.ts` and backend DTOs.
- Identify existing integer vs UUID convention.

## Migration Principles

- Forward-only migrations.
- No destructive drops without explicit migration plan.
- Add nullable columns first, backfill, then enforce constraints.
- Batch large backfills.
- Preserve existing data.
- Every migration must be idempotent where possible.

## Migration Order

1. Master data enums.
2. Products/categories/UOM.
3. Variants.
4. Warehouses.
5. Locations.
6. Vendors/customers if Inventory owns lightweight customer records.
7. Stock balances.
8. Stock transactions.
9. Reservations.
10. Adjustments.
11. Transfers.
12. Purchase orders and GRNs.
13. Vendor returns.
14. Sales orders and fulfillment.
15. Customer returns.
16. Lots, serials, expiry.
17. Cycle counts and audits.
18. Valuation layers.
19. Import/export jobs.
20. Quality inspections, inventory statuses, holds, recalls.
21. Packages, shipments, loads, carriers, channels, 3PL.
22. Settings, number sequences, idempotency key table.
23. Webhooks/audit/AI insights.
24. Indexes and constraints.
25. Seed defaults.

## Seed Defaults

For each organization enabling Inventory:

- Default warehouse if none exists.
- Default receiving, stock, shipping, quarantine, and scrap locations.
- Default UOMs.
- Default product categories.
- Default inventory settings.
- Default inventory statuses: available, quality_hold, damaged, expired, quarantine, scrap.
- Default document number sequences.
- Default quality inspection templates.

## Required Indexes

Must support:

- Product search by SKU/name/barcode.
- Stock lookup by variant/warehouse/location.
- Movement history by date/product/warehouse.
- PO/SO list by status/vendor/customer.
- Reorder report.
- Lot/serial traceability.
- Audit search.
- Quality inspection queues.
- Shipment/load lookup.
- Channel stock publication lookup.

## Constraints

- Unique document numbers per organization and document type.
- Unique SKU per organization.
- Unique barcode per organization where present.
- Unique idempotency key per organization.
- Non-negative balance constraints if negative stock disabled by policy cannot be DB-only; enforce in service transaction.

## Migration Acceptance Criteria

- Migrations run on clean database.
- Migrations run on existing database.
- Existing Inventory data is preserved.
- Indexes exist for all critical queries.
- Schema supports future lot/serial/valuation without destructive redesign.
