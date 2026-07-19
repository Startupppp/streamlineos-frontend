import { z } from "zod";

export const kbResearchBriefSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").max(300, "Topic must be at most 300 characters"),
  spaceId: z.number().optional(),
});

export type KbResearchBriefFormValues = z.infer<typeof kbResearchBriefSchema>;
