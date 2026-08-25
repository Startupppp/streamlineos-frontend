export function fmtCost(amount: string | number | null) {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export const STATUS_META: Record<string, { label: string; badge: string }> = {
  AVAILABLE: {
    label: "Available",
    badge:
      "bg-status-success-surface border-status-success-rule text-status-success-ink",
  },
  ASSIGNED: {
    label: "Assigned",
    badge:
      "bg-status-info-surface border-status-info-rule text-status-info-ink",
  },
  MAINTENANCE: {
    label: "Maintenance",
    badge:
      "bg-status-warning-surface border-status-warning-rule text-status-warning-ink",
  },
  RETIRED: {
    label: "Retired",
    badge:
      "bg-status-danger-surface border-status-danger-rule text-status-danger-ink",
  },
};

export const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Headset",
  "Keyboard",
  "Mouse",
  "Other",
] as const;

export interface AssignDialogState {
  assetId: number;
  assetName: string;
  currentAssignedTo: string | null;
}
