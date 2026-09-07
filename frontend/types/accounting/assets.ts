export type AssetStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FULLY_DEPRECIATED"
  | "DISPOSED";

export type DepreciationMethod =
  | "STRAIGHT_LINE"
  | "DECLINING_BALANCE"
  | "UNITS_OF_PRODUCTION";

export interface AssetCategory {
  id: number;
  orgId: string;
  name: string;
  assetAccountId: number;
  depreciationExpenseAccountId: number;
  accumulatedDepreciationAccountId: number;
  defaultMethod: DepreciationMethod;
  defaultUsefulLifeMonths: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  assetAccountId: number;
  depreciationExpenseAccountId: number;
  accumulatedDepreciationAccountId: number;
  defaultMethod: DepreciationMethod;
  defaultUsefulLifeMonths?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  assetAccountId?: number;
  depreciationExpenseAccountId?: number;
  accumulatedDepreciationAccountId?: number;
  defaultMethod?: DepreciationMethod;
  defaultUsefulLifeMonths?: number;
}

export interface Asset {
  id: number;
  orgId: string;
  assetNumber: string;
  name: string;
  categoryId: number;
  acquisitionDate: string;
  acquisitionCost: string;
  salvageValue: string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  vendorId: number | null;
  billId: number | null;
  status: AssetStatus;
  accumulatedDepreciation: string;
  disposedAt: string | null;
  disposalAmount: string | null;
  disposalJournalEntryId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListItem {
  asset: Asset;
  categoryName: string | null;
}

export interface DepreciationScheduleRow {
  id: number;
  orgId: string;
  assetId: number;
  periodKey: string;
  amount: string;
  runId: number | null;
  journalEntryId: number | null;
  status: "SCHEDULED" | "POSTED";
}

export interface AssetDetail {
  asset: Asset;
  category: AssetCategory | null;
  schedules: DepreciationScheduleRow[];
}

export interface CreateAssetInput {
  name: string;
  categoryId: number;
  acquisitionDate: string;
  acquisitionCost: string;
  salvageValue?: string;
  usefulLifeMonths: number;
  depreciationMethod?: DepreciationMethod;
  vendorId?: number;
  billId?: number;
}

export interface UpdateAssetInput {
  name?: string;
  categoryId?: number;
  salvageValue?: string;
  usefulLifeMonths?: number;
}

export interface DisposeAssetInput {
  disposalDate: string;
  amount: string;
}

export interface AssetDisposeResult {
  assetId: number;
  journalEntryId: number;
  entryNumber: string;
}

export type DepreciationRunStatus = "DRAFT" | "POSTED";

export interface DepreciationRun {
  id: number;
  orgId: string;
  periodKey: string;
  status: DepreciationRunStatus;
  totalAmount: string;
  journalEntryId: number | null;
  createdBy: string;
  postedAt: string | null;
  createdAt: string;
}

export interface CreateRunInput {
  periodKey: string;
}

export interface DepreciationRunReverseResult {
  runId: number;
  reversalEntryId: number;
  reversalEntryNumber: string;
}
