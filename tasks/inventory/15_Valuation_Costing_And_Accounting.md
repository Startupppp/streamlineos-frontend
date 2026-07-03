# StreamlineOS Product Bible

# Inventory Management Module

# 15_Valuation_Costing_And_Accounting.md

## Purpose

Inventory valuation connects warehouse operations to finance. The MVP can ship operational stock first, but schema and service design must support valuation cleanly.

## Costing Methods

Supported design:

- Standard cost.
- Weighted average.
- FIFO.
- FEFO for expiry-driven issue sequence.

Rules:

- Costing method is set per product/category.
- Costing method cannot change while non-zero stock exists unless revaluation process exists.
- Serial/lot costing must preserve traceability.

## Valuation Events

Create valuation layers for:

- Purchase receipt.
- Vendor return.
- Sales shipment/COGS.
- Customer return.
- Adjustment.
- Scrap.
- Revaluation.

## Accounting Integration Points

Post accounting entries for:

- Stock received.
- Vendor bill matching post-MVP.
- COGS on shipment.
- Inventory adjustment gain/loss.
- Scrap loss.
- Customer return.

If accounting module is disabled:

- Inventory still records valuation layers.
- UI shows accounting connection prompt for posting.

## Landed Cost

Post-MVP:

- Freight.
- Duties.
- Insurance.
- Handling.
- Allocation by quantity, weight, value, or manual split.

## Valuation Reports

Required:

- Stock valuation by product/warehouse.
- Valuation movement report.
- COGS report.
- Adjustment value report.

## Acceptance Criteria

- Operational stock can ship before full accounting posting.
- Valuation layer schema exists.
- Costing method rules prevent impossible revaluation.
- COGS integration point is defined.
