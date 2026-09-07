import { z } from "zod";

const dimensionContract = z.object({
  id: z.number(),
  name: z.string(),
  key: z.string(),
  requiredForAccountTypes: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
  valueCount: z.number(),
});

export const dimensionListContract = z.object({ items: z.array(dimensionContract) });

const dimensionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  requiredForAccountTypes: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const dimensionCreatedContract = dimensionRowContract;

export const dimensionUpdatedContract = dimensionRowContract;

const dimensionValueContract = z.object({
  id: z.number(),
  orgId: z.string(),
  dimensionId: z.number(),
  name: z.string(),
  code: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const dimensionValueListContract = z.object({ items: z.array(dimensionValueContract) });

export const dimensionValueCreatedContract = dimensionValueContract;

export const dimensionValueUpdatedContract = dimensionValueContract;

export type DimensionList = z.infer<typeof dimensionListContract>;
export type DimensionValueList = z.infer<typeof dimensionValueListContract>;
