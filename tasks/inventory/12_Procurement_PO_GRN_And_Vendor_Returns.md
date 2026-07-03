# StreamlineOS Product Bible

# Inventory Management Module

# 12_Procurement_PO_GRN_And_Vendor_Returns.md

## Purpose

Procurement brings stock into the business and must handle vendor lead times, partial receipts, shortages, overages, and returns.

## Vendor Management

Vendor fields:

- Name.
- Code.
- Email.
- Phone.
- Address.
- Tax ID.
- Currency.
- Payment terms.
- Lead time.
- Active status.

Vendor performance:

- On-time rate.
- Fill rate.
- Average lead time.
- Return rate.
- Price variance.

## Purchase Order Lifecycle

States:

- draft
- sent
- approved
- partially_received
- received
- closed
- cancelled

PO line fields:

- Product/variant.
- Quantity.
- UOM.
- Unit cost.
- Expected date.
- Tax/discount if accounting enabled.
- Received quantity.
- Remaining quantity.

## Goods Receipt Note

GRN is the receiving document.

Rules:

- GRN can receive full or partial PO.
- GRN can receive into receiving location or final bin.
- Lot/serial required when product tracking requires it.
- Expiry required when product/category requires it.
- Posted GRN creates stock ledger rows.
- Posted GRN creates valuation layer.
- Duplicate GRN submit is blocked by idempotency.

## Over/Under Receipt

Policy controls:

- Allow under receipt.
- Allow over receipt.
- Over receipt tolerance.
- Require approval for overage.

## Vendor Returns

Vendor return reasons:

- Damaged.
- Wrong item.
- Excess.
- Expired.
- Quality rejected.

Rules:

- Return references PO/GRN where possible.
- Return reduces stock.
- Return creates ledger transaction.
- Return can create vendor credit integration with accounting post-MVP.

## Reorder From Procurement

Reorder rules can generate:

- Draft purchase order.
- Suggested purchase order.
- Purchase request post-MVP.

## Acceptance Criteria

- Partial receipt works.
- Lot/serial receipt works.
- Vendor return is ledger-backed.
- PO status accurately reflects receipts.
- Idempotency prevents double receipt.
