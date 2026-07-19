import { z } from "zod";

export const fieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Key is required")
    .regex(/^[a-z][a-z0-9_]*$/, "Lowercase snake_case, e.g. order_number"),
  label: z.string().trim().min(1, "Label is required").max(150),
  fieldType: z.enum(["text", "number", "select", "checkbox", "date"]),
  optionsText: z.string(),
  required: z.boolean(),
  category: z.string().trim(),
  isActive: z.boolean(),
});

export type FieldForm = z.infer<typeof fieldSchema>;
