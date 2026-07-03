# StreamlineOS Product Bible

# Inventory Management Module

# 09_RBAC_Module_Gating_And_Data_Scope.md

## Module Gate

Inventory is available only when:

- Organization subscription includes Inventory.
- User has Inventory module enabled.
- Route/API passes module guard.

If disabled:

- Frontend hides navigation.
- Direct route shows disabled-module screen.
- Backend returns 403 with module-disabled code.

## Core Permissions

Products:

- `inventory:products:read`
- `inventory:products:create`
- `inventory:products:update`
- `inventory:products:delete`

Stock:

- `inventory:stock:read`
- `inventory:stock:adjust`
- `inventory:stock:transfer`
- `inventory:stock:reserve`
- `inventory:stock:reconcile`

Warehouses:

- `inventory:warehouses:read`
- `inventory:warehouses:manage`

Vendors:

- `inventory:vendors:read`
- `inventory:vendors:manage`

Purchase:

- `inventory:purchase-orders:read`
- `inventory:purchase-orders:create`
- `inventory:purchase-orders:update`
- `inventory:purchase-orders:approve`
- `inventory:purchase-orders:receive`
- `inventory:vendor-returns:manage`

Sales:

- `inventory:sales-orders:read`
- `inventory:sales-orders:create`
- `inventory:sales-orders:update`
- `inventory:sales-orders:confirm`
- `inventory:sales-orders:ship`
- `inventory:sales-orders:invoice`
- `inventory:customer-returns:manage`

Reports:

- `inventory:reports:read`
- `inventory:valuation:read`

Admin:

- `inventory:settings:manage`
- `inventory:import`
- `inventory:export`
- `inventory:webhooks:manage`

Quality:

- `inventory:quality:read`
- `inventory:quality:inspect`
- `inventory:quality:release`
- `inventory:quality:scrap`
- `inventory:quality:recall`

Shipping and channels:

- `inventory:packages:manage`
- `inventory:shipments:manage`
- `inventory:loads:manage`
- `inventory:channels:manage`
- `inventory:3pl:manage`

## Data Scope

Scopable reads:

- products
- stock
- movements
- purchase orders
- sales orders
- transfers
- reports
- quality inspections
- shipments/loads
- channels and 3PL syncs

Scopes:

- all organization
- assigned branches
- assigned warehouses
- assigned teams
- own documents

## Warehouse-Level Access

Users can be limited to:

- View only selected warehouses.
- Operate only selected warehouses.
- Receive only in selected locations.
- Pick/ship only from selected locations.
- Run reports only for selected warehouses.

## Role Presets

Owner/Admin:

- Full access.

Inventory Manager:

- Manage catalog, warehouses, stock operations, purchase/sales inventory flows, reports.

Warehouse Staff:

- Receive, transfer, pick, pack, ship, count assigned warehouses.

Procurement:

- Vendors, POs, receipts visibility.

Sales Ops:

- Sales orders, ATP, reservation, shipping visibility.

Finance:

- Valuation, reports, accounting integration, read-only stock.

## Security Rules

- Client-side permissions are UX only.
- Backend enforces permissions on every endpoint.
- Reports must apply the same data scope as source data.
- AI answers and exports must apply data scope.
- Quality, packages, shipments, channel syncs, and 3PL syncs must apply data scope.
- Webhooks must never send data outside the actor/organization scope.

## Acceptance Criteria

- Disabled module cannot access any Inventory API.
- Warehouse-scoped user cannot see another warehouse's stock.
- Export respects data scope.
- AI respects data scope.
- Reports do not bypass permissions.
