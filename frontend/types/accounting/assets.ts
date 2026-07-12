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
  name: string;
  assetAccountId: number;
  depreciationExpenseAccountId: number;
  accumulatedDepreciationAccountId: number;
  defaultMethod: DepreciationMethod;
  defaultUsefulLifeMonths: number | null;
  createdAt: string;
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
  defaultUsefulLifeMonths?: number | null;
}

export interface Asset {
  id: number;
  assetNumber: string;
  name: string;
  categoryId: number;
  acquisitionDate: string;
  acquisitionCost: string;
  salvageValue: string;
  usefulLifeMonths: number;
  depreciationMethod: string;
  accumulatedDepreciation: string;
  status: AssetStatus;
  vendorId?: number;
  billId?: number;
  activatedAt: string | null;
  disposedAt: string | null;
  disposalProceeds: string | null;
  disposalGainLoss: string | null;
  createdAt: string;
}

export interface AssetListItem {
  asset: Asset;
  categoryName: string | null;
}

export interface DepreciationScheduleRow {
  id: number;
  periodKey: string;
  amount: string;
  status: "SCHEDULED" | "POSTED";
  journalEntryId?: number;
}

export interface AssetDetail extends Asset {
  schedule: DepreciationScheduleRow[];
}

export interface CreateAssetInput {
  assetNumber?: string;
  name: string;
  categoryId: number;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  vendorId?: number;
  billId?: number;
}

export interface UpdateAssetInput {
  name?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  depreciationMethod?: DepreciationMethod;
  vendorId?: number;
  billId?: number;
}

export interface DisposeAssetInput {
  disposalDate: string;
  amount: string;
}

export type DepreciationRunStatus = "PENDING" | "COMPLETED" | "REVERSED";

export interface DepreciationRun {
  id: number;
  periodKey: string;
  assetCount: number;
  totalDepreciation: string;
  status: DepreciationRunStatus;
  journalEntryId: number | null;
  postedBy: string | null;
  postedAt: string | null;
  reversedAt: string | null;
  createdAt: string;
}

export interface CreateRunInput {
  periodKey: string;
}
