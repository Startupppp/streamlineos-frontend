export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "FAILED" | "VOIDED";
export type PatchableInvoiceStatus = Extract<InvoiceStatus, "ISSUED" | "PAID" | "FAILED">;
export type PaymentMethod = "bank_transfer" | "upi" | "cheque" | "cash" | "card" | "other";

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Payment {
  id: number;
  orgId: string;
  invoiceId: number;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  creator?: { id: string; name: string | null } | null;
}

export interface Invoice {
  id: number;
  orgId: string;
  invoiceNumber: string;
  clientId: number | null;
  projectId: number | null;
  createdBy: string;
  lineItems: InvoiceItem[];
  subtotal: string;
  taxRate: string | null;
  taxAmount: string | null;
  discount: string | null;
  total: string;
  amountPaid: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  nextRecurringDate: string | null;
  sentAt: Date | null;
  paidAt: Date | null;
  viewedAt: Date | null;
  collectionOwnerId: string | null;
  promiseToPayDate: string | null;
  client: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
  creator: { id: string; name: string | null } | null;
  payments?: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceStats {
  draft: number;
  issued: number;
  paid: number;
  failed: number;
  voided: number;
  totalOutstanding: number;
  totalPaid: number;
}
