import { z } from "zod";

const wikiPageStatItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  spaceId: z.number().int().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  trustState: z.enum(["unverified", "verified", "verification_expired"]),
  uniqueViewers: z.number().int(),
  updatedAt: z.string(),
});

export const wikiPageStatsContract = z.object({
  data: z.array(wikiPageStatItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type WikiPageStatResult = z.infer<typeof wikiPageStatsContract>;
export type WikiPageStatItem = z.infer<typeof wikiPageStatItemSchema>;

const wikiStalePageItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  spaceId: z.number().int().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  uniqueViewers: z.number().int(),
  updatedAt: z.string(),
  ownerMembershipId: z.number().int().nullable(),
});

export const wikiStalePagesContract = z.object({
  data: z.array(wikiStalePageItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type WikiStalePagesResult = z.infer<typeof wikiStalePagesContract>;
export type WikiStalePageItem = z.infer<typeof wikiStalePageItemSchema>;

const wikiContributorItemSchema = z.object({
  membershipId: z.number().int().nullable(),
  editCount: z.number().int(),
});

export const wikiContributorsContract = z.array(wikiContributorItemSchema);

export type WikiContributorItem = z.infer<typeof wikiContributorItemSchema>;
