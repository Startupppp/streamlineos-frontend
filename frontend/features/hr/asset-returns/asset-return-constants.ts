import { queryKeys } from "@/lib/query-keys";

export interface AssetReturn {
  id: number;
  userId: string;
  employeeName: string | null;
  assetName: string;
  assetType: string | null;
  serialNumber: string | null;
  condition: string | null;
  status: string | null;
  notes: string | null;
  returnedAt: string | null;
  createdAt: string | null;
}

export const arKeys = {
  all: [...queryKeys.hr.all, "asset-returns"] as const,
  list: () => [...arKeys.all, "list"] as const,
};

export const STATUS_META: Record<
  string,
  { label: string; badge: string; accent: string }
> = {
  PENDING: {
    label: "Pending",
    badge:
      "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  RETURNED: {
    label: "Returned",
    badge:
      "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300",
    accent: "border-l-emerald-500",
  },
  MISSING: {
    label: "Missing",
    badge:
      "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300",
    accent: "border-l-rose-500",
  },
};

export const CONDITION_META: Record<string, { badge: string }> = {
  Good: {
    badge:
      "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300",
  },
  Fair: {
    badge:
      "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
  },
  Poor: {
    badge:
      "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300",
  },
};

export const CONDITIONS = ["Good", "Fair", "Poor"] as const;
