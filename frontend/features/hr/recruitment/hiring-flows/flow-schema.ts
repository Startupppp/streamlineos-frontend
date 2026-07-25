import { z } from "zod";

export const flowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  isDefault: z.boolean(),
});

export type FlowFormValues = z.infer<typeof flowSchema>;
