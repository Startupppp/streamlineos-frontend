export function fmtCost(amount: string | number | null) {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export const STATUS_META: Record<string, { label: string; badge: string }> = {
  AVAILABLE: {
    label: "Available",
    badge:
      "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300",
  },
  ASSIGNED: {
    label: "Assigned",
    badge:
      "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300",
  },
  MAINTENANCE: {
    label: "Maintenance",
    badge:
      "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
  },
  RETIRED: {
    label: "Retired",
    badge:
      "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300",
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
