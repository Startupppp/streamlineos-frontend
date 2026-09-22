import { z } from "zod";

export const portalCrSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  impact: z.string(),
});

export type PortalCrValues = z.infer<typeof portalCrSchema>;
