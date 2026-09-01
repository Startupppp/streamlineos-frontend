import { z } from "zod";

export const blogCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Must be a valid hex color (e.g. #3b82f6)")
    .nullable()
    .optional(),
});

export type BlogCategoryFormValues = z.infer<typeof blogCategorySchema>;
