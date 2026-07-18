import { z } from "zod";

export const optionsSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  defaultLanguage: z.string().min(2).max(10),
});

export type OptionsValues = z.infer<typeof optionsSchema>;
