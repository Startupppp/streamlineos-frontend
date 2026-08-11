import { z } from "zod";

export const optionSchema = z.object({
  value: z.string().min(1, "Value required"),
  label: z.string().min(1, "Label required"),
});

export const createSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]),
  isRequired: z.boolean(),
  options: z.array(optionSchema).optional(),
});
export type CreateForm = z.infer<typeof createSchema>;

export const editSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  isRequired: z.boolean(),
  options: z.array(optionSchema).optional(),
});
export type EditForm = z.infer<typeof editSchema>;
