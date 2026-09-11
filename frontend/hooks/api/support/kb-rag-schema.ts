import { z } from "zod";

export const publicKbSourcesSchema = z.array(z.object({
  articleId: z.number(),
  title: z.string(),
  slug: z.string(),
  attachmentId: z.number().nullable(),
  attachmentName: z.string().nullable(),
  similarity: z.number(),
}));
