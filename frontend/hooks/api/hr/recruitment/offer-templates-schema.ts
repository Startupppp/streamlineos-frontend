import { z } from "zod";

const offerDocumentTemplateSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  htmlContent: z.string(),
  isDefault: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const offerTemplatesListContract = z.array(offerDocumentTemplateSchema);

export const createOfferTemplateContract = offerDocumentTemplateSchema;

export const updateOfferTemplateContract = offerDocumentTemplateSchema;

export const deleteOfferTemplateContract = z.object({ success: z.literal(true) });

export const generateOfferPdfContract = z.object({
  base64: z.string(),
  mimeType: z.string(),
  fileName: z.string(),
});
