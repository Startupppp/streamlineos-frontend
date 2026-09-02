export type {
  InvoiceStatus,
  InvoiceItem,
  Payment,
  Invoice,
  InvoiceStats,
} from "@/hooks/api/invoice-schema";

export type PatchableInvoiceStatus = "ISSUED" | "PAID" | "FAILED";
export type PaymentMethod =
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "cash"
  | "card"
  | "other";
