import { FileText, FileType, Image as ImageIcon, Paperclip, type LucideIcon } from "lucide-react";

export type ExpenseReceipt = { url: string; fileName: string };

export const MAX_EXPENSE_RECEIPTS = 5;
export const MAX_EXPENSE_RECEIPT_BYTES = 10 * 1024 * 1024;

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
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(urlPath)) return "image";
  if (/\.pdf$/.test(urlPath)) return "pdf";
  if (/\.(docx?|rtf|odt)$/.test(urlPath)) return "doc";

  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (/\.pdf$/.test(name)) return "pdf";
  if (/\.(docx?|rtf|odt)$/.test(name)) return "doc";

  return "file";
}

const RECEIPT_KIND_ICONS: Record<ReceiptFileKind, LucideIcon> = {
  pdf: FileText,
  doc: FileType,
  image: ImageIcon,
  file: Paperclip,
};

export function receiptKindIcon(kind: ReceiptFileKind): LucideIcon {
  return RECEIPT_KIND_ICONS[kind];
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
