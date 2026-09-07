import { z } from "zod";

export const kbResearchBriefEnqueueContract = z.object({
  jobId: z.string(),
  status: z.string(),
});

const kbResearchBriefListItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  topic: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const kbResearchBriefListContract = z.array(kbResearchBriefListItemContract);

export const kbResearchBriefDetailContract = kbResearchBriefListItemContract.extend({
  outline: z.record(z.string(), z.unknown()).nullable(),
  content: z.string().nullable(),
  sources: z.array(z.record(z.string(), z.unknown())).nullable(),
  aiUsage: z.record(z.string(), z.unknown()).nullable(),
});

export const kbResearchBriefRateContract = z.object({ success: z.boolean() });
