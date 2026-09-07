import { z } from "zod";

export const kbSearchResponseContract = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      type: z.string(),
      title: z.string(),
      snippet: z.string().nullable(),
      icon: z.string().nullable(),
      spaceId: z.number().int().nullable(),
      score: z.number().nullable(),
    }),
  ),
  total: z.number().int(),
  hasMore: z.boolean(),
});
