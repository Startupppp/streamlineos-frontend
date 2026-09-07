import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const assetCategoryContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  assetAccountId: z.number(),
  depreciationExpenseAccountId: z.number(),
  accumulatedDepreciationAccountId: z.number(),
  defaultMethod: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"]),
  defaultUsefulLifeMonths: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const assetCategoryListContract = cursorPageContract(assetCategoryContract);

const assetContract = z.object({
  id: z.number(),
  orgId: z.string(),
  assetNumber: z.string(),
  name: z.string(),
  categoryId: z.number(),
  acquisitionDate: z.string(),
  acquisitionCost: z.string(),
  salvageValue: z.string(),
  usefulLifeMonths: z.number(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"]),
  vendorId: z.number().nullable(),
  billId: z.number().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "FULLY_DEPRECIATED", "DISPOSED"]),
  accumulatedDepreciation: z.string(),
  disposedAt: z.string().nullable(),
  disposalAmount: z.string().nullable(),
  disposalJournalEntryId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const assetListContract = cursorPageContract(
  z.object({
    asset: assetContract,
    categoryName: z.string().nullable(),
  }),
);

const depreciationScheduleContract = z.object({
  id: z.number(),
  orgId: z.string(),
  assetId: z.number(),
  periodKey: z.string(),
  amount: z.string(),
  runId: z.number().nullable(),
  journalEntryId: z.number().nullable(),
  status: z.enum(["SCHEDULED", "POSTED"]),
});

export const assetDetailContract = z.object({
  asset: assetContract,
  category: assetCategoryContract.nullable(),
  schedules: z.array(depreciationScheduleContract),
});

export const assetCreatedContract = assetContract;

export const assetUpdatedContract = assetContract;

export const assetActivateContract = assetContract;

export const assetDisposeContract = z.object({
  assetId: z.number(),
  journalEntryId: z.number(),
  entryNumber: z.string(),
});

const depreciationRunContract = z.object({
  id: z.number(),
  orgId: z.string(),
  periodKey: z.string(),
  status: z.enum(["DRAFT", "POSTED"]),
  totalAmount: z.string(),
  journalEntryId: z.number().nullable(),
  createdBy: z.string(),
  postedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const depreciationRunListContract = cursorPageContract(depreciationRunContract);

export const depreciationRunCreateContract = depreciationRunContract;

export const depreciationRunReverseContract = z.object({
  runId: z.number(),
  reversalEntryId: z.number(),
  reversalEntryNumber: z.string(),
});

export type AssetCategoryList = z.infer<typeof assetCategoryListContract>;
export type AssetList = z.infer<typeof assetListContract>;
export type AssetDetail = z.infer<typeof assetDetailContract>;
export type DepreciationRunList = z.infer<typeof depreciationRunListContract>;
