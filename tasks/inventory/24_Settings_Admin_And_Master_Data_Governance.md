# StreamlineOS Product Bible

# Inventory Management Module

# 24_Settings_Admin_And_Master_Data_Governance.md

## Purpose

Inventory settings and master-data governance prevent operational chaos as the module scales.

## Settings Areas

General:

- Enable/disable Inventory.
- Default warehouse.
- Default receiving/shipping/quarantine/scrap locations.
- Default UOM.
- Date/number formats from organization settings.

Stock policy:

- Negative stock allowed.
- Backorders allowed.
- Reservation strategy.
- Expiry reservation rule.
- Quality hold rule.
- Scrap approval rule.

Procurement:

- PO approval required.
- Over-receipt tolerance.
- Default vendor lead time.
- Auto-create reorder draft POs.

Sales/Fulfillment:

- Auto reserve on confirmation.
- Partial shipment allowed.
- Package required before shipment.
- Default shipment location.

Valuation:

- Default costing method.
- Accounting integration enabled.
- Landed cost enabled.
- Revaluation permissions.

Barcode:

- Barcode uniqueness scope.
- Scanner mode.
- Label format post-MVP.

Quality:

- Inspection required on receipt.
- Inspection required on return.
- Default inspection templates.
- Recall workflow enabled.

Channels:

- Stock publishing buffers.
- Channel sync frequency.
- 3PL sync settings.

## Number Sequences

Configure sequence prefixes for:

- Product SKU auto-number.
- PO.
- GRN.
- SO.
- Transfer.
- Adjustment.
- Cycle count.
- Shipment.
- Package.
- Recall.

Rules:

- Document numbers are unique per organization.
- Sequence changes are audited.
- Existing posted documents retain numbers.

## Master Data Governance

Govern:

- Product archive/delete.
- SKU/barcode uniqueness.
- UOM changes with existing stock.
- Costing method changes.
- Warehouse/location archive with stock.
- Vendor deactivation with open POs.

Rules:

- Block destructive changes when dependent open/posted records exist.
- Use archive instead of delete for master data.
- Changes to critical fields are audited.

## Admin Tools

Admin screens must include:

- Data health checks.
- Stock ledger reconciliation.
- Orphaned reservation cleanup.
- Expired reservation cleanup.
- Failed import/export jobs.
- Failed channel/webhook syncs.
- Permission diagnostics.

## Acceptance Criteria

- Settings are permission-gated.
- Critical setting changes are audited.
- Master data cannot be deleted when it would break history.
- Number sequences are deterministic and unique.
- Admin diagnostics help detect stock drift before customers do.
