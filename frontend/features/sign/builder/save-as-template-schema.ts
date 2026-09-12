import { z } from "zod";

export const saveAsTemplateSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name").max(200, "Keep the name under 200 characters"),
});

export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateSchema>;
