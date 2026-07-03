# StreamlineOS Product Bible

# Inventory Management Module

# 11_Warehouse_Locations_And_Stock_Operations.md

## Purpose

Warehouses, locations, and operations control where stock lives and how it moves.

## Warehouse Model

Warehouse represents a physical or logical stock facility.

Fields:

- Name.
- Code.
- Branch.
- Address.
- Manager.
- Status.

## Location Hierarchy

Supported hierarchy:

- Warehouse
- Zone
- Aisle
- Rack
- Shelf
- Bin

Special locations:

- Receiving.
- Shipping.
- Quarantine.
- Scrap.
- Returns.
- Transit.

## Location Rules

- Receiving location can receive stock.
- Shipping location can ship stock.
- Quarantine stock is blocked.
- Scrap stock is removed from sellable stock.
- Transit stock is not available for sale.

## Stock Operations

Opening stock:

- Initial balance posted with audit reason.

Adjustment:

- Correct stock due to damage, error, shrinkage, or discovery.

Transfer:

- Move stock between locations or warehouses.

Cycle count:

- Count a subset of stock periodically.

Physical audit:

- Full warehouse count.

Scrap:

- Remove unusable stock.

Quarantine:

- Block stock from reservation.

## Adjustment Rules

- Reason required.
- Approval required above threshold.
- Cannot adjust serial item without serial selection.
- Cannot adjust lot item without lot selection when tracking required.
- Posted adjustments create ledger transactions.

## Transfer Rules

Transfer types:

- Internal location transfer.
- Warehouse-to-warehouse transfer.
- Branch transfer.

States:

- draft
- reserved
- in_transit
- completed
- cancelled

Rules:

- Outbound leg reduces source sellable stock.
- Inbound leg increases destination stock.
- Transit location tracks in-flight stock.
- Partial transfer is supported.

## Cycle Count Rules

- Count assignments can be scoped by warehouse/location/category.
- System quantity is captured at count start.
- Variance requires review.
- Posting creates gain/loss ledger rows.

## Acceptance Criteria

- Location tree supports nested bins.
- Transfers are ledger-backed.
- Adjustments require reason and audit.
- Cycle counts post variances safely.
