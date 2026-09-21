import { z } from "zod";

export const customFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required"),
  fieldType: z.string(),
  options: z.string(),
});

export type CustomFieldFormValues = z.infer<typeof customFieldSchema>;
