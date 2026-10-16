import { z } from "zod";
import { portfolioOrProgramNameSchema } from "@/lib/validation/projects";

export const programFormSchema = z.object({
  name: portfolioOrProgramNameSchema,
  description: z.string(),
  ownerId: z.string(),
  portfolioId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["", "on_track", "at_risk", "off_track"]),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;
