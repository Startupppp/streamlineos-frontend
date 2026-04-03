export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
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
  taxRate: string;
  taxAmount: string;
  discount: string;
  total: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  notes: string | null;
  sentAt: Date | null;
  paidAt: Date | null;
  client: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
  creator: { id: string; name: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceStats {
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalOutstanding: number;
  totalPaid: number;
}
