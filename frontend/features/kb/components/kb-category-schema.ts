import { z } from "zod";

export const kbCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  icon: z.string().max(50, "Icon name is too long").optional(),
  isPublished: z.boolean(),
});

export type KbCategoryFormValues = z.infer<typeof kbCategorySchema>;
