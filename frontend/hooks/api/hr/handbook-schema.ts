import { z } from "zod";

export const handbookRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  version: z.string(),
  title: z.string(),
  documentId: z.number().int().nullable(),
  documentUrl: z.string().nullable(),
  changelog: z.string().nullable(),
  publishedAt: z.string().nullable(),
  publishedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const handbookListContract = z.array(handbookRowContract);
