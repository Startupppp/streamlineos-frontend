import { z } from "zod";

const customFieldSchema = z.object({
  id: z.number().int(),
  entityType: z.enum(["lead", "deal", "contact"]),
  name: z.string(),
  label: z.string(),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]),
  options: z.array(z.object({ value: z.string(), label: z.string() })).nullable(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const customFieldsListContract = z.object({
  fields: z.array(customFieldSchema),
});

export const customFieldMutatedContract = z.object({
  field: customFieldSchema,
});

export const deleteCustomFieldContract = z.object({ success: z.boolean() });
