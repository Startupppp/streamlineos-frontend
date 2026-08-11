import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  channel: z.string().optional(),
  utmCampaignKey: z.string().optional(),
  budgetAllocated: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;
