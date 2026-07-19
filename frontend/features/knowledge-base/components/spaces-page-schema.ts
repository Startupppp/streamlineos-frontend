import { z } from "zod";

export const spaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  audience: z.enum(["internal", "public", "mixed"]).optional(),
});

export type SpaceFormValues = z.infer<typeof spaceSchema>;
