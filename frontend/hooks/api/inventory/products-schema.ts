import { z } from "zod";

const userRefContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

export const invUomContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  category: z.string().nullable(),
  ratioToBase: z.string().nullable(),
  roundingPrecision: z.number().int().nullable(),
  isBase: z.boolean().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invCategoryContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  parentCategoryId: z.number().int().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invProductVariantContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  productId: z.number().int(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  costPrice: z.string().optional(),
  sellingPrice: z.string(),
  attributeValues: z.record(z.string(), z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invProductBaseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  categoryId: z.number().int().nullable(),
  uomId: z.number().int().nullable(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  description: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]),
  productType: z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]).nullable(),
  trackingMethod: z.enum(["NONE", "LOT", "SERIAL"]).nullable(),
  costingMethod: z.enum(["STANDARD", "WEIGHTED_AVERAGE", "FIFO"]).nullable(),
  standardCost: z.string().nullable().optional(),
  purchaseUomId: z.number().int().nullable(),
  salesUomId: z.number().int().nullable(),
  defaultVendorId: z.number().int().nullable(),
  reorderEnabled: z.boolean().nullable(),
  allowNegativeStock: z.boolean().nullable(),
  costPrice: z.string().optional(),
  sellingPrice: z.string(),
  reorderPoint: z.string(),
  minStockLevel: z.string(),
  maxStockLevel: z.string(),
  hasVariants: z.boolean(),
  imageUrl: z.string().nullable(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listProductsContract = z.object({
  items: z.array(invProductBaseContract.extend({
    category: z.object({ id: z.number().int(), name: z.string() }).nullable(),
    uom: z.object({ id: z.number().int(), name: z.string(), abbreviation: z.string() }).nullable(),
    variants: z.array(z.object({ id: z.number().int(), sku: z.string(), name: z.string(), isActive: z.boolean() })),
  })),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getProductContract = invProductBaseContract.extend({
  category: invCategoryContract.nullable(),
  uom: invUomContract.nullable(),
  variants: z.array(invProductVariantContract),
  creator: userRefContract,
});

export const listCategoriesContract = z.array(invCategoryContract);

export const listUomContract = z.array(invUomContract);

export const listVariantsContract = z.object({
  items: z.array(z.object({
    id: z.number().int(),
    productId: z.number().int(),
    productName: z.string(),
    name: z.string(),
    sku: z.string(),
    costPrice: z.string().optional(),
    isActive: z.boolean(),
  })),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type InvUomShape = z.infer<typeof invUomContract>;
export type InvCategoryShape = z.infer<typeof invCategoryContract>;
export type InvProductVariantShape = z.infer<typeof invProductVariantContract>;
export type InvProductBaseShape = z.infer<typeof invProductBaseContract>;
export type InvProductShape = z.infer<typeof getProductContract>;
export type InvProductListShape = z.infer<typeof listProductsContract>;
export type InvVariantListShape = z.infer<typeof listVariantsContract>;
export type InvVariantFlatShape = InvVariantListShape["items"][number];
