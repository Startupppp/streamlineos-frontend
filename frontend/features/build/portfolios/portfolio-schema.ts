import { z } from "zod";

export const portfolioFormSchema = z.object({
  name: z.string().min(1, "Required").max(200),
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["", "on_track", "at_risk", "off_track"]),
  strategicGoal: z.string(),
});

export type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;
