import { z } from "zod";

export const createPipelineSchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["lead", "deal", "renewal", "customer_success", "partner", "custom"] as const),
  key: z.string().min(1, "Key required"),
});

export type CreatePipelineValues = z.infer<typeof createPipelineSchema>;
