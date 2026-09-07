import { z } from "zod";

const successContract = z.object({ success: z.literal(true) });

const richDocSummarySchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  templateType: z.string().nullable(),
  isPublished: z.boolean(),
  version: z.number().int(),
  createdBy: z.string(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const richDocumentSchema = richDocSummarySchema.extend({
  contentJson: z.record(z.string(), z.unknown()).nullable(),
});

export const richDocumentsListContract = z.object({
  data: z.array(richDocSummarySchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const richDocumentDetailContract = richDocumentSchema;

export const createRichDocumentContract = richDocumentSchema;

export const updateRichDocumentContract = successContract;

export const deleteRichDocumentContract = successContract;

export const publishRichDocumentContract = successContract;
