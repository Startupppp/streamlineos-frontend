import { z } from "zod";

export const certificateDetailsSchema = z.object({
  certificateNumber: z.string(),
  tenantName: z.string(),
  envelopeTitle: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
  finalPdfHash: z.string(),
  watermarked: z.boolean(),
  completedAt: z.string(),
  documents: z.array(
    z.object({
      fileName: z.string(),
      sha256Hash: z.string(),
      pageCount: z.number().nullable(),
    }),
  ),
  recipients: z.array(
    z.object({
      name: z.string(),
      email: z.string().nullable(),
      role: z.string(),
      authMethod: z.string(),
      completedAt: z.string().nullable(),
    }),
  ),
  events: z.array(
    z.object({
      eventType: z.string(),
      actorName: z.string().nullable(),
      createdAt: z.string(),
      ipAddress: z.string().nullable(),
    }),
  ),
  regeneratedFrom: z.string().optional(),
});

export type CertificateDetails = z.infer<typeof certificateDetailsSchema>;
