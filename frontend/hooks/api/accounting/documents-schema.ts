import { z } from "zod";


export const ATTACHABLE_DOCUMENT_TYPES = [
  "sales_invoice",
  "credit_note",
  "purchase_bill",
  "debit_note",
  "receipt",
  "payment",
  "journal",
] as const;

export const documentAttachmentContract = z.object({
  id: z.string(),
  bookId: z.string(),
  documentType: z.enum(ATTACHABLE_DOCUMENT_TYPES),
  documentId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  storageUrl: z.string().nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const documentAttachmentPageContract = z.object({
  items: z.array(documentAttachmentContract),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const removedAttachmentContract = z.object({
  id: z.string(),
  deleted: z.literal(true),
});

const COMPLIANCE_STATUSES = [
  "not_required",
  "pending",
  "submitted",
  "accepted",
  "rejected",
  "cancelled",
] as const;
const COMPLIANCE_TRANSPORTS = [
  "none",
  "irp",
  "mock_irp",
  "peppol",
  "fatoora",
  "sdi",
  "mtd",
  "other",
] as const;

const transportDescriptionContract = z.object({
  configured: z.boolean(),
  real: z.boolean(),
  name: z.string(),
});

const authorityErrorContract = z.object({ code: z.string(), message: z.string() });

export const documentComplianceContract = z.object({
  states: z.array(
    z.object({
      headline: z.string(),
      filed: z.boolean(),
      action: z.string().nullable(),
      transport: z.enum(COMPLIANCE_TRANSPORTS),
      status: z.enum(COMPLIANCE_STATUSES),
      authorityId: z.string().nullable(),
      ackNo: z.string().nullable(),
      ackAt: z.string().nullable(),
      errors: z.array(authorityErrorContract).nullable(),
      cancelledAt: z.string().nullable(),
    }),
  ),
  filed: z.boolean(),
  headline: z.string(),
  transport: transportDescriptionContract,
});

export const submitDocumentComplianceContract = z.object({
  result: z.discriminatedUnion("outcome", [
    z.object({
      outcome: z.literal("accepted"),
      authorityId: z.string(),
      ackNo: z.string(),
      ackAt: z.string(),
    }),
    z.object({ outcome: z.literal("rejected"), errors: z.array(authorityErrorContract) }),
    z.object({ outcome: z.literal("unavailable"), reason: z.string() }),
  ]),
  transport: transportDescriptionContract,
  headline: z.string().optional(),
  filed: z.boolean().optional(),
  action: z.string().nullable().optional(),
});

export type AttachableDocumentType = (typeof ATTACHABLE_DOCUMENT_TYPES)[number];
export type DocumentAttachment = z.infer<typeof documentAttachmentContract>;
export type DocumentAttachmentPage = z.infer<typeof documentAttachmentPageContract>;
export type RemovedAttachment = z.infer<typeof removedAttachmentContract>;
export type DocumentCompliance = z.infer<typeof documentComplianceContract>;
export type SubmitDocumentComplianceResult = z.infer<typeof submitDocumentComplianceContract>;
