import { z } from "zod";

export const editTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  description: z.string().trim().max(1000).nullable().optional(),
});

export type EditTemplateFormValues = z.infer<typeof editTemplateSchema>;
