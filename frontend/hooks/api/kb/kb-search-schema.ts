import { z } from "zod";

export const kbSearchItemContract = z.object({
  id: z.number().int(),
  spaceId: z.number().int().nullable(),
  categoryId: z.number().int().nullable(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  status: z.string(),
  updatedAt: z.string(),
  snippet: z.string(),
});

export const kbSearchResponseContract = z.object({
  items: z.array(kbSearchItemContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type KbSearchItem = z.infer<typeof kbSearchItemContract>;
export type KbSearchApiResponse = z.infer<typeof kbSearchResponseContract>;
