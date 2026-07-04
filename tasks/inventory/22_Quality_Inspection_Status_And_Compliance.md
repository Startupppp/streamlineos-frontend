# StreamlineOS Product Bible

# Inventory Management Module

# 22_Quality_Inspection_Status_And_Compliance.md

## Purpose

Quality and compliance protect customers from bad stock and protect the business from recalls, warranty disputes, expiry mistakes, and audit gaps.

## Inventory Status

Each stock balance can include status quantities:

- available
- quality_hold
- quarantine
- damaged
- expired
- returned_pending_inspection
- scrap

Rules:

- Only available stock can be reserved by default.
- Quality-held stock can move only through approved inspection/disposition flows.
- Expired stock is blocked from sales unless policy allows.
- Scrap removes stock from sellable inventory through a ledger-backed transaction.

## Quality Inspection Triggers

Create inspection automatically or manually for:

- Purchase receipt.
- Customer return.
- Vendor return before shipment.
- Transfer receipt.
- Cycle count variance.
- Lot/serial recall.
- Damaged stock report.

## Inspection Workflow

States:

- pending
- in_progress
- passed
- failed
- disposition_required
- completed
- cancelled

Disposition options:

- release_to_available
- quarantine
- return_to_vendor
- scrap
- rework post-MVP

## Inspection Fields

- Source document.
- Product/variant.
- Lot/serial.
- Quantity.
- Inspector.
- Checklist/template.
- Result.
- Notes.
- Attachments/photos.
- Disposition.
- Completed timestamp.

## Recall Workflow

Recall must support:

- Identify affected lot/serial/product.
- Trace suppliers/POs/GRNs.
- Trace customers/SOs/shipments.
- Block remaining stock.
- Generate affected customer/order list.
- Track actions and closure.

## Warranty Readiness

Post-MVP:

- Serial warranty start/end dates.
- Warranty claim link to customer and shipment.
- Replacement flow.

## Compliance And Audit

Audit:

- Quality hold created/released.
- Inspection result.
- Disposition.
- Recall opened/closed.
- Expired stock override.

## Acceptance Criteria

- Quality hold blocks reservation.
- Inspection can release/quarantine/scrap stock through ledger.
- Recall report traces source-to-customer chain.
- Quality actions are audited.
