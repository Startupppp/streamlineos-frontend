export interface Quote {
  id: number;
  orgId: string;
  dealId: number | null;
  clientId: number | null;
  quoteNumber: string;
  subject: string;
  description: string | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
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
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; image: string | null } | null;
  deal?: { id: number; name: string } | null;
  client?: { id: number; clientName: string } | null;
  lineItems?: QuoteLineItem[];
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
  status?: string;
  dealId?: number;
  search?: string;
  limit?: number;
  offset?: number;
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
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discount?: number;
  }>;
}

export interface UpdateQuoteInput {
  id: number;
  subject?: string;
  description?: string;
  status?: Quote["status"];
  validUntil?: string;
  termsAndConditions?: string;
  notes?: string;
  rejectionReason?: string;
}
