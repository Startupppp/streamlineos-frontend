import { z } from "zod";

export const kbArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  categoryId: z.string(),
  visibility: z.enum(["public", "internal"] as const),
});

export type KbArticleFormValues = z.infer<typeof kbArticleSchema>;
