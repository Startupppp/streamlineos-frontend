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

export const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; bg: string; text: string }> = {
  Travel:            { icon: Plane,           label: "Travel",    bg: "bg-status-info-surface",     text: "text-status-info-ink" },
  Meals:             { icon: UtensilsCrossed, label: "Meals",     bg: "bg-status-warning-surface", text: "text-status-warning-ink" },
  Transport:         { icon: Car,             label: "Transport", bg: "bg-status-info-surface", text: "text-status-info-ink" },
  Software:          { icon: Monitor,         label: "Software",  bg: "bg-status-success-surface",     text: "text-status-success-ink" },
  "Office Supplies": { icon: Armchair,        label: "Office",    bg: "bg-muted",    text: "text-muted-foreground" },
  Equipment:         { icon: Package,         label: "Equipment", bg: "bg-status-info-surface", text: "text-status-info-ink" },
  Training:          { icon: BookOpen,        label: "Training",  bg: "bg-status-info-surface",     text: "text-status-info-ink" },
  Marketing:         { icon: Megaphone,       label: "Marketing", bg: "bg-category-pink-surface",     text: "text-category-pink-ink" },
  Utilities:         { icon: Zap,             label: "Utilities", bg: "bg-status-warning-surface",   text: "text-status-warning-ink" },
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

export const MAX_EXPENSE_RECEIPTS = 5;
export const MAX_EXPENSE_RECEIPT_BYTES = 10 * 1024 * 1024;

export type ExpenseReceipt = { url: string; fileName: string };

/** Receipt URLs/names are stored newline-separated in existing text columns. */
export function parseExpenseReceipts(
  receiptUrl?: string | null,
  receiptFileName?: string | null,
): ExpenseReceipt[] {
  if (!receiptUrl?.trim()) return [];
  const urls = receiptUrl.split("\n").map((s) => s.trim()).filter(Boolean);
  const names = (receiptFileName ?? "").split("\n");
  return urls.map((url, i) => ({
    url,
    fileName: names[i]?.trim() || `receipt-${i + 1}`,
  }));
}

export function serializeExpenseReceipts(receipts: ExpenseReceipt[]): {
  receiptUrl?: string;
  receiptFileName?: string;
} {
  if (receipts.length === 0) return {};
  return {
    receiptUrl: receipts.map((r) => r.url).join("\n"),
    receiptFileName: receipts.map((r) => r.fileName).join("\n"),
  };
}

export type ReceiptFileKind = "image" | "pdf" | "doc" | "file";

export function getReceiptFileKind(
  url: string,
  fileName?: string | null,
): ReceiptFileKind {
  const urlPath = url.split("?")[0]?.toLowerCase() ?? "";
  const name = (fileName ?? "").toLowerCase();

  if (urlPath.startsWith("data:image/")) return "image";
  // Prefer URL extension — filenames like "report.docx.pdf" should still count as PDF
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(urlPath)) return "image";
  if (/\.pdf$/.test(urlPath)) return "pdf";
  if (/\.(docx?|rtf|odt)$/.test(urlPath)) return "doc";

  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (/\.pdf$/.test(name)) return "pdf";
  if (/\.(docx?|rtf|odt)$/.test(name)) return "doc";

  return "file";
}

export function receiptKindEmoji(kind: ReceiptFileKind): string {
  switch (kind) {
    case "pdf":
      return "📄";
    case "doc":
      return "📝";
    case "image":
      return "🖼️";
    default:
      return "📎";
  }
}

export function receiptKindLabel(kind: ReceiptFileKind): string {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "doc":
      return "DOC";
    case "image":
      return "IMG";
    default:
      return "FILE";
  }
}
