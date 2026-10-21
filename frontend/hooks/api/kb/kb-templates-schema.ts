import { z } from "zod";
import { kbPageKindSchema } from "./kb-pages-schema";

const kbPageTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  kind: kbPageKindSchema.default("document"),
  content: z
    .union([
      z.array(z.record(z.string(), z.unknown())),
      z.record(z.string(), z.unknown()),
    ])
    .nullable(),
  createdById: z.string().nullable(),
  createdByName: z.string().nullable(),
  useCount: z.number().int(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbPageTemplateSingleContract = kbPageTemplateContract;

export const kbPageTemplateListPageContract = z.object({
  data: z.array(kbPageTemplateContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
