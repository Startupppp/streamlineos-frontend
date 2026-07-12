export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface Quote {
  id: number;
  orgId: string;
  dealId: number | null;
  clientId: number | null;
  quoteNumber: string;
  subject: string;
  description: string | null;
  status: QuoteStatus;
  currency: string;
  totalAmount: string;
  taxAmount: string;
  discountAmount: string;
  netAmount: string;
  validUntil: string;
  termsAndConditions: string | null;
  createdById: string;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  pricebookId: string | null;
  templateId: string | null;
  approvalStatus: "pending" | "approved" | "rejected" | null;
  approvedById: string | null;
  approvedAt: string | null;
  signedAt: string | null;
  signedDocumentRef: string | null;
  convertedInvoiceId: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; image: string | null } | null;
  deal?: { id: number; name: string } | null;
  client?: { id: number; clientName: string } | null;
  lineItems?: QuoteLineItem[];
}

export interface QuoteListItem {
  id: number;
  orgId: string;
  dealId: number | null;
  clientId: number | null;
  quoteNumber: string;
  subject: string;
  status: QuoteStatus;
  currency: string;
  totalAmount: string;
  netAmount: string;
  validUntil: string;
  createdById: string;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; image: string | null } | null;
  deal: { id: number; name: string } | null;
  client: { id: number; clientName: string } | null;
}

export interface QuoteLineItem {
  id: number;
  quoteId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  taxRate: string;
  displayOrder: number;
}

export interface QuoteFilters {
  status?: QuoteStatus;
  dealId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface QuoteLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateQuoteInput {
  dealId?: number;
  clientId?: number;
  subject: string;
  description?: string;
  currency?: string;
  validUntil: string;
  termsAndConditions?: string;
  notes?: string;
  lineItems: QuoteLineItemInput[];
}

export interface UpdateQuoteInput {
  id: number;
  subject?: string;
  description?: string;
  status?: QuoteStatus;
  validUntil?: string;
  termsAndConditions?: string;
  notes?: string;
  rejectionReason?: string;
  lineItems?: QuoteLineItemInput[];
}
