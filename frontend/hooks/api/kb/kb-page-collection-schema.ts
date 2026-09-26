import { z } from "zod";

export const kbPageCollectionItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  icon: z.string().nullable(),
  coverImage: z.string().nullable(),
  spaceId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  parentPageId: z.number().int().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  visibility: z.enum(["private", "org", "public"]),
  contentType: z.string(),
  trustState: z.enum(["unverified", "verified", "verification_expired"]),
  ownerMembershipId: z.number().int().nullable(),
  ownerUserId: z.string().nullable(),
  createdById: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  lastEditedById: z.string().nullable(),
  lastEditedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  nextReviewAt: z.string().nullable(),
  verifiedUntil: z.string().nullable(),
  contentRevision: z.number().int(),
  aclRevision: z.number().int(),
  sharedBy: z
    .object({
      membershipId: z.number().int().nullable(),
      at: z.string(),
      access: z.enum(["view", "comment", "edit", "manage"]),
    })
    .nullable(),
});

export type KbPageCollectionItem = z.infer<typeof kbPageCollectionItemSchema>;

export const kbPageCollectionResponseSchema = z.object({
  data: z.array(kbPageCollectionItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
  facets: z
    .object({
      status: z.array(z.object({ value: z.string(), count: z.number().int() })),
      space: z.array(
        z.object({
          spaceId: z.number().int().nullable(),
          count: z.number().int(),
        }),
      ),
      owner: z.array(
        z.object({
          ownerMembershipId: z.number().int().nullable(),
          count: z.number().int(),
        }),
      ),
    })
    .nullable(),
});

export type KbPageCollectionResponse = z.infer<
  typeof kbPageCollectionResponseSchema
>;

export const kbPageCollectionContract = kbPageCollectionResponseSchema;
