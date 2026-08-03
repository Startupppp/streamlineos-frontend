import { z } from "zod";

export const programFormSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  description: z.string(),
  ownerId: z.string(),
  portfolioId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["", "on_track", "at_risk", "off_track"]),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;
