# StreamlineOS Product Bible

# Inventory Management Module

# 14_Batch_Lot_Serial_Expiry_And_Traceability.md

## Purpose

Traceability supports quality control, recalls, expiry management, compliance, and high-value item tracking.

## Tracking Types

None:

- Stock tracked by variant/location only.

Lot/batch:

- Multiple units share a lot number.

Serial:

- Each unit has a unique serial number.

## Lot Fields

- Lot number.
- Product/variant.
- Manufacture date.
- Expiry date.
- Supplier lot number.
- Status.
- Quality status.

## Serial Fields

- Serial number.
- Product/variant.
- Lot optional.
- Current location.
- Status.
- Warranty date post-MVP.

## Expiry Management

Rules:

- Expired stock is blocked from sale by default.
- Near-expiry stock appears in alerts.
- FEFO picking chooses earliest expiry first.
- Expiry policy can vary by category.

## Traceability Report

Must answer:

- Where did this lot come from?
- Which PO/GRN received it?
- Which customers received it?
- Which warehouse/location holds remaining stock?
- Which returns/scrap events happened?

## Recall Workflow

Post-MVP but schema-ready:

- Identify affected lots/serials.
- Find customers/orders.
- Notify responsible team.
- Block remaining stock.
- Track recall status.

## Acceptance Criteria

- Lot/serial required at receipt and issue when configured.
- Serial uniqueness is enforced.
- Expiry alerts work.
- Traceability report follows source-to-customer chain.
