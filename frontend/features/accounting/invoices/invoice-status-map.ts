import type { InvoiceStatus } from "@/types/invoice";
import type { FinanceStatus } from "@/features/accounting/shared";

export const SERVER_FILTERABLE: ReadonlyArray<string> = ["DRAFT", "ISSUED", "PAID", "FAILED", "VOIDED"];

export function isInvoiceStatus(v: string): v is InvoiceStatus {
  return SERVER_FILTERABLE.includes(v);
}

export type DisplayStatus =
  | "DRAFT"
  | "ISSUED"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "FAILED"
  | "VOIDED";

export const ALL_DISPLAY_STATUSES: ReadonlyArray<string> = [
  "DRAFT",
  "ISSUED",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "FAILED",
  "VOIDED",
];

const FINANCE_STATUS_MAP: Record<string, FinanceStatus> = {
  DRAFT: "DRAFT",
  ISSUED: "SENT",
  SENT: "SENT",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  FAILED: "OVERDUE",
  VOIDED: "VOID",
};

export function toFinanceStatus(status: string): FinanceStatus {
  return FINANCE_STATUS_MAP[status] ?? "DRAFT";
}
