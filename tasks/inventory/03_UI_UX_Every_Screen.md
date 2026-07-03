# StreamlineOS Product Bible

# Inventory Management Module

# 03_UI_UX_Every_Screen.md

## Design Principles

- Dense, operational, and scannable.
- Mobile-friendly for warehouse staff.
- No unnecessary dialogs.
- Use Sheets for large forms and operational workflows.
- Use Dialogs only for confirmations or tiny forms.
- Tables must have filters, pagination, column fit, and empty/error/loading states.
- All stock-changing actions must show confirmation, permissions, and impact.

## Global Page Requirements

Every Inventory page must include:

- Module disabled state.
- Permission denied state.
- Loading skeleton matching real layout.
- Empty state with primary action.
- Error state with retry.
- Pagination for lists.
- Search/filter where useful.
- Responsive 375px, 768px, 1280px layouts.
- No horizontal overflow unless table container intentionally scrolls.

## Dashboard

Route:

- `/inventory`

Required UI:

- KPI strip: stock value, available SKUs, low-stock, out-of-stock, open POs, open shipments.
- Alerts: low stock, expiry, delayed vendors, negative stock violations.
- Recent movements table.
- Reorder suggestions.
- Warehouse stock snapshot.
- AI insight panel if enabled.

## Products List

Route:

- `/inventory/products`

Required UI:

- Product/variant table.
- Search by name, SKU, barcode.
- Filters: category, status, stock tracking, vendor, low stock.
- Actions: create, import, export.
- Row actions: view, edit, duplicate, archive.

## Product Detail

Route:

- `/inventory/products/[productId]`

Required tabs:

- Overview.
- Variants.
- Stock by warehouse/location.
- Movements.
- Reorder rules.
- Vendors.
- Lots/serials if enabled.
- Accounting/costing.
- Attachments/Knowledge.

## Product Create/Edit

Required fields:

- Name.
- SKU.
- Category.
- Product type.
- Tracking method: none, lot, serial.
- UOM.
- Purchase UOM.
- Sales UOM.
- Barcode.
- Default vendor.
- Costing method.
- Standard cost.
- Sale price if sales module connected.
- Tax/category fields if accounting connected.
- Active status.

Large product forms should be full page or Sheet, not a small Dialog.

## Categories And UOM

Routes:

- `/inventory/products/categories`
- `/inventory/products/uom`

Required UI:

- Compact tables.
- Create/edit Sheet.
- Delete/archive confirmation.
- Validation for duplicate names/codes.
- UOM conversion preview.

## Stock Levels

Route:

- `/inventory/stock`

Required UI:

- Table by product variant + warehouse/location.
- Columns: on hand, reserved, available, incoming, outgoing, reorder point, last movement.
- Filters: warehouse, location, product, low stock, negative stock.
- Actions: adjust, transfer, view movements.

## Stock Movements

Route:

- `/inventory/stock/movements`

Required UI:

- Immutable ledger table.
- Filters: date, product, warehouse, location, type, source document.
- Drilldown into source transaction.
- Export.

## Adjustments

Route:

- `/inventory/stock/adjustments`

Required UI:

- Adjustment list.
- Create adjustment Sheet.
- Multi-line product entries.
- Reason required.
- Approval if configured.
- Preview stock impact before posting.

## Transfers

Routes:

- `/inventory/stock/transfers`
- `/inventory/stock/transfers/[transferId]`

Required UI:

- Transfer list with status.
- Create transfer Sheet.
- Source/destination warehouse/location.
- Multi-line items.
- Reserve/pick/ship/receive status depending transfer mode.
- Complete transfer action.

## Warehouses And Locations

Routes:

- `/inventory/warehouses`
- `/inventory/warehouses/[warehouseId]`

Required UI:

- Warehouse table/cards.
- Location tree: warehouse, zone, aisle, rack, shelf, bin.
- Capacity and active status.
- Location stock view.
- Putaway/picking rules post-MVP.

## Vendors

Routes:

- `/inventory/vendors`
- `/inventory/vendors/[vendorId]`

Required UI:

- Vendor list.
- Vendor detail with POs, receipts, returns, lead time, performance.
- Create/edit Sheet.

## Purchase Orders

Routes:

- `/inventory/purchase-orders`
- `/inventory/purchase-orders/new`
- `/inventory/purchase-orders/[poId]`

Required UI:

- PO list with status.
- PO detail with lines, receipts, vendor, timeline, audit.
- Create PO full page for many lines.
- Actions: draft, send/approve, receive, close, cancel.
- Partial receipt handling.

## Sales Orders And Fulfillment

Routes:

- `/inventory/sales-orders`
- `/inventory/sales-orders/new`
- `/inventory/sales-orders/[soId]`

Required UI:

- SO list with status.
- SO detail with ATP, reservation, pick/pack/ship, invoices if connected.
- Create SO full page.
- Actions: confirm, reserve, pick, pack, ship, invoice, cancel.
- Partial shipment handling.

## Reports

Routes:

- `/inventory/reports/stock-summary`
- `/inventory/reports/movements`
- `/inventory/reports/reorder`

Required UI:

- Date/warehouse/product filters.
- Export CSV/XLSX.
- Drilldown links.
- Clear query performance loading states.

## Quality

Routes:

- `/inventory/quality`
- `/inventory/quality/inspections`
- `/inventory/quality/holds`
- `/inventory/quality/recalls`

Required UI:

- Inspection queue.
- Quality hold list.
- Quarantine stock view.
- Recall traceability workflow.
- Pass/fail/disposition actions.

## Packages, Shipments, Loads

Routes:

- `/inventory/packages`
- `/inventory/shipments`
- `/inventory/loads`
- `/inventory/carriers`

Required UI:

- Package list with contents.
- Shipment list with status, carrier, tracking number.
- Load/container list for grouped outbound/inbound movement.
- Carrier setup prompt if integration missing.

## Channels And 3PL

Routes:

- `/inventory/channels`
- `/inventory/3pl`

Required UI:

- Connected channels.
- External warehouse/3PL mappings.
- Sync status.
- Failed sync queue.
- Stock availability publish settings.

## Import

Route:

- `/inventory/import`

Required UI:

- Import type selector: products, vendors, opening stock, locations, reorder rules.
- File upload.
- Field mapping.
- Validation preview.
- Duplicate detection.
- Import job status.

## Barcode

Route:

- `/inventory/barcode`

Required UI:

- Scan input.
- Camera scanner if supported.
- Manual fallback.
- Quick actions: receive, transfer, pick, count, lookup.

## Settings

Route:

- `/inventory/settings`

Required UI:

- Negative stock rules.
- Reservation rules.
- Costing method defaults.
- Approval thresholds.
- Barcode settings.
- Cycle count settings.
- Stock valuation integration.
- Warehouse scope rules.
- Quality inspection settings.
- Inventory status definitions.
- Channel stock publishing settings.
- Carrier and 3PL settings.
