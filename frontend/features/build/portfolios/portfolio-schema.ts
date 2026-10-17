import { z } from "zod";
import { portfolioOrProgramNameSchema } from "@/lib/validation/projects";

export const portfolioFormSchema = z.object({
  name: portfolioOrProgramNameSchema,
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["", "on_track", "at_risk", "off_track"]),
  strategicGoal: z.string(),
});

export type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;
