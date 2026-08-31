import type { AssetStatus, DepreciationMethod } from "@/types/accounting/assets";

export type AssetStatusFilter = "ALL" | AssetStatus;

export const ASSET_STATUS_OPTIONS: ReadonlyArray<{
  value: AssetStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "FULLY_DEPRECIATED", label: "Fully Depreciated" },
  { value: "DISPOSED", label: "Disposed" },
];

export const DEPRECIATION_METHOD_OPTIONS: ReadonlyArray<{
  value: DepreciationMethod;
  label: string;
}> = [
  { value: "STRAIGHT_LINE", label: "Straight Line" },
  { value: "DECLINING_BALANCE", label: "Declining Balance" },
  { value: "UNITS_OF_PRODUCTION", label: "Units of Production" },
];

export function isAssetStatusFilter(value: string): value is AssetStatusFilter {
  return ASSET_STATUS_OPTIONS.some((option) => option.value === value);
}

export function isDepreciationMethod(
  value: string,
): value is DepreciationMethod {
  return DEPRECIATION_METHOD_OPTIONS.some((option) => option.value === value);
}
