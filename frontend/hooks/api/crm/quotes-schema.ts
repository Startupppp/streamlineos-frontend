import { z } from "zod";

const quoteRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  dealId: z.number().int().nullable(),
  clientId: z.number().int().nullable(),
  quoteNumber: z.string(),
  subject: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  currency: z.string(),
  totalAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  netAmount: z.string(),
  validUntil: z.string(),
  termsAndConditions: z.string().nullable(),
  createdById: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  sentAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pricebookId: z.string().nullable(),
  templateId: z.string().nullable(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).nullable(),
  approvedById: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  signedAt: z.string().nullable(),
  signedDocumentRef: z.string().nullable(),
  documentKey: z.string().nullable(),
  convertedInvoiceId: z.number().int().nullable(),
  exchangeRate: z.string(),
  deletedAt: z.string().nullable(),
});

const quoteLineItemSchema = z.object({
  id: z.number().int(),
  quoteId: z.number().int(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  taxRate: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
});

export const quoteDetailContract = quoteRowSchema.extend({
  lineItems: z.array(quoteLineItemSchema),
  createdBy: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() }),
  deal: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  client: z.object({ id: z.number().int(), clientName: z.string() }).nullable(),
});

export const quoteContract = quoteRowSchema;

export const quoteListContract = z.object({
  quotes: z.array(
    z.object({
      id: z.number().int(),
      orgId: z.string(),
      dealId: z.number().int().nullable(),
      clientId: z.number().int().nullable(),
      quoteNumber: z.string(),
      subject: z.string(),
      status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const),
      currency: z.string(),
      totalAmount: z.string(),
      netAmount: z.string(),
      validUntil: z.string(),
      createdById: z.string(),
      sentAt: z.string().nullable(),
      acceptedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      createdBy: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() }).nullable(),
      deal: z.object({ id: z.number().int(), name: z.string() }).nullable(),
      client: z.object({ id: z.number().int(), clientName: z.string() }).nullable(),
    }),
  ),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});

export const quoteDeleteContract = z.object({ success: z.literal(true) });

export const quoteConvertToInvoiceContract = z.object({
  invoice: z.object({
    id: z.number().int(),
    orgId: z.string(),
    invoiceNumber: z.string(),
    status: z.string(),
    total: z.string(),
    currency: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  quoteId: z.number().int(),
});
