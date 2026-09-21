import { z } from "zod";
import { CUSTOM_FIELD_TYPES } from "@/types/projects/tasks";

export const customFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required"),
  fieldType: z.enum(CUSTOM_FIELD_TYPES),
  options: z.string(),
});

export type CustomFieldFormValues = z.infer<typeof customFieldSchema>;
