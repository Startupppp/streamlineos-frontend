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

export const kbPageFullSearchItemContract = z.object({
  id: z.number().int(),
  title: z.string(),
  spaceId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  status: z.string(),
  trustState: z.string(),
  visibility: z.string(),
  contentType: z.string(),
  updatedAt: z.string(),
  snippet: z.string(),
});

export const kbPageFullSearchFacetsContract = z.object({
  status: z.array(z.object({ value: z.string(), count: z.number().int() })),
  space: z.array(
    z.object({ spaceId: z.number().int().nullable(), count: z.number().int() }),
  ),
  type: z.array(z.object({ value: z.string(), count: z.number().int() })),
  verified: z.array(z.object({ value: z.string(), count: z.number().int() })),
});

export const kbPageFullSearchResponseContract = z.object({
  items: z.array(kbPageFullSearchItemContract),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  limit: z.number().int(),
  facets: kbPageFullSearchFacetsContract.nullable(),
});

export type KbPageFullSearchItem = z.infer<typeof kbPageFullSearchItemContract>;
export type KbPageFullSearchFacets = z.infer<typeof kbPageFullSearchFacetsContract>;
export type KbPageFullSearchResponse = z.infer<typeof kbPageFullSearchResponseContract>;
