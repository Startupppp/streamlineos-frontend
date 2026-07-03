# StreamlineOS Product Bible

# Inventory Management Module

# 02_Information_Architecture_And_Routes.md

## Navigation

Primary Inventory navigation:

- Dashboard
- Products
- Stock
- Warehouses
- Vendors
- Purchase Orders
- Sales Orders
- Operations
- Reports
- Settings
- Quality
- Shipments
- Channels

Secondary operation navigation:

- Receipts
- Issues
- Transfers
- Adjustments
- Cycle Counts
- Physical Audits
- Returns
- Barcode

## Existing Frontend Routes To Preserve

Dashboard:

- `/inventory`

Products:

- `/inventory/products`
- `/inventory/products/new`
- `/inventory/products/[productId]`
- `/inventory/products/categories`
- `/inventory/products/uom`

Stock:

- `/inventory/stock`
- `/inventory/stock/adjustments`
- `/inventory/stock/movements`
- `/inventory/stock/transfers`
- `/inventory/stock/transfers/[transferId]`

Warehouses:

- `/inventory/warehouses`
- `/inventory/warehouses/[warehouseId]`

Vendors:

- `/inventory/vendors`
- `/inventory/vendors/[vendorId]`

Purchase Orders:

- `/inventory/purchase-orders`
- `/inventory/purchase-orders/new`
- `/inventory/purchase-orders/[poId]`

Sales Orders:

- `/inventory/sales-orders`
- `/inventory/sales-orders/new`
- `/inventory/sales-orders/[soId]`

Reports:

- `/inventory/reports/stock-summary`
- `/inventory/reports/movements`
- `/inventory/reports/reorder`

## New Routes To Add When Missing

Operations:

- `/inventory/operations`
- `/inventory/operations/receipts`
- `/inventory/operations/issues`
- `/inventory/operations/picking`
- `/inventory/operations/packing`
- `/inventory/operations/shipping`
- `/inventory/operations/returns`

Control:

- `/inventory/cycle-counts`
- `/inventory/cycle-counts/[countId]`
- `/inventory/physical-audits`
- `/inventory/physical-audits/[auditId]`

Traceability:

- `/inventory/lots`
- `/inventory/lots/[lotId]`
- `/inventory/serials`
- `/inventory/serials/[serialId]`
- `/inventory/expiry`

Planning:

- `/inventory/replenishment`
- `/inventory/replenishment/rules`
- `/inventory/forecasting`

Finance:

- `/inventory/valuation`
- `/inventory/costing`

Tools:

- `/inventory/barcode`
- `/inventory/import`
- `/inventory/settings`

Quality and compliance:

- `/inventory/quality`
- `/inventory/quality/inspections`
- `/inventory/quality/holds`
- `/inventory/quality/recalls`

Shipping and channels:

- `/inventory/packages`
- `/inventory/shipments`
- `/inventory/loads`
- `/inventory/carriers`
- `/inventory/channels`
- `/inventory/3pl`

## Route Rules

- Dynamic segments must be descriptive: `[productId]`, `[warehouseId]`, `[poId]`, `[soId]`, `[transferId]`, `[lotId]`, `[serialId]`.
- Do not use bare `[id]`.
- Route-level access is UX only. Backend permissions still enforce every endpoint.
- If Inventory module is disabled, show a disabled-module screen with a link to module settings if user can manage modules.

## Dashboard Sections

Inventory dashboard must show:

- Stock value.
- Low-stock SKUs.
- Out-of-stock SKUs.
- Incoming POs.
- Open sales shipments.
- Transfers in progress.
- Inventory accuracy/cycle count status.
- Slow-moving stock.
- Expiry alerts.
- Recent stock movements.
- AI insights if AI is enabled.

## Search And Command Menu

Inventory must integrate with global search/command:

- Search products, variants, SKUs, barcodes, vendors, warehouses, POs, SOs, lots, serials.
- Create product.
- Create PO.
- Create transfer.
- Create adjustment.
- Open barcode scanner.
- Ask inventory AI.
- Create inspection.
- Create shipment/load.

## Empty States

Every page must have full-height empty states:

- No products: Create first product or import.
- No warehouse: Create warehouse.
- No stock: Receive goods or adjust opening stock.
- No PO: Create purchase order.
- No SO: Create sales order.
- No reorder rules: Create reorder rule.
- No reports data: Explain which operation creates the data.

## Cross-Module Entry Points

Inventory should be reachable from:

- CRM product/deal context.
- Sales order context.
- Purchase/vendor context.
- Accounting valuation/invoices.
- Knowledge SOP links.
- Global search.
- E-commerce/channel orders.
- Carrier/3PL shipment status.
