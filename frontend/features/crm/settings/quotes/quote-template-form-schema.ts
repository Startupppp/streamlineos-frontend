import { z } from "zod";

export const quoteTemplateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  isDefault: z.boolean(),
  terms: z.string().optional(),
});

export type QuoteTemplateFormValues = z.infer<typeof quoteTemplateFormSchema>;
