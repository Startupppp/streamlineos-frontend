# StreamlineOS Product Bible

# Inventory Management Module

# 10_Product_Catalog_UOM_And_Variants.md

## Purpose

The product catalog is the master data foundation for Inventory. Bad catalog design creates downstream stock, procurement, sales, and accounting problems.

## Product Types

Supported:

- Stockable product.
- Consumable.
- Service/non-stock item.
- Bundle/kit post-MVP.
- Asset/spare part post-MVP.

## Tracking Methods

Supported:

- No tracking.
- Lot/batch tracking.
- Serial tracking.

Rules:

- Tracking method cannot change while non-zero stock exists unless migration flow handles conversion.
- Serial-tracked items require serial selection at receipt and issue.
- Lot-tracked items can have expiry/manufacture date.

## Product Fields

Required:

- Name.
- SKU.
- Category.
- Product type.
- Tracking method.
- Base UOM.
- Status.

Optional:

- Description.
- Barcode.
- Default vendor.
- Purchase UOM.
- Sales UOM.
- Costing method.
- Standard cost.
- Sale price.
- Reorder enabled.
- Tax/category mapping if accounting enabled.
- Images/attachments.

## Variants

Variant examples:

- Size.
- Color.
- Material.
- Pack size.
- Region.

Rules:

- Variant SKU is unique per organization.
- Variant barcode is unique where present.
- Stock is tracked at variant level.
- Product can exist with one default variant.

## Categories

Category should support:

- Parent/child hierarchy.
- Code.
- Name.
- Default costing method.
- Default reorder policy.
- Default accounting mapping post-MVP.

## Units Of Measure

UOM should support:

- UOM category.
- Base unit.
- Ratio to base.
- Rounding precision.
- Purchase UOM conversion.
- Sales UOM conversion.

Rules:

- Stock ledger stores base UOM quantity.
- UI can display purchase/sales UOM.
- Conversion must be deterministic and validated.

## Barcode

Barcode can belong to:

- Product.
- Variant.
- Lot.
- Serial.
- Location.
- Package/shipment post-MVP.

Rules:

- Duplicate barcode is blocked per organization.
- Barcode scanning falls back to manual search.

## Import

Product import must support:

- Product master data.
- Variants.
- Categories.
- UOMs.
- Barcodes.
- Opening stock through separate opening stock import.

## Acceptance Criteria

- Product create/edit validates SKU/barcode uniqueness.
- Variant stock is independent.
- UOM conversion is tested.
- Tracking method rules prevent invalid stock state.
