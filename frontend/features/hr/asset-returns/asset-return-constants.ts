import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

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
  all: [...humanResourcesQueryKeys.hr.all, "asset-returns"] as const,
  list: () => [...arKeys.all, "list"] as const,
};

export const STATUS_META: Record<
  string,
  { label: string; badge: string; accent: string }
> = {
  PENDING: {
    label: "Pending",
    badge:
      "bg-status-warning-surface border-status-warning-rule text-status-warning-ink",
    accent: "border-l-amber-500",
  },
  RETURNED: {
    label: "Returned",
    badge:
      "bg-status-success-surface border-status-success-rule text-status-success-ink",
    accent: "border-l-emerald-500",
  },
  MISSING: {
    label: "Missing",
    badge:
      "bg-status-danger-surface border-status-danger-rule text-status-danger-ink",
    accent: "border-l-rose-500",
  },
};

export const CONDITION_META: Record<string, { badge: string }> = {
  Good: {
    badge:
      "bg-status-success-surface border-status-success-rule text-status-success-ink",
  },
  Fair: {
    badge:
      "bg-status-warning-surface border-status-warning-rule text-status-warning-ink",
  },
  Poor: {
    badge:
      "bg-status-danger-surface border-status-danger-rule text-status-danger-ink",
  },
};

export const CONDITIONS = ["Good", "Fair", "Poor"] as const;
