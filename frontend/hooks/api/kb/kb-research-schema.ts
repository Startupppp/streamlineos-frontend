import { z } from "zod";

export const kbResearchBriefEnqueueContract = z.object({
  briefId: z.number().int(),
  jobId: z.number().int(),
});

const kbResearchBriefBaseContract = {
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string().nullable(),
  topic: z.string(),
  spaceId: z.number().int().nullable(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  jobId: z.number().int().nullable(),
  sourceCount: z.number().int(),
  errorMessage: z.string().nullable(),
  rating: z.enum(["helpful", "not_helpful"]).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

const kbResearchBriefListItemContract = z.object(kbResearchBriefBaseContract);

export const kbResearchBriefListContract = z.object({
  items: z.array(kbResearchBriefListItemContract),
  nextCursor: z.number().int().nullable(),
});

export const kbResearchBriefDetailContract = z.object({
  ...kbResearchBriefBaseContract,
  report: z.string().nullable(),
  citations: z.array(
    z.object({
      kind: z.string(),
      id: z.number().int(),
      title: z.string(),
      href: z.string().nullable(),
      updatedAt: z.string().nullable(),
    }),
  ).nullable(),
});

export const kbResearchBriefRateContract = z.object({ success: z.boolean() });

export const kbConvertBriefToPageContract = z.object({
  pageId: z.number().int(),
});
