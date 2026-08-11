import { z } from "zod";

export const pricebookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  currency: z.string().min(1),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type PricebookFormValues = z.infer<typeof pricebookFormSchema>;
