import { z } from "zod";

export const applyTemplateSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export type ApplyTemplateFormValues = z.infer<typeof applyTemplateSchema>;

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string(),
  category: z.string(),
});

export type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>;
