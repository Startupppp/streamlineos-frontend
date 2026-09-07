import {
  Receipt,
  Plane,
  UtensilsCrossed,
  Car,
  Monitor,
  Armchair,
  BookOpen,
  Megaphone,
  Zap,
  Package,
} from "lucide-react";

/**
 * Nine spend categories, which is a taxonomy: Travel is not a notice and Meals
 * is not a warning. On the status scale they rendered as five looks, so a
 * report grouped by category had four pairs of rows that matched.
 *
 * Equipment takes indigo rather than the blue it shared with Travel before the
 * migration — the only entry whose hue is new rather than restored.
 */
export const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; bg: string; text: string }> = {
  Travel:            { icon: Plane,           label: "Travel",    bg: "bg-category-blue-surface",   text: "text-category-blue-ink" },
  Meals:             { icon: UtensilsCrossed, label: "Meals",     bg: "bg-category-orange-surface", text: "text-category-orange-ink" },
  Transport:         { icon: Car,             label: "Transport", bg: "bg-category-sky-surface",    text: "text-category-sky-ink" },
  Software:          { icon: Monitor,         label: "Software",  bg: "bg-category-teal-surface",   text: "text-category-teal-ink" },
  "Office Supplies": { icon: Armchair,        label: "Office",    bg: "bg-muted",                   text: "text-muted-foreground" },
  Equipment:         { icon: Package,         label: "Equipment", bg: "bg-category-indigo-surface", text: "text-category-indigo-ink" },
  Training:          { icon: BookOpen,        label: "Training",  bg: "bg-category-cyan-surface",   text: "text-category-cyan-ink" },
  Marketing:         { icon: Megaphone,       label: "Marketing", bg: "bg-category-pink-surface",   text: "text-category-pink-ink" },
  Utilities:         { icon: Zap,             label: "Utilities", bg: "bg-category-amber-surface",  text: "text-category-amber-ink" },
};

export const ADMIN_CATEGORY_LABELS: Record<string, string> = {
  Travel: "Travel & Transport",
  Meals: "Meals & Entertainment",
  Transport: "Travel & Transport",
  Software: "Software & Tools",
  "Office Supplies": "Office Supplies",
};

export const DEFAULT_CATEGORY = {
  icon: Receipt,
  label: "Other",
  bg: "bg-muted",
  text: "text-muted-foreground",
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

export const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDING:  { dot: "bg-category-amber-fill",   bg: "bg-status-warning-surface",    text: "text-status-warning-ink",   border: "border-status-warning-rule" },
  APPROVED: { dot: "bg-category-emerald-fill", bg: "bg-status-success-surface", text: "text-status-success-ink", border: "border-status-success-rule" },
  REJECTED: { dot: "bg-category-rose-fill",     bg: "bg-status-danger-surface",         text: "text-status-danger-ink",         border: "border-status-danger-rule" },
  PAID:     { dot: "bg-category-slate-fill",   bg: "bg-muted",    text: "text-muted-foreground",     border: "border-border" },
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export const EXPENSE_CATEGORIES = [
  "Travel", "Meals", "Office Supplies", "Software",
  "Equipment", "Training", "Marketing", "Utilities", "Other",
];

export const PAYMENT_METHODS = [
  "Cash", "Company Card", "Personal Card", "Bank Transfer", "UPI",
  "Online", "Offline", "Cheque", "NEFT", "IMPS",
  "Debit Card", "Credit Card", "Wallet", "Demand Draft", "Other",
];

export type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export {
  MAX_EXPENSE_RECEIPTS,
  MAX_EXPENSE_RECEIPT_BYTES,
  parseExpenseReceipts,
  serializeExpenseReceipts,
  getReceiptFileKind,
  receiptKindEmoji,
  receiptKindLabel,
} from "@/lib/expense-receipts";
export type { ExpenseReceipt, ReceiptFileKind } from "@/lib/expense-receipts";
